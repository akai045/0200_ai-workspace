import { registerWebsiteTemplate } from "./website/template.js";
import { registerLogoTemplate } from "./logo/template.js";
import { registerIllustrationTemplateStub } from "./illustration/template.js";
import { registerBannerTemplate } from "./banner/template.js";
import { registerFlyerTemplate } from "./flyer/template.js";

let registered = false;

/** CLIエントリポイントで一度だけ呼び出し、全テンプレート（実装済み＋スタブ）をレジストリへ登録する。 */
export function registerAllTemplates(): void {
  if (registered) return;
  registerWebsiteTemplate();
  registerLogoTemplate();
  registerIllustrationTemplateStub();
  registerBannerTemplate();
  registerFlyerTemplate();
  registered = true;
}

export { getTemplate, listTemplates } from "./registry.js";
