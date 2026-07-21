# tools — 再利用可能なユーティリティ

## new_task.ps1 — 自由記述をタスク形式へ変換（機械部分）

「人間が考えた作業」を `02_Tasks/` の frontmatter 形式へ整える手間を減らす。**面倒な機械部分（ID採番・日付・enum記入）を決定論的に片付け**、正しい形式の雛形を1枚作る。判断が要る中身（`acceptance_criteria` 等）は空欄で残し、人間 or Planner（`05_Agents/planner-prompt.md` の intake 手順）が埋める。

```
powershell -File tools/new_task.ps1 -Title "<短い題名>" -Tier <T0|T1|T2> -Owner <knowledge-doer|build-doer> [-Auto] [-Draft] [-Objective "<1〜2文>"]
```

- 次のID（全タスク横断で最大連番+1）を自動採番し `02_Tasks/TASK-YYYY-NNNN.md` を作成。`created_at` も記入。
- `-Auto` で `auto: true`（無人LOOPの着手対象・T0/T1のみ）。既定 false。
- `-Draft` で `auto: false`・`draft: true`（**特殊ケース専用**：分解した複数タスクを無人LOOPへそのまま一括投入したい、という明示的な要求がある時だけ使う。`-Auto`と同時指定は不可）。無人LOOPは`draft:true`を多層防御で除外する（`loop_tick.ps1`が`auto:true`でも見る）。人間との壁打ちで結晶化したら`draft: false`に変更する。詳細は`06_Skills/task-decomposition`パートA。**通常の複数タスク分解では使わない**——会話でそのまま完成タスクを書く方が手順が少なく、指示の弱さも会話自体が補う。
- 出力パスを表示。あとは `objective`/`acceptance_criteria`/`inputs`/`outputs`/`prohibited` を埋めるだけ（自由記述からの変換は planner-prompt.md 参照）。

> 使い分け：**形式づくり＝このスクリプト**、**中身の変換＝Planner**。「自由記述→完成タスク」を一気にやりたいときは Claude に「この作業をタスク化して: 〜」と頼めば、Planner手順に沿ってスクリプト実行＋空欄補完まで行う。「大きな案件を分解してタスク登録して」と頼んでも、既定では**会話の中で完成タスクを直接複数作成する**（`-Draft`は使わない）。「無人LOOPに一括で流したい」と明示すれば`-Draft`のスーパーバイザー方式になる。

## loop_tick.ps1 — 無人LOOP の1 tick（ADR-0005）

**人間が気づいた時に手で叩く**短命プロセス。1回だけ「続きを1歩」進める。会話文脈を持たず、状態はすべてファイル（`PROGRESS.md` / タスクのメモ / `10_Runs`）から再構成する（ADR-0004）。

> ⚠️ タスクスケジューラ等による**無人自動実行はしない方針**（理由：①アプリを閉じても動く＝気づかないうちに動く制御感の喪失 ②定期確認運用なら手動トリガーでも価値は同等 ③ヘッドレス実行の権限設定には別のリスクが伴う）。以下は**手動トリガー**としての使い方。

**処理順**：停止スイッチ → コスト歯止め（当日回数）→ PIDロック（生死判定・stale自動奪取）→ dirty-tree defer（追跡ファイルに未コミット変更があれば見送り）→ 対象判定（doing/checking の継続、または `auto:true` の todo(T0/T1)）→ 起動 → 記録＆ロック解放。異常時も `finally` で必ずロック解放。

```powershell
# ① まず必ず dry-run で土台を確認（claude を起動しない）
powershell -NoProfile -ExecutionPolicy Bypass -File tools\loop_tick.ps1 -DryRun
# ② 実起動（人間が①で挙動を確認した後）
powershell -NoProfile -ExecutionPolicy Bypass -File tools\loop_tick.ps1
```

**状態ファイル（すべて `.claude/`・gitignore済・可変状態=正本ではない / SPEC §3.6）**
- `loop.disabled` … 空ファイルを置くと tick は即終了（**即時停止スイッチ**）。集中作業中はこれを置く。
- `loop.lock` … PID方式のロック（単一書き手保証・SPEC §4.1）。
- `loop_state.json` … 当日の実行回数・累計分（コスト歯止め）。
- ログ：`10_Runs/_loop/<日付>.jsonl`（1 tick 1行・追記専用・ADR-0005 §8）。outcome 例：`disabled`/`busy`/`dirty-defer`/`idle`/`worked`/`limit-hit`/`budget-reached`/`error`。

