# -*- coding: utf-8 -*-
"""日次ブリーフ生成（PLAN-phase2 案B）.

02_Tasks/*.md の frontmatter を集計し、09_Reports/daily/YYYY-MM-DD.md を生成する。
- 依存ライブラリなし（frontmatterを軽量パース）
- 数値は必ずファイルから集計（手入力しない）
- ローカル完結（ADR-0001）。将来は無人LOOP(ADR-0005)から呼べる。

使い方: python tools/gen_daily_brief.py [YYYY-MM-DD]
        （日付を省略すると本日。テストや再生成用に日付指定可）
"""
import os, re, sys, glob
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TASKS = os.path.join(ROOT, "02_Tasks")
OUTDIR = os.path.join(ROOT, "09_Reports", "daily")

FM_KEYS = ("task_id", "title", "status", "tier", "owner", "project", "deadline")

def parse_frontmatter(path):
    """先頭の --- ... --- からトップレベルのスカラーkeyを軽量抽出。"""
    with open(path, encoding="utf-8") as f:
        text = f.read()
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if not m:
        return {}
    fm = {}
    for line in m.group(1).splitlines():
        km = re.match(r"^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$", line)
        if not km:
            continue
        key, val = km.group(1), km.group(2)
        if key not in FM_KEYS:
            continue
        val = re.sub(r"\s+#.*$", "", val).strip()          # インラインコメント除去
        val = val.strip('"').strip("'").strip()             # 引用符除去
        fm[key] = val
    return fm

def load_tasks():
    tasks = []
    for p in sorted(glob.glob(os.path.join(TASKS, "*.md"))):
        name = os.path.basename(p)
        if name == "TASK-template.md":
            continue
        fm = parse_frontmatter(p)
        tid = fm.get("task_id", "")
        if not re.match(r"^TASK-\d{4}-\d{4}$", tid):        # 実タスクのみ（READMEや雛形を除外）
            continue
        fm["_file"] = name
        tasks.append(fm)
    return tasks

def line(t):
    d = t.get("deadline", "")
    d = d[:10] if d else "—"
    return "| %s | %s | %s | %s | %s |" % (
        t.get("task_id", ""), t.get("title", ""), t.get("project", "") or "—",
        t.get("tier", "") or "—", d)

def section(title, rows, cols="タスクID | タイトル | PJ | T | 期限"):
    if not rows:
        return "### %s\n\n（なし）\n" % title
    head = "| %s |" % cols.replace(" | ", " | ")
    sep = "|" + "|".join(["---"] * (cols.count("|") + 1)) + "|"
    return "### %s（%d件）\n\n%s\n%s\n%s\n" % (title, len(rows), head, sep, "\n".join(rows))

def main():
    date = sys.argv[1] if len(sys.argv) > 1 else datetime.now().strftime("%Y-%m-%d")
    tasks = load_tasks()
    by = {}
    for t in tasks:
        by.setdefault(t.get("status", "?"), []).append(t)
    order = ["approval", "doing", "checking", "blocked", "todo", "done"]
    counts = {s: len(by.get(s, [])) for s in order}

    L = []
    L.append("# 日次ブリーフ %s" % date)
    L.append("")
    L.append("> 今日の状況スナップショット（自動生成）。**ライブ表示は `HOME.md`（Obsidian）**、"
             "本ファイルは日付で固定した記録。数値は `02_Tasks/` の frontmatter から集計。")
    L.append("")
    L.append("## サマリ（全%d件）" % len(tasks))
    L.append("")
    L.append("| 承認待ち | 進行中(doing) | 検査中(checking) | blocked | 未着手 | 完了 |")
    L.append("|---|---|---|---|---|---|")
    L.append("| %d | %d | %d | %d | %d | %d |" % (counts["approval"], counts["doing"],
             counts["checking"], counts["blocked"], counts["todo"], counts["done"]))
    L.append("")
    L.append("## ⚠️ あなたの承認待ち（最優先アクション）")
    L.append("")
    ap = sorted(by.get("approval", []), key=lambda t: t.get("deadline", "9999"))
    L.append(section("承認待ち", [line(t) for t in ap]) if ap else "（なし）")
    L.append("")
    L.append("## 🔄 進行中 / 検査中")
    L.append("")
    prog = by.get("doing", []) + by.get("checking", [])
    L.append(section("進行中・検査中", [line(t) for t in prog]) if prog else "（なし）")
    L.append("")
    L.append("## ⛔ Blocked")
    L.append("")
    bl = by.get("blocked", [])
    L.append(section("blocked", [line(t) for t in bl]) if bl else "（なし）")
    L.append("")
    L.append("## ✅ 完了（done）")
    L.append("")
    dn = by.get("done", [])
    L.append(section("完了", [line(t) for t in dn]) if dn else "（なし）")
    L.append("")
    L.append("---")
    L.append("_生成: tools/gen_daily_brief.py ・ %s_" % datetime.now().strftime("%Y-%m-%d %H:%M"))

    os.makedirs(OUTDIR, exist_ok=True)
    out = os.path.join(OUTDIR, "%s.md" % date)
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    print("wrote:", out)
    print("counts:", counts, "total:", len(tasks))

if __name__ == "__main__":
    main()
