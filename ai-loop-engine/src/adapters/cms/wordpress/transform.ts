/**
 * F-301/302: 静的HTML実装成果物を「PROJECT-001のwordpress/相当の構成」のテーマファイル一式へ変換する。
 * 生成エンジンには「セマンティックなHTML」（<header>/<main>/<footer>）を明示的に指示しているため、
 * その規約を前提にheader.php/footer.phpと各ページテンプレートへ分割する（規約が崩れた場合はフォールバックする）。
 * ライブ投入（DB登録・FTP配置等）は行わない（F-304は対象外・ADR-0007）。
 */
import { dirname, extname, join } from "node:path";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import type { ImplementationArtifact, Project, WebsiteDesignSpec } from "../../../core/types.js";
import { ensureDir, fileExists } from "../../../store/fileStore.js";

export interface ThemeFile {
  relPath: string;
  content: string;
}

function extractTag(html: string, tag: string): string | undefined {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? match[0] : undefined;
}

function stripTag(html: string, block: string | undefined): string {
  return block ? html.replace(block, "") : html;
}

function pageFileNameFor(slug: string): string {
  return slug === "index" ? "index.html" : `${slug}.html`;
}

function templateFileNameFor(wpTemplate: string, slug: string): string {
  switch (wpTemplate) {
    case "front-page":
      return "front-page.php";
    case "archive":
      return "archive.php";
    case "single":
      return "single.php";
    case "page":
    default:
      return `page-${slug}.php`;
  }
}

interface ExtractedPage {
  slug: string;
  wpTemplate: string;
  title: string;
  headerBlock?: string;
  footerBlock?: string;
  mainBlock: string;
}

async function extractPage(outputDir: string, slug: string, wpTemplate: string): Promise<ExtractedPage | undefined> {
  const fileName = pageFileNameFor(slug);
  const filePath = join(outputDir, fileName);
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

  return {
    slug,
    wpTemplate,
    title,
    headerBlock,
    footerBlock,
    mainBlock: mainBlock ?? bodyContent.trim(),
  };
}

function themeStyleHeader(project: Project): string {
  return [
    "/*",
    `Theme Name: ${project.title}`,
    "Author: AI LOOP Engine",
    `Description: ${project.title} をAI LOOPエンジン（Phase1・ai-loop-engine）から書き出したWordPressテーマ。`,
    "Version: 1.0",
    "*/",
    "",
  ].join("\n");
}

function headerPhp(headerBlock: string | undefined): string {
  const headerMarkup =
    headerBlock ??
    '<header class="site-header"><a class="site-title" href="<?php echo esc_url(home_url(\'/\')); ?>"><?php bloginfo(\'name\'); ?></a>' +
      '<?php wp_nav_menu([\'theme_location\' => \'primary\']); ?></header>';
  return [
    "<!doctype html>",
    '<html <?php language_attributes(); ?>>',
    "<head>",
    '<meta charset="<?php bloginfo(\'charset\'); ?>">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<?php wp_head(); ?>",
    "</head>",
    '<body <?php body_class(); ?>>',
    "<?php wp_body_open(); ?>",
    headerMarkup,
    '<div id="page-content">',
    "",
  ].join("\n");
}

function footerPhp(footerBlock: string | undefined): string {
  const footerMarkup = footerBlock ?? "<footer><?php bloginfo('name'); ?> &copy; <?php echo date('Y'); ?></footer>";
  return ["</div><!-- #page-content -->", footerMarkup, "<?php wp_footer(); ?>", "</body>", "</html>", ""].join("\n");
}

function pageTemplatePhp(page: ExtractedPage): string {
  return ["<?php get_header(); ?>", "", page.mainBlock, "", "<?php get_footer(); ?>", ""].join("\n");
}

function indexPhpFallback(): string {
  return [
    "<?php get_header(); ?>",
    "<main>",
    "<?php if (have_posts()) : while (have_posts()) : the_post(); ?>",
    "<?php the_content(); ?>",
    "<?php endwhile; endif; ?>",
    "</main>",
    "<?php get_footer(); ?>",
    "",
  ].join("\n");
}

function pagePhpFallback(): string {
  return [
    "<?php get_header(); ?>",
    "<main>",
    "<?php if (have_posts()) : while (have_posts()) : the_post(); ?>",
    "<?php the_title('<h1>', '</h1>'); ?>",
    "<?php the_content(); ?>",
    "<?php endwhile; endif; ?>",
    "</main>",
    "<?php get_footer(); ?>",
    "",
  ].join("\n");
}

