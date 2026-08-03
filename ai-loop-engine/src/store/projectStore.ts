import { join } from "node:path";
import type {
  CmsAdapterConfig,
  DesignSpec,
  DesignVersion,
  ImplementationArtifact,
  MaterialAsset,
  Project,
  ProjectCategory,
  ProjectStatus,
  VerificationCheck,
  ConvergenceVerdict,
  VerificationResult,
} from "../core/types.js";
import {
  appendJsonl,
  ensureDir,
  fileExists,
  readJson,
  sha256File,
  tryReadJson,
  writeJsonVersioned,
  writePointer,
} from "./fileStore.js";
import {
  designVersionPath,
  designVersionsDir,
  implementationManifestPath,
  implementationOutputDir,
  implementationVersionsDir,
  materialFileDir,
  materialMetaPath,
  materialsDir,
  projectDir,
  projectPointerPath,
  runsLogPath,
  verificationResultPath,
  verificationResultsDir,
} from "./paths.js";
import { readdir, copyFile } from "node:fs/promises";

export interface CreateProjectInput {
  id: string;
  title: string;
  category: ProjectCategory;
  templateId: string;
  brief: Project["brief"];
}

async function logEvent(projectId: string, type: string, data: Record<string, unknown>): Promise<void> {
  await appendJsonl(runsLogPath(projectId), { at: new Date().toISOString(), type, ...data });
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  if (await fileExists(projectPointerPath(input.id))) {
    throw new Error(`project already exists: ${input.id}`);
  }
  const now = new Date().toISOString();
  const project: Project = {
    id: input.id,
    title: input.title,
    category: input.category,
    templateId: input.templateId,
    status: "draft",
    brief: input.brief,
    iteration: 0,
    createdAt: now,
    updatedAt: now,
  };
  await ensureDir(projectDir(input.id));
  await writePointer(projectPointerPath(input.id), project);
  await logEvent(input.id, "project.created", { title: input.title, category: input.category });
  return project;
}

export async function getProject(projectId: string): Promise<Project> {
  return readJson<Project>(projectPointerPath(projectId));
}

export async function tryGetProject(projectId: string): Promise<Project | undefined> {
  return tryReadJson<Project>(projectPointerPath(projectId));
}

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus,
  patch: Partial<Project> = {},
): Promise<Project> {
  const current = await getProject(projectId);
  const updated: Project = {
    ...current,
    ...patch,
    status,
    updatedAt: new Date().toISOString(),
  };
  await writePointer(projectPointerPath(projectId), updated);
  await logEvent(projectId, "project.status-changed", { from: current.status, to: status });
  return updated;
}

// ---- Materials（支給素材台帳） ----

export interface AddMaterialInput {
  projectId: string;
  sourceFilePath: string;
  usageTag: string;
  fixed: boolean;
  altText?: string;
  supersedes?: string;
}

