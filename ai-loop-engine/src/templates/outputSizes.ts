/**
 * F-105/206/207: マルチサイズ出力の要求サイズ解決。
 * デザイン生成（アートボード数の決定）と検証（multi-size-output）の両方がこの関数を単一の正として参照するため、
 * 「AIが指示に従ったと自己申告するだけ」にならず、要求サイズの実測突き合わせが機械的に成立する。
 */
import type { OutputSizeSpec, Project } from "../core/types.js";

const CATEGORY_DEFAULT_SIZES: Partial<Record<Project["category"], OutputSizeSpec[]>> = {
  logo: [{ label: "primary-512", width: 512, height: 512 }],
  banner: [
    { label: "rectangle-300x250", width: 300, height: 250 },
    { label: "leaderboard-728x90", width: 728, height: 90 },
  ],
  // A4相当・画面プレビュー用（4.2により物理的な色校正・入稿品質保証の対象外。RGB/画面表示前提の既定値）。
  flyer: [{ label: "a4-digital-preview", width: 1240, height: 1754 }],
};

export function resolveOutputSizes(project: Project): OutputSizeSpec[] {
  if (project.brief.outputSizes && project.brief.outputSizes.length > 0) {
    return project.brief.outputSizes;
  }
  return CATEGORY_DEFAULT_SIZES[project.category] ?? [];
}

export function artboardIdFor(size: OutputSizeSpec): string {
  return size.label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `artboard-${size.width}x${size.height}`;
}
