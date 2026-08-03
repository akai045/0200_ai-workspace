/**
 * F-201-203/501-502: 選定済みデザインの実装生成。design:selectを経ていない（selectedDesignVersion未設定）
 * 場合は明示的にエラーとし、人間チェックポイントを自動で飛ばさない（ADR-0006対立的推論#2）。
 * 2回目以降は直前の検証結果の不適合項目をpreviousIssuesとしてエンジンへ渡す（反復修正）。
 */
import type { VerificationCheck } from "../core/types.js";
import { loadConfig } from "../core/config.js";
import { getImplementationEngine } from "../generation/index.js";
import { listMaterials } from "../materials/ledger.js";
import {
  getProject,
  updateProjectStatus,
  listDesignVersions,
  listImplementationArtifacts,
  addImplementationArtifact,
  implementationOutputPath,
  getVerificationResult,
} from "../store/projectStore.js";
import { handoffImplementationRequestPath, handoffImplementationResponsePath } from "../store/paths.js";

export interface GenerateImplementationOutcome {
  version: number;
  files: string[];
}

async function previousIssuesFor(projectId: string, implementationVersion: number): Promise<VerificationCheck[] | undefined> {
  if (implementationVersion <= 1) return undefined;
  try {
    const previous = await getVerificationResult(projectId, implementationVersion - 1);
    const failed = previous.checks.filter((c) => c.verdict === "不適合");
    return failed.length > 0 ? failed : undefined;
  } catch {
    return undefined;
  }
}

export async function generateImplementationVersion(projectId: string): Promise<GenerateImplementationOutcome> {
  const project = await getProject(projectId);
  if (project.selectedDesignVersion === undefined) {
    throw new Error(
      `プロジェクト"${projectId}"はデザイン案が未選定です。先に design:select --project ${projectId} --version <n> --candidate <c> を実行してください。`,
    );
  }
  const candidates = await listDesignVersions(projectId, project.selectedDesignVersion);
  const selected = candidates.find((c) => c.selected);
  if (!selected) {
    throw new Error(`選定済みのデザイン版(v${project.selectedDesignVersion})が見つかりません。design:selectをやり直してください。`);
  }

  const config = await loadConfig();
  const engine = getImplementationEngine(config.generationEngine);
  const version = (await listImplementationArtifacts(projectId)).length + 1;
  const outputDir = implementationOutputPath(projectId, version);
  const materials = await listMaterials(projectId);
  const previousIssues = await previousIssuesFor(projectId, version);

  await updateProjectStatus(projectId, "implementing");

  const { files } = await engine.generateImplementation({
    project,
    selectedDesign: selected.spec,
    materials,
    outputDir,
    version,
    requestPath: handoffImplementationRequestPath(projectId, version),
    responsePath: handoffImplementationResponsePath(projectId, version),
    previousIssues,
  });
  // ManualHandoffPendingErrorがここで投げられた場合、statusは"implementing"のまま残る（design:generateと同型の冪等再実行）。

  await addImplementationArtifact({
    projectId,
    version,
    designVersion: selected.version,
    designCandidateIndex: selected.candidateIndex,
    files,
    generatedBy: engine.name,
  });
  await updateProjectStatus(projectId, "verifying");

  return { version, files };
}
