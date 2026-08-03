/**
 * 10.3 支給素材の管理方針：固定フラグ付き素材は意匠（画像そのもの）を変更対象としない。
 * 許容される処理はファイル形式変換・リサイズ／クロップ・圧縮等の技術的最適化のみ。
 * ここでは登録時の寸法記録と、実装後の非改変性検証（verification側）で使う比較関数を提供する。
 */
import { readFile } from "node:fs/promises";
import { imageSize } from "image-size";

export interface Dimensions {
  width: number;
  height: number;
}

export async function readImageDimensions(filePath: string): Promise<Dimensions | undefined> {
  try {
    const buffer = await readFile(filePath);
    const dim = imageSize(buffer);
    if (dim.width && dim.height) {
      return { width: dim.width, height: dim.height };
    }
    return undefined;
  } catch {
    // 画像以外（SVG解析失敗等）は寸法未記録として扱う。非改変性検証はファイル存在・参照確認のみにフォールバックする。
    return undefined;
  }
}

/**
 * リサイズ・クロップは許容されるため、縦横比の近さで「同じ素材の技術的最適化」かどうかを判定する。
 * 大きく異なる場合は意匠そのものが差し替えられた（＝改変）可能性を指摘事項として返す。
 */
export function aspectRatioDeviation(a: Dimensions, b: Dimensions): number {
  const ratioA = a.width / a.height;
  const ratioB = b.width / b.height;
  return Math.abs(ratioA - ratioB) / ratioA;
}

export const ASPECT_RATIO_TOLERANCE = 0.05;
