import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface TextFile {
  path: string;
  content: string;
}

export async function readTextFilesByExt(outputDir: string, files: string[], ext: string): Promise<TextFile[]> {
  const matches = files.filter((f) => f.endsWith(ext));
  return Promise.all(
    matches.map(async (path) => ({ path, content: await readFile(join(outputDir, path), "utf-8") })),
  );
}
