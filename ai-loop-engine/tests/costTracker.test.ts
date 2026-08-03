import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { estimateCostUsd, recordGenerationCost, sumProjectCostUsd, checkBudget } from "../src/cost/tracker.js";
import { projectDir } from "../src/store/paths.js";
import type { CostTrackingConfig } from "../src/core/config.js";

const TEST_PROJECT_ID = "test-cost-project";

const PRICING: CostTrackingConfig = {
  pricePerMillionInputTokensUsd: 3,
  pricePerMillionOutputTokensUsd: 15,
  maxCostUsdPerProject: 1,
};

beforeEach(async () => {
  await rm(projectDir(TEST_PROJECT_ID), { recursive: true, force: true });
});

after(async () => {
  await rm(projectDir(TEST_PROJECT_ID), { recursive: true, force: true });
});

test("estimateCostUsd: 実トークン数×単価で計算する", () => {
  const cost = estimateCostUsd({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, PRICING);
  assert.equal(cost, 3 + 15);
});

test("estimateCostUsd: トークン0ならコスト0", () => {
  assert.equal(estimateCostUsd({ inputTokens: 0, outputTokens: 0 }, PRICING), 0);
});

test("sumProjectCostUsd: 記録が無ければ0（manualHandoffエンジンは費用が発生しないため未記録）", async () => {
  assert.equal(await sumProjectCostUsd(TEST_PROJECT_ID), 0);
});

test("recordGenerationCost→sumProjectCostUsd: 複数回の記録を累積する", async () => {
  await recordGenerationCost(TEST_PROJECT_ID, "claudeApi", { inputTokens: 100_000, outputTokens: 100_000 }, PRICING);
  await recordGenerationCost(TEST_PROJECT_ID, "claudeApi", { inputTokens: 100_000, outputTokens: 100_000 }, PRICING);
  const total = await sumProjectCostUsd(TEST_PROJECT_ID);
  const expectedPerCall = estimateCostUsd({ inputTokens: 100_000, outputTokens: 100_000 }, PRICING);
  assert.ok(Math.abs(total - expectedPerCall * 2) < 1e-9);
});

test("checkBudget: 上限を超えるとoverBudget=true", async () => {
  await recordGenerationCost(TEST_PROJECT_ID, "claudeApi", { inputTokens: 1_000_000, outputTokens: 1_000_000 }, PRICING);
  const budget = await checkBudget(TEST_PROJECT_ID, PRICING);
  assert.equal(budget.overBudget, true);
  assert.equal(budget.maxCostUsd, 1);
});

test("checkBudget: 上限内ならoverBudget=false", async () => {
  await recordGenerationCost(TEST_PROJECT_ID, "claudeApi", { inputTokens: 1000, outputTokens: 1000 }, PRICING);
  const budget = await checkBudget(TEST_PROJECT_ID, PRICING);
  assert.equal(budget.overBudget, false);
});
