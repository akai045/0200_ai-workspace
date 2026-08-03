/**
 * 登録スタブのみ（Phase2以降・F-103, 5.6）。生成・検証エンジンは未実装。
 * `implemented: false` のテンプレートは project:init で明示的に拒否される（CLI参照）。
 */
import type { OutputTemplate } from "../../core/types.js";
import { registerTemplate } from "../registry.js";

export const LOGO_TEMPLATE_STUB: OutputTemplate = {
  id: "logo",
  category: "logo",
  label: "ロゴマーク（Phase2以降・未実装）",
  requiredSlots: [],
  requiredVerificationChecks: [],
  implemented: false,
};

export function registerLogoTemplateStub(): void {
  registerTemplate(LOGO_TEMPLATE_STUB);
}
