---
task_id: TASK-2026-0003
title: AI LOOPエンジン Phase2（Webサイト以外のデザイン成果物向けコアループ）の実装
objective: ロゴ・バナー・チラシの3カテゴリについて、Phase1（[[TASK-2026-0002-ai-loop-engine-phase1]]）と同等のデザイン生成→実装生成→自動検証→収束判定→人間承認の一気通貫ループをai-loop-engine/上で実働させる
project: PROJECT-002
status: checking
tier: T1
owner: build-doer
checker: checker
auditor:
requires_human_approval: false
inputs:
  - 00_Inbox/00_attachment_files/20260803/AI_LOOP_要件定義書_v1−1.docx
  - ai-loop-engine/（TASK-2026-0002の実装済みコア）
  - 08_Decisions/ADR-0007-ai-loop-engine-build.md
outputs:
  - ai-loop-engine/（logo/banner/flyerテンプレート・新規検証チェック・graphicPostProcess等の追加実装）
acceptance_criteria:
  - ロゴ・バナー・チラシの3テンプレートがimplemented:trueで登録され、project:init --template logo|banner|flyer からapproveまで既存CLIコマンドがそのまま動作する
  - チラシ（flyer）はF-602（新規カテゴリのテンプレート追加のみでの拡張）のパターンに従って新設し、出力はデジタル閲覧・データ入稿用途に限定する（4.2の対象外事項＝紙媒体の物理的な色校正・入稿品質保証は行わない）旨をテンプレートのlabelとREADMEに明記する
  - デザイン生成がbrief.outputSizes（未指定時はカテゴリ既定サイズ）に基づき1サイズ1アートボードのGraphicDesignSpecを生成し、design:selectを経ないとimpl:generateが実行できないこと（Phase1と同じ人間チェックポイント）が維持される
  - 実装生成がSVG（ベクター・F-206）を実際に書き出し、機械的な後処理（AI裁量を介さない）でPNGラスタライズ（F-207・F-105・複数解像度）とプレビューHTML・artboards-manifest.jsonを生成する
  - verifyコマンドが実際にsvg-lint（Playwrightの実DOMParserによるXML妥当性検証）・accessibility（axe-core）・visual-diff（アートボードごとの前回反復比較）・multi-size-output（image-sizeで要求サイズとの一致を検証）・brand-consistency（pngjsで実ラスタ画像のピクセルをサンプリングしブランドカラーとの近似度を検証）・materials-unchanged を実行し、スコア付きレポート（JSON＋Markdown）を出力する
  - サンプル案件（logoカテゴリ）で、意図的な不備（要求サイズ未生成やSVG構造不備等）で一度不適合判定を出し、修正後の再検証で合格に変わることを実機確認できる（反復・収束判定が機能している）
  - wordpressアダプタはカテゴリ"website"以外に対して明示的にエラーを返し、static-htmlアダプタはlogo/banner/flyerでも出力（zip）できる
  - node --test によるユニットテスト（resolveOutputSizes・multi-size-output・brand-consistencyの各ロジック）が通る
  - Webサイトカテゴリの既存動作（Phase1のPROGRESS.md記載の一気通貫確認内容）に回帰がないこと
  - illustrationカテゴリは今回の対象外とし、登録スタブのまま変更しない
  - 外部送信・本番CMSへのライブ投入・認証情報の暗号化保管の実装を行っていない
prohibited:
  - CMSへの実投入（本番サーバーへの接続・デプロイ）
  - 認証情報（APIキー等）を暗号化以外の形でリポジトリに含める、またはコミットする
  - Vault本体（00_Inbox〜10_Runsの既存運用・CLAUDE.md・SPEC.md）のstatus管理フローの変更
  - illustrationカテゴリの中身実装（Phase1と同様、スコープ外）
max_cost_usd: 15.00
max_attempts: 3
created_at: 2026-08-03T00:00:00+09:00
deadline:
---

# 背景
[[TASK-2026-0002-ai-loop-engine-phase1]]（Webサイト向けコアループ）が人間確認OKとなったのを受け、要件定義書のスコープのうちPhase1で登録スタブのみとしていたロゴ・イラスト・バナー（F-103〜F-105, 5.6）のうち、依頼に基づきロゴ・バナー・チラシの3カテゴリを実働させる。チラシは要件定義書に無いカテゴリだが、F-602（新規カテゴリ追加はテンプレート追加のみで既存基盤を拡張できる）のパターンに従い新設する方針を人間に確認済み（AskUserQuestionでの回答：新規カテゴリとして追加、3カテゴリを1タスクにまとめる）。

