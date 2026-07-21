# _catalog — 18役割カタログ（将来の責任分離候補）

> **重要：これは「最初から作るAI社員」ではない。**
> 「将来、責任を分離するための候補カタログ」（SPEC §9）。
> フェーズ1では作らない。まずスキル（`06_Skills/`）として運用し、実測トリガーが出た役割だけ独立エージェントへ昇格させる。

---

## 進化経路

```
スキルとして運用
   ↓ 利用量・リスクが増加（実測）
独立エージェントへ昇格
```

昇格の判断は**実測に基づく**。思いつきで人格を増やさない（原則1・2）。

---

## 昇格の実測トリガー例

| 実測された問題 | 昇格させる役割 |
|----------------|----------------|
| 複数タスクの依存関係が崩れる | Orchestrator |
| コードレビュー精度が低い | QA Engineer |
| セキュリティ見落とし | Security Reviewer |
| 文体が安定しない | Content Editor |
| 業務ルール違反が発生 | Governance Auditor（常設化） |
| UI改善の品質が不足 | UI/UX Designer |

---

## 18役割カタログ

将来の責任分離候補として名前と担当領域を控えておく。**現時点ではいずれも作らない。**

1. **Orchestrator** — タスク分解・依存関係管理・割り当て（現在は人間が担う）
2. **Planner** — 依頼受付時の計画下書き（現在は `planner-prompt.md` で代替）
3. **Requirements Analyst** — 要件整理（現在はスキル `requirements-analysis`）
4. **Researcher** — 調査・情報収集（現在は Knowledge Doer）
5. **Source Verifier** — 出典・根拠検証（現在はスキル `source-verification`）
6. **UI/UX Designer** — UI/UX 設計・改善（現在はスキル `ui-ux-review`）
7. **Software Architect** — システム設計・アーキテクチャ判断
8. **Backend Engineer** — サーバサイド実装（現在は Build Doer）
9. **Frontend Engineer** — フロントエンド実装（現在は Build Doer）
10. **QA Engineer** — テスト設計・品質保証（現在はスキル `qa-testing`）
11. **Security Reviewer** — セキュリティ検査（現在はスキル `security-check`）
12. **Code Reviewer** — コードレビュー（現在は Checker ＋スキル）
13. **Content Editor** — 文体・文章編集
14. **Technical Writer** — ドキュメント作成（現在は Knowledge Doer）
15. **Data Analyst** — データ分析
16. **Governance Auditor** — 規定・工程・権限の監査（現在は Auditor、T2のみ）
17. **Operations Doer** — 定期処理・運用（フェーズ1では作らない。内容に応じて Knowledge/Build を呼ぶ）
18. **Release Manager** — リリース・本番反映の管理（T2、恒久的に人間承認必須）

---

## 注意

- このカタログにある役割を作りたくなっても、**実測トリガーが出るまで作らない**（SPEC §12）。
- 昇格を決めたら意思決定記録（`08_Decisions/`）に ADR を残す。
