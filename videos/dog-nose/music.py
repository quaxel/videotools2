# Dog nose: the video's own score (run by `pipeline.py music dog-nose`, helpers in scripts/music/score.py).
# A bouncy cartoon oom-pah in C for the house of smells, light brushes and vibes for the gossip tree, a chase that
# speeds up from 132 to 176 bpm as the chicken smell drags you down the street, a dead stop on the trash can, a
# sparse western stand-off with real silence under the stare, a sad "wah-wah" under "Bro. Get in line." and the theme
# back for the ending, with a snare pickup into the opening downbeat so the Short loops.
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "animator", "scripts", "music"))
import instruments as I  # noqa: E402
from score import Band, Grid, Video, envelope, finish, mixdown, r  # noqa: E402

F = I.m2f
V = Video(sys.argv[1] if len(sys.argv) > 1 else "dog-nose")
fr = lambda frame: frame / 30.0

# Section starts (video frames, the scene's cuts): outside, chicken, the trash can, the punchline, the morning after.
OUT, CHICK, TRASH, SLAM, STARE0, STARE1, BRO, LINE, MORN = (fr(x) for x in (388, 824, 1031, 1057, 1320, 1345, 1383, 1443, 1512))
G = Grid(120.0)  # the opening grid: frame 0 is a downbeat
Q = G.q
beat = lambda t: round(G.index(t))
# The ending runs on its own 120 grid laid back from the end, so the last bar lands exactly on the loop point.
END_BARS = int((V.dur - MORN) / (4 * Q))
GE = Grid(120.0, t0=V.dur - END_BARS * 4 * Q)

THEME = [  # (beat, quarters, midi): a 2-bar cheeky tune in C
    (0, 0.5, 72), (0.5, 0.5, 76), (1, 0.5, 79), (1.5, 0.5, 76), (2, 1, 81), (3, 0.5, 79), (3.5, 0.5, 76),
    (4, 0.5, 74), (4.5, 0.5, 77), (5, 0.5, 81), (5.5, 0.5, 77), (6, 1.5, 79), (7.5, 0.5, 71),
]
PROG = [("C", 36, [55, 60, 64]), ("C", 43, [55, 60, 64]), ("F", 41, [57, 60, 65]), ("G", 43, [55, 59, 62])]


def tune(grid, k0, k1, transpose=0):
    out = []
    k = k0
    while k < k1:
        for b, d, m in THEME:
            if k + b < k1:
                out.append((grid.beat(k + b), min(d, k1 - k - b) * grid.q, m + transpose))
        k += 8
    return out


