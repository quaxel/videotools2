# Local YouTube uploader: a small web page that lists the rendered videos, fills title / description / tags, and
# uploads with one click — scheduled to go public at a chosen time (YouTube publishes it, this server doesn't need to
# stay running).
#
#   animator/.venv/bin/python uploader/server.py                 http://127.0.0.1:8765
#   animator/.venv/bin/python uploader/server.py --dry-run       whole flow without calling YouTube (nothing is saved as uploaded)
#   animator/.venv/bin/python uploader/server.py --import <slug> add (or refresh) one video in the database and exit
#   animator/.venv/bin/python uploader/server.py --analytics         fetch YouTube Analytics for every uploaded video
#   animator/.venv/bin/python uploader/server.py --analytics-report  write videos/analytics.md + videos/analytics.csv
#   --db PATH, --port N, --out DIR                      another database file / port / report folder (tests)
#
# Everything lives in uploader/uploader.db (SQLite, gitignored). A video is imported once: when output/<slug>.mp4 and
# videos/<slug>/ both exist, its title / description / tags are read from videos/<slug>/youtube.md (or drafted from
# plan.json, lines.json and research.md) and stored. After that only the MP4 is needed; videos/<slug>/ can go.
#
# Credentials (gitignored): uploader/secrets/client_secret.json (OAuth "Desktop app" client from Google Cloud Console)
# and uploader/secrets/token.json (written after "YouTube'a bağlan"). Setup steps: uploader/README.md.
import json
import mimetypes
import os
import re
import sqlite3
import sys
import threading
import time
import uuid
import webbrowser
from contextlib import closing
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import analytics  # noqa: E402  (no Google imports in there; the API clients are built here and passed in)

# The Google client libraries live only in animator/.venv. Started with another python (e.g. `python3 server.py`),
# re-run under the venv so "YouTube'a bağlan" doesn't fail later with "No module named 'google'".
VENV_PY = os.path.join(ROOT, "animator", ".venv", "bin", "python")
try:
    import google_auth_oauthlib  # noqa: F401
except ImportError:
    if os.path.isfile(VENV_PY) and os.path.realpath(sys.executable) != os.path.realpath(VENV_PY):
        os.execv(VENV_PY, [VENV_PY, os.path.abspath(__file__), *sys.argv[1:]])
    sys.exit(f"Google kütüphaneleri yok: {VENV_PY} ile çalıştırın (README'ye bakın).")
SECRETS = os.path.join(HERE, "secrets")
CLIENT_SECRET = os.path.join(SECRETS, "client_secret.json")
TOKEN = os.path.join(SECRETS, "token.json")
# "youtube" (manage) is needed to add the video to the playlist; youtube.upload alone cannot.
SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube"]
# Asked for at every new sign-in but never required for uploading: the user may untick it (the narrower grant is
# stored), a token from before this scope existed keeps working for uploads, and only the analytics fetch asks the
# user to connect again.
ANALYTICS_SCOPE = analytics.ANALYTICS_SCOPE
PLAYLIST = "Explained"  # every upload is added to this playlist of the channel
FETCH_LOCK = threading.Lock()  # the page's analytics fetch runs one at a time
HOST, PORT = "127.0.0.1", int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 8765
DRY_RUN = "--dry-run" in sys.argv
DB_PATH = sys.argv[sys.argv.index("--db") + 1] if "--db" in sys.argv else os.path.join(HERE, "uploader.db")

LIMITS = {"title": 100, "description_bytes": 5000, "tags_chars": 500}
CATEGORIES = {"27": "Education", "24": "Entertainment", "22": "People & Blogs", "28": "Science & Technology", "1": "Film & Animation"}

jobs = {}  # slug -> {state, progress, error, videoId}
jobs_lock = threading.Lock()
auth_state = {"connecting": False, "error": None}


# ---------- database ----------

