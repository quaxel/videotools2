# The saloon piano of "The Measure", synthesised (no piano in the sound library or the score kit).
# A honky-tonk upright: every note is three slightly detuned strings (the beating is the honky-tonk sound) with
# stretched harmonics, a felt hammer thump and a damper on key-up.
#
#   .venv/bin/python videos/olcu/piano.py day <seconds> <finale_at> <out.wav>
#       a C-major stride rag; from `finale_at` on the pianist plays to the crowd: one grand false ending after
#       another; the last 0.35 s is the lid slamming on his hands (a smashed cluster and a wooden thud).
#   .venv/bin/python videos/olcu/piano.py night <seconds> <out.wav>
#       the rag's tune, right hand only, slow, in A minor, with a hesitation or two; ends on a held note.
import sys
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def note(n, dur, vel=0.7, release=0.09):
    """One key: three detuned strings, stretched partials, hammer noise, damped at `dur`."""
    f0 = midi(n)
    length = dur + release * 4
    t = np.arange(int(length * SR)) / SR
    out = np.zeros_like(t)
    B = 0.00035
    bright = 0.55 + 0.45 * vel
    for detune in (-9, 0, 8):  # cents: the out-of-tune upright
        f = f0 * 2 ** (detune / 1200)
        for k in range(1, 12):
            fk = k * f * np.sqrt(1 + B * k * k)
            if fk > SR * 0.45:
                break
            amp = (bright ** (k - 1)) / k ** 0.9
            tau = 2.8 * (262 / f0) ** 0.45 / (1 + 0.35 * k)
            out += amp * np.exp(-t / tau) * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28))
    # hammer thump
    thump = rng.normal(0, 1, int(0.012 * SR)) * np.exp(-np.arange(int(0.012 * SR)) / (0.003 * SR))
    out[: len(thump)] += thump * 0.25 * vel
    # damper
    env = np.ones_like(t)
    off = int(dur * SR)
    env[off:] = np.exp(-(t[off:] - dur) / release)
    attack = np.minimum(1, t / 0.002)
    return out * env * attack * vel / 9


class Roll:
    def __init__(self, seconds):
        self.buf = np.zeros(int((seconds + 3) * SR))

    def play(self, at, notes, dur, vel=0.7):
        for n in notes if isinstance(notes, (list, tuple)) else [notes]:
            x = note(n, dur, vel * rng.uniform(0.9, 1.05))
            i = int((at + rng.uniform(-0.006, 0.006)) * SR)  # human timing
            if i < 0:
                continue
            j = min(len(self.buf), i + len(x))
            self.buf[i:j] += x[: j - i]


# chords as (bass root, chord tones) in midi
CH = {
    "C": (36, [52, 55, 60]),
    "F": (41, [53, 57, 60]),
    "G7": (43, [53, 55, 59]),
    "A7": (45, [52, 55, 61]),
    "D7": (38, [54, 57, 60]),
    "Am": (45, [52, 57, 60]),
    "Dm": (38, [53, 57, 62]),
    "E7": (40, [52, 56, 62]),
}
PROG = ["C", "C", "F", "F", "C", "A7", "D7", "G7", "C", "C", "F", "F", "C", "G7", "C", "C"]
# right-hand tune: per bar, (offset in eighths, midi, length in eighths); a syncopated rag line
TUNE = [
    [(0, 72, 1), (1, 76, 1), (2, 79, 1.5), (3.5, 76, 0.5)],
    [(0, 74, 1), (1, 72, 1), (2, 76, 2)],
    [(0, 77, 1), (1, 81, 1), (2, 84, 1.5), (3.5, 81, 0.5)],
    [(0, 79, 1), (1, 77, 1), (2, 76, 2)],
    [(0, 76, 0.5), (0.5, 79, 0.5), (1, 84, 1), (2, 83, 1), (3, 81, 1)],
    [(0, 79, 1.5), (1.5, 76, 0.5), (2, 73, 2)],
    [(0, 74, 1), (1, 78, 1), (2, 81, 1.5), (3.5, 78, 0.5)],
    [(0, 79, 1), (1, 77, 1), (2, 74, 1), (3, 71, 1)],
]


