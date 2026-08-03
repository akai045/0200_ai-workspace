/** F-206拡張: ロゴ/バナー/チラシ/イラストのSVGをEPSへ変換して書き出すエクスポートアダプタ。 */
import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { ensureDir } from "../../store/fileStore.js";
import type { ExportAdapter, ExportInput, ExportResult } from "../types.js";
import { svgToEps } from "./svgToEps.js";

async function run(input: ExportInput): Promise<ExportResult> {
  if (input.project.category === "website") {
    throw new Error(
      `epsアダプタはWebサイトカテゴリでは使えません（対象: ${input.project.category}。ロゴ/バナー/チラシ/イラストのSVGを対象とします）。`,
    );
  }
  const svgFiles = input.artifact.files.filter((f) => f.endsWith(".svg"));
  if (svgFiles.length === 0) {
    throw new Error("実装成果物にSVGファイルが見つかりません。impl:generateが完了しているか確認してください。");
  }

  const outDir = join(input.exportsDir, `${input.project.id}-v${input.artifact.version}-eps`);
  await ensureDir(outDir);

  const written: string[] = [];
  const warnings: string[] = [];
  for (const relPath of svgFiles) {
    const svgContent = await readFile(join(input.artifact.outputDir, relPath), "utf-8");
    const baseName = relPath.split("/").pop()!.replace(/\.svg$/i, "");
    const result = svgToEps(svgContent, `${input.project.title} — ${baseName}`);
    if (!result.eps) {
      warnings.push(`${relPath}: EPSへ変換できませんでした（${result.unsupportedReason}）。`);
      continue;
    }
    const epsRelPath = `${baseName}.eps`;
    await writeFile(join(outDir, epsRelPath), result.eps, "utf-8");
    written.push(epsRelPath);
  }

  if (warnings.length > 0) {
    const notice = ["# EPS変換の注意事項", "", ...warnings.map((w) => `- ${w}`), ""].join("\n");
    await writeFile(join(outDir, "CONVERSION_NOTES.md"), notice, "utf-8");
    written.push("CONVERSION_NOTES.md");
  }
  if (written.length === 0 || (written.length === 1 && written[0] === "CONVERSION_NOTES.md")) {
    throw new Error(`変換可能なSVGが1件もありませんでした。詳細: ${warnings.join(" / ")}`);
  }

  return { outputPath: outDir, files: written };
}

export const epsAdapter: ExportAdapter = {
  id: "eps",
  label: "EPS（rect/circle/pathの単純なSVGのみ対応。gradient/transform等は変換をスキップし警告する）",
  implemented: true,
  run,
};
