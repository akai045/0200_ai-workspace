/**
 * F-110: テンプレートの必須枠に対する支給素材の過不足判定。
 * 未充足の枠のみがデザイン生成対象（AI生成）になる（F-109：部分適用）。
 */
import type { MaterialAsset, OutputTemplate } from "../core/types.js";

export interface SlotStatus {
  usageTag: string;
  label: string;
  /** 支給素材（固定要素）で充足済みか。false の場合はAI生成対象。 */
  filledBySuppliedMaterial: boolean;
  materialId?: string;
}

export function detectMaterialGaps(template: OutputTemplate, materials: MaterialAsset[]): SlotStatus[] {
  const fixedByTag = new Map(materials.filter((m) => m.fixed).map((m) => [m.usageTag, m]));
  return template.requiredSlots.map((slot) => {
    const material = fixedByTag.get(slot.usageTag);
    return {
      usageTag: slot.usageTag,
      label: slot.label,
      filledBySuppliedMaterial: !!material,
      materialId: material?.id,
    };
  });
}
