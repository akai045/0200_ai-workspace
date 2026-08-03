/**
 * F-305: microCMS向けエクスポート。ライブAPI呼び出しは行わず、microCMSのコンテンツ管理API
 * （PUT /api/v1/{endpoint}/{contentId}）のリクエストボディ相当のJSONをローカルへ書き出すのみ。
 */
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { listDesignVersions } from "../../../store/projectStore.js";
import type { ExportAdapter, ExportInput, ExportResult } from "../../types.js";
import { ensureDir } from "../../../store/fileStore.js";
import { extractPageContent } from "../shared/htmlPageExtract.js";

async function run(input: ExportInput): Promise<ExportResult> {
  if (input.project.category !== "website") {
    throw new Error(
      `microcmsアダプタはWebサイトカテゴリ専用です（対象プロジェクトのカテゴリ: ${input.project.category}）。static-htmlアダプタを使用してください。`,
    );
  }
  const candidates = await listDesignVersions(input.project.id, input.artifact.designVersion);
  const selected = candidates.find((c) => c.candidateIndex === input.artifact.designCandidateIndex);
  if (!selected || selected.spec.kind !== "website") {
    throw new Error(`実装版v${input.artifact.version}が参照するWebサイトのデザイン版が見つかりません。`);
  }

  const warnings: string[] = [];
  const contents: { id: string; title: string; content: string }[] = [];
  for (const page of selected.spec.pages) {
    const extracted = await extractPageContent(input.artifact.outputDir, page.slug);
    if (!extracted) {
      warnings.push(`ページ"${page.slug}"に対応する出力HTMLが見つからず、変換をスキップしました。`);
      continue;
    }
    contents.push({ id: extracted.slug, title: extracted.title, content: extracted.bodyHtml });
  }

  await ensureDir(input.exportsDir);
  const outPath = join(input.exportsDir, `${input.project.id}-v${input.artifact.version}-microcms.json`);
  await writeFile(outPath, JSON.stringify({ contents, warnings }, null, 2) + "\n", "utf-8");
  return { outputPath: outPath, files: ["contents"] };
}

export const microcmsAdapter: ExportAdapter = {
  id: "microcms",
  label: "microCMSコンテンツJSON（PUT /api/v1/{endpoint}/{contentId} 相当。ライブ投入は行わない）",
  implemented: true,
  run,
};
