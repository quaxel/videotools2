# Audience feedback for the uploader: fetch what YouTube measured for every uploaded video, keep each fetch in the
# database, and join the latest numbers with the production metrics of videos/<slug>/report.md.
#
#   animator/.venv/bin/python uploader/server.py --analytics          fetch for every uploaded video (needs the
#                                                                      yt-analytics.readonly scope, see README)
#   animator/.venv/bin/python uploader/server.py --analytics-report   write videos/analytics.md + videos/analytics.csv
#   python3 uploader/analytics.py [--db PATH] [--out DIR]             the report only; reads the database read-only
#
# This module never imports the Google libraries and never reads uploader/secrets/: server.py builds the two API
# clients and hands them in, so the tests can hand in fakes shaped like the documented responses.
import csv
import html
import json
import math
import os
import re
import sqlite3
import sys
from contextlib import closing
from datetime import date, datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

ANALYTICS_SCOPE = "https://www.googleapis.com/auth/yt-analytics.readonly"

# "Basic stats" channel report filtered to one video (developers.google.com/youtube/analytics/channel_reports).
# engagedViews exists since April 2025; if the API rejects the list (HTTP 400) the fetch retries with CORE only.
CORE_METRICS = ["views", "estimatedMinutesWatched", "averageViewDuration", "averageViewPercentage", "likes",
                "comments", "shares", "subscribersGained"]
EXTRA_METRICS = ["engagedViews", "subscribersLost", "dislikes"]
# "Audience retention" report: one video per request, 100 points (elapsedVideoTimeRatio 0.01 … 1.0).
RETENTION_METRICS = ["audienceWatchRatio", "relativeRetentionPerformance"]

SCHEMA = """
CREATE TABLE IF NOT EXISTS analytics (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    slug       TEXT NOT NULL,
    video_id   TEXT NOT NULL,
    fetched_at TEXT NOT NULL,             -- UTC ISO time of the fetch; one row per video per fetch (history is kept)
    metrics    TEXT NOT NULL,             -- JSON {startDate, endDate, hasData, views, engagedViews, averageViewDuration,
                                          --       averageViewPercentage, likes, comments, shares, subscribersGained, ...,
                                          --       durationSec, public {viewCount, likeCount, commentCount}, notes []}
    retention  TEXT                       -- JSON [[elapsedVideoTimeRatio, audienceWatchRatio, relativeRetentionPerformance], ...]
);
CREATE INDEX IF NOT EXISTS analytics_slug_time ON analytics (slug, fetched_at);
CREATE TABLE IF NOT EXISTS production (
    slug        TEXT PRIMARY KEY,         -- snapshot of the production facts, so the join survives deleting videos/<slug>/
    facts       TEXT NOT NULL,            -- JSON as returned by production_facts()
    captured_at TEXT NOT NULL
);
"""

PROD_COLS = ["duration", "words", "wpm", "speech_cover", "shots", "avg_shot", "longest_shot", "motion", "still_share",
             "top_hue_share", "hue_families", "locations", "characters", "gags"]
SMALL_N = 5  # a comparison over fewer videos than this is marked as too small to read
MIN_VIEWS = 10  # a video with fewer views has no meaningful retention: left out of the series means and correlations


def measured(r):
    """The row has retention data from enough views to compare."""
    return r["avg_view_pct"] is not None and (r["views"] or 0) >= MIN_VIEWS


class AnalyticsError(RuntimeError):
    """A problem that stops the whole fetch (missing scope, API not enabled), with a message for the user."""


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def migrate(con):
    """Create the analytics tables. Safe on an existing database: only CREATE … IF NOT EXISTS, nothing is altered."""
    con.executescript(SCHEMA)


# ---------- fetching ----------

