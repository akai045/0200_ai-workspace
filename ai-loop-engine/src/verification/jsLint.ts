/** F-402: JSの構文・規約チェック（ESLint Linter API、ブラウザ実行前提の最小ルールセット）。 */
import { Linter } from "eslint";
import type { Linter as LinterTypes } from "eslint";
import type { VerificationCheck } from "../core/types.js";
import { readTextFilesByExt } from "./readOutputFiles.js";

const linter = new Linter();

const CONFIG: LinterTypes.Config = {
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "script",
    globals: {
      document: "readonly",
      window: "readonly",
      navigator: "readonly",
      console: "readonly",
    },
  },
  rules: {
    "no-undef": "error",
    "no-unused-vars": "warn",
    "no-var": "warn",
    eqeqeq: "warn",
  },
};

export async function checkJsLint(
  outputDir: string,
  files: string[],
  maxWarnings: number,
): Promise<VerificationCheck> {
  const jsFiles = await readTextFilesByExt(outputDir, files, ".js");
  if (jsFiles.length === 0) {
    return {
      id: "js-lint",
      label: "JSコード品質（ESLint）",
      verdict: "適合",
      issues: ["JSファイルは使用されていません（対象外）。"],
    };
  }
  let errors = 0;
  let warnings = 0;
  const issues: string[] = [];
  for (const file of jsFiles) {
    const messages = linter.verify(file.content, CONFIG, file.path);
    for (const m of messages) {
      if (m.severity === 2) errors++;
      else warnings++;
      issues.push(`${file.path}:${m.line}:${m.column} [${m.severity === 2 ? "error" : "warning"}] ${m.ruleId ?? ""}: ${m.message}`);
    }
  }
  return {
    id: "js-lint",
    label: "JSコード品質（ESLint）",
    verdict: errors === 0 && warnings <= maxWarnings ? "適合" : "不適合",
    score: errors + warnings,
    issues,
  };
}
