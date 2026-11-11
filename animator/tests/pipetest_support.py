"""Shared fixtures for the pipeline tests: load scripts/pipeline.py and scripts/scaffold.py as modules, and point them
at a throwaway tree so nothing reads or writes the real videos/, output/ or src/videos/, and nothing external runs.

The temp tree mirrors the repo:

    <tmp>/                      REPO
    <tmp>/videos/<slug>/        VIDEOS
    <tmp>/output/               OUT
    <tmp>/animator/             ROOT (src/engine/clock.tsx, src/videos/<slug>/, public/videos/<slug>/)
"""
import contextlib
import importlib.util
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import types
import unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
ANIMATOR = os.path.dirname(HERE)
SCRIPTS = os.path.join(ANIMATOR, "scripts")
FIXTURES = os.path.join(HERE, "fixtures")

# an old, fixed time for every input file, so "newer than" never depends on how fast a test runs
T0 = 1_700_000_000.0


def _load(name):
    spec = importlib.util.spec_from_file_location(f"_under_test_{name}", os.path.join(SCRIPTS, f"{name}.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


pipeline = _load("pipeline")
scaffold = _load("scaffold")

CLOCK_TSX = "export const FADE = 8;\nexport const DISSOLVE = 12;\nexport const DIP = 12;\n"


class Blocked(AssertionError):
    pass


def blocked_run(*cmd, **kw):
    raise Blocked(f"pipeline.run called unexpectedly: {cmd}")


def blocked_subprocess_run(cmd, *a, **kw):
    raise Blocked(f"subprocess.run called unexpectedly: {cmd}")


def fake_subprocess(run=blocked_subprocess_run):
    """A stand-in for pipeline's `subprocess` module: only `run` (a guard unless given) and the real error class."""
    return types.SimpleNamespace(run=run, CalledProcessError=subprocess.CalledProcessError)


def raw_frames(frames):
    """A fake ffmpeg: `subprocess.run` that answers any call with the frames as rawvideo rgb24 bytes."""
    import numpy as np

    data = np.asarray(frames, dtype=np.uint8).tobytes()
    return fake_subprocess(lambda cmd, *a, **kw: types.SimpleNamespace(stdout=data, returncode=0))


def completed(cmd=(), code=0, out=""):
    return subprocess.CompletedProcess(list(cmd), code, out, "")


def scene_src(shots, extra=""):
    """A Scene.tsx with a SHOTS array: shots = [(from, to | "T", name, trans)], trans True / False / "dip" / "dissolve"."""
    lit = lambda t: "true" if t is True else "false" if t is False else f'"{t}"'
    rows = "\n".join(f"  [{a}, {'TIMING.totalFrames' if b == 'T' else b}, {n}, {lit(t)}]," for a, b, n, t in shots)
    return f'import TIMING from "./timing.json";\n{extra}\nconst SHOTS: Shot[] = [\n{rows}\n];\n'


def valid_shots(total=None, body=10, body_len=150, trans="dip"):
    """Three hook beats (1 s each, ending at frame 90) and `body` body shots of `body_len` frames; the last ends at
    TIMING.totalFrames. Returns (shots, total)."""
    beats = [(0, 30, "H1", False), (30, 60, "H2", False), (60, 90, "H3", False)]
    rows, a = [], 90
    for k in range(body):
        rows.append((a, a + body_len, f"S{k + 1}", False if k == 0 else trans))
        a += body_len
    total = total or a
    rows[-1] = (rows[-1][0], "T", rows[-1][2], rows[-1][3])
    return beats + rows, total


GOOD_PLAN = {
    "title": "Test",
    "locations": [{"id": f"loc{k}"} for k in range(8)],
    "characters": [{"id": f"c{k}"} for k in range(4)],
    "gags": [{"line": 0, "what": "a"}, {"line": 1, "what": "b"}],
    "seed": {"what": "x", "first_line": 0},
}


class Tree:
    """The temp repo tree and the helpers that write into it."""

    def __init__(self, root):
        self.repo = root
        self.root = os.path.join(root, "animator")
        self.videos = os.path.join(root, "videos")
        self.out = os.path.join(root, "output")
        for d in (self.videos, self.out, os.path.join(self.root, "src", "videos"), os.path.join(self.root, "src", "engine"),
                  os.path.join(self.root, "scripts")):
            os.makedirs(d, exist_ok=True)
        self.write(os.path.join(self.root, "src", "engine", "clock.tsx"), CLOCK_TSX, T0)
        self.write(os.path.join(self.root, "remotion.config.ts"), "// config\n", T0)

    def vdir(self, slug, *p):
        return os.path.join(self.videos, slug, *p)

    def sdir(self, slug, *p):
        return os.path.join(self.root, "src", "videos", slug, *p)

    def public(self, slug, *p):
        return os.path.join(self.root, "public", "videos", slug, *p)

    @staticmethod
    def write(path, text, mtime=None):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(text if isinstance(text, str) else json.dumps(text, indent=1))
        if mtime is not None:
            os.utime(path, (mtime, mtime))
        return path

    @staticmethod
    def touch(path, mtime):
        os.utime(path, (mtime, mtime))

    def timing(self, slug, total, lines=None, mtime=T0):
        lines = lines if lines is not None else [{"i": 0, "speaker": "narrator", "text": "one two", "from": 0, "to": 40}]
        return self.write(self.sdir(slug, "timing.json"), {"fps": 30, "totalFrames": total, "lines": lines}, mtime)

    def scene(self, slug, shots, extra="", mtime=T0):
        return self.write(self.sdir(slug, "Scene.tsx"), scene_src(shots, extra), mtime)

    def plan(self, slug, plan=None, mtime=T0):
        return self.write(self.vdir(slug, "plan.json"), plan if plan is not None else GOOD_PLAN, mtime)

    def video(self, slug, shots=None, total=None, plan=None):
        """A video with a valid scene (or `shots`), timing and plan, all at T0."""
        if shots is None:
            shots, total = valid_shots()
        self.timing(slug, total)
        self.scene(slug, shots)
        self.plan(slug, plan)
        return shots, total

    def copy_fixture(self, slug):
        src = os.path.join(FIXTURES, slug)
        os.makedirs(self.vdir(slug), exist_ok=True)
        os.makedirs(self.sdir(slug), exist_ok=True)
        shutil.copy(os.path.join(src, "plan.json"), self.vdir(slug, "plan.json"))
        shutil.copy(os.path.join(src, "lines.json"), self.vdir(slug, "lines.json"))
        shutil.copy(os.path.join(src, "timing.json"), self.sdir(slug, "timing.json"))


class PipelineCase(unittest.TestCase):
    """Every test gets its own tree; pipeline and scaffold point at it, and run / subprocess / whisper / the Remotion
    temp cleanup are stubbed (a call nobody expected fails the test)."""

    def setUp(self):
        self._tmp = tempfile.mkdtemp(prefix="pipeline-test-")
        self.addCleanup(shutil.rmtree, self._tmp, ignore_errors=True)
        self.t = Tree(self._tmp)
        self.p = pipeline
        patches = [
            mock.patch.object(pipeline, "ROOT", self.t.root),
            mock.patch.object(pipeline, "REPO", self.t.repo),
            mock.patch.object(pipeline, "VIDEOS", self.t.videos),
            mock.patch.object(pipeline, "OUT", self.t.out),
            mock.patch.object(pipeline.heavy_lock, "PATH", os.path.join(self.t.root, "out", "heavy.lock")),
            mock.patch.object(pipeline, "run", blocked_run),
            mock.patch.object(pipeline, "subprocess", fake_subprocess()),
            mock.patch.object(pipeline, "bundle_dir", lambda: "/nonexistent/bundle"),
            mock.patch.object(pipeline, "clean_remotion_temp", lambda since: None),
            mock.patch.object(pipeline, "audio_metrics", self._no_whisper),
            mock.patch.object(scaffold, "ROOT", self.t.root),
            mock.patch.object(scaffold, "REPO", self.t.repo),
            mock.patch.dict(os.environ, {"NO_HEAVY_LOCK": "1"}),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)

    @staticmethod
    def _no_whisper(path):
        raise Blocked(f"audio_metrics (whisper) called unexpectedly on {path}")

    def quiet(self, fn, *a, **kw):
        """(result, stdout) of fn, with SystemExit returned as the result instead of raised."""
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(io.StringIO()):
            try:
                res = fn(*a, **kw)
            except SystemExit as e:
                res = e
        return res, buf.getvalue()
