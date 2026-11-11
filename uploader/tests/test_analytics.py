# Tests for the audience-analytics loop. No network: the API clients are fakes that answer with responses shaped like
# the documented ones (reports.query -> youtubeAnalytics#resultTable, videos.list -> youtube#videoListResponse), and
# every database is a temporary file. The real uploader.db is only ever read (copied through SQLite's backup API).
#
#   animator/.venv/bin/python -m unittest discover -s uploader/tests -v
import csv
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from contextlib import closing
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
UPLOADER = os.path.dirname(HERE)
ROOT = os.path.dirname(UPLOADER)
sys.path.insert(0, UPLOADER)
import analytics  # noqa: E402

VIDEOS_SCHEMA = """
CREATE TABLE videos (slug TEXT PRIMARY KEY, video_path TEXT NOT NULL, source TEXT NOT NULL, imported TEXT NOT NULL,
                     draft TEXT, upload TEXT, archived INTEGER NOT NULL DEFAULT 0, added_at TEXT NOT NULL);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
"""
TODAY = date(2026, 11, 10)


class FakeHttpError(Exception):
    """Stands in for googleapiclient.errors.HttpError: has .resp.status and the API's message in str()."""

    def __init__(self, status, message):
        super().__init__(message)
        self.resp = type("Resp", (), {"status": status})()


class Call:
    def __init__(self, fn):
        self.fn = fn

    def execute(self):
        return self.fn()


def result_table(columns, rows):
    """A reports.query response body as documented; `rows` is omitted when the query has no data."""
    body = {"kind": "youtubeAnalytics#resultTable",
            "columnHeaders": [{"name": n, "columnType": t, "dataType": d} for n, t, d in columns]}
    if rows:
        body["rows"] = rows
    return body


def basic_stats(metric_names, values):
    types = {"averageViewPercentage": "FLOAT"}
    return result_table([(n, "METRIC", types.get(n, "INTEGER")) for n in metric_names],
                        [[values[n] for n in metric_names]] if values else [])


def retention_curve(start, end, bump=0.0):
    """100 points like the Audience retention report: ratio 0.01 … 1.0, watch ratio falling from start to end."""
    rows = []
    for i in range(1, 101):
        x = i / 100
        rows.append([x, round(start + (end - start) * x + (bump if i <= 3 else 0), 4), round(0.5 + 0.2 * (1 - x), 4)])
    return result_table([("elapsedVideoTimeRatio", "DIMENSION", "FLOAT"), ("audienceWatchRatio", "METRIC", "FLOAT"),
                         ("relativeRetentionPerformance", "METRIC", "FLOAT")], rows)


class FakeAnalytics:
    """youtubeAnalytics v2 client: reports().query(**params).execute()."""

    def __init__(self, stats, curves, reject_extra=False, fail=None):
        self.stats, self.curves, self.reject_extra, self.fail, self.calls = stats, curves, reject_extra, fail or {}, []

    def reports(self):
        return self

    def query(self, **params):
        self.calls.append(params)

        def run():
            assert params["ids"] == "channel==MINE"
            assert set(params) <= {"ids", "startDate", "endDate", "metrics", "dimensions", "filters"}
            vid = params["filters"].removeprefix("video==")
            if vid in self.fail:
                raise self.fail[vid]
            names = params["metrics"].split(",")
            if params.get("dimensions") == "elapsedVideoTimeRatio":
                return self.curves.get(vid) or result_table([("elapsedVideoTimeRatio", "DIMENSION", "FLOAT")], [])
            if self.reject_extra and "engagedViews" in names:
                raise FakeHttpError(400, "Unknown identifier (engagedViews) given in field parameters.metrics.")
            values = self.stats.get(vid)
            return basic_stats(names, {n: values.get(n, 0) for n in names} if values else None)
        return Call(run)


class FakeYouTube:
    """YouTube Data API v3 client: videos().list(part=..., id=...).execute()."""

    def __init__(self, items):
        self.items, self.calls = items, []

    def videos(self):
        return self

    def list(self, **params):
        self.calls.append(params)
        ids = params["id"].split(",")
        return Call(lambda: {"kind": "youtube#videoListResponse",
                             "items": [self.items[i] for i in ids if i in self.items],
                             "pageInfo": {"totalResults": len(ids), "resultsPerPage": len(ids)}})


