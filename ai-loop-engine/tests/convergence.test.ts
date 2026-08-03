import { test } from "node:test";
import assert from "node:assert/strict";
import { judgeConvergence } from "../src/verification/convergence.js";
import type { VerificationCheck } from "../src/core/types.js";

function check(verdict: VerificationCheck["verdict"]): VerificationCheck {
  return { id: "html-lint", label: "HTMLコード品質（htmlhint）", verdict, issues: verdict === "不適合" ? ["dummy error"] : [] };
}

test("収束: 不適合項目が無ければ収束と判定する", () => {
  const result = judgeConvergence([check("適合"), check("適合")], 1, 5);
  assert.equal(result.converged, true);
  assert.equal(result.iterationsUsed, 1);
});

test("収束: 不適合項目があり最大反復回数未満なら未収束", () => {
  const result = judgeConvergence([check("適合"), check("不適合")], 2, 5);
  assert.equal(result.converged, false);
  assert.match(result.reason, /不適合項目/);
});

test("収束: 最大反復回数に到達したら不適合が残っていてもエスカレーションとして収束扱いにする", () => {
  const result = judgeConvergence([check("不適合")], 5, 5);
  assert.equal(result.converged, true);
  assert.match(result.reason, /最大反復回数/);
});
