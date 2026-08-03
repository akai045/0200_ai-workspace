import { join } from "node:path";
import { listDesignVersions } from "../../../store/projectStore.js";
import type { ExportAdapter, ExportInput, ExportResult } from "../../types.js";
import { buildWordpressTheme, writeThemeFiles } from "./transform.js";

async function run(input: ExportInput): Promise<ExportResult> {
  const candidates = await listDesignVersions(input.project.id, input.artifact.designVersion);
  const selected = candidates.find((c) => c.candidateIndex === input.artifact.designCandidateIndex);
  if (!selected) {
    throw new Error(
      `実装版v${input.artifact.version}が参照するデザイン版(v${input.artifact.designVersion}-c${input.artifact.designCandidateIndex})が見つかりません。`,
    );
  }

  const themeDir = join(input.exportsDir, `${input.project.id}-v${input.artifact.version}-wordpress`);
  const built = await buildWordpressTheme(input.project, selected.spec, input.artifact);
  const files = await writeThemeFiles(themeDir, built, input.artifact);
  return { outputPath: themeDir, files };
}

export const wordpressAdapter: ExportAdapter = {
  id: "wordpress",
  label: "WordPressテーマファイル一式",
  implemented: true,
  run,
};
