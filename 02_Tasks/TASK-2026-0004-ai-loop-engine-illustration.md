---
task_id: TASK-2026-0004
title: AI LOOPエンジン Phase2追加（イラストカテゴリ）の実装
objective: 要件定義書のF-104（イラスト生成）に対応するテンプレートを実装し、Webサイト・ロゴ・バナー・チラシと同じデザイン生成→実装生成→自動検証→収束判定→人間承認の一気通貫ループをイラストカテゴリでも実働させる
project: PROJECT-002
status: checking
tier: T1
owner: build-doer
checker: checker
auditor:
requires_human_approval: false
inputs:
  - 00_Inbox/00_attachment_files/20260803/AI_LOOP_要件定義書_v1−1.docx
  - ai-loop-engine/（TASK-2026-0002・TASK-2026-0003の実装済みコア）
outputs:
  - ai-loop-engine/（illustrationテンプレートの実装）
acceptance_criteria:
  - illustrationテンプレートがimplemented:trueで登録され、project:init --template illustration からapproveまで既存CLIコマンドがそのまま動作する
  - TASK-2026-0003で確立したGraphicDesignSpec（アートボード構成）・graphicPostProcess（SVG→PNGラスタライズ）・svg-lint/multi-size-output/brand-consistency検証をそのまま流用し、コア（core/types.ts・orchestrator・verification/index.ts等）の改修を行わない（F-601/602：テンプレート追加のみでの拡張）
  - デザイン生成がbrief.outputSizes（未指定時はイラスト向けの既定サイズ）に基づきアートボードを生成し、design:selectを経ないとimpl:generateが実行できないこと（既存カテゴリと同じ人間チェックポイント）が維持される
  - サンプル案件（illustrationカテゴリ）で、意図的な不備で一度不適合判定を出し、修正後の再検証で合格に変わることを実機確認できる
  - Lottie（アニメーション）出力は要件定義書上も拡張出力形式（Could優先度）のため、EPS（ロゴ）・HTML5バナー（バナー）と同様に未実装のままとし、その旨をREADMEに明記する
  - node --test の既存テストに回帰がないこと
prohibited:
  - CMSへの実投入（本番サーバーへの接続・デプロイ）
  - 認証情報（APIキー等）を暗号化以外の形でリポジトリに含める、またはコミットする
  - Vault本体（00_Inbox〜10_Runsの既存運用・CLAUDE.md・SPEC.md）のstatus管理フローの変更
max_cost_usd: 8.00
max_attempts: 3
created_at: 2026-08-03T00:00:00+09:00
deadline:
---

# 背景
[[TASK-2026-0003-ai-loop-engine-phase2-graphics]]（ロゴ・バナー・チラシ）が人間確認OKとなった際、要件定義書上のカテゴリ（Web/ロゴ/イラスト/バナー）のうちイラストのみが未着手だった。依頼に基づき着手する。

# 詳細
TASK-2026-0003でGraphicDesignSpec（アートボード構成）・graphicPostProcess（機械的なPNGラスタライズ・マニフェスト生成）・svg-lint/multi-size-output/brand-consistency検証・resolveOutputSizesという「Webサイト以外」の共通基盤を作った。イラストはロゴ・バナーと同じ「アートボード（複数可）＋SVG/PNG出力」という形に自然に当てはまるため、要件定義書が期待する通り（F-601/602）テンプレート追加のみで対応する。

