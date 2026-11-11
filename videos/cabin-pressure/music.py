# Cabin Pressure: the video's own score (run by `pipeline.py music cabin-pressure`, helpers in scripts/music/score.py).
# In D. An airy, ominous hook (wind noise, a high minor cluster, a vibes motif D-F-E-A, a glock giggle under Barry's
# "fantastic"); a calm but uneasy pizzicato pulse under the explanation; a hard brass stab on the door crack and an
# urgent drive whose bass climbs by semitones with the cabin-altitude needle, glock cascade as the masks drop; a
# suspended tritone drone that thins to nothing before "You see"; a dreamy, warped music-box waltz in D major for the
# euphoria (the motif turned sweet), stopwatch ticks; the drive again in D minor for the fix and the dive (a falling
# brass glissando as the nose drops); and the motif warm and in tune on soft horns in D major to the end, released
# 1.5 s before the last frame so nothing rings over the cut back to frame 0.
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "animator", "scripts", "music"))
import instruments as I  # noqa: E402
from dsp import SR, bp, colored, hp, lp, ns, shape, smooth_noise, widen  # noqa: E402
from score import Band, Grid, Video, envelope, finish, mixdown, r  # noqa: E402

F = I.m2f
V = Video(sys.argv[1] if len(sys.argv) > 1 else "cabin-pressure")
fr = lambda f: f / V.fps  # noqa: E731  video frame -> seconds

# Section starts (video frames, from src/videos/cabin-pressure/shots.ts) and the hits inside them.
CUTS = [116, 238, 433, 570, 675, 894, 1167, 1241, 1369, 1475, 1545]
EXPLAIN, DOOR, PSU, DRONE, WALTZ, DRIVE, GEN, DIVE, CALM = (fr(c) for c in (238, 433, 570, 675, 894, 1167, 1241, 1369, 1475))
CRACK = fr(455)  # the seal splits
FANTASTIC = fr(138)  # Barry: "I feel fan-TAS-tic!"
TROUBLE = fr(226)  # "... and he's in trouble."
EIGHT_K = fr(415)  # the gauge reads 8,000
POPS = fr(632)  # the ceiling pops open
DROP = fr(665)  # the masks drop
MINUTE = fr(1133)  # "a minute at most": the stopwatch swings in
PIN = fr(1256)  # the firing pin pops
TEN_K = fr(1432)  # "ten thousand"
HEADLINE = fr(1640)  # MASK FIRST.
END = V.dur
STOP = END - 1.5  # every note is released by here

G, miss = Grid.fit([fr(c) for c in CUTS], V.dur, lo=104, hi=126)
Q = G.q
k_at = lambda t: int(np.ceil(G.index(t) - 1e-6))  # noqa: E731  the first beat at or after t

CH = {
    "Dm": dict(bass=38, up=[62, 65, 69]), "Bb": dict(bass=34, up=[62, 65, 70]), "Gm": dict(bass=43, up=[62, 67, 70]),
    "A": dict(bass=45, up=[61, 64, 69]), "Asus": dict(bass=45, up=[62, 64, 69]), "C": dict(bass=36, up=[60, 64, 67]),
    "D": dict(bass=38, up=[62, 66, 69]), "G": dict(bass=43, up=[62, 67, 71]), "A7": dict(bass=45, up=[61, 67, 69]),
    "Em": dict(bass=40, up=[64, 67, 71]),
}


def air(b, t0, t1, pts, lo=700, hi=5200, track="air"):
    """Wind through the fuselage: gusty band-passed noise, stereo; pts = [(seconds from t0, gain)]."""
    n = ns(t1 - t0)
    rr = r()
    x = bp(colored(n, rr, 0.7), lo, hi, 2)
    g = envelope(n, pts) * (0.7 + 0.3 * smooth_noise(n, rr, 0.6))
    b.add(track, widen(x * g / (np.std(x) + 1e-9), rr, 13, 0.8), t0)


