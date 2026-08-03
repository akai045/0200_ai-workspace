#!/usr/bin/env node
/**
 * ai-loop CLI エントリポイント。
 * project:init / material:add / design:generate / design:select / impl:generate /
 * verify / report / export / approve の各コマンドを実行する。
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DesignBrief } from "../core/types.js";
import { readJson } from "../store/fileStore.js";
import { verificationResultsDir } from "../store/paths.js";
import { createProject, listVerificationResults } from "../store/projectStore.js";
import { registerAllTemplates } from "../templates/index.js";
import { getTemplate } from "../templates/registry.js";
import { registerAllAdapters } from "../adapters/index.js";
import { registerMaterial } from "../materials/ledger.js";
import { ManualHandoffPendingError } from "../generation/index.js";
import {
  generateDesignVersions,
  selectDesign,
  generateImplementationVersion,
  verifyProject,
  approveProject,
  exportProject,
} from "../orchestrator/index.js";

type Flags = Record<string, string | boolean>;

function parseFlags(args: string[]): Flags {
  const flags: Flags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }
  return flags;
}

function requireFlag(flags: Flags, name: string): string {
  const value = flags[name];
  if (typeof value !== "string") {
    throw new Error(`--${name} は必須です。`);
  }
  return value;
}

function boolFlag(flags: Flags, name: string): boolean {
  return flags[name] === true || flags[name] === "true";
}

async function cmdProjectInit(flags: Flags): Promise<void> {
  const id = requireFlag(flags, "id");
  const title = requireFlag(flags, "title");
  const templateId = typeof flags.template === "string" ? flags.template : (flags.category as string) ?? "website";
  const template = getTemplate(templateId);
  if (!template.implemented) {
    throw new Error(`テンプレート"${templateId}"はPhase1では未実装です（登録スタブのみ。実装済み: website）。`);
  }
  const brief: DesignBrief = flags.brief
    ? await readJson<DesignBrief>(requireFlag(flags, "brief"))
    : { purpose: "", outputFormat: template.category };
  const project = await createProject({ id, title, category: template.category, templateId, brief });
  console.log(`プロジェクトを作成しました: ${project.id}（${project.title} / template=${project.templateId}）`);
}

async function cmdMaterialAdd(flags: Flags): Promise<void> {
  const projectId = requireFlag(flags, "project");
  const sourceFilePath = requireFlag(flags, "file");
  const usageTag = requireFlag(flags, "usage");
  const fixed = boolFlag(flags, "fixed");
  const altText = typeof flags.alt === "string" ? flags.alt : undefined;
  const material = await registerMaterial({ projectId, sourceFilePath, usageTag, fixed, altText });
  console.log(`素材を登録しました: ${material.id}（usage=${material.usageTag}, fixed=${material.fixed}）`);
}

async function cmdDesignGenerate(flags: Flags): Promise<void> {
  const projectId = requireFlag(flags, "project");
  const briefOverride = flags.brief ? await readJson<DesignBrief>(requireFlag(flags, "brief")) : undefined;
  try {
    const outcome = await generateDesignVersions(projectId, briefOverride);
    console.log(`デザイン案 v${outcome.version} を ${outcome.candidates.length} 件生成しました。`);
    for (const c of outcome.candidates) console.log(`  - v${c.version}-c${c.candidateIndex}`);
    console.log(`次のコマンドで案を選定してください: design:select --project ${projectId} --version ${outcome.version} --candidate <0..${outcome.candidates.length - 1}>`);
  } catch (err) {
    if (err instanceof ManualHandoffPendingError) {
      console.log(err.message);
      return;
    }
    throw err;
  }
}

async function cmdDesignSelect(flags: Flags): Promise<void> {
  const projectId = requireFlag(flags, "project");
  const version = Number(requireFlag(flags, "version"));
  const candidateIndex = Number(requireFlag(flags, "candidate"));
  await selectDesign(projectId, version, candidateIndex);
  console.log(`デザイン v${version}-c${candidateIndex} を選定しました。impl:generate を実行できます。`);
}

async function cmdImplGenerate(flags: Flags): Promise<void> {
  const projectId = requireFlag(flags, "project");
  try {
    const outcome = await generateImplementationVersion(projectId);
    console.log(`実装版 v${outcome.version} を生成しました（${outcome.files.length}ファイル）。`);
    console.log(`次のコマンドで検証してください: verify --project ${projectId}`);
  } catch (err) {
    if (err instanceof ManualHandoffPendingError) {
      console.log(err.message);
      return;
    }
    throw err;
  }
}

async function cmdVerify(flags: Flags): Promise<void> {
  const projectId = requireFlag(flags, "project");
  const outcome = await verifyProject(projectId);
  console.log(`検証結果 v${outcome.version}: ${outcome.allPassed ? "全項目適合" : "不適合あり"}（収束=${outcome.converged ? "済み" : "未達"}）`);
  console.log(`レポート: ${outcome.markdownPath}`);
  if (!outcome.allPassed) {
    console.log(outcome.converged
      ? `最大反復回数に到達したため人間レビューへエスカレーションしてください（statusはconvergedですがapproveは慎重に判断してください）。`
      : `impl:generate --project ${projectId} を再実行し、指摘事項を修正してから再度 verify を実行してください。`);
  }
  process.exitCode = outcome.allPassed ? 0 : 1;
}

async function cmdReport(flags: Flags): Promise<void> {
  const projectId = requireFlag(flags, "project");
  const results = await listVerificationResults(projectId);
  if (results.length === 0) {
    console.log(`プロジェクト"${projectId}"の検証結果はまだありません。`);
    return;
  }
  const version = flags.version ? Number(flags.version) : results[results.length - 1].version;
  const result = results.find((r) => r.version === version);
  if (!result) throw new Error(`検証結果 v${version} が見つかりません。`);
  const markdownPath = join(verificationResultsDir(projectId), `v${version}.md`);
  console.log(await readFile(markdownPath, "utf-8"));
}

async function cmdExport(flags: Flags): Promise<void> {
  const projectId = requireFlag(flags, "project");
  const adapterId = requireFlag(flags, "adapter");
  const version = flags.version ? Number(flags.version) : undefined;
  const result = await exportProject(projectId, adapterId, version);
  console.log(`書き出しました: ${result.outputPath}`);
}

async function cmdApprove(flags: Flags): Promise<void> {
  const projectId = requireFlag(flags, "project");
  await approveProject(projectId);
  console.log(`プロジェクト"${projectId}"を最終承認しました（status: approved）。`);
}

const COMMANDS: Record<string, (flags: Flags) => Promise<void>> = {
  "project:init": cmdProjectInit,
  "material:add": cmdMaterialAdd,
  "design:generate": cmdDesignGenerate,
  "design:select": cmdDesignSelect,
  "impl:generate": cmdImplGenerate,
  verify: cmdVerify,
  report: cmdReport,
  export: cmdExport,
  approve: cmdApprove,
};

async function main(): Promise<void> {
  registerAllTemplates();
  registerAllAdapters();

  const [command, ...rest] = process.argv.slice(2);
  const handler = command ? COMMANDS[command] : undefined;
  if (!handler) {
    console.error(`使い方: ai-loop <command> [--flags]\n利用可能なコマンド: ${Object.keys(COMMANDS).join(", ")}`);
    process.exitCode = 1;
    return;
  }
  await handler(parseFlags(rest));
}

main().catch((err) => {
  console.error(`[ai-loop] エラー: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
