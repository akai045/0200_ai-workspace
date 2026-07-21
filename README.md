# AI Workspace（フェーズ1・テンプレート）

Obsidian Vault ＝ Git リポジトリで動く、最小の「人間＋AIの作業ループ」。
設計の正典は [`SPEC.md`](SPEC.md)。常時参照する不変条件の要約は [`CLAUDE.md`](CLAUDE.md)。**進捗・WBS・次にやることは [`PROGRESS.md`](PROGRESS.md)**（セッションを跨ぐ再開の起点）。
**このフォルダをそのまま受け取った方は、まず [`ONBOARDING.md`](ONBOARDING.md) を読んでください。**

> **目的**：4制約（①品質 ②コスト ③人間の関与を1日20〜30分以内 ④信頼性・監査性）を同時に満たしながら成果量を増やすこと。「24時間自律AI組織」を作ることではない。

---

## ディレクトリ構造

| フォルダ | 用途 |
|----------|------|
| `00_Inbox/` | 未整理の依頼 |
| `01_Projects/` | プロジェクト文脈 |
| `02_Tasks/` | **タスク定義（正本）**。`status` は frontmatter が唯一の真実 |
| `03_Outputs/` | 成果物 |
| `04_Approvals/` | 人間承認記録（特に T2） |
| `05_Agents/` | エージェント定義（Doer/Checker/Auditor/Planner ＋ 18役割カタログ） |
| `06_Skills/` | 着脱式スキル（初期7個。中身は使うときに育てる） |
| `07_Policies/` | 共通規定（constitution・優先順位・禁止事項） |
| `08_Decisions/` | 意思決定記録（ADR） |
| `09_Reports/` | 日次ブリーフ等（フェーズ1は手動） |
| `10_Runs/` | 実行ごとの JSON Lines ログ（**追記専用**） |
| `99_Archive/` | アーカイブ |
| `CLAUDE.md` | 不変条件・優先順位・ティア別フローの要約（常時文脈） |
| `SPEC.md` | 設計仕様書（正典） |

各フォルダに用途を書いた `README.md` がある。**このテンプレートには実タスク・実プロジェクトは含まれていません**（`02_Tasks/TASK-template.md` のみ）。

---

## 3つの不変条件（必ず守る）

1. **status の書き手は1つ**：Doer は `doing → checking`、Checker は `checking → approval`、人間のみ `approval → done`。**Routines は status を書き換えない（追記専用）**。
2. **優先順位**：法令 > constitution > プロジェクト要件 > タスク指示 > エージェント > 過去事例 > AI推測。低い階層は高い階層を上書きできない。
3. **CheckerとAuditorは別素材・別角度**：Checker=成果物 vs 受入条件／Auditor=ログ・承認記録 vs 工程・権限・規定・コスト。

---

## リスクティア

| ティア | 検査フロー |
|--------|-----------|
| **T0** 下書き | Doer → scratch出力（Checker任意） |
| **T1** 隔離変更 | Doer → **Checker必須** → 人間マージ |
| **T2** 不可逆・外部 | Doer → Checker → **Auditor** → **人間承認** → 実行（Routines自律実行は恒久禁止） |

---

## 使い方（1ページ）

1. **依頼を入れる**：思いついた依頼を `00_Inbox/` に置く、またはAIに直接話しかける。
2. **タスク化する**：`05_Agents/planner-prompt.md` のテンプレートで下書きを作り、**人間が確認**して `02_Tasks/TASK-YYYY-NNNN.md` を確定（スキーマは `02_Tasks/TASK-template.md`）。ティアを1つ付ける。
3. **実行する（Doer）**：T0/T1 なら `knowledge-doer` または `build-doer` を起動。必要なスキル（`06_Skills/`）を読み込ませる。成果物は `03_Outputs/<PROJECT>/` へ。実行結果は `10_Runs/TASK-XXXX/` に JSON Lines で追記。Doer は status を `doing → checking` まで動かす。
4. **検査する（Checker）**：`checker` が成果物 vs 受入条件を3値判定。合格なら `checking → approval`、不合格は理由を添えて差し戻し。
5. **受け入れる（人間）**：人間が `approval → done`。T2 の場合はここで承認記録を `04_Approvals/` に残し、その前に `auditor` を通す。

> **フェーズ1ではやらないこと**：SQLite/管理画面（フェーズ2）、夜間自動実行・自動修復（フェーズ3）、専門エージェント各種（フェーズ4）、8個目以降のスキル。詳細は `SPEC.md` §12。

### クラウド Routines は不採用（ADR-0001）

このワークスペースの方針として、**AI LOOP 本体は最終フェーズに至ってもクラウドを利用しない**（`08_Decisions/ADR-0001-no-cloud-local-only.md`）。

- SPEC.md のクラウド Routines 記述（§3.7、§11 末尾の任意 Routine、§10 フェーズ3）は、この ADR により**不採用**として読み替える。
- **自動化 ≠ クラウド**。将来の自動化（タスク整理・リンク検査・ブリーフ生成など）は**ローカルのスケジューラ／手動実行**で実現する。

---

## 最初の一歩

このテンプレートには動作確認用のサンプルタスクを含めていません。まずは実際にやりたい依頼を1つ、AIに話しかけるかタスク化してください。T0（下書き・調査）から始めるのが安全です。うまく一巡できたら、その経験を `PROGRESS.md` に記録していきましょう。
