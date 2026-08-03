import { registerWebsiteTemplate } from "./website/template.js";
import { registerLogoTemplateStub } from "./logo/template.js";
import { registerIllustrationTemplateStub } from "./illustration/template.js";
import { registerBannerTemplateStub } from "./banner/template.js";

let registered = false;

/** CLIエントリポイントで一度だけ呼び出し、全テンプレート（実装済み＋スタブ）をレジストリへ登録する。 */
export function registerAllTemplates(): void {
  if (registered) return;
  registerWebsiteTemplate();
  registerLogoTemplateStub();
  registerIllustrationTemplateStub();
  registerBannerTemplateStub();
  registered = true;
}

export { getTemplate, listTemplates } from "./registry.js";
