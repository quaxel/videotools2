# Explainer-cartoon pipeline: the deterministic stages. The creative stages (research, script, scene code,
# review) are done by Claude Code following .claude/skills/make-video/SKILL.md; this file runs everything else.
#
#   .venv/bin/python scripts/pipeline.py new <slug> "<topic>"   scaffold videos/<slug>/ and src/videos/<slug>/
#   .venv/bin/python scripts/pipeline.py voice <slug>           Qwen TTS -> fitted track -> timing.json + pace check
#   .venv/bin/python scripts/pipeline.py register               regenerate src/videos/index.ts
#   .venv/bin/python scripts/pipeline.py check <slug>           tsc + rule checks on the scene's shot list
#   .venv/bin/python scripts/pipeline.py stills <slug> [frames] one still per second (or given frames) + contact sheet
#   .venv/bin/python scripts/pipeline.py collide <slug>         every 5th frame: puppets walking/standing inside set objects
#   .venv/bin/python scripts/pipeline.py motion <slug>          fast 30 % draft render + motion per shot (stillest first)
#   .venv/bin/python scripts/pipeline.py framing <slug>         head-framing pre-pass -> public/videos/<slug>/framing.json
#                                                              (run by stills/motion/render when the scene changed)
#   .venv/bin/python scripts/pipeline.py render <slug>          full MP4 -> out/<slug>.mp4
#   .venv/bin/python scripts/pipeline.py report <slug>          measure the MP4, check facts, write videos/<slug>/report.md
#
# Targets come from guide/rules.md (mirrored in TARGETS below); the report marks every miss.
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QWEN_PY = os.path.join(ROOT, "..", "tts", "qwen", ".venv", "bin", "python")
PY = os.path.join(ROOT, ".venv", "bin", "python")
FPS = 30

TARGETS = {
    "duration": (50, 60),  # seconds
    "words": (180, 210),
    "wpm": (190, 215),
    "long_pauses": (0, 1),  # gaps > 0.6 s in the narration
    "speech_cover": (0.80, 1.0),
    "bed_vs_speech_db": (None, -5.0),
    "avg_shot": (0, 2.2),  # seconds
    "longest_shot": (0, 4.0),
    "locations": (8, None),
    "characters": (4, None),
    "gags": (2, None),
    "hue_families": (5, 12),
    "top_hue_share": (0, 0.40),
    "seed_by": (0, 20),  # seconds: the twist's object or person first appears
    "lufs": (-17, -14),
    "motion": (6.0, None),  # median frame-to-frame change (10 fps, 54x96); reference 8.0
    "still_share": (0, 0.15),  # share of frame pairs that barely change (< 2); reference 10 %
}


def run(*cmd, cwd=ROOT, check=True, capture=False):
    print("$", " ".join(cmd), flush=True)
    return subprocess.run(cmd, cwd=cwd, check=check, text=True, capture_output=capture)


def vdir(slug, *p):
    return os.path.join(ROOT, "videos", slug, *p)


def sdir(slug, *p):
    return os.path.join(ROOT, "src", "videos", slug, *p)


def within(key, value):
    lo, hi = TARGETS[key]
    return (lo is None or value >= lo) and (hi is None or value <= hi)


def mark(key, value, fmt="{}"):
    lo, hi = TARGETS[key]
    target = f"≥ {lo}" if hi is None else f"≤ {hi}" if lo is None else f"{lo} – {hi}"
    ok = within(key, value)
    return f"| {key} | {fmt.format(value)} | {target} | {'ok' if ok else '**MISS**'} |", ok


# ---------- new ----------

LINES_TEMPLATE = {
    "fps": FPS,
    "voices": {
        "narrator": {
            "voice": "Ryan",
            "instruct": "Fast-paced, energetic, punchy explainer narrator. Brisk delivery with no long pauses.",
            "seed": 7,
            "tempo": 1.18,
        },
    },
    "lines": [{"speaker": "narrator", "text": "Replace me."}],
}

