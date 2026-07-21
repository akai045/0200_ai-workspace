# 08_Decisions — 意思決定記録（ADR）

## 用途

設計・運用上の重要な意思決定を **ADR（Architecture Decision Record）** として記録する。

- なぜその判断をしたか（背景・選択肢・決定・結果）
- 後から「なぜこうなっているのか」を追える監査性のため

## ルール

- ファイル名：`ADR-NNNN-短い題名.md`（例：`ADR-0001-git-sqlite-separation.md`）
- 確定した決定は書き換えず、覆すときは新しい ADR で「supersedes」する。
- 優先順位（`07_Policies/priority-order.md`）や禁止事項を変える判断は必ずここに残す。