# 詳細
- Phase1で確認済みの通り、materials/store/orchestrator/CLI/adaptersの各層はテンプレート駆動（`requiredSlots`・`requiredVerificationChecks`）で完全にカテゴリ非依存に作られているため、コア改修は最小限（core/types.tsの型一般化・verification/index.tsの新チェック配線）に留め、大部分はテンプレート追加＋新規検証チェック追加で対応する。
- Webサイトの`DesignSpec`（pages構成）とロゴ/バナー/チラシの`GraphicDesignSpec`（アートボード構成）は概念が異なるため、`kind`判別フィールドを持つ判別可能ユニオンに一般化する。
- 支給素材（F-108〜110）・非改変性検証（F-208/209）はWebサイトと同じ仕組み（`images/`配下・ハッシュ/縦横比比較）をそのまま流用する。
- 4.2（対象外範囲）により「印刷物（紙媒体）向けの色校正・入稿データの物理的品質保証」は行わない。チラシの出力はデジタルプレビュー用途（PNG/SVG）に限定し、この制約をテンプレートlabel・READMEに明記する。

## 対立的推論（着手前・3点／ADR-0006）
1. **SVGの「実装生成」がAIの自由記述テキストになり、構造検証が名ばかりになるリスク** → svg-lintはPlaywrightの実DOMParser（`new DOMParser().parseFromString`）でXMLパースエラー・ルート要素・viewBox/width-height有無を機械的に検証し、モック判定にしない。
2. **ブランド整合性検証（F-405）を「デザイン仕様のcolorPalette自己申告」を突き合わせるだけの見せかけにするリスク** → brandConsistencyはpngjsで実際にラスタライズ済みPNGのピクセルをサンプリングし、ブランドカラーとの近似度を計算する（AIが申告したcolorPaletteをそのまま信じない）。
3. **マルチサイズ出力（F-105/F-206/F-207）が「AIが指示に従ったと自己申告するだけ」になるリスク** → multi-size-outputは`resolveOutputSizes()`で要求サイズを機械的に確定し、実際に生成されたPNGファイルの寸法を`image-size`で実測して要求サイズ一覧と突き合わせる。

# メモ
作業ログはこのファイルに追記していく。status は frontmatter でのみ管理する。

## 作業ログ（Doer・2026-08-03）
ステップリスト（セッション中断耐性・ADR-0004）：
1. [x] core/types.ts: DesignSpec判別可能ユニオン化・flyerカテゴリ・新規VerificationCheckId追加
2. [x] src/templates/outputSizes.ts・src/generation/graphicPostProcess.ts新規実装
3. [x] manualHandoff/claudeApiエンジンのカテゴリ分岐対応
4. [x] svg-lint・multi-size-output・brand-consistency検証チェック実装、visualDiff.ts一般化、verification/index.ts配線
5. [x] logo/banner/flyerテンプレート実装、wordpressアダプタのカテゴリガード
6. [x] サンプル案件（logo）で一気通貫動作確認、ユニットテスト追加
7. [x] README.md／PROGRESS.md更新、コミット

## 完了報告（Doer・2026-08-03）

**実装**：
- `core/types.ts`：`DesignSpec`を`WebsiteDesignSpec`（`kind:"website"`・pages構成）と`GraphicDesignSpec`（`kind:"graphic"`・artboards構成）の判別可能ユニオンに一般化。`ProjectCategory`に`"flyer"`追加。`DesignBrief.outputSizes`（機械可読なサイズ要求）追加。`VerificationCheckId`に`svg-lint`/`multi-size-output`/`brand-consistency`追加。
- `src/templates/outputSizes.ts`（新規）：`resolveOutputSizes`（brief.outputSizes優先、未指定はカテゴリ既定値）・`artboardIdFor`（ラベルのスラグ化）。生成側・検証側が同じ関数を参照することで要求サイズの食い違いを防ぐ。
- `src/generation/graphicPostProcess.ts`（新規）：AI/操作者が書いたSVGから、プレビューHTML・PNGラスタ（Playwrightでアートボード寸法ぴったりにスクリーンショット）・`artboards-manifest.json`を機械的に生成。
- `src/generation/engines/{manualHandoff,claudeApi}.ts`：カテゴリ（website / それ以外）で指示文・responseSchemaを分岐。非Webサイトの実装生成はSVGのみをAIに書かせ、後段でpostProcessGraphicArtifactsを呼ぶ。
- `src/verification/svgLint.ts`（新規）：Playwrightの実DOMParser（`new DOMParser().parseFromString`）でXMLパースエラー・ルート要素・viewBox/width-heightの有無を検証。
- `src/verification/multiSizeOutput.ts`（新規）：`resolveOutputSizes`の要求一覧と、`artboards-manifest.json`＋実ファイルの寸法（image-size）を突き合わせ。
- `src/verification/brandConsistency.ts`（新規）：pngjsでラスタ画像の画素をグリッドサンプリングし、有彩色画素とブランドカラー（brief.brandGuideline.colors）とのRGBユークリッド距離で近似度を実測。
- `src/verification/visualDiff.ts`：単一エントリHTML固定だったものを、ターゲット配列（Webサイト＝ページ1点、グラフィック系＝アートボードごと）を受け取る形に一般化。
- `src/verification/index.ts`：上記チェックの配線、`artboards-manifest.json`の読み込み分岐。
- `src/templates/{logo,banner}/template.ts`を`implemented:true`の実テンプレートに変更、`src/templates/flyer/template.ts`を新規作成（F-602の新規カテゴリパターン）。`src/templates/illustration/`はスタブのまま変更なし。
- `src/adapters/cms/wordpress/`：`category !== "website"`の場合に明示的にエラーを返すガードを追加（`transform.ts`のシグネチャも`WebsiteDesignSpec`に絞り込み）。
- `ai-loop.config.json`／`core/config.ts`：ブランド整合性検証の閾値（`brandColorToleranceDistance`・`brandColorMinCompliantFraction`）を追加。