**絶対にやらないこと（不変・ADR-0005 §2）**：T2実行 / `approval→done`（人間専用）/ §12ゲート開放 / 保護ブランチpush / 外部送信 / 削除。再開プロンプト（`loop_resume_prompt.txt`）側でも禁止を明記。

### ダブルクリック起動

コマンド入力なしで実行したい場合は `tools/loop_tick.cmd` を使う。中身は環境非依存の薄いランチャーで、内部で `tools/loop_tick_launch.ps1` → `tools/loop_tick.ps1` の順に呼ぶ。

1. `tools/loop_tick.cmd` へのショートカット（.lnk）をデスクトップに作る（エクスプローラーで右クリック→ショートカットの作成→デスクトップへ移動、または「送る」）。
2. アイコンをダブルクリックすると、実行状況（開始/終了メッセージ）を表示したままウィンドウが開き、終了後は `pause` で結果を読める（何かキーを押すと閉じる）。
3. **各ユーザーの実行環境（WSL側の`claude`パス等）が異なる場合**は、`.claude/loop_local.example.ps1` を同じフォルダに `.claude/loop_local.ps1`（Git管理外）としてコピーし、自分の値に書き換える。無ければ `loop_tick.ps1` の既定値のまま動く。

WSLの利用を前提とした構成（現状はWSL以外の実行環境は未対応）。

タスクを無人着手の対象にするには、そのタスク frontmatter に `auto: true`（T0/T1のみ・既定false）。

## pptx_layout_check.py

PowerPoint（.pptx）の**レイアウト自動検査**。図形の座標から、はみ出し・重なり・テキスト溢れを機械的に検出する（Office 不要・どのPCでも実行可）。

```bash
python tools/pptx_layout_check.py <file.pptx>        # 人が読む出力
python tools/pptx_layout_check.py <file.pptx> --json # 機械可読
```

検査項目：
1. **off-slide**：図形がスライド枠外へはみ出していないか
2. **overlap**：画像とテキストボックスが重なっていないか
3. **text-overflow**：テキスト量がボックス高さを超える可能性（推定・警告）

終了コード：問題なし=0 / 検出あり=1 / エラー=2。CI やビルド末尾に組み込んで自動ゲート化できる。
`import` して `check(path)` を呼ぶと `{"slides":N,"warnings":[...]}` を返す。

> 用途：経営報告 PPTX 等の成果物で「文字がページ外に飛び出す／グラフと文字が重なる」事故を、目視前に自動検知する（qa-testing スキルの一部）。深い視覚確認が要る場合は PowerPoint COM で各スライドを PNG 化して目視する。

## claude_usage_extract.py — Claude Code 月次利用レポートの素材抽出

ローカルの全 Claude Code プロジェクト（`~/.claude/projects/*`）のセッション履歴から、月次利用レポートの**機械的な素材だけ**を抽出する（依存なし・ローカル完結・クラウド不使用）。

```bash
python tools/claude_usage_extract.py 2026-06   # 対象月=2026-06、前月=2026-05を自動対象化
python tools/claude_usage_extract.py           # 引数省略=今月
```

- 出力（UTF-8）：OSの一時領域 `<TEMP>/claude_usage_work/<月>_sessions.txt`（人が読む／AIが分類）と `<月>_sessions.json`（機械可読）。リポジトリは汚さない。`--outdir` で変更可。
- 1 セッション = 1 会話 として集計。各セッションの初回リクエスト・メッセージ数・文字量・規模ヒント(size_hint)・continued フラグを整理する。
- 日本語コンソールの文字化けを避けるため、stdout は ASCII の要約のみ。中身は出力 TXT を Read して確認する。

### 2ステップ運用（重要）

レポートの**内容・書式は変わっていく前提**なので、役割を分離している：

1. **抽出（決定論・不変）** = このスクリプト。取れる数値・事実だけを出す。
2. **分類・時間推定・業務インパクト・書式（AI判断・都度変更可）** = `tools/claude_usage_report_template.md`（書式の唯一の正本）を使い、AI が TXT を読んで埋める。

書式や項目を変えたいときは**テンプレートを編集するだけ**（スクリプトは触らない）。

分類9区分：文書作成／開発／データ分析／アイデア創出／学習調査／翻訳校正／業務効率化／コミュニケーション／その他。
時間基準：簡単5-10／通常10-20／複雑20-30／長文・分析30-60／特大60分超（size_hint は目安、最終判断は AI）。

完成レポートの保存先：`09_Reports/monthly/<YYYY-MM>_Claude利用レポート.md`。

> 注意：claude.ai の会話（`recent_chats`）は Claude Code から取得できないため対象外。ローカルの Claude Code セッションのみを集計する。