def video_item(vid, views, seconds=58):
    return {"kind": "youtube#video", "id": vid, "contentDetails": {"duration": f"PT{seconds}S"},
            "status": {"privacyStatus": "public"},
            "statistics": {"viewCount": str(views), "likeCount": "12", "favoriteCount": "0", "commentCount": "3"}}


def stats(views, avp, avd, engaged=None):
    return {"views": views, "engagedViews": engaged if engaged is not None else int(views * 0.7),
            "estimatedMinutesWatched": int(views * avd / 60), "averageViewDuration": avd, "averageViewPercentage": avp,
            "likes": 10, "comments": 2, "shares": 4, "subscribersGained": 1, "subscribersLost": 0, "dislikes": 0}


REPORT_MD = """# Report: Test

0 of 17 targets missed. Shots: 33.

| Metric | Value | Target | |
| --- | --- | --- | --- |
| duration | {duration}s | 50 – 60 | ok |
| words | 195 | 180 – 210 | ok |
| wpm | {wpm} | 190 – 215 | ok |
| speech_cover | 84% | 0.8 – 1.0 | ok |
| bed_vs_speech_db | -5.3 dB | ≤ -5.0 | ok |
| avg_shot | {avg_shot}s | 0 – 2.2 | ok |
| hue_families | 8 | 5 – 12 | ok |
| top_hue_share | 22% | 0 – 0.4 | ok |
| motion | {motion} | ≥ 6.0 | ok |
| still_share | 3% | 0 – 0.15 | ok |

Stillest shots: A 3.2.
"""


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.videos_root = os.path.join(self.tmp.name, "videos")
        os.makedirs(self.videos_root)
        self.con = sqlite3.connect(os.path.join(self.tmp.name, "test.db"))
        self.con.row_factory = sqlite3.Row
        self.addCleanup(self.con.close)
        self.con.executescript(VIDEOS_SCHEMA)
        analytics.migrate(self.con)

    def add_video(self, slug, video_id, upload=None, folder=None, title=None):
        up = upload if upload is not None else {"videoId": video_id, "privacy": "public", "publishAt": None,
                                                "uploadedAt": "2026-11-01T10:00:00+00:00", "youtubeStatus": {}}
        self.con.execute("INSERT INTO videos VALUES (?, ?, 'md', ?, NULL, ?, 0, '2026-11-01T00:00:00+00:00')",
                         (slug, f"output/{slug}.mp4", json.dumps({"title": title or slug.title(), "description": "", "tags": []}),
                          json.dumps(up) if up else None))
        self.con.commit()
        if folder:
            d = os.path.join(self.videos_root, slug)
            os.makedirs(d)
            open(os.path.join(d, "report.md"), "w").write(REPORT_MD.format(**folder))
            json.dump({"title": "T", "year": folder.get("year"), "beats": {"hook": "beat hook"},
                       **({"triple_hook": {"verbal": "said hook", "text": "ON SCREEN"}} if folder.get("triple") else {})},
                      open(os.path.join(d, "plan.json"), "w"))
            json.dump({"lines": [{"speaker": "narrator", "text": folder.get("first", "You land in Houston and start walking.")}]},
                      open(os.path.join(d, "lines.json"), "w"))

    def fetch(self, yta, yt=None, **kw):
        return analytics.fetch_all(self.con, yta, yt, today=TODAY, log=lambda *a: None, **kw)

    def count(self):
        return self.con.execute("SELECT COUNT(*) FROM analytics").fetchone()[0]