SCHEMA = """
CREATE TABLE IF NOT EXISTS videos (
    slug       TEXT PRIMARY KEY,
    video_path TEXT NOT NULL,             -- relative to the repository root
    source     TEXT NOT NULL,             -- 'md' (youtube.md) or 'auto' (drafted from plan / lines / research)
    imported   TEXT NOT NULL,             -- JSON {title, description, tags, titleOptions} as imported
    draft      TEXT,                      -- JSON of the user's edits, NULL = unedited
    upload     TEXT,                      -- JSON {videoId, privacy, publishAt, uploadedAt, youtubeStatus, checkedAt}
    archived   INTEGER NOT NULL DEFAULT 0,
    added_at   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
"""


def db():
    """One connection per operation (the upload thread and the request threads never share one)."""
    con = sqlite3.connect(DB_PATH, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    return con


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def init_db():
    with closing(db()) as con, con:
        con.executescript(SCHEMA)
        analytics.migrate(con)  # CREATE TABLE IF NOT EXISTS only
        done = con.execute("SELECT value FROM settings WHERE key = 'migrated_hidden_txt'").fetchone()
    if not done:
        # One-time: the videos listed in the old hidden.txt come in archived, with their metadata read while the
        # folders still exist. Nothing is deleted here.
        try:
            lines = open(os.path.join(HERE, "hidden.txt"), encoding="utf-8").read().splitlines()
        except OSError:
            lines = []
        for slug in {l.split("#")[0].strip() for l in lines} - {""}:
            if os.path.isdir(vdir(slug)) and not get_row(slug):
                import_video(slug, archived=True)
        with closing(db()) as con, con:
            con.execute("INSERT OR REPLACE INTO settings VALUES ('migrated_hidden_txt', ?)", (now(),))
    scan()


def get_row(slug):
    with closing(db()) as con:
        return con.execute("SELECT * FROM videos WHERE slug = ?", (slug,)).fetchone()


def update_row(slug, **cols):
    with closing(db()) as con, con:
        con.execute(f"UPDATE videos SET {', '.join(c + ' = ?' for c in cols)} WHERE slug = ?", (*cols.values(), slug))


def loads(s):
    return json.loads(s) if s else None


def dumps(o):
    return None if o is None else json.dumps(o, ensure_ascii=False)


# ---------- importing from the render folders ----------

def vdir(slug, *p):
    return os.path.join(ROOT, "videos", slug, *p)


def rendered_slugs():
    """Videos worth importing: a videos/<slug>/ folder plus its rendered output/<slug>.mp4 (skips previews and tours)."""
    vroot = os.path.join(ROOT, "videos")
    return sorted(s for s in os.listdir(vroot)
                  if os.path.isdir(os.path.join(vroot, s)) and os.path.isfile(os.path.join(ROOT, "output", s + ".mp4")))


def parse_youtube_md(path):
    """youtube.md -> {title, description, tags}. Handles both '## Title' (one line) and '## Title (pick one)' (a
    numbered list with '← recommended')."""
    if not os.path.isfile(path):
        return {"title": "", "description": "", "tags": [], "titleOptions": []}
    sections, cur = {}, None
    for line in open(path, encoding="utf-8").read().splitlines():
        m = re.match(r"^##\s+(\w+)", line)
        if m:
            cur = m.group(1).lower()
            sections[cur] = []
        elif cur:
            sections[cur].append(line)
    options, title = [], ""
    for line in sections.get("title", []):
        line = line.strip()
        if not line:
            continue
        clean = re.sub(r"\s*←.*$", "", re.sub(r"^\d+[.)]\s*", "", line)).strip()
        options.append(clean)
        if "←" in line and not title:
            title = clean
    title = title or (options[0] if options else "")
    description = "\n".join(sections.get("description", [])).strip()
    tags = [t.strip() for t in " ".join(sections.get("tags", [])).split(",") if t.strip()]
    return {"title": title, "description": description, "tags": tags, "titleOptions": options}


def auto_meta(slug):
    """Draft for a video without youtube.md: title from plan.json, the narration as description, sources from
    research.md. Tags stay empty."""
    def load(name):
        try:
            return json.load(open(vdir(slug, name), encoding="utf-8"))
        except (OSError, ValueError):
            return {}
    title = load("plan.json").get("title", "").strip()
    narration = " ".join(l.get("text", "").strip() for l in load("lines.json").get("lines", []))
    try:
        research = open(vdir(slug, "research.md"), encoding="utf-8").read()
    except OSError:
        research = ""
    urls = list(dict.fromkeys(re.findall(r"https?://[^\s)>\]]+", research)))
    parts = [narration] if narration else []
    if urls:
        parts.append("Sources:\n" + "\n".join("• " + u for u in urls))
    parts.append("#Shorts")
    return {"title": (title + " #Shorts") if title else "", "description": "\n\n".join(parts), "tags": [],
            "titleOptions": [title] if title else []}


def read_folder(slug):
    md = parse_youtube_md(vdir(slug, "youtube.md"))
    if md["title"] or md["description"]:
        return "md", md
    return "auto", auto_meta(slug)


def import_video(slug, archived=False):
    """Add a video, or refresh what was imported for one already in the database (the user's edits stay)."""
    source, meta = read_folder(slug)
    row = get_row(slug)
    if row:
        update_row(slug, source=source, imported=dumps(meta))
        return "updated", source
    draft = upload = None
    try:  # carry over the edits / upload record the earlier file-based version kept in youtube.json
        old = json.load(open(vdir(slug, "youtube.json"), encoding="utf-8"))
        draft, upload = old.get("draft"), old.get("upload")
    except (OSError, ValueError):
        pass
    with closing(db()) as con, con:
        con.execute("INSERT INTO videos VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (slug, os.path.join("output", slug + ".mp4"), source, dumps(meta), dumps(draft), dumps(upload),
                     int(archived), now()))
    return "added", source


