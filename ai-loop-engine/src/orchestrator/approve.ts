/**
 * F-504: 最終承認（人間チェックポイント）。verifyが収束("converged")と判定した後も、
 * この明示コマンドを経ない限りプロジェクトは最終状態("approved")にならない
 * （CLAUDE.md §1・ADR-0006対立的推論#2：statusの書き手は人間/Claude Codeのみ、自動連鎖させない）。
 */
import { getProject, updateProjectStatus, listVerificationResults } from "../store/projectStore.js";

export async function approveProject(projectId: string): Promise<void> {
  const project = await getProject(projectId);
  if (project.status !== "converged") {
    throw new Error(
      `プロジェクト"${projectId}"は収束("converged")状態ではありません（現在: ${project.status}）。` +
        "verify --project で収束するまで impl:generate → verify を反復してから approve を実行してください。",
    );
  }
  const results = await listVerificationResults(projectId);
  const latest = results[results.length - 1];
  if (!latest) {
    throw new Error(`プロジェクト"${projectId}"の検証結果が見つかりません。`);
  }
  await updateProjectStatus(projectId, "approved");
}