class FetchTests(Base):
    def test_stores_metrics_retention_and_public_stats(self):
        self.add_video("airport-walk", "vidA")
        yta = FakeAnalytics({"vidA": stats(1000, 82.5, 47)}, {"vidA": retention_curve(1.1, 0.4)})
        s = self.fetch(yta, FakeYouTube({"vidA": video_item("vidA", 1234)}))
        self.assertEqual(s["fetched"], ["airport-walk"])
        row = self.con.execute("SELECT * FROM analytics").fetchone()
        m, curve = json.loads(row["metrics"]), json.loads(row["retention"])
        self.assertEqual((row["slug"], row["video_id"]), ("airport-walk", "vidA"))
        self.assertEqual((m["views"], m["engagedViews"], m["averageViewPercentage"], m["shares"]), (1000, 700, 82.5, 4))
        self.assertEqual(m["public"]["viewCount"], 1234)
        self.assertEqual(m["durationSec"], 58)
        self.assertEqual((m["startDate"], m["endDate"]), ("2026-10-31", "2026-11-10"))
        self.assertEqual(len(curve), 100)
        self.assertEqual(curve[0][0], 0.01)
        # one basic-stats query and one retention query per video, each for a single video id
        self.assertEqual([c.get("dimensions") for c in yta.calls], [None, "elapsedVideoTimeRatio"])
        self.assertTrue(all(c["filters"] == "video==vidA" for c in yta.calls))

    def test_history_is_kept_per_fetch(self):
        self.add_video("a", "vidA")
        yt = FakeYouTube({"vidA": video_item("vidA", 100)})
        self.fetch(FakeAnalytics({"vidA": stats(100, 70, 40)}, {}), yt)
        yt.items["vidA"] = video_item("vidA", 250)
        self.fetch(FakeAnalytics({"vidA": stats(250, 72, 41)}, {}), yt)
        self.assertEqual(self.count(), 2)
        self.assertEqual(analytics.collect(self.con, self.videos_root, TODAY)[0]["views"], 250)

    def test_dry_run_calls_nothing_and_writes_nothing(self):
        self.add_video("a", "vidA")
        s = self.fetch(None, None, dry_run=True)  # a None client would crash on any call
        self.assertEqual((s["fetched"], self.count()), (["a"], 0))

    def test_skips_dry_run_ids_future_schedules_and_not_uploaded(self):
        self.add_video("dry", "dryrun-abc123")
        self.add_video("draft", None, upload=False)
        self.add_video("later", "vidL", upload={"videoId": "vidL", "privacy": "schedule",
                                                "publishAt": "2026-11-20T20:45:00.000Z", "uploadedAt": "2026-11-09T16:00:00+00:00"})
        self.add_video("gone", "vidG", upload={"videoId": "vidG", "privacy": "public", "uploadedAt": "2026-11-01T10:00:00+00:00",
                                               "youtubeStatus": {"removed": True}})
        yta = FakeAnalytics({}, {})
        s = self.fetch(yta, FakeYouTube({}))
        self.assertEqual((s["fetched"], yta.calls), ([], []))
        self.assertEqual(sorted(slug for slug, _ in s["skipped"]), ["gone", "later"])

    def test_no_data_yet_still_records_public_counters(self):
        self.add_video("fresh", "vidF")
        self.fetch(FakeAnalytics({}, {}), FakeYouTube({"vidF": video_item("vidF", 40)}))
        m = json.loads(self.con.execute("SELECT metrics FROM analytics").fetchone()[0])
        self.assertFalse(m["hasData"])
        self.assertNotIn("views", m)
        self.assertEqual(m["public"]["viewCount"], 40)
        self.assertIsNone(self.con.execute("SELECT retention FROM analytics").fetchone()[0])

    def test_falls_back_to_core_metrics_when_extra_ones_are_rejected(self):
        self.add_video("a", "vidA")
        yta = FakeAnalytics({"vidA": stats(100, 70, 40)}, {}, reject_extra=True)
        self.fetch(yta, None)
        m = json.loads(self.con.execute("SELECT metrics FROM analytics").fetchone()[0])
        self.assertEqual(m["views"], 100)
        self.assertNotIn("engagedViews", m)
        self.assertIn("core metrics only", m["notes"][0])

    def test_one_broken_video_does_not_stop_the_others(self):
        self.add_video("a", "vidA")
        self.add_video("b", "vidB")
        yta = FakeAnalytics({"vidB": stats(100, 70, 40)}, {}, fail={"vidA": FakeHttpError(500, "backendError")})
        s = self.fetch(yta, None)
        self.assertEqual((s["fetched"], [slug for slug, _ in s["errors"]]), (["b"], ["a"]))

    def test_missing_scope_or_disabled_api_stops_with_instructions(self):
        self.add_video("a", "vidA")
        for err, word in [(FakeHttpError(403, "Request had insufficient authentication scopes."), "Analitik izni ver"),
                          (FakeHttpError(403, "YouTube Analytics API has not been used in project 1 before or it is disabled."),
                           "Enable")]:
            with self.assertRaises(analytics.AnalyticsError) as ctx:
                self.fetch(FakeAnalytics({}, {}, fail={"vidA": err}), None)
            self.assertIn(word, str(ctx.exception))
        self.assertEqual(self.count(), 0)

    def test_public_stats_are_requested_in_batches_of_50(self):
        for i in range(60):
            self.add_video(f"v{i:02d}", f"id{i:02d}")
        yt = FakeYouTube({})
        self.fetch(FakeAnalytics({}, {}), yt)
        self.assertEqual([len(c["id"].split(",")) for c in yt.calls], [50, 10])

    def test_iso_durations(self):
        self.assertEqual(analytics.iso_duration_seconds("PT58S"), 58)
        self.assertEqual(analytics.iso_duration_seconds("PT1M2S"), 62)
        self.assertIsNone(analytics.iso_duration_seconds("P0D"))
        self.assertIsNone(analytics.iso_duration_seconds(None))


