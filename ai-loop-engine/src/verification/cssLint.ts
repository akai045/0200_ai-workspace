/** F-402: CSSの構文・規約チェック（stylelint-config-standard）。 */
import stylelint from "stylelint";
import type { VerificationCheck } from "../core/types.js";
import { readTextFilesByExt } from "./readOutputFiles.js";

export async function checkCssLint(
  outputDir: string,
  files: string[],
  maxWarnings: number,
): Promise<VerificationCheck> {
  const cssFiles = await readTextFilesByExt(outputDir, files, ".css");
  if (cssFiles.length === 0) {
    return {
      id: "css-lint",
      label: "CSSコード品質（stylelint）",
      verdict: "不適合",
      issues: ["CSSファイルが1件も見つかりません。"],
    };
  }
  let errors = 0;
  let warnings = 0;
  const issues: string[] = [];
  for (const file of cssFiles) {
    const result = await stylelint.lint({
      code: file.content,
      codeFilename: file.path,
      config: { extends: "stylelint-config-standard" },
    });
    for (const warning of result.results[0]?.warnings ?? []) {
      if (warning.severity === "error") errors++;
      else warnings++;
      issues.push(`${file.path}:${warning.line}:${warning.column} [${warning.severity}] ${warning.rule}: ${warning.text}`);
    }
  }
  return {
    id: "css-lint",
    label: "CSSコード品質（stylelint）",
    verdict: errors === 0 && warnings <= maxWarnings ? "適合" : "不適合",
    score: errors + warnings,
    issues,
  };
}
