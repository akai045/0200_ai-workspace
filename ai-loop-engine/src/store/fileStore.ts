/**
 * ファイルベースJSONストア（SQLiteを使わない／ADR-0007）。
 * ADR-0003の可逆性ガードレールと同型：版ファイルは追記のみで上書きしない。
 * 唯一の可変ポインタ（project.json）も、上書き前に必ず旧内容を履歴へ退避する。
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile, appendFile, access } from "node:fs/promises";
import { dirname } from "node:path";

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export async function tryReadJson<T>(filePath: string): Promise<T | undefined> {
  if (!(await fileExists(filePath))) return undefined;
  return readJson<T>(filePath);
}

/** 版ファイルの新規書き込み。既存パスへの上書きは許さない（版は追記専用）。 */
export async function writeJsonVersioned(filePath: string, data: unknown): Promise<void> {
  if (await fileExists(filePath)) {
    throw new Error(`versioned file already exists, refusing to overwrite: ${filePath}`);
  }
  await ensureDir(dirname(filePath));
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/**
 * 可変ポインタファイル（例：project.json）の更新。
 * 上書き前に旧内容を同名 `.history.jsonl` へ追記し、判定に依存せず常に退避する（ADR-0003）。
 */
export async function writePointer(filePath: string, data: unknown): Promise<void> {
  await ensureDir(dirname(filePath));
  const previous = await tryReadJson<unknown>(filePath);
  if (previous !== undefined) {
    const historyPath = `${filePath}.history.jsonl`;
    await appendFile(
      historyPath,
      JSON.stringify({ archivedAt: new Date().toISOString(), value: previous }) + "\n",
      "utf-8",
    );
  }
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function appendJsonl(filePath: string, record: unknown): Promise<void> {
  await ensureDir(dirname(filePath));
  await appendFile(filePath, JSON.stringify(record) + "\n", "utf-8");
}

export async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}
