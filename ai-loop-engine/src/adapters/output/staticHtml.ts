/** F-701/704: 実装成果物一式を静的HTMLのzipとして書き出す。 */
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import archiver from "archiver";
import { ensureDir } from "../../store/fileStore.js";
import type { ExportAdapter, ExportInput, ExportResult } from "../types.js";

async function run(input: ExportInput): Promise<ExportResult> {
  await ensureDir(input.exportsDir);
  const zipPath = join(input.exportsDir, `${input.project.id}-v${input.artifact.version}-static-html.zip`);
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", () => resolve());
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(input.artifact.outputDir, false);
    archive.finalize().catch(reject);
  });
  return { outputPath: zipPath, files: input.artifact.files };
}

export const staticHtmlAdapter: ExportAdapter = {
  id: "static-html",
  label: "静的HTML一式（zip）",
  implemented: true,
  run,
};
