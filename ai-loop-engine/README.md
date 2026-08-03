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
npm run ai-loop -- project:init --id <project-id> --title "..." [--template website] [--brief <path-to-brief.json>]
npm run ai-loop -- material:add --project <project-id> --file <path> --usage header-logo --fixed
npm run ai-loop -- design:generate --project <project-id> [--brief <path-to-brief.json>]
npm run ai-loop -- design:select --project <project-id> --version <n> --candidate <c>
npm run ai-loop -- impl:generate --project <project-id>
npm run ai-loop -- verify --project <project-id>
npm run ai-loop -- report --project <project-id> [--version <n>]
npm run ai-loop -- export --project <project-id> --adapter static-html   # または wordpress
npm run ai-loop -- approve --project <project-id>
```

既定の生成エンジン（`manualHandoff`）は、`design:generate`／`impl:generate`実行時に応答待ち（`ManualHandoffPendingError`）となり、`projects/<id>/handoff/`配下に指示付きのリクエストJSONを書き出す。Claude Code操作者がresponseSchema通りの応答JSONを同じディレクトリへ書いてから同じコマンドを再実行する、という運用を想定している（PROJECT-001での実績と同じ生成エンジンとしての役割）。

`design:select`を経ないと`impl:generate`はエラーになり、`verify`が収束("converged")と判定した後も`approve`を明示的に実行しない限りプロジェクトは最終状態("approved")にならない（人間チェックポイントを自動で飛ばさない）。

## 要件定義書との対応

| モジュール | 要件ID | 実装状況 |
|---|---|---|
| `src/materials/` | F-108〜F-110 | 実装（Webサイトテンプレートのみ） |
| `src/generation/` | F-101,102,106,201-203 | 実装（manualHandoff／claudeApiエンジン） |
| `src/verification/` | F-401〜F-406 | 実装（Lint/a11y/レスポンシブ/ビジュアル差分/素材非改変/レポート） |
| `src/orchestrator/` | F-501〜F-505 | 実装（設計→選定→実装→検証の状態遷移・収束判定・人間チェックポイント） |
| `src/cli/` | — | 実装（project:init〜approveの9コマンド） |
| `src/templates/website/` | 5.1〜5.5・5.7（Webサイト） | 実装 |
| `src/templates/{logo,illustration,banner}/` | F-103〜F-105, 5.6 | **登録スタブのみ**（Phase2以降） |
| `src/adapters/output/staticHtml.ts` | F-701, F-704 | 実装（archiverによるzip書き出し） |
| `src/adapters/cms/wordpress/` | F-301, F-302 | 実装（`<header>/<main>/<footer>`規約前提のテーマファイル変換。詳細は下記「設計上の制約」参照） |
| `src/adapters/cms/*`（WordPress以外） | F-305 | **登録スタブのみ**（microCMS/Shopify/Movable Type） |
| ライブCMS投入 | F-304 | 未実装（Could優先度・資格情報が無いため） |
| 認証情報暗号化保管 | NF-302 | 未実装（ライブ投入自体が未実装のため） |
| コスト計測・上限アラート | NF-403 | 未実装（Phase5相当） |
| 商標・著作権類似度チェック | NF-303 | 未実装（Could優先度） |

## 設計上の制約

- **内部データストアはSQLiteを使わない**（`ai-loop.config.json` と `projects/<id>/` 配下のJSONファイル、版は追記のみ）。Vault運用のSQLite不採用方針（SPEC §12）とは別の判断だが、原則7（実測ドリブン）を踏襲している（ADR-0007参照）。
- **人間チェックポイントは自動で飛ばさない**：`design:select` を経ないと `impl:generate` は動かない。収束（`verify`のstatus: converged）後も、`approve` を明示的に実行しない限り最終状態（status: approved）にならない。
- 支給素材（`--fixed` で登録した素材）は新規生成・改変の対象にせず、`verify` の `materialsUnchanged` チェックで非改変性を検証する。
- **WordPressアダプタの変換規約**：実装生成エンジンへは「セマンティックなHTML」を明示的に指示しており、アダプタは各ページHTMLから最初に見つかった`<header>`/`<main>`/`<footer>`をそれぞれheader.php／各ページテンプレート／footer.phpへ機械的に分割する。この規約（先頭ページの見出し・フッタを全ページ共通として採用）が崩れているHTML（該当タグが無い等）はフォールバックの最小テンプレートを使い、その旨を出力先の`CONVERSION_NOTES.md`に明記する。ナビゲーションのリンク先はWPパーマリンクへは自動変換しない（静的HTMLのパスのままテーマに埋め込まれる）。
- **projects/配下はGit管理外**（`.gitignore`）：ファイルベースJSONストア・支給素材・生成物・エクスポートは実行時データであり、ソースコードとは別に扱う（ADR-0007）。
