# Local YouTube uploader: a small web page that lists the rendered videos, fills title / description / tags from
# videos/<slug>/youtube.md, and uploads with one click — scheduled to go public at a chosen time (YouTube publishes it,
# this server doesn't need to stay running).
#
#   .venv/bin/python uploader/server.py             http://127.0.0.1:8765
#   .venv/bin/python uploader/server.py --dry-run   whole flow without calling YouTube (nothing is saved as uploaded)
#
# Credentials (gitignored): uploader/secrets/client_secret.json (OAuth "Desktop app" client from Google Cloud Console)
# and uploader/secrets/token.json (written after "YouTube'a bağlan"). Setup steps: uploader/README.md.
# Edits and upload records live in videos/<slug>/youtube.json; youtube.md stays the source the pipeline writes.
import json
import mimetypes
import os
import re
import sys
import threading
import time
import uuid
import webbrowser
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SECRETS = os.path.join(HERE, "secrets")
CLIENT_SECRET = os.path.join(SECRETS, "client_secret.json")
TOKEN = os.path.join(SECRETS, "token.json")
SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"]
HOST, PORT = "127.0.0.1", 8765
DRY_RUN = "--dry-run" in sys.argv

LIMITS = {"title": 100, "description_bytes": 5000, "tags_chars": 500}
CATEGORIES = {"27": "Education", "24": "Entertainment", "22": "People & Blogs", "28": "Science & Technology", "1": "Film & Animation"}

jobs = {}  # slug -> {state, progress, error, videoId}
jobs_lock = threading.Lock()
auth_state = {"connecting": False, "error": None}


# ---------- videos and metadata ----------

def mp4_path(slug):
    return os.path.join(ROOT, "out", slug + ".mp4")


def hidden():
    """Slugs listed in uploader/hidden.txt (one per line, # comments): videos handled before this page existed."""
    try:
        lines = open(os.path.join(HERE, "hidden.txt"), encoding="utf-8").read().splitlines()
    except OSError:
        return set()
    return {l.split("#")[0].strip() for l in lines} - {""}


def slugs():
    """Videos worth uploading: a videos/<slug>/ folder plus its rendered out/<slug>.mp4 (skips previews and tours),
    minus the hidden ones."""
    vroot = os.path.join(ROOT, "videos")
    skip = hidden()
    return sorted(s for s in os.listdir(vroot)
                  if s not in skip and os.path.isdir(os.path.join(vroot, s)) and os.path.isfile(mp4_path(s)))


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
            return json.load(open(os.path.join(ROOT, "videos", slug, name), encoding="utf-8"))
        except (OSError, ValueError):
            return {}
    title = load("plan.json").get("title", "").strip()
    narration = " ".join(l.get("text", "").strip() for l in load("lines.json").get("lines", []))
    try:
        research = open(os.path.join(ROOT, "videos", slug, "research.md"), encoding="utf-8").read()
    except OSError:
        research = ""
    urls = list(dict.fromkeys(re.findall(r"https?://[^\s)>\]]+", research)))
    parts = [narration] if narration else []
    if urls:
        parts.append("Sources:\n" + "\n".join("• " + u for u in urls))
    parts.append("#Shorts")
    return {"title": (title + " #Shorts") if title else "", "description": "\n\n".join(parts), "tags": [],
            "titleOptions": [title] if title else []}


def state_path(slug):
    return os.path.join(ROOT, "videos", slug, "youtube.json")


