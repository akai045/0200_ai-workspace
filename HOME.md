# 🏠 HOME — あなたの視点（承認と進捗）

> **あなたの仕事は2つだけ**（SPEC §4・CLAUDE.md）：
> ① 上の**承認待ち**を片づける（`done` にする／理由を添えて差し戻す）　② **止まっているもの（blocked）**に気づく。
> 下の一覧は Obsidian で開くと**自動で最新化**されます（初回のみ、設定 → コミュニティプラグイン → 制限モードをオフ → **Dataview** をインストールして有効化）。
>
> **リスク凡例**：🔴 T2＝不可逆・外部（Auditor＋人間承認必須）　🟡 T1＝隔離変更（Checker必須）　⚪ T0＝下書き（Checker任意）
>
> **このテンプレートには実タスク・実プロジェクトは含まれていません**（`02_Tasks/TASK-template.md`・`01_Projects/PROJECT-template.md` のみ）。下のブロックは中身が空のまま表示されます。使い始めて `01_Projects/PROJECT-00X.md` と `02_Tasks/TASK-YYYY-NNNN.md` を作ると自動で埋まっていきます。

---

> [!abstract] 🗂 プロジェクト（アクティブ） — まず全体（マクロ）を見る
> ```dataview
> TABLE WITHOUT ID
>   link(file.link, project_id) AS "ID",
>   title AS "プロジェクト"
> FROM "01_Projects"
> WHERE project_id AND status = "active" AND file.name != "PROJECT-template"
> SORT project_id ASC
> ```
> ```dataview
> TABLE WITHOUT ID
>   choice(project = "", "（未紐づけ）", project) AS "プロジェクトID",
>   length(rows) AS "タスク数"
> FROM "02_Tasks"
> WHERE task_id AND file.name != "TASK-template"
> GROUP BY project
> SORT project ASC
> ```
> 下のタスク一覧はすべて、このどれかのプロジェクトに属する（「（未紐づけ）」は単発作業などプロジェクト化していないタスク）。各プロジェクトの背景・目的は `01_Projects/PROJECT-00X.md` を参照。完了・中断したプロジェクトは下の「参照」欄に折りたたみ表示。

---

> [!danger] 🔴 承認待ち — いま、あなたが手を動かすところ
> ```dataview
> TABLE WITHOUT ID
>   link(file.link, task_id) AS "ID",
>   title AS "タスク",
>   choice(project = "", "（未紐づけ）", project) AS "プロジェクト",
>   choice(tier = "T2", "🔴 T2", choice(tier = "T1", "🟡 T1", "⚪ T0")) AS "リスク",
>   choice(deadline AND deadline != "", choice(date(deadline) < date(today), "🔴 期限超過", choice(date(deadline) <= date(today) + dur(1 day), "🟠 今日/明日", dateformat(date(deadline), "MM/dd"))), "—") AS "期限",
>   choice((date(today) - file.mtime) >= dur(3 days), "⚠️ 3日+待機", choice((date(today) - file.mtime) >= dur(1 day), "🔸待機中", "本日")) AS "待機"
> FROM "02_Tasks"
> WHERE task_id AND status = "approval" AND file.name != "TASK-template"
> SORT choice(tier = "T2", 0, choice(tier = "T1", 1, 2)) ASC, choice(deadline AND deadline != "", date(deadline), date(today) + dur(9999 days)) ASC
> ```
> **やること**：内容を確認 → 問題なければ frontmatter の `status` を **`done`** に。差し戻すなら理由を添えて `doing` へ。
> ここが空なら **承認待ちゼロ ＝ あなたの出番なし**。

> [!info] 📊 全体サマリー — ひと目で現在地
> ```dataview
> TABLE WITHOUT ID
>   choice(key = "approval", "🔴 承認待ち", choice(key = "blocked", "⛔ blocked", choice(key = "doing", "🔄 進行中", choice(key = "checking", "🔍 検査中", choice(key = "todo", "🆕 未着手", "✅ 完了"))))) AS "状態",
>   length(rows) AS "件数"
> FROM "02_Tasks"
> WHERE task_id AND file.name != "TASK-template"
> GROUP BY status
> SORT length(rows) DESC
> ```

> [!warning] ⛔ Blocked — 情報・権限・依存の解消待ち
> ```dataview
> TABLE WITHOUT ID
>   link(file.link, task_id) AS "ID",
>   title AS "タスク",
>   choice(project = "", "（未紐づけ）", project) AS "プロジェクト",
>   choice(tier = "T2", "🔴 T2", choice(tier = "T1", "🟡 T1", "⚪ T0")) AS "リスク"
> FROM "02_Tasks"
> WHERE task_id AND status = "blocked" AND file.name != "TASK-template"
> ```
> ここが空なら**止まっているものはありません**。

