/**
 * F-108: 支給素材の受付・登録。用途タグ付けし、固定要素（fixed）と参考画像を区別する。
 * テンプレートの既知スロット語彙との照合はここで行う（store層は素材の永続化のみを担当）。
 */
import type { MaterialAsset } from "../core/types.js";
import { getTemplate } from "../templates/registry.js";
import { addMaterial as persistMaterial, getProject, listMaterials as listPersistedMaterials } from "../store/projectStore.js";
import { detectMaterialGaps, type SlotStatus } from "./gapDetection.js";

export interface RegisterMaterialInput {
  projectId: string;
  sourceFilePath: string;
  usageTag: string;
  fixed: boolean;
  altText?: string;
  supersedes?: string;
}

export async function registerMaterial(input: RegisterMaterialInput): Promise<MaterialAsset> {
  const project = await getProject(input.projectId);
  const template = getTemplate(project.templateId);
  const knownTags = template.requiredSlots.map((s) => s.usageTag);
  if (!knownTags.includes(input.usageTag)) {
    console.warn(
      `[materials] usageTag "${input.usageTag}" はテンプレート"${template.id}"の既知スロット（${knownTags.join(", ")}）にありません。カスタムタグとして登録します。`,
    );
  }
  return persistMaterial(input);
}

export async function listMaterials(projectId: string): Promise<MaterialAsset[]> {
  return listPersistedMaterials(projectId);
}

export async function materialGapReport(projectId: string): Promise<SlotStatus[]> {
  const project = await getProject(projectId);
  const template = getTemplate(project.templateId);
  const materials = await listPersistedMaterials(projectId);
  return detectMaterialGaps(template, materials);
}
