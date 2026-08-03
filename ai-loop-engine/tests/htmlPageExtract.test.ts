import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractPageContent } from "../src/adapters/cms/shared/htmlPageExtract.js";

test("extractPageContent: title/header/footerを除いたmain相当の本文を抽出する", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "ai-loop-htmlextract-"));
  try {
    const html =
      "<!doctype html><html><head><title>ページタイトル</title></head><body>" +
      "<header>ヘッダー</header><main><h1>本文見出し</h1></main><footer>フッター</footer></body></html>";
    await writeFile(join(tmp, "index.html"), html, "utf-8");

    const extracted = await extractPageContent(tmp, "index");
    assert.ok(extracted);
    assert.equal(extracted!.title, "ページタイトル");
    assert.match(extracted!.bodyHtml, /本文見出し/);
    assert.doesNotMatch(extracted!.bodyHtml, /ヘッダー/);
    assert.doesNotMatch(extracted!.bodyHtml, /フッター/);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("extractPageContent: 対応するHTMLファイルが無ければundefined", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "ai-loop-htmlextract-"));
  try {
    const extracted = await extractPageContent(tmp, "missing");
    assert.equal(extracted, undefined);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
