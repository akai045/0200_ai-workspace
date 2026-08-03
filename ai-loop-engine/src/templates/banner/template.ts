/**
 * F-105・F-207, 5.6: バナー（広告バナー・SNS投稿画像・キャンペーンバナー）。
 * 掲載媒体ごとの規定サイズ（F-207）は1サイズ1アートボードとしてGraphicDesignSpecで生成する。
 */
import type { OutputTemplate } from "../../core/types.js";
import { registerTemplate } from "../registry.js";

export const BANNER_TEMPLATE: OutputTemplate = {
  id: "banner",
  category: "banner",
  label: "バナー（広告バナー・SNS投稿画像・キャンペーンバナー）",
  requiredSlots: [
    { usageTag: "campaign-visual", label: "キャンペーン用支給ビジュアル", required: false },
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

export function registerBannerTemplate(): void {
  registerTemplate(BANNER_TEMPLATE);
}