function functionsPhp(jsFiles: string[]): string {
  const enqueues = jsFiles
    .map(
      (relPath, i) =>
        `    wp_enqueue_script('ai-loop-theme-js-${i}', get_template_directory_uri() . '/${relPath}', [], null, true);`,
    )
    .join("\n");
  return [
    "<?php",
    "if (!defined('ABSPATH')) { exit; }",
    "",
    "function ai_loop_theme_setup() {",
    "    add_theme_support('title-tag');",
    "    add_theme_support('post-thumbnails');",
    "    register_nav_menus(['primary' => __('Primary Menu', 'ai-loop-theme')]);",
    "}",
    "add_action('after_setup_theme', 'ai_loop_theme_setup');",
    "",
    "function ai_loop_theme_assets() {",
    "    wp_enqueue_style('ai-loop-theme-style', get_stylesheet_uri());",
    enqueues,
    "}",
    "add_action('wp_enqueue_scripts', 'ai_loop_theme_assets');",
    "",
  ].join("\n");
}

export interface BuildThemeResult {
  files: ThemeFile[];
  assetFiles: string[];
  warnings: string[];
}

export async function buildWordpressTheme(
  project: Project,
  designSpec: WebsiteDesignSpec,
  artifact: ImplementationArtifact,
): Promise<BuildThemeResult> {
  const warnings: string[] = [];
  const pages: ExtractedPage[] = [];
  for (const p of designSpec.pages) {
    const extracted = await extractPage(artifact.outputDir, p.slug, p.wpTemplate);
    if (!extracted) {
      warnings.push(`ページ"${p.slug}"に対応する出力HTML（${pageFileNameFor(p.slug)}）が見つからず、変換をスキップしました。`);
      continue;
    }
    pages.push(extracted);
  }

  const sharedHeader = pages.find((p) => p.headerBlock)?.headerBlock;
  const sharedFooter = pages.find((p) => p.footerBlock)?.footerBlock;
  if (pages.length > 0 && !sharedHeader) {
    warnings.push("どのページにも<header>タグが見つかりませんでした。最小限のheader.phpフォールバックを使用します。");
  }
  if (pages.length > 0 && !sharedFooter) {
    warnings.push("どのページにも<footer>タグが見つかりませんでした。最小限のfooter.phpフォールバックを使用します。");
  }

  const cssFiles = artifact.files.filter((f) => extname(f) === ".css");
  const jsFiles = artifact.files.filter((f) => extname(f) === ".js");
  const otherAssetFiles = artifact.files.filter((f) => ![".html", ".css"].includes(extname(f)));

  let styleCss = themeStyleHeader(project);
  for (const cssPath of cssFiles) {
    styleCss += `\n/* --- ${cssPath} --- */\n`;
    styleCss += await readFile(join(artifact.outputDir, cssPath), "utf-8");
    styleCss += "\n";
  }

  const files: ThemeFile[] = [
    { relPath: "style.css", content: styleCss },
    { relPath: "functions.php", content: functionsPhp(jsFiles) },
    { relPath: "header.php", content: headerPhp(sharedHeader) },
    { relPath: "footer.php", content: footerPhp(sharedFooter) },
    { relPath: "index.php", content: indexPhpFallback() },
    { relPath: "page.php", content: pagePhpFallback() },
  ];

  const seenFrontPage = { done: false };
  const writtenTemplateNames = new Set<string>();
  for (const page of pages) {
    const fileName = templateFileNameFor(page.wpTemplate, page.slug);
    if (fileName === "front-page.php" && seenFrontPage.done) {
      warnings.push(`front-page相当のページが複数(${page.slug}含む)あります。最初の1件のみfront-page.phpとして採用しました。`);
      continue;
    }
    if (fileName === "front-page.php") seenFrontPage.done = true;
    if (writtenTemplateNames.has(fileName)) {
      warnings.push(`テンプレートファイル名"${fileName}"が重複しました（ページ"${page.slug}"）。後勝ちで上書きします。`);
    }
    writtenTemplateNames.add(fileName);
    files.push({ relPath: fileName, content: pageTemplatePhp(page) });
  }

  return { files, assetFiles: [...jsFiles, ...otherAssetFiles], warnings };
}

export async function writeThemeFiles(themeDir: string, result: BuildThemeResult, artifact: ImplementationArtifact): Promise<string[]> {
  const written: string[] = [];
  await ensureDir(themeDir);
  for (const file of result.files) {
    const dest = join(themeDir, file.relPath);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, file.content, "utf-8");
    written.push(file.relPath);
  }
  for (const assetRelPath of result.assetFiles) {
    const src = join(artifact.outputDir, assetRelPath);
    const dest = join(themeDir, assetRelPath);
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(src, dest);
    written.push(assetRelPath);
  }
  if (result.warnings.length > 0) {
    const notice = ["# 変換時の注意事項", "", ...result.warnings.map((w) => `- ${w}`), ""].join("\n");
    await writeFile(join(themeDir, "CONVERSION_NOTES.md"), notice, "utf-8");
    written.push("CONVERSION_NOTES.md");
  }
  return written;
}
