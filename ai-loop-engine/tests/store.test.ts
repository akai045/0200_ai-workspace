import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { rm, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createProject,
  getProject,
  updateProjectStatus,
  addMaterial,
  listMaterials,
  addDesignVersion,
  listDesignVersions,
  selectDesignVersion,
} from "../src/store/projectStore.js";
import { fileExists } from "../src/store/fileStore.js";
import { projectDir, projectPointerPath } from "../src/store/paths.js";
import type { DesignSpec } from "../src/core/types.js";

const TEST_PROJECT_ID = "test-store-project";

const EMPTY_DESIGN: DesignSpec = {
  kind: "website",
  pages: [],
  colorPalette: ["#000000"],
  typography: { heading: "sans", body: "sans" },
  usedMaterialIds: [],
};

async function freshProject() {
  return createProject({
    id: TEST_PROJECT_ID,
    title: "テストプロジェクト",
    category: "website",
    templateId: "website",
    brief: { purpose: "test", outputFormat: "website" },
  });
}

beforeEach(async () => {
  await rm(projectDir(TEST_PROJECT_ID), { recursive: true, force: true });
});

after(async () => {
  await rm(projectDir(TEST_PROJECT_ID), { recursive: true, force: true });
});

test("createProject: プロジェクトポインタを永続化し、重複IDは拒否する", async () => {
  const project = await freshProject();
  assert.equal(project.status, "draft");
  const fetched = await getProject(TEST_PROJECT_ID);
  assert.equal(fetched.title, "テストプロジェクト");

  await assert.rejects(() => freshProject());
});

test("updateProjectStatus: 上書き前の値を.history.jsonlへ退避する（ADR-0003）", async () => {
  await freshProject();
  await updateProjectStatus(TEST_PROJECT_ID, "generating");
  const historyPath = `${projectPointerPath(TEST_PROJECT_ID)}.history.jsonl`;
  assert.equal(await fileExists(historyPath), true);
  const updated = await getProject(TEST_PROJECT_ID);
  assert.equal(updated.status, "generating");
});

test("addDesignVersion: 版ファイルは追記専用で上書きを拒否する", async () => {
  await freshProject();
  await addDesignVersion(TEST_PROJECT_ID, 1, 0, EMPTY_DESIGN, "test-engine");
  await assert.rejects(() => addDesignVersion(TEST_PROJECT_ID, 1, 0, EMPTY_DESIGN, "test-engine"));
});

test("selectDesignVersion: 選定した候補だけがselected=trueになる", async () => {
  await freshProject();
  await addDesignVersion(TEST_PROJECT_ID, 1, 0, EMPTY_DESIGN, "test-engine");
  await addDesignVersion(TEST_PROJECT_ID, 1, 1, EMPTY_DESIGN, "test-engine");
  await selectDesignVersion(TEST_PROJECT_ID, 1, 1);

  const versions = await listDesignVersions(TEST_PROJECT_ID, 1);
  const selected = versions.filter((v) => v.selected);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].candidateIndex, 1);
});

test("selectDesignVersion: 存在しない候補を選定しようとするとエラー", async () => {
  await freshProject();
  await assert.rejects(() => selectDesignVersion(TEST_PROJECT_ID, 9, 9));
});

test("addMaterial: originalHashを記録し、fixedフラグを保持する", async () => {
  await freshProject();
  const tmpDir = await mkdtemp(join(tmpdir(), "ai-loop-test-"));
  const srcPath = join(tmpDir, "logo.txt");
  await writeFile(srcPath, "dummy-logo-bytes");
  try {
    const material = await addMaterial({
      projectId: TEST_PROJECT_ID,
      sourceFilePath: srcPath,
      usageTag: "header-logo",
      fixed: true,
    });
    assert.equal(material.fixed, true);
    assert.equal(material.originalHash.length, 64);

    const materials = await listMaterials(TEST_PROJECT_ID);
    assert.equal(materials.length, 1);
    assert.equal(materials[0].id, material.id);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("listMaterials: supersedesされた旧素材は現行一覧から除外される", async () => {
  await freshProject();
  const tmpDir = await mkdtemp(join(tmpdir(), "ai-loop-test-"));
  const srcPath = join(tmpDir, "logo.txt");
  await writeFile(srcPath, "dummy-logo-bytes-v1");
  try {
    const original = await addMaterial({
      projectId: TEST_PROJECT_ID,
      sourceFilePath: srcPath,
      usageTag: "header-logo",
      fixed: true,
    });
    await writeFile(srcPath, "dummy-logo-bytes-v2");
    await addMaterial({
      projectId: TEST_PROJECT_ID,
      sourceFilePath: srcPath,
      usageTag: "header-logo",
      fixed: true,
      supersedes: original.id,
    });
    const materials = await listMaterials(TEST_PROJECT_ID);
    assert.equal(materials.length, 1);
    assert.notEqual(materials[0].id, original.id);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
