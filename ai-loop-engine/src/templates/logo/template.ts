/**
 * F-103, 5.6: ロゴマーク（企業ロゴ・サービスロゴ・シンボルマーク）。
 * GraphicDesignSpec（アートボード構成）で生成し、SVG（ベクター・F-206）を正としてPNG複数解像度を機械的に導出する。
 */
import type { OutputTemplate } from "../../core/types.js";
import { registerTemplate } from "../registry.js";

export const LOGO_TEMPLATE: OutputTemplate = {
  id: "logo",
  category: "logo",
  label: "ロゴマーク（企業ロゴ・サービスロゴ・シンボルマーク）",
  requiredSlots: [
    { usageTag: "reference-mark", label: "既存ロゴ／踏襲するシンボル（改修・派生の起点がある場合）", required: false },
  ],
  requiredVerificationChecks: [
    "svg-lint",
    "accessibility",
    "visual-diff",
    "multi-size-output",
    "brand-consistency",
    "materials-unchanged",
  ],
  implemented: true,
};

export function registerLogoTemplate(): void {
  registerTemplate(LOGO_TEMPLATE);
}
