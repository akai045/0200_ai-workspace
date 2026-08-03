/** F-305: WordPress以外のCMSはレジストリへの登録スタブのみ（中身は実測後・Phase2以降）。 */
import type { ExportAdapter } from "../types.js";

export const CMS_ADAPTER_STUBS: ExportAdapter[] = [
  { id: "microcms", label: "microCMS（Phase2以降・未実装）", implemented: false },
  { id: "shopify", label: "Shopify（Phase2以降・未実装）", implemented: false },
  { id: "movable-type", label: "Movable Type（Phase2以降・未実装）", implemented: false },
];