def scan():
    """Import newly rendered videos. An auto draft nobody edited is replaced once youtube.md appears (the render is
    finished before make-video writes youtube.md)."""
    with closing(db()) as con:
        rows = {r["slug"]: r for r in con.execute("SELECT slug, source, draft FROM videos")}
    for slug in rendered_slugs():
        r = rows.get(slug)
        if not r:
            import_video(slug)
        elif r["source"] == "auto" and r["draft"] is None and os.path.isfile(vdir(slug, "youtube.md")):
            import_video(slug)


# ---------- videos and metadata ----------

def mp4_path(row):
    return os.path.join(ROOT, row["video_path"])


def video_info(row):
    slug, imported = row["slug"], loads(row["imported"])
    meta = {"title": imported["title"], "description": imported["description"], "tags": imported["tags"],
            "categoryId": "27", "madeForKids": False, "syntheticMedia": False}
    meta.update(loads(row["draft"]) or {})
    with jobs_lock:
        job = dict(jobs.get(slug, {}))
    path = mp4_path(row)
    exists = os.path.isfile(path)
    return {
        "slug": slug,
        "hasMd": row["source"] == "md",
        "titleOptions": imported.get("titleOptions", []),
        "meta": meta,
        "edited": row["draft"] is not None,
        "upload": loads(row["upload"]),
        "archived": bool(row["archived"]),
        "addedAt": row["added_at"],
        "job": job or None,
        "videoPath": row["video_path"],
        "fileMissing": not exists,
        "folderAvailable": os.path.isdir(vdir(slug)),
        "sizeMB": round(os.path.getsize(path) / 1e6, 1) if exists else None,
        "rendered": datetime.fromtimestamp(os.path.getmtime(path)).isoformat(timespec="minutes") if exists else None,
    }


def all_videos():
    with closing(db()) as con:
        rows = con.execute("SELECT * FROM videos ORDER BY added_at DESC, slug").fetchall()
    return [video_info(r) for r in rows]




