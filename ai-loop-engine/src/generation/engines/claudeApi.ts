/**
 * NF-203の実例：ANTHROPIC_API_KEYが設定されている場合にのみ使える代替エンジン。
 * このワークスペースの実行環境にはAPIキーが無いため未検証（ai-loop.config.jsonの既定は manualHandoff）。
 * SDK依存を増やさないよう、Node組み込みfetchでMessages APIを直接呼び出す。
 */
import type { DesignEngine, DesignGenerationRequest } from "../designEngine.js";
import type { ImplementationEngine, ImplementationGenerationRequest } from "../implementationEngine.js";
import type { DesignSpec } from "../../core/types.js";

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

async function callClaude(prompt: string, maxTokens = 8000): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "claudeApiエンジンを使うには環境変数 ANTHROPIC_API_KEY を設定してください（ai-loop.config.json の generationEngine を manualHandoff に戻せば不要です）。",
    );
  }
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Anthropic API error ${response.status}: ${await response.text()}`);
  }
  const data = (await response.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("Anthropic APIの応答にtextブロックがありませんでした");
  return text;
}

function extractJson<T>(text: string): T {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/```\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  return JSON.parse(raw.trim()) as T;
}

export const claudeApiDesignEngine: DesignEngine = {
  name: "claudeApi",
  async generateDesigns(request: DesignGenerationRequest): Promise<DesignSpec[]> {
    const prompt =
      `以下の要件でWebサイトのデザイン案を${request.candidateCount}件、JSONのみで出力してください（説明文は不要）。\n` +
      `出力形式: {"designs": [{"pages": [...], "colorPalette": [...], "typography": {...}, "usedMaterialIds": [...]}]}\n` +
      `要件: ${JSON.stringify({ brief: request.project.brief, materials: request.materials, materialGaps: request.materialGaps })}`;
    const text = await callClaude(prompt);
    const parsed = extractJson<{ designs: DesignSpec[] }>(text);
    return parsed.designs;
  },
};

export const claudeApiImplementationEngine: ImplementationEngine = {
  name: "claudeApi",
  async generateImplementation(request: ImplementationGenerationRequest): Promise<{ files: string[] }> {
    const prompt =
      "以下のデザイン仕様をセマンティックなHTML/レスポンシブCSS/必要に応じたJSへ変換し、JSONのみで出力してください。\n" +
      '出力形式: {"files": [{"path": "index.html", "content": "..."}]}\n' +
      `デザイン仕様: ${JSON.stringify(request.selectedDesign)}\n` +
      `固定素材（そのまま参照するのみ、改変禁止）: ${JSON.stringify(request.materials.filter((m) => m.fixed))}`;
    const text = await callClaude(prompt);
    const parsed = extractJson<{ files: { path: string; content: string }[] }>(text);
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { dirname, join } = await import("node:path");
    const files: string[] = [];
    for (const file of parsed.files) {
      const dest = join(request.outputDir, file.path);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, file.content, "utf-8");
      files.push(file.path);
    }
    return { files };
  },
};