def uploaded_videos(con):
    """[{slug, videoId, uploadedAt, publishAt, title}] for every row with a real YouTube id (dry-run ids are skipped)."""
    out = []
    for r in con.execute("SELECT slug, imported, draft, upload FROM videos WHERE upload IS NOT NULL ORDER BY slug"):
        up = json.loads(r["upload"] or "null") or {}
        vid = up.get("videoId")
        if not vid or str(vid).startswith("dryrun-"):
            continue
        meta = {**(json.loads(r["imported"] or "null") or {}), **(json.loads(r["draft"] or "null") or {})}
        out.append({"slug": r["slug"], "videoId": vid, "uploadedAt": up.get("uploadedAt"),
                    "publishAt": up.get("publishAt"), "privacy": up.get("privacy"),
                    "removed": bool((up.get("youtubeStatus") or {}).get("removed")), "title": meta.get("title", "")})
    return out


def published_at(video):
    """When the video became (or becomes) visible: the schedule time, else the upload time. None if unknown."""
    for key in ("publishAt", "uploadedAt"):
        try:
            return datetime.fromisoformat(str(video.get(key)).replace("Z", "+00:00"))
        except ValueError:
            continue
    return None


def http_status(err):
    resp = getattr(err, "resp", None)
    return getattr(err, "status_code", None) or getattr(resp, "status", None)


def stop_reason(err):
    """A message for errors that will repeat for every video, else None (the error then belongs to one video)."""
    text = str(err)
    if "insufficient" in text.lower() and "scope" in text.lower() or "ACCESS_TOKEN_SCOPE_INSUFFICIENT" in text:
        return ("The saved Google sign-in has no YouTube Analytics permission. Open the uploader page → Analitik → "
                "“Analitik izni ver” and allow access again (uploads keep working meanwhile).")
    if "accessNotConfigured" in text or "has not been used in project" in text or "SERVICE_DISABLED" in text:
        return ("The YouTube Analytics API is not enabled in the Google Cloud project: APIs & Services → Library → "
                "“YouTube Analytics API” → Enable, wait a minute, then run this again.")
    if http_status(err) == 401:
        return "The Google sign-in expired or was revoked: connect again on the uploader page."
    return None


def table(resp):
    """reports.query answers {columnHeaders: [{name, columnType, dataType}], rows: [[...]]}; `rows` is left out when
    there is no data. -> list of {column name: value}."""
    names = [h["name"] for h in resp.get("columnHeaders", [])]
    return [dict(zip(names, row)) for row in resp.get("rows") or []]


def iso_duration_seconds(text):
    """'PT58S' / 'PT1M2S' (videos.list contentDetails.duration) -> seconds, None when it cannot be read."""
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?", text or "")
    if not m or not any(m.groups()):
        return None
    d, h, mi, s = (float(g) if g else 0.0 for g in m.groups())
    return d * 86400 + h * 3600 + mi * 60 + s or None  # "P0D" (not processed yet) is not a duration


def fetch_public_stats(youtube, video_ids):
    """Data API videos.list (1 quota unit per 50 ids): real-time public counters plus the exact duration."""
    out = {}
    for i in range(0, len(video_ids), 50):
        resp = youtube.videos().list(part="statistics,contentDetails,status", id=",".join(video_ids[i:i + 50]),
                                     maxResults=50).execute()
        for item in resp.get("items", []):
            st = item.get("statistics", {})
            out[item["id"]] = {
                "durationSec": iso_duration_seconds(item.get("contentDetails", {}).get("duration")),
                "privacyStatus": item.get("status", {}).get("privacyStatus"),
                "public": {k: int(st[k]) for k in ("viewCount", "likeCount", "commentCount", "favoriteCount") if k in st},
            }
    return out


