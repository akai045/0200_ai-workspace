/**
 * F-402相当（ベクター成果物のコード品質）: SVGの構造検証。
 * htmlhint/stylelint/eslintのような文字列上のlintではなく、実ブラウザのDOMParser（XMLモード）で
 * パースし、parsererrorの有無・ルート要素・viewBox/width-heightの有無を検証する
 * （AIが「妥当なSVGです」と自己申告するのではなく、実際にパースできるかを機械的に確認する）。
 */
import type { BrowserContext } from "playwright";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { VerificationCheck } from "../core/types.js";

const LABEL = "SVGコード品質・構造検証（DOMParser）";

interface SvgCheckResult {
  ok: boolean;
  reason?: string;
}

export async function checkSvgLint(
  context: BrowserContext,
  outputDir: string,
  svgRelPaths: string[],
): Promise<VerificationCheck> {
  if (svgRelPaths.length === 0) {
    return { id: "svg-lint", label: LABEL, verdict: "不適合", issues: ["SVGファイルが1件も見つかりません。"] };
  }

  const issues: string[] = [];
  let errorCount = 0;
  const page = await context.newPage();
  try {
    await page.setContent("<!doctype html><html><body></body></html>");
    for (const relPath of svgRelPaths) {
      const content = await readFile(join(outputDir, relPath), "utf-8");
      const result = await page.evaluate((svgText: string): SvgCheckResult => {
        const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
        const parserError = doc.querySelector("parsererror");
        if (parserError) {
          return { ok: false, reason: `XMLパースエラー: ${parserError.textContent?.trim().slice(0, 200)}` };
        }
        const root = doc.documentElement;
        if (!root || root.tagName.toLowerCase() !== "svg") {
          return { ok: false, reason: "ルート要素が<svg>ではありません。" };
        }
        const hasViewBox = root.hasAttribute("viewBox");
        const hasWidthHeight = root.hasAttribute("width") && root.hasAttribute("height");
        if (!hasViewBox && !hasWidthHeight) {
          return { ok: false, reason: "viewBoxまたはwidth/height属性がありません。" };
        }
        return { ok: true };
      }, content);
      if (!result.ok) {
        errorCount++;
        issues.push(`${relPath}: ${result.reason}`);
      }
    }
  } finally {
    await page.close();
  }

  return {
    id: "svg-lint",
    label: LABEL,
    verdict: errorCount === 0 ? "適合" : "不適合",
    score: errorCount,
    issues,
  };
}