class ReportTests(Base):
    def test_parses_report_md_and_plan_facts(self):
        self.add_video("what-if-rome", "v1", folder=dict(duration=58.0, wpm=201, avg_shot=1.76, motion=6.8, triple=True,
                                                         year=1871, first="one two three four five"))
        f = analytics.production_facts("what-if-rome", self.videos_root)
        self.assertEqual((f["duration"], f["wpm"], f["avg_shot"], f["motion"], f["speech_cover"], f["top_hue_share"],
                          f["still_share"], f["hue_families"], f["shots"]), (58.0, 201, 1.76, 6.8, 84, 22, 3, 8, 33))
        self.assertEqual((f["hook_text"], f["hook_overlay"], f["hook_kind"], f["hook_words"], f["year"]),
                         ("said hook", "ON SCREEN", "triple_hook", 5, 1871))
        self.assertNotIn("bed_vs_speech_db", f)

    def test_parses_the_real_report_files(self):
        real = os.path.join(ROOT, "videos")
        slugs = [s for s in sorted(os.listdir(real)) if os.path.isfile(os.path.join(real, s, "report.md"))] if os.path.isdir(real) else []
        if not slugs:
            self.skipTest("no videos/<slug>/report.md in this checkout")
        for slug in slugs:
            f = analytics.production_facts(slug, real)
            for key in ("duration", "wpm", "avg_shot", "motion"):
                self.assertIsInstance(f.get(key), float, f"{slug}: {key}")
            self.assertTrue(5 < f["duration"] < 900 and 0 < f["avg_shot"] < 20, slug)

    def test_series_from_slug(self):
        self.assertEqual([analytics.series_of(s) for s in ("what-if-rome-had-steam", "leo-sign", "airport-walk")],
                         ["what-if", "zodiac", "other"])

    def test_retention_points(self):
        curve = json.loads(json.dumps(retention_curve(1.0, 0.5)["rows"]))
        self.assertAlmostEqual(analytics.retention_at(curve, 0.25), 0.875)
        self.assertAlmostEqual(analytics.retention_at(curve, 0.5), 0.75)
        self.assertAlmostEqual(analytics.retention_at(curve, 1.0), 0.5)
        self.assertAlmostEqual(analytics.retention_at(curve, 0.255), 0.8725)  # between two points
        self.assertAlmostEqual(analytics.retention_at(curve, 0.001), 0.995)   # before the first point
        self.assertIsNone(analytics.retention_at(None, 0.5))

    def test_pearson(self):
        r, n = analytics.pearson([(1, 2), (2, 4), (3, 6), (None, 1)])
        self.assertAlmostEqual(r, 1.0)
        self.assertEqual(n, 3)
        self.assertAlmostEqual(analytics.pearson([(1, 3), (2, 2), (3, 1)])[0], -1.0)
        self.assertEqual(analytics.pearson([(1, 1), (1, 2), (1, 3)]), (None, 3))  # no variation
        self.assertEqual(analytics.pearson([(1, 1)]), (None, 1))
        self.assertEqual(analytics.pearson([(0.3, 1), (0.3, 2), (0.30000000000000004, 3)]), (None, 3))  # float noise only

    def test_videos_with_few_views_are_left_out_of_comparisons(self):
        row = lambda views, avp, shot: {"series": "other", "avg_view_pct": avp, "views": views, "ret_3s": 50, "avg_shot": shot,
                                        **{c: None for c, _ in analytics.CORRELATE if c != "avg_shot"}}
        rows = [row(1, 0, 9.0)] + [row(100 + i, 60 + i, 4.0 + i / 10) for i in range(5)]
        self.assertEqual(analytics.group_rows(rows)[0][1], 5)
        self.assertEqual({c[0]: c for c in analytics.correlations(rows)}["avg_shot"][3], 5)

    def build(self):
        """Six 'other' videos where a longer shot goes with lower retention, two zodiac ones, one with a deleted
        folder, one not measured yet."""
        st, curves, items = {}, {}, {}
        for i in range(6):
            vid, avp = f"o{i}", 90 - 5 * i
            self.add_video(f"other-{i}", vid, folder=dict(duration=58.0, wpm=195 + i, avg_shot=1.5 + 0.1 * i, motion=7.0 - 0.1 * i,
                                                          first=" ".join(["w"] * (8 + i))))
            st[vid], curves[vid], items[vid] = stats(1000 + i, avp, 50 - i), retention_curve(1.0, avp / 100), video_item(vid, 2000)
        for i, slug in enumerate(["leo-sign", "aries-sign"]):
            vid = f"z{i}"
            self.add_video(slug, vid, folder=dict(duration=55.0, wpm=200, avg_shot=1.9, motion=6.5))
            st[vid], curves[vid], items[vid] = stats(500, 60 + i, 33), retention_curve(0.9, 0.5), video_item(vid, 600, 55)
        self.add_video("deleted-folder", "d0")
        st["d0"], curves["d0"], items["d0"] = stats(900, 99, 57), retention_curve(1.2, 0.8), video_item("d0", 950)
        self.add_video("too-new", "n0")
        items["n0"] = video_item("n0", 12)
        self.fetch(FakeAnalytics(st, curves), FakeYouTube(items))
        return analytics.write_report(self.con, self.videos_root, os.path.join(self.tmp.name, "out"), TODAY)

    def test_report_rows_sorting_and_missing_folder(self):
        md_path, csv_path, rows = self.build()
        self.assertEqual([r["slug"] for r in rows][:3], ["deleted-folder", "other-0", "other-1"])
        self.assertEqual(rows[-1]["slug"], "too-new")  # no analytics yet: last, but present
        gone = rows[0]
        self.assertEqual((gone["folder"], gone["avg_shot"], gone["wpm"], gone["hook_words"]), ("deleted", None, None, None))
        self.assertEqual(gone["avg_view_pct"], 99)
        self.assertAlmostEqual(gone["ret_3s"], analytics.retention_at(retention_curve(1.2, 0.8)["rows"], 3 / 58))  # videos.list duration
        self.assertAlmostEqual(rows[1]["ret_50"], 0.95)
        self.assertEqual(rows[1]["engaged_share"], 70.0)
        self.assertEqual(rows[-1]["public_views"], 12)
        with open(csv_path, newline="", encoding="utf-8") as f:
            table = list(csv.DictReader(f))
        self.assertEqual(len(table), 10)
        self.assertEqual(table[0]["slug"], "deleted-folder")
        self.assertEqual((table[0]["avg_shot"], table[0]["wpm"]), ("", ""))
        self.assertEqual(table[1]["avg_shot"], "1.5")
        for col in ("avg_view_pct", "ret_3s", "ret_25", "ret_50", "ret_100", "series", "hook_words", "motion"):
            self.assertIn(col, table[0])

    def test_groups_and_correlations_flag_small_samples(self):
        _, _, rows = self.build()
        groups = {g[0]: g for g in analytics.group_rows(rows)}
        self.assertEqual((groups["other"][1], groups["other"][6]), (7, True))
        self.assertEqual((groups["zodiac"][1], groups["zodiac"][6]), (2, False))
        cors = {c[0]: c for c in analytics.correlations(rows)}
        self.assertLess(cors["avg_shot"][2], -0.7)   # longer shots went with lower retention in the fixture
        self.assertEqual(cors["avg_shot"][3:], (8, True))
        md = open(os.path.join(self.tmp.name, "out", "analytics.md"), encoding="utf-8").read()
        zodiac_line = next(l for l in md.splitlines() if l.startswith("| zodiac "))
        self.assertIn("too small to read", zodiac_line)
        self.assertNotIn("too small to read", next(l for l in md.splitlines() if l.startswith("| other ")))
        self.assertIn("deleted-folder", md)

    def test_small_channel_marks_every_comparison_unreadable(self):
        for i in range(3):
            self.add_video(f"v{i}", f"id{i}", folder=dict(duration=58.0, wpm=200 + i, avg_shot=1.6 + i / 10, motion=6.5))
        self.fetch(FakeAnalytics({f"id{i}": stats(100, 70 + i, 40) for i in range(3)}, {}), None)
        rows = analytics.collect(self.con, self.videos_root, TODAY)
        self.assertTrue(all(not c[4] for c in analytics.correlations(rows)))
        self.assertTrue(all(not g[6] for g in analytics.group_rows(rows)))

    def test_snapshot_keeps_production_facts_after_the_folder_is_deleted(self):
        self.add_video("a", "vidA", folder=dict(duration=58.0, wpm=201, avg_shot=1.76, motion=6.8))
        analytics.snapshot_production(self.con, self.videos_root)
        import shutil
        shutil.rmtree(os.path.join(self.videos_root, "a"))
        row = analytics.collect(self.con, self.videos_root, TODAY)[0]
        self.assertEqual((row["folder"], row["avg_shot"], row["wpm"]), ("snapshot", 1.76, 201))

    def test_report_before_any_fetch_and_without_the_tables(self):
        path = os.path.join(self.tmp.name, "old.db")
        with closing(sqlite3.connect(path)) as con:  # a database from before this feature: no analytics tables
            con.executescript(VIDEOS_SCHEMA)
            con.execute("INSERT INTO videos VALUES ('a', 'output/a.mp4', 'md', '{\"title\": \"A\"}', NULL, "
                        "'{\"videoId\": \"vidA\", \"uploadedAt\": \"2026-11-01T10:00:00+00:00\"}', 0, 'x')")
            con.commit()
        with closing(analytics.open_readonly(path)) as con:
            md_path, _, rows = analytics.write_report(con, self.videos_root, os.path.join(self.tmp.name, "out2"), TODAY)
        self.assertEqual(len(rows), 1)
        self.assertIn("No analytics data yet", open(md_path, encoding="utf-8").read())

    def test_page_explains_the_missing_scope(self):
        self.add_video("a<b", "vidA")
        rows = analytics.collect(self.con, self.videos_root, TODAY)
        page = analytics.render_page(rows, has_scope=False, dry_run=False)
        self.assertIn('id="grant"', page)
        self.assertIn("a&lt;b", page)
        self.assertNotIn('id="grant"', analytics.render_page(rows, has_scope=True, dry_run=False))


