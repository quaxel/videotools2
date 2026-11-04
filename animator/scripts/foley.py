# Foley library for the videos: each sound is a folder of takes, public/foley/<name>/NN.wav (48 kHz 16-bit mono),
# listed with its source and licence in src/engine/foley.json, which the scenes read (engine/cues.ts: foley,
# foleyCues). A cue plays a different take each time, so a run of footsteps or chews never repeats one file. It also
# bakes the place a sound happens in (Sfx `space`) into public/space/<space>/<src> (gitignored, made on demand).
#
#   .venv/bin/python scripts/foley.py import <name> <file | lib:<glob>> ... [--license L] [--source S] [--note N]
#                                     [--min 4] [--pitch 0.94,1.06] [--lowpass HZ] [--max SECONDS]
#       Recordings in: each trimmed of silence, faded, peak-normalised, one take each; with fewer than --min takes,
#       pitched copies (resampled, so pitch and length move together) fill up to --min. `lib:darbe/*tahta*` takes
#       files from the shared sound library ($SOUND_LIBRARY, default ../../videotools/sound-library) and copies its
#       catalog's author, source and licence; files of your own need --license and --source. --lowpass softens a
#       recording (a crisp crunch into a soft chomp), --max keeps only the first seconds after the onset.
#   .venv/bin/python scripts/foley.py synth <name> --from <sfx_generate function> [--takes 6]
#       Takes of a synthesised sound (scripts/sfx_generate.py), each with its own random seed.
#   .venv/bin/python scripts/foley.py space <space> <src> ...        bake sources (paths under public/) for a space
#   .venv/bin/python scripts/foley.py space --cues <cues.json>       every (src, space) a cue table uses, if missing
#   .venv/bin/python scripts/foley.py list
#
# Spaces: room (small furnished room, ~0.35 s), hall (big hard room, ~1.6 s), outdoor (open air: a dull far slap,
# no tail), far (across a field: highs gone, mostly reflections, quieter). The baked file keeps the dry sound's
# loudness (far a little under), so a cue's volume means the same with or without a space.
import fnmatch
import json
import os
import subprocess
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, resample_poly, sosfilt

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
MANIFEST = os.path.join(ROOT, "src", "engine", "foley.json")
LIBRARY = os.environ.get("SOUND_LIBRARY", os.path.join(ROOT, "..", "..", "videotools", "sound-library"))
SPACES = ("room", "hall", "outdoor", "far")


