# Synthesises every sound effect and the two music loops from scratch (no samples, no licences to track).
# Run with any Python that has numpy + scipy, e.g. the Qwen venv:
#   ../tts/qwen/.venv/bin/python scripts/sfx_generate.py
# Writes public/sfx/*.wav and public/music/*.wav (48 kHz, 16-bit mono). Deterministic: same files every run.
import os
import wave

import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(7)


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def env(sec, attack=0.002, decay=0.2):
    t = t_axis(sec)
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)


def noise(sec):
    return rng.standard_normal(int(sec * SR))


def band(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "bandpass", fs=SR, output="sos"), x)


def low(x, hz, order=2):
    return sosfilt(butter(order, hz, "lowpass", fs=SR, output="sos"), x)


def high(x, hz, order=2):
    return sosfilt(butter(order, hz, "highpass", fs=SR, output="sos"), x)


def sweep(f0, f1, sec, curve="exp"):
    t = t_axis(sec)
    f = f0 * (f1 / f0) ** (t / sec) if curve == "exp" else f0 + (f1 - f0) * t / sec
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def tone(hz, sec, harmonics=(1.0,)):
    t = t_axis(sec)
    return sum(a * np.sin(2 * np.pi * hz * (k + 1) * t) for k, a in enumerate(harmonics))


def mix(*parts):
    """Sum sounds of different lengths, padding the shorter ones with silence."""
    out = np.zeros(max(len(p) for p in parts))
    for p in parts:
        out[: len(p)] += p
    return out


def place(buf, x, at):
    i = int(at * SR)
    n = min(len(x), len(buf) - i)
    if n > 0:
        buf[i : i + n] += x[:n]


def save(name, x, peak=0.89):
    x = np.asarray(x, dtype=np.float64)
    x = x / (np.abs(x).max() + 1e-9) * peak
    path = os.path.join(ROOT, "public", name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())
    print(f"{name:28s} {len(x) / SR:5.2f}s")


def loop_fade(x, sec=0.01):
    """Tiny fades at both ends so a looping file does not click."""
    n = int(sec * SR)
    x[:n] *= np.linspace(0, 1, n)
    x[-n:] *= np.linspace(1, 0, n)
    return x


# ---------- sound effects ----------

def click(sec=0.012, lo=1800, hi=5000):
    return band(noise(sec), lo, hi) * env(sec, 0.0005, sec / 4)


def reel_spin():
    # Ratchet clicks at ~24 Hz over a soft motor whir; 2 s, loops cleanly.
    sec = 2.0
    out = low(noise(sec), 400) * 0.25
    for k in range(int(sec * 24)):
        place(out, click(0.01) * (0.8 + 0.2 * rng.random()), k / 24 + rng.random() * 0.004)
    return loop_fade(out)


def reel_stop():
    x = sweep(170, 85, 0.18) * env(0.18, 0.001, 0.05) * 1.2
    place(x, click(0.02, 900, 4000) * 0.9, 0)
    place(x, tone(1180, 0.15) * env(0.15, 0.001, 0.04) * 0.25, 0.002)
    return x


def near_miss():
    # Two drooping "wah" notes, cartoon disappointment.
    out = np.zeros(int(1.1 * SR))
    for at, f0, f1, d in [(0.0, 392, 370, 0.32), (0.36, 349, 300, 0.7)]:
        t = t_axis(d)
        vib = 1 + 0.012 * np.sin(2 * np.pi * 6 * t)
        f = (f0 + (f1 - f0) * t / d) * vib
        ph = 2 * np.pi * np.cumsum(f) / SR
        saw = sum(np.sin(k * ph) / k for k in range(1, 9))
        note = low(saw, 1400) * np.minimum(1, t / 0.03) * np.exp(-t / (d * 0.9))
        place(out, note, at)
    return out


def chime(base=1318.5, sec=1.2):
    return tone(base, sec, (1.0, 0.0, 0.45, 0.0, 0.25)) * env(sec, 0.001, 0.35) + tone(base * 2.76, sec) * env(sec, 0.001, 0.08) * 0.2


def button():
    return mix(click(0.008, 2500, 7000), tone(2100, 0.03) * env(0.03, 0.0005, 0.006) * 0.4)


def bill_whirr():
    sec = 1.2
    t = t_axis(sec)
    motor = sum(np.sin(2 * np.pi * 58 * k * t) / k for k in range(1, 7))
    grind = band(noise(sec), 600, 2500) * (0.5 + 0.5 * np.sin(2 * np.pi * 31 * t))
    shape = np.minimum(1, t / 0.08) * np.minimum(1, (sec - t) / 0.15)
    return (low(motor, 900) * 0.6 + grind * 0.25) * shape