def fetch_video(yta, video, today):
    """Two reports.query calls (1 quota unit each) for one video -> (metrics dict, retention list or None)."""
    pub = published_at(video)
    # Analytics days are Pacific time, so start a day early; the lifetime of a Short is a short window anyway.
    start = ((pub.date() if pub else today) - timedelta(days=1)).isoformat()
    base = dict(ids="channel==MINE", startDate=start, endDate=today.isoformat(), filters=f"video=={video['videoId']}")
    notes = []
    try:
        resp = yta.reports().query(metrics=",".join(CORE_METRICS + EXTRA_METRICS), **base).execute()
    except Exception as e:
        if http_status(e) != 400 or stop_reason(e):
            raise
        notes.append("extra metrics (engagedViews, subscribersLost, dislikes) were rejected; core metrics only")
        resp = yta.reports().query(metrics=",".join(CORE_METRICS), **base).execute()
    rows = table(resp)
    metrics = {"startDate": start, "endDate": today.isoformat(), "hasData": bool(rows), **(rows[0] if rows else {})}
    retention = None
    try:
        r = table(yta.reports().query(metrics=",".join(RETENTION_METRICS), dimensions="elapsedVideoTimeRatio",
                                      **base).execute())
        if r:
            retention = sorted([row.get("elapsedVideoTimeRatio"), row.get("audienceWatchRatio"),
                                row.get("relativeRetentionPerformance")] for row in r)
    except Exception as e:
        if stop_reason(e):
            raise
        notes.append(f"retention curve not available: {str(e)[:200]}")
    if notes:
        metrics["notes"] = notes
    return metrics, retention


def fetch_all(con, yta, youtube, dry_run=False, today=None, log=print):
    """Fetch for every uploaded video and add one `analytics` row per video. Returns a summary dict.
    dry_run: no API call and nothing written, only the list of what would be fetched."""
    today = today or datetime.now(timezone.utc).date()
    videos, summary = uploaded_videos(con), {"fetched": [], "skipped": [], "errors": [], "dryRun": dry_run}
    todo = []
    for v in videos:
        pub = published_at(v)
        if v["removed"]:
            summary["skipped"].append((v["slug"], "removed on YouTube"))
        elif v["privacy"] == "schedule" and pub and pub.date() > today:
            summary["skipped"].append((v["slug"], f"scheduled for {pub.date().isoformat()}, not public yet"))
        else:
            todo.append(v)
    for slug, why in summary["skipped"]:
        log(f"  skip   {slug}: {why}")
    if dry_run:
        for v in todo:
            log(f"  would fetch {v['slug']} ({v['videoId']})")
        summary["fetched"] = [v["slug"] for v in todo]
        return summary
    public = {}
    if todo and youtube is not None:
        try:
            public = fetch_public_stats(youtube, [v["videoId"] for v in todo])
        except Exception as e:
            log(f"  public statistics (videos.list) failed, continuing without them: {str(e)[:200]}")
    fetched_at = now()
    for v in todo:
        try:
            metrics, retention = fetch_video(yta, v, today)
        except Exception as e:
            why = stop_reason(e)
            if why:
                raise AnalyticsError(why) from e
            summary["errors"].append((v["slug"], str(e)[:300]))
            log(f"  error  {v['slug']}: {str(e)[:300]}")
            continue
        metrics.update(public.get(v["videoId"], {}))
        with con:
            con.execute("INSERT INTO analytics (slug, video_id, fetched_at, metrics, retention) VALUES (?, ?, ?, ?, ?)",
                        (v["slug"], v["videoId"], fetched_at, json.dumps(metrics),
                         json.dumps(retention) if retention else None))
        summary["fetched"].append(v["slug"])
        if metrics["hasData"]:
            log(f"  ok     {v['slug']}: {metrics.get('views')} views, {num(metrics.get('averageViewPercentage'))}% "
                f"average viewed, {'retention curve' if retention else 'no retention curve'}")
        else:
            log(f"  ok     {v['slug']}: no Analytics data yet (it lags 48-72 h); public views "
                f"{metrics.get('public', {}).get('viewCount', '?')}")
    return summary


# ---------- production facts ----------

def series_of(slug):
    return "what-if" if slug.startswith("what-if-") else "zodiac" if slug.endswith("-sign") else "other"


def first_number(text):
    m = re.search(r"-?\d+(?:\.\d+)?", text or "")
    return float(m.group()) if m else None