def day(seconds, finale_at, out):
    bpm = 104
    q = 60 / bpm  # quarter note; bar = 2 quarters (2/4 stride)
    e = q / 2
    r = Roll(seconds)
    slam = seconds - 0.35
    t, bar = 0.0, 0
    while t < min(finale_at, slam):
        root, tones = CH[PROG[bar % len(PROG)]]
        r.play(t, [root, root + 12], q * 0.9, 0.75)  # oom
        r.play(t + q, tones, q * 0.7, 0.55)  # pah
        for off, n, ln in TUNE[bar % len(TUNE)]:
            if t + off * e < finale_at:
                r.play(t + off * e, [n, n - 12] if bar % 8 in (4, 5) else n, ln * e * 0.95, 0.72)
        t += 2 * q
        bar += 1
    # the crowd is watching: grand false endings until the lid comes down
    t = max(t, finale_at)
    k = 0
    while t < slam - 0.3:
        # a rising run, a tremolo on the big chord, a crashing final chord, a held breath... and again
        run = [60, 64, 67, 72, 76, 79, 84, 88] if k % 2 == 0 else [62, 65, 69, 74, 77, 81, 86, 89]
        for i, n in enumerate(run):
            r.play(t + i * 0.07, n, 0.12, 0.6 + i * 0.03)
        t += len(run) * 0.07
        chord = [72, 76, 79, 84] if k % 2 == 0 else [74, 77, 81, 86]
        for i in range(10):  # tremolo
            r.play(t + i * 0.085, chord[:2] if i % 2 == 0 else chord[2:], 0.1, 0.55 + 0.04 * i)
        t += 10 * 0.085
        r.play(t, [36, 48, 60, 64, 67, 72, 76, 84], 1.2, 1.0)  # the "final" chord
        t += 1.25 + 0.15 * (k % 3)
        k += 1
    # the lid: a smashed cluster of keys and a wooden thud
    r.play(slam, list(range(57, 70)), 0.25, 0.9)
    thud_n = int(0.25 * SR)
    thud = rng.normal(0, 1, thud_n)
    thud = np.convolve(thud, np.ones(60) / 60, mode="same") * np.exp(-np.arange(thud_n) / (0.04 * SR))
    i = int(slam * SR)
    r.buf[i : i + thud_n] += thud * 1.6
    finish(r.buf[: int(seconds * SR)], out, tail=0)


def night(seconds, out):
    bpm = 62
    e = 60 / bpm / 2
    r = Roll(seconds)
    t, bar = 0.4, 0
    minor = {72: 69, 76: 72, 79: 76, 74: 71, 77: 74, 81: 77, 84: 81, 83: 80, 73: 72, 78: 76, 71: 68}
    while t < seconds - 2.5:
        for off, n, ln in TUNE[bar % len(TUNE)]:
            m = minor.get(n, n - 3)
            jitter = 0.12 if (bar, off) == (1, 2) else 0  # a hesitation
            if t + off * e + jitter < seconds - 2.5:
                r.play(t + off * e + jitter, m, ln * e * 1.1, 0.5)
        t += 4 * e + (0.35 if bar == 2 else 0)
        bar += 1
    r.play(t, 69, 2.0, 0.45)  # the last note, held
    finish(r.buf[: int(seconds * SR)], out, tail=0.6)


def finish(x, out, tail):
    # a little room: two early reflections and a short smear
    y = x.copy()
    for d, g in ((0.017, 0.25), (0.031, 0.18), (0.053, 0.1)):
        k = int(d * SR)
        y[k:] += x[:-k] * g
    y = y / (np.max(np.abs(y)) + 1e-9) * 0.7
    if tail:
        n = int(tail * SR)
        y[-n:] *= np.linspace(1, 0, n)
    stereo = np.stack([y, np.roll(y, int(0.0007 * SR))], 1)
    with wave.open(out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(stereo, -1, 1) * 32767).astype(np.int16).tobytes())
    print("ok", out, f"{len(y) / SR:.2f}s")


if __name__ == "__main__":
    kind = sys.argv[1]
    if kind == "day":
        day(float(sys.argv[2]), float(sys.argv[3]), sys.argv[4])
    else:
        night(float(sys.argv[2]), sys.argv[3])
