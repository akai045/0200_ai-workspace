# PROGRESS.md — 進捗・WBS・ロードマップ（正本）

> **このファイルの役割**：全体のどこまで出来ているかを1か所で把握し、**セッションを跨いでも続きから再開できる**ようにする進捗の正本。
> 作業を一段落させるたびにここを更新する。詳細な設計は `SPEC.md`、不変条件は `CLAUDE.md`、方針変更は `08_Decisions/`（ADR）を正とする。

- 最終更新: 2026-08-03
- 現在地: **P1-V完了（PROJECT-001、approval待ち・変更なし）に加え、PROJECT-002「AI LOOPエンジン開発」はTASK-2026-0002（Phase1・Webサイト）・TASK-2026-0003（Phase2・ロゴ／バナー／チラシ）が人間確認OKでstatus: done。続けてTASK-2026-0004（イラスト）を実装完了（E-17）。これで要件定義書のデザインカテゴリ（Web/ロゴ/イラスト/バナー）は全て実働する状態。詳細は [[ADR-0007-ai-loop-engine-build]]。既知の未実装範囲（CMSライブ投入・EPS/Lottie/HTML5バナー等の拡張出力形式・出力形式プラグイン・コスト計測等）はREADME.mdの対応表参照。**
- 直近の人間アクション：①`02_Tasks/TASK-2026-0001-watashiwa-lulu-web.md` と `03_Outputs/PROJECT-001-watashiwa-lulu/` を確認し、問題なければ status を `approval` → `done` に変更する。②TASK-2026-0004をCheckerで検査してもらい（受入条件との3値判定）、通れば人間が完了確認する。

---

## 凡例

| 記号 | 意味 |
|------|------|
| ✅ | 完了（done） |
| 🔄 | 作業中（doing） |
| ⬜ | 未着手（todo） |
| 🔒 | ゲート：明示承認が出るまで着手禁止（SPEC §12） |
| ⏸ | 保留・依存待ち（blocked） |

---

## WBS（Work Breakdown Structure）

### フェーズ1：最小ループ（SPEC §10・§11） — ✅ スキャフォールド完了／動作確認は未実施

| ID | 成果物 | 状態 | 依存 | 実体 / メモ |
|----|--------|------|------|-------------|
| P1-1 | ディレクトリ構造（§5）＋各フォルダ README | ✅ | — | 12フォルダ、各 `README.md` |
| P1-2 | 07_Policies（constitution / priority-order / prohibited-actions） | ✅ | P1-1 | `07_Policies/` |
| P1-3 | 05_Agents（knowledge-doer / build-doer / checker / auditor / planner-prompt / _catalog） | ✅ | P1-1 | `05_Agents/` |
| P1-4 | 06_Skills 初期7スキルの雛形 | ✅ | P1-1 | `06_Skills/*/SKILL.md`（中身は使うときに育てる＝原則7） |
| P1-5 | 02_Tasks（TASK-template） | ✅ | P1-1 | `02_Tasks/TASK-template.md` |
| P1-6 | CLAUDE.md（不変条件・優先順位・ティア別フロー要約） | ✅ | P1-2,P1-3 | ルート `CLAUDE.md` |
| P1-7 | .gitignore / .gitattributes | ✅ | — | ルート |
| P1-8 | ルート README（全体構造＋使い方1ページ） | ✅ | P1-1〜P1-7 | ルート `README.md` |
| P1-A | ADR-0001：クラウド不採用・ローカル完結 | ✅ | — | `08_Decisions/ADR-0001-...md` |
| P1-V | **最初のタスクでの動作確認**（Knowledge/Build Doer → Checker → 人間） | ✅ | 全P1 | PROJECT-001／TASK-2026-0001（わたしはルル Webサイト制作）で実施。status: approval（人間承認待ち） |

---

### フェーズ2：スキルとタスク画面（SPEC §10） — 🔒 未着手（ゲート・要人間承認）

> §12 のゲート項目（SQLite・自作画面等）は明示承認まで着手禁止。着手時は ADR を残す。原則7（実測した必要が出てから育てる）に従い、まずはP2-1をご自身のタスクで進めることを推奨。

