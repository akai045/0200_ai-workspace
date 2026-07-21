#!/usr/bin/env python3
"""Claude Code 月次利用レポート — 決定論的な素材抽出スクリプト。

このスクリプトは「機械的に取れる部分だけ」を担当する:
  - ローカルの全 Claude Code プロジェクト（~/.claude/projects/*）の
    セッション(.jsonl)を走査
  - 対象月と前月に「開始」したセッションを抽出
  - 各セッションの初回リクエスト・メッセージ数・文字量・規模ヒントを整理
  - UTF-8 の sessions.txt / sessions.json を出力

カテゴリ分類・利用時間推定・業務インパクト（A/B/C）は AI 判断で行う。
レポートの書式は tools/claude_usage_report_template.md（編集可）を使う。
これらは意図的にコード化していない（レポート内容が変わっても本スクリプトは不変）。

使い方:
    python tools/claude_usage_extract.py 2026-06
    python tools/claude_usage_extract.py            # 引数省略 = 今月
    python tools/claude_usage_extract.py 2026-06 --projects-dir <path> --outdir <path>

依存なし・ローカル完結（クラウド不使用）。
"""
from __future__ import annotations

import argparse
import datetime as _dt
import glob
import json
import os
import re
import sys
import tempfile
from collections import Counter, defaultdict

TARGET_MONTHS_HINT = "1 セッション = 1 会話 として集計する"


def prev_month(ym: str) -> str:
    """'2026-06' -> '2026-05'"""
    y, m = (int(x) for x in ym.split("-"))
    m -= 1
    if m == 0:
        y, m = y - 1, 12
    return f"{y:04d}-{m:02d}"


def first_ts_month(path: str) -> str | None:
    """最初のタイムスタンプの 'YYYY-MM' を返す（開始月判定）。"""
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            m = re.search(r'"timestamp":"(\d{4}-\d\d)', line)
            if m:
                return m.group(1)
    return None