PLAN_TEMPLATE = {
    "title": "",
    "topic": "",
    "mechanism": "One sentence: the hidden real-world system this video reveals.",
    "beats": {"hook": "", "story": "", "rise": "", "twist": "", "mechanism": "", "ending": ""},
    "seed": {"what": "The object or person the twist depends on", "first_line": 0},
    "locations": [{"id": "", "set": "existing component or new file", "colour": "dominant colour family"}],
    "characters": [{"id": "", "look": ""}],
    "gags": [{"line": 0, "what": ""}],
    "story_numbers": ["Numbers that belong to the story, not to a factual claim (e.g. 'two' in 'two sevens')"],
}


def cmd_new(slug, topic):
    os.makedirs(vdir(slug, "build"), exist_ok=True)
    os.makedirs(sdir(slug), exist_ok=True)
    for name, data in (("lines.json", LINES_TEMPLATE), ("plan.json", {**PLAN_TEMPLATE, "topic": topic})):
        path = vdir(slug, name)
        if not os.path.exists(path):
            json.dump(data, open(path, "w"), indent=2, ensure_ascii=False)
    research = vdir(slug, "research.md")
    if not os.path.exists(research):
        open(research, "w").write(
            f"# Research: {topic}\n\n## Mechanism\n\n## Claims\n\n"
            "<!-- One claim per line: '- <claim with its number> — <source URL>'. Every number spoken in the script must appear here. -->\n"
        )
    print(f"scaffolded videos/{slug}/ (plan.json, lines.json, research.md) and src/videos/{slug}/")


# ---------- voice ----------

def cmd_voice(slug):
    run(QWEN_PY, "scripts/voice_generate.py", slug)
    run(PY, "scripts/voice_assemble.py", slug)
    t = json.load(open(sdir(slug, "timing.json")))
    words = sum(len(l["text"].split()) for l in t["lines"])
    dur = t["totalFrames"] / FPS
    wpm = words / dur * 60
    print(f"\n{dur:.1f}s, {words} words, {wpm:.0f} wpm")
    for key, val in (("duration", dur), ("words", words), ("wpm", wpm)):
        print(("  ok   " if within(key, val) else "  MISS ") + f"{key} = {val:.0f} (target {mark(key, val)[0].split('|')[3].strip()})")
    print("\nline frames (cut shots to these):")
    for l in t["lines"]:
        print(f"  {l['i']:02d} {l['from']:5d}-{l['to']:5d} {l['speaker']:8s} {l['text']}")


# ---------- register ----------

def cmd_register():
    base = os.path.join(ROOT, "src", "videos")
    slugs = sorted(d for d in os.listdir(base) if os.path.exists(os.path.join(base, d, "Scene.tsx")))
    lines = ["// Generated by scripts/pipeline.py (register). One entry per folder in src/videos/ that has a Scene.tsx."]
    lines += [f'import * as v{i} from "./{s}/Scene";' for i, s in enumerate(slugs)]
    entries = ", ".join(f"{{ slug: v{i}.SLUG, Scene: v{i}.Scene, frames: v{i}.timing.totalFrames }}" for i in range(len(slugs)))
    lines += ["", f"export const VIDEOS = [{entries}];", ""]
    open(os.path.join(base, "index.ts"), "w").write("\n".join(lines))
    print("registered:", ", ".join(slugs))


# ---------- check ----------

SHOT_RE = re.compile(r"\[\s*(\d+)\s*,\s*(\d+|TIMING\.totalFrames)\s*,\s*(\w+)\s*,\s*(true|false)\s*\]")


def shot_list(slug):
    src = open(sdir(slug, "Scene.tsx")).read()
    body = src[src.index("const SHOTS") :]
    total = json.load(open(sdir(slug, "timing.json")))["totalFrames"]
    return [(int(a), total if b.startswith("TIMING") else int(b), name, fade == "true") for a, b, name, fade in SHOT_RE.findall(body)]


