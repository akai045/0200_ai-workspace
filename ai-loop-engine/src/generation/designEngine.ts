/**
 * F-101/102/106: 要件入力からデザイン案（既定3案）を生成する抽象インターフェース。
 * NF-203（AIモデル/API差し替え可能）に対応し、具象エンジンは engines/ 配下に実装する。
 */
import type { DesignSpec, MaterialAsset, Project } from "../core/types.js";
import type { SlotStatus } from "../materials/gapDetection.js";

export interface DesignGenerationRequest {
  project: Project;
  materials: MaterialAsset[];
  materialGaps: SlotStatus[];
  candidateCount: number;
  version: number;
  requestPath: string;
  responsePath: string;
}

export interface DesignEngine {
  name: string;
  generateDesigns(request: DesignGenerationRequest): Promise<DesignSpec[]>;
}
