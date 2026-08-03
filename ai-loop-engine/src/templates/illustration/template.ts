/**
 * 登録スタブのみ（Phase2以降・F-104, 5.6）。生成・検証エンジンは未実装。
 */
import type { OutputTemplate } from "../../core/types.js";
import { registerTemplate } from "../registry.js";

export const ILLUSTRATION_TEMPLATE_STUB: OutputTemplate = {
  id: "illustration",
  category: "illustration",
  label: "イラスト（Phase2以降・未実装）",
  requiredSlots: [],
  requiredVerificationChecks: [],
  implemented: false,
};

export function registerIllustrationTemplateStub(): void {
  registerTemplate(ILLUSTRATION_TEMPLATE_STUB);
}
