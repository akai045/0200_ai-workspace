# 10_Runs — 実行ごとの JSON Lines ログ（追記専用）

## 用途

タスクの**実行結果**を、実行ごとに JSON Lines 形式で追記する。フェーズ1の「実行状態」の扱い方（SQLite の代わり）。

```
10_Runs/TASK-2026-0001/2026-06-26T090000.json   ← 実行結果（追記）
```

## ルール（最重要）

- **追記専用（append-only）**。既存ログを書き換えない。
- **クラウド Routines のレポートもここに新規ファイルとして吐く**。Routine は `02_Tasks/` の status を一切書き換えない（SPEC §4.1）。
- 進行中の状態を `02_Tasks/` の Markdown に頻繁に書き戻さない。実行の詳細はここに残す。

## 記録する内容の例

- 実行日時、担当エージェント、使用スキル
- 入力・出力パス
- Checker/Auditor の判定（適合/不適合/判定不能）
- 概算コスト、試行回数、異常フラグ（失敗はステータスではなくここに記録）

## 記録フィールドの慣習（フェーズ2 P2-6 の最小形）

> SQLite・集計画面はゲート項目（SPEC §12）。まずは**新インフラなしの記録慣習**だけ先に固定する。集計・可視化はフェーズ2着手計画を作ってから承認後に進める。

1行1イベントの JSON（JSON Lines）。推奨キー：

| キー | 意味 |
|------|------|
| `ts` | ISO8601（+09:00）のタイムスタンプ |
| `task_id` | 対象タスク |
| `event` | `doer_run` / `checker_run` / `auditor_run` など |
| `role` | 実行主体（knowledge-doer / build-doer / checker / auditor） |
| `tier` | T0 / T1 / T2 |
| `skills` | 使用スキルの配列 |
| `attempt` | 試行回数（`max_attempts` と照合） |
| `inputs` / `outputs` | 入出力パスの配列 |
| `est_cost_usd` | 概算コスト（`max_cost_usd` と照合。§8 指標の素材） |
| `anomaly_flags` | 異常フラグの配列（失敗はここに記録） |
| `status_transition` | `{from, to, by}`（§4.1 の書き手ルールを追跡） |
