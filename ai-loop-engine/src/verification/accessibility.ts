/** F-403: WCAG準拠のアクセシビリティ検証（axe-core + Playwright）。 */
import { AxeBuilder } from "@axe-core/playwright";
import type { BrowserContext } from "playwright";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import type { VerificationCheck } from "../core/types.js";

const TAGS_BY_LEVEL: Record<string, string[]> = {
  A: ["wcag2a"],
  AA: ["wcag2a", "wcag2aa"],
  AAA: ["wcag2a", "wcag2aa", "wcag2aaa"],
};

export async function checkAccessibility(
  context: BrowserContext,
  outputDir: string,
  htmlFiles: string[],
  level: "A" | "AA" | "AAA",
): Promise<VerificationCheck> {
  if (htmlFiles.length === 0) {
    return {
      id: "accessibility",
      label: `アクセシビリティ（axe-core, WCAG ${level}）`,
      verdict: "判定不能",
      issues: ["HTMLファイルが見つからないため検証できません。"],
    };
  }
  const issues: string[] = [];
  let violationCount = 0;
  for (const relPath of htmlFiles) {
    const page = await context.newPage();
    try {
      await page.goto(pathToFileURL(join(outputDir, relPath)).toString());
      const results = await new AxeBuilder({ page }).withTags(TAGS_BY_LEVEL[level]).analyze();
      for (const violation of results.violations) {
        violationCount += violation.nodes.length;
        issues.push(
          `${relPath}: [${violation.impact ?? "unknown"}] ${violation.id} — ${violation.help}（該当${violation.nodes.length}件）`,
        );
      }
    } finally {
      await page.close();
    }
  }
  return {
    id: "accessibility",
    label: `アクセシビリティ（axe-core, WCAG ${level}）`,
    verdict: violationCount === 0 ? "適合" : "不適合",
    score: violationCount,
    issues,
  };
}
