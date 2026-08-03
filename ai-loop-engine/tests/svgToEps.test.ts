import { test } from "node:test";
import assert from "node:assert/strict";
import { svgToEps } from "../src/adapters/output/svgToEps.js";

test("svgToEps: rectを正しいBoundingBoxとY反転座標のPostScriptへ変換する", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect x="10" y="5" width="20" height="15" fill="#ff0000"/></svg>';
  const result = svgToEps(svg, "test");
  assert.ok(result.eps, `expected success, got: ${result.unsupportedReason}`);
  const eps = result.eps!;
  assert.match(eps, /%%BoundingBox: 0 0 100 50/);
  assert.match(eps, /1 0 0 setrgbcolor/);
  // 高さ50のキャンバスでy=5,height=15の矩形 → PS原点は下端: 50-5-15=30
  assert.match(eps, /10 30 moveto/);
  assert.match(eps, /20 0 rlineto/);
  assert.match(eps, /0 15 rlineto/);
});

test("svgToEps: circleをarcコマンドへ変換し、中心Y座標を反転する", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="30" r="20" fill="#00ff00"/></svg>';
  const result = svgToEps(svg, "test");
  assert.ok(result.eps, `expected success, got: ${result.unsupportedReason}`);
  // 128 - 30 = 98
  assert.match(result.eps!, /64 98 20 0 360 arc/);
});

test("svgToEps: path（M/L/C/Z絶対座標）を変換しY座標を反転する", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 20 L30 20 C40 20 40 40 30 40 Z" fill="#0000ff"/></svg>';
  const result = svgToEps(svg, "test");
  assert.ok(result.eps, `expected success, got: ${result.unsupportedReason}`);
  const eps = result.eps!;
  // 100 - 20 = 80, 100 - 40 = 60
  assert.match(eps, /10 80 moveto/);
  assert.match(eps, /30 80 lineto/);
  assert.match(eps, /40 80 40 60 30 60 curveto/);
  assert.match(eps, /closepath/);
});

test("svgToEps: transform属性は非対応として理由付きで拒否する", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect x="0" y="0" width="5" height="5" fill="#000" transform="rotate(45)"/></svg>';
  const result = svgToEps(svg, "test");
  assert.equal(result.eps, undefined);
  assert.match(result.unsupportedReason ?? "", /transform/);
});

test("svgToEps: <defs>/<linearGradient>要素があれば未対応要素として拒否する", () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="g"></linearGradient></defs><rect x="0" y="0" width="5" height="5" fill="url(#g)"/></svg>';
  const result = svgToEps(svg, "test");
  assert.equal(result.eps, undefined);
  assert.match(result.unsupportedReason ?? "", /未対応の要素/);
});

test("svgToEps: rect/circle/pathのみでもurl()参照fillはグラデーション非対応として拒否する", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect x="0" y="0" width="5" height="5" fill="url(#g)"/></svg>';
  const result = svgToEps(svg, "test");
  assert.equal(result.eps, undefined);
  assert.match(result.unsupportedReason ?? "", /グラデーション/);
});

test("svgToEps: 未対応の要素（text等）は理由付きで拒否する", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text x="0" y="0">hi</text></svg>';
  const result = svgToEps(svg, "test");
  assert.equal(result.eps, undefined);
  assert.match(result.unsupportedReason ?? "", /text/);
});

test("svgToEps: 相対座標コマンド（小文字）は非対応として拒否する", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="m1 1 l2 2 z" fill="#000"/></svg>';
  const result = svgToEps(svg, "test");
  assert.equal(result.eps, undefined);
});

test("svgToEps: viewBox/width-heightが無ければ非対応", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="5" height="5" fill="#000"/></svg>';
  const result = svgToEps(svg, "test");
  assert.equal(result.eps, undefined);
});