def tags_length(tags):
    # YouTube counts a tag with spaces as if it were quoted, plus one separator between tags
    return sum(len(t) + (2 if " " in t else 0) for t in tags) + max(len(tags) - 1, 0)


def validate(meta, privacy, publish_at):
    errors = []
    title, desc, tags = meta.get("title", ""), meta.get("description", ""), meta.get("tags", [])
    if not title.strip():
        errors.append("Başlık boş olamaz.")
    if len(title) > LIMITS["title"]:
        errors.append(f"Başlık {len(title)} karakter (en fazla {LIMITS['title']}).")
    if len(desc.encode("utf-8")) > LIMITS["description_bytes"]:
        errors.append(f"Açıklama {len(desc.encode('utf-8'))} bayt (en fazla {LIMITS['description_bytes']}).")
    if re.search(r"[<>]", title + desc):
        errors.append("Başlık ve açıklamada < veya > kullanılamaz.")
    if tags_length(tags) > LIMITS["tags_chars"]:
        errors.append(f"Etiketler toplam {tags_length(tags)} karakter (en fazla {LIMITS['tags_chars']}).")
    if privacy not in ("schedule", "public", "unlisted", "private"):
        errors.append("Geçersiz yayın seçeneği.")
    if privacy == "schedule":
        try:
            when = datetime.fromisoformat(publish_at.replace("Z", "+00:00"))
            if when <= datetime.now(timezone.utc):
                errors.append("Yayın zamanı gelecekte olmalı.")
        except (AttributeError, ValueError):
            errors.append("Yayın tarihi ve saati seçin.")
    return errors


# ---------- YouTube ----------

def write_token(text):
    """Write token.json atomically, so a thread reading it never sees a half-written file."""
    os.makedirs(SECRETS, exist_ok=True)
    tmp = TOKEN + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, TOKEN)


def granted_scopes():
    """The scopes the saved token was granted (only that field of token.json is looked at)."""
    try:
        return set(json.load(open(TOKEN, encoding="utf-8")).get("scopes") or [])
    except (OSError, ValueError):
        return set()


def has_analytics_scope():
    return set(SCOPES) <= granted_scopes() and ANALYTICS_SCOPE in granted_scopes()


def credentials(interactive=False, want_analytics=False):
    """want_analytics (with interactive): also start the Google sign-in when the token works but lacks the analytics
    scope. If that sign-in fails or is abandoned, the old token file is left as it was."""
    from google.auth.exceptions import RefreshError
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials

    creds = None
    if os.path.isfile(TOKEN):
        info = json.load(open(TOKEN, encoding="utf-8"))
        granted = set(info.get("scopes") or [])
        if set(SCOPES) <= granted:  # a token from before an upload scope was added must connect again
            # Keep every granted scope (the analytics one too): a refresh asks for exactly these, and to_json() writes
            # them back, so passing only SCOPES here would silently drop the analytics grant at the first refresh.
            creds = Credentials.from_authorized_user_info(info, SCOPES + sorted(granted - set(SCOPES)))
    if creds and not creds.valid and creds.refresh_token:
        try:
            creds.refresh(Request())
            write_token(creds.to_json())
        except RefreshError:
            creds = None  # revoked, or expired (7 days while the consent screen is in "Testing")
    regrant = want_analytics and not has_analytics_scope()
    if (not creds or not creds.valid or regrant) and interactive:
        from google_auth_oauthlib.flow import InstalledAppFlow

        # Google lets the user untick a scope: accept a narrower grant instead of failing on it, and store what was granted
        os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
        flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET, SCOPES + [ANALYTICS_SCOPE])
        try:  # an abandoned Google sign-in gives up after 5 minutes instead of blocking "YouTube'a bağlan" forever
            creds = flow.run_local_server(port=0, prompt="consent", open_browser=True, timeout_seconds=300)
        except AttributeError:
            raise RuntimeError("Google izni 5 dakika içinde verilmedi; yeniden deneyin.")
        given = creds.granted_scopes or creds.scopes or []
        granted = sorted(set(given.split() if isinstance(given, str) else given))
        if not set(SCOPES) <= set(granted):
            raise RuntimeError("YouTube yükleme ve yönetme izni verilmedi; bağlanırken bu iki izni işaretli bırakın.")
        info = json.loads(creds.to_json())
        info["scopes"] = granted
        creds = Credentials.from_authorized_user_info(info, granted)
        write_token(json.dumps(info))
    return creds if creds and creds.valid else None


