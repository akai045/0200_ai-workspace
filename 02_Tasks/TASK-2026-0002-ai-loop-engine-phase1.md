---
task_id: TASK-2026-0002
title: AI LOOPエンジン Phase1（Webサイト向けコアループ）の実装
objective: デザイン生成→実装生成→自動検証→収束判定→人間承認の一連をCLIで実行できるNode.js/TypeScript製システムをai-loop-engine/に構築し、サンプル案件で一気通貫の動作を確認する
project: PROJECT-002
status: done
tier: T1
owner: build-doer
checker: checker
auditor:
requires_human_approval: false
inputs:
  - 00_Inbox/00_attachment_files/20260803/AI_LOOP_要件定義書_v1−1.docx
  - 01_Projects/PROJECT-001-watashiwa-lulu.md
  - 03_Outputs/PROJECT-001-watashiwa-lulu/
outputs:
  - ai-loop-engine/
acceptance_criteria:
  - ai-loop-engine/ にNode.js/TypeScript製のCLIがあり、project:init / material:add / design:generate / design:select / impl:generate / verify / report / export の各コマンドが実行できる
  - 支給素材を1件登録すると固定要素として扱われ、実装生成後も意匠が非改変であることをverifyが検証する（materialsUnchangedチェックが実行される）
  - verifyコマンドが実際にHTML/CSS/JS Lint・アクセシビリティ（axe-core）・レスポンシブ（複数ブレークポイントのoverflow検出）・ビジュアル差分（pixelmatch）を実行し、スコア付きレポート（JSON＋Markdown）を出力する
  - 意図的にlintエラーを仕込んだ状態で一度不合格判定を出し、修正後の再検証で合格に変わることを確認できる（反復・収束判定が機能している）
  - design:generateの後はdesign:selectを経ないとimpl:generateが実行できない、また収束後も明示的な確定操作なしには最終状態にならない（人間チェックポイントが自動で飛ばされない）
  - exportで静的HTML一式のzip出力、wordpressアダプタでテーマファイル一式（PROJECT-001のwordpress/相当の構成）が生成できる
  - templates/adapters（logo・illustration・banner、WordPress以外のCMS）はレジストリへの登録スタブのみで、中身は実装しない
  - node --test によるユニットテスト（store・収束判定・素材整合性ロジック）が通る
  - 外部送信・本番CMSへのライブ投入・認証情報の暗号化保管の実装を行っていない
prohibited:
  - CMSへの実投入（本番サーバーへの接続・デプロイ）
  - 認証情報（APIキー等）を暗号化以外の形でリポジトリに含める、またはコミットする
  - Vault本体（00_Inbox〜10_Runsの既存運用・CLAUDE.md・SPEC.md）のstatus管理フローの変更
max_cost_usd: 15.00
max_attempts: 3
created_at: 2026-08-03T09:00:00+09:00
deadline:
---

# 背景
`00_Inbox/00_attachment_files/20260803/AI_LOOP_要件定義書_v1−1.docx` の要件定義に基づき、AI LOOP（デザイン生成〜実装〜検証〜修正の反復ループ）を本格的なソフトウェアとして開発する。既存の [[PROJECT-001-watashiwa-lulu]]（TASK-2026-0001）で、Claude Codeが生成エンジン・Checkerが検証エンジン・人間が承認という形ですでに同種のループを1回実地で回した実績があり、これを再利用可能な形へ一般化する。詳細な設計判断は [[ADR-0007-ai-loop-engine-build]] を参照。

# 詳細
- 対象スコープは要件定義書自身のロードマップに合わせ、Phase1（Webサイト、5.1〜5.5・5.7のMust/Should中心）を実働させる。ロゴ／イラスト／バナー／CMSライブ投入等はレジストリ（拡張点）として用意するのみで、中身は作り込まない。
- 内部データストアはSQLiteを使わずファイルベースJSON（版は追記、上書きしない）とする。
- 人間参加のチェックポイント（デザイン案選定・最終承認）は自動化しない。

## 対立的推論（着手前・3点／ADR-0006）
1. **検証エンジンが「動いているふり」になるリスク**：LintやPlaywrightを呼ばずスコアを決め打ちで返すと、要件定義書の「自動検証」が名ばかりになる → 実際にhtmlhint/stylelint/eslint・Playwright・axe-core・pixelmatchを動かし、意図的にエラーを仕込んだ再検証で不合格→合格の変化を確認することでこれを担保する。
2. **人間チェックポイントの空洞化**：オーケストレーターが便利さ優先で自動的に「選定」「確定」まで進めてしまうと、CLAUDE.md §1の不変条件（statusの書き手は人間/Claude Codeのみ）と矛盾する → design:select・確定コマンドを明示的な別操作として分離し、自動連鎖させない実装にする。
3. **支給素材の意匠改変**：実装生成時にAIが支給素材を「参考」として再生成してしまうリスク → 素材台帳の固定フラグをプロンプト・実装コードの両方で明示的に扱い、verifyのmaterialsUnchangedチェックで出力ファイルと登録時の記録（寸法・ハッシュ等）を突き合わせる。

# メモ
作業ログはこのファイルに追記していく。status は frontmatter でのみ管理する。

