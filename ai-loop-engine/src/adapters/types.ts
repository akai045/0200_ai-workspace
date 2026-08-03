/**
 * F-701/704（静的出力）・F-301/302（CMSアダプタ）・NF-201（プラグイン拡張性）。
 * 出力先の種類（静的HTML／CMSテーマ）を問わず同一のレジストリ・インターフェースで扱う。
 */
import type { ImplementationArtifact, Project } from "../core/types.js";

export interface ExportInput {
  project: Project;
  artifact: ImplementationArtifact;
  /** 出力先の親ディレクトリ（projects/<id>/exports/）。アダプタはこの配下にファイルを書く。 */
  exportsDir: string;
}

export interface ExportResult {
  /** 生成物の代表パス（zipファイル、またはテーマフォルダ）。 */
  outputPath: string;
  files: string[];
}

export interface ExportAdapter {
  id: string;
  label: string;
  implemented: boolean;
  run?(input: ExportInput): Promise<ExportResult>;
}
