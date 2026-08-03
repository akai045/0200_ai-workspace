/**
 * F-405: ブランド整合性検証。
 * デザイン仕様が自己申告するcolorPaletteを信用するのではなく、実際にラスタライズ済みPNGの画素を
 * サンプリングしてブランドカラー（brief.brandGuideline.colors）との近似度を実測する。
 */
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import type { VerificationCheck } from "../core/types.js";
import type { ArtboardsManifest } from "../generation/graphicPostProcess.js";
import { fileExists } from "../store/fileStore.js";

const LABEL = "ブランド整合性検証（使用カラーの実測比較）";
const SAMPLE_STEP = 6;
const NEUTRAL_CHANNEL_SPAN = 16;
const MIN_ALPHA = 200;

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb | undefined {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return undefined;
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function isNeutral(r: number, g: number, b: number): boolean {
  return Math.max(r, g, b) - Math.min(r, g, b) < NEUTRAL_CHANNEL_SPAN;
}

function distance(a: Rgb, b: Rgb): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

export async function checkBrandConsistency(
  outputDir: string,
  manifest: ArtboardsManifest | undefined,
  brandColors: string[] | undefined,
  toleranceDistance: number,
  minCompliantFraction: number,
): Promise<VerificationCheck> {
  if (!brandColors || brandColors.length === 0) {
    return {
      id: "brand-consistency",
      label: LABEL,
      verdict: "判定不能",
      issues: ["ブランドガイドライン（brief.brandGuideline.colors）が指定されていません。"],
    };
  }
  const brandRgb = brandColors.map(hexToRgb).filter((c): c is Rgb => c !== undefined);
  if (brandRgb.length === 0) {
    return {
      id: "brand-consistency",
      label: LABEL,
      verdict: "判定不能",
      issues: ["ブランドカラーを#RRGGBB形式として解釈できませんでした。"],
    };
  }
  if (!manifest || manifest.artboards.length === 0) {
    return { id: "brand-consistency", label: LABEL, verdict: "不適合", issues: ["ラスタライズ済みアートボードが見つかりません。"] };
  }

  const issues: string[] = [];
  let evaluatedArtboards = 0;
  let compliantArtboards = 0;

  for (const artboard of manifest.artboards) {
    if (!artboard.rasterPath) continue;
    const rasterAbsPath = join(outputDir, artboard.rasterPath);
    if (!(await fileExists(rasterAbsPath))) continue;
    const png = PNG.sync.read(await readFile(rasterAbsPath));

    let chromaticCount = 0;
    let compliantCount = 0;
    for (let y = 0; y < png.height; y += SAMPLE_STEP) {
      for (let x = 0; x < png.width; x += SAMPLE_STEP) {
        const idx = (png.width * y + x) << 2;
        const r = png.data[idx];
        const g = png.data[idx + 1];
        const b = png.data[idx + 2];
        const alpha = png.data[idx + 3];
        if (alpha < MIN_ALPHA) continue;
        if (isNeutral(r, g, b)) continue;
        chromaticCount++;
        const minDist = Math.min(...brandRgb.map((c) => distance([r, g, b], c)));
        if (minDist <= toleranceDistance) compliantCount++;
      }
    }

    if (chromaticCount === 0) {
      issues.push(`${artboard.label}: 有彩色の画素が検出できず判定対象外としました（モノクロ意匠等の可能性）。`);
      continue;
    }
    evaluatedArtboards++;
    const fraction = compliantCount / chromaticCount;
    if (fraction >= minCompliantFraction) {
      compliantArtboards++;
    } else {
      issues.push(
        `${artboard.label}: ブランドカラーに近い画素の割合が${(fraction * 100).toFixed(1)}%で閾値${(minCompliantFraction * 100).toFixed(0)}%未満です。`,
      );
    }
  }

  if (evaluatedArtboards === 0) {
    return {
      id: "brand-consistency",
      label: LABEL,
      verdict: "判定不能",
      issues: [...issues, "有彩色の画素を持つアートボードがなく判定できません。"],
    };
  }

  return {
    id: "brand-consistency",
    label: LABEL,
    verdict: compliantArtboards === evaluatedArtboards ? "適合" : "不適合",
    score: compliantArtboards,
    issues,
  };
}