def riser(b, t0, t1, vel, f0=250.0, f1=7000.0, track="riser"):
    """Noise whose band sweeps up and swells into t1."""
    dur = t1 - t0
    n = ns(dur)
    rr = r()
    x = colored(n, rr, 0.3)
    fc = lambda T: f0 * (f1 / f0) ** np.clip(T / dur, 0, 1)  # noqa: E731
    y = shape(x, lambda T, Fq: np.exp(-0.5 * (np.log2(np.maximum(Fq[:, None], 20) / fc(T)[None, :]) / 0.45) ** 2))
    y *= (np.arange(n) / n) ** 2.2 * vel
    b.add(track, widen(y / (np.std(y) + 1e-9) * 0.3, rr, 9, 0.7), t0)


def stab(b, t, notes, vel, bass=None, timp=True):
    for m in notes:
        b.add("stab", I.brass(F(m), 0.24, vel, r(), "stab", scoop=-18), t, (m - 62) / 24)
    if bass is not None:
        b.add("tuba", I.brass(F(bass), 0.35, vel, r(), "tuba"), t, -0.1)
    if timp:
        b.add("timp", I.timpani(F(38), vel, r()), t, -0.1)


def snare(b, k, vel, pattern):
    hits = {"tick": [(0, 0.7)], "drive": [(0, 1.0), (0.25, 0.35), (0.5, 0.65), (0.75, 0.35)], "half": [(0, 1.0), (0.5, 0.5)]}[pattern]
    for off, v in hits:
        b.add("snare", I.snare(vel * v, r(), dur=0.22, snappy=0.8), G.beat(k + off), 0.08)


def roll(b, t0, t1, v0, v1):
    for t, v in I.snare_roll(t0, t1, v0, v1, r()):
        b.add("snare", I.snare(v, r(), dur=0.14, buzz=True), t, 0.08)


def wow(x, depth_ms=3.2, rate=0.5):
    """Tape wow: a slowly wandering delay, so the pitch drifts a few cents sharp and flat (the dreamy waltz)."""
    n = x.shape[1]
    t = np.arange(n) / SR
    d = depth_ms / 1000 * (np.sin(2 * np.pi * rate * t) + 0.45 * np.sin(2 * np.pi * rate * 2.37 * t + 1.1))
    idx = np.arange(n) - d * SR
    for c in range(2):
        x[c] = np.interp(idx, np.arange(n), x[c])


