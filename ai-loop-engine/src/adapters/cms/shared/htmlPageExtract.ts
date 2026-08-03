/**
 * F-305: 非WordPress CMSアダプタ（microCMS/Shopify/Movable Type）共通のHTML抽出ヘルパー。
 * wordpress/transform.tsとは独立させ（既に人間確認済みのWordPress変換ロジックへの影響を避ける）、
 * ページのタイトル・本文（<header>/<footer>を除いた<main>相当）のみを抽出する。
 */
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { fileExists } from "../../../store/fileStore.js";

export interface ExtractedPageContent {
  slug: string;
  title: string;
  bodyHtml: string;
}

export function pageFileNameFor(slug: string): string {
  return slug === "index" ? "index.html" : `${slug}.html`;
}

function extractTag(html: string, tag: string): string | undefined {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? match[0] : undefined;
}

function stripTag(html: string, block: string | undefined): string {
  return block ? html.replace(block, "") : html;
}

export async function extractPageContent(outputDir: string, slug: string): Promise<ExtractedPageContent | undefined> {
  const filePath = join(outputDir, pageFileNameFor(slug));
  if (!(await fileExists(filePath))) return undefined;
  const html = await readFile(filePath, "utf-8");

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : slug;

  const headerBlock = extractTag(html, "header");
  const footerBlock = extractTag(html, "footer");
  const mainBlock = extractTag(html, "main");

  let bodyContent = extractTag(html, "body") ?? html;
  bodyContent = stripTag(bodyContent, headerBlock);
  bodyContent = stripTag(bodyContent, footerBlock);

  return { slug, title, bodyHtml: (mainBlock ?? bodyContent).trim() };
}