def read(path):
    """Any audio file as mono float at SR (ffmpeg decodes and resamples)."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def write(path, x, peak=None):
    x = np.asarray(x, dtype=np.float64)
    if peak is not None:
        x = x / (np.abs(x).max() + 1e-12) * peak
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


def trim(x, floor_db=-45, pre=0.005, fade_in=0.002, fade_out=0.012):
    """Cut the silence around a sound (relative to its peak), keep a few ms before the onset, fade both ends."""
    env = np.abs(x)
    on = np.nonzero(env > env.max() * 10 ** (floor_db / 20))[0]
    if not len(on):
        return x
    x = x[max(0, on[0] - int(pre * SR)) : on[-1] + 1].copy()
    a, b = int(fade_in * SR), min(len(x) // 2, int(fade_out * SR))
    x[:a] *= np.linspace(0, 1, a)
    x[len(x) - b :] *= np.linspace(1, 0, b)
    return x


def pitched(x, ratio):
    """Resample so it plays `ratio` higher (and shorter), like a tape sped up: a different-sounding take."""
    up, down = round(1000 / ratio), 1000
    return resample_poly(x, up, down)


def load_manifest():
    return json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}


def save_manifest(m):
    json.dump(dict(sorted(m.items())), open(MANIFEST, "w"), indent=1, ensure_ascii=False)
    open(MANIFEST, "a").write("\n")


def write_takes(name, takes, entry):
    folder = os.path.join(PUBLIC, "foley", name)
    if os.path.isdir(folder):
        for f in os.listdir(folder):
            if f.endswith(".wav"):
                os.remove(os.path.join(folder, f))
    for i, x in enumerate(takes):
        write(os.path.join(folder, f"{i + 1:02d}.wav"), x, peak=0.89)
    m = load_manifest()
    m[name] = {"count": len(takes), **entry}
    save_manifest(m)
    print(f"{name}: {len(takes)} takes -> public/foley/{name}/ ({entry['license']})")


def library_files(pattern):
    """Files of the shared sound library matching a glob over their path in it, with their catalog entries."""
    catalog = json.load(open(os.path.join(LIBRARY, "catalog.json")))["sounds"]
    hits = [s for s in catalog if fnmatch.fnmatch(s["dosya"], pattern)]
    if not hits:
        sys.exit(f"nothing in {LIBRARY} matches {pattern}")
    return [(os.path.join(LIBRARY, s["dosya"]), s) for s in sorted(hits, key=lambda s: s["dosya"])]


def cmd_import(name, sources, license_, source, note, minimum, pitches, cutoff=None, longest=None):
    files, credits, licenses = [], [], set()
    for s in sources:
        if s.startswith("lib:"):
            for path, meta in library_files(s[4:]):
                files.append(path)
                credits.append(f"{meta['yazar']} ({meta['kaynak'].split('#')[0]})")
                licenses.add(meta["lisans"])
        else:
            files.append(s)
    if any(not s.startswith("lib:") for s in sources) and not (license_ and source):
        sys.exit("files of your own need --license and --source")
    takes = [trim(read(f)) for f in files]
    if cutoff:
        takes = [trim(lowpass(lowpass(x, cutoff), cutoff), floor_db=-40) for x in takes]  # 4th order, then re-trimmed
    if longest:
        takes = [trim(x[: int(longest * SR)], floor_db=-40) for x in takes]
    base = list(takes)
    k = 0
    while len(takes) < minimum:
        takes.append(pitched(base[k % len(base)], pitches[(k // len(base)) % len(pitches)]))
        k += 1
    entry = {
        "source": "; ".join(dict.fromkeys(credits + ([source] if source else []))),
        "license": " + ".join(sorted(licenses | ({license_} if license_ else set()))),
    }
    notes = [note] if note else []
    if cutoff:
        notes.append(f"low-passed at {cutoff:g} Hz")
    if len(takes) > len(base):
        notes.append(f"{len(takes) - len(base)} pitched copies")
    if "BY" in entry["license"]:
        notes.append("credit the author in the video description")
    if notes:
        entry["note"] = "; ".join(notes)
    write_takes(name, takes, entry)


def cmd_synth(name, fn_name, count):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import sfx_generate as gen

    fn = getattr(gen, fn_name)
    takes = []
    for seed in range(count):
        gen.rng = np.random.default_rng(1000 + seed)  # noise() reads the module's rng: a new take per seed
        takes.append(trim(np.asarray(fn(), dtype=np.float64), floor_db=-50))
    write_takes(name, takes, {"source": f"synthesised, scripts/sfx_generate.py {fn_name}()", "license": "own"})


# ---------- spaces ----------

def lowpass(x, hz):
    return sosfilt(butter(2, hz, "lowpass", fs=SR, output="sos"), x)


def impulse(space):
    """A synthetic impulse response (reflections only, no direct sound) and the wet share for `space`."""
    rng = np.random.default_rng(SPACES.index(space) + 11)
    if space == "outdoor":
        ir = np.zeros(int(0.45 * SR))
        for t, g in ((0.11, 0.35), (0.24, 0.18), (0.37, 0.08)):  # a building and trees far off
            ir[int(t * SR)] = g
        return lowpass(ir, 2500), 0.2
    rt, pre, tone, wet = {"room": (0.35, 0.004, 6000, 0.22), "hall": (1.6, 0.018, 4500, 0.34), "far": (1.1, 0.03, 1800, 0.65)}[space]
    n = int((pre + rt * 1.2) * SR)
    t = np.arange(n) / SR
    tail = rng.standard_normal(n) * np.exp(-6.9 * t / rt) * (t >= pre)
    for d, g in ((pre + 0.003, 0.6), (pre + 0.009, 0.45), (pre + 0.017, 0.35), (pre + 0.026, 0.25)):  # early reflections
        if int(d * SR) < n:
            tail[int(d * SR)] += g * 8
    return lowpass(tail, tone), wet


def rms(x):
    return np.sqrt(np.mean(x**2)) + 1e-12


def place(x, space):
    """The dry sound as heard in `space`, at the dry sound's loudness (far 4 dB under)."""
    ir, wet = impulse(space)
    dry = lowpass(x, 2200) * 0.5 if space == "far" else x
    refl = fftconvolve(x, ir)
    refl *= rms(dry) / rms(refl[: len(x)] if len(x) > SR // 20 else refl)
    out = np.zeros(len(refl))
    out[: len(dry)] += dry * (1 - wet)
    out += refl * wet
    out *= rms(x) / rms(out[: len(x)]) * (10 ** (-4 / 20) if space == "far" else 1)
    return out


def space_path(space, src):
    return os.path.join(PUBLIC, "space", space, src)


def bake(space, src):
    x = read(os.path.join(PUBLIC, src))
    write(space_path(space, src), place(x, space))
    print(f"space/{space}/{src}")


def cmd_space_cues(path):
    """Bake every (src, space) a cue table uses that is missing or older than its source. Looped cues play dry."""
    for e in json.load(open(path))["sfx"]:
        space, src = e.get("space"), e["src"]
        if not space or e.get("until") is not None:
            continue
        out, dry = space_path(space, src), os.path.join(PUBLIC, src)
        if os.path.exists(dry) and (not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(dry)):
            bake(space, src)


def cmd_list():
    for name, e in load_manifest().items():
        print(f"{name:16} {e['count']:2} takes  {e['license']:28} {e['source']}" + (f"  ({e['note']})" if e.get("note") else ""))


def option(args, name, default=None):
    if name in args:
        i = args.index(name)
        v = args[i + 1]
        del args[i : i + 2]
        return v
    return default


if __name__ == "__main__":
    args = sys.argv[1:]
    cmd = args.pop(0) if args else "list"
    if cmd == "import":
        lic, src, note = option(args, "--license"), option(args, "--source"), option(args, "--note")
        minimum = int(option(args, "--min", "4"))
        pitches = [float(v) for v in option(args, "--pitch", "0.94,1.06,0.9,1.1").split(",")]
        cutoff, longest = option(args, "--lowpass"), option(args, "--max")
        cmd_import(args[0], args[1:], lic, src, note, minimum, pitches, cutoff and float(cutoff), longest and float(longest))
    elif cmd == "synth":
        fn, count = option(args, "--from"), int(option(args, "--takes", "6"))
        cmd_synth(args[0], fn, count)
    elif cmd == "space":
        cues = option(args, "--cues")
        if cues:
            cmd_space_cues(cues)
        else:
            if args[0] not in SPACES:
                sys.exit(f"space must be one of {', '.join(SPACES)}")
            for src in args[1:]:
                bake(args[0], src)
    elif cmd == "list":
        cmd_list()
    else:
        sys.exit("commands: import, synth, space, list (see the header of scripts/foley.py)")