def credit_blip():
    return np.sign(sweep(1400, 900, 0.07)) * env(0.07, 0.001, 0.03) * 0.5


def whoosh(sec=0.8, up=True):
    n = noise(sec)
    t = t_axis(sec)
    out = np.zeros_like(n)
    steps = 24
    for k in range(steps):
        a, b = int(k * len(n) / steps), int((k + 1) * len(n) / steps)
        c = 300 * (12 ** (k / steps if up else 1 - k / steps))
        out[a:b] = band(n, c * 0.7, c * 1.6)[a:b]
    return out * np.sin(np.pi * t / sec) ** 2


def tape_stop():
    sec = 0.9
    t = t_axis(sec)
    f = 420 * (1 - t / sec) ** 2 + 30
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone_ = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph)) * (1 - t / sec)
    return low(tone_, 2500) + low(noise(sec), 800) * 0.08 * (1 - t / sec)


def hum():
    # Electronic hum inside the cabinet with a faint status beep; 4 s loop.
    sec = 4.0
    out = tone(55, sec, (1.0, 0.5, 0.3, 0.15)) * 0.5 + low(noise(sec), 300) * 0.15
    for at in (0.5, 2.5):
        place(out, tone(1760, 0.06) * env(0.06, 0.002, 0.03) * 0.25, at)
    return loop_fade(out)


def stamp():
    x = sweep(110, 55, 0.22) * env(0.22, 0.001, 0.07)
    place(x, low(noise(0.05), 1200) * env(0.05, 0.0005, 0.012) * 1.4, 0)
    place(x, high(noise(0.03), 3000) * env(0.03, 0.0005, 0.008) * 0.5, 0.004)
    return x


def tick():
    return mix(click(0.006, 2500, 6000), tone(1600, 0.015) * env(0.015, 0.0005, 0.004) * 0.5)


def boom():
    sec = 1.6
    return sweep(70, 28, sec) * env(sec, 0.004, 0.5) + low(noise(sec), 200) * env(sec, 0.002, 0.25) * 0.5


def paper():
    sec = 1.0
    t = t_axis(sec)
    flutter = np.abs(low(rng.standard_normal(len(t)), 30)) * 6
    return band(noise(sec), 2000, 7000) * flutter * np.sin(np.pi * t / sec)


def ambience():
    # Casino floor: murmuring crowd, distant slot jingles and coins; 8 s loop.
    sec = 8.0
    t = t_axis(sec)
    murmur = low(noise(sec), 420, 4) * (0.7 + 0.3 * np.abs(low(rng.standard_normal(len(t)), 2)) * 4)
    out = murmur * 0.6
    for _ in range(9):
        at = rng.random() * (sec - 1.5)
        base = [1046.5, 1318.5, 1568.0, 2093.0][rng.integers(4)]
        for j in range(4):
            place(out, chime(base * (1.25 ** j), 0.5) * 0.05, at + j * 0.07)
    for _ in range(6):
        place(out, tone(3200 + rng.random() * 900, 0.08) * env(0.08, 0.0005, 0.02) * 0.04, rng.random() * (sec - 0.2))
    return loop_fade(out)


# ---------- music ----------

