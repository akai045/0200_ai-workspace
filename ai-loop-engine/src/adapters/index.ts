import { registerAdapter, getAdapter, listAdapters } from "./registry.js";
import { staticHtmlAdapter } from "./output/staticHtml.js";
import { epsAdapter } from "./output/epsExport.js";
import { wordpressAdapter } from "./cms/wordpress/index.js";
import { microcmsAdapter } from "./cms/microcms/index.js";
import { shopifyAdapter } from "./cms/shopify/index.js";
import { movableTypeAdapter } from "./cms/movableType/index.js";

let registered = false;

/** CLIエントリポイントで一度だけ呼び出し、全出力アダプタをレジストリへ登録する。 */
export function registerAllAdapters(): void {
  if (registered) return;
  registerAdapter(staticHtmlAdapter);
  registerAdapter(epsAdapter);
  registerAdapter(wordpressAdapter);
  registerAdapter(microcmsAdapter);
  registerAdapter(shopifyAdapter);
  registerAdapter(movableTypeAdapter);
  registered = true;
}

export { getAdapter, listAdapters };
export type { ExportAdapter, ExportInput, ExportResult } from "./types.js";
