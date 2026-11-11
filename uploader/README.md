# YouTube Yükleyici

A local page that lists every rendered video (`output/<slug>.mp4`) and uploads it with one button, with the title,
description and tags already filled in. When you schedule a video, it is uploaded as **private** with `publishAt`.
YouTube itself makes it public at that time, so this page doesn't need to stay open.

```bash
animator/.venv/bin/python uploader/server.py                 # http://127.0.0.1:8765 opens
animator/.venv/bin/python uploader/server.py --dry-run       # whole flow without sending anything to YouTube
animator/.venv/bin/python uploader/server.py --import <slug> # add one video to the database now (make-video step 8 runs it)
```

## Where the data lives: `uploader/uploader.db`

Everything is stored in one SQLite file, `uploader/uploader.db`:

- each video's imported title, description and tags
- your edits
- the archive flag
- the upload record: video ID, schedule, and the last status YouTube reported

**A video is imported once.** That happens when both `output/<slug>.mp4` and `videos/<slug>/` exist, either when you
open the page or when you run `--import`:

- The text comes from `videos/<slug>/youtube.md`.
- If that file is missing, the page drafts it from `plan.json`, `lines.json` and `research.md` and marks it
  "Otomatik taslak" (automatic draft). If `youtube.md` appears later and you haven't edited the draft, it replaces
  the draft automatically.
- **After import, only the MP4 is needed.** You can delete `videos/<slug>/`. The page shows a warning if the MP4 is
  missing.

Buttons:

- **"İlk haline dön"** (back to original) throws away your edits.
- **"Klasörden yeniden al"** (re-read from folder) re-reads the text from the folder, while the folder still exists.
- **"Arşivle"** (archive) hides a video from the list. The videos made before this page existed start out in the
  "Arşiv" (archive) tab.

**Back up the database file:** `uploader.db` is gitignored, and it is the **only** copy of your edits and upload
records. If it's deleted, the protection against uploading the same video twice is gone too. Before a risky change,
copy it to `uploader/backups/uploader-<date>.db` (gitignored).

## One-time setup

1. **Google Cloud Console** → create a new project → *APIs & Services → Library* → turn on **YouTube Data API v3**.
2. *OAuth consent screen*:
   - User type: **External**.
   - App name: anything you like.
   - Add your own Google account under *Test users*.
   - **Then set "Publishing status" to "In production".** While it stays in "Testing", your sign-in expires after
     7 days and you'd have to connect again every week. The app stays unverified, which is fine: you just click
     "Advanced → continue" on the warning screen when you sign in.
3. *Credentials → Create credentials → OAuth client ID* → type **Desktop app** → download the JSON and save it as
   `uploader/secrets/client_secret.json`. This folder is in `.gitignore`.
4. Start the page and click **"YouTube'a bağlan"** (connect to YouTube). Allow access with the Google account that
   owns the channel. The token is saved to `uploader/secrets/token.json`.
5. On the channel, create a playlist named exactly **Explained**: every upload is added to it. Without it the upload
   still works but shows a playlist error; **"Durumu YouTube'dan kontrol et"** retries the playlist step.

## Important: compliance audit

YouTube **locks every video uploaded through an API project that hasn't passed its audit as private**. A locked video
won't go public at `publishAt`, and you can't make it public later either. So you need the audit before scheduling
can work:

- Apply at the *YouTube API Services – Audit and Quota Extension Form* (linked from the *Quotas* page in the
  YouTube API docs). It's free and takes from a few days to a few weeks.
- Until it's approved, use the page to try the flow out. Upload a test video as "Gizli" (private) and, in the
  editor, click **"Durumu YouTube'dan kontrol et"** (check status on YouTube). If YouTube has dropped the schedule,
  the page warns you.

## Limits

- **Quota:** the default is 10,000 units a day, and each upload uses a large share of it, so it's enough for a few
  videos a day.
- **Character limits** (the page counts these live):
  - Title: 100 characters.
  - Description: 5,000 bytes.
  - Tags: 500 characters in total. A tag with spaces counts as if it were in quotes.

## Audience analytics

The production targets (pace, shot length, motion …) are internal guesses. This part records what viewers actually
did with each published video, so the guesses can be checked.

```bash
animator/.venv/bin/python uploader/server.py --analytics          # fetch for every uploaded video, add to the database
animator/.venv/bin/python uploader/server.py --analytics-report   # write videos/analytics.md + videos/analytics.csv
animator/.venv/bin/python uploader/server.py --analytics --analytics-report   # both
animator/.venv/bin/python uploader/server.py --analytics --dry-run            # list what would be fetched; no call, nothing saved
python3 uploader/analytics.py                                     # the report only, database opened read-only
animator/.venv/bin/python -m unittest discover -s uploader/tests  # tests (fake API clients, temporary databases)
```

