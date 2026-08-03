/**
 * チラシ：要件定義書には無いカテゴリだが、F-602（新規カテゴリはテンプレート追加のみで拡張できる）の
 * パターンに従い新設する（人間の確認済み方針。TASK-2026-0003参照）。
 * 4.2（対象外範囲）により、紙媒体向けの物理的な色校正・入稿データ品質保証は行わない。
 * 出力はデジタル閲覧・データ入稿用途のPNG/SVGに限定する（RGB・画面表示前提）。
 */
import type { OutputTemplate } from "../../core/types.js";
import { registerTemplate } from "../registry.js";

export const FLYER_TEMPLATE: OutputTemplate = {
  id: "flyer",
  category: "flyer",
  label: "チラシ（デジタル版下・画面閲覧/データ入稿用。紙媒体の物理的な色校正・入稿品質保証はスコープ外）",
  requiredSlots: [
    { usageTag: "flyer-photo", label: "掲載写真素材", required: false },
    { usageTag: "logo-mark", label: "掲載ロゴ", required: false },
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

export function registerFlyerTemplate(): void {
  registerTemplate(FLYER_TEMPLATE);
}
