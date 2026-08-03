/**
 * F-305: Movable Type向けエクスポート。ライブ投入は行わず、MTの「インポート形式」
 * （プレーンテキスト、エントリごとに"--------"区切り、フィールドごとに"-----"区切り）で書き出すのみ。
 */
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { listDesignVersions } from "../../../store/projectStore.js";
import type { ExportAdapter, ExportInput, ExportResult } from "../../types.js";
import { ensureDir } from "../../../store/fileStore.js";
import { extractPageContent } from "../shared/htmlPageExtract.js";

const ENTRY_SEPARATOR = "--------";
const FIELD_SEPARATOR = "-----";

function mtDateString(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  let hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const hh = String(hours).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss} ${ampm}`;
}

function buildEntry(title: string, basename: string, bodyHtml: string, date: Date): string {
  return [
    "AUTHOR: AI LOOP Engine",
    `TITLE: ${title}`,
    `BASENAME: ${basename}`,
    "STATUS: Draft",
    "ALLOW COMMENTS: 1",
    "ALLOW PINGS: 1",
    "CONVERT BREAKS: 0",
    `DATE: ${mtDateString(date)}`,
    FIELD_SEPARATOR,
    "BODY:",
    bodyHtml,
    FIELD_SEPARATOR,
  ].join("\n");
}

async function run(input: ExportInput): Promise<ExportResult> {
  if (input.project.category !== "website") {
    throw new Error(
      `movable-typeアダプタはWebサイトカテゴリ専用です（対象プロジェクトのカテゴリ: ${input.project.category}）。static-htmlアダプタを使用してください。`,
    );
  }
  const candidates = await listDesignVersions(input.project.id, input.artifact.designVersion);
  const selected = candidates.find((c) => c.candidateIndex === input.artifact.designCandidateIndex);
  if (!selected || selected.spec.kind !== "website") {
    throw new Error(`実装版v${input.artifact.version}が参照するWebサイトのデザイン版が見つかりません。`);
  }

  const now = new Date();
  const warnings: string[] = [];
  const entries: string[] = [];
  for (const page of selected.spec.pages) {
    const extracted = await extractPageContent(input.artifact.outputDir, page.slug);
    if (!extracted) {
      warnings.push(`ページ"${page.slug}"に対応する出力HTMLが見つからず、変換をスキップしました。`);
      continue;
    }
    entries.push(buildEntry(extracted.title, extracted.slug, extracted.bodyHtml, now));
  }

  const body = entries.join(`\n${ENTRY_SEPARATOR}\n`) + (entries.length > 0 ? `\n${ENTRY_SEPARATOR}\n` : "");
  const notice = warnings.length > 0 ? "\n" + warnings.map((w) => `# WARNING: ${w}`).join("\n") + "\n" : "";

  await ensureDir(input.exportsDir);
  const outPath = join(input.exportsDir, `${input.project.id}-v${input.artifact.version}-movable-type.txt`);
  await writeFile(outPath, body + notice, "utf-8");
  return { outputPath: outPath, files: ["import"] };
}

export const movableTypeAdapter: ExportAdapter = {
  id: "movable-type",
  label: "Movable Type Import形式テキスト（ライブ投入は行わない）",
  implemented: true,
  run,
};
