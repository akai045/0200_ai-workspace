/**
 * 既定の生成エンジン：Claude Code操作者への構造化ハンドオフ。
 * このワークスペースはClaude Code自体が生成エンジンとして機能する実績（PROJECT-001）があるため、
 * 外部の画像生成/コード生成APIを必須にせず、まず「構造化プロンプトJSONを書き出す→
 * 操作者（Claude Code）が結果JSONを書き戻す」という形でNF-203のプラガブル性を満たす。
 *
 * Webサイト（pages構成）とロゴ/バナー/チラシ等（artboards構成・GraphicDesignSpec）で
 * 指示文・responseSchemaを分岐する。後者は実装生成後にpostProcessGraphicArtifacts（PNGラスタライズ・
 * プレビューHTML・マニフェスト生成）を機械的に呼び出す（AIの自己申告に依存させない）。
 */
import { basename, dirname, join } from "node:path";
import { copyFile, writeFile } from "node:fs/promises";
import { ensureDir, fileExists, readJson } from "../../store/fileStore.js";
import type { DesignEngine, DesignGenerationRequest } from "../designEngine.js";
import type { ImplementationEngine, ImplementationGenerationRequest } from "../implementationEngine.js";
import type { DesignSpec, GraphicDesignSpec } from "../../core/types.js";
import { artboardIdFor, resolveOutputSizes } from "../../templates/outputSizes.js";
import { postProcessGraphicArtifacts } from "../graphicPostProcess.js";

export class ManualHandoffPendingError extends Error {
  constructor(
    public readonly requestPath: string,
    public readonly responsePath: string,
  ) {
    super(
      `manualHandoffエンジンは応答待ちです。${requestPath} の指示に従い ${responsePath} を作成してから、同じコマンドを再実行してください。`,
    );
    this.name = "ManualHandoffPendingError";
  }
}

interface DesignResponsePayload {
  designs: DesignSpec[];
}

function buildWebsiteDesignRequestPayload(request: DesignGenerationRequest) {
  return {
    instructions:
      `この案件のデザイン案を${request.candidateCount}件、responseSchema通りのJSONで作成し、responsePathのパスへ書き出してください。` +
      "materialGapsでfilledBySuppliedMaterial=falseの枠のみがAI生成対象です（trueの枠は支給素材をそのまま固定要素として使うため、デザイン仕様上はmaterialIdの参照のみ記載してください）。",
    project: { id: request.project.id, title: request.project.title, brief: request.project.brief },
    materials: request.materials,
    materialGaps: request.materialGaps,
    candidateCount: request.candidateCount,
    responseSchema: {
      designs: [
        {
          kind: "website",
          pages: [
            {
              slug: "index",
              title: "string",
              wpTemplate: "front-page | page | archive | single",
              sections: [{ id: "hero", kind: "hero | feature-grid | pricing | faq | contact-form | ...", content: {}, materialId: "任意" }],
            },
          ],
          colorPalette: ["#RRGGBB"],
          typography: { heading: "string", body: "string" },
          usedMaterialIds: ["string"],
        },
      ],
    } satisfies { designs: unknown[] },
    responsePath: request.responsePath,
  };
}

function buildGraphicDesignRequestPayload(request: DesignGenerationRequest) {
  const sizes = resolveOutputSizes(request.project);
  const requiredArtboards = sizes.map((s) => ({ id: artboardIdFor(s), label: s.label, width: s.width, height: s.height }));
  return {
    instructions:
      `この案件の成果物カテゴリは「${request.project.category}」（Webサイト以外）です。` +
      `デザイン案を${request.candidateCount}件、responseSchema通りのJSONで作成し、responsePathのパスへ書き出してください。` +
      `各案は次の${requiredArtboards.length}種類のアートボードで構成してください（1サイズにつき1アートボード）。` +
      "id欄は下記requiredArtboardsのidをそのまま使ってください（実装生成時のファイル名対応に使うため変更しないでください）：" +
      JSON.stringify(requiredArtboards) +
      " materialGapsでfilledBySuppliedMaterial=falseの要素のみがAI生成対象です（trueの要素は支給素材をそのまま固定要素として使うため、" +
      "アートボード仕様上はmaterialIdの参照のみ記載してください）。" +
      (request.project.category === "flyer"
        ? " チラシはデジタル閲覧・データ入稿用途に限定します（紙媒体の物理的な色校正・入稿品質保証は対象外）。"
        : ""),
    project: { id: request.project.id, title: request.project.title, brief: request.project.brief },
    materials: request.materials,
    materialGaps: request.materialGaps,
    candidateCount: request.candidateCount,
    requiredArtboards,
    responseSchema: {
      designs: [
        {
          kind: "graphic",
          artboards: requiredArtboards.map((a) => ({
            id: a.id,
            label: a.label,
            width: a.width,
            height: a.height,
            elements: [
              {
                id: "string",
                kind: "symbol | wordmark | combination | photo | headline | cta | background | ...",
                content: {},
                materialId: "任意",
              },
            ],
            materialId: "任意（アートボード全体が1個の支給素材で構成される場合）",
          })),
          colorPalette: ["#RRGGBB"],
          typography: { heading: "string", body: "string" },
          usedMaterialIds: ["string"],
        },
      ],
    } satisfies { designs: unknown[] },
    responsePath: request.responsePath,
  };
}

