/**
 * 登録スタブのみ（Phase2以降・F-105・F-207, 5.6）。生成・検証エンジンは未実装。
 */
import type { OutputTemplate } from "../../core/types.js";
import { registerTemplate } from "../registry.js";

export const BANNER_TEMPLATE_STUB: OutputTemplate = {
  id: "banner",
  category: "banner",
  label: "バナー（Phase2以降・未実装）",
  requiredSlots: [],
  requiredVerificationChecks: [],
  implemented: false,
};

export function registerBannerTemplateStub(): void {
  registerTemplate(BANNER_TEMPLATE_STUB);
}
