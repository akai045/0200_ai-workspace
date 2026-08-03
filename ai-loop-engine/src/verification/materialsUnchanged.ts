/** 10.3: 支給素材（固定要素）の意匠が非改変であることの検証。 */
import { basename, join } from "node:path";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { MaterialAsset, VerificationCheck } from "../core/types.js";
import { readImageDimensions, aspectRatioDeviation, ASPECT_RATIO_TOLERANCE } from "../materials/integrity.js";
import { fileExists } from "../store/fileStore.js";

async function sha256Buffer(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

export async function checkMaterialsUnchanged(
  outputDir: string,
  materials: MaterialAsset[],
): Promise<VerificationCheck> {
  const fixedMaterials = materials.filter((m) => m.fixed);
  if (fixedMaterials.length === 0) {
    return {
      id: "materials-unchanged",
      label: "支給素材の非改変性",
      verdict: "適合",
      issues: ["固定素材（支給素材）は登録されていません（対象外）。"],
    };
  }

  const issues: string[] = [];
  let okCount = 0;
  for (const material of fixedMaterials) {
    const expectedPath = join(outputDir, "images", basename(material.filePath));
    if (!(await fileExists(expectedPath))) {
      issues.push(`${material.usageTag}（${material.id}）: 出力に ${expectedPath} が見つかりません。`);
      continue;
    }
    const hash = await sha256Buffer(expectedPath);
    if (hash === material.originalHash) {
      okCount++;
      continue;
    }
    const outputDims = await readImageDimensions(expectedPath);
    if (material.dimensions && outputDims) {
      const deviation = aspectRatioDeviation(material.dimensions, outputDims);
      if (deviation <= ASPECT_RATIO_TOLERANCE) {
        okCount++;
        issues.push(
          `${material.usageTag}（${material.id}）: ハッシュは変化していますが縦横比の差は${(deviation * 100).toFixed(1)}%で許容範囲内（形式変換/リサイズ等の技術的最適化と判断）。`,
        );
        continue;
      }
      issues.push(
        `${material.usageTag}（${material.id}）: 縦横比が登録時と${(deviation * 100).toFixed(1)}%異なります。意匠が改変された可能性があります。`,
      );
    } else {
      issues.push(`${material.usageTag}（${material.id}）: ハッシュが登録時と異なり、寸法比較もできませんでした（判定不能扱い、不適合として集計）。`);
    }
  }

  return {
    id: "materials-unchanged",
    label: "支給素材の非改変性",
    verdict: okCount === fixedMaterials.length ? "適合" : "不適合",
    score: okCount,
    issues,
  };
}