def note_hz(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def epiano(hz, sec):
    t = t_axis(sec)
    x = np.sin(2 * np.pi * hz * t) + 0.35 * np.sin(2 * np.pi * 2 * hz * t) * np.exp(-t / 0.3) + 0.12 * np.sin(2 * np.pi * 3 * hz * t) * np.exp(-t / 0.1)
    return x * np.minimum(1, t / 0.004) * np.exp(-t / 0.9)


def bass(hz, sec):
    t = t_axis(sec)
    x = np.sin(2 * np.pi * hz * t) + 0.3 * np.sin(2 * np.pi * 2 * hz * t)
    return low(x, 600) * np.minimum(1, t / 0.006) * np.exp(-t / 0.35)


def kick():
    return sweep(120, 45, 0.25) * env(0.25, 0.001, 0.09)


def hat(sec=0.05):
    return high(noise(sec), 7000) * env(sec, 0.0005, 0.012)


def snare():
    return mix(band(noise(0.18), 1500, 6000) * env(0.18, 0.001, 0.05), tone(190, 0.1) * env(0.1, 0.001, 0.03) * 0.5)


def lounge():
    # 112 BPM, swung, Cmaj7 - Am7 - Dm7 - G7, 8 bars: light and a little cheeky.
    bpm = 112
    beat = 60 / bpm
    bars = 8
    out = np.zeros(int(bars * 4 * beat * SR) + SR)
    chords = [[48, 52, 55, 59], [45, 52, 55, 60], [50, 53, 57, 60], [43, 53, 55, 59]]
    swing = beat * 0.62
    for bar in range(bars):
        root = chords[bar % 4][0]
        voicing = [n + 12 for n in chords[bar % 4]]
        b0 = bar * 4 * beat
        for b in (1, 2.5 if bar % 2 else 3):
            for n in voicing[1:]:
                place(out, epiano(note_hz(n), beat * 1.4) * 0.16, b0 + b * beat)
        for b, step in ((0, 0), (1, 7), (2, 12), (3, 10 if bar % 2 else 7)):
            place(out, bass(note_hz(root - 12 + step), beat * 0.9) * 0.55, b0 + b * beat)
        for b in (0, 2):
            place(out, kick() * 0.5, b0 + b * beat)
        for b in (1, 3):
            place(out, snare() * 0.12, b0 + b * beat)
        for b in range(4):
            place(out, hat() * 0.12, b0 + b * beat)
            place(out, hat() * 0.07, b0 + b * beat + swing)
        if bar % 4 == 3:
            for j, n in enumerate((84, 88, 91, 96)):
                place(out, chime(note_hz(n), 0.6) * 0.05, b0 + 3 * beat + j * beat / 4)
    return loop_fade(out[: int(bars * 4 * beat * SR)])


def mystery():
    # 84 BPM, Am - F - Dm - E, 4 bars: dark pad, heartbeat bass, ticking hats, sparse music-box notes.
    bpm = 84
    beat = 60 / bpm
    bars = 4
    length = bars * 4 * beat
    out = np.zeros(int(length * SR) + SR)
    chords = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]]
    for bar in range(bars):
        b0 = bar * 4 * beat
        sec = 4 * beat
        t = t_axis(sec)
        pad = np.zeros(len(t))
        for n in chords[bar]:
            for det in (-0.12, 0.12):
                ph = 2 * np.pi * note_hz(n + det) * t
                pad += sum(np.sin(k * ph) / k for k in range(1, 6))
        pad = low(pad, 900) * np.minimum(1, t / 0.6) * np.minimum(1, (sec - t) / 0.4)
        place(out, pad * 0.045, b0)
        root = chords[bar][0] - 24
        for b in range(4):
            place(out, bass(note_hz(root), beat * 0.5) * 0.5, b0 + b * beat)
            place(out, bass(note_hz(root), beat * 0.3) * 0.3, b0 + b * beat + beat * 0.28)
            for s in range(4):
                place(out, hat(0.03) * (0.06 if s else 0.09), b0 + b * beat + s * beat / 4)
        for j, n in enumerate(chords[bar]):
            if (bar + j) % 2 == 0:
                place(out, chime(note_hz(n + 24), 0.9) * 0.04, b0 + (j * 1.33) * beat)
    return loop_fade(out[: int(length * SR)])


# ---------- added later (generated after the originals so their random draws, and files, stay the same) ----------

def saw(hz, sec, n=12):
    t = t_axis(sec)
    return sum(np.sin(2 * np.pi * hz * k * t) / k for k in range(1, n + 1))


def pop():
    # Bubbly pop for a sign or label popping in.
    return mix(sweep(320, 1100, 0.07) * env(0.07, 0.001, 0.035), click(0.01, 2500, 7000) * 0.4)


def drawer():
    # Cash drawer sliding out on rollers, then hitting its stop.
    slide = band(noise(0.32), 300, 1800) * np.minimum(1, t_axis(0.32) / 0.05) * 0.5
    rollers = sum(click(0.006, 1200, 3000) for _ in range(1)) * 0.3
    out = slide.copy()
    for k in range(9):
        place(out, rollers, 0.02 + k * 0.032)
    return mix(out, np.concatenate([np.zeros(int(0.3 * SR)), tone(95, 0.25) * env(0.25, 0.001, 0.06) + low(noise(0.25), 400) * env(0.25, 0.001, 0.03) * 0.6]))


def card():
    # A card slid across a counter or swiped.
    sec = 0.16
    x = band(noise(sec), 2500, 9000) * np.sin(np.pi * t_axis(sec) / sec) ** 2
    return mix(x * 0.7, click(0.008, 3000, 8000) * 0.3)