def build():
    b = Band(V.n)
    for name, send in [("air", 0.25), ("pad", 0.3), ("drone", 0.35), ("vibes", 0.3), ("glock", 0.25), ("mbox", 0.3), ("mbox2", 0.3),
                       ("wvibes", 0.32), ("pluck", 0.18), ("tuba", 0.1), ("horn", 0.22), ("stab", 0.2), ("timp", 0.22), ("snare", 0.14),
                       ("cymbal", 0.2), ("tick", 0.1), ("riser", 0.2), ("theme", 0.26)]:
        b.track(name, send)

    # ---- HOOK (0 - 7.9 s): ominous and airy. Wind, a low D drone, a high D-minor add9 cluster, the vibes motif.
    air(b, 0.0, EXPLAIN + 0.3, [(0, 0.35), (1.2, 1.0), (3.6, 0.7), (5.0, 0.9), (EXPLAIN - 0.4, 0.5), (EXPLAIN + 0.3, 0.0)])
    b.add("timp", I.timpani(F(38), 0.45, r(), dur=2.6), 0.0, -0.1)
    b.add("cymbal", I.cymbal(0.22, r(), dur=2.8, bright=0.6), 0.0, 0.1)
    b.add("pad", I.pad([F(38), F(45)], EXPLAIN - 0.2, 0.55, r(), att=1.0, rel=0.8, warm=500), 0.0)
    b.add("pad", I.pad([F(m) for m in (62, 69, 76, 77)], EXPLAIN - 0.4, 0.32, r(), att=1.8, rel=0.9, warm=1600, detune=9), 0.3)
    motif = [(0.0, 74), (1.5, 77), (3.0, 76), (4.5, 69), (8.0, 70), (9.0, 69)]
    for kk, m in motif:
        t = G.beat(1 + kk)
        if t < EXPLAIN - 0.5:
            b.add("vibes", I.vibes(F(m), 0.55, r(), dur=2.4, trem_depth=0.35), t, -0.25)
    b.cue(0.0, f"hook: timpani + soft cymbal on frame 0, wind noise, D drone and a high Dm(add9) cluster; vibes motif D-F-E-A from beat 1 ({G.bpm:.1f} bpm, cuts {miss * 1000:.0f} ms off beats on average)")
    for j, m in enumerate((86, 90, 93, 98)):
        b.add("glock", I.glock(F(m), 0.5 - 0.06 * j, r(), dur=1.2), FANTASTIC + 0.07 * j, 0.3 - 0.15 * j)
    b.cue(FANTASTIC, "glock giggle (D major arpeggio) under Barry's 'fantastic'")
    for t, v in I.snare_roll(TROUBLE - 0.9, TROUBLE, 0.1, 0.35, r()):
        b.add("timp", I.timpani(F(38), v * 0.7, r(), dur=0.5), t, -0.1)
    b.add("timp", I.timpani(F(38), 0.45, r(), dur=2.0), TROUBLE, -0.1)
    b.add("tuba", I.brass(F(38), 1.0, 0.35, r(), "soft"), TROUBLE, -0.1)
    b.cue(TROUBLE, "timpani roll into a low D on 'trouble'")

    # ---- EXPLAIN (7.9 - 14.4 s): calm but uneasy. Pizzicato eighths Dm - Bb - Gm - Asus, soft ticks, a held Eb at the end.
    k0, k1 = k_at(EXPLAIN), k_at(DOOR)
    prog = ["Dm", "Bb", "Gm", "Asus"]
    for k in range(k0, k1):
        c = CH[prog[((k - k0) // 4) % 4]]
        notes = [c["bass"], c["bass"] + 7, c["bass"] + 12, c["bass"] + 7]
        for h in (0, 0.5):
            m = notes[int((k - k0) * 2 + h * 2) % 4]
            b.add("pluck", I.pluck(F(m), 0.55 if h == 0 else 0.35, r(), dur=0.5, bright=0.45), G.beat(k + h), -0.15)
        if (k - k0) % 2 == 1:
            for j, m in enumerate(c["up"]):
                b.add("pluck", I.pluck(F(m + 12), 0.22, r(), dur=0.35, bright=0.6), G.beat(k + 0.5) + 0.006 * j, 0.3)
        b.add("tick", I.brush(0.35, r()), G.beat(k), 0.35)
        if (k - k0) % 4 == 0:
            b.add("timp", I.timpani(F(c["bass"] + 12 if c["bass"] < 40 else c["bass"]), 0.3, r(), dur=1.2), G.beat(k), -0.1)
            b.add("pad", I.pad([F(m) for m in c["up"]], 4 * Q, 0.25, r(), att=0.5, rel=0.6, warm=900), G.beat(k), 0.0)
    b.add("vibes", I.vibes(F(75), 0.4, r(), dur=2.0, trem_depth=0.5), G.beat(k1 - 4), 0.3)
    b.add("glock", I.glock(F(81), 0.45, r(), dur=1.4), EIGHT_K, 0.2)
    b.cue(G.beat(k0), "explain: pizzicato eighths Dm-Bb-Gm-Asus, brush ticks, soft timpani on each bar")
    b.cue(EIGHT_K, "glock ping as the gauge reads 8,000")

    # ---- DOOR + DROP (14.4 - 22.5 s): riser and roll into the crack stab, then an urgent drive, the bass climbing.
    riser(b, DOOR - 0.15, CRACK, 0.9)
    roll(b, DOOR, CRACK - 0.02, 0.15, 0.8)
    stab(b, CRACK, [50, 57, 62, 63, 68, 74], 1.0, bass=26)
    b.add("cymbal", I.cymbal(0.8, r(), dur=2.6), CRACK, 0.0)
    b.cue(CRACK, "HARD STAB on the door crack: Eb/A over D cluster, low brass, timpani, crash")
    k0, k1 = k_at(CRACK + 0.2), k_at(DRONE)
    climb = [38, 39, 40, 41, 42, 43, 44, 45, 46]
    for k in range(k0, k1):
        u = (k - k0) / max(1, k1 - k0)
        root = climb[min(len(climb) - 1, (k - k0) // 2)]
        b.add("tuba", I.brass(F(root), Q * 0.38, 0.55 + 0.3 * u, r(), "tuba"), G.beat(k), -0.1)
        b.add("tuba", I.brass(F(root + 12), Q * 0.3, 0.4 + 0.25 * u, r(), "tuba"), G.beat(k + 0.5), -0.1)
        for h in (0, 0.25, 0.5, 0.75):
            b.add("pluck", I.pluck(F(root + 24 + (7 if h in (0.25, 0.75) else 0)), 0.3 + 0.2 * u, r(), dur=0.25, bright=0.8), G.beat(k + h), 0.3)
        snare(b, k, 0.4 + 0.35 * u, "drive")
        if (k - k0) % 2 == 0:
            for j, m in enumerate((root + 24, root + 27, root + 30)):
                b.add("horn", I.brass(F(m), Q * 0.3, 0.45 + 0.3 * u, r(), "horn", scoop=-10), G.beat(k + 0.5) + 0.005 * j, 0.25 - 0.1 * j)
    b.cue(G.beat(k0), "urgent drive: tuba octaves, pizzicato sixteenths, snare drive; the bass climbs a semitone every 2 beats (the needle)")
    b.add("cymbal", I.cymbal(0.4, r(), dur=1.6), PSU, 0.0)
    b.add("timp", I.timpani(F(43), 0.6, r(), dur=1.2), PSU, -0.1)
    b.cue(PSU, "cymbal + timpani on the cut to the service units")
    stab(b, POPS, [55, 62, 67, 70, 74], 0.8, timp=False)
    for j in range(10):
        b.add("glock", I.glock(F(98 - [0, 2, 3, 5, 7, 8, 10, 12, 14, 15][j]), 0.55 - 0.03 * j, r(), dur=0.9), POPS + 0.045 * j, 0.4 - 0.08 * j)
    b.cue(POPS, "stab + falling glock cascade as the ceiling pops open")
    b.add("timp", I.timpani(F(38), 0.9, r(), dur=2.4), DROP, -0.1)
    b.add("tuba", I.brass(F(26), 0.6, 0.8, r(), "tuba", fall=-3), DROP, -0.1)
    b.cue(DROP, "timpani and a sagging low brass note as the masks drop")

    # ---- DRONE (22.5 - 29.8 s): everything stops; a suspended tritone cluster that thins out to nothing.
    b.add("drone", I.pad([F(m) for m in (50, 57, 63, 68)], WALTZ - DRONE - 0.6, 0.6, r(), att=0.25, rel=0.4, warm=700, detune=12), DRONE)
    b.add("drone", I.pad([F(m) for m in (86, 87)], 3.5, 0.18, r(), att=1.5, rel=1.5, warm=3000, detune=4), DRONE + 1.0)
    for t, m, v in ((DRONE + 0.6, 87, 0.4), (DRONE + 2.3, 81, 0.32), (DRONE + 4.1, 86, 0.24), (DRONE + 5.6, 80, 0.16)):
        b.add("vibes", I.vibes(F(m), v, r(), dur=2.6, trem_depth=0.45), t, 0.35 if m > 82 else -0.35)
    air(b, DRONE, WALTZ - 0.2, [(0, 0.25), (2.0, 0.18), (WALTZ - DRONE - 1.4, 0.0)], lo=2000, hi=9000)
    b.gain("drone", envelope(V.n, [(0, 1), (DRONE + 0.5, 1.0), (DRONE + 3.0, 0.65), (WALTZ - 1.2, 0.12), (WALTZ - 0.5, 0.0), (WALTZ, 1.0)]))
    b.cue(DRONE, "suspended drone: D-A-Eb-Ab cluster, high glassy vibes, thinning out to silence before 'You see'")

    # ---- WALTZ (29.8 - 38.9 s): dreamy, detuned: music box (doubled 16 cents sharp), vibes on 2 and 3, tape wow.
    W = Grid(60.0 / ((DRIVE - WALTZ) / 18), WALTZ, per_bar=3)  # six bars of 3/4 from the cut to the next one
    bars = ["D", "D", "G", "A", "G", "A7"]
    tune = [(0, 0, 1, 81), (0, 1, 1, 78), (0, 2, 1, 81), (1, 0, 2, 86), (1, 2, 1, 85), (2, 0, 1, 83), (2, 1, 1, 79), (2, 2, 1, 83),
            (3, 0, 3, 81), (4, 0, 1, 79), (4, 1, 1, 83), (4, 2, 1, 86), (5, 0, 1, 85), (5, 1, 1, 88), (5, 2, 1, 81)]
    for bar, bt, d, m in tune:
        t = W.beat(bar * 3 + bt)
        b.add("mbox", I.musicbox(F(m), 0.62, r(), dur=1.6 + d * 0.4), t, -0.15)
        b.add("mbox2", I.musicbox(F(m + 0.16), 0.45, r(), dur=1.4 + d * 0.4), t + 0.018, 0.35)
    for i, name in enumerate(bars):
        c = CH[name]
        b.add("wvibes", I.pluck(F(c["bass"] - 12 if c["bass"] > 40 else c["bass"]), 0.5, r(), dur=1.2, bright=0.3), W.bar(i), -0.1)
        for bt in (1, 2):
            for j, m in enumerate(c["up"]):
                b.add("wvibes", I.vibes(F(m + 12 - 0.1), 0.28, r(), dur=0.9, damp=0.5, trem_depth=0.4), W.beat(i * 3 + bt) + 0.008 * j, 0.25 - 0.2 * j)
    b.add("pad", I.pad([F(m) for m in (62, 66, 69, 76)], DRIVE - WALTZ - 0.3, 0.22, r(), att=1.2, rel=0.5, warm=1400, detune=14), WALTZ)
    b.add("glock", I.triangle(0.35, r(), dur=2.0), WALTZ, 0.4)
    b.cue(WALTZ, f"euphoria: music-box waltz in D, six bars of 3/4 at {W.bpm:.1f} bpm, doubled 16 cents sharp, vibes on 2 and 3, tape wow")
    for j, t in enumerate(np.arange(MINUTE, DRIVE - 0.05, Q / 2)):
        b.add("tick", I.pluck(F(96 if j % 2 == 0 else 91), 0.55, r(), dur=0.08, bright=1.0), t, 0.45)
    b.cue(MINUTE, "stopwatch ticks in eighths under 'a minute at most', into the drive")

    # ---- DRIVE (38.9 - 49.2 s): the fix and the dive, D minor, snare sixteenths; pin hit; falling brass as the nose drops.
    stab(b, DRIVE, [50, 57, 62, 65, 69, 74], 0.9, bass=26)
    b.add("cymbal", I.cymbal(0.6, r(), dur=2.0), DRIVE, 0.0)
    k0, k1 = k_at(DRIVE + 0.1), k_at(TEN_K)
    prog = ["Dm", "Dm", "Bb", "C"]
    for k in range(k0, k1):
        u = (k - k0) / max(1, k1 - k0)
        c = CH[prog[((k - k0) // 4) % 4]]
        b.add("tuba", I.brass(F(c["bass"]), Q * 0.38, 0.65, r(), "tuba"), G.beat(k), -0.1)
        b.add("tuba", I.brass(F(c["bass"] + 12), Q * 0.3, 0.45, r(), "tuba"), G.beat(k + 0.5), -0.1)
        for h in (0, 0.25, 0.5, 0.75):
            b.add("pluck", I.pluck(F(c["up"][int(h * 4 + k) % 3] + 12), 0.35, r(), dur=0.22, bright=0.85), G.beat(k + h), 0.3)
        snare(b, k, 0.5 + 0.25 * u, "drive")
        if (k - k0) % 4 == 2:
            for j, m in enumerate(c["up"]):
                b.add("horn", I.brass(F(m), Q * 0.8, 0.6, r(), "horn", scoop=-12), G.beat(k) + 0.005 * j, 0.25 - 0.12 * j)
    b.cue(G.beat(k0), "drive: D minor, tuba octaves, pizzicato sixteenths, snare sixteenths, horn hits")
    stab(b, PIN, [62, 69, 74, 77], 0.8, timp=True)
    b.add("glock", I.glock(F(98), 0.6, r(), dur=1.6), PIN, 0.3)
    b.add("cymbal", I.cymbal(0.5, r(), dur=1.8), PIN, 0.0)
    for j, m in enumerate((62, 65, 69, 74)):
        b.add("horn", I.brass(F(m), Q * 0.9, 0.55 + 0.08 * j, r(), "horn", scoop=-14), PIN + 0.5 + j * Q, 0.1)
    b.cue(PIN, "the pin pops: stab, glock ping, crash; horns climb D-F-A-D (the oxygen flows)")
    b.add("cymbal", I.cymbal(0.45, r(), dur=1.6), DIVE, 0.0)
    for j, m in enumerate((57, 62, 65, 69)):
        b.add("horn", I.brass(F(m), 1.6, 0.6, r(), "horn", scoop=-8, fall=-5), DIVE + 0.9 + 0.01 * j, 0.2 - 0.12 * j)
    for t, v in I.snare_roll(DIVE + 0.9, TEN_K - 0.02, 0.25, 0.7, r()):
        b.add("timp", I.timpani(F(38), v * 0.6, r(), dur=0.4), t, -0.1)
    b.cue(DIVE + 0.9, "the dive: a falling horn glissando (a fifth down) over a timpani roll")
    stab(b, TEN_K, [57, 61, 64, 69], 0.75, bass=33)
    b.add("cymbal", I.cymbal(0.5, r(), dur=2.0), TEN_K, 0.0)
    b.add("pad", I.pad([F(m) for m in (45, 57, 61, 64, 69)], CALM - TEN_K + 0.2, 0.35, r(), att=0.3, rel=0.4, warm=1100), TEN_K)
    b.cue(TEN_K, "'ten thousand': A major stab and a held A chord leading home")

    # ---- RESOLVE (49.2 s - end): warm. The motif in D major on soft horns, pizzicato bass, music box in tune now.
    b.add("cymbal", I.cymbal(0.25, r(), dur=2.5, bright=0.5), CALM, 0.0)
    k0 = k_at(CALM)
    theme = [(0, 1, 62), (1, 1, 66), (2, 1, 64), (3, 1, 69), (4, 1, 67), (5, 1, 66), (6, 1, 64), (7, 2.5, 62)]
    for kk, d, m in theme:
        t = G.beat(k0 + kk)
        dur = min(d * Q * 0.95, STOP - t - 0.12)
        if dur > 0.1:
            b.add("theme", I.brass(F(m), dur, 0.55, r(), "soft", scoop=-10), t, -0.05)
            b.add("theme", I.brass(F(m - 12), dur, 0.35, r(), "soft", scoop=-10), t, 0.05)
    res = ["D", "D", "G", "G", "A", "A", "D", "D", "D", "D"]
    k = k0
    while G.beat(k) < STOP - 0.3:
        c = CH[res[min(len(res) - 1, (k - k0) // 2)]]
        b.add("pluck", I.pluck(F(c["bass"]), 0.5, r(), dur=min(0.9, STOP - G.beat(k)), bright=0.3), G.beat(k), -0.15)
        if (k - k0) % 2 == 1:
            b.add("glock", I.musicbox(F(c["up"][(k - k0) % 3] + 24), 0.35, r(), dur=1.0), G.beat(k + 0.5), 0.3)
        k += 1
    b.add("pad", I.pad([F(m) for m in (50, 57, 62, 66, 69)], STOP - CALM - 0.9, 0.42, r(), att=0.8, rel=0.9, warm=1000), CALM)
    for j, m in enumerate((86, 90, 93)):
        b.add("glock", I.glock(F(m), 0.4 - 0.05 * j, r(), dur=0.8), HEADLINE + 0.05 * j, 0.2)
    b.cue(G.beat(k0), "resolve: the motif D-F#-E-A / G-F#-E-D warm on soft horns, D-G-A-D pizzicato, music box in tune")
    b.cue(HEADLINE, "soft glock D major chime with MASK FIRST.")
    b.cue(STOP, "everything released (1.5 s before the end)")
    return b


BALANCE = {"air": -11.0, "pad": -7.0, "drone": -6.0, "vibes": -7.0, "glock": -10.0, "mbox": -4.0, "mbox2": -9.0, "wvibes": -7.0,
           "pluck": -6.0, "tuba": -5.0, "horn": -7.0, "stab": -3.0, "timp": -6.0, "snare": -8.0, "cymbal": -13.0, "tick": -12.0,
           "riser": -9.0, "theme": -4.0}

if __name__ == "__main__":
    band = build()
    for name in ("mbox", "mbox2", "wvibes"):
        wow(band.tr[name])
    band.tr["air"][:] = hp(lp(band.tr["air"], 9000), 300)
    mix, levels = mixdown(band, BALANCE)
    finish(V, mix, band, levels, f"Grid {G.bpm:.2f} bpm (beats every {Q:.3f} s), fitted on the cuts; waltz on its own 3/4 grid.")
