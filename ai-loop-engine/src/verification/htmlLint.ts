/** F-402: HTMLの構文・規約チェック（htmlhint）。 */
import htmlhint from "htmlhint";
const { HTMLHint } = htmlhint;
import type { VerificationCheck } from "../core/types.js";
import { readTextFilesByExt } from "./readOutputFiles.js";

const RULESET = {
  "tagname-lowercase": true,
  "attr-lowercase": true,
  "attr-value-double-quotes": true,
  "doctype-first": true,
  "tag-pair": true,
  "spec-char-escape": true,
  "id-unique": true,
  "src-not-empty": true,
  "attr-no-duplication": true,
  "alt-require": true,
};

export async function checkHtmlLint(
  outputDir: string,
  files: string[],
  maxWarnings: number,
): Promise<VerificationCheck> {
  const htmlFiles = await readTextFilesByExt(outputDir, files, ".html");
  if (htmlFiles.length === 0) {
    return {
      id: "html-lint",
      label: "HTMLコード品質（htmlhint）",
      verdict: "不適合",
      issues: ["HTMLファイルが1件も見つかりません。"],
    };
  }
  let errors = 0;
  let warnings = 0;
  const issues: string[] = [];
  for (const file of htmlFiles) {
    const messages = HTMLHint.verify(file.content, RULESET);
    for (const m of messages) {
      if (m.type === "error") errors++;
      else warnings++;
      issues.push(`${file.path}:${m.line}:${m.col} [${m.type}] ${m.rule.id}: ${m.message}`);
    }
  }
  return {
    id: "html-lint",
    label: "HTMLコード品質（htmlhint）",
    verdict: errors === 0 && warnings <= maxWarnings ? "適合" : "不適合",
    score: errors + warnings,
    issues,
  };
}