def youtube():
    from googleapiclient.discovery import build

    creds = credentials()
    if not creds:
        raise RuntimeError("YouTube bağlantısı yok ya da süresi doldu: “YouTube'a bağlan” ile yeniden bağlanın.")
    return build("youtube", "v3", credentials=creds, cache_discovery=False)


ANALYTICS_HELP = ("YouTube Analytics izni yok: kayıtlı Google izni bu özellikten önce verilmiş (yüklemeler etkilenmez). "
                  "Sayfayı açın (uploader/server.py) → “Analitik” → “Analitik izni ver” ile bir kez yeniden izin verin; "
                  "Google Cloud projesinde “YouTube Analytics API” de açık olmalı (README: Audience analytics).")


def youtube_analytics():
    from googleapiclient.discovery import build

    if not has_analytics_scope():
        raise analytics.AnalyticsError(ANALYTICS_HELP)
    creds = credentials()
    if not creds:
        raise analytics.AnalyticsError("YouTube bağlantısı yok ya da süresi doldu: sayfadan yeniden bağlanın.")
    return build("youtubeAnalytics", "v2", credentials=creds, cache_discovery=False)


def fetch_analytics(log=print):
    """Fetch for every uploaded video into the `analytics` table. --dry-run: no API client is built, nothing is saved."""
    with closing(db()) as con:
        if DRY_RUN:
            return analytics.fetch_all(con, None, None, dry_run=True, log=log)
        yta = youtube_analytics()
        summary = analytics.fetch_all(con, yta, youtube(), log=log)
        analytics.snapshot_production(con, os.path.join(ROOT, "videos"))
        return summary


def auth_status():
    if DRY_RUN:
        return {"connected": True, "channel": "Deneme modu (YouTube'a gönderilmez)", "dryRun": True}
    out = {"connected": False, "hasClientSecret": os.path.isfile(CLIENT_SECRET), "dryRun": False, **auth_state}
    try:
        if credentials():
            items = youtube().channels().list(part="snippet", mine=True).execute().get("items", [])
            out.update(connected=True, channel=items[0]["snippet"]["title"] if items else "(kanal bulunamadı)")
    except Exception as e:  # network or API error: show it, keep the page usable
        out["error"] = str(e)
    return out


def connect(want_analytics=False):
    auth_state.update(connecting=True, error=None)
    try:
        credentials(interactive=True, want_analytics=want_analytics)
    except Exception as e:
        auth_state["error"] = str(e)
    finally:
        auth_state["connecting"] = False


def set_job(slug, **kw):
    with jobs_lock:
        jobs.setdefault(slug, {}).update(kw)


def add_to_playlist(video_id):
    """Add the video to the PLAYLIST playlist. Returns an error message, or None when it worked."""
    try:
        yt, page, playlist_id = youtube(), None, None
        while not playlist_id:
            r = yt.playlists().list(part="snippet", mine=True, maxResults=50, pageToken=page).execute()
            playlist_id = next((p["id"] for p in r.get("items", []) if p["snippet"]["title"].strip() == PLAYLIST), None)
            page = r.get("nextPageToken")
            if not page:
                break
        if not playlist_id:
            return f"Kanalda “{PLAYLIST}” adında bir oynatma listesi bulunamadı."
        # a retry after a lost response must not add the video twice (a playlist allows duplicates)
        there = yt.playlistItems().list(part="id", playlistId=playlist_id, videoId=video_id, maxResults=1).execute()
        if there.get("items"):
            return None
        yt.playlistItems().insert(part="snippet", body={"snippet": {
            "playlistId": playlist_id, "resourceId": {"kind": "youtube#video", "videoId": video_id}}}).execute()
        return None
    except Exception as e:
        return f"Oynatma listesine eklenemedi: {e}"