def door():
    # Creaking door, then a soft shut.
    sec = 0.7
    t = t_axis(sec)
    wobble = 190 + 40 * np.sin(2 * np.pi * 3.1 * t) + 25 * low(rng.standard_normal(len(t)), 20) * 6
    creak = band(np.sign(np.sin(2 * np.pi * np.cumsum(wobble) / SR)) * 0.5, 300, 3000) * np.minimum(1, t / 0.08) * np.minimum(1, (sec - t) / 0.1)
    thud = tone(80, 0.3) * env(0.3, 0.001, 0.07) + low(noise(0.3), 300) * env(0.3, 0.001, 0.04)
    return mix(creak * 0.35, np.concatenate([np.zeros(int(0.62 * SR)), thud]))


def sting():
    # Twist stinger: a low hit under a dark brassy minor chord and a cymbal wash.
    sec = 1.8
    t = t_axis(sec)
    chord = sum(low(saw(note_hz(n), sec), 1600) for n in (45, 48, 52, 57)) * np.exp(-t / 0.7) * np.minimum(1, t / 0.01)
    cym = high(noise(sec), 5000) * np.exp(-t / 0.45)
    return mix(boom() * 0.9, chord * 0.12, cym * 0.12)


def riser():
    # Tension riser: filtered noise and a rising tone that swell into the next beat.
    sec = 1.6
    t = t_axis(sec)
    swell = (t / sec) ** 2
    whoosh_up = band(noise(sec), 600, 6000) * swell
    return mix(whoosh_up * 0.5, sweep(180, 900, sec) * swell * 0.25)


def upbeat():
    # 124 BPM, C - G - Am - F, 8 bars: bright plucks, four-on-the-floor, claps. For hooks and happy beats.
    bpm = 124
    beat = 60 / bpm
    bars = 8
    out = np.zeros(int(bars * 4 * beat * SR) + SR)
    chords = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]]
    for bar in range(bars):
        ch = chords[bar % 4]
        b0 = bar * 4 * beat
        for b in range(4):
            place(out, kick() * 0.55, b0 + b * beat)
            place(out, hat() * 0.1, b0 + b * beat + beat / 2)
        for b in (1, 3):
            place(out, snare() * 0.16, b0 + b * beat)
        for s8 in range(8):
            n = ch[s8 % 3] + 24 + (12 if s8 in (3, 7) else 0)
            place(out, epiano(note_hz(n), beat * 0.45) * 0.09, b0 + s8 * beat / 2)
        for b, step in ((0, 0), (1.5, 0), (2, 7), (3, 12)):
            place(out, bass(note_hz(ch[0] - 12 + step), beat * 0.6) * 0.5, b0 + b * beat)
    return loop_fade(out[: int(bars * 4 * beat * SR)])


def tension():
    # 100 BPM in D minor, 4 bars: pulsing low strings, a rising second voice, ticking. For reveals and the twist.
    bpm = 100
    beat = 60 / bpm
    bars = 4
    length = bars * 4 * beat
    out = np.zeros(int(length * SR) + SR)
    roots = [38, 38, 34, 36]
    for bar in range(bars):
        b0 = bar * 4 * beat
        for s8 in range(8):
            x = low(saw(note_hz(roots[bar]), beat * 0.4), 700) * env(beat * 0.4, 0.004, 0.12)
            place(out, x * 0.12, b0 + s8 * beat / 2)
            place(out, hat(0.03) * 0.05, b0 + s8 * beat / 2 + beat / 4)
        sec = 4 * beat
        t = t_axis(sec)
        voice = low(saw(note_hz(roots[bar] + 24 + (bar % 2) * 1), sec, 6), 1200) * np.minimum(1, t / 0.5) * np.minimum(1, (sec - t) / 0.3)
        place(out, voice * 0.03, b0)
    return loop_fade(out[: int(length * SR)])


if __name__ == "__main__":
    for name, fn in [
        ("reel-spin", reel_spin),
        ("reel-stop", reel_stop),
        ("near-miss", near_miss),
        ("chime", chime),
        ("button", button),
        ("bill-whirr", bill_whirr),
        ("credit-blip", credit_blip),
        ("whoosh", whoosh),
        ("tape-stop", tape_stop),
        ("hum", hum),
        ("stamp", stamp),
        ("tick", tick),
        ("boom", boom),
        ("paper", paper),
        ("ambience", ambience),
    ]:
        save(f"sfx/{name}.wav", fn())
    save("music/lounge.wav", lounge(), 0.8)
    save("music/mystery.wav", mystery(), 0.8)
    for name, fn in [("pop", pop), ("drawer", drawer), ("card", card), ("door", door), ("sting", sting), ("riser", riser)]:
        save(f"sfx/{name}.wav", fn())
    save("music/upbeat.wav", upbeat(), 0.8)
    save("music/tension.wav", tension(), 0.8)
