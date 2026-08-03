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
}

export interface AiLoopConfig {
  generationEngine: string;
  convergence: ConvergenceConfig;
  breakpoints: number[];
  designCandidateCount: number;
}

let cached: AiLoopConfig | undefined;

export async function loadConfig(): Promise<AiLoopConfig> {
  if (cached) return cached;
  const raw = await readFile(join(ENGINE_ROOT, "ai-loop.config.json"), "utf-8");
  cached = JSON.parse(raw) as AiLoopConfig;
  return cached;
}