function materialIdFor(usageTag: string): string {
  return `${usageTag}-${Date.now()}`.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function addMaterial(input: AddMaterialInput): Promise<MaterialAsset> {
  const id = materialIdFor(input.usageTag);
  const destDir = materialFileDir(input.projectId, id);
  await ensureDir(destDir);
  const ext = input.sourceFilePath.includes(".")
    ? input.sourceFilePath.slice(input.sourceFilePath.lastIndexOf("."))
    : "";
  const destPath = join(destDir, `original${ext}`);
  await copyFile(input.sourceFilePath, destPath);
  const hash = await sha256File(destPath);

  const asset: MaterialAsset = {
    id,
    projectId: input.projectId,
    filePath: destPath,
    usageTag: input.usageTag,
    fixed: input.fixed,
    originalHash: hash,
    altText: input.altText,
    registeredAt: new Date().toISOString(),
    supersedes: input.supersedes,
  };
  await ensureDir(materialsDir(input.projectId));
  await writeJsonVersioned(materialMetaPath(input.projectId, id), asset);
  await logEvent(input.projectId, "material.added", { materialId: id, usageTag: input.usageTag, fixed: input.fixed });
  return asset;
}

export async function listMaterials(projectId: string): Promise<MaterialAsset[]> {
  const dir = materialsDir(projectId);
  if (!(await fileExists(dir))) return [];
  const entries = await readdir(dir);
  const jsonFiles = entries.filter((f) => f.endsWith(".json"));
  const assets = await Promise.all(jsonFiles.map((f) => readJson<MaterialAsset>(join(dir, f))));
  // 差し替え済み（supersedesされた側）を除いた「現行」素材一覧
  const supersededIds = new Set(assets.map((a) => a.supersedes).filter(Boolean) as string[]);
  return assets.filter((a) => !supersededIds.has(a.id));
}

// ---- Design versions ----

export async function addDesignVersion(
  projectId: string,
  version: number,
  candidateIndex: number,
  spec: DesignSpec,
  generatedBy: string,
): Promise<DesignVersion> {
  const designVersion: DesignVersion = {
    version,
    candidateIndex,
    projectId,
    spec,
    generatedBy,
    generatedAt: new Date().toISOString(),
    selected: false,
  };
  await writeJsonVersioned(designVersionPath(projectId, version, candidateIndex), designVersion);
  await logEvent(projectId, "design.generated", { version, candidateIndex, generatedBy });
  return designVersion;
}

export async function listDesignVersions(projectId: string, version?: number): Promise<DesignVersion[]> {
  const dir = designVersionsDir(projectId);
  if (!(await fileExists(dir))) return [];
  const entries = await readdir(dir);
  const files = entries.filter((f) => f.endsWith(".json") && (version === undefined || f.startsWith(`v${version}-`)));
  const versions = await Promise.all(files.map((f) => readJson<DesignVersion>(join(dir, f))));
  const selection = await tryReadJson<{ version: number; candidateIndex: number }>(
    join(projectDir(projectId), "design-selection.json"),
  );
  return versions.map((v) => ({
    ...v,
    selected: !!selection && selection.version === v.version && selection.candidateIndex === v.candidateIndex,
  }));
}

export async function selectDesignVersion(
  projectId: string,
  version: number,
  candidateIndex: number,
): Promise<void> {
  const path = designVersionPath(projectId, version, candidateIndex);
  if (!(await fileExists(path))) {
    throw new Error(`design version not found: v${version}-c${candidateIndex}`);
  }
  await writePointer(join(projectDir(projectId), "design-selection.json"), { version, candidateIndex });
  await logEvent(projectId, "design.selected", { version, candidateIndex });
}

// ---- Implementation artifacts ----

export interface AddImplementationArtifactInput {
  projectId: string;
  version: number;
  designVersion: number;
  designCandidateIndex: number;
  files: string[];
  generatedBy: string;
}

export async function addImplementationArtifact(
  input: AddImplementationArtifactInput,
): Promise<ImplementationArtifact> {
  const outputDir = implementationOutputDir(input.projectId, input.version);
  await ensureDir(outputDir);
  const artifact: ImplementationArtifact = {
    version: input.version,
    projectId: input.projectId,
    designVersion: input.designVersion,
    designCandidateIndex: input.designCandidateIndex,
    outputDir,
    files: input.files,
    generatedBy: input.generatedBy,
    generatedAt: new Date().toISOString(),
  };
  await ensureDir(implementationVersionsDir(input.projectId));
  await writeJsonVersioned(implementationManifestPath(input.projectId, input.version), artifact);
  await logEvent(input.projectId, "implementation.generated", { version: input.version });
  return artifact;
}

export async function getImplementationArtifact(projectId: string, version: number): Promise<ImplementationArtifact> {
  return readJson<ImplementationArtifact>(implementationManifestPath(projectId, version));
}

export async function listImplementationArtifacts(projectId: string): Promise<ImplementationArtifact[]> {
  const dir = implementationVersionsDir(projectId);
  if (!(await fileExists(dir))) return [];
  const entries = await readdir(dir);
  const files = entries.filter((f) => f.endsWith(".json"));
  return Promise.all(files.map((f) => readJson<ImplementationArtifact>(join(dir, f))));
}

export function implementationOutputPath(projectId: string, version: number): string {
  return implementationOutputDir(projectId, version);
}

// ---- Verification results ----

export async function addVerificationResult(
  projectId: string,
  version: number,
  implementationVersion: number,
  checks: VerificationCheck[],
  convergence: ConvergenceVerdict,
): Promise<VerificationResult> {
  const result: VerificationResult = {
    version,
    projectId,
    implementationVersion,
    checks,
    convergence,
    verifiedAt: new Date().toISOString(),
  };
  await ensureDir(verificationResultsDir(projectId));
  await writeJsonVersioned(verificationResultPath(projectId, version), result);
  await logEvent(projectId, "verification.completed", {
    version,
    converged: convergence.converged,
    failedChecks: checks.filter((c) => c.verdict === "不適合").map((c) => c.id),
  });
  return result;
}

export async function getVerificationResult(projectId: string, version: number): Promise<VerificationResult> {
  return readJson<VerificationResult>(verificationResultPath(projectId, version));
}

export async function listVerificationResults(projectId: string): Promise<VerificationResult[]> {
  const dir = verificationResultsDir(projectId);
  if (!(await fileExists(dir))) return [];
  const entries = await readdir(dir);
  const files = entries.filter((f) => f.endsWith(".json"));
  const results = await Promise.all(files.map((f) => readJson<VerificationResult>(join(dir, f))));
  return results.sort((a, b) => a.version - b.version);
}

// ---- CMS adapter config（Phase1では変換設定のみ。資格情報は扱わない） ----

export async function saveCmsAdapterConfig(config: CmsAdapterConfig): Promise<void> {
  const path = join(projectDir(config.projectId), "cms-adapter-config.json");
  await writePointer(path, config);
}

export async function getCmsAdapterConfig(projectId: string): Promise<CmsAdapterConfig | undefined> {
  const path = join(projectDir(projectId), "cms-adapter-config.json");
  return tryReadJson<CmsAdapterConfig>(path);
}

export { logEvent as logProjectEvent };
