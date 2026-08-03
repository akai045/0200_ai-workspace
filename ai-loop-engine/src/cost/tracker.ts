/**
 * NF-403: コスト計測・上限アラート。
 * claudeApiエンジンはAnthropic APIレスポンスの実usage（input_tokens/output_tokens）から実コストを計算する。
 * manualHandoffエンジンはAnthropic API課金が発生しないため、記録自体を行わない
 * （発生していない費用を0円のダミー行で水増しして残さない）。
 */
import { appendJsonl, fileExists, readJsonl } from "../store/fileStore.js";
import { runsLogPath } from "../store/paths.js";
import type { CostTrackingConfig } from "../core/config.js";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export function estimateCostUsd(usage: TokenUsage, pricing: CostTrackingConfig): number {
  return (
    (usage.inputTokens / 1_000_000) * pricing.pricePerMillionInputTokensUsd +
    (usage.outputTokens / 1_000_000) * pricing.pricePerMillionOutputTokensUsd
  );
}

interface CostEventRecord {
  at: string;
  type: string;
  engine: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export async function recordGenerationCost(
  projectId: string,
  engine: string,
  usage: TokenUsage,
  pricing: CostTrackingConfig,
): Promise<number> {
  const costUsd = estimateCostUsd(usage, pricing);
  await appendJsonl(runsLogPath(projectId), {
    at: new Date().toISOString(),
    type: "generation.cost",
    engine,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUsd,
  });
  return costUsd;
}

export async function sumProjectCostUsd(projectId: string): Promise<number> {
  const path = runsLogPath(projectId);
  if (!(await fileExists(path))) return 0;
  const records = await readJsonl<CostEventRecord>(path);
  return records.filter((r) => r.type === "generation.cost").reduce((sum, r) => sum + (r.costUsd ?? 0), 0);
}

export interface BudgetCheck {
  totalCostUsd: number;
  maxCostUsd: number;
  overBudget: boolean;
}

export async function checkBudget(projectId: string, pricing: CostTrackingConfig): Promise<BudgetCheck> {
  const totalCostUsd = await sumProjectCostUsd(projectId);
  return { totalCostUsd, maxCostUsd: pricing.maxCostUsdPerProject, overBudget: totalCostUsd > pricing.maxCostUsdPerProject };
}