def load_state(slug):
    try:
        return json.load(open(state_path(slug), encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save_state(slug, state):
    tmp = state_path(slug) + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    os.replace(tmp, state_path(slug))


def video_info(slug):
    md = parse_youtube_md(os.path.join(ROOT, "videos", slug, "youtube.md"))
    has_md = bool(md["title"] or md["description"])
    if not has_md:
        md = auto_meta(slug)
    state = load_state(slug)
    meta = {"title": md["title"], "description": md["description"], "tags": md["tags"], "categoryId": "27",
            "madeForKids": False, "syntheticMedia": False}
    meta.update(state.get("draft", {}))
    with jobs_lock:
        job = dict(jobs.get(slug, {}))
    return {
        "slug": slug,
        "hasMd": has_md,
        "titleOptions": md["titleOptions"],
        "meta": meta,
        "edited": "draft" in state,
        "upload": state.get("upload"),
        "job": job or None,
        "sizeMB": round(os.path.getsize(mp4_path(slug)) / 1e6, 1),
        "rendered": datetime.fromtimestamp(os.path.getmtime(mp4_path(slug))).isoformat(timespec="minutes"),
    }


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

def credentials(interactive=False):
    from google.auth.exceptions import RefreshError
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials

    creds = Credentials.from_authorized_user_file(TOKEN, SCOPES) if os.path.isfile(TOKEN) else None
    if creds and not creds.valid and creds.refresh_token:
        try:
            creds.refresh(Request())
            open(TOKEN, "w").write(creds.to_json())
        except RefreshError:
            creds = None  # revoked, or expired (7 days while the consent screen is in "Testing")
    if (not creds or not creds.valid) and interactive:
        from google_auth_oauthlib.flow import InstalledAppFlow

        flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET, SCOPES)
        creds = flow.run_local_server(port=0, prompt="consent", open_browser=True)
        os.makedirs(SECRETS, exist_ok=True)
        open(TOKEN, "w").write(creds.to_json())
    return creds if creds and creds.valid else None


def youtube():
    from googleapiclient.discovery import build

    creds = credentials()
    if not creds:
        raise RuntimeError("YouTube bağlantısı yok ya da süresi doldu: “YouTube'a bağlan” ile yeniden bağlanın.")
    return build("youtube", "v3", credentials=creds, cache_discovery=False)


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


def connect():
    auth_state.update(connecting=True, error=None)
    try:
        credentials(interactive=True)
    except Exception as e:
        auth_state["error"] = str(e)
    finally:
        auth_state["connecting"] = False


def set_job(slug, **kw):
    with jobs_lock:
        jobs.setdefault(slug, {}).update(kw)


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
    }
    try:
        if DRY_RUN:
            for i in range(1, 21):
                time.sleep(0.15)
                set_job(slug, state="uploading", progress=i / 20)
            video_id = "dryrun-" + uuid.uuid4().hex[:6]
        else:
            from googleapiclient.http import MediaFileUpload

            media = MediaFileUpload(mp4_path(slug), mimetype="video/mp4", chunksize=8 * 1024 * 1024, resumable=True)
            req = youtube().videos().insert(part="snippet,status", body=body, media_body=media)
            resp = None
            while resp is None:
                chunk, resp = req.next_chunk(num_retries=5)
                if chunk:
                    set_job(slug, state="uploading", progress=chunk.progress())
            video_id = resp["id"]
            state = load_state(slug)
            state["draft"] = meta
            state["upload"] = {"videoId": video_id, "privacy": privacy, "publishAt": publish_at if privacy == "schedule" else None,
                               "uploadedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                               "youtubeStatus": resp.get("status", {})}
            save_state(slug, state)
        set_job(slug, state="done", progress=1.0, videoId=video_id, dryRun=DRY_RUN, privacy=privacy,
                publishAt=publish_at if privacy == "schedule" else None)
    except Exception as e:
        set_job(slug, state="error", error=str(e))


def refresh_status(slug):
    """Ask YouTube what happened to an uploaded video (processing, scheduled, public, locked, rejected)."""
    state = load_state(slug)
    vid = (state.get("upload") or {}).get("videoId")
    if not vid:
        raise RuntimeError("Bu video henüz yüklenmedi.")
    items = youtube().videos().list(part="status", id=vid).execute().get("items", [])
    state["upload"]["youtubeStatus"] = items[0]["status"] if items else {"removed": True}
    state["upload"]["checkedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    save_state(slug, state)
    return state["upload"]


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

    def known_slug(self, slug):
        if slug not in slugs():  # the page only ever names a slug; paths are resolved here
            self.send_json({"error": "Bilinmeyen video."}, 404)
            return False
        return True

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
            self.send_json({"videos": [video_info(s) for s in slugs()], "limits": LIMITS, "categories": CATEGORIES,
                            "dryRun": DRY_RUN})
        elif path == "/api/auth":
            self.send_json(auth_status())
        elif m := re.fullmatch(r"/media/([\w-]+)\.mp4", path):
            if self.known_slug(m.group(1)):
                self.stream(mp4_path(m.group(1)))
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
                threading.Thread(target=connect, daemon=True).start()
            return self.send_json({"ok": True})
        slug = data.get("slug", "")
        if not self.known_slug(slug):
            return
        if path == "/api/save":
            state = load_state(slug)
            state["draft"] = clean_meta(data.get("meta", {}))
            save_state(slug, state)
            self.send_json(video_info(slug))
        elif path == "/api/reset":
            state = load_state(slug)
            state.pop("draft", None)
            save_state(slug, state)
            self.send_json(video_info(slug))
        elif path == "/api/upload":
            meta = clean_meta(data.get("meta", {}))
            privacy, publish_at = data.get("privacy"), data.get("publishAt")
            if load_state(slug).get("upload"):
                return self.send_json({"error": "Bu video zaten yüklendi."}, 409)
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
