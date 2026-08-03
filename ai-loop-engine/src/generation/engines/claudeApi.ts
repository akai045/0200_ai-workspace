/**
 * NF-203の実例：ANTHROPIC_API_KEYが設定されている場合にのみ使える代替エンジン。
 * このワークスペースの実行環境にはAPIキーが無いため未検証（ai-loop.config.jsonの既定は manualHandoff）。
 * SDK依存を増やさないよう、Node組み込みfetchでMessages APIを直接呼び出す。
 */
import type { DesignEngine, DesignGenerationRequest } from "../designEngine.js";
import type { ImplementationEngine, ImplementationGenerationRequest } from "../implementationEngine.js";
import type { DesignSpec, GraphicDesignSpec } from "../../core/types.js";
import { artboardIdFor, resolveOutputSizes } from "../../templates/outputSizes.js";
import { postProcessGraphicArtifacts } from "../graphicPostProcess.js";
import { loadConfig } from "../../core/config.js";
import { checkBudget, recordGenerationCost } from "../../cost/tracker.js";

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

interface ClaudeResponse {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
}

async function callClaude(prompt: string, maxTokens = 8000): Promise<ClaudeResponse> {
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
  const data = (await response.json()) as {
    content: { type: string; text?: string }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const text = data.content.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("Anthropic APIの応答にtextブロックがありませんでした");
  return { text, usage: { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens } };
}

/** NF-403: 実usageからコストを記録し、上限超過時のみ警告する（強制停止はしない＝アラート要件）。 */
async function trackCost(projectId: string, usage: ClaudeResponse["usage"]): Promise<void> {
  const config = await loadConfig();
  await recordGenerationCost(projectId, "claudeApi", usage, config.costTracking);
  const budget = await checkBudget(projectId, config.costTracking);
  if (budget.overBudget) {
    console.warn(
      `[ai-loop][cost-alert] プロジェクト"${projectId}"の累積コスト見積り $${budget.totalCostUsd.toFixed(4)} が上限 $${budget.maxCostUsd} を超えました（NF-403）。`,
    );
  }
}

function extractJson<T>(text: string): T {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/```\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  return JSON.parse(raw.trim()) as T;
}

export const claudeApiDesignEngine: DesignEngine = {
  name: "claudeApi",
  async generateDesigns(request: DesignGenerationRequest): Promise<DesignSpec[]> {
    const isGraphic = request.project.category !== "website";
    const prompt = isGraphic
      ? `以下の要件で成果物カテゴリ「${request.project.category}」のデザイン案を${request.candidateCount}件、JSONのみで出力してください（説明文は不要）。\n` +
        `各案は次のアートボード一覧（1サイズにつき1アートボード、idはそのまま使用）で構成してください: ${JSON.stringify(
          resolveOutputSizes(request.project).map((s) => ({ id: artboardIdFor(s), label: s.label, width: s.width, height: s.height })),
        )}\n` +
        '出力形式: {"designs": [{"kind": "graphic", "artboards": [{"id":"...","label":"...","width":0,"height":0,"elements":[...],"materialId":"任意"}], "colorPalette": [...], "typography": {...}, "usedMaterialIds": [...]}]}\n' +
        `要件: ${JSON.stringify({ brief: request.project.brief, materials: request.materials, materialGaps: request.materialGaps })}`
      : `以下の要件でWebサイトのデザイン案を${request.candidateCount}件、JSONのみで出力してください（説明文は不要）。\n` +
        '出力形式: {"designs": [{"kind": "website", "pages": [...], "colorPalette": [...], "typography": {...}, "usedMaterialIds": [...]}]}\n' +
        `要件: ${JSON.stringify({ brief: request.project.brief, materials: request.materials, materialGaps: request.materialGaps })}`;
    const { text, usage } = await callClaude(prompt);
    await trackCost(request.project.id, usage);
    const parsed = extractJson<{ designs: DesignSpec[] }>(text);
    return parsed.designs;
  },
};

export const claudeApiImplementationEngine: ImplementationEngine = {
  name: "claudeApi",
  async generateImplementation(request: ImplementationGenerationRequest): Promise<{ files: string[] }> {
    const isGraphic = request.selectedDesign.kind === "graphic";
    const prompt = isGraphic
      ? "以下のデザイン仕様(artboards)の各アートボードについて、artboards/<id>.svg というパスでSVGマークアップを1ファイルずつ出力してください。" +
        "ルート要素にはviewBoxまたはwidth/height属性を含め、width/heightはアートボードの値と一致させてください。JSONのみで出力してください。\n" +
        '出力形式: {"files": [{"path": "artboards/<id>.svg", "content": "<svg ...>...</svg>"}]}\n' +
        `デザイン仕様: ${JSON.stringify(request.selectedDesign)}\n` +
        `固定素材（そのまま参照するのみ、改変禁止）: ${JSON.stringify(request.materials.filter((m) => m.fixed))}`
      : "以下のデザイン仕様をセマンティックなHTML/レスポンシブCSS/必要に応じたJSへ変換し、JSONのみで出力してください。\n" +
        '出力形式: {"files": [{"path": "index.html", "content": "..."}]}\n' +
        `デザイン仕様: ${JSON.stringify(request.selectedDesign)}\n` +
        `固定素材（そのまま参照するのみ、改変禁止）: ${JSON.stringify(request.materials.filter((m) => m.fixed))}`;
    const { text, usage } = await callClaude(prompt);
    await trackCost(request.project.id, usage);
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

    let extraFiles: string[] = [];
    if (request.selectedDesign.kind === "graphic") {
      const result = await postProcessGraphicArtifacts(
        request.outputDir,
        (request.selectedDesign as GraphicDesignSpec).artboards,
        files,
      );
      extraFiles = result.files;
    }

    return { files: [...files, ...extraFiles] };
  },
};
