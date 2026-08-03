/** F-105/206/207: マルチサイズ出力の実測検証。要求サイズ（resolveOutputSizes）と実際のラスタ寸法をimage-sizeで突き合わせる。 */
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { imageSize } from "image-size";
import type { OutputSizeSpec, VerificationCheck } from "../core/types.js";
import type { ArtboardsManifest } from "../generation/graphicPostProcess.js";
import { fileExists } from "../store/fileStore.js";

const LABEL = "マルチサイズ出力（要求サイズとの一致）";

export async function checkMultiSizeOutput(
  outputDir: string,
  manifest: ArtboardsManifest | undefined,
  requiredSizes: OutputSizeSpec[],
): Promise<VerificationCheck> {
  if (requiredSizes.length === 0) {
    return {
      id: "multi-size-output",
      label: LABEL,
      verdict: "判定不能",
      issues: ["要求サイズ（brief.outputSizes／カテゴリ既定値）がありません。"],
    };
  }
  if (!manifest) {
    return {
      id: "multi-size-output",
      label: LABEL,
      verdict: "不適合",
      issues: ["artboards-manifest.jsonが見つかりません（グラフィック系実装が未生成の可能性）。"],
    };
  }

  const issues: string[] = [];
  let okCount = 0;
  for (const size of requiredSizes) {
    const entry = manifest.artboards.find((a) => a.width === size.width && a.height === size.height);
    if (!entry) {
      issues.push(`要求サイズ「${size.label}」（${size.width}x${size.height}）に対応するアートボードが見つかりません。`);
      continue;
    }
    if (entry.note || !entry.rasterPath) {
      issues.push(`${size.label}（${size.width}x${size.height}）: ${entry.note ?? "ラスタファイルが生成されていません。"}`);
      continue;
    }
    const rasterAbsPath = join(outputDir, entry.rasterPath);
    if (!(await fileExists(rasterAbsPath))) {
      issues.push(`${size.label}: ラスタファイル ${entry.rasterPath} が見つかりません。`);
      continue;
    }
    const dim = imageSize(await readFile(rasterAbsPath));
    if (dim.width !== size.width || dim.height !== size.height) {
      issues.push(`${size.label}: 実測寸法(${dim.width}x${dim.height})が要求(${size.width}x${size.height})と一致しません。`);
      continue;
    }
    okCount++;
  }

  return {
    id: "multi-size-output",
    label: LABEL,
    verdict: okCount === requiredSizes.length ? "適合" : "不適合",
    score: okCount,
    issues,
  };
}
