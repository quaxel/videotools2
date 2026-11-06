# Helpers for a video's own score, videos/<slug>/music.py (run by `pipeline.py music <slug>`). The composition
# itself is written per video, the way animated-short composes each short (templates/audio/music.py); this file
# holds what every score needs:
#   Video    the picture's timeline from build/cues.json + timing.json: cuts, whips, dissolves, dips, impacts, spoken lines,
#            in seconds
#   Grid     a beat grid; Grid.fit puts as many cuts as it can on beats
#   Band     named stereo tracks + a cue list (time, what the music does there)
#   mixdown  per-track balance (LU) + two reverbs, like animated-short's render()
#   finish   folds the tail past the end onto the start (the video loops), masters to the library loops' loudness,
#            writes public/videos/<slug>/music.wav (48 kHz, 24-bit stereo) and videos/<slug>/build/score.md
# Instruments are in instruments.py, the DSP kit in dsp.py (both from animated-short, numpy + scipy only).
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import SR, ns, st, pan, place, make_ir, convolve_st, integrated, dbg, hp, read_wav, write_wav, true_peak, rng  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMPACTS = ("boom", "sting", "stamp", "reel-stop", "crack", "splash")
LIBRARY_LOOP = os.path.join(ROOT, "public", "music", "upbeat.wav")  # the loudness the score is mastered to


class Video:
    """One video's picture timeline, all in seconds (frame / fps)."""

    def __init__(self, slug):
        self.slug = slug
        cues = json.load(open(os.path.join(ROOT, "videos", slug, "build", "cues.json")))
        timing = json.load(open(os.path.join(ROOT, "src", "videos", slug, "timing.json")))
        self.fps = cues["fps"]
        self.total = timing["totalFrames"]
        self.dur = self.total / self.fps
        s = lambda f: f / self.fps
        self.shots = [(s(a), s(b), whip) for a, b, whip in cues["shots"]]
        self.cuts = [a for a, _, _ in self.shots[1:]]
        self.whips = [a for a, _, t in self.shots[1:] if t is True]
        self.dissolves = [a for a, _, t in self.shots[1:] if t == "dissolve"]
        self.dips = [a for a, _, t in self.shots[1:] if t == "dip"]
        self.sfx = [{**e, "t": s(e["at"])} for e in cues["sfx"]]
        self.impacts = sorted({round(e["t"], 3) for e in self.sfx if any(k in e["src"] for k in IMPACTS)})
        self.lines = [(s(l["from"]), s(l["to"]), l["text"]) for l in timing.get("lines", [])]
        self.library = cues.get("library", cues["music"])  # the scene's own music cues: where it wanted which mood
        self.n = ns(self.dur)

    def shot_at(self, t):
        return next((i for i, (a, b, _) in enumerate(self.shots) if a <= t < b), len(self.shots) - 1)

    def line_at(self, t):
        return next((i for i, (a, b, _) in enumerate(self.lines) if a <= t < b), None)

    def frame(self, t):
        return round(t * self.fps)


class Grid:
    """Beats at t0 + k * 60 / bpm, `per_bar` to a bar."""

    def __init__(self, bpm, t0=0.0, per_bar=4):
        self.bpm, self.t0, self.per_bar = bpm, t0, per_bar
        self.q = 60.0 / bpm

    def beat(self, k):
        return self.t0 + k * self.q

    def bar(self, k):
        return self.beat(k * self.per_bar)

    def index(self, t):
        return (t - self.t0) / self.q

    def snap(self, t):
        return self.beat(round(self.index(t)))

    @staticmethod
    def fit(times, dur, lo=100, hi=140, per_bar=4):
        """A grid with a downbeat on frame 0 and a whole number of beats over the video (it loops, so the last beat
        leads straight into the first), at the tempo in lo..hi bpm that puts `times` (cuts, hits) closest to beats.
        Whole bars over the video win over a closer fit with a half bar left over. Returns (Grid, mean miss in s)."""
        ts = np.array(times or [0.0])
        best = None
        for k in range(int(np.ceil(dur * lo / 60)), int(dur * hi / 60) + 1):
            q = dur / k
            ph = ts / q
            miss = float(np.abs(ph - np.round(ph)).mean() * q)
            key = (k % per_bar != 0, miss)
            if best is None or key < best[0]:
                best = (key, 60.0 / q, miss)
        _, bpm, miss = best
        return Grid(bpm, 0.0, per_bar), miss


