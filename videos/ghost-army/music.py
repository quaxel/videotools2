# Ghost Army: the video's own score (run by `pipeline.py music ghost-army`, helpers in scripts/music/score.py).
# A cheeky WWII field march in F, played straight while the GIs lift the rubber tank, light for the secret unit,
# turned into a D-minor spy pulse for the deception (speakers, fake radio), a dark held drone for the night column,
# and the march again, soft and whistled, for the sunrise. It ends on a snare pickup into the opening stab, so the
# loop's last frame lands on frame 0's downbeat.
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "scripts", "music"))
import instruments as I  # noqa: E402
from score import Band, Grid, Video, envelope, finish, mixdown, r  # noqa: E402

F = I.m2f
V = Video(sys.argv[1] if len(sys.argv) > 1 else "ghost-army")

# Section starts: the cuts the scene's own music cues changed mood on (story, deception, night column, sunrise).
# Patterns run on the beat grid; each section's accent (cymbal, stab) sits on the cut itself.
STORY, RISE, NIGHT, DAWN = (V.cuts[i] for i in (3, 7, 14, 15))
G, miss = Grid.fit(V.cuts + V.impacts, V.dur, lo=112, hi=132)
Q = G.q
beat = lambda t: round(G.index(t))  # the beat nearest a time
b0 = {k: beat(t) for k, t in (("story", STORY), ("rise", RISE), ("night", NIGHT), ("dawn", DAWN))}
END = beat(V.dur)

# Theme: (bar, beat, quarters, midi), a 4-bar march tune in F for the fife and the whistler.
THEME = [
    (0, 0, 1, 84), (0, 1, .5, 81), (0, 1.5, .5, 82), (0, 2, 1, 84), (0, 3, 1, 77),
    (1, 0, .75, 86), (1, .75, .25, 84), (1, 1, .5, 82), (1, 1.5, .5, 81), (1, 2, 1, 79), (1, 3, 1, 72),
    (2, 0, 1, 81), (2, 1, .5, 79), (2, 1.5, .5, 81), (2, 2, 1, 82), (2, 3, 1, 86),
    (3, 0, .5, 84), (3, .5, .5, 82), (3, 1, .5, 81), (3, 1.5, .5, 79), (3, 2, 2, 77),
]
MAJOR = ["F", "F", "F", "F", "Bb", "Bb", "C", "C", "F", "F", "Bb", "Bb", "C7", "C7", "F", "F"]
CH = {
    "F": dict(bass=(41, 36), up=[57, 60, 65]), "Bb": dict(bass=(46, 41), up=[58, 62, 65]),
    "C": dict(bass=(36, 43), up=[55, 60, 64]), "C7": dict(bass=(36, 43), up=[55, 58, 64]),
    "Dm": dict(bass=(38, 45), up=[57, 62, 65]), "Gm": dict(bass=(43, 38), up=[55, 58, 62]),
    "A": dict(bass=(45, 40), up=[57, 61, 64]), "Bbm": dict(bass=(46, 41), up=[58, 61, 65]),
}


def theme(k0, bars=(0, 1, 2, 3), until=None):
    """The theme's `bars`, in that order, from beat k0: [(t, seconds, midi)]. Notes are cut at beat `until` (the next
    section), so a phrase never runs on under the next one."""
    out = []
    for i, bar in enumerate(bars):
        for b, bt, d, m in THEME:
            k = k0 + i * 4 + bt
            if b == bar and (until is None or k < until):
                out.append((G.beat(k), (min(k + d, until) - k if until is not None else d) * Q, m))
    return out


def oompah(b, k, chord, vel, horns=True):
    """Tuba on the beat (root / fifth alternating), horns on the off-beat."""
    c = CH[chord]
    b.add("tuba", I.brass(F(c["bass"][k % 2]), Q * 0.6, vel, r(), "tuba"), G.beat(k), -0.1)
    if horns:
        for j, m in enumerate(c["up"]):
            b.add("horn", I.brass(F(m), Q * 0.3, vel * 0.6, r(), "horn", scoop=-12), G.beat(k + 0.5) + 0.004 * j, 0.3 - 0.12 * j)


