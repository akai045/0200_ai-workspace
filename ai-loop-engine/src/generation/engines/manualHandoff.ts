/**
 * 既定の生成エンジン：Claude Code操作者への構造化ハンドオフ。
 * このワークスペースはClaude Code自体が生成エンジンとして機能する実績（PROJECT-001）があるため、
 * 外部の画像生成/コード生成APIを必須にせず、まず「構造化プロンプトJSONを書き出す→
 * 操作者（Claude Code）が結果JSONを書き戻す」という形でNF-203のプラガブル性を満たす。
 */
import { basename, dirname, join } from "node:path";
import { copyFile, writeFile } from "node:fs/promises";
import { ensureDir, fileExists, readJson } from "../../store/fileStore.js";
import type { DesignEngine, DesignGenerationRequest } from "../designEngine.js";
import type { ImplementationEngine, ImplementationGenerationRequest } from "../implementationEngine.js";
import type { DesignSpec } from "../../core/types.js";

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

    const requestPayload = {
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
    await ensureDir(dirname(request.requestPath));
    await writeFile(request.requestPath, JSON.stringify(requestPayload, null, 2), "utf-8");
    throw new ManualHandoffPendingError(request.requestPath, request.responsePath);
  },
};

interface ImplementationResponsePayload {
  files: { path: string; content: string }[];
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
      for (const file of response.files) {
        const dest = join(request.outputDir, file.path);
        await ensureDir(dirname(dest));
        await writeFile(dest, file.content, "utf-8");
      }
      return { files: [...copiedFiles, ...response.files.map((f) => f.path)] };
    }

    const requestPayload = {
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
    await ensureDir(dirname(request.requestPath));
    await writeFile(request.requestPath, JSON.stringify(requestPayload, null, 2), "utf-8");
    throw new ManualHandoffPendingError(request.requestPath, request.responsePath);
  },
};