def text_of(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for c in content:
            if isinstance(c, dict) and c.get("type") == "text":
                parts.append(c.get("text", ""))
        return "\n".join(parts)
    return ""


def is_tool_result(content) -> bool:
    if isinstance(content, list):
        for c in content:
            if isinstance(c, dict) and c.get("type") == "tool_result":
                return True
    return False


def size_hint(asst_msgs: int, kchars: float) -> str:
    """利用時間推定の目安（AI が最終判断。ここはあくまでヒント）。
    基準: 簡単5-10 / 通常10-20 / 複雑20-30 / 長文・分析30-60 / 特大60分超
    """
    if asst_msgs <= 10 and kchars <= 5:
        return "簡単"
    if asst_msgs <= 30 and kchars <= 20:
        return "通常"
    if asst_msgs <= 120 and kchars <= 80:
        return "複雑"
    if asst_msgs <= 400 and kchars <= 200:
        return "長文・分析"
    return "特大"


def extract_session(path: str, month: str) -> dict:
    first_user = ""
    user_msgs = 0
    asst_msgs = 0
    total_chars = 0
    start_ts = None
    end_ts = None
    continued = False
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            ts = obj.get("timestamp")
            if ts:
                if start_ts is None:
                    start_ts = ts
                end_ts = ts
            t = obj.get("type")
            msg = obj.get("message") or {}
            content = msg.get("content")
            if t == "user":
                if is_tool_result(content):
                    continue
                txt = text_of(content)
                stripped = txt.strip()
                if not stripped:
                    continue
                user_msgs += 1
                total_chars += len(txt)
                if not first_user:
                    if stripped.startswith("This session is being continued"):
                        continued = True
                    clean = re.sub(r"<[^>]+>", " ", stripped)
                    first_user = clean[:500]
            elif t == "assistant":
                asst_msgs += 1
                total_chars += len(text_of(content))
    kchars = round(total_chars / 1000, 1)
    return {
        "proj": os.path.basename(os.path.dirname(path)),
        "month": month,
        "file": os.path.basename(path)[:8],
        "start": start_ts,
        "end": end_ts,
        "continued": continued,
        "user_msgs": user_msgs,
        "asst_msgs": asst_msgs,
        "kchars": kchars,
        "size_hint": size_hint(asst_msgs, kchars),
        "first_user": first_user,
    }


def collect(projects_dir: str, target: str, prev: str) -> list[dict]:
    wanted = {target, prev}
    sessions: list[dict] = []
    for d in sorted(glob.glob(os.path.join(projects_dir, "*"))):
        if not os.path.isdir(d):
            continue
        for path in glob.glob(os.path.join(d, "*.jsonl")):
            mon = first_ts_month(path)
            if mon in wanted:
                sessions.append(extract_session(path, mon))
    sessions.sort(key=lambda s: (s["month"], s["proj"], s["start"] or ""))
    return sessions


def render_txt(sessions: list[dict], target: str, prev: str) -> str:
    out: list[str] = []
    out.append(f"# Claude Code 利用素材  対象月={target}  前月={prev}")
    out.append(f"# {TARGET_MONTHS_HINT}")
    out.append("# 分類9区分: 文書作成/開発/データ分析/アイデア創出/学習調査/翻訳校正/業務効率化/コミュニケーション/その他")
    out.append("# 時間基準: 簡単5-10 / 通常10-20 / 複雑20-30 / 長文・分析30-60 / 特大60分超（size_hint は目安。AIが最終判断）")
    out.append("")
    for i, s in enumerate(sessions, 1):
        cont = " [continued]" if s["continued"] else ""
        out.append(
            f'{i:>2}. [{s["month"]}] {s["proj"]}  f={s["file"]}{cont}'
        )
        out.append(
            f'    U={s["user_msgs"]} A={s["asst_msgs"]} chars={s["kchars"]}k '
            f'hint={s["size_hint"]} start={s["start"]}'
        )
        out.append(f'    REQ: {s["first_user"][:400].replace(chr(10), " ")}')
        out.append("")

    by_month = Counter(s["month"] for s in sessions)
    out.append(f"TOTAL sessions: {len(sessions)}  by month: {dict(by_month)}")
    # 月×規模ヒントのクロス集計（AIの当たりを付けやすくする）
    cross: dict[str, Counter] = defaultdict(Counter)
    for s in sessions:
        cross[s["month"]][s["size_hint"]] += 1
    for mon in sorted(cross):
        out.append(f"  {mon} size_hint: {dict(cross[mon])}")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser(description="Claude Code 月次利用レポートの素材抽出")
    ap.add_argument("month", nargs="?", help="対象月 YYYY-MM（省略時は今月）")
    ap.add_argument(
        "--projects-dir",
        default=os.path.expanduser(os.path.join("~", ".claude", "projects")),
        help="Claude Code プロジェクトの親ディレクトリ",
    )
    ap.add_argument(
        "--outdir",
        default=os.path.join(tempfile.gettempdir(), "claude_usage_work"),
        help="出力先（既定: OSの一時領域。リポジトリを汚さない）",
    )
    args = ap.parse_args()

    target = args.month or _dt.date.today().strftime("%Y-%m")
    if not re.fullmatch(r"\d{4}-\d\d", target):
        print(f"ERROR: month は YYYY-MM 形式で指定してください: {target!r}", file=sys.stderr)
        return 2
    prev = prev_month(target)

    if not os.path.isdir(args.projects_dir):
        print(f"ERROR: projects-dir が見つかりません: {args.projects_dir}", file=sys.stderr)
        return 2

    sessions = collect(args.projects_dir, target, prev)

    os.makedirs(args.outdir, exist_ok=True)
    txt_path = os.path.join(args.outdir, f"{target}_sessions.txt")
    json_path = os.path.join(args.outdir, f"{target}_sessions.json")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(render_txt(sessions, target, prev))
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(
            {"target": target, "prev": prev, "sessions": sessions},
            f,
            ensure_ascii=False,
            indent=2,
        )

    # 日本語コンソールでの文字化けを避けるため stdout は ASCII 情報のみ
    by_month = Counter(s["month"] for s in sessions)
    print("Claude usage extract done.")
    print(f"  target={target} prev={prev}")
    print(f"  sessions total={len(sessions)} by_month={dict(by_month)}")
    print(f"  TXT : {txt_path}")
    print(f"  JSON: {json_path}")
    print("  -> Next: Read the TXT, classify/estimate, then fill the template.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