class MigrationTests(unittest.TestCase):
    def test_migrate_is_idempotent_and_leaves_existing_tables_alone(self):
        with tempfile.TemporaryDirectory() as tmp, closing(sqlite3.connect(os.path.join(tmp, "t.db"))) as con:
            con.executescript(VIDEOS_SCHEMA)
            con.execute("INSERT INTO videos VALUES ('a', 'p', 'md', '{}', NULL, '{\"videoId\": \"x\"}', 0, 't')")
            con.commit()
            before = con.execute("SELECT * FROM videos").fetchall()
            analytics.migrate(con)
            con.execute("INSERT INTO analytics (slug, video_id, fetched_at, metrics) VALUES ('a', 'x', 't', '{}')")
            con.commit()
            analytics.migrate(con)
            self.assertEqual(con.execute("SELECT * FROM videos").fetchall(), before)
            self.assertEqual(con.execute("SELECT COUNT(*) FROM analytics").fetchone()[0], 1)

    def test_on_a_copy_of_the_real_database(self):
        real = os.path.join(UPLOADER, "uploader.db")
        if not os.path.isfile(real):
            self.skipTest("no uploader/uploader.db here")
        with tempfile.TemporaryDirectory() as tmp:
            copy = os.path.join(tmp, "copy.db")
            with closing(sqlite3.connect(f"file:{real}?mode=ro", uri=True)) as src, closing(sqlite3.connect(copy)) as dst:
                src.backup(dst)
            with closing(sqlite3.connect(copy)) as con:
                con.row_factory = sqlite3.Row
                before = [tuple(r) for r in con.execute("SELECT * FROM videos ORDER BY slug")]
                analytics.migrate(con)
                analytics.migrate(con)
                self.assertEqual([tuple(r) for r in con.execute("SELECT * FROM videos ORDER BY slug")], before)
                uploaded = analytics.uploaded_videos(con)
                s = analytics.fetch_all(con, None, None, dry_run=True, today=TODAY, log=lambda *a: None)
                self.assertEqual(len(s["fetched"]) + len(s["skipped"]), len(uploaded))
                _, _, rows = analytics.write_report(con, os.path.join(ROOT, "videos"), os.path.join(tmp, "out"), TODAY)
                self.assertEqual(len(rows), len(uploaded))


