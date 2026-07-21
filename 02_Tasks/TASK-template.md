---
task_id: TASK-YYYY-NNNN
title: タスクの短い題名
objective: 達成したいことを1〜2文で
project: PROJECT-000
status: todo            # todo|doing|checking|approval|blocked|done
tier: T1                # T0|T1|T2
owner: knowledge-doer   # knowledge-doer|build-doer
checker: checker
auditor:                # T2のときだけ auditor を記入
requires_human_approval: false   # T2は必ず true
inputs:
  - 03_Outputs/PROJECT-000/input-example.md
outputs:
  - 03_Outputs/PROJECT-000/output-example.md
acceptance_criteria:
  - 受入条件1（適合/不適合/判定不能で判定できる粒度で書く）
  - 受入条件2
prohibited:
  - 本番データを変更しない
  - 外部サービスへアップロードしない
max_cost_usd: 3.00
max_attempts: 2
created_at: YYYY-MM-DDTHH:MM:SS+09:00
deadline: YYYY-MM-DDTHH:MM:SS+09:00
---

# 背景
（人間 or Planner が記入）

# 詳細
（補足・制約・参考資料）

# メモ
（作業中の気づき。status はここで動かさず frontmatter で管理する）

<!--
status の書き手ルール（SPEC §4.1）:
- status は frontmatter の値が唯一の真実。
- Doer は doing → checking までしか動かせない。
- checking → approval は Checker、approval → done は人間のみ。
- クラウド Routines は status を一切書き換えない（追記専用）。
- tier が T2 のときは auditor を記入し、requires_human_approval: true にする。
-->