def shot_stats(slug):
    shots = shot_list(slug)
    lens = [(b - a) / FPS for a, b, _, _ in shots]
    return shots, sum(lens) / len(lens), max(lens)


def cmd_check(slug):
    cmd_register()
    res = run("npx", "tsc", "-p", ".", check=False, capture=True)
    out = (res.stdout + res.stderr).strip()
    print(out or "tsc: no errors")
    shots, avg, longest = shot_stats(slug)
    total = json.load(open(sdir(slug, "timing.json")))["totalFrames"]
    problems = []
    if not shots or shots[0][0] != 0:
        problems.append("the first shot must start at frame 0")
    for (a1, b1, n1, _), (a2, _, n2, _) in zip(shots, shots[1:]):
        if a2 != b1:
            problems.append(f"gap or overlap between {n1} (ends {b1}) and {n2} (starts {a2})")
    if shots and shots[-1][1] != total:
        problems.append(f"the last shot must end at totalFrames ({total})")
    for a, b, n, _ in shots:
        if (b - a) / FPS > TARGETS["longest_shot"][1]:
            problems.append(f"{n} is {(b - a) / FPS:.1f}s (max {TARGETS['longest_shot'][1]}s)")
    print(f"{len(shots)} shots, average {avg:.2f}s, longest {longest:.2f}s")
    for p in problems:
        print("  MISS", p)
    if res.returncode or problems:
        sys.exit(1)


# ---------- stills / render ----------

def framing_stale(slug):
    """The framing table is missing or older than the scene, its timing, the shared engine, puppets or sets."""
    out = os.path.join(ROOT, "public", "videos", slug, "framing.json")
    if not os.path.exists(out):
        return True
    newest = 0.0
    for d in (sdir(slug), os.path.join(ROOT, "src", "engine"), os.path.join(ROOT, "src", "puppet"), os.path.join(ROOT, "src", "three")):
        for dirpath, _, files in os.walk(d):
            for f in files:
                newest = max(newest, os.path.getmtime(os.path.join(dirpath, f)))
    return os.path.getmtime(out) < newest


def cmd_framing(slug, force=True):
    if force or framing_stale(slug):
        cmd_register()
        run("node", "scripts/framing.mjs", slug)


def cmd_stills(slug, frames=None):
    cmd_register()
    cmd_framing(slug, force=False)
    run("node", "scripts/stills.mjs", slug, vdir(slug, "build", "stills"), *([frames] if frames else []))


def cmd_collide(slug):
    cmd_register()
    print("$ COLLIDE=1 node scripts/stills.mjs", slug, flush=True)
    subprocess.run(["node", "scripts/stills.mjs", slug, vdir(slug, "build", "collide")], cwd=ROOT, check=True, env={**os.environ, "COLLIDE": "1"})


def frame_diffs(path):
    import numpy as np

    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vf", "fps=10,scale=54:96", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True, check=True,
    ).stdout
    F = np.frombuffer(raw, np.uint8).reshape(-1, 96, 54, 3).astype(np.float32)
    return F, np.abs(np.diff(F, axis=0)).mean(axis=(1, 2, 3))