VENV_PY = os.path.join(ROOT, "animator", ".venv", "bin", "python")


@unittest.skipUnless(os.path.isfile(VENV_PY), "animator/.venv is needed for server.py")
class ServerTests(unittest.TestCase):
    """server.py itself, always with --db on a temporary database. Nothing here can reach Google: the CLI runs use
    --dry-run or the report, and the scope tests point the token path at a fake token that is already 'valid'."""

    def run_server(self, *args):
        return subprocess.run([VENV_PY, os.path.join(UPLOADER, "server.py"), *args], capture_output=True, text=True, timeout=120)

    def make_db(self, tmp):
        path = os.path.join(tmp, "t.db")
        with closing(sqlite3.connect(path)) as con:
            con.executescript(VIDEOS_SCHEMA)
            con.execute("INSERT INTO settings VALUES ('migrated_hidden_txt', 'x')")
            con.execute("INSERT INTO videos VALUES ('test-only-slug', 'output/test-only-slug.mp4', 'md', '{\"title\": \"T\"}', NULL, "
                        "'{\"videoId\": \"vidT\", \"privacy\": \"public\", \"uploadedAt\": \"2026-11-01T10:00:00+00:00\"}', 0, 'x')")
            con.commit()
        return path

    def test_cli_dry_run_fetch_and_report(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = self.make_db(tmp)
            r = self.run_server("--analytics", "--dry-run", "--db", path)
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("would fetch test-only-slug", r.stdout)
            with closing(sqlite3.connect(path)) as con:
                self.assertEqual(con.execute("SELECT COUNT(*) FROM analytics").fetchone()[0], 0)  # table exists, empty
            out = os.path.join(tmp, "out")
            r = self.run_server("--analytics-report", "--db", path, "--out", out)
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertTrue(os.path.isfile(os.path.join(out, "analytics.md")) and os.path.isfile(os.path.join(out, "analytics.csv")))
            self.assertIn("test-only-slug", open(os.path.join(out, "analytics.csv"), encoding="utf-8").read())

    def scope_check(self, scopes):
        """Run in a child process: import server.py with the token path pointed at a fake, already valid token."""
        code = f"""
import json, os, sys, tempfile
sys.argv = ['server.py']
sys.path.insert(0, {UPLOADER!r})
import server, analytics
tmp = tempfile.mkdtemp()
server.TOKEN = os.path.join(tmp, 'token.json')
json.dump({{'token': 'fake-access', 'refresh_token': 'fake-refresh', 'client_id': 'fake.apps.googleusercontent.com',
           'client_secret': 'fake', 'token_uri': 'https://oauth2.googleapis.com/token', 'scopes': {scopes!r},
           'expiry': '2099-01-01T00:00:00Z'}}, open(server.TOKEN, 'w'))
creds = server.credentials()
out = {{'upload_ok': bool(creds and creds.valid), 'scopes': sorted(creds.scopes or []) if creds else None,
       'has_analytics': server.has_analytics_scope()}}
try:
    server.youtube_analytics()
    out['analytics_client'] = True
except analytics.AnalyticsError as e:
    out['analytics_client'] = str(e)
print(json.dumps(out))
"""
        r = subprocess.run([VENV_PY, "-c", code], capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stderr)
        return json.loads(r.stdout.strip().splitlines()[-1])

    def test_old_token_keeps_uploading_and_analytics_asks_to_reconnect(self):
        old = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube"]
        out = self.scope_check(old)
        self.assertTrue(out["upload_ok"])
        self.assertEqual(out["scopes"], sorted(old))
        self.assertFalse(out["has_analytics"])
        self.assertIn("Analitik izni ver", out["analytics_client"])

    def test_new_token_keeps_its_analytics_scope(self):
        new = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube",
               analytics.ANALYTICS_SCOPE]
        out = self.scope_check(new)
        self.assertTrue(out["upload_ok"] and out["has_analytics"])
        self.assertIn(analytics.ANALYTICS_SCOPE, out["scopes"])  # a later refresh / to_json() will not drop it
        self.assertIs(out["analytics_client"], True)


if __name__ == "__main__":
    unittest.main()
