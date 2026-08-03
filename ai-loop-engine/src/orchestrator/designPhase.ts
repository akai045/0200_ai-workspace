/**
 * F-501/502・要件5.2: デザイン生成→選定の2段階。design:select（人間チェックポイント）を経ないと
 * impl:generate側でエラーになる（selectedDesignVersionが未設定のため）。ここでは状態遷移のみを担い、
 * 生成そのものはgeneration/エンジンに委譲する。
 */
import type { DesignBrief, DesignVersion } from "../core/types.js";
import { loadConfig } from "../core/config.js";
import { getDesignEngine } from "../generation/index.js";
import { materialGapReport, listMaterials } from "../materials/ledger.js";
import {
  getProject,
  updateProjectStatus,
  addDesignVersion,
  listDesignVersions,
  selectDesignVersion,
} from "../store/projectStore.js";
import { handoffDesignRequestPath, handoffDesignResponsePath } from "../store/paths.js";

export interface GenerateDesignsOutcome {
  version: number;
  candidates: DesignVersion[];
}

async function nextDesignVersion(projectId: string): Promise<number> {
  const existing = await listDesignVersions(projectId);
  return existing.reduce((max, v) => Math.max(max, v.version), 0) + 1;
}

export async function generateDesignVersions(
  projectId: string,
  briefOverride?: DesignBrief,
): Promise<GenerateDesignsOutcome> {
  const project = await getProject(projectId);
  const brief = briefOverride ?? project.brief;
  const config = await loadConfig();
  const engine = getDesignEngine(config.generationEngine);
  const version = await nextDesignVersion(projectId);

  await updateProjectStatus(projectId, "generating", { brief });

  const materials = await listMaterials(projectId);
  const materialGaps = await materialGapReport(projectId);

  const specs = await engine.generateDesigns({
    project: { ...project, brief },
    materials,
    materialGaps,
    candidateCount: config.designCandidateCount,
    version,
    requestPath: handoffDesignRequestPath(projectId, version),
    responsePath: handoffDesignResponsePath(projectId, version),
  });
  // ManualHandoffPendingErrorがここで投げられた場合、statusは"generating"のまま残る。
  // 応答ファイルが書かれた後の再実行はversion計算が冪等なため同じversionへ再度書き込みに行き、成功する。

  const candidates: DesignVersion[] = [];
  for (let candidateIndex = 0; candidateIndex < specs.length; candidateIndex++) {
    candidates.push(await addDesignVersion(projectId, version, candidateIndex, specs[candidateIndex], engine.name));
  }

  await updateProjectStatus(projectId, "design-review");
  return { version, candidates };
}

export async function selectDesign(projectId: string, version: number, candidateIndex: number): Promise<void> {
  const project = await getProject(projectId);
  if (project.status !== "design-review" && project.selectedDesignVersion === undefined) {
    // design-review以外でも再選定は許すが、一度もデザイン生成していない状態からの選定は無意味なので警告のみ。
    console.warn(`[orchestrator] プロジェクト"${projectId}"はまだデザイン生成(design:generate)を経ていません。`);
  }
  await selectDesignVersion(projectId, version, candidateIndex);
  await updateProjectStatus(projectId, project.status, { selectedDesignVersion: version });
}