def parse_report_md(text):
    """The metrics table of report.md -> {metric: number}. Percent values stay percents (84% -> 84)."""
    out = {}
    for line in text.splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if line.lstrip().startswith("|") and len(cells) >= 2 and re.fullmatch(r"\w+", cells[0]) and cells[0] != "Metric":
            value = first_number(cells[1])
            if value is not None:
                out[cells[0]] = value
    if "shots" not in out and (m := re.search(r"Shots:\s*(\d+)", text)):
        out["shots"] = float(m.group(1))
    return out


def production_facts(slug, videos_root):
    """What videos/<slug>/ says about how the video was made; None when the folder is gone."""
    folder = os.path.join(videos_root, slug)
    if not os.path.isdir(folder):
        return None

    def read(name):
        try:
            with open(os.path.join(folder, name), encoding="utf-8") as f:
                return f.read()
        except OSError:
            return ""

    def load(name):
        try:
            data = json.loads(read(name) or "{}")
            return data if isinstance(data, dict) else {}
        except ValueError:
            return {}

    facts = {k: v for k, v in parse_report_md(read("report.md")).items() if k in PROD_COLS}
    plan, lines = load("plan.json"), load("lines.json").get("lines") or []
    triple = plan.get("triple_hook") if isinstance(plan.get("triple_hook"), dict) else {}
    beats = plan.get("beats") if isinstance(plan.get("beats"), dict) else {}
    first = str(lines[0].get("text", "")) if lines and isinstance(lines[0], dict) else ""
    facts.update(
        hook_text=str(triple.get("verbal") or beats.get("hook") or first or ""),
        hook_overlay=str(triple.get("text") or ""),
        hook_kind="triple_hook" if triple else "plain",
        hook_words=len(first.split()) if first else None,
        year=plan.get("year"),
        plan_title=plan.get("title"),
    )
    return facts


def snapshot_production(con, videos_root):
    """Remember the production facts of every uploaded video whose folder still exists."""
    for v in uploaded_videos(con):
        facts = production_facts(v["slug"], videos_root)
        if facts is not None:
            with con:
                con.execute("INSERT OR REPLACE INTO production VALUES (?, ?, ?)", (v["slug"], json.dumps(facts), now()))


# ---------- report ----------

def retention_at(curve, ratio):
    """audienceWatchRatio at a position (0..1) of the video, linear between the two nearest points of the curve."""
    pts = sorted((p[0], p[1]) for p in curve or [] if p and p[0] is not None and p[1] is not None)
    if not pts or ratio is None:
        return None
    if ratio <= pts[0][0]:
        return pts[0][1]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if ratio <= x1:
            return y0 + (y1 - y0) * (ratio - x0) / (x1 - x0) if x1 > x0 else y1
    return pts[-1][1]


def pearson(pairs):
    """Pearson r of [(x, y)], None when there are fewer than 3 pairs or one side does not vary."""
    pairs = [(x, y) for x, y in pairs if x is not None and y is not None]
    n = len(pairs)
    if n < 3:
        return None, n
    mx, my = sum(x for x, _ in pairs) / n, sum(y for _, y in pairs) / n
    sxx, syy = sum((x - mx) ** 2 for x, _ in pairs), sum((y - my) ** 2 for _, y in pairs)
    # a relative tolerance: values that differ only by float noise do not vary
    if sxx <= 1e-12 * n * (mx * mx + 1) or syy <= 1e-12 * n * (my * my + 1):
        return None, n
    return sum((x - mx) * (y - my) for x, y in pairs) / math.sqrt(sxx * syy), n


def has_table(con, name):
    return bool(con.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (name,)).fetchone())


