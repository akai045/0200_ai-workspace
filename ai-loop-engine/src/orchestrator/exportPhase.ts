/** F-701/704・F-301/302: 実装成果物を指定アダプタ（静的HTML／WordPress等）で書き出す。 */
import { getAdapter } from "../adapters/index.js";
import type { ExportResult } from "../adapters/types.js";
import { getProject, listImplementationArtifacts, logProjectEvent } from "../store/projectStore.js";
import { exportsDir } from "../store/paths.js";

export async function exportProject(projectId: string, adapterId: string, version?: number): Promise<ExportResult> {
  const project = await getProject(projectId);
  const artifacts = await listImplementationArtifacts(projectId);
  if (artifacts.length === 0) {
    throw new Error(`プロジェクト"${projectId}"は実装がまだ生成されていません。`);
  }
  const artifact = version !== undefined ? artifacts.find((a) => a.version === version) : artifacts.at(-1);
  if (!artifact) {
    throw new Error(`実装版v${version}が見つかりません。`);
  }

  const adapter = getAdapter(adapterId);
  if (!adapter.implemented || !adapter.run) {
    throw new Error(
      `アダプタ"${adapterId}"は登録スタブのみでPhase1では未実装です（実装済み: static-html, wordpress）。`,
    );
  }

  const result = await adapter.run({ project, artifact, exportsDir: exportsDir(projectId) });
  await logProjectEvent(projectId, "export.completed", { adapter: adapterId, version: artifact.version, outputPath: result.outputPath });
  return result;
}