**動作確認内容（サンプル案件 `sample-logo`・実機確認、モックなし）**：
1. `project:init --template logo`（`brief.outputSizes`でicon-128/icon-512の2サイズを指定）→ `design:generate`（manualHandoff応答待ち→3案のGraphicDesignSpec応答JSONを作成→再実行で永続化）。
2. `design:select`を経ずに`impl:generate`を実行するとエラーで拒否されることを確認（人間チェックポイント維持）。
3. `design:select`後、`impl:generate`でicon-128.svgに意図的な構造不備（viewBox/width/height属性の欠落）を仕込んだv1を作成。
4. `verify`実行 → `svg-lint`が実際に不適合判定（DOMParserでの実検証）。加えて`accessibility`もプレビューHTMLラッパーの`<title>`/`lang`欠落を実検出（AIの生成物ではなく後処理コードの不備と判明し、`graphicPostProcess.ts`の`wrapSvgAsPreviewHtml`を修正）。`multi-size-output`・`brand-consistency`は仕様通り適合。
5. 修正版（v2）でviewBox付与・修正済みラッパーを反映して`impl:generate`再実行 → 前回不適合項目（previousIssues）がv2生成指示に自動で含まれることを確認。
6. `verify`再実行 → 全6項目（svg-lint/accessibility/visual-diff/multi-size-output/brand-consistency/materials-unchanged）が適合、収束（converged）。visual-diffはv1→v2でアートボードごとに実ピクセル比較（100%一致）。
7. `approve`実行 → status: approved。`export --adapter static-html`でSVG/PNG/プレビューHTML/manifestを含むzip書き出しを確認。`export --adapter wordpress`を実行するとカテゴリガードにより明示的なエラーで拒否されることを確認。
8. 別案件（`regression-web`、websiteカテゴリ）でdesign:generate〜verifyまでを実行し、html-lint/css-lint/js-lint/accessibility/responsive/visual-diff/materials-unchangedの全項目がリファクタ後も正常に動作すること（回帰無し）を確認。

**受入条件との対応**：TASK frontmatter記載の受入条件を全項目満たしたと判断。特に「チラシはF-602パターンで新設し出力をデジタル用途に限定」「design:select必須・approve明示操作必須の維持」「svg-lint/multi-size-output/brand-consistencyが実測ベースで機械的に検証」「Webサイトカテゴリに回帰が無い」は上記の通り実機で確認済み。

**設計判断の記録**：
- ロゴ/バナー/チラシの実装生成はAIにSVG（ベクター意匠そのもの）のみを書かせ、PNGラスタライズ・プレビューHTML・マニフェストは`graphicPostProcess.ts`が機械的に生成する方式にした。AIに「PNGも複数解像度で出力して」と自己申告的に任せるのではなく、決定的な後処理にすることで`multi-size-output`・`brand-consistency`が実測できる状態を作った（対立的推論#1・#3）。
- サイズ要求（`brief.outputSizes`）の解決を`resolveOutputSizes()`に一元化し、デザイン生成（アートボード数の決定）と検証（要求サイズとの突き合わせ）が同じ関数を参照するようにした。生成側・検証側で別々に要求を解釈することによる食い違いを防ぐため。
- ブランド整合性検証はデザイン仕様の`colorPalette`（AIの自己申告）をそのまま信じず、ラスタライズ済みPNGの実ピクセルをサンプリングして判定する（対立的推論#2）。
- illustrationは要件定義書ではF-104（Should優先度）だが依頼のスコープ外だったため、登録スタブのまま変更していない。

**次のアクション**：Checker検査（受入条件との3値判定）→ 通れば人間確認。
