---
task_id: TASK-2026-0002
title: AI LOOPエンジン Phase1（Webサイト向けコアループ）の実装
objective: デザイン生成→実装生成→自動検証→収束判定→人間承認の一連をCLIで実行できるNode.js/TypeScript製システムをai-loop-engine/に構築し、サンプル案件で一気通貫の動作を確認する
project: PROJECT-002
status: doing
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
  1. [ ] `src/orchestrator/`：design:generate→design:select→impl:generate→verifyの状態遷移＋人間チェックポイント（design:select必須・収束後もapprove必須）を実装
  2. [ ] `src/adapters/`：output/staticHtml（zip）・cms/wordpress（テーマファイル生成）・その他CMS登録スタブ
  3. [ ] `src/cli/index.ts`：project:init/material:add/design:generate/design:select/impl:generate/verify/report/export/approve
  4. [ ] `tests/`：store・convergence・materials整合性のユニットテスト（node --test）
  5. [ ] サンプル案件で一気通貫動作確認（意図的lintエラー→不合格→修正→合格）
  6. [ ] README.md／PROGRESS.mdを実装状況に合わせて更新、コミット
- 各ステップ完了ごとにこのチェックリストを更新する。