def collect(con, videos_root, today=None):
    """One dict per uploaded video: latest analytics + production facts. Sorted by averageViewPercentage, best first;
    videos without analytics come last."""
    today = today or datetime.now(timezone.utc).date()
    stored = {}
    if has_table(con, "production"):
        stored = {r["slug"]: json.loads(r["facts"]) for r in con.execute("SELECT slug, facts FROM production")}
    rows = []
    for v in uploaded_videos(con):
        history = []
        if has_table(con, "analytics"):
            history = con.execute("SELECT fetched_at, metrics, retention FROM analytics WHERE slug = ? AND video_id = ? "
                                  "ORDER BY fetched_at DESC, id DESC LIMIT 2", (v["slug"], v["videoId"])).fetchall()
        m = json.loads(history[0]["metrics"]) if history else {}
        curve = json.loads(history[0]["retention"] or "null") if history else None
        prev = json.loads(history[1]["metrics"]) if len(history) > 1 else {}
        live = production_facts(v["slug"], videos_root)
        facts = live if live is not None else stored.get(v["slug"]) or {}
        pub = published_at(v)
        duration = m.get("durationSec") or facts.get("duration")
        views, engaged = m.get("views"), m.get("engagedViews")
        public = m.get("public") or {}
        row = {
            "slug": v["slug"], "video_id": v["videoId"], "series": series_of(v["slug"]), "title": v["title"],
            "published": pub.date().isoformat() if pub else None,
            "days_live": max((today - pub.date()).days, 0) if pub else None,
            "fetched_at": history[0]["fetched_at"] if history else None,
            "views": views, "engaged_views": engaged,
            "engaged_share": round(100 * engaged / views, 1) if views and engaged is not None else None,
            "avg_view_duration_s": m.get("averageViewDuration"), "avg_view_pct": m.get("averageViewPercentage"),
            "likes": m.get("likes"), "comments": m.get("comments"), "shares": m.get("shares"),
            "subs_gained": m.get("subscribersGained"), "minutes_watched": m.get("estimatedMinutesWatched"),
            "public_views": public.get("viewCount"), "public_likes": public.get("likeCount"),
            "public_comments": public.get("commentCount"),
            "ret_3s": retention_at(curve, 3.0 / duration) if duration else None,
            "ret_25": retention_at(curve, 0.25), "ret_50": retention_at(curve, 0.50), "ret_100": retention_at(curve, 1.0),
            "prev_fetched_at": history[1]["fetched_at"] if len(history) > 1 else None,
            "views_since_prev": (public.get("viewCount") - prev["public"]["viewCount"])
            if public.get("viewCount") is not None and (prev.get("public") or {}).get("viewCount") is not None else None,
            "folder": "present" if live is not None else "snapshot" if facts else "deleted",
            **{k: facts.get(k) for k in PROD_COLS},
            "hook_words": facts.get("hook_words"), "hook_kind": facts.get("hook_kind"), "year": facts.get("year"),
            "hook_text": facts.get("hook_text"),
        }
        rows.append(row)
    rows.sort(key=lambda r: (r["avg_view_pct"] is None, -(r["avg_view_pct"] or 0), r["slug"]))
    return rows


def num(v, digits=1):
    if v is None or v == "":
        return ""
    if isinstance(v, float):
        return f"{v:.{digits}f}".rstrip("0").rstrip(".") if digits else f"{v:.0f}"
    return str(v)


def pct(v):
    return "" if v is None else f"{100 * v:.0f}%"


def mean(values):
    values = [v for v in values if v is not None]
    return sum(values) / len(values) if values else None


def median(values):
    values = sorted(v for v in values if v is not None)
    if not values:
        return None
    mid = len(values) // 2
    return values[mid] if len(values) % 2 else (values[mid - 1] + values[mid]) / 2


def md_table(header, body):
    cell = lambda c: str(c).replace("|", "\\|").replace("\n", " ")
    return "\n".join(["| " + " | ".join(header) + " |", "| " + " | ".join("---" for _ in header) + " |"]
                     + ["| " + " | ".join(cell(c) for c in row) + " |" for row in body])


CORRELATE = [("avg_shot", "average shot length (s)"), ("wpm", "words per minute"), ("motion", "motion score"),
             ("hook_words", "words in the first line"), ("still_share", "still share (%)"),
             ("speech_cover", "speech cover (%)")]