| ID | 項目 | 状態 | メモ |
|----|------|------|------|
| P2-1 | 使ったスキルの中身充実（実測ドリブン） | ⬜ | 実際に使ったスキルだけ育てる。全部を先に埋めない |
| P2-6 | コスト記録の慣習（JSONL・新インフラなし） | ⬜ | `10_Runs/README.md` に記録フィールドの型は定義済み |
| P2-2 | SQLite（runtime.db）で実行状態管理 | 🔒 | §12。JSONL 破綻の実測が出てから（ローカル限定・§3.6） |
| P2-3 | 朝のブリーフ | 🔒 | まず `09_Reports/` のMarkdown最小形を検討 |
| P2-4 | 承認キュー | 🔒 | まず `HOME.md`（Obsidian+Dataview）で足りるか確認 |
| P2-5 | 実行/停止ボタン | 🔒 | UI。最後でよい |
| P2-7 | 「静かに壊れる」監視指標の計測開始（§8） | 🔒 | P2-6の記録が貯まってから |

---

### フェーズ3：低リスク自動化（SPEC §10） — 🔒 未着手（ゲート）

> **ADR-0001 により、自動化は「ローカルのスケジューラ／手動実行」で実現する。クラウド Routines は不採用。**

| ID | 項目 | 状態 |
|----|------|------|
| P3-1 | タスク整理の自動化 | 🔒 |
| P3-2 | リンク切れ検査 | 🔒 |
| P3-3 | テスト実行 | 🔒 |
| P3-4 | Markdown 整形 | 🔒 |
| P3-5 | 朝のブリーフ生成 | 🔒 |
| P3-6 | スケジューラ導入（ローカルのみ） | 🔒 |

---

### フェーズ4：必要な役割だけ分離（SPEC §9・§10） — 🔒 未着手（ゲート・実測トリガー後）

> §9 の**実測トリガー**が出た領域だけ、`05_Agents/_catalog.md` の役割を独立エージェントへ昇格。

| ID | 項目 | 昇格の実測トリガー |
|----|------|-------------------|
| P4-1 | Orchestrator | 複数タスクの依存関係が崩れる |
| P4-2 | QA Engineer | コードレビュー精度が低い |
| P4-3 | Security Reviewer | セキュリティ見落とし |
| P4-4 | Content Editor | 文体が安定しない |
| P4-5 | Governance Auditor（常設化） | 業務ルール違反が発生 |
| P4-6 | UI/UX Designer | UI改善の品質が不足 |

---

### PROJECT-002：AI LOOPエンジン開発（要件定義書v1.1準拠） — 🔄 実装中

> Vault自身の運用管理（P1〜P4のフェーズゲート）とは別の切り分け。詳細は [[ADR-0007-ai-loop-engine-build]]。Phase1（Webサイト向けコアループ）はTASK-2026-0002、Phase2（ロゴ／バナー／チラシ向けコアループ）はTASK-2026-0003、イラストはTASK-2026-0004で実装した。要件定義書のデザインカテゴリ（Web/ロゴ/イラスト/バナー）は全て実働する。CMSライブ投入・拡張出力形式（EPS/Lottie/HTML5バナー等）は引き続きレジストリ（拡張点）のみ／未実装。