## 対立的推論（着手前・3点／ADR-0006）
1. **コア（core/types.ts・orchestrator・verification/index.ts）に手を入れてしまい、F-601/602の「テンプレート追加のみで拡張できる」という設計原則を破るリスク** → 実装前にTASK-2026-0003のアーキテクチャを確認し、`ProjectCategory`に`"illustration"`が既に含まれていること、`resolveOutputSizes`・`graphicPostProcess`・各verificationチェックがカテゴリ非依存であることを確認した上で、変更はテンプレートファイル1つ＋`outputSizes.ts`の既定値追加のみに限定する。
2. **イラスト特有の「スタイル一貫性」（フラット・線画等のテイスト統一）を検証しないまま「検証済み」と称するリスク** → 要件定義書のF-401〜F-406にスタイル一貫性を機械的に検証する項目は無く、ロゴ・バナーで実装したbrand-consistency（色）とsvg-lint（構造）以上のスタイル検証は要件定義書のスコープ外と判断し、既存チェックのみを適用する（過剰な作り込みをしない）。
3. **Lottie出力を中途半端に実装し「動いているふり」になるリスク** → Lottie（アニメーション）は拡張出力形式（Could優先度）であり、TASK-2026-0003でも同種の拡張形式（ロゴのEPS、バナーのHTML5アニメーション）を未実装として明記している。同じ扱いとし、実装しない。

# メモ
作業ログはこのファイルに追記していく。status は frontmatter でのみ管理する。

## 作業ログ（Doer・2026-08-03）
1. [x] src/templates/outputSizes.tsにillustrationの既定サイズを追加
2. [x] src/templates/illustration/template.tsを実テンプレートに変更、templates/index.ts更新
3. [x] サンプル案件（illustration）で一気通貫動作確認（意図的な不備→不適合→修正→適合）
4. [x] 既存テスト（node --test）に回帰が無いことを確認
5. [x] README.md／PROGRESS.md更新、コミット

## 完了報告（Doer・2026-08-03）

**実装**：`src/templates/outputSizes.ts`にillustrationの既定サイズ（アイキャッチ想定1200x630）を追加。`src/templates/illustration/template.ts`を`implemented:true`の実テンプレートに変更（requiredSlots: style-reference任意、requiredVerificationChecks: TASK-2026-0003と同じ6項目）。`src/templates/index.ts`の登録をスタブ関数から実テンプレート関数に差し替え。**core/types.ts・orchestrator・verification/index.ts・generation engineは一切変更していない**（F-601/602の「テンプレート追加のみで拡張できる」設計が実際に成立することを確認）。

**動作確認内容（サンプル案件 `sample-illustration`・実機確認、モックなし）**：
1. `project:init --template illustration`（brief.outputSizes未指定→既定値1200x630のアートボード1枚が自動選択されることを確認）→ `design:generate`→3案永続化。
2. `design:select`を経ずに`impl:generate`を実行するとエラーで拒否されることを確認。
3. `design:select`後、`impl:generate`でブランドカラー（#3b2a20, #c9a24b）と無関係な配色（#00e5ff, #39ff14）のSVGを仕込んだv1を作成。
4. `verify`実行 → `brand-consistency`が実際に不適合判定（ブランドカラー近似画素0.0%）。svg-lint/accessibility/multi-size-outputは適合。
5. 前回指摘（previousIssues）を踏まえ、ブランドカラーに寄せたv2を作成したが、背景色`#fdf6ec`が中立色判定の閾値（近似判定：チャンネル差<16）をわずかに超えて有彩色扱いされ、`brand-consistency`が42.2%で再度不適合、かつ`visual-diff`もv1からの実質的な内容変更を正しく検出し不適合（想定通りの挙動）。
6. 背景を`#ffffff`に変更したv3で`verify`再実行 → 全6項目適合、収束（converged）。
7. `approve`実行→`export --adapter static-html`でSVG/PNG/プレビューHTML/manifestを含むzip書き出しを確認。

**受入条件との対応**：TASK frontmatter記載の受入条件を全項目満たしたと判断。特に「コア（core/types.ts・orchestrator・verification/index.ts）の改修を行わない」「design:select必須・人間チェックポイント維持」「意図的な不備→不適合→修正→適合の反復」は上記の通り実機で確認済み。Lottie出力はTASK-2026-0004の対立的推論#3の通り、EPS・HTML5バナーアニメーションと同じ扱いで未実装のままとし、READMEにその旨を追記した。

**次のアクション**：Checker検査（受入条件との3値判定）→ 通れば人間確認。
