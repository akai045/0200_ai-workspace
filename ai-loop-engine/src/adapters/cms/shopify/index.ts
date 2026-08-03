/**
 * F-305: Shopify向けエクスポート。ライブAPI呼び出しは行わず、Shopify Admin API（REST）の
 * Page資源（POST /admin/api/2024-01/pages.json）のリクエストボディ相当のJSONをローカルへ書き出すのみ。
 */
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { listDesignVersions } from "../../../store/projectStore.js";
import type { ExportAdapter, ExportInput, ExportResult } from "../../types.js";
import { ensureDir } from "../../../store/fileStore.js";
import { extractPageContent } from "../shared/htmlPageExtract.js";

function handleFor(slug: string): string {
  return slug === "index" ? "home" : slug;
}

async function run(input: ExportInput): Promise<ExportResult> {
  if (input.project.category !== "website") {
    throw new Error(
      `shopifyアダプタはWebサイトカテゴリ専用です（対象プロジェクトのカテゴリ: ${input.project.category}）。static-htmlアダプタを使用してください。`,
    );
  }
  const candidates = await listDesignVersions(input.project.id, input.artifact.designVersion);
  const selected = candidates.find((c) => c.candidateIndex === input.artifact.designCandidateIndex);
  if (!selected || selected.spec.kind !== "website") {
    throw new Error(`実装版v${input.artifact.version}が参照するWebサイトのデザイン版が見つかりません。`);
  }

  const warnings: string[] = [];
  const pages: { page: { title: string; body_html: string; handle: string } }[] = [];
  for (const page of selected.spec.pages) {
    const extracted = await extractPageContent(input.artifact.outputDir, page.slug);
    if (!extracted) {
      warnings.push(`ページ"${page.slug}"に対応する出力HTMLが見つからず、変換をスキップしました。`);
      continue;
    }
    pages.push({ page: { title: extracted.title, body_html: extracted.bodyHtml, handle: handleFor(extracted.slug) } });
  }

  await ensureDir(input.exportsDir);
  const outPath = join(input.exportsDir, `${input.project.id}-v${input.artifact.version}-shopify.json`);
  await writeFile(outPath, JSON.stringify({ pages, warnings }, null, 2) + "\n", "utf-8");
  return { outputPath: outPath, files: ["pages"] };
}

export const shopifyAdapter: ExportAdapter = {
  id: "shopify",
  label: "Shopify Admin API Page資源JSON（POST /admin/api/2024-01/pages.json 相当。ライブ投入は行わない）",
  implemented: true,
  run,
};