def upload(slug, meta, privacy, publish_at):
    status = {"selfDeclaredMadeForKids": bool(meta.get("madeForKids")),
              "containsSyntheticMedia": bool(meta.get("syntheticMedia"))}
    if privacy == "schedule":
        status.update(privacyStatus="private", publishAt=publish_at)  # YouTube flips it to public at publishAt
    else:
        status["privacyStatus"] = privacy
    body = {
        "snippet": {"title": meta["title"], "description": meta["description"], "tags": meta["tags"],
                    "categoryId": meta.get("categoryId", "27"), "defaultLanguage": "en", "defaultAudioLanguage": "en"},
        "status": status,
        "paidProductPlacementDetails": {"hasPaidProductPlacement": False},  # always "no paid promotion"
    }
    try:
        if DRY_RUN:
            for i in range(1, 21):
                time.sleep(0.15)
                set_job(slug, state="uploading", progress=i / 20)
            video_id = "dryrun-" + uuid.uuid4().hex[:6]
        else:
            from googleapiclient.http import MediaFileUpload

            media = MediaFileUpload(mp4_path(get_row(slug)), mimetype="video/mp4", chunksize=8 * 1024 * 1024, resumable=True)
            req = youtube().videos().insert(part="snippet,status,paidProductPlacementDetails", body=body, media_body=media)
            resp = None
            while resp is None:
                chunk, resp = req.next_chunk(num_retries=5)
                if chunk:
                    set_job(slug, state="uploading", progress=chunk.progress())
            video_id = resp["id"]
            record = {"videoId": video_id, "privacy": privacy, "publishAt": publish_at if privacy == "schedule" else None,
                      "uploadedAt": now(), "youtubeStatus": resp.get("status", {})}
            update_row(slug, draft=dumps(meta), upload=dumps(record))  # saved before the playlist step can fail
            err = add_to_playlist(video_id)
            record.update(playlist=None if err else PLAYLIST, playlistError=err)
            update_row(slug, upload=dumps(record))
        set_job(slug, state="done", progress=1.0, videoId=video_id, dryRun=DRY_RUN, privacy=privacy,
                publishAt=publish_at if privacy == "schedule" else None)
    except Exception as e:
        set_job(slug, state="error", error=str(e))


def refresh_status(slug):
    """Ask YouTube what happened to an uploaded video (processing, scheduled, public, locked, rejected)."""
    up = loads(get_row(slug)["upload"]) or {}
    if not up.get("videoId"):
        raise RuntimeError("Bu video henüz yüklenmedi.")
    items = youtube().videos().list(part="status", id=up["videoId"]).execute().get("items", [])
    up.update(youtubeStatus=items[0]["status"] if items else {"removed": True}, checkedAt=now())
    if items and not up.get("playlist"):  # the playlist step failed at upload time: try again
        err = add_to_playlist(up["videoId"])
        up.update(playlist=None if err else PLAYLIST, playlistError=err)
    update_row(slug, upload=dumps(up))
    return up


