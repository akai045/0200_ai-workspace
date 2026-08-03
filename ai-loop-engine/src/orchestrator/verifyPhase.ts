/**
 * F-503/504: 検証実行と収束判定に応じたプロジェクト状態遷移。
 * ここでは「収束＝これ以上自動反復しない」を意味するのみで、"approved"（最終確定）へは進めない。
 * 最終確定はapprove.ts（人間の明示操作）でのみ行う（ADR-0006対立的推論#2）。
 */
import { runVerification } from "../verification/index.js";
import { updateProjectStatus, listImplementationArtifacts } from "../store/projectStore.js";

export interface VerifyOutcome {
  version: number;
  converged: boolean;
  allPassed: boolean;
  markdownPath: string;
}

export async function verifyProject(projectId: string): Promise<VerifyOutcome> {
  const artifacts = await listImplementationArtifacts(projectId);
  if (artifacts.length === 0) {
    throw new Error(`プロジェクト"${projectId}"は実装がまだ生成されていません。先に impl:generate を実行してください。`);
  }
  const version = Math.max(...artifacts.map((a) => a.version));

  const { result, markdownPath } = await runVerification(projectId, version);
  const allPassed = result.checks.every((c) => c.verdict === "適合");
  await updateProjectStatus(projectId, result.convergence.converged ? "converged" : "needs-fix");

  return { version, converged: result.convergence.converged, allPassed, markdownPath };
}
