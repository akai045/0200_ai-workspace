/**
 * F-601/602・NF-201: 成果物テンプレート機構。
 * 新規カテゴリはこのレジストリへの登録のみでコア（orchestrator/verification等）改修なしに追加できる。
 */
import type { OutputTemplate, ProjectCategory } from "../core/types.js";

const registry = new Map<string, OutputTemplate>();

export function registerTemplate(template: OutputTemplate): void {
  if (registry.has(template.id)) {
    throw new Error(`template already registered: ${template.id}`);
  }
  registry.set(template.id, template);
}

export function getTemplate(id: string): OutputTemplate {
  const template = registry.get(id);
  if (!template) {
    throw new Error(`unknown template: ${id}. registered: ${[...registry.keys()].join(", ")}`);
  }
  return template;
}

export function listTemplates(category?: ProjectCategory): OutputTemplate[] {
  return [...registry.values()].filter((t) => !category || t.category === category);
}