# ---------- HTTP ----------

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send_json(self, obj, code=200):
        data = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def body(self):
        return json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")

    def known_row(self, slug):
        row = get_row(slug)  # the page only ever names a slug; paths come from the database
        if not row:
            self.send_json({"error": "Bilinmeyen video."}, 404)
        return row

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/":
            data = open(os.path.join(HERE, "index.html"), "rb").read()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        elif path == "/api/videos":
            scan()
            self.send_json({"videos": all_videos(), "limits": LIMITS, "categories": CATEGORIES, "dryRun": DRY_RUN})
        elif path == "/api/auth":
            self.send_json(auth_status())
        elif path == "/api/auth/scopes":  # local only: no call to Google
            self.send_json({"analytics": has_analytics_scope(), **auth_state})
        elif path == "/analytics":
            try:
                with closing(db()) as con:
                    rows = analytics.collect(con, os.path.join(ROOT, "videos"))
                data = analytics.render_page(rows, has_analytics_scope(), DRY_RUN).encode()
            except Exception as e:
                return self.send_json({"error": f"Analitik sayfası hazırlanamadı: {e}"}, 500)
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        elif m := re.fullmatch(r"/media/([\w-]+)\.mp4", path):
            if (row := self.known_row(m.group(1))):
                if os.path.isfile(mp4_path(row)):
                    self.stream(mp4_path(row))
                else:
                    self.send_json({"error": "Video dosyası yok."}, 404)
        else:
            self.send_json({"error": "Bulunamadı."}, 404)

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            data = self.body()
        except ValueError:
            return self.send_json({"error": "Geçersiz istek."}, 400)
        if path == "/api/auth/connect":
            if not os.path.isfile(CLIENT_SECRET):
                return self.send_json({"error": "uploader/secrets/client_secret.json bulunamadı (README'ye bakın)."}, 400)
            if not auth_state["connecting"]:
                threading.Thread(target=connect, args=(bool(data.get("analytics")),), daemon=True).start()
            return self.send_json({"ok": True})
        if path == "/api/analytics/fetch":
            if not FETCH_LOCK.acquire(blocking=False):  # one fetch at a time: a second would spend quota on the same rows
                return self.send_json({"error": "Veriler zaten güncelleniyor; bitmesini bekleyin."}, 409)
            try:
                s = fetch_analytics(log=lambda *a: None)
                return self.send_json({"fetched": len(s["fetched"]), "errors": len(s["errors"]), "skipped": len(s["skipped"])})
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)
            finally:
                FETCH_LOCK.release()
        slug = data.get("slug", "")
        row = self.known_row(slug)
        if not row:
            return
        if path == "/api/save":
            update_row(slug, draft=dumps(clean_meta(data.get("meta", {}))))
            self.send_json(video_info(get_row(slug)))
        elif path == "/api/reset":
            update_row(slug, draft=None)
            self.send_json(video_info(get_row(slug)))
        elif path == "/api/archive":
            update_row(slug, archived=int(bool(data.get("archived"))))
            self.send_json(video_info(get_row(slug)))
        elif path == "/api/reimport":
            if not os.path.isdir(vdir(slug)):
                return self.send_json({"error": f"videos/{slug}/ klasörü artık yok."}, 400)
            import_video(slug)
            update_row(slug, draft=None)
            self.send_json(video_info(get_row(slug)))
        elif path == "/api/upload":
            meta = clean_meta(data.get("meta", {}))
            privacy, publish_at = data.get("privacy"), data.get("publishAt")
            if row["upload"]:
                return self.send_json({"error": "Bu video zaten yüklendi."}, 409)
            if not os.path.isfile(mp4_path(row)):
                return self.send_json({"error": f"{row['video_path']} bulunamadı."}, 400)
            with jobs_lock:
                if jobs.get(slug, {}).get("state") in ("uploading", "done"):
                    return self.send_json({"error": "Bu video zaten yüklendi ya da yükleniyor."}, 409)
            errors = validate(meta, privacy, publish_at)
            if errors:
                return self.send_json({"error": " ".join(errors)}, 400)
            set_job(slug, state="uploading", progress=0.0, error=None, videoId=None)
            threading.Thread(target=upload, args=(slug, meta, privacy, publish_at), daemon=True).start()
            self.send_json({"ok": True})
        elif path == "/api/status":
            try:
                self.send_json({"upload": refresh_status(slug)})
            except Exception as e:
                self.send_json({"error": str(e)}, 400)
        else:
            self.send_json({"error": "Bulunamadı."}, 404)

    def stream(self, path):
        """Serve the MP4 with Range support so the preview player can seek."""
        size = os.path.getsize(path)
        start, end = 0, size - 1
        rng = re.match(r"bytes=(\d*)-(\d*)", self.headers.get("Range", ""))
        if rng:
            if rng.group(1):
                start = int(rng.group(1))
                end = int(rng.group(2)) if rng.group(2) else end
            elif rng.group(2):
                start = max(size - int(rng.group(2)), 0)
            end = min(end, size - 1)
        self.send_response(206 if rng else 200)
        self.send_header("Content-Type", mimetypes.guess_type(path)[0] or "video/mp4")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        if rng:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        with open(path, "rb") as f:
            f.seek(start)
            left = end - start + 1
            try:
                while left > 0:
                    chunk = f.read(min(1 << 20, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass


def clean_meta(meta):
    tags = meta.get("tags", [])
    if isinstance(tags, str):
        tags = tags.split(",")
    return {
        "title": str(meta.get("title", "")).strip(),
        "description": str(meta.get("description", "")).strip(),
        "tags": [t.strip() for t in tags if str(t).strip()],
        "categoryId": str(meta.get("categoryId", "27")) if str(meta.get("categoryId", "27")) in CATEGORIES else "27",
        "madeForKids": bool(meta.get("madeForKids")),
        "syntheticMedia": bool(meta.get("syntheticMedia")),
    }


if __name__ == "__main__":
    init_db()
    if "--import" in sys.argv:
        slug = sys.argv[sys.argv.index("--import") + 1]
        if slug not in rendered_slugs():
            sys.exit(f"{slug}: output/{slug}.mp4 ve videos/{slug}/ ikisi de olmalı.")
        import_video(slug)  # refreshes the imported text from the folder; the user's edits stay
        info = video_info(get_row(slug))
        print(f"{slug}: veritabanında ({'youtube.md' if info['hasMd'] else 'otomatik taslak'}), başlık: {info['meta']['title']!r}"
              + (" — kendi düzenlemeleriniz korunuyor" if info["edited"] else ""))
        sys.exit(0)
    if "--analytics" in sys.argv:
        print("YouTube Analytics" + (" (deneme modu: YouTube çağrılmaz, hiçbir şey kaydedilmez)" if DRY_RUN else ""))
        try:
            s = fetch_analytics()
        except analytics.AnalyticsError as e:
            sys.exit(str(e))
        print(f"{len(s['fetched'])} video {'çekilecekti' if DRY_RUN else 'kaydedildi'}, {len(s['skipped'])} atlandı, "
              f"{len(s['errors'])} hata. Rapor: uploader/server.py --analytics-report")
        if "--analytics-report" not in sys.argv:
            sys.exit(1 if s["errors"] else 0)
    if "--analytics-report" in sys.argv:
        out_dir = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else os.path.join(ROOT, "videos")
        with closing(db()) as con:
            if not DRY_RUN:
                analytics.snapshot_production(con, os.path.join(ROOT, "videos"))
            md, csv_path, rows = analytics.write_report(con, os.path.join(ROOT, "videos"), out_dir)
        print(f"{len(rows)} video, {sum(r['avg_view_pct'] is not None for r in rows)} tanesinde analitik verisi → {md}, {csv_path}")
        sys.exit(0)
    url = f"http://{HOST}:{PORT}"
    try:
        server = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError:  # already running (e.g. in another terminal): reuse it
        print(f"Yükleyici zaten çalışıyor: {url} (durdurmak için o terminalde Ctrl+C)", flush=True)
        if "--no-browser" not in sys.argv:
            webbrowser.open(url)
        sys.exit(0)
    print(f"YouTube yükleyici: {url}" + ("  (deneme modu)" if DRY_RUN else ""), flush=True)
    if "--no-browser" not in sys.argv:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
