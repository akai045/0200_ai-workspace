import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { resolveOutputSizes, artboardIdFor } from "../src/templates/outputSizes.js";
import { checkMultiSizeOutput } from "../src/verification/multiSizeOutput.js";
import { checkBrandConsistency } from "../src/verification/brandConsistency.js";
import type { ArtboardsManifest } from "../src/generation/graphicPostProcess.js";
import type { Project } from "../src/core/types.js";

function fixtureProject(category: Project["category"], outputSizes?: Project["brief"]["outputSizes"]): Project {
  return {
    id: "p1",
    title: "テスト案件",
    category,
    templateId: category,
    status: "draft",
    brief: { purpose: "test", outputFormat: category, outputSizes },
    iteration: 0,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

test("resolveOutputSizes: brief.outputSizesが指定されていればそれを優先する", () => {
  const project = fixtureProject("logo", [{ label: "custom", width: 64, height: 64 }]);
  assert.deepEqual(resolveOutputSizes(project), [{ label: "custom", width: 64, height: 64 }]);
});

test("resolveOutputSizes: 未指定ならカテゴリ既定値を返す（logo）", () => {
  const project = fixtureProject("logo");
  const sizes = resolveOutputSizes(project);
  assert.equal(sizes.length, 1);
  assert.equal(sizes[0].width, 512);
  assert.equal(sizes[0].height, 512);
});

test("resolveOutputSizes: 既定値が無いカテゴリ（website）は空配列", () => {
  const project = fixtureProject("website");
  assert.deepEqual(resolveOutputSizes(project), []);
});

test("artboardIdFor: ラベルをスラグ化する", () => {
  assert.equal(artboardIdFor({ label: "Rectangle 300x250", width: 300, height: 250 }), "rectangle-300x250");
});

function solidColorPng(width: number, height: number, [r, g, b, a = 255]: [number, number, number, number?]): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }
  return PNG.sync.write(png);
}

async function withTempOutputDir(fn: (outputDir: string) => Promise<void>): Promise<void> {
  const tmp = await mkdtemp(join(tmpdir(), "ai-loop-graphic-"));
  const outputDir = join(tmp, "output");
  try {
    await fn(outputDir);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

test("checkMultiSizeOutput: 要求サイズ未指定なら判定不能", async () => {
  const result = await checkMultiSizeOutput("/unused", undefined, []);
  assert.equal(result.verdict, "判定不能");
});

test("checkMultiSizeOutput: マニフェストが無ければ不適合", async () => {
  const result = await checkMultiSizeOutput("/unused", undefined, [{ label: "s", width: 100, height: 100 }]);
  assert.equal(result.verdict, "不適合");
});

test("checkMultiSizeOutput: 実測寸法が要求と一致すれば適合", async () => {
  await withTempOutputDir(async (outputDir) => {
    await mkdir(join(outputDir, "raster"), { recursive: true });
    await writeFile(join(outputDir, "raster", "square-100.png"), solidColorPng(100, 100, [10, 10, 10]));
    const manifest: ArtboardsManifest = {
      artboards: [{ id: "square-100", label: "square-100", width: 100, height: 100, rasterPath: "raster/square-100.png" }],
    };
    const result = await checkMultiSizeOutput(outputDir, manifest, [{ label: "square-100", width: 100, height: 100 }]);
    assert.equal(result.verdict, "適合");
  });
});

test("checkMultiSizeOutput: 実測寸法が要求と異なれば不適合（ラスタライズ不具合の検出）", async () => {
  await withTempOutputDir(async (outputDir) => {
    await mkdir(join(outputDir, "raster"), { recursive: true });
    // マニフェスト上は100x100を主張するが、実ファイルは50x50（ラスタライズが壊れているケースを模擬）
    await writeFile(join(outputDir, "raster", "square-100.png"), solidColorPng(50, 50, [10, 10, 10]));
    const manifest: ArtboardsManifest = {
      artboards: [{ id: "square-100", label: "square-100", width: 100, height: 100, rasterPath: "raster/square-100.png" }],
    };
    const result = await checkMultiSizeOutput(outputDir, manifest, [{ label: "square-100", width: 100, height: 100 }]);
    assert.equal(result.verdict, "不適合");
    assert.ok(result.issues.some((i) => i.includes("一致しません")));
  });
});

test("checkMultiSizeOutput: 要求サイズに対応するアートボードが無ければ不適合", async () => {
  const manifest: ArtboardsManifest = {
    artboards: [{ id: "other", label: "other", width: 200, height: 200, rasterPath: "raster/other.png" }],
  };
  const result = await checkMultiSizeOutput("/unused", manifest, [{ label: "square-100", width: 100, height: 100 }]);
  assert.equal(result.verdict, "不適合");
  assert.ok(result.issues.some((i) => i.includes("見つかりません")));
});

test("checkBrandConsistency: ブランドカラー未指定なら判定不能", async () => {
  const result = await checkBrandConsistency("/unused", undefined, undefined, 60, 0.5);
  assert.equal(result.verdict, "判定不能");
});

test("checkBrandConsistency: マニフェストが無ければ不適合", async () => {
  const result = await checkBrandConsistency("/unused", undefined, ["#ff0000"], 60, 0.5);
  assert.equal(result.verdict, "不適合");
});

test("checkBrandConsistency: ブランドカラーと同色のラスタは適合", async () => {
  await withTempOutputDir(async (outputDir) => {
    await mkdir(join(outputDir, "raster"), { recursive: true });
    await writeFile(join(outputDir, "raster", "logo.png"), solidColorPng(40, 40, [255, 0, 0]));
    const manifest: ArtboardsManifest = {
      artboards: [{ id: "logo", label: "logo", width: 40, height: 40, rasterPath: "raster/logo.png" }],
    };
    const result = await checkBrandConsistency(outputDir, manifest, ["#ff0000"], 60, 0.5);
    assert.equal(result.verdict, "適合");
  });
});

test("checkBrandConsistency: ブランドカラーから大きく外れた色は不適合", async () => {
  await withTempOutputDir(async (outputDir) => {
    await mkdir(join(outputDir, "raster"), { recursive: true });
    await writeFile(join(outputDir, "raster", "logo.png"), solidColorPng(40, 40, [0, 255, 0]));
    const manifest: ArtboardsManifest = {
      artboards: [{ id: "logo", label: "logo", width: 40, height: 40, rasterPath: "raster/logo.png" }],
    };
    const result = await checkBrandConsistency(outputDir, manifest, ["#ff0000"], 30, 0.5);
    assert.equal(result.verdict, "不適合");
  });
});

test("checkBrandConsistency: 有彩色画素が無ければ（モノクロ）判定不能", async () => {
  await withTempOutputDir(async (outputDir) => {
    await mkdir(join(outputDir, "raster"), { recursive: true });
    await writeFile(join(outputDir, "raster", "logo.png"), solidColorPng(40, 40, [20, 20, 20]));
    const manifest: ArtboardsManifest = {
      artboards: [{ id: "logo", label: "logo", width: 40, height: 40, rasterPath: "raster/logo.png" }],
    };
    const result = await checkBrandConsistency(outputDir, manifest, ["#ff0000"], 60, 0.5);
    assert.equal(result.verdict, "判定不能");
  });
});
