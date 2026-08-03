/**
 * ロゴ/バナー/チラシ（GraphicDesignSpec）専用の実装後処理。
 * AI/操作者が書き出すのはSVG（ベクター・意匠そのもの）のみとし、
 * PNGラスタライズ（F-206/207のマルチ解像度出力）とプレビューHTMLはここで機械的に生成する
 * （AIの自己申告に依存させず、後段のverification（svg-lint/multi-size-output/brand-consistency/visual-diff）が
 * 実測できる状態を作ることが目的）。
 */
import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import type { GraphicArtboardSpec } from "../core/types.js";
import { ensureDir, fileExists, tryReadJson } from "../store/fileStore.js";

export interface ArtboardManifestEntry {
  id: string;
  label: string;
  width: number;
  height: number;
  svgPath?: string;
  previewPath?: string;
  rasterPath?: string;
  note?: string;
}

export interface ArtboardsManifest {
  artboards: ArtboardManifestEntry[];
}

export const ARTBOARDS_MANIFEST_FILENAME = "artboards-manifest.json";

function wrapSvgAsPreviewHtml(svgContent: string, artboardLabel: string): string {
  return (
    "<!doctype html>\n" +
    '<html lang="ja"><head><meta charset="utf-8">' +
    `<title>プレビュー: ${artboardLabel}</title>` +
    "<style>html,body{margin:0;padding:0;background:#ffffff;}svg{display:block;}</style>" +
    "</head><body>" +
    svgContent +
    "</body></html>\n"
  );
}

/**
 * 選定済みデザイン仕様(artboards)を正として、各`artboards/<id>.svg`を探し、
 * プレビューHTML・PNGラスタ・マニフェストを機械的に生成する。
 * SVGが見つからないアートボードもマニフェストへnote付きで記録し、検証側で不適合として検出できるようにする（隠蔽しない）。
 */
export async function postProcessGraphicArtifacts(
  outputDir: string,
  artboards: GraphicArtboardSpec[],
  writtenFiles: string[],
): Promise<{ files: string[] }> {
  const extraFiles: string[] = [];
  const manifest: ArtboardsManifest = { artboards: [] };

  const browser = await chromium.launch();
  try {
    for (const artboard of artboards) {
      const svgRelPath = `artboards/${artboard.id}.svg`;
      const svgAbsPath = join(outputDir, svgRelPath);
      if (!writtenFiles.includes(svgRelPath) || !(await fileExists(svgAbsPath))) {
        manifest.artboards.push({
          id: artboard.id,
          label: artboard.label,
          width: artboard.width,
          height: artboard.height,
          note: `期待したSVG(${svgRelPath})が見つかりません。実装生成の応答を確認してください。`,
        });
        continue;
      }

      const svgContent = await readFile(svgAbsPath, "utf-8");
      const previewRelPath = `artboards/${artboard.id}.preview.html`;
      const previewAbsPath = join(outputDir, previewRelPath);
      await ensureDir(join(outputDir, "artboards"));
      await writeFile(previewAbsPath, wrapSvgAsPreviewHtml(svgContent, artboard.label), "utf-8");
      extraFiles.push(previewRelPath);

      const rasterRelPath = `raster/${artboard.id}.png`;
      const rasterAbsPath = join(outputDir, rasterRelPath);
      await ensureDir(join(outputDir, "raster"));
      const page = await browser.newPage({ viewport: { width: artboard.width, height: artboard.height } });
      try {
        await page.goto(new URL(`file://${previewAbsPath}`).toString());
        const buffer = await page.screenshot({ clip: { x: 0, y: 0, width: artboard.width, height: artboard.height } });
        await writeFile(rasterAbsPath, buffer);
      } finally {
        await page.close();
      }
      extraFiles.push(rasterRelPath);

      manifest.artboards.push({
        id: artboard.id,
        label: artboard.label,
        width: artboard.width,
        height: artboard.height,
        svgPath: svgRelPath,
        previewPath: previewRelPath,
        rasterPath: rasterRelPath,
      });
    }
  } finally {
    await browser.close();
  }

  const manifestRelPath = ARTBOARDS_MANIFEST_FILENAME;
  await writeFile(join(outputDir, manifestRelPath), JSON.stringify(manifest, null, 2) + "\n", "utf-8");
  extraFiles.push(manifestRelPath);

  return { files: extraFiles };
}

export async function tryReadArtboardsManifest(outputDir: string): Promise<ArtboardsManifest | undefined> {
  return tryReadJson<ArtboardsManifest>(join(outputDir, ARTBOARDS_MANIFEST_FILENAME));
}
