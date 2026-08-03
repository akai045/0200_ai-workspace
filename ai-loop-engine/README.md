# ai-loop-engine

要件定義書（`00_Inbox/00_attachment_files/20260803/AI_LOOP_要件定義書_v1−1.docx`）に基づく、AI LOOP（デザイン生成→実装生成→検証→修正の反復ループ）のPhase1実装（Webサイト向けコア）。

意思決定の背景は [`../08_Decisions/ADR-0007-ai-loop-engine-build.md`](../08_Decisions/ADR-0007-ai-loop-engine-build.md)、開発タスクは [`../02_Tasks/TASK-2026-0002-ai-loop-engine-phase1.md`](../02_Tasks/TASK-2026-0002-ai-loop-engine-phase1.md) を参照。

このディレクトリはVault本体（`00_Inbox`〜`10_Runs`）とは別の、**成果物としてのソフトウェア**。Vault自身の運用管理（タスクのstatus管理等）には影響しない。

## セットアップ

```bash
cd ai-loop-engine
npm install
npx playwright install chromium   # アクセシビリティ・レスポンシブ・ビジュアル差分検証に必要（初回のみ）
```

## コマンド

```bash
npm run ai-loop -- project:init --id <project-id> --title "..." --template website
npm run ai-loop -- material:add --project <project-id> --file <path> --usage header-logo --fixed
npm run ai-loop -- design:generate --project <project-id> --brief <path-to-brief.json>
npm run ai-loop -- design:select --project <project-id> --version <n>
npm run ai-loop -- impl:generate --project <project-id>
npm run ai-loop -- verify --project <project-id>
npm run ai-loop -- report --project <project-id>
npm run ai-loop -- export --project <project-id> --adapter static-html   # または wordpress
```

## 要件定義書との対応

| モジュール | 要件ID | 実装状況 |
|---|---|---|
| `src/materials/` | F-108〜F-110 | 実装（Webサイトテンプレートのみ） |
| `src/generation/` | F-101,102,106,201-203 | 実装（manualHandoff／claudeApiエンジン） |
| `src/verification/` | F-401〜F-406 | 実装（Lint/a11y/レスポンシブ/ビジュアル差分/素材非改変/レポート） |
| `src/orchestrator/` | F-501〜F-505 | 実装（収束判定・人間チェックポイント） |
| `src/templates/website/` | 5.1〜5.5・5.7（Webサイト） | 実装 |
| `src/templates/{logo,illustration,banner}/` | F-103〜F-105, 5.6 | **登録スタブのみ**（Phase2以降） |
| `src/adapters/output/staticExport.ts` | F-701, F-704 | 実装 |
| `src/adapters/cms/wordpress/` | F-301, F-302 | 実装（テーマファイル変換のみ） |
| `src/adapters/cms/*`（WordPress以外） | F-305 | **登録スタブのみ** |
| ライブCMS投入 | F-304 | 未実装（Could優先度・資格情報が無いため） |
| 認証情報暗号化保管 | NF-302 | 未実装（ライブ投入自体が未実装のため） |
| コスト計測・上限アラート | NF-403 | 未実装（Phase5相当） |
| 商標・著作権類似度チェック | NF-303 | 未実装（Could優先度） |

## 設計上の制約

- **内部データストアはSQLiteを使わない**（`ai-loop.config.json` と `projects/<id>/` 配下のJSONファイル、版は追記のみ）。Vault運用のSQLite不採用方針（SPEC §12）とは別の判断だが、原則7（実測ドリブン）を踏襲している（ADR-0007参照）。
- **人間チェックポイントは自動で飛ばさない**：`design:select` を経ないと `impl:generate` は動かない。収束・最大反復到達後も、確定は人間の明示操作を要する。
- 支給素材（`--fixed` で登録した素材）は新規生成・改変の対象にせず、`verify` の `materialsUnchanged` チェックで非改変性を検証する。
