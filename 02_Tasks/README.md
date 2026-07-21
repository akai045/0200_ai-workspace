# 02_Tasks — タスク定義（正本）

## 用途

タスクの**正本**を置く。1タスク＝1 Markdown ファイル。

- ファイル名：`TASK-YYYY-NNNN.md`（例：`TASK-2026-0001.md`）
- スキーマは `TASK-template.md` を参照（SPEC §6）
- **`status` は frontmatter の値が唯一の真実**

## status 書き手ルール（最重要・SPEC §4.1）

`status` を書き換えられる主体は **ローカルの人間 / Claude Code だけ**。

- Doer が動かせるのは `doing → checking` まで
- `checking → approval` は Checker（および承認ルール）
- `approval → done` は人間のみ
- **クラウド Routines は status を一切書き換えない（追記専用）**

## 進行中の状態の扱い

- 作業中の気づきは本文の「メモ」に書く。status は frontmatter でのみ動かす。
- 実行結果は `10_Runs/TASK-XXXX/` に JSON Lines ログとして追記する。
- 進行中状態を Git に頻繁に書き戻さない（差分の氾濫を防ぐ）。タスクが一段落したときだけ status を更新する。
