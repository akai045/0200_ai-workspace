import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { aspectRatioDeviation, ASPECT_RATIO_TOLERANCE } from "../src/materials/integrity.js";
import { checkMaterialsUnchanged } from "../src/verification/materialsUnchanged.js";
import { sha256File } from "../src/store/fileStore.js";
import type { MaterialAsset } from "../src/core/types.js";

function pngBuffer(width: number, height: number, fillByte: number): Buffer {
  const png = new PNG({ width, height });
  png.data.fill(fillByte);
  return PNG.sync.write(png);
}

test("aspectRatioDeviation: 同じ縦横比なら0", () => {
  assert.equal(aspectRatioDeviation({ width: 100, height: 50 }, { width: 200, height: 100 }), 0);
});

test("aspectRatioDeviation: 縦横比が大きく異なれば許容誤差を超える", () => {
  const deviation = aspectRatioDeviation({ width: 100, height: 100 }, { width: 100, height: 500 });
  assert.ok(deviation > ASPECT_RATIO_TOLERANCE);
});

async function withTempDirs(fn: (tmp: string, outputDir: string) => Promise<void>): Promise<void> {
  const tmp = await mkdtemp(join(tmpdir(), "ai-loop-materials-"));
  const outputDir = join(tmp, "output");
  try {
    await fn(tmp, outputDir);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

test("materialsUnchanged: バイト完全一致なら適合", async () => {
  await withTempDirs(async (tmp, outputDir) => {
    const originalPath = join(tmp, "original.png");
    await writeFile(originalPath, pngBuffer(100, 100, 10));
    await mkdir(join(outputDir, "images"), { recursive: true });
    await writeFile(join(outputDir, "images", "original.png"), pngBuffer(100, 100, 10));

    const material: MaterialAsset = {
      id: "m1",
      projectId: "p",
      filePath: originalPath,
      usageTag: "header-logo",
      fixed: true,
      originalHash: await sha256File(originalPath),
      dimensions: { width: 100, height: 100 },
      registeredAt: new Date(0).toISOString(),
    };
    const result = await checkMaterialsUnchanged(outputDir, [material]);
    assert.equal(result.verdict, "適合");
  });
});

test("materialsUnchanged: ハッシュは変わっても縦横比が許容範囲内なら適合（技術的最適化として許容）", async () => {
  await withTempDirs(async (tmp, outputDir) => {
    const originalPath = join(tmp, "original.png");
    await writeFile(originalPath, pngBuffer(100, 100, 10));
    await mkdir(join(outputDir, "images"), { recursive: true });
    // 同一に近い縦横比・別バイト列（圧縮/最適化を想定）
    await writeFile(join(outputDir, "images", "original.png"), pngBuffer(102, 100, 20));

    const material: MaterialAsset = {
      id: "m1",
      projectId: "p",
      filePath: originalPath,
      usageTag: "header-logo",
      fixed: true,
      originalHash: await sha256File(originalPath),
      dimensions: { width: 100, height: 100 },
      registeredAt: new Date(0).toISOString(),
    };
    const result = await checkMaterialsUnchanged(outputDir, [material]);
    assert.equal(result.verdict, "適合");
  });
});

test("materialsUnchanged: 縦横比が大きく異なれば不適合（意匠改変の疑い）", async () => {
  await withTempDirs(async (tmp, outputDir) => {
    const originalPath = join(tmp, "original.png");
    await writeFile(originalPath, pngBuffer(100, 100, 10));
    await mkdir(join(outputDir, "images"), { recursive: true });
    await writeFile(join(outputDir, "images", "original.png"), pngBuffer(100, 500, 20));

    const material: MaterialAsset = {
      id: "m1",
      projectId: "p",
      filePath: originalPath,
      usageTag: "hero-visual",
      fixed: true,
      originalHash: await sha256File(originalPath),
      dimensions: { width: 100, height: 100 },
      registeredAt: new Date(0).toISOString(),
    };
    const result = await checkMaterialsUnchanged(outputDir, [material]);
    assert.equal(result.verdict, "不適合");
  });
});

test("materialsUnchanged: 出力に素材が存在しなければ不適合", async () => {
  await withTempDirs(async (tmp, outputDir) => {
    const originalPath = join(tmp, "original.png");
    await writeFile(originalPath, pngBuffer(100, 100, 10));
    await mkdir(outputDir, { recursive: true });

    const material: MaterialAsset = {
      id: "m1",
      projectId: "p",
      filePath: originalPath,
      usageTag: "header-logo",
      fixed: true,
      originalHash: await sha256File(originalPath),
      registeredAt: new Date(0).toISOString(),
    };
    const result = await checkMaterialsUnchanged(outputDir, [material]);
    assert.equal(result.verdict, "不適合");
  });
});

test("materialsUnchanged: 固定素材が無ければ対象外（適合扱い）", async () => {
  const result = await checkMaterialsUnchanged("/nonexistent", []);
  assert.equal(result.verdict, "適合");
});
