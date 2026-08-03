---
task_id: TASK-2026-0005
title: AI LOOPエンジン 拡張機能（非WordPress CMSアダプタ・コスト計測・EPS出力）の実装
objective: 要件定義書の残タスクのうち、外部送信・実認証情報を伴わず安全に実装できる範囲（F-305・NF-403・F-206拡張）に着手する。ライブCMS投入（F-304）・商標類似度チェック（NF-303）・アニメーション系拡張出力（Lottie・HTML5バナー）・Figma/Sketchプラグイン（F-603）は今回のスコープ外とし、理由を明記する
project: PROJECT-002
status: done
tier: T1
owner: build-doer
checker: checker
auditor:
requires_human_approval: false
inputs:
  - 00_Inbox/00_attachment_files/20260803/AI_LOOP_要件定義書_v1−1.docx
  - ai-loop-engine/（TASK-2026-0002〜0004の実装済みコア）
outputs:
  - ai-loop-engine/（非WordPress CMSアダプタ・コスト計測・EPS出力アダプタ）
acceptance_criteria:
  - microCMS/Shopify/Movable Typeの3アダプタが、それぞれの実際のデータ形式（microCMSのコンテンツJSON・Shopify Admin APIのPage資源JSON・Movable Type Import形式のプレーンテキスト）でWebサイトカテゴリの実装成果物を変換・出力できる（ライブAPI呼び出し・認証情報は一切扱わない）
  - 上記3アダプタはWebサイトカテゴリ専用とし、それ以外のカテゴリではwordpressアダプタと同様に明示的なエラーで拒否する
  - コスト計測（NF-403）が、claudeApiエンジン使用時に実際のトークン使用量（Anthropic APIレスポンスのusageフィールド）から実コストを計算し、プロジェクトごとの累積コストをcost:reportコマンドで確認できる。manualHandoffエンジン（Anthropic API課金を伴わない）はコスト0として扱い、実際に発生していない費用を計上しない
  - EPS出力アダプタが、logo/banner/flyer/illustrationカテゴリのSVG（rect/circle/path要素の単純な構成に限定）を実際に妥当なPostScript（EPS）へ変換できる。対応できない要素（gradient・transform等）を含む場合は変換をスキップし、その旨を警告として明記する（変換できないものを「できた」と偽らない）
  - node --test に新規ユニットテスト（CMSアダプタの出力内容・コスト計算・EPS変換内容）が追加され、既存テストに回帰がないこと
  - ライブCMS投入（F-304）・認証情報暗号化保管（NF-302）・商標/著作権類似度チェック（NF-303）・Lottie/HTML5バナーアニメーション出力・Figma/Sketch出力プラグイン（F-603）は実装しない。それぞれ対立的推論・READMEに理由を明記する
prohibited:
  - CMSへの実投入（本番サーバーへの接続・デプロイ、REST API等での実際の外部送信）
  - 認証情報（APIキー等）を暗号化以外の形でリポジトリに含める、またはコミットする
  - Vault本体（00_Inbox〜10_Runsの既存運用・CLAUDE.md・SPEC.md）のstatus管理フローの変更
max_cost_usd: 10.00
max_attempts: 3
created_at: 2026-08-03T00:00:00+09:00
deadline:
---

# 背景
[[TASK-2026-0004-ai-loop-engine-illustration]]完了時点で要件定義書のデザインカテゴリは全て実働したが、残りの機能要件（F-305・NF-403・拡張出力形式・F-304・NF-303等）は未着手だった。依頼を受け、外部送信・実認証情報を必要としない範囲を先に実装する。

# 詳細
- F-304（CMSライブ投入）とNF-302（認証情報暗号化保管）は、実際の投入先CMS・認証情報の受け渡し方法について人間の判断が必要なT2領域（CLAUDE.md §3.4）のため、本タスクでは着手せず、完了後に人間へ確認する。
- NF-303（商標・著作権類似度チェック）は、要件定義書4.2（対象外範囲）が「著作権・商標の法的審査（生成物の商標調査は利用者側の責任範囲とする）」を明示的にスコープ外としており、これと矛盾する。真の商標審査は外部の商標データベース・法的判断を要し、ローカルの画像類似度計算だけで「商標チェック済み」と称すると誤った安心感を与えるリスクが高いため実装しない。
- Lottie（イラスト）・HTML5バナーアニメーション（バナー）は、現在のGraphicDesignSpecに時間軸・キーフレームの概念が無く、これらを実装するには先にアニメーション対応のデータモデル拡張が必要（今回のスコープを超える）。F-603（Figma/Sketchプラグイン）は実際のFigma API呼び出し（外部送信・OAuth認証情報）または実物のSketchバイナリ形式対応を要し、いずれも本タスクの安全に実装できる範囲を超えるため見送る。