## 作業ログ（Doer・2026-08-03）
- 既存実装を確認：core/types・config、store（fileStore/projectStore/paths）、materials（ledger/gapDetection/integrity）、generation（design/implEngine・manualHandoff/claudeApi）、templates（registry+website実装+logo/illustration/banner登録スタブ）、verification（htmlLint/cssLint/jsLint/accessibility/responsive/visualDiff/materialsUnchanged/convergence/report）は実装済み・健全と判断。PROGRESS.mdのE-3〜E-7相当。
- 残タスクのステップリスト（セッション中断耐性・ADR-0004）：
  1. [x] `src/orchestrator/`：design:generate→design:select→impl:generate→verifyの状態遷移＋人間チェックポイント（design:select必須・収束後もapprove必須）を実装
  2. [x] `src/adapters/`：output/staticHtml（zip）・cms/wordpress（テーマファイル生成）・その他CMS登録スタブ
  3. [x] `src/cli/index.ts`：project:init/material:add/design:generate/design:select/impl:generate/verify/report/export/approve
  4. [x] `tests/`：store・convergence・materials整合性のユニットテスト（node --test）
  5. [x] サンプル案件で一気通貫動作確認（意図的lintエラー→不合格→修正→合格）
  6. [x] README.md／PROGRESS.mdを実装状況に合わせて更新、コミット
- 各ステップ完了ごとにこのチェックリストを更新する。

## 完了報告（Doer・2026-08-03）

**実装**：`src/orchestrator/`（designPhase/implementationPhase/verifyPhase/approve/exportPhase）、`src/adapters/`（output/staticHtml・cms/wordpress・cms/stubs）、`src/cli/index.ts`（9コマンド）、`tests/`（store・convergence・materialsIntegrity、node --testで17件）を新規実装。既存実装（core/store/materials/generation/templates/verification）と合わせてPhase1のCLI一式が動く状態になった。

**動作確認内容（サンプル案件 `sample-site`・実機確認、モックなし）**：
1. `project:init` → `material:add`（ヘッダーロゴをfixed登録）→ `design:generate`（manualHandoffが応答待ちで停止することを確認→Claude Codeとして3案のデザイン応答JSONを作成→再実行で3案永続化）。
2. `impl:generate` を **design:select を経ずに実行するとエラーで拒否される**ことを確認（人間チェックポイントが自動で飛ばされない）。
3. `design:select` 後、`impl:generate` でHTMLに意図的な重複id（`id="hero"`）とCSSの規約違反を仕込んだ実装（v1）を作成。
4. `verify` を実行 → htmlhintの`id-unique`エラーとstylelintの複数エラーで**実際に不適合判定**（exit code 1）。レポート（Markdown）に指摘事項が具体的な行番号付きで記録されることを確認。
5. `impl:generate` を再実行 → 前回の不適合項目（previousIssues）が自動でエンジンへの指示に含まれることを確認。重複id・CSS規約違反を修正したv2を作成。
6. `verify` を再実行 → 全7項目（html-lint/css-lint/js-lint/accessibility/responsive/visual-diff/materials-unchanged）が適合、収束（converged）。
7. `approve` を **verify収束前の別プロジェクトで実行するとエラーで拒否される**ことを確認した上で、`sample-site`で`approve`実行 → status: approved。
8. `export --adapter static-html` → zip書き出し確認（unzipで中身確認）。`export --adapter wordpress` → header.php/footer.php/front-page.php/page-contact.php/page.php/functions.php/style.css等、PROJECT-001のwordpress/相当の構成でテーマファイル一式が生成されることを確認（header.php/footer.phpの内容が元HTMLの`<header>`/`<footer>`を正しく抽出していることも目視確認）。

**受入条件との対応**：SPEC/CLAUDE.mdの受入条件（TASK frontmatter参照）を全項目満たしたと判断。特に「意図的にlintエラーを仕込んだ状態で一度不合格判定を出し、修正後の再検証で合格に変わることを確認できる」「design:selectを経ないとimpl:generateが実行できない」「収束後も明示的な確定操作（approve）なしには最終状態にならない」は上記の通り実機で確認済み。

**設計判断の記録**：
- `ai-loop-engine/projects/`（プロジェクトごとのファイルベースJSONストア・素材・生成物・エクスポート）はGit管理外とした（`.gitignore`に追加）。ソースコードではなく実行時データであり、サンプル案件（PNG画像・zip等のバイナリ含む）をVaultへ恒久記録する必要はないと判断（ADR-0007の趣旨：Vault本体のstatus管理・確定記録とは別レイヤー）。
- htmlhintがCJS専用パッケージでNode ESM相互運用のnamed exportに対応していなかったため、`src/types/htmlhint.d.ts`をdefault export形式に修正（実行時エラーの実機発見・修正）。

**未実施・対象外（既存README/ADR-0007の記載通り、Phase1スコープ外）**：CMSライブ投入（F-304）・認証情報暗号化保管（NF-302）・ロゴ/イラスト/バナーの中身実装・WordPress以外のCMSアダプタの中身実装。

**次のアクション**：Checker検査（受入条件との3値判定）→ 通れば人間確認。

## 人間確認（2026-08-03）
ヒューマンチェックOK。status: doing → done。Phase1（Webサイト向けコアループ）完了として確定。次はPhase2（Webサイト以外のデザイン成果物向けコアループ）へ。