> [!note] 🔄 進行中 — Doer / Checker が作業中
> ```dataview
> TABLE WITHOUT ID
>   link(file.link, task_id) AS "ID",
>   title AS "タスク",
>   choice(project = "", "（未紐づけ）", project) AS "プロジェクト",
>   status AS "状態",
>   owner AS "担当",
>   dateformat(file.mtime, "MM/dd HH:mm") AS "更新",
>   choice((date(today) - file.mtime) >= dur(3 days), "⚠️ 3日+停滞", choice((date(today) - file.mtime) >= dur(1 day), "🔸経過中", "本日")) AS "停滞"
> FROM "02_Tasks"
> WHERE task_id AND (status = "doing" OR status = "checking") AND file.name != "TASK-template"
> SORT file.mtime ASC
> ```
> **停滞**が⚠️の行は詰まっている兆候（見に行くきっかけ）。一番上＝一番長く動いていないタスク。

---

### 参照（普段は閉じたまま・必要なときだけ開く）

> [!todo]- 🆕 未着手（todo）のバックログ
> ```dataview
> TABLE WITHOUT ID
>   link(file.link, task_id) AS "ID",
>   title AS "タスク",
>   choice(project = "", "（未紐づけ）", project) AS "プロジェクト",
>   choice(tier = "T2", "🔴 T2", choice(tier = "T1", "🟡 T1", "⚪ T0")) AS "リスク",
>   owner AS "担当"
> FROM "02_Tasks"
> WHERE task_id AND status = "todo" AND file.name != "TASK-template"
> SORT task_id ASC
> ```

> [!abstract]- 🗂 完了・中断したプロジェクト
> ```dataview
> TABLE WITHOUT ID
>   link(file.link, project_id) AS "ID",
>   title AS "プロジェクト",
>   choice(status = "done", "✅ 完了", "⏸ 中断") AS "状態"
> FROM "01_Projects"
> WHERE project_id AND status != "active" AND file.name != "PROJECT-template"
> SORT status ASC, project_id ASC
> ```
> プロジェクトを閉じるときは該当 `01_Projects/PROJECT-00X.md` の `status` を `done` または `paused` に変更するだけで、上の「アクティブ」一覧から自動で消え、ここに移る。

> [!abstract]- 🗂 プロジェクト別 全タスク
> ```dataview
> TABLE WITHOUT ID
>   link(file.link, task_id) AS "ID",
>   title AS "タスク",
>   choice(project = "", "（未紐づけ）", project) AS "プロジェクト",
>   status AS "状態",
>   choice(tier = "T2", "🔴 T2", choice(tier = "T1", "🟡 T1", "⚪ T0")) AS "リスク"
> FROM "02_Tasks"
> WHERE task_id AND file.name != "TASK-template"
> SORT project ASC, status ASC
> ```

> [!success]- ✅ 完了（done）直近15件
> ```dataview
> TABLE WITHOUT ID
>   link(file.link, task_id) AS "ID",
>   title AS "タスク",
>   choice(project = "", "（未紐づけ）", project) AS "プロジェクト",
>   dateformat(file.mtime, "MM/dd") AS "完了"
> FROM "02_Tasks"
> WHERE task_id AND status = "done" AND file.name != "TASK-template"
> SORT file.mtime DESC
> LIMIT 15
> ```
> 全件は [02_Tasks](02_Tasks) フォルダを参照。

---

> [!tip] 🔗 クイックリンク
> - 進捗の正本：[PROGRESS.md](PROGRESS.md)
> - 不変条件・ガードレール：[CLAUDE.md](CLAUDE.md)
> - 設計仕様：[SPEC.md](SPEC.md)
> - 規定：[constitution](07_Policies/constitution.md) ／ [優先順位](07_Policies/priority-order.md) ／ [禁止事項](07_Policies/prohibited-actions.md)
> - 意思決定記録：[08_Decisions](08_Decisions/README.md)

> [!info]- ⚙️ 表示がコードのまま／崩れるときは（初回のみ）
> 上の色付きブロックがそのままコード表示になっている場合は Dataview が未導入です。
> Obsidian の 設定 → コミュニティプラグイン → 制限モードをオフ → **Dataview** をインストールして有効化してください。
> ノート間の関連を Graph View に出したい場合は、パス参照ではなく `[[ファイル名]]` 形式のリンクで結びます（必要になったら wikilink 化）。

> [!info]- 🛠 プロジェクトが増えてきたときのカスタマイズ余地
> 上のテーブルは「プロジェクト」列をプレーンな `project` フィールドの値（例：`PROJECT-001`）でそのまま表示している。プロジェクト数が増えてきて絵文字バッジ（例：`choice(project = "PROJECT-001", "📋 タスク管理", ...)`）で見やすくしたくなったら、承認待ち／blocked／進行中／todo／全タスク／完了の6箇所に同じ `choice(...)` を書けば表示だけ切り替えられる（元データである `project` フィールドの値自体は変えなくてよい）。