def group_rows(rows):
    """Series comparison: [(series, n, mean avp, median avp, mean 3 s retention, mean views, readable)]."""
    out = []
    for name in sorted({r["series"] for r in rows}):
        g = [r for r in rows if r["series"] == name and measured(r)]
        out.append((name, len(g), mean(r["avg_view_pct"] for r in g), median(r["avg_view_pct"] for r in g),
                    mean(r["ret_3s"] for r in g), mean(r["views"] for r in g), len(g) >= SMALL_N))
    return out


def correlations(rows):
    """[(column, label, r, n, readable)] of averageViewPercentage against each production metric."""
    out = []
    for col, label in CORRELATE:
        r, n = pearson([(row[col], row["avg_view_pct"]) for row in rows if measured(row)])
        out.append((col, label, r, n, n >= SMALL_N))
    return out


def render_markdown(rows, generated):
    compared = [r for r in rows if measured(r)]
    small = f"too small to read (fewer than {SMALL_N} videos)"
    out = ["# Audience analytics", "",
           f"Generated {generated} by `uploader/server.py --analytics-report`. {len(rows)} uploaded videos, "
           f"{len(compared)} with YouTube Analytics data from at least {MIN_VIEWS} views. Private channel data: keep this file out of git.", ""]
    if not compared:
        out += ["**No analytics data yet.** Run `animator/.venv/bin/python uploader/server.py --analytics` first "
                "(see uploader/README.md, “Audience analytics”). YouTube Analytics lags 48-72 hours behind, so a video "
                "published in the last three days has nothing to show yet.", ""]
    out += ["## Videos, best average percentage viewed first", "",
            "`avg %` = averageViewPercentage (can pass 100 when a Short loops). `ret` columns = share of viewers still "
            "watching at that point (audienceWatchRatio; above 100% means rewatches). `engaged %` = engagedViews / views, "
            "a rough stand-in for Studio's “viewed vs swiped away”, which the API does not expose. Views depend on the "
            "video's age (`days`); `avg %` and the retention columns mostly do not.", "",
            md_table(["video", "series", "days", "views", "engaged %", "avg %", "avg s", "ret 3 s", "ret 25%", "ret 50%",
                      "ret 100%", "likes", "comments", "shares", "subs", "avg_shot", "wpm", "motion", "hook words"],
                     [[r["slug"], r["series"], num(r["days_live"]), num(r["views"] if r["views"] is not None else r["public_views"]),
                       num(r["engaged_share"]), num(r["avg_view_pct"]), num(r["avg_view_duration_s"]), pct(r["ret_3s"]),
                       pct(r["ret_25"]), pct(r["ret_50"]), pct(r["ret_100"]), num(r["likes"]), num(r["comments"]),
                       num(r["shares"]), num(r["subs_gained"]), num(r["avg_shot"], 2), num(r["wpm"]), num(r["motion"]),
                       num(r["hook_words"])] for r in rows]), ""]
    gone = [r["slug"] for r in rows if r["folder"] == "deleted"]
    if gone:
        out += [f"Production columns are empty for {', '.join(gone)}: the `videos/<slug>/` folder was deleted before "
                "its metrics were recorded.", ""]
    out += ["## By series", "",
            "Series comes from the slug: `what-if-*` = what-if, `*-sign` = zodiac, everything else = other.", "",
            md_table(["series", "videos", "mean avg %", "median avg %", "mean ret 3 s", "mean views", "read as"],
                     [[name, n, num(m), num(md), pct(r3), num(v, 0), "ok" if ok else small]
                      for name, n, m, md, r3, v, ok in group_rows(rows)]), "",
            "## What moves average percentage viewed", "",
            "Pearson r between averageViewPercentage and one production metric at a time (−1 … +1; the sign says the "
            f"direction, not the cause). Under {SMALL_N} videos the number is noise; under about 20 treat even a strong r "
            "as a hint to test, not a rule.", "",
            md_table(["production metric", "videos", "r", "read as"],
                     [[label, n, "" if r is None else f"{r:+.2f}", "ok" if ok else small]
                      for _, label, r, n, ok in correlations(rows)]), "",
            "## Hooks, best first", "",
            md_table(["video", "avg %", "ret 3 s", "hook words", "hook"],
                     [[r["slug"], num(r["avg_view_pct"]), pct(r["ret_3s"]), num(r["hook_words"]), r["hook_text"] or ""]
                      for r in rows]), ""]
    return "\n".join(out)


