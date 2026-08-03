/**
 * F-206拡張: ロゴ/バナー/チラシ/イラストのSVG（rect/circle/pathの単純な構成に限定）を
 * 実際に妥当なEPS（Encapsulated PostScript）へ変換する。
 * 対応できない要素（gradient・transform・text・相対座標コマンド・Q/S/T/A等の曲線コマンド）は
 * 「変換できた」と偽らず、理由付きでunsupportedを返す（対立的推論#1）。
 */

export interface SvgToEpsResult {
  eps?: string;
  unsupportedReason?: string;
}

const SUPPORTED_TAGS = new Set(["rect", "circle", "path"]);

interface Shape {
  tag: "rect" | "circle" | "path";
  attrs: Record<string, string>;
}

function parseAttrs(tagContent: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][a-zA-Z0-9_:.-]*)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tagContent))) attrs[m[1]] = m[2];
  return attrs;
}

function hexToRgbFloat(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec((hex ?? "").trim());
  if (!match) return [0, 0, 0];
  const n = parseInt(match[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function parseCanvasSize(svgOpenTag: string): { width: number; height: number } | undefined {
  const attrs = parseAttrs(svgOpenTag);
  if (attrs.viewBox) {
    const parts = attrs.viewBox.trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return { width: parts[2], height: parts[3] };
    }
  }
  if (attrs.width && attrs.height) {
    const width = parseFloat(attrs.width);
    const height = parseFloat(attrs.height);
    if (Number.isFinite(width) && Number.isFinite(height)) return { width, height };
  }
  return undefined;
}

interface PathCommand {
  cmd: "M" | "L" | "C" | "Z";
  points: [number, number][];
}

/** 絶対座標のM/L/C/Zのみ対応。相対コマンド・Q/S/T/A等は非対応としてundefinedを返す。 */
function parsePathD(d: string): PathCommand[] | undefined {
  const segments = d.match(/[MLCZmlcz][^MLCZmlcz]*/g);
  if (!segments) return undefined;
  const result: PathCommand[] = [];
  for (const seg of segments) {
    const letter = seg[0];
    if (letter !== letter.toUpperCase()) return undefined; // 相対コマンドは非対応
    const cmd = letter as "M" | "L" | "C" | "Z";
    if (cmd === "Z") {
      result.push({ cmd: "Z", points: [] });
      continue;
    }
    const nums = (seg.slice(1).match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number);
    const arity = cmd === "M" || cmd === "L" ? 2 : cmd === "C" ? 6 : -1;
    if (arity === -1) return undefined;
    if (nums.length === 0 || nums.length % arity !== 0) return undefined;
    for (let i = 0; i < nums.length; i += arity) {
      const chunk = nums.slice(i, i + arity);
      const points: [number, number][] = [];
      for (let j = 0; j < chunk.length; j += 2) points.push([chunk[j], chunk[j + 1]]);
      // M後の暗黙の繰り返しはL、C後の暗黙の繰り返しはC（SVG仕様通り）
      result.push({ cmd: i === 0 ? cmd : cmd === "M" ? "L" : cmd, points });
    }
  }
  return result;
}

function pathBodyToPs(d: string, canvasHeight: number): string | undefined {
  const commands = parsePathD(d);
  if (!commands) return undefined;
  const lines: string[] = ["newpath"];
  const flip = (p: [number, number]): [number, number] => [p[0], canvasHeight - p[1]];
  for (const c of commands) {
    if (c.cmd === "Z") {
      lines.push("closepath");
      continue;
    }
    const pts = c.points.map(flip);
    if (c.cmd === "M") lines.push(`${pts[0][0]} ${pts[0][1]} moveto`);
    else if (c.cmd === "L") lines.push(`${pts[0][0]} ${pts[0][1]} lineto`);
    else if (c.cmd === "C") {
      lines.push(`${pts[0][0]} ${pts[0][1]} ${pts[1][0]} ${pts[1][1]} ${pts[2][0]} ${pts[2][1]} curveto`);
    }
  }
  return lines.join("\n");
}

function shapeToPs(shape: Shape, canvasHeight: number): string | undefined {
  const fill = hexToRgbFloat(shape.attrs.fill ?? "#000000");
  const colorLine = `${fill[0]} ${fill[1]} ${fill[2]} setrgbcolor`;

  if (shape.tag === "rect") {
    const x = parseFloat(shape.attrs.x ?? "0");
    const y = parseFloat(shape.attrs.y ?? "0");
    const w = parseFloat(shape.attrs.width ?? "0");
    const h = parseFloat(shape.attrs.height ?? "0");
    if (![x, y, w, h].every(Number.isFinite)) return undefined;
    const psY = canvasHeight - y - h;
    return [colorLine, "newpath", `${x} ${psY} moveto`, `${w} 0 rlineto`, `0 ${h} rlineto`, `${-w} 0 rlineto`, "closepath", "fill"].join(
      "\n",
    );
  }
  if (shape.tag === "circle") {
    const cx = parseFloat(shape.attrs.cx ?? "0");
    const cy = parseFloat(shape.attrs.cy ?? "0");
    const r = parseFloat(shape.attrs.r ?? "0");
    if (![cx, cy, r].every(Number.isFinite)) return undefined;
    const psCy = canvasHeight - cy;
    return [colorLine, "newpath", `${cx} ${psCy} ${r} 0 360 arc`, "closepath", "fill"].join("\n");
  }
  // path
  const body = pathBodyToPs(shape.attrs.d ?? "", canvasHeight);
  if (!body) return undefined;
  return [colorLine, body, "fill"].join("\n");
}

export function svgToEps(svgContent: string, title: string): SvgToEpsResult {
  const openTagMatch = svgContent.match(/<svg\b[^>]*>/i);
  if (!openTagMatch) return { unsupportedReason: "<svg>タグが見つかりません。" };
  const canvas = parseCanvasSize(openTagMatch[0]);
  if (!canvas) return { unsupportedReason: "viewBoxまたはwidth/heightからキャンバスサイズを特定できません。" };

  const innerStart = svgContent.indexOf(openTagMatch[0]) + openTagMatch[0].length;
  const innerEnd = svgContent.lastIndexOf("</svg>");
  const inner = innerEnd > innerStart ? svgContent.slice(innerStart, innerEnd) : "";

  const allTags = new Set([...inner.matchAll(/<\/?([a-zA-Z][\w-]*)/g)].map((m) => m[1].toLowerCase()));
  const unsupportedTags = [...allTags].filter((t) => !SUPPORTED_TAGS.has(t));
  if (unsupportedTags.length > 0) {
    return { unsupportedReason: `未対応の要素があります: ${unsupportedTags.join(", ")}（対応: rect/circle/path のみ）。` };
  }
  if (/transform\s*=/.test(inner)) {
    return { unsupportedReason: "transform属性は未対応です。" };
  }
  if (/url\(#|<linearGradient|<radialGradient/i.test(inner)) {
    return { unsupportedReason: "グラデーション塗りは未対応です（単色fillのみ対応）。" };
  }

  const shapeMatches = [...inner.matchAll(/<(rect|circle|path)\b([^>]*?)\/?>/gi)];
  if (shapeMatches.length === 0) {
    return { unsupportedReason: "変換対象の図形要素（rect/circle/path）が見つかりません。" };
  }

  const psBodies: string[] = [];
  for (const m of shapeMatches) {
    const tag = m[1].toLowerCase() as Shape["tag"];
    const attrs = parseAttrs(m[2]);
    const ps = shapeToPs({ tag, attrs }, canvas.height);
    if (!ps) return { unsupportedReason: `<${tag}>要素の変換に失敗しました（未対応のパス構文の可能性）。` };
    psBodies.push(ps);
  }

  const eps = [
    "%!PS-Adobe-3.0 EPSF-3.0",
    `%%BoundingBox: 0 0 ${Math.ceil(canvas.width)} ${Math.ceil(canvas.height)}`,
    `%%HiResBoundingBox: 0 0 ${canvas.width} ${canvas.height}`,
    "%%Creator: ai-loop-engine",
    `%%Title: ${title}`,
    "%%EndComments",
    ...psBodies,
    "%%EOF",
    "",
  ].join("\n");

  return { eps };
}