def oompah(b, grid, k, vel, horns=True):
    _, bass, up = PROG[(k // 4) % 4]
    b.add("tuba", I.brass(F(bass + (7 if k % 2 else 0)), grid.q * 0.55, vel, r(), "tuba"), grid.beat(k), -0.1)
    if horns:
        for j, m in enumerate(up):
            b.add("horn", I.brass(F(m), grid.q * 0.28, vel * 0.55, r(), "horn", scoop=-10), grid.beat(k + 0.5) + 0.004 * j, 0.3 - 0.12 * j)


def stab(b, t, up, bass, vel):
    for m in up + [bass + 12]:
        b.add("stab", I.brass(F(m), 0.22, vel, r(), "stab", scoop=-15), t, (m - 60) / 24)
    b.add("timpani", I.timpani(F(bass), vel, r()), t, -0.1)


def build():
    b = Band(V.n)
    for name, send in [("glock", 0.2), ("vibes", 0.22), ("tuba", 0.08), ("horn", 0.16), ("snare", 0.12), ("brush", 0.1), ("cymbal", 0.16),
                       ("stab", 0.16), ("timpani", 0.18), ("pad", 0.25), ("pluck", 0.16), ("whistle", 0.12), ("trombone", 0.14)]:
        b.track(name, send)

    # HOUSE OF SMELLS: stab on frame 0, oom-pah, glock theme; timpani hits on the monster.
    k1 = beat(OUT)
    stab(b, 0.0, [60, 64, 67], 36, 0.75)
    b.add("cymbal", I.cymbal(0.4, r()), 0.0, 0.0)
    for t, d, m in tune(G, 0, k1):
        b.add("glock", I.glock(F(m), 0.45, r(), dur=0.9), t, -0.25)
    for k in range(0, k1):
        oompah(b, G, k, 0.55)
        b.add("snare", I.snare(0.35 if k % 2 else 0.2, r()), G.beat(k), 0.05)
    for t in (fr(300), fr(334)):
        b.add("timpani", I.timpani(F(31), 0.7, r(), dur=1.2), t, -0.1)
    stab(b, fr(321), [58, 61, 66], 34, 0.6)  # THEY'RE ALIVE: a spooky diminished stab
    b.cue(0.0, "C stab + cymbal on frame 0; oom-pah at 120 bpm with the glock theme")
    b.cue(fr(321), "diminished stab under THEY'RE ALIVE")

    # GOSSIP TREE: brushes, walking pizzicato bass, vibes on the off-beats; a glock ping for each feed card.
    k0, k1 = beat(OUT), beat(CHICK)
    b.add("cymbal", I.cymbal(0.25, r(), dur=1.4), OUT, 0.0)
    walk = [36, 40, 43, 45, 41, 45, 48, 50, 43, 47, 50, 53, 36, 43, 40, 38]
    for k in range(k0, k1):
        b.add("pluck", I.pluck(F(walk[(k - k0) % 16]), 0.75, r(), dur=0.5), G.beat(k), -0.05)
        b.add("brush", I.brush(0.35, r(), swish=k % 2 == 0), G.beat(k), 0.1)
        if k % 2:
            _, _, up = PROG[((k - k0) // 4) % 4]
            for m in up:
                b.add("vibes", I.vibes(F(m + 12), 0.25, r(), dur=0.6), G.beat(k + 0.5), 0.3)
    for t, d, m in tune(G, k0 + 8, k1, transpose=12):
        b.add("vibes", I.vibes(F(m), 0.3, r(), dur=d + 0.3), t, -0.2)
    for at in (661, 691, 718, 755):
        b.add("glock", I.glock(F(96), 0.4, r(), dur=0.8), fr(at), 0.35)
    b.cue(OUT, "gossip: brushes, walking pizzicato bass, vibes; glock pings on the feed cards")

    # CHICKEN CHASE: the tempo ramps from 132 to 176 bpm; snare drive, horn stabs, a bass line climbing in semitones.
    b.add("cymbal", I.cymbal(0.6, r()), fr(863), 0.0)
    stab(b, fr(863), [60, 64, 67, 72], 36, 0.85)
    t, k = fr(863), 0
    while t < TRASH - 0.05:
        u = (t - fr(863)) / (TRASH - fr(863))
        bpm = 132 + 44 * u
        q = 60.0 / bpm
        root = 36 + (k // 8)
        b.add("tuba", I.brass(F(root + (12 if k % 2 else 0)), q * 0.45, 0.6 + 0.2 * u, r(), "tuba"), t, -0.1)
        for h in (0.0, 0.5):
            b.add("snare", I.snare((0.5 if h == 0 else 0.3) + 0.3 * u, r()), t + h * q, 0.05)
        if k % 2 == 1:
            for m in (root + 24, root + 28, root + 31):
                b.add("horn", I.brass(F(m), q * 0.25, 0.4 + 0.3 * u, r(), "horn", scoop=-8), t + 0.5 * q, 0.2)
        if k % 4 == 0:
            b.add("glock", I.glock(F(84 + k // 4), 0.35, r(), dur=0.5), t, -0.3)
        t += q
        k += 1
    for tt, v in I.snare_roll(fr(824), fr(863) - 0.02, 0.1, 0.6, r()):
        b.add("snare", I.snare(v, r(), dur=0.14, buzz=True), tt, 0.05)
    b.cue(fr(824), "snare roll under 'Then suddenly' into the CHICKEN stab")
    b.cue(fr(863), "chase: 132 -> 176 bpm, snare drive, horn stabs, bass climbing in semitones")

    # THE TRASH CAN: dead stop, a crash on the slam, then the stand-off: a low drone, a lonely whistle, soft timpani.
    stab(b, SLAM, [55, 59, 62, 65], 31, 0.9)
    b.add("cymbal", I.cymbal(0.7, r()), SLAM, 0.0)
    b.add("pad", I.pad([F(m) for m in (38, 45, 50)], STARE0 - SLAM - 0.4, 0.4, r(), att=0.6, rel=0.4), SLAM + 0.4, 0.0)
    t0, y = I.whistle([(fr(1120), 0.5, 74, 0.8), (fr(1135), 0.9, 81, 0.8), (fr(1170), 0.4, 79, 0.7), (fr(1182), 1.2, 74, 0.7)], r())
    b.add("whistle", y, t0, 0.0)
    for at in (1211, 1235, 1259, 1283, 1307):
        b.add("timpani", I.timpani(F(38), 0.3, r(), dur=0.8), fr(at), -0.1)
    b.cue(SLAM, "dead stop: crash and a G7 stab on the bin slam; low drone, western whistle, soft timpani")
    b.cue(STARE0, "silence under the stare")

    # BRO. GET IN LINE: a sad trombone wah-wah falling under the deadpan line.
    for i, m in enumerate((58, 57, 56, 55)):
        b.add("trombone", I.brass(F(m), 0.38 if i < 3 else 0.9, 0.6, r(), "horn", scoop=-30, fall=-40 if i == 3 else 0), BRO + i * 0.4, 0.0)
    b.add("pad", I.pad([F(m) for m in (43, 50, 55)], LINE - STARE1, 0.3, r(), att=0.3, rel=0.4), STARE1, 0.0)
    b.cue(BRO, "sad trombone wah-wah under 'Bro. Get in line.'")

    # MORNING AFTER: the theme back, warm, whistled, with a snare pickup into frame 0's stab.
    k0, k1 = 0, END_BARS * 4
    b.add("cymbal", I.cymbal(0.35, r()), GE.beat(0), 0.0)
    for t, d, m in tune(GE, 0, k1 - 2):
        b.add("glock", I.glock(F(m), 0.35, r(), dur=0.9), t, -0.25)
    t0, y = I.whistle([(t, d, m, 0.85) for t, d, m in tune(GE, 0, k1 - 2)], r())
    b.add("whistle", y, t0, 0.0)
    for k in range(k0, k1):
        oompah(b, GE, k, 0.45, horns=k % 2 == 1)
    for tt, v in I.snare_roll(GE.beat(k1 - 2), V.dur - 0.02, 0.25, 0.8, r()):
        b.add("snare", I.snare(v, r(), dur=0.14, buzz=True), tt, 0.05)
    # a small bridge from the line to the morning (the cut at LINE sits before the ending grid)
    for k in range(int((GE.t0 - LINE) / Q)):
        b.add("pluck", I.pluck(F([43, 47, 50, 55][k % 4]), 0.5, r(), dur=0.4), LINE + k * Q, 0.0)
    b.cue(GE.beat(0), "morning: the theme whistled, glock, soft oom-pah; snare pickup into frame 0")
    return b


BALANCE = {"glock": -6.0, "vibes": -6.0, "tuba": -3.0, "horn": -8.0, "snare": -6.0, "brush": -9.0, "cymbal": -12.0, "stab": -2.5,
           "timpani": -6.0, "pad": -5.0, "pluck": -4.0, "whistle": -2.0, "trombone": -2.0}

if __name__ == "__main__":
    band = build()
    mix, levels = mixdown(band, BALANCE)
    finish(V, mix, band, levels, f"Opening grid 120 bpm; chase 132->176 bpm; ending grid 120 bpm from {GE.t0:.2f} s ({END_BARS} bars).")
