/** F-406: 検証結果を項目別スコア・指摘事項一覧として構造化データ（呼び出し元でJSON保存済み）＋閲覧用Markdownで出力する。 */
import type { VerificationResult } from "../core/types.js";

export function renderMarkdownReport(result: VerificationResult, projectTitle: string): string {
  const lines: string[] = [];
  lines.push(`# 検証レポート — ${projectTitle}（実装版 v${result.implementationVersion}）`);
  lines.push("");
  lines.push(`検証日時: ${result.verifiedAt}`);
  lines.push("");
  lines.push("## 項目別判定");
  lines.push("");
  lines.push("| 項目 | 判定 | スコア | 指摘事項（抜粋） |");
  lines.push("|---|---|---|---|");
  for (const check of result.checks) {
    const excerpt =
      check.issues.length === 0
        ? "-"
        : check.issues.slice(0, 3).join("<br>") + (check.issues.length > 3 ? `<br>…他${check.issues.length - 3}件` : "");
    lines.push(`| ${check.label} | ${check.verdict} | ${check.score ?? "-"} | ${excerpt} |`);
  }
  lines.push("");
  lines.push("## 収束判定");
  lines.push("");
  lines.push(`- 収束: ${result.convergence.converged ? "済み" : "未達"}`);
  lines.push(`- 理由: ${result.convergence.reason}`);
  lines.push(`- 反復回数: ${result.convergence.iterationsUsed} / 上限 ${result.convergence.maxIterations}`);
  lines.push("");
  lines.push("## 全指摘事項（詳細）");
  lines.push("");
  const withIssues = result.checks.filter((c) => c.issues.length > 0);
  if (withIssues.length === 0) {
    lines.push("（指摘事項なし）");
  }
  for (const check of withIssues) {
    lines.push(`### ${check.label}`);
    for (const issue of check.issues) lines.push(`- ${issue}`);
    lines.push("");
  }
  return lines.join("\n");
}
