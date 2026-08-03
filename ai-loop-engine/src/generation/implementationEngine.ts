/**
 * F-201-203/501-502: 確定デザインをHTML/CSS/JS等へ変換する抽象インターフェース。
 * 修正反復時は previousIssues（検証指摘事項）を受け取り、実装起因の修正に反映する。
 */
import type { DesignSpec, MaterialAsset, Project, VerificationCheck } from "../core/types.js";

export interface ImplementationGenerationRequest {
  project: Project;
  selectedDesign: DesignSpec;
  materials: MaterialAsset[];
  outputDir: string;
  version: number;
  requestPath: string;
  responsePath: string;
  previousIssues?: VerificationCheck[];
}

export interface ImplementationEngine {
  name: string;
  generateImplementation(request: ImplementationGenerationRequest): Promise<{ files: string[] }>;
}