## 対立的推論（着手前・3点／ADR-0006）
1. **EPS変換が対応できない図形要素を無視して「変換できた」ように見せてしまうリスク** → 対応する要素（rect/circle/path）以外（gradient・transform・text等）を検出した場合は変換をスキップし、warningsとして明記する。ユニットテストで単純な図形の変換内容自体（座標変換・PostScript構文）を検証する。
2. **コスト計測が実際のAPI課金と乖離した数値を「実測」と称してしまうリスク** → claudeApiエンジンのAnthropic APIレスポンスに含まれるusage（input_tokens/output_tokens）を実際に読み取って計算する。manualHandoffエンジンはAnthropic API課金が発生しないため、コストは常に0として記録し、発生していない費用を水増ししない。
3. **非WordPress CMSアダプタが実際にはそのCMSで使えない適当なJSON/テキストを出力し、F-305の「CMS非依存の中間形式経由での変換」を名ばかりにするリスク** → microCMSのコンテンツ管理API・ShopifyのAdmin API（Page資源）・Movable TypeのImport形式という、それぞれ実在する公開ドキュメント上のデータ形式に対応させる（存在しない独自形式を作らない）。

# メモ
作業ログはこのファイルに追記していく。status は frontmatter でのみ管理する。

## 作業ログ（Doer・2026-08-03）
1. [x] 共通HTML抽出ヘルパー（wordpress/transform.tsは変更しない）＋microcms/shopify/movableTypeアダプタ実装
2. [x] コスト計測（NF-403）：config追加・src/cost/tracker.ts・claudeApiエンジン連携・cost:report CLIコマンド
3. [x] EPS出力アダプタ実装（logo/banner/flyer/illustration、rect/circle/pathのみ対応）
4. [x] 動作確認・ユニットテスト追加・README/PROGRESS.md更新・コミット

## 完了報告（Doer・2026-08-03）

**実装**：
- `src/adapters/cms/shared/htmlPageExtract.ts`（新規）：title/header/footerを除いた本文抽出の共通ヘルパー。**既に人間確認済みのwordpress/transform.tsは一切変更していない**（回帰リスクを避けるため意図的に非共有）。
- `src/adapters/cms/{microcms,shopify,movableType}/index.ts`：それぞれ実在する公開データ形式（microCMSコンテンツ管理APIのリクエストボディ・Shopify Admin APIのPage資源JSON・Movable Type Import形式のプレーンテキスト）でローカルファイルを書き出す。websiteカテゴリ専用ガード付き。ライブAPI呼び出し・認証情報は一切扱わない。`src/adapters/cms/stubs.ts`は実装完了に伴い削除。
- `src/cost/tracker.ts`（新規）：`estimateCostUsd`（実usage×単価）・`recordGenerationCost`・`sumProjectCostUsd`・`checkBudget`。`src/generation/engines/claudeApi.ts`のAnthropic APIレスポンスから実際の`usage.input_tokens`/`output_tokens`を取得してコストを記録し、上限超過時はconsole.warnで通知（強制停止はしない＝アラート要件）。manualHandoffエンジンはAPI課金が発生しないため記録しない。`ai-loop.config.json`に`costTracking`（単価・上限）を追加。CLIに`cost:report`コマンドを追加。
- `src/adapters/output/svgToEps.ts`・`epsExport.ts`（新規）：rect/circle/path・単色fillのみの単純なSVGを実際のPostScript（EPS）へ変換するエクスポートアダプタ（id: `eps`）。websiteカテゴリはガードで拒否。gradient・transform・相対座標コマンド・Q/S/T/A等の非対応要素を検出した場合は変換をスキップし、`CONVERSION_NOTES.md`に理由を明記する。

**動作確認内容（実機確認、モックなし）**：
1. `sample-logo`/`sample-illustration`/`regression-web`（website）の各カテゴリで、`export --adapter eps`・`export --adapter microcms/shopify/movable-type`・`export --adapter wordpress`（website以外は拒否）を実行し、それぞれ想定通りの出力・カテゴリガードを確認。
2. `cost:report --project sample-logo` → manualHandoffのみ使用のプロジェクトで累積コスト$0.0000・上限内と正しく表示されることを確認（claudeApiエンジンは本環境にAPIキーが無いため実機未検証。usage抽出・コスト計算ロジック自体はユニットテストで検証済み）。
3. `sample-logo`のEPS出力（`icon-128.eps`/`icon-512.eps`）の内容を目視確認し、Y座標反転・PostScript構文（moveto/lineto/curveto/arc/rlineto）が正しいことを確認。**Ghostscript等でのレンダリング検証は本環境に無く実施していない**（未検証の限界として明記）。