def snare(b, k, vel, pattern="march"):
    """One beat of field snare: the march's accent and ghost notes, or a straight drive in sixteenths."""
    hits = {"march": [(0, 1.0), (0.75, 0.45)], "light": [(0, 0.7)], "drive": [(0, 1.0), (0.25, 0.4), (0.5, 0.7), (0.75, 0.4)]}[pattern]
    for off, v in hits:
        b.add("snare", I.snare(vel * v, r()), G.beat(k + off), 0.05)


def roll(b, t0, t1, v0, v1):
    for t, v in I.snare_roll(t0, t1, v0, v1, r()):
        b.add("snare", I.snare(v, r(), dur=0.14, buzz=True), t, 0.05)


def melody(b, track, notes, vel, fn, p=0.0, transpose=0):
    for t, d, m in notes:
        m += transpose
        x = {"fife": lambda: I.fife(F(m), d * 0.9, vel, r()), "glock": lambda: I.glock(F(m), vel, r()),
             "pluck": lambda: I.pluck(F(m), vel, r(), dur=0.5, bright=0.7), "musicbox": lambda: I.musicbox(F(m), vel, r())}[fn]()
        b.add(track, x, t, p)


def stab(b, t, chord, vel):
    for j, m in enumerate(CH[chord]["up"] + [CH[chord]["bass"][0] + 12]):
        b.add("stab", I.brass(F(m), 0.22, vel, r(), "stab", scoop=-15), t, (m - 60) / 24)
    b.add("timpani", I.timpani(F(CH[chord]["bass"][0]), vel, r()), t, -0.1)


