/**
 * F-401: ビジュアル差分検証。
 * Phase1のデザイン生成エンジン（manualHandoff/claudeApi）は画像モックアップを生成しないため、
 * 「デザイン案画像 vs 実装レンダリング」ではなく「前回反復 vs 今回反復」のスクリーンショット差分として実装する
 * （デザイン案が画像として生成されるようになった時点で本来の比較へ切り替える。この限定は隠さずissuesに明記する）。
 * Webサイトはページ全体1点、ロゴ/バナー/チラシ等はアートボードごとに複数ターゲットを比較する。
 */
import type { BrowserContext } from "playwright";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import type { VerificationCheck } from "../core/types.js";
import { ensureDir, fileExists } from "../store/fileStore.js";
import { verificationResultsDir } from "../store/paths.js";

const LABEL = "ビジュアル差分（前回反復とのスクリーンショット比較）";

export interface VisualDiffTarget {
  id: string;
  label: string;
  relPath: string;
  viewport: { width: number; height: number };
}

async function diffOneTarget(
  context: BrowserContext,
  screenshotsDir: string,
  version: number,
  outputDir: string,
  target: VisualDiffTarget,
  minScore: number,
): Promise<{ label: string; score?: number; verdict: "適合" | "不適合" | "判定不能"; note: string }> {
  const targetDir = join(screenshotsDir, target.id);
  await ensureDir(targetDir);
  const currentPath = join(targetDir, `v${version}.png`);
  const previousPath = join(targetDir, `v${version - 1}.png`);

  const page = await context.newPage();
  let buffer: Buffer;
  try {
    await page.setViewportSize(target.viewport);
    await page.goto(pathToFileURL(join(outputDir, target.relPath)).toString());
    buffer = await page.screenshot({ clip: { x: 0, y: 0, ...target.viewport } });
  } finally {
    await page.close();
  }
  await writeFile(currentPath, buffer);

  if (version <= 1 || !(await fileExists(previousPath))) {
    return {
      label: target.label,
      verdict: "判定不能",
      note: `${target.label}: 初回反復のためベースラインを記録しました（次回以降と比較します）。`,
    };
  }

  const currentImg = PNG.sync.read(await readFile(currentPath));
  const previousImg = PNG.sync.read(await readFile(previousPath));
  if (currentImg.width !== previousImg.width || currentImg.height !== previousImg.height) {
    return {
      label: target.label,
      verdict: "判定不能",
      note: `${target.label}: 画像サイズが前回(${previousImg.width}x${previousImg.height})と今回(${currentImg.width}x${currentImg.height})で異なるため比較できません。`,
    };
  }

  const diff = new PNG({ width: currentImg.width, height: currentImg.height });
  const diffPixels = pixelmatch(
    previousImg.data,
    currentImg.data,
    diff.data,
    currentImg.width,
    currentImg.height,
    { threshold: 0.1 },
  );
  const totalPixels = currentImg.width * currentImg.height;
  const score = 1 - diffPixels / totalPixels;

  return {
    label: target.label,
    score,
    verdict: score >= minScore ? "適合" : "不適合",
    note:
      score >= minScore
        ? `${target.label}: 一致度${(score * 100).toFixed(1)}%（閾値${(minScore * 100).toFixed(0)}%以上）。`
        : `${target.label}: 一致度${(score * 100).toFixed(1)}%が閾値${(minScore * 100).toFixed(0)}%未満です（差分ピクセル${diffPixels}/${totalPixels}）。`,
  };
}

export async function checkVisualDiff(
  context: BrowserContext,
  projectId: string,
  version: number,
  outputDir: string,
  targets: VisualDiffTarget[],
  minScore: number,
): Promise<VerificationCheck> {
  if (targets.length === 0) {
    return { id: "visual-diff", label: LABEL, verdict: "判定不能", issues: ["比較対象のエントリファイルが見つかりません。"] };
  }

  const screenshotsDir = join(verificationResultsDir(projectId), "screenshots");
  await ensureDir(screenshotsDir);

  const results = await Promise.all(
    targets.map((target) => diffOneTarget(context, screenshotsDir, version, outputDir, target, minScore)),
  );

  const issues = results.map((r) => r.note);
  const scored = results.filter((r): r is typeof r & { score: number } => r.score !== undefined);
  const anyFailed = results.some((r) => r.verdict === "不適合");
  const verdict: "適合" | "不適合" | "判定不能" = anyFailed ? "不適合" : scored.length > 0 ? "適合" : "判定不能";
  const averageScore = scored.length > 0 ? scored.reduce((sum, r) => sum + r.score, 0) / scored.length : undefined;

  return { id: "visual-diff", label: LABEL, verdict, score: averageScore, issues };
}
