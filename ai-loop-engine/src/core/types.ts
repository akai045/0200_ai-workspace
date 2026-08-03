/**
 * 要件定義書 §10.1 主要エンティティの型定義。
 * Project / MaterialAsset(支給素材) / DesignVersion / ImplementationArtifact /
 * VerificationResult / OutputTemplate / CmsAdapterConfig。
 */

export type ProjectCategory = "website" | "logo" | "illustration" | "banner" | "flyer";

export type ProjectStatus =
  | "draft"
  | "generating"
  | "design-review"
  | "implementing"
  | "verifying"
  | "needs-fix"
  | "converged"
  | "approved";

export interface BrandGuideline {
  colors?: string[];
  fonts?: string[];
  logoUsageRules?: string;
}

/** F-105/206/207: 生成・検証の両方が同じ値を参照する、機械可読なサイズ要求。 */
export interface OutputSizeSpec {
  label: string;
  width: number;
  height: number;
}

export interface DesignBrief {
  purpose: string;
  targetAudience?: string;
  toneAndManner?: string;
  brandGuideline?: BrandGuideline;
  referenceImages?: string[];
  referenceUrls?: string[];
  outputFormat: string;
  /** 人間向けの自由記述（例：「名刺サイズ、横向き」）。機械判定にはoutputSizesを使う。 */
  sizeSpec?: string;
  /** 未指定の場合はカテゴリごとの既定値（templates/outputSizes.ts）を使う。 */
  outputSizes?: OutputSizeSpec[];
}

export interface Project {
  id: string;
  title: string;
  category: ProjectCategory;
  templateId: string;
  status: ProjectStatus;
  brief: DesignBrief;
  selectedDesignVersion?: number;
  iteration: number;
  createdAt: string;
  updatedAt: string;
}

/** F-108〜F-110: 支給素材（意匠を改変せず固定要素として組み込む対象）と参考画像を区別する台帳エントリ。 */
export interface MaterialAsset {
  id: string;
  projectId: string;
  filePath: string;
  usageTag: string;
  /** true=支給素材（固定・改変禁止）。false=参考画像（生成の参考のみ、そのまま採用しない）。 */
  fixed: boolean;
  originalHash: string;
  dimensions?: { width: number; height: number };
  altText?: string;
  registeredAt: string;
  /** 差し替え時、旧版のMaterialAsset.id（10.3：旧版は版管理下で残す）。 */
  supersedes?: string;
}

export interface DesignSectionSpec {
  id: string;
  kind: string;
  content: Record<string, unknown>;
  materialId?: string;
}

export interface DesignPageSpec {
  slug: string;
  title: string;
  wpTemplate: string;
  sections: DesignSectionSpec[];
}

export interface WebsiteDesignSpec {
  kind: "website";
  pages: DesignPageSpec[];
  colorPalette: string[];
  typography: { heading: string; body: string };
  usedMaterialIds: string[];
}

/** ロゴ/バナー/チラシ等、単一〜複数アートボード（固定サイズのキャンバス）で完結する成果物のデザイン仕様。 */
export interface GraphicArtboardSpec {
  /** OutputSizeSpecから機械的に決まるid（templates/outputSizes.ts の artboardIdFor）。実装生成時のファイル名対応に使う。 */
  id: string;
  label: string;
  width: number;
  height: number;
  elements: DesignSectionSpec[];
  materialId?: string;
}

export interface GraphicDesignSpec {
  kind: "graphic";
  artboards: GraphicArtboardSpec[];
  colorPalette: string[];
  typography: { heading: string; body: string };
  usedMaterialIds: string[];
}

/** kindで判別する（Webサイト＝ページ構成、それ以外＝アートボード構成）。 */
export type DesignSpec = WebsiteDesignSpec | GraphicDesignSpec;

/** F-106: 1回の生成で複数案（既定3案）を提示する。version×candidateIndexで一意。 */
export interface DesignVersion {
  version: number;
  candidateIndex: number;
  projectId: string;
  spec: DesignSpec;
  generatedBy: string;
  generatedAt: string;
  selected: boolean;
}

export interface ImplementationArtifact {
  version: number;
  projectId: string;
  designVersion: number;
  designCandidateIndex: number;
  outputDir: string;
  files: string[];
  generatedBy: string;
  generatedAt: string;
}

export type VerificationCheckId =
  | "html-lint"
  | "css-lint"
  | "js-lint"
  | "accessibility"
  | "responsive"
  | "visual-diff"
  | "materials-unchanged"
  | "svg-lint"
  | "multi-size-output"
  | "brand-consistency";

/** Checker既存の3値判定（適合/不適合/判定不能）を検証エンジンの各項目にも適用する。 */
export type VerificationVerdict = "適合" | "不適合" | "判定不能";

export interface VerificationCheck {
  id: VerificationCheckId;
  label: string;
  verdict: VerificationVerdict;
  score?: number;
  issues: string[];
}

export interface ConvergenceVerdict {
  converged: boolean;
  reason: string;
  iterationsUsed: number;
  maxIterations: number;
}

export interface VerificationResult {
  version: number;
  projectId: string;
  implementationVersion: number;
  checks: VerificationCheck[];
  convergence: ConvergenceVerdict;
  verifiedAt: string;
}

export interface TemplateSlot {
  usageTag: string;
  label: string;
  required: boolean;
}

/** F-601/602・NF-201: 成果物テンプレート機構。カテゴリごとの生成/検証/出力ルール定義。 */
export interface OutputTemplate {
  id: string;
  category: ProjectCategory;
  label: string;
  requiredSlots: TemplateSlot[];
  requiredVerificationChecks: VerificationCheckId[];
  implemented: boolean;
}

/** CMSアダプタ設定。Phase1ではライブ投入の資格情報は扱わない（ADR-0007 / NF-302はPhase2以降）。 */
export interface CmsAdapterConfig {
  id: string;
  cmsType: string;
  projectId: string;
  transformOptions?: Record<string, unknown>;
}
