/**
 * F-104, 5.6: イラスト（アイキャッチ・キャラクター・アイコンセット）。
 * ロゴ/バナー/チラシと同じGraphicDesignSpec（アートボード構成）で生成し、
 * SVG（ベクター）を正としてPNGを機械的に導出する（TASK-2026-0003の共通基盤をそのまま流用）。
 * Lottie（アニメーション）は拡張出力形式（Could優先度）のため未実装
 * （ロゴのEPS・バナーのHTML5アニメーションと同様の扱い。詳細はREADME参照）。
 */
import type { OutputTemplate } from "../../core/types.js";
import { registerTemplate } from "../registry.js";

export const ILLUSTRATION_TEMPLATE: OutputTemplate = {
  id: "illustration",
  category: "illustration",
  label: "イラスト（アイキャッチ・キャラクター・アイコンセット）",
  requiredSlots: [
    { usageTag: "style-reference", label: "参考にする既存イラスト／スタイルガイド（任意）", required: false },
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

export function registerIllustrationTemplate(): void {
  registerTemplate(ILLUSTRATION_TEMPLATE);
}
