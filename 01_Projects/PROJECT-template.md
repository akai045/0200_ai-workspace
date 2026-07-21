---
project_id: PROJECT-NNN
title: プロジェクトの短い題名
status: active            # active|done|paused
created_at: YYYY-MM-DDTHH:MM:SS+09:00
---

# 概要
（このプロジェクトが何か、1〜3文で。既存プロジェクトと何が違うか分かるように）

# 目的
- （達成したいこと。箇条書きで2〜4個）

# スコープ / 制約
- やること：
- やらないこと：
- 制約（データの扱い・成果物の置き場所・外部送信禁止 等）：

# 関連タスク
（`[[TASK-YYYY-NNNN]] — 短い説明` の形で追記していく。最初は空でよい）

<!--
プロジェクト登録の作法：
- project_id は既存 01_Projects/PROJECT-*.md の最大連番+1。
- 本文（概要/目的/スコープ）は人間が会話で伝えた内容から Planner/Claude が下書きし、人間が確認・修正する
  （タスクの intake と同じ分担：機械的な採番・frontmatterは軽く済ませ、判断が要る中身は会話から埋める）。
- 本ファイルは優先順位（07_Policies/priority-order.md）で「3. プロジェクト要件」に相当し、個別タスク指示より上位。
- タスクを作ったら、そのタスクの project: フィールドをこの project_id に合わせ、このファイルの「関連タスク」にも追記する。
-->