def motion_by_shot(slug, diffs):
    import numpy as np

    rows = []
    for a, b, name, _ in shot_list(slug):
        # skip the cut itself and the first frame after it
        seg = diffs[a // 3 + 1 : b // 3 - 1]
        if len(seg):
            rows.append((float(np.median(seg)), name, a, b))
    return sorted(rows)


def cmd_motion(slug):
    import numpy as np

    cmd_register()
    cmd_framing(slug, force=False)
    draft = os.path.join(ROOT, "out", "drafts", f"{slug}.mp4")
    os.makedirs(os.path.dirname(draft), exist_ok=True)
    run("npx", "remotion", "render", slug, draft, "--scale=0.3", "--muted", "--log=error")
    _, d = frame_diffs(draft)
    med, still = float(np.median(d)), float((d < 2).mean())
    for key, val in (("motion", med), ("still_share", still)):
        print(("  ok   " if within(key, val) else "  MISS ") + f"{key} = {val:.2f} (target {mark(key, val)[0].split('|')[3].strip()})")
    print("\nstillest shots (median change):")
    for m, name, a, b in motion_by_shot(slug, d)[:8]:
        print(f"  {m:5.1f}  {name:16s} {a}-{b}")


def cmd_render(slug):
    cmd_register()
    cmd_framing(slug, force=False)
    os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
    run("npx", "remotion", "render", slug, f"out/{slug}.mp4", "--log=error")


# ---------- report ----------

NUMBER_WORDS = (
    "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen "
    "eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion dozen half percent"
).split()


def video_metrics(path):
    import numpy as np

    F, d = frame_diffs(path)
    motion, still = float(np.median(d)), float((d < 2).mean())
    families = []
    for k in range(len(F) // 10):
        f = F[k * 10 : (k + 1) * 10] / 255
        mx, mn = f.max(-1), f.min(-1)
        chroma = mx - mn + 1e-6
        r, g, b = f[..., 0], f[..., 1], f[..., 2]
        h = np.where(mx == r, ((g - b) / chroma) % 6, np.where(mx == g, (b - r) / chroma + 2, (r - g) / chroma + 4)) * 60
        m = (chroma / (mx + 1e-6) > 0.35) & (mx > 0.25)
        hist, _ = np.histogram(h[m], bins=12, range=(0, 360))
        families.append(int(hist.argmax()))
    cnt = Counter(families)
    return motion, still, d, len(cnt), cnt.most_common(1)[0][1] / len(families)


def audio_metrics(path):
    import numpy as np

    sys.path.insert(0, os.path.join(ROOT, "scripts"))
    from voice_assemble import read_16k
    from faster_whisper import WhisperModel

    a = read_16k(path)
    dur = len(a) / 16000
    segs, _ = WhisperModel("small.en", compute_type="int8").transcribe(a, word_timestamps=True, language="en")
    w = [x for s in segs for x in s.words]
    gaps = [w[i + 1].start - w[i].end for i in range(len(w) - 1)]
    db = lambda s, e: 20 * np.log10(np.sqrt(np.mean(a[int(s * 16000) : int(e * 16000)] ** 2)) + 1e-9)
    bed = [db(w[i].end + 0.05, w[i + 1].start - 0.05) for i in range(len(w) - 1) if gaps[i] > 0.3]
    speech = [db(x.start, x.end) for x in w if x.end - x.start > 0.15]
    loud = subprocess.run(["ffmpeg", "-v", "info", "-i", path, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", loud)[-1])
    return {
        "duration": dur,
        "wpm": len(w) / dur * 60,
        "long_pauses": sum(g > 0.6 for g in gaps),
        "speech_cover": sum(x.end - x.start for x in w) / dur,
        "bed_vs_speech_db": float(np.median(bed) - np.median(speech)) if bed else -99.0,
        "lufs": lufs,
    }


def fact_gate(slug):
    """Numbers spoken in the script that research.md does not back with a sourced claim."""
    lines = json.load(open(vdir(slug, "lines.json")))["lines"]
    story = {w.lower() for w in json.load(open(vdir(slug, "plan.json"))).get("story_numbers", [])}
    research = open(vdir(slug, "research.md")).read().lower()
    claims = [l for l in research.splitlines() if l.strip().startswith("-") and "http" in l]
    unbacked = []
    for line in lines:
        for tok in re.findall(r"[a-z0-9$%.,'-]+", line["text"].lower()):
            word = tok.strip(".,'")
            is_number = re.search(r"\d", word) or any(n == word or word.startswith(n + "-") for n in NUMBER_WORDS)
            if is_number and word not in ("one",) and word not in story and not any(word in c for c in claims):
                unbacked.append((word, line["text"]))
    return unbacked, len(claims)


def cmd_report(slug):
    mp4 = os.path.join(ROOT, "out", f"{slug}.mp4")
    plan = json.load(open(vdir(slug, "plan.json")))
    lines = json.load(open(vdir(slug, "lines.json")))["lines"]
    timing = json.load(open(sdir(slug, "timing.json")))
    shots, avg, longest = shot_stats(slug)
    am = audio_metrics(mp4)
    motion, still, diffs, fams, top = video_metrics(mp4)
    seed_line = plan.get("seed", {}).get("first_line", 0)
    seed_at = timing["lines"][seed_line]["from"] / FPS if seed_line < len(timing["lines"]) else 999
    rows, misses = [], 0
    for key, value, fmt in (
        ("duration", am["duration"], "{:.1f}s"),
        ("words", sum(len(l["text"].split()) for l in lines), "{}"),
        ("wpm", am["wpm"], "{:.0f}"),
        ("long_pauses", am["long_pauses"], "{}"),
        ("speech_cover", am["speech_cover"], "{:.0%}"),
        ("bed_vs_speech_db", am["bed_vs_speech_db"], "{:.1f} dB"),
        ("lufs", am["lufs"], "{:.1f} LUFS"),
        ("avg_shot", avg, "{:.2f}s"),
        ("longest_shot", longest, "{:.2f}s"),
        ("locations", len(plan.get("locations", [])), "{}"),
        ("characters", len(plan.get("characters", [])), "{}"),
        ("gags", len(plan.get("gags", [])), "{}"),
        ("hue_families", fams, "{}"),
        ("top_hue_share", top, "{:.0%}"),
        ("motion", motion, "{:.1f}"),
        ("still_share", still, "{:.0%}"),
        ("seed_by", seed_at, "{:.1f}s"),
    ):
        row, ok = mark(key, value, fmt)
        rows.append(row)
        misses += not ok
    stillest = motion_by_shot(slug, diffs)[:5]
    unbacked, n_claims = fact_gate(slug)
    out = [
        f"# Report: {plan.get('title') or slug}",
        "",
        f"{misses} of {len(rows)} targets missed. Shots: {len(shots)}.",
        "",
        "| Metric | Value | Target | |",
        "| --- | --- | --- | --- |",
        *rows,
        "",
        "Stillest shots: " + ", ".join(f"{n} {m:.1f}" for m, n, _, _ in stillest) + ".",
        "",
        f"## Fact check ({n_claims} sourced claims in research.md)",
        "",
    ]
    if unbacked:
        out += ["Spoken numbers with no sourced claim (verify or rewrite before publishing):", ""]
        out += [f"- `{w}` in: {t}" for w, t in unbacked]
    else:
        out.append("Every spoken number appears in a sourced claim.")
    open(vdir(slug, "report.md"), "w").write("\n".join(out) + "\n")
    print("\n".join(out))


def clean_remotion_temp(since):
    """Remotion leaves a ~190 MB bundle (and asset folders) in the temp dir on every still and render; over a few
    videos that fills the disk (renders then die with ENOSPC). Remove the ones this command created."""
    tmp = tempfile.gettempdir()
    for name in os.listdir(tmp):
        path = os.path.join(tmp, name)
        try:
            if name.startswith("remotion-") and os.path.getmtime(path) >= since - 5:
                shutil.rmtree(path, ignore_errors=True)
        except OSError:
            pass


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__ or open(__file__).read().split("\n\n")[0])
        sys.exit(2)
    cmd, args = sys.argv[1], sys.argv[2:]
    started = time.time()
    try:
        {
            "new": lambda: cmd_new(args[0], args[1]),
            "voice": lambda: cmd_voice(args[0]),
            "register": cmd_register,
            "check": lambda: cmd_check(args[0]),
            "stills": lambda: cmd_stills(args[0], args[1] if len(args) > 1 else None),
            "collide": lambda: cmd_collide(args[0]),
            "motion": lambda: cmd_motion(args[0]),
            "framing": lambda: cmd_framing(args[0]),
            "render": lambda: cmd_render(args[0]),
            "report": lambda: cmd_report(args[0]),
        }[cmd]()
    finally:
        clean_remotion_temp(started)

