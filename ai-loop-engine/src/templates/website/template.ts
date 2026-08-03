/**
 * Phase1で唯一実働する成果物テンプレート：Webサイト（5.1〜5.5・5.7）。
 * 支給素材の用途タグ語彙（F-108: ヘッダーロゴ／トップメインビジュアル／本文挿入画像／サイドバナー）を定義する。
 */
import type { OutputTemplate } from "../../core/types.js";
import { registerTemplate } from "../registry.js";

export const WEBSITE_TEMPLATE: OutputTemplate = {
  id: "website",
  category: "website",
  label: "Webサイト（LP・コーポレートサイト等）",
  requiredSlots: [
    { usageTag: "header-logo", label: "ヘッダーロゴ", required: false },
    { usageTag: "hero-visual", label: "トップメインビジュアル", required: false },
    { usageTag: "inline-image", label: "本文挿入画像", required: false },
    { usageTag: "sidebar-banner", label: "サイドバナー", required: false },
  ],
  requiredVerificationChecks: [
    "html-lint",
    "css-lint",
    "js-lint",
    "accessibility",
    "responsive",
    "visual-diff",
    "materials-unchanged",
  ],
  implemented: true,
};

export function registerWebsiteTemplate(): void {
  registerTemplate(WEBSITE_TEMPLATE);
}