| ID | 成果物 | 状態 | メモ |
|----|--------|------|------|
| E-1 | ガバナンス文書（ADR-0007／PROJECT-002／TASK-2026-0002） | ✅ | |
| E-2 | `ai-loop-engine/` スキャフォールド（package.json/tsconfig/config/README） | ✅ | |
| E-3 | core/types + ファイルベースJSONストア（版管理） | ✅ | |
| E-4 | templates registry + website テンプレート + ロゴ/イラスト/バナー登録スタブ | ✅ | |
| E-5 | materials ledger（支給素材台帳・固定フラグ・過不足判定） | ✅ | |
| E-6 | generation engines（design/impl・manualHandoff/claudeApi） | ✅ | |
| E-7 | verification engine（lint/a11y/responsive/visualDiff/materialsUnchanged/report） | ✅ | |
| E-8 | orchestrator（収束判定・人間チェックポイント） | ✅ | design:select必須・approve明示操作必須を実装 |
| E-9 | output/CMSアダプタ（staticHtml／wordpress）+ レジストリ | ✅ | WordPress以外（microCMS/Shopify/Movable Type）は登録スタブのみ |
| E-10 | CLI | ✅ | project:init〜approveの9コマンド |
| E-11 | サンプル案件での一気通貫動作確認＋ユニットテスト | ✅ | 意図的なlintエラー（重複id）→不適合→修正→適合の反復を実機確認。node --test 17件通過。TASK-2026-0002はここで人間確認OK・status: done |
| E-12 | core/types.tsのDesignSpec判別可能ユニオン化（WebsiteDesignSpec/GraphicDesignSpec）＋flyerカテゴリ追加 | ✅ | TASK-2026-0003 |
| E-13 | outputSizes解決（brief.outputSizes／カテゴリ既定値）＋graphicPostProcess（SVG→PNGラスタライズ・プレビューHTML・artboards-manifest.json） | ✅ | AIが書くのはSVGのみ、ラスタ化は機械的処理 |
| E-14 | 新規検証チェック（svg-lint／multi-size-output／brand-consistency）＋visualDiffのアートボード複数対応 | ✅ | svg-lintは実DOMParser、brand-consistencyはpngjsで実ピクセルサンプリング |
| E-15 | logo/banner/flyerテンプレート実装＋wordpressアダプタのカテゴリガード | ✅ | チラシは要件定義書に無いカテゴリをF-602パターンで新設（デジタル用途限定・4.2の対象外事項を明記） |
| E-16 | サンプル案件（logoカテゴリ）での一気通貫動作確認＋ユニットテスト＋Webサイト回帰確認 | ✅ | SVG構造不備（viewBox欠落）→不適合→修正→適合の反復を実機確認。node --test 31件通過（新規14件）。Webサイトカテゴリの回帰無しを別案件で確認。TASK-2026-0003はここで人間確認OK・status: done |
| E-17 | illustrationテンプレート実装（TASK-2026-0004） | ✅ | TASK-2026-0003の共通基盤（GraphicDesignSpec/graphicPostProcess/検証チェック）をテンプレート追加のみで流用（F-601/602）。サンプル案件でブランド整合性不適合（オフブランド配色）→修正→適合の反復を実機確認。Lottieは拡張出力形式のため未実装 |

---

## 再開のしかた（次セッションの起点）

1. このファイル冒頭の「現在地」を読む。
2. 直近の 🔄 / ⬜ / 🔒 を確認する。
3. 🔒 のフェーズに進むには**人間の明示承認**が要る（SPEC §12）。承認を得たら該当行を ⬜→🔄 にし、着手する。
4. 一段落したら状態記号・「最終更新」・必要なら「現在地」を更新してコミットする。

---

## 変更ログ（このファイルの更新履歴）

| 日付 | 更新内容 |
|------|----------|
| （配布日） | テンプレートとして配布。フェーズ1のスキャフォールドのみ、実タスク・実行ログは含まない。 |
| 2026-07-21 | P1-V実施。PROJECT-001／TASK-2026-0001「わたしはルル」Webサイト制作（ロゴ／WPテンプレート／HTML）でDoer→Checkerループを実行、status: approval。 |
| 2026-07-21 | TASK-2026-0001に改修依頼（レスポンシブ・ハンバーガーメニュー）。status: doing→Checker再検証→approval。差し戻し発生時のDoer→Checkerループも動作確認できた。 |
| 2026-08-03 | AI_LOOP要件定義書v1.1を受け、PROJECT-002/TASK-2026-0002を起票。ADR-0007でVault運用ゲートとの切り分けを明記し、`ai-loop-engine/`の本格開発に着手。 |
| 2026-08-03 | ai-loop-engine E-3〜E-11を実装完了。orchestrator（人間チェックポイント2箇所）・adapters（static-html/wordpress）・CLI（9コマンド）・ユニットテスト（17件）を追加し、サンプル案件で一気通貫動作（不適合→修正→適合の反復含む）を実機確認。次はChecker検査待ち。 |