class Band:
    def __init__(self, n):
        self.n = n
        self.tr = {}
        self.send = {}
        self.cues = []

    def track(self, name, send=0.15):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, self.n + ns(4.0)))  # 4 s of room for tails past the end (finish folds them)
            self.send[name] = send
        return self.tr[name]

    def add(self, name, x, t, p=0.0, g=1.0):
        if t < 0 or t >= self.n / SR + 4.0:
            return
        place(self.track(name), pan(x, p) if np.ndim(x) == 1 else x, t, g)

    def cue(self, t, what):
        self.cues.append((t, what))

    def gain(self, name, env):
        """Multiply a track by an envelope over the video (len n, the rest held at its last value)."""
        buf = self.track(name)
        e = np.concatenate([env, np.full(buf.shape[1] - len(env), env[-1])])
        buf *= e[None, :]


def envelope(n, points):
    """Piecewise-linear gain over n samples from (seconds, gain) points."""
    ts = np.arange(n) / SR
    return np.interp(ts, [p[0] for p in points], [p[1] for p in points])


def mixdown(b, balance, ref=-20.0, room=(1.3, 7), hall_send=0.7):
    """Every track to `ref + balance[name]` LU (measured on its own active span), dry + one room reverb on the sends."""
    ir = make_ir(room[0], room[1], pre=0.014, hf=1.5)
    n = max(x.shape[1] for x in b.tr.values())
    dry, wet = np.zeros((2, n)), np.zeros((2, n))
    levels = {}
    for k, x in b.tr.items():
        if not np.any(x):
            continue
        L = integrated(x)
        target = ref + balance.get(k, -6.0)
        x = x * dbg(target - L)
        levels[k] = (round(L, 1), round(target, 1))
        dry += x
        wet += b.send[k] * x
    rev = convolve_st(wet.mean(0), ir)[:, :n]
    out = hp(dry + hall_send * rev, 30, 2)
    return out, levels


def finish(video, x, band, levels, notes=""):
    """Fold everything past the end back onto the start (the last frame plays into frame 0, so a tail that rings
    out over the cut belongs there), master to the library loop's loudness, write the WAV and the cue sheet."""
    n = video.n
    y = x[:, :n].copy()
    tail = x[:, n:]
    live = np.nonzero(np.abs(tail).max(0) > 1e-5)[0]
    k = min(int(live[-1]) + 1 if len(live) else 0, n)
    y[:, :k] += tail[:, :k]
    lib, _ = read_wav(LIBRARY_LOOP)
    target = integrated(st(lib[0]))  # the mono loop plays on both speakers
    y *= dbg(target - integrated(y))
    peak = true_peak(y)
    if peak > -1.0:
        y *= dbg(-1.0 - peak)
    wav = os.path.join(ROOT, "public", "videos", video.slug, "music.wav")
    os.makedirs(os.path.dirname(wav), exist_ok=True)
    write_wav(wav, y, 24)
    sheet = os.path.join(ROOT, "videos", video.slug, "build", "score.md")
    rows = [f"# {video.slug}: score cue sheet\n", f"Written by `videos/{video.slug}/music.py`. {notes}".strip() + "\n",
            f"- {video.dur:.3f} s, {n} samples, 48 kHz stereo; integrated {integrated(y):.1f} LUFS (library loop {target:.1f}), "
            f"true peak {true_peak(y):.1f} dBTP; tail folded onto the start: {k / SR:.2f} s\n",
            "| time s | frame | shot | line | music |", "|---|---|---|---|---|"]
    for t, what in sorted(band.cues):
        li = video.line_at(t)
        rows.append(f"| {t:.2f} | {video.frame(t)} | {video.shot_at(t) + 1} | {'' if li is None else li + 1} | {what} |")
    rows += ["", "| track | measured LU | set to LU |", "|---|---|---|"] + [f"| {k} | {a} | {b} |" for k, (a, b) in levels.items()]
    open(sheet, "w").write("\n".join(rows) + "\n")
    print(f"score: {os.path.relpath(wav, ROOT)} ({video.dur:.2f} s, {integrated(y):.1f} LUFS), cue sheet {os.path.relpath(sheet, ROOT)}")


R = rng(1944)


def r():
    """A fresh seeded generator for one note (deterministic: the same score every run)."""
    return rng(int(R.integers(1 << 30)))