export const manualHandoffDesignEngine: DesignEngine = {
  name: "manualHandoff",
  async generateDesigns(request: DesignGenerationRequest): Promise<DesignSpec[]> {
    if (await fileExists(request.responsePath)) {
      const response = await readJson<DesignResponsePayload>(request.responsePath);
      if (response.designs.length !== request.candidateCount) {
        throw new Error(
          `期待したデザイン案数(${request.candidateCount})と応答の件数(${response.designs.length})が一致しません: ${request.responsePath}`,
        );
      }
      return response.designs;
    }

    const requestPayload =
      request.project.category === "website"
        ? buildWebsiteDesignRequestPayload(request)
        : buildGraphicDesignRequestPayload(request);
    await ensureDir(dirname(request.requestPath));
    await writeFile(request.requestPath, JSON.stringify(requestPayload, null, 2), "utf-8");
    throw new ManualHandoffPendingError(request.requestPath, request.responsePath);
  },
};

interface ImplementationResponsePayload {
  files: { path: string; content: string }[];
}

function buildWebsiteImplRequestPayload(request: ImplementationGenerationRequest, copiedFiles: string[]) {
  return {
    instructions:
      "選定済みデザイン仕様(selectedDesign)を、セマンティックなHTML／レスポンシブ対応CSS／必要に応じたJSへ変換し、" +
      "responseSchema通りのJSONをresponsePathへ書き出してください。支給素材はfixedMaterialPathsとしてimages/配下へ配置済みです。" +
      "src/href等でそのパスを参照するのみとし、新規生成・意匠の改変はしないでください。" +
      (request.previousIssues && request.previousIssues.length > 0
        ? " 前回検証で次の指摘があります。実装起因のものはここで修正してください：" +
          JSON.stringify(request.previousIssues)
        : ""),
    project: { id: request.project.id, title: request.project.title },
    selectedDesign: request.selectedDesign,
    fixedMaterialPaths: copiedFiles,
    responseSchema: {
      files: [{ path: "index.html", content: "<!doctype html>...</html>" }],
    },
    responsePath: request.responsePath,
  };
}

function buildGraphicImplRequestPayload(request: ImplementationGenerationRequest, copiedFiles: string[]) {
  const artboards = (request.selectedDesign as GraphicDesignSpec).artboards;
  return {
    instructions:
      "選定済みデザイン仕様(selectedDesign.artboards)の各アートボードについて、" +
      `artboards/<id>.svg というパスでSVGマークアップを1ファイルずつ作成してください（対象id: ${artboards.map((a) => a.id).join(", ")}）。` +
      "responseSchema通りのJSONをresponsePathへ書き出してください。" +
      "SVGのルート要素には必ずviewBoxまたはwidth/height属性を含め、width/heightはアートボードのwidth/heightと一致させてください。" +
      "支給素材はfixedMaterialPathsとしてimages/配下へ配置済みです。SVG内で<image>要素として参照するのみとし、新規生成・意匠の改変はしないでください。" +
      "PNGラスタライズ・プレビューHTMLはこのシステムが機械的に生成するため、SVG以外は作成不要です。" +
      (request.previousIssues && request.previousIssues.length > 0
        ? " 前回検証で次の指摘があります。実装（SVG）起因のものはここで修正してください：" +
          JSON.stringify(request.previousIssues)
        : ""),
    project: { id: request.project.id, title: request.project.title },
    selectedDesign: request.selectedDesign,
    fixedMaterialPaths: copiedFiles,
    responseSchema: {
      files: artboards.map((a) => ({
        path: `artboards/${a.id}.svg`,
        content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${a.width} ${a.height}" width="${a.width}" height="${a.height}">...</svg>`,
      })),
    },
    responsePath: request.responsePath,
  };
}

export const manualHandoffImplementationEngine: ImplementationEngine = {
  name: "manualHandoff",
  async generateImplementation(request: ImplementationGenerationRequest): Promise<{ files: string[] }> {
    // F-208: 支給素材（fixed）はエンジンが機械的にコピーする。AI操作者の裁量では動かさない。
    const copiedFiles: string[] = [];
    for (const material of request.materials.filter((m) => m.fixed)) {
      const destRelative = join("images", basename(material.filePath));
      const destAbsolute = join(request.outputDir, destRelative);
      await ensureDir(dirname(destAbsolute));
      await copyFile(material.filePath, destAbsolute);
      copiedFiles.push(destRelative);
    }

    if (await fileExists(request.responsePath)) {
      const response = await readJson<ImplementationResponsePayload>(request.responsePath);
      const writtenFiles: string[] = [];
      for (const file of response.files) {
        const dest = join(request.outputDir, file.path);
        await ensureDir(dirname(dest));
        await writeFile(dest, file.content, "utf-8");
        writtenFiles.push(file.path);
      }

      let extraFiles: string[] = [];
      if (request.selectedDesign.kind === "graphic") {
        const result = await postProcessGraphicArtifacts(request.outputDir, request.selectedDesign.artboards, writtenFiles);
        extraFiles = result.files;
      }

      return { files: [...copiedFiles, ...writtenFiles, ...extraFiles] };
    }

    const requestPayload =
      request.selectedDesign.kind === "website"
        ? buildWebsiteImplRequestPayload(request, copiedFiles)
        : buildGraphicImplRequestPayload(request, copiedFiles);
    await ensureDir(dirname(request.requestPath));
    await writeFile(request.requestPath, JSON.stringify(requestPayload, null, 2), "utf-8");
    throw new ManualHandoffPendingError(request.requestPath, request.responsePath);
  },
};
