/** F-404: 定義済みブレークポイントごとのレイアウト崩れ・オーバーフロー検証。 */
import type { BrowserContext } from "playwright";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import type { VerificationCheck } from "../core/types.js";

export async function checkResponsive(
  context: BrowserContext,
  outputDir: string,
  htmlFiles: string[],
  breakpoints: number[],
): Promise<VerificationCheck> {
  const totalChecks = htmlFiles.length * breakpoints.length;
  if (totalChecks === 0) {
    return {
      id: "responsive",
      label: `レスポンシブ（ブレークポイント: ${breakpoints.join(", ")}px）`,
      verdict: "判定不能",
      issues: ["HTMLファイルまたはブレークポイントの指定がありません。"],
    };
  }
  const issues: string[] = [];
  let overflowCount = 0;
  for (const relPath of htmlFiles) {
    for (const width of breakpoints) {
      const page = await context.newPage();
      try {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(pathToFileURL(join(outputDir, relPath)).toString());
        const hasOverflow = await page.evaluate(() => {
          const el = document.documentElement;
          return el.scrollWidth > el.clientWidth + 2;
        });
        if (hasOverflow) {
          overflowCount++;
          issues.push(`${relPath} — 幅${width}pxで横方向のオーバーフローを検出しました。`);
        }
      } finally {
        await page.close();
      }
    }
  }
  return {
    id: "responsive",
    label: `レスポンシブ（ブレークポイント: ${breakpoints.join(", ")}px）`,
    verdict: overflowCount === 0 ? "適合" : "不適合",
    score: overflowCount,
    issues,
  };
}