**ユニットテスト**：`tests/svgToEps.test.ts`（9件、rect/circle/path変換の数値検証・transform/gradient/未対応要素/相対座標の拒否を検証）・`tests/costTracker.test.ts`（6件）・`tests/htmlPageExtract.test.ts`（2件）を追加。node --test 48件全通過（既存31件＋新規17件）。

**受入条件との対応**：TASK frontmatter記載の受入条件を全項目満たしたと判断。「変換できないものをできたと偽らない」（EPS・対立的推論#1）「実usageのみを計上する」（コスト・対立的推論#2）「実在するデータ形式に対応させる」（CMSアダプタ・対立的推論#3）はいずれも実装・テストで担保した。ライブCMS投入（F-304）・認証情報暗号化保管（NF-302）・商標類似度チェック（NF-303）・Lottie/HTML5バナーアニメーション・Figma/Sketchプラグイン（F-603）は計画通り実装せず、README.mdに理由を明記した。

**次のアクション**：Checker検査（受入条件との3値判定）→ 通れば人間確認。

## 人間判断（2026-08-03）
ライブCMS投入（F-304）は「今回は見送る」との判断を確認。実投入先・認証情報の取り扱い方針が固まっていない限り着手しない（CLAUDE.md §3.4のT2手続き・恒久ルールの通り）。README.md「未実装」欄の記載はこの判断と一致しており、変更不要。

## Checker検査（2026-08-03T00:00:00+09:00）
コード（src/adapters/cms/{microcms,shopify,movableType}/index.ts、src/cost/tracker.ts、src/generation/engines/claudeApi.ts・manualHandoff.ts、src/adapters/output/svgToEps.ts・epsExport.ts）を直接読み、`npm run typecheck`・`npm test`を自ら実行し、git logで対象コミット（b1bc00c・d550bde）の変更範囲を確認した。

1. CMS3アダプタ（実データ形式変換）: 適合。microCMS＝PUT /api/v1/{endpoint}/{contentId}相当のJSON、Shopify＝POST /admin/api/2024-01/pages.json相当のPage資源JSON、Movable Type＝ENTRY/FIELD区切りのImport形式テキストを実際に出力（projects/regression-web/exports/配下の実出力ファイルで確認）。fetch呼び出しはclaudeApi.ts以外に存在せず、認証情報の扱いもコード上に無い。
2. website専用ガード: 適合。3アダプタとも`category !== "website"`で明示的Errorを投げる（wordpressアダプタと同じパターン）。
3. コスト計測（NF-403）: 適合。`estimateCostUsd`はusage(inputTokens/outputTokens)×config単価の純計算、claudeApi.tsはAnthropic APIレスポンスの`usage.input_tokens/output_tokens`を実際に読み取ってから`recordGenerationCost`を呼ぶ。manualHandoff.tsはtracker.ts・costを一切import/呼出しせず、水増しなし。`cost:report`はCLIに登録済み（src/cli/index.ts）。
4. EPS出力アダプタ: 適合。svgToEps.tsはrect/circle/path・絶対座標M/L/C/Zのみ許可し、transform/gradient/未対応タグ/相対座標/曲線コマンド(Q/S/T/A等)を検出すると変換せず理由付きunsupportedReasonを返す。epsExport.tsはunsupportedを警告としてCONVERSION_NOTES.mdに記録し「できた」と偽らない。tests/svgToEps.test.ts（9件）が各分岐を検証、実出力（icon-128.eps等）も正しいPostScript構文を確認。
5. ユニットテスト・回帰: 適合。`npm run typecheck`エラー0、`npm test`は48件中48件pass（完了報告の主張と一致）。
6. 未実装項目の明記: 適合。README.mdにF-304・NF-302・NF-303・Lottie/HTML5バナー・F-603がそれぞれ理由付きで「未実装」と明記され、対応するコードもリポジトリ上に存在しない（grep等で確認）。F-304は人間判断欄でも確認済み。

総合判定：合格。status を checking → approval へ進めました。

## 人間確認（2026-08-03）
ヒューマンチェックOK。status: approval → done。非WordPress CMSアダプタ・コスト計測・EPS出力の実装完了として確定。
