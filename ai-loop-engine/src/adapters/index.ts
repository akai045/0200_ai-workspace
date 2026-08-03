import { registerAdapter, getAdapter, listAdapters } from "./registry.js";
import { staticHtmlAdapter } from "./output/staticHtml.js";
import { wordpressAdapter } from "./cms/wordpress/index.js";
import { CMS_ADAPTER_STUBS } from "./cms/stubs.js";

let registered = false;

/** CLIエントリポイントで一度だけ呼び出し、全出力アダプタ（実装済み＋スタブ）をレジストリへ登録する。 */
export function registerAllAdapters(): void {
  if (registered) return;
  registerAdapter(staticHtmlAdapter);
  registerAdapter(wordpressAdapter);
  for (const stub of CMS_ADAPTER_STUBS) registerAdapter(stub);
  registered = true;
}

export { getAdapter, listAdapters };
export type { ExportAdapter, ExportInput, ExportResult } from "./types.js";
