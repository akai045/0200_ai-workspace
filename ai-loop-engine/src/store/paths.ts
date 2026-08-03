import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** ai-loop-engine/ のルート（src/store/ の2つ上）。 */
export const ENGINE_ROOT = join(__dirname, "..", "..");
export const PROJECTS_ROOT = join(ENGINE_ROOT, "projects");

export function projectDir(projectId: string): string {
  return join(PROJECTS_ROOT, projectId);
}

export function projectPointerPath(projectId: string): string {
  return join(projectDir(projectId), "project.json");
}

export function materialsDir(projectId: string): string {
  return join(projectDir(projectId), "materials");
}

export function materialMetaPath(projectId: string, materialId: string): string {
  return join(materialsDir(projectId), `${materialId}.json`);
}

export function materialFileDir(projectId: string, materialId: string): string {
  return join(materialsDir(projectId), materialId);
}

export function designVersionsDir(projectId: string): string {
  return join(projectDir(projectId), "design-versions");
}

export function designVersionPath(projectId: string, version: number, candidateIndex: number): string {
  return join(designVersionsDir(projectId), `v${version}-c${candidateIndex}.json`);
}

export function implementationVersionsDir(projectId: string): string {
  return join(projectDir(projectId), "implementation-versions");
}

export function implementationManifestPath(projectId: string, version: number): string {
  return join(implementationVersionsDir(projectId), `v${version}.json`);
}

export function implementationOutputDir(projectId: string, version: number): string {
  return join(implementationVersionsDir(projectId), `v${version}`, "output");
}

export function verificationResultsDir(projectId: string): string {
  return join(projectDir(projectId), "verification-results");
}

export function verificationResultPath(projectId: string, version: number): string {
  return join(verificationResultsDir(projectId), `v${version}.json`);
}

export function runsLogPath(projectId: string): string {
  return join(projectDir(projectId), "runs", "events.jsonl");
}

export function exportsDir(projectId: string): string {
  return join(projectDir(projectId), "exports");
}

export function handoffDir(projectId: string): string {
  return join(projectDir(projectId), "handoff");
}

export function handoffDesignRequestPath(projectId: string, version: number): string {
  return join(handoffDir(projectId), `design-request-v${version}.json`);
}

export function handoffDesignResponsePath(projectId: string, version: number): string {
  return join(handoffDir(projectId), `design-response-v${version}.json`);
}

export function handoffImplementationRequestPath(projectId: string, version: number): string {
  return join(handoffDir(projectId), `impl-request-v${version}.json`);
}

export function handoffImplementationResponsePath(projectId: string, version: number): string {
  return join(handoffDir(projectId), `impl-response-v${version}.json`);
}
