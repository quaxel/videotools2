# Pipeline panel, ported from animated-short's `shorts web`: every video's stages (done / stale / missing, run
# times, approvals), one stage at a time run as its own `pipeline.py` subprocess with a live log and a Stop button,
# the approvals, lines.json editing, and what the stages wrote (contact sheet, QA sheets, sync findings, score cue
# sheet, look sheet, report, the MP4 and the score A/B).
#
#   .venv/bin/python scripts/pipeline.py web [--port 8766]      http://127.0.0.1:8766  (the uploader is on 8765)
#
# Local only (127.0.0.1). One job at a time: renders share the GPU and Remotion's temp folders. The job and its log
# live in this process, so reloading the page keeps the running log.
import json
import mimetypes
import os
import re
import signal
import subprocess
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pipeline as P  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
HOST = "127.0.0.1"
SLUG = re.compile(r"^[a-z0-9][a-z0-9-]*$")
LOG_MAX = 5000
# command -> the extra arguments the page may pass (each checked against its pattern)
COMMANDS = {
    "status": {}, "voice": {}, "physics": {}, "check": {}, "sync": {}, "music": {}, "mix": {}, "collide": {}, "motion": {}, "report": {},
    "stills": {"frames": r"\d+(,\d+)*"},
    "render": {"2k": True},
    "qa": {},
    "go": {"to": "|".join(P.STAGES), "2k": True, "plan": True},
    "look": {"refs": r"[\w./~ -]+"},
}
# what the page may open per video, relative to animator/ ({slug} filled in)
FILES = {
    "contact": "videos/{slug}/build/stills/contact.jpg",
    "framing": "videos/{slug}/build/stills/framing.txt",
    "collide": "videos/{slug}/build/collide/collide.txt",
    "sync": "videos/{slug}/build/sync.txt",
    "score": "videos/{slug}/build/score.md",
    "mix": "videos/{slug}/build/mix/mix.md",
    "look": "videos/{slug}/build/look/look.md",
    "sbs": "videos/{slug}/build/look/sbs.jpg",
    "qa": "videos/{slug}/build/qa/qa.md",
    "report": "videos/{slug}/report.md",
    "youtube": "videos/{slug}/youtube.md",
    "lines": "videos/{slug}/lines.json",
    "mp4": "out/{slug}.mp4",
    "draft": "out/drafts/{slug}.mp4",
    "music": "public/videos/{slug}/music.wav",
    "ab": "out/ab/{slug}-score.mp4",
}


class Job:
    def __init__(self, slug, argv):
        self.slug, self.argv, self.lines, self.base, self.rc = slug, argv, [], 0, None
        self.started, self.ended, self.stopped = time.time(), None, False
        self.proc = subprocess.Popen([P.PY, "-u", os.path.join(HERE, "pipeline.py"), *argv], cwd=P.ROOT,
                                     stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True)
        threading.Thread(target=self.pump, daemon=True).start()

    def pump(self):
        """stdout -> lines; a bare \\r (Remotion / ffmpeg progress) overwrites the current line instead of adding one"""
        cur, overwrite = b"", False
        for chunk in iter(lambda: self.proc.stdout.read1(4096), b""):
            for part in re.split(rb"(\r\n|\n|\r)", chunk):
                if part in (b"\n", b"\r\n", b"\r"):
                    self.put(cur, overwrite)
                    cur, overwrite = b"", part == b"\r"
                else:
                    cur += part
        if cur:
            self.put(cur, overwrite)
        self.rc, self.ended = self.proc.wait(), time.time()

    def put(self, raw, overwrite):
        text = raw.decode("utf-8", "replace")
        if overwrite and self.lines:
            self.lines[-1] = text
        else:
            self.lines.append(text)
            if len(self.lines) > LOG_MAX:
                self.base += len(self.lines) - LOG_MAX
                del self.lines[:-LOG_MAX]

    def running(self):
        return self.rc is None

    def stop(self):
        """Ctrl-C to the whole group (pipeline, node, ffmpeg), as in a terminal; the stage's cleanup still runs."""
        if self.running():
            self.stopped = True
            os.killpg(self.proc.pid, signal.SIGINT)

    def info(self, since=0):
        start = max(since - self.base, 0)
        return {"slug": self.slug, "argv": self.argv, "running": self.running(), "rc": self.rc, "stopped": self.stopped,
                "started": self.started, "seconds": round((self.ended or time.time()) - self.started, 1),
                "from": self.base + start, "next": self.base + len(self.lines), "lines": self.lines[start:]}


job = None
lock = threading.Lock()


def slugs():
    root = os.path.join(P.ROOT, "videos")
    return sorted(s for s in os.listdir(root) if SLUG.match(s) and os.path.isdir(os.path.join(root, s)))


def summary(slug, sizes=False):
    """Stages, approvals and the files that exist for one video. `sizes` probes the render (ffprobe, slower)."""
    rows = P.stage_states(slug, probe=sizes)
    runs = P.last_runs(slug)
    given = P.approvals(slug)
    return {
        "slug": slug,
        "stages": [{"stage": s, "state": st, "note": n, "last": runs.get(s, (None,))[0]} for s, st, n in rows],
        "approvals": {g: ("ok" if P.approved(slug, g) else "lapsed" if g in given else "no") for g in P.GATED},
        "files": [k for k, rel in FILES.items() if os.path.exists(os.path.join(P.ROOT, rel.format(slug=slug)))],
        "title": plan_title(slug),
    }


