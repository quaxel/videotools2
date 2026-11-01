# YouTube Yükleyici

A local page that lists every rendered video (`out/<slug>.mp4`). It fills in the title, description and tags from
`videos/<slug>/youtube.md` and uploads with one button. When you schedule a video, it is uploaded as **private** with
`publishAt`. YouTube itself makes it public at that time, so this page doesn't need to stay open.

```bash
.venv/bin/python uploader/server.py             # http://127.0.0.1:8765 opens
.venv/bin/python uploader/server.py --dry-run   # whole flow without sending anything to YouTube
```

The videos made before this page existed are listed in `uploader/hidden.txt` and don't appear on the page. To show
one again, delete its line. Any video rendered later shows up automatically.

Your edits save automatically to `videos/<slug>/youtube.json`. "youtube.md'ye geri dön" (back to youtube.md) throws
them away. After an upload, the video ID and the schedule are written to the same file, and that video can't be
uploaded a second time.

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