def build():
    b = Band(V.n)
    for name, send in [("fife", 0.16), ("whistle", 0.1), ("glock", 0.2), ("tuba", 0.08), ("horn", 0.16), ("snare", 0.12),
                       ("cymbal", 0.16), ("stab", 0.16), ("timpani", 0.18), ("pad", 0.25), ("pluck", 0.16), ("musicbox", 0.24)]:
        b.track(name, send)

    # HOOK: a full stab on frame 0 (the loop's downbeat), then the march straight, fife on the theme.
    stab(b, 0.0, "F", 0.8)
    b.add("cymbal", I.cymbal(0.45, r()), 0.0, 0.0)
    hook = theme(0, (0, 1), until=b0["story"])
    melody(b, "fife", hook, 0.6, "fife", 0.2)
    melody(b, "glock", hook, 0.35, "glock", -0.3, transpose=12)
    for k in range(0, b0["story"]):
        oompah(b, k, MAJOR[k % 16], 0.62)
        snare(b, k, 0.55, "march")
    b.cue(0.0, f"F stab + cymbal on frame 0; march at {G.bpm:.1f} bpm (whole bars over the video, cuts {miss * 1000:.0f} ms off beats on average)")
    for t in V.impacts:
        if t < STORY:
            b.add("timpani", I.timpani(F(41), 0.5, r(), dur=1.0), t, -0.1)
            b.cue(t, "timpani on the impact")

    # STORY: the secret unit, light: pizzicato bass, glock on the theme, snare on the beat only.
    k0 = b0["story"]
    b.add("cymbal", I.cymbal(0.25, r(), dur=1.2), STORY, 0.0)
    melody(b, "glock", theme(k0, (0, 1, 2), until=b0["rise"]), 0.45, "glock", -0.3, transpose=12)
    for k in range(k0, b0["rise"]):
        c = CH[MAJOR[(k - k0) % 16]]
        b.add("pluck", I.pluck(F(c["bass"][k % 2]), 0.8, r(), dur=0.6), G.beat(k), -0.05)
        if k % 2:
            for m in c["up"][1:]:
                b.add("pluck", I.pluck(F(m), 0.35, r(), dur=0.35, bright=0.6), G.beat(k + 0.5), 0.25)
        snare(b, k, 0.35, "light")
    roll(b, G.beat(b0["rise"] - 1), G.beat(b0["rise"]) - 0.02, 0.2, 0.55)
    b.cue(STORY, "story: cymbal on the cut, then light, pizzicato bass, glock theme, snare on the beat")

    # RISE: the deception, D-minor spy pulse: tuba pedal, pizzicato eighths, snare drive building to the night.
    k0, k1 = b0["rise"], b0["night"]
    minor = ["Dm", "Dm", "Gm", "A"]
    for k in range(k0, k1):
        c = CH[minor[((k - k0) // 4) % 4]]
        u = (k - k0) / max(1, k1 - k0)
        b.add("tuba", I.brass(F(c["bass"][0]), Q * 0.5, 0.5 + 0.3 * u, r(), "tuba"), G.beat(k), -0.1)
        for h in (0, 0.5):
            b.add("pluck", I.pluck(F(c["up"][int(2 * h + k) % 3]), 0.45 + 0.3 * u, r(), dur=0.3, bright=0.8), G.beat(k + h), 0.3)
        snare(b, k, 0.35 + 0.4 * u, "drive" if u > 0.5 else "march")
        if k % 4 == 0:
            b.add("glock", I.glock(F(86 + (k - k0) // 8), 0.25 + 0.2 * u, r(), dur=0.6), G.beat(k), -0.35)
    melody(b, "fife", theme(k0 + 16, (0, 3), until=k1), 0.45, "fife", 0.2, transpose=-3)
    roll(b, G.beat(k1 - 4), G.beat(k1) - 0.03, 0.3, 1.0)
    b.cue(G.beat(k0), "deception: D-minor spy pulse, tuba pedal, pizzicato eighths, snare march into a drive")
    b.cue(G.beat(k0 + 16), "fife takes the theme down a minor third")
    b.cue(G.beat(k1 - 4), "snare roll crescendo into the night column")

    # NIGHT: the real tanks roll the other way: everything stops, a low drone and soft timpani on the beat.
    k0, k1 = b0["night"], b0["dawn"]
    stab(b, NIGHT, "Bbm", 0.7)
    b.add("pad", I.pad([F(m) for m in (38, 50, 57, 62)], DAWN - NIGHT + 0.3, 0.55, r(), att=0.15, rel=0.5), NIGHT, 0.0)
    for k in range(k0 + 1, k1):
        b.add("timpani", I.timpani(F(38), 0.35, r(), dur=0.9), G.beat(k), -0.1)
    b.cue(NIGHT, "night: Bb-minor stab on the cut and the sting, then a D-minor drone and soft timpani on every beat")

    # DAWN: the march once more, soft, with a whistler; snare pickup into the loop's first downbeat.
    k0 = b0["dawn"]
    b.add("cymbal", I.cymbal(0.3, r()), DAWN, 0.0)
    # first bar and the closing bar, ending on F before the snare pickup takes the last two beats
    dawn = theme(k0, (0, 3), until=END - 2)
    t0, y = I.whistle([(t, d, m, 0.9) for t, d, m in dawn], r())
    b.add("whistle", y, t0, 0.0)
    melody(b, "musicbox", dawn, 0.35, "musicbox", -0.3, transpose=12)
    for k in range(k0, END):
        oompah(b, k, MAJOR[(k - k0) % 16], 0.45, horns=k % 2 == 1)
        snare(b, k, 0.3, "light")
    roll(b, G.beat(END - 2), V.dur - 0.02, 0.25, 0.8)
    b.cue(DAWN, "sunrise: cymbal on the cut; the theme whistled, music box an octave up, soft oom-pah")
    b.cue(G.beat(END - 2), "snare pickup into frame 0's stab (the loop)")

    # Under the voice the bed stays low (the engine ducks it further while a line plays).
    b.gain("snare", envelope(V.n, [(0, 1), (V.dur, 1)]))
    return b


BALANCE = {"fife": -2.0, "whistle": -1.0, "glock": -6.0, "tuba": -2.5, "horn": -8.0, "snare": -5.0, "cymbal": -12.0,
           "stab": -2.0, "timpani": -6.0, "pad": -4.0, "pluck": -4.0, "musicbox": -5.0}

if __name__ == "__main__":
    band = build()
    mix, levels = mixdown(band, BALANCE)
    finish(V, mix, band, levels, f"Grid {G.bpm:.2f} bpm, {END} beats; sections start on beats {b0}.")
