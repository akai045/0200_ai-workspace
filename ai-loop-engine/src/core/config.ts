/** NF-203: 収束閾値・エンジン選択などをコード改修なしに設定変更のみで差し替えられるようにする。 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ENGINE_ROOT } from "../store/paths.js";

export interface ConvergenceConfig {
  visualDiffMinScore: number;
  maxLintErrors: number;
  maxLintWarnings: number;
  accessibilityLevel: "A" | "AA" | "AAA";
  maxIterations: number;
  /** F-405: ブランドカラーとのRGBユークリッド距離の許容値（0〜441）。 */
  brandColorToleranceDistance: number;
  /** F-405: 有彩色画素のうちブランドカラー近似と判定される割合の下限。 */
  brandColorMinCompliantFraction: number;
}

/** NF-403: コスト計測・上限アラート。claudeApiエンジン使用時のみ実コストが発生する（manualHandoffは常に0）。 */
export interface CostTrackingConfig {
  pricePerMillionInputTokensUsd: number;
  pricePerMillionOutputTokensUsd: number;
  maxCostUsdPerProject: number;
}

export interface AiLoopConfig {
  generationEngine: string;
  convergence: ConvergenceConfig;
  breakpoints: number[];
  designCandidateCount: number;
  costTracking: CostTrackingConfig;
}

let cached: AiLoopConfig | undefined;

export async function loadConfig(): Promise<AiLoopConfig> {
  if (cached) return cached;
  const raw = await readFile(join(ENGINE_ROOT, "ai-loop.config.json"), "utf-8");
  cached = JSON.parse(raw) as AiLoopConfig;
  return cached;
}