def plan_title(slug):
    try:
        return json.load(open(P.vdir(slug, "plan.json"))).get("title", "")
    except (OSError, ValueError):
        return ""


def command(data):
    """The pipeline.py argv for a request from the page, or an error message."""
    slug, cmd, opts = data.get("slug", ""), data.get("cmd", ""), data.get("opts") or {}
    if not SLUG.match(slug) or slug not in slugs():
        return None, "Bilinmeyen video."
    if cmd not in COMMANDS:
        return None, "Bilinmeyen komut."
    argv = [cmd, slug]
    for key, value in opts.items():
        rule = COMMANDS[cmd].get(key)
        if rule is None:
            return None, f"{cmd} için bilinmeyen seçenek: {key}"
        if rule is True:
            if value:
                argv.append(f"--{key}")
        elif value not in ("", None):
            value = str(value)
            if not re.fullmatch(rule, value):
                return None, f"Geçersiz değer: {key}={value}"
            if key in ("to",):
                argv += [f"--{key}", value]
            else:
                argv.append(os.path.expanduser(value) if key == "refs" else value)
    if cmd == "look" and len(argv) < 3:
        return None, "look için referans klasörü gerekli."
    return argv, None


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

    def do_GET(self):
        url = urlparse(self.path)
        path, q = url.path, parse_qs(url.query)
        if path == "/":
            self.file(os.path.join(HERE, "panel.html"), "text/html; charset=utf-8")
        elif path == "/api/videos":
            self.send_json({"videos": [summary(s) for s in slugs()], "stages": list(P.STAGES), "gates": P.GATES})
        elif m := re.fullmatch(r"/api/video/([\w-]+)", path):
            if m.group(1) not in slugs():
                return self.send_json({"error": "Bilinmeyen video."}, 404)
            self.send_json(summary(m.group(1), sizes=True))
        elif path == "/api/job":
            since = int((q.get("from") or ["0"])[0])
            self.send_json({"job": job.info(since) if job else None})
        elif m := re.fullmatch(r"/files/([\w-]+)/(\w+)", path):
            slug, key = m.group(1), m.group(2)
            if slug not in slugs() or key not in FILES:
                return self.send_json({"error": "Bulunamadı."}, 404)
            full = os.path.join(P.ROOT, FILES[key].format(slug=slug))
            if not os.path.isfile(full):
                return self.send_json({"error": "Dosya yok."}, 404)
            if full.endswith((".mp4", ".wav")):
                self.stream(full)
            else:
                kind = mimetypes.guess_type(full)[0] or "text/plain"
                self.file(full, kind + ("; charset=utf-8" if kind.startswith("text") or kind.endswith("json") else ""), cache=False)
        else:
            self.send_json({"error": "Bulunamadı."}, 404)

    def do_POST(self):
        global job
        path = urlparse(self.path).path
        try:
            data = self.body()
        except ValueError:
            return self.send_json({"error": "Geçersiz istek."}, 400)
        if path == "/api/run":
            argv, error = command(data)
            if error:
                return self.send_json({"error": error}, 400)
            with lock:
                if job and job.running():
                    return self.send_json({"error": f"Çalışan bir iş var: {' '.join(job.argv)}"}, 409)
                job = Job(data["slug"], argv)
            return self.send_json({"job": job.info()})
        if path == "/api/stop":
            if job:
                job.stop()
            return self.send_json({"job": job.info() if job else None})
        slug = data.get("slug", "")
        if slug not in slugs():
            return self.send_json({"error": "Bilinmeyen video."}, 404)
        if path == "/api/approve":
            gate = data.get("gate", "")
            if gate not in P.GATED:
                return self.send_json({"error": "Bilinmeyen onay."}, 400)
            if not data.get("undo") and not os.path.exists(P.GATED[gate](slug)):
                return self.send_json({"error": "Onaylanacak dosya yok."}, 400)
            P.cmd_approve(slug, gate, bool(data.get("undo")))
            return self.send_json(summary(slug, sizes=True))
        if path == "/api/lines":
            text = data.get("text", "")
            try:
                parsed = json.loads(text)
                assert isinstance(parsed.get("lines"), list)
            except (ValueError, AssertionError, AttributeError):
                return self.send_json({"error": "lines.json geçerli JSON değil ya da \"lines\" listesi yok."}, 400)
            with open(P.vdir(slug, "lines.json"), "w") as fh:
                fh.write(text if text.endswith("\n") else text + "\n")
            return self.send_json(summary(slug, sizes=True))
        self.send_json({"error": "Bulunamadı."}, 404)

    def file(self, full, kind, cache=True):
        data = open(full, "rb").read()
        self.send_response(200)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(data)))
        if not cache:
            self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def stream(self, path):
        """Serve an MP4 / WAV with Range support so the player can seek."""
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
        self.send_header("Content-Type", mimetypes.guess_type(path)[0] or "application/octet-stream")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Cache-Control", "no-store")
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


def serve(port=8766, browser=True):
    url = f"http://{HOST}:{port}"
    try:
        server = ThreadingHTTPServer((HOST, port), Handler)
    except OSError:
        print(f"Panel zaten çalışıyor: {url}", flush=True)
        sys.exit(0)
    print(f"Pipeline paneli: {url}", flush=True)
    if browser and "--no-browser" not in sys.argv:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        if job:
            job.stop()


if __name__ == "__main__":
    serve(int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 8766)