CSV_COLS = ["slug", "video_id", "series", "title", "published", "days_live", "fetched_at", "views", "engaged_views",
            "engaged_share", "avg_view_duration_s", "avg_view_pct", "likes", "comments", "shares", "subs_gained",
            "minutes_watched", "public_views", "public_likes", "public_comments", "ret_3s", "ret_25", "ret_50", "ret_100",
            "prev_fetched_at", "views_since_prev", "folder", *PROD_COLS, "hook_words", "hook_kind", "year", "hook_text"]


def write_report(con, videos_root, out_dir, today=None):
    """Write analytics.md and analytics.csv into out_dir. Returns (markdown path, csv path, rows)."""
    rows = collect(con, videos_root, today)
    os.makedirs(out_dir, exist_ok=True)
    md_path, csv_path = os.path.join(out_dir, "analytics.md"), os.path.join(out_dir, "analytics.csv")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(render_markdown(rows, now()))
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=CSV_COLS, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({k: ("" if r[k] is None else round(r[k], 4) if isinstance(r[k], float) else r[k]) for k in CSV_COLS})
    return md_path, csv_path, rows


def render_page(rows, has_scope, dry_run):
    """The uploader's /analytics page: the same table as the report, server-rendered."""
    e = html.escape
    head = ["Video", "Seri", "Gün", "İzlenme", "Etkileşimli %", "Ort. izlenme %", "Ort. sn", "3 sn", "%25", "%50", "%100",
            "Beğeni", "Yorum", "Paylaşım", "Abone", "Son veri"]
    body = "".join(
        "<tr>" + "".join(f"<td>{e(str(c))}</td>" for c in [
            r["slug"], r["series"], num(r["days_live"]), num(r["views"] if r["views"] is not None else r["public_views"]),
            num(r["engaged_share"]), num(r["avg_view_pct"]), num(r["avg_view_duration_s"]), pct(r["ret_3s"]),
            pct(r["ret_25"]), pct(r["ret_50"]), pct(r["ret_100"]), num(r["likes"]), num(r["comments"]), num(r["shares"]),
            num(r["subs_gained"]), (r["fetched_at"] or "—")[:16].replace("T", " ")]) + "</tr>" for r in rows)
    if dry_run:
        notice = '<p class="warn">Deneme modu: YouTube\'dan veri çekilmez.</p>'
    elif has_scope:
        notice = ""
    else:
        notice = ('<p class="warn">Kayıtlı Google izni YouTube Analytics\'i kapsamıyor (yüklemeler etkilenmez). '
                  'Verileri çekebilmek için bir kez yeniden izin verin: '
                  '<button id="grant">Analitik izni ver</button></p>')
    return f"""<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Analitik — YouTube Yükleyici</title>
<style>
  body {{ font: 14px/1.45 system-ui, sans-serif; margin: 0; background: #f6f6f4; color: #1c1c1a; }}
  header {{ display: flex; gap: 12px; align-items: center; padding: 12px 20px; background: #fff; border-bottom: 1px solid #ddd; }}
  h1 {{ font-size: 17px; margin: 0; flex: 1; }}
  main {{ padding: 16px 20px; overflow-x: auto; }}
  table {{ border-collapse: collapse; background: #fff; }}
  th, td {{ padding: 6px 10px; border-bottom: 1px solid #e6e6e2; text-align: right; white-space: nowrap; }}
  th:first-child, td:first-child, th:nth-child(2), td:nth-child(2) {{ text-align: left; }}
  th {{ font-weight: 600; background: #fafaf8; }}
  button {{ font: inherit; padding: 6px 12px; border: 1px solid #bbb; border-radius: 6px; background: #fff; cursor: pointer; }}
  .warn {{ background: #fff4d6; border: 1px solid #e8cf86; padding: 10px 12px; border-radius: 6px; }}
  .hint {{ color: #666; max-width: 900px; }}
  #msg {{ color: #444; }}
  @media (prefers-color-scheme: dark) {{
    body {{ background: #19191b; color: #e8e8e6; }} header, table, button {{ background: #232326; color: inherit; border-color: #444; }}
    th {{ background: #2a2a2e; }} th, td {{ border-color: #38383c; }} .warn {{ background: #40371c; border-color: #6d5c26; }}
    .hint, #msg {{ color: #aaa; }}
  }}
</style></head><body>
<header><h1>Analitik</h1><span id="msg"></span>
  <button id="fetch" {"" if has_scope and not dry_run else "disabled"}>Verileri güncelle</button>
  <a href="/">← Yükleyici</a></header>
<main>
{notice}
<table><thead><tr>{"".join(f"<th>{e(h)}</th>" for h in head)}</tr></thead><tbody>{body}</tbody></table>
<p class="hint">Ort. izlenme % = averageViewPercentage (Shorts döngüye girince 100'ü geçebilir). 3 sn / %25 / %50 / %100 =
o noktada hâlâ izleyenlerin oranı. Etkileşimli % = engagedViews / views; Studio'daki “izlendi / kaydırıldı” oranı API'de
yok. YouTube Analytics verisi 48-72 saat geriden gelir. Seri karşılaştırmaları ve korelasyonlar için:
<code>server.py --analytics-report</code> → <code>videos/analytics.md</code>.</p>
</main>
<script>
const post = async (path, body) => {{
  const r = await fetch(path, {{ method: "POST", headers: {{ "Content-Type": "application/json" }}, body: JSON.stringify(body) }});
  const j = await r.json().catch(() => ({{ error: "Sunucu yanıt vermedi." }}));
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}};
const msg = document.getElementById("msg");
document.getElementById("fetch").onclick = async ev => {{
  ev.target.disabled = true; msg.textContent = "YouTube'dan çekiliyor…";
  try {{ const j = await post("/api/analytics/fetch", {{}}); msg.textContent = j.fetched + " video güncellendi" + (j.errors ? ", " + j.errors + " hata" : ""); setTimeout(() => location.reload(), 900); }}
  catch (e) {{ msg.textContent = e.message; ev.target.disabled = false; }}
}};
const grant = document.getElementById("grant");
if (grant) grant.onclick = async () => {{
  try {{
    await post("/api/auth/connect", {{ analytics: true }});
    msg.textContent = "Tarayıcıda Google izni bekleniyor…";
    const poll = async () => {{
      const a = await (await fetch("/api/auth/scopes")).json();
      if (a.analytics) location.reload();
      else if (a.connecting) setTimeout(poll, 1500);
      else msg.textContent = a.error || "İzin verilmedi; yeniden deneyin.";
    }};
    setTimeout(poll, 1500);
  }} catch (e) {{ msg.textContent = e.message; }}
}};
</script></body></html>"""


def open_readonly(path):
    con = sqlite3.connect(f"file:{os.path.abspath(path)}?mode=ro", uri=True, timeout=10)
    con.row_factory = sqlite3.Row
    return con


if __name__ == "__main__":
    arg = lambda name, default: sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default
    db_path = arg("--db", os.path.join(HERE, "uploader.db"))
    with closing(open_readonly(db_path)) as con:
        md, csv_file, rows = write_report(con, os.path.join(ROOT, "videos"), arg("--out", os.path.join(ROOT, "videos")))
    print(f"{len(rows)} videos, {sum(r['avg_view_pct'] is not None for r in rows)} with analytics → {md}, {csv_file}")
