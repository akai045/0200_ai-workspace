/**
 * F-401: ビジュアル差分検証。
 * Phase1のデザイン生成エンジン（manualHandoff/claudeApi）は画像モックアップを生成しないため、
 * 「デザイン案画像 vs 実装レンダリング」ではなく「前回反復 vs 今回反復」のスクリーンショット差分として実装する
 * （デザイン案が画像として生成されるようになった時点で本来の比較へ切り替える。この限定は隠さずissuesに明記する）。
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

const VIEWPORT = { width: 1280, height: 800 };
const LABEL = "ビジュアル差分（前回反復とのスクリーンショット比較）";

export async function checkVisualDiff(
  context: BrowserContext,
  projectId: string,
  version: number,
  outputDir: string,
  entryHtmlRelPath: string | undefined,
  minScore: number,
): Promise<VerificationCheck> {
  if (!entryHtmlRelPath) {
    return { id: "visual-diff", label: LABEL, verdict: "判定不能", issues: ["比較対象のエントリHTMLが見つかりません。"] };
  }

  const screenshotsDir = join(verificationResultsDir(projectId), "screenshots");
  await ensureDir(screenshotsDir);
  const currentPath = join(screenshotsDir, `v${version}.png`);
  const previousPath = join(screenshotsDir, `v${version - 1}.png`);

  const page = await context.newPage();
  let buffer: Buffer;
  try {
    await page.setViewportSize(VIEWPORT);
    await page.goto(pathToFileURL(join(outputDir, entryHtmlRelPath)).toString());
    buffer = await page.screenshot();
  } finally {
    await page.close();
  }
  await writeFile(currentPath, buffer);

  if (version <= 1 || !(await fileExists(previousPath))) {
    return {
      id: "visual-diff",
      label: LABEL,
      verdict: "判定不能",
      issues: [
        "初回反復のためベースラインのスクリーンショットを記録しました（次回以降の反復と比較します）。",
        "Phase1ではデザイン案が画像として生成されないため、本チェックは『デザイン案との一致度』ではなく『反復間の安定度』を見るものです。",
      ],
    };
  }

  const currentImg = PNG.sync.read(await readFile(currentPath));
  const previousImg = PNG.sync.read(await readFile(previousPath));
  if (currentImg.width !== previousImg.width || currentImg.height !== previousImg.height) {
    return {
      id: "visual-diff",
      label: LABEL,
      verdict: "判定不能",
      issues: [
        `画像サイズが前回(${previousImg.width}x${previousImg.height})と今回(${currentImg.width}x${currentImg.height})で異なるため比較できません。`,
      ],
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
    id: "visual-diff",
    label: LABEL,
    verdict: score >= minScore ? "適合" : "不適合",
    score,
    issues:
      score >= minScore
        ? []
        : [`一致度${(score * 100).toFixed(1)}%が閾値${(minScore * 100).toFixed(0)}%未満です（差分ピクセル${diffPixels}/${totalPixels}）。`],
  };
}
