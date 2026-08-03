/** F-401〜F-406: 検証エンジンの実行エントリポイント。テンプレートが要求する項目のみを実行する。 */
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import type { VerificationCheck, VerificationCheckId, VerificationResult } from "../core/types.js";
import { getTemplate } from "../templates/registry.js";
import { loadConfig } from "../core/config.js";
import { getProject, getImplementationArtifact, addVerificationResult } from "../store/projectStore.js";
import { listMaterials } from "../materials/ledger.js";
import { verificationResultsDir } from "../store/paths.js";
import { checkHtmlLint } from "./htmlLint.js";
import { checkCssLint } from "./cssLint.js";
import { checkJsLint } from "./jsLint.js";
import { openBrowserSession } from "./browserSession.js";
import { checkAccessibility } from "./accessibility.js";
import { checkResponsive } from "./responsive.js";
import { checkVisualDiff, type VisualDiffTarget } from "./visualDiff.js";
import { checkMaterialsUnchanged } from "./materialsUnchanged.js";
import { checkSvgLint } from "./svgLint.js";
import { checkMultiSizeOutput } from "./multiSizeOutput.js";
import { checkBrandConsistency } from "./brandConsistency.js";
import { judgeConvergence } from "./convergence.js";
import { renderMarkdownReport } from "./report.js";
import { tryReadArtboardsManifest } from "../generation/graphicPostProcess.js";
import { resolveOutputSizes } from "../templates/outputSizes.js";

export interface RunVerificationOutcome {
  result: VerificationResult;
  markdownPath: string;
}

export async function runVerification(projectId: string, version: number): Promise<RunVerificationOutcome> {
  const project = await getProject(projectId);
  const template = getTemplate(project.templateId);
  const config = await loadConfig();
  const artifact = await getImplementationArtifact(projectId, version);
  const materials = await listMaterials(projectId);

  const checksById = new Map<VerificationCheckId, VerificationCheck>();
  const required = new Set(template.requiredVerificationChecks);

  if (required.has("html-lint")) {
    checksById.set("html-lint", await checkHtmlLint(artifact.outputDir, artifact.files, config.convergence.maxLintWarnings));
  }
  if (required.has("css-lint")) {
    checksById.set("css-lint", await checkCssLint(artifact.outputDir, artifact.files, config.convergence.maxLintWarnings));
  }
  if (required.has("js-lint")) {
    checksById.set("js-lint", await checkJsLint(artifact.outputDir, artifact.files, config.convergence.maxLintWarnings));
  }

  const htmlFiles = artifact.files.filter((f) => f.endsWith(".html"));
  const svgFiles = artifact.files.filter((f) => f.endsWith(".svg"));
  const entryHtml = htmlFiles.find((f) => f === "index.html") ?? htmlFiles[0];
  const manifest = project.category === "website" ? undefined : await tryReadArtboardsManifest(artifact.outputDir);
  const needsBrowser =
    required.has("accessibility") || required.has("responsive") || required.has("visual-diff") || required.has("svg-lint");

  if (needsBrowser) {
    const session = await openBrowserSession();
    try {
      if (required.has("accessibility")) {
        checksById.set(
          "accessibility",
          await checkAccessibility(session.context, artifact.outputDir, htmlFiles, config.convergence.accessibilityLevel),
        );
      }
      if (required.has("responsive")) {
        checksById.set(
          "responsive",
          await checkResponsive(session.context, artifact.outputDir, htmlFiles, config.breakpoints),
        );
      }
      if (required.has("svg-lint")) {
        checksById.set("svg-lint", await checkSvgLint(session.context, artifact.outputDir, svgFiles));
      }
      if (required.has("visual-diff")) {
        const targets: VisualDiffTarget[] = manifest
          ? manifest.artboards
              .filter((a): a is typeof a & { previewPath: string } => !!a.previewPath)
              .map((a) => ({ id: a.id, label: a.label, relPath: a.previewPath, viewport: { width: a.width, height: a.height } }))
          : entryHtml
            ? [{ id: "page", label: project.title, relPath: entryHtml, viewport: { width: 1280, height: 800 } }]
            : [];
        checksById.set(
          "visual-diff",
          await checkVisualDiff(session.context, projectId, version, artifact.outputDir, targets, config.convergence.visualDiffMinScore),
        );
      }
    } finally {
      await session.close();
    }
  }

  if (required.has("materials-unchanged")) {
    checksById.set("materials-unchanged", await checkMaterialsUnchanged(artifact.outputDir, materials));
  }
  if (required.has("multi-size-output")) {
    checksById.set(
      "multi-size-output",
      await checkMultiSizeOutput(artifact.outputDir, manifest, resolveOutputSizes(project)),
    );
  }
  if (required.has("brand-consistency")) {
    checksById.set(
      "brand-consistency",
      await checkBrandConsistency(
        artifact.outputDir,
        manifest,
        project.brief.brandGuideline?.colors,
        config.convergence.brandColorToleranceDistance,
        config.convergence.brandColorMinCompliantFraction,
      ),
    );
  }

  const checks = template.requiredVerificationChecks
    .map((id) => checksById.get(id))
    .filter((c): c is VerificationCheck => c !== undefined);

  const convergence = judgeConvergence(checks, version, config.convergence.maxIterations);
  const result = await addVerificationResult(projectId, version, version, checks, convergence);

  const markdown = renderMarkdownReport(result, project.title);
  const markdownPath = join(verificationResultsDir(projectId), `v${version}.md`);
  await writeFile(markdownPath, markdown, "utf-8");

  return { result, markdownPath };
}
