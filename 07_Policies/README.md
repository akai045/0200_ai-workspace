# 07_Policies — 共通規定（constitution・優先順位・禁止事項）

## 用途

システム全体に適用される共通規定を置く。優先順位では上位（`constitution` は 2 番目）。

## ファイル

| ファイル | 内容 |
|----------|------|
| `constitution.md` | 4制約＋7原則の要約（共通規定の背骨） |
| `priority-order.md` | 指示が矛盾したときの優先順位（SPEC §4.3） |
| `prohibited-actions.md` | 共通禁止事項 |

## ルール

- ここの規定は個別タスク指示・エージェント固有マニュアルより上位（`priority-order.md` 参照）。
- 低い階層が高い階層を上書きできない。
- 変更は意思決定記録（`08_Decisions/`）に ADR として残すこと。