The **"Analitik"** link (top right) opens the same table at `/analytics`, with a **"Verileri güncelle"** (refresh)
button, enabled once the analytics permission is granted and always off in `--dry-run`.
`--db PATH`, `--port N` and `--out DIR` point the commands at another database / port / report folder;
`--no-browser` skips opening the page. If the port is already in use, the running page is opened instead.

### One-time setup

1. **Google Cloud Console**, the same project as the uploader → *APIs & Services → Library* → turn on
   **YouTube Analytics API** (a separate API from "YouTube Data API v3").
2. **Grant the extra permission.** Analytics needs the scope `https://www.googleapis.com/auth/yt-analytics.readonly`
   ("View YouTube Analytics reports"). A sign-in made before this feature does not have it. Open the page →
   **"Analitik"** → **"Analitik izni ver"** and allow access again with the channel's Google account, keeping every
   box ticked. Until you do, `--analytics` stops with a message saying so.
   - Uploads are not affected: the old sign-in keeps working, and if you abandon or refuse the new sign-in the old
     token file is left as it was.
   - A first-time **"YouTube'a bağlan"** asks for all three permissions at once.

### What is stored

Each fetch adds one row per video to the `analytics` table of `uploader.db` (`slug, video_id, fetched_at, metrics
JSON, retention JSON`). Old rows are kept, so growth between fetches can be read later. A second table,
`production`, keeps a copy of each video's production facts (from `report.md`, `plan.json`, `lines.json`) taken
whenever a fetch or report runs while `videos/<slug>/` still exists. Deleting the folder afterwards does not lose
them; a video whose folder was deleted before the first run still appears in the report, with those columns empty.

Cost: 2 Analytics API requests per video per fetch (1 quota unit each) plus one `videos.list` call per 50 videos.

### What the numbers mean

| Column | Source | Meaning |
| --- | --- | --- |
| `views` | Analytics `views` | Plays, counted from the first frame (for Shorts: every start and replay) |
| `engaged_views`, `engaged %` | Analytics `engagedViews` | Plays that continued past the first frame; `engaged %` = engagedViews / views |
| `avg s` | `averageViewDuration` | Average seconds watched per play |
| `avg %` | `averageViewPercentage` | Average share of the video watched per play. The report is sorted by this. Can pass 100 when viewers loop |
| `ret 3 s`, `ret 25%`, `ret 50%`, `ret 100%` | retention curve, `audienceWatchRatio` | Share of viewers watching at that point (3 s uses the real duration). Above 100% means rewatching |
| `likes`, `comments`, `shares`, `subs` | Analytics | `subs` = subscribers gained from this video's own watch page |
| `public_views` … (CSV) | Data API `videos.list` | The live public counters, the only figures without a delay |
| `days` | upload record | Days since publishing. Views depend on age; `avg %` and retention mostly do not |

`videos/analytics.md` also compares the series (`what-if-*`, `*-sign` = zodiac, everything else) and shows how
`avg %` moves with average shot length, words per minute, motion and the length of the first line (Pearson r). Any
comparison over fewer than 5 videos is marked **too small to read**; below about 20 videos treat the rest as hints.

`videos/analytics.md` and `videos/analytics.csv` hold private channel data and are gitignored (`videos/analytics.*`).

### What the API does not give (checked November 2026)

- **"Viewed vs swiped away" and "shown in feed"** exist only in YouTube Studio. The API has no such metric.
  `engaged %` is the nearest stand-in, not the same number.
- **No real-time data.** Analytics is 48–72 hours behind (*Data model* page, "data freshness"). A video published in
  the last three days is stored with the public counters only and comes last in the report. Fetch again later.
- **Impressions and click-through rate** are only in the bulk Reporting API's "reach" reports (thumbnail
  impressions), not in these queries, and say little about the Shorts feed.
- **Small videos may have no retention curve**, and demographics / traffic-source detail are withheld below an
  unpublished threshold. The row is then stored without the curve.
- **Revenue** needs a different scope (`yt-analytics-monetary.readonly`) and a monetised channel; it is not asked for.
- The retention curve is one request per video (the API allows only a single video ID there).

Sources: YouTube Analytics API docs — *Channel reports* (Basic stats, Audience retention), *Metrics*, *Data model*,
*reports.query* reference, *Revision history* (30 Apr 2025: Shorts `views` = starts and replays, `engagedViews`
added; 27 Aug 2026: public views counted from the first frame).
