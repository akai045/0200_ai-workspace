import type { DesignEngine } from "./designEngine.js";
import type { ImplementationEngine } from "./implementationEngine.js";
import { manualHandoffDesignEngine, manualHandoffImplementationEngine, ManualHandoffPendingError } from "./engines/manualHandoff.js";
import { claudeApiDesignEngine, claudeApiImplementationEngine } from "./engines/claudeApi.js";

const designEngines: Record<string, DesignEngine> = {
  manualHandoff: manualHandoffDesignEngine,
  claudeApi: claudeApiDesignEngine,
};

const implementationEngines: Record<string, ImplementationEngine> = {
  manualHandoff: manualHandoffImplementationEngine,
  claudeApi: claudeApiImplementationEngine,
};

export function getDesignEngine(name: string): DesignEngine {
  const engine = designEngines[name];
  if (!engine) throw new Error(`unknown design engine: ${name} (available: ${Object.keys(designEngines).join(", ")})`);
  return engine;
}

export function getImplementationEngine(name: string): ImplementationEngine {
  const engine = implementationEngines[name];
  if (!engine) {
    throw new Error(`unknown implementation engine: ${name} (available: ${Object.keys(implementationEngines).join(", ")})`);
  }
  return engine;
}

export { ManualHandoffPendingError };
export type { DesignEngine, ImplementationEngine };
