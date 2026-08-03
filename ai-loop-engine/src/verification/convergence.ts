/** F-503・6.3: 収束条件の判定。最大反復回数到達時は要修正のまま人間レビューへエスカレーションする（12章リスク対応）。 */
import type { ConvergenceVerdict, VerificationCheck } from "../core/types.js";

export function judgeConvergence(
  checks: VerificationCheck[],
  iteration: number,
  maxIterations: number,
): ConvergenceVerdict {
  if (iteration >= maxIterations) {
    return {
      converged: true,
      reason: `最大反復回数(${maxIterations})に到達しました。要修正のまま人間レビューへエスカレーションします。`,
      iterationsUsed: iteration,
      maxIterations,
    };
  }
  const failed = checks.filter((c) => c.verdict === "不適合");
  if (failed.length === 0) {
    return {
      converged: true,
      reason: "全項目が適合（対象外の項目は判定不能）でした。",
      iterationsUsed: iteration,
      maxIterations,
    };
  }
  return {
    converged: false,
    reason: `不適合項目: ${failed.map((c) => c.label).join("、")}`,
    iterationsUsed: iteration,
    maxIterations,
  };
}
