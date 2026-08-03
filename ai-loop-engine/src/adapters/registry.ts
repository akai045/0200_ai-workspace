import type { ExportAdapter } from "./types.js";

const registry = new Map<string, ExportAdapter>();

export function registerAdapter(adapter: ExportAdapter): void {
  if (registry.has(adapter.id)) {
    throw new Error(`export adapter already registered: ${adapter.id}`);
  }
  registry.set(adapter.id, adapter);
}

export function getAdapter(id: string): ExportAdapter {
  const adapter = registry.get(id);
  if (!adapter) {
    throw new Error(`unknown export adapter: ${id}. registered: ${[...registry.keys()].join(", ")}`);
  }
  return adapter;
}

export function listAdapters(): ExportAdapter[] {
  return [...registry.values()];
}
