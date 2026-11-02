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
#   .venv/bin/python scripts/pipeline.py render <slug> [--2k]   full MP4 -> out/<slug>.mp4 (broken segments rendered again),
#                                                              then qa; --2k renders the 1440x2560 delivery size
#   .venv/bin/python scripts/pipeline.py glitch <slug> [mp4]    flat runs in a render (a lost WebGL canvas); render retries them
#   .venv/bin/python scripts/pipeline.py qa <slug> [mp4]        frame-by-frame QA (scripts/qa.py) -> videos/<slug>/build/qa/
#   .venv/bin/python scripts/pipeline.py report <slug>          measure the MP4, check facts, write videos/<slug>/report.md
#   .venv/bin/python scripts/pipeline.py status <slug>          every stage done / stale / missing, run times, next command
#   .venv/bin/python scripts/pipeline.py go <slug> [--to stage] [--plan] [--2k]
#                                                              run the missing / stale stages in order (default up to motion)
# voice, check, stills, collide, motion, render and report append their run time to videos/<slug>/build/timings.jsonl.
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
    "glitch_frames": (0, 0),  # broken frames in the render (lost WebGL canvas); render retries them
    "black_frames": (0, 0),  # qa.py: frames with mean luma < 4 %
    "frozen_spans": (0, 0),  # qa.py: 12+ frames without any change
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
    marker = vdir(slug, "build", "check.ok")
    if res.returncode or problems:
        if os.path.exists(marker):
            os.remove(marker)
        sys.exit(1)
    os.makedirs(os.path.dirname(marker), exist_ok=True)
    open(marker, "w").write(time.strftime("%Y-%m-%d %H:%M:%S\n"))


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


# Frames per render pass. A render tab keeps every finished shot's WebGL context alive, so a long video with heavy
# sets runs the GPU out of memory in one pass ("Error creating WebGL context"); each segment gets a fresh browser.
RENDER_SEGMENT = int(os.environ.get("RENDER_SEGMENT", 400))


def glitch_frames(path, first=0):
    """Broken frames of a rendered video. A render tab can lose its WebGL context mid-segment: the canvas then shows
    only the page background under the vignette (a run of flat frames), and when it comes back the textures can be gone
    (the ground turns black) until the next shot. Stills of the same frames render fine, so rendering the segment again
    clears it. Only the flat run is detected: the jump after it looks like any cut, light or flash.
    `first` is the video frame of the file's frame 0."""
    import numpy as np

    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vf", "scale=54:96", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True, check=True,
    ).stdout
    F = np.frombuffer(raw, np.uint8).reshape(-1, 96, 54, 3).astype(np.float32)
    rows = np.ones(96, bool)
    rows[60:76] = False  # the caption band: words stay on screen over a broken canvas
    g = F.mean(-1)
    # sharpest edge outside the captions: a drawn scene has some (a dark night scene still reaches ~30), a blank canvas
    # stays under ~10
    sharp = np.maximum(np.abs(np.diff(g, axis=2))[:, rows].max((1, 2)), np.abs(np.diff(g, axis=1))[:, rows[1:]].max((1, 2)))
    # the blank canvas still has the vignette over it (corners ~0.6 of the centre); a white flash covers that too
    centre = g[:, 40:56, 20:34].mean((1, 2))
    corners = (g[:, :6, :6].mean((1, 2)) + g[:, :6, -6:].mean((1, 2)) + g[:, -6:, :6].mean((1, 2)) + g[:, -6:, -6:].mean((1, 2))) / 4
    flat = list((sharp < 12) & (corners < 0.85 * centre))
    # a lost canvas stays lost for several frames (7-19 seen); a dark graphic can dip for one or two
    found, i = [], 0
    while i < len(flat):
        j = i
        while j < len(flat) and flat[j]:
            j += 1
        if j - i >= 3:
            found += range(first + i, first + j)
        i = j + 1
    return found


def spans(frames):
    """[3, 4, 5, 9] -> '3-5, 9'."""
    out = []
    for f in sorted(frames):
        if out and f == out[-1][1] + 1:
            out[-1][1] = f
        else:
            out.append([f, f])
    return ", ".join(f"{a}-{b}" if b > a else f"{a}" for a, b in out)


def cmd_glitch(slug, path=None):
    found = glitch_frames(path or os.path.join(ROOT, "out", f"{slug}.mp4"))
    print(f"glitch frames: {spans(found) or 'none'}")
    return found


# ---------- qa ----------

# The impact sounds that shake the camera (engine/Video.tsx useImpact); their frames are planned jumps for qa.py.
IMPACT_SFX = ("boom", "sting", "reel-stop", "stamp")
SFX_RE = re.compile(r"\{\s*at:\s*([^,]+?)\s*,\s*src:\s*sfx\(\"([\w-]+)\"\)")
CONST_RE = re.compile(r"^(?:export\s+)?const\s+([A-Z_][A-Z0-9_]*)\s*=\s*(-?[\d.]+)\s*;", re.M)


def impact_frames(slug):
    """Frames of the scene's impact sounds. `at` may be an expression over numeric top-level constants
    (`42 + SLAP`); one that does not resolve is skipped."""
    src = open(sdir(slug, "Scene.tsx")).read()
    consts = {k: float(v) for k, v in CONST_RE.findall(src)}
    found = []
    for expr, name in SFX_RE.findall(src):
        if name not in IMPACT_SFX:
            continue
        expr = re.sub(r"\b[A-Z_][A-Z0-9_]*\b", lambda m: str(consts.get(m.group(0), "x")), expr)
        if re.fullmatch(r"[\d.\s+\-*/()]+", expr):
            found.append(int(round(eval(expr))))
    return found


def qa_meta(slug):
    """Shots and planned jumps for qa.py: whip pans (FADE frames before a whipped shot, engine/clock.tsx) and the
    10-frame camera shake after every impact sound."""
    fade = int(re.search(r"FADE = (\d+)", open(os.path.join(ROOT, "src", "engine", "clock.tsx")).read()).group(1))
    shots = shot_list(slug)
    planned = [[a - fade, a + 1] for a, _, _, whip in shots if whip]
    planned += [[f, f + 10] for f in impact_frames(slug)]
    return {"shots": [{"id": n, "a": a, "b": b} for a, b, n, _ in shots], "planned": planned}


def cmd_qa(slug, path=None):
    """Frame-by-frame QA of a render (scripts/qa.py) into videos/<slug>/build/qa/."""
    path = path or os.path.join(ROOT, "out", f"{slug}.mp4")
    out = vdir(slug, "build", "qa")
    os.makedirs(out, exist_ok=True)
    meta = os.path.join(out, "meta.json")
    json.dump(qa_meta(slug), open(meta, "w"), indent=1)
    run(PY, "scripts/qa.py", path, out, meta)
    return json.load(open(os.path.join(out, "qa.json")))


RENDER_RETRIES = 2


def render_video(slug, out, *args):
    """Render the picture of `slug` to `out` (muted) in segments and join them without re-encoding. Each segment is
    checked for broken frames (glitch_frames) and rendered again, up to RENDER_RETRIES times, until it is clean."""
    total = json.load(open(os.path.join(ROOT, "src", "videos", slug, "timing.json")))["totalFrames"]
    parts = []
    began = time.time()
    for start in range(0, total, RENDER_SEGMENT):
        part = f"{out}.part{start}.mp4"
        end = min(total, start + RENDER_SEGMENT) - 1
        for attempt in range(RENDER_RETRIES + 1):
            run("npx", "remotion", "render", slug, part, f"--frames={start}-{end}", "--muted", *args)
            clean_remotion_temp(began)
            found = glitch_frames(part, start)
            if not found:
                break
            print(f"broken (flat) frames {spans(found)} in {start}-{end}"
                  + (", rendering the segment again" if attempt < RENDER_RETRIES else ", giving up: check these frames as stills"))
        parts.append(part)
    listing = f"{out}.parts.txt"
    with open(listing, "w") as fh:
        fh.writelines(f"file '{p}'\n" for p in parts)
    run("ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", listing, "-c", "copy", out)
    for p in parts + [listing]:
        os.remove(p)


def cmd_motion(slug):
    import numpy as np

    cmd_register()
    cmd_framing(slug, force=False)
    draft = os.path.join(ROOT, "out", "drafts", f"{slug}.mp4")
    os.makedirs(os.path.dirname(draft), exist_ok=True)
    render_video(slug, draft, "--scale=0.3", "--log=error")
    _, d = frame_diffs(draft)
    med, still = float(np.median(d)), float((d < 2).mean())
    for key, val in (("motion", med), ("still_share", still)):
        print(("  ok   " if within(key, val) else "  MISS ") + f"{key} = {val:.2f} (target {mark(key, val)[0].split('|')[3].strip()})")
    print("\nstillest shots (median change):")
    for m, name, a, b in motion_by_shot(slug, d)[:8]:
        print(f"  {m:5.1f}  {name:16s} {a}-{b}")


# `render <slug> --2k`: the delivery size, 1440x2560 (YouTube serves Shorts above 1080p from a 1440p upload).
HD_SCALE = "1.3333333333333333"  # 4/3 to full precision: 1080 and 1920 times it must come out as whole pixels


def cmd_render(slug, hd=False):
    cmd_register()
    cmd_framing(slug, force=False)
    os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
    out = os.path.join(ROOT, "out", f"{slug}.mp4")
    picture, sound = f"{out}.picture.mp4", f"{out}.sound.wav"
    render_video(slug, picture, "--log=error", *([f"--scale={HD_SCALE}"] if hd else []))
    run("node", "scripts/sound.mjs", slug, sound)
    run("ffmpeg", "-v", "error", "-y", "-i", picture, "-i", sound, "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-shortest", out)
    os.remove(picture)
    os.remove(sound)
    cmd_qa(slug, out)


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
    qa = cmd_qa(slug, mp4)
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
        ("glitch_frames", len(glitch_frames(mp4)), "{}"),
        ("black_frames", len(qa["black"]), "{}"),
        ("frozen_spans", len(qa["frozen"]), "{}"),
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
        f"Picture {qa['size'][0]}x{qa['size'][1]}. Sudden jumps inside a shot to look at (frame-by-frame QA, "
        f"`build/qa/sheet_*.jpg`): {spans(qa['pops']) or 'none'}."
        + (f" Unplanned white frames: {spans(qa['white'])}." if qa["white"] else ""),
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


# ---------- status / go / timings ----------

# The stages `go` runs, in order. Each has the file it leaves behind (its output) and what that output is built from;
# an output older than any of its inputs is stale.
STAGES = ("voice", "check", "stills", "collide", "motion", "render", "report")
SHARED = ("engine", "puppet", "three")  # src/ folders every video uses


def newest(*paths):
    """Latest modification time of the files under `paths` (0 when none exists)."""
    t = 0.0
    for p in paths:
        if os.path.isfile(p):
            t = max(t, os.path.getmtime(p))
        for dirpath, _, files in os.walk(p) if os.path.isdir(p) else ():
            for f in files:
                t = max(t, os.path.getmtime(os.path.join(dirpath, f)))
    return t


def stage_files(slug):
    voice = os.path.join(ROOT, "public", "videos", slug, "voice.wav")
    mp4 = os.path.join(ROOT, "out", f"{slug}.mp4")
    return {
        "voice": (sdir(slug, "timing.json"), [vdir(slug, "lines.json")]),
        "check": (vdir(slug, "build", "check.ok"), [sdir(slug)]),
        "stills": (vdir(slug, "build", "stills", "contact.jpg"), [sdir(slug)]),
        "collide": (vdir(slug, "build", "collide", "collide.txt"), [sdir(slug)]),
        "motion": (os.path.join(ROOT, "out", "drafts", f"{slug}.mp4"), [sdir(slug), voice]),
        "render": (mp4, [sdir(slug), voice]),
        "report": (vdir(slug, "report.md"), [mp4, vdir(slug, "plan.json"), vdir(slug, "research.md")]),
    }


HD_SIZE = "1440x2560"


def video_size(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                        "-of", "csv=s=x:p=0", path], capture_output=True, text=True)
    return r.stdout.strip()


def stage_states(slug, hd=False):
    """[(stage, 'done' | 'stale' | 'missing', note)] in pipeline order. With `hd`, a render that is not 2K is stale."""
    rows = []
    for stage, (out, inputs) in stage_files(slug).items():
        if not os.path.exists(out):
            state = "missing"
        else:
            state = "stale" if newest(*inputs) > os.path.getmtime(out) else "done"
        note = ""
        if stage == "render" and os.path.exists(out):
            size = video_size(out)
            note = size + ("" if size == HD_SIZE else ", not 2K (render --2k for delivery)")
            if hd and size != HD_SIZE:
                state = "stale"
        if stage == "voice" and "Replace me." in open(vdir(slug, "lines.json")).read():
            note = "write lines.json first"
        if stage == "collide" and os.path.exists(out) and open(out).read().strip():
            note = f"{len(open(out).read().strip().splitlines())} collision(s) to fix"
        if stage == "check" and not os.path.exists(sdir(slug, "Scene.tsx")):
            note = "write src/videos/<slug>/Scene.tsx first"
        if stage in ("motion", "render") and state == "done":
            if newest(*(os.path.join(ROOT, "src", d) for d in SHARED)) > os.path.getmtime(out):
                note = "; ".join(filter(None, [note, "engine, puppets or sets changed since (affects every video; re-render only if needed)"]))
        rows.append((stage, state, note))
    return rows


def timings_path(slug):
    return vdir(slug, "build", "timings.jsonl")


def timed(slug, stage, fn, args=()):
    """Run one stage and append its line to videos/<slug>/build/timings.jsonl: stage, start, seconds, result
    (ok / error / stopped), args."""
    began, result = time.time(), "error"
    try:
        out = fn()
        result = "ok"
        return out
    except KeyboardInterrupt:
        result = "stopped"
        raise
    finally:
        if os.path.isdir(vdir(slug)):
            os.makedirs(os.path.dirname(timings_path(slug)), exist_ok=True)
            with open(timings_path(slug), "a") as fh:
                fh.write(json.dumps({"stage": stage, "start": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(began)),
                                     "seconds": round(time.time() - began, 1), "result": result, "args": list(args)}) + "\n")


def last_runs(slug):
    """Per stage: the duration of its last successful run, and the mean of all successful runs (seconds)."""
    runs = {}
    if os.path.exists(timings_path(slug)):
        for line in open(timings_path(slug)):
            r = json.loads(line)
            if r["result"] == "ok":
                runs.setdefault(r["stage"], []).append(r["seconds"])
    return {k: (v[-1], sum(v) / len(v), len(v)) for k, v in runs.items()}


def fmt_secs(s):
    return f"{s:.0f}s" if s < 90 else f"{s / 60:.1f}m"


def cmd_status(slug):
    runs = last_runs(slug)
    print(f"{slug}\n")
    print(f"  {'stage':8s} {'state':8s} {'last':>7s} {'mean':>7s} {'runs':>5s}  note")
    for stage, state, note in stage_states(slug):
        last, mean, n = runs.get(stage, (None, None, 0))
        print(f"  {stage:8s} {state:8s} {fmt_secs(last) if last else '-':>7s} {fmt_secs(mean) if mean else '-':>7s} {n:5d}  {note}")
    extras = [("youtube.md", vdir(slug, "youtube.md")), ("qa", vdir(slug, "build", "qa", "qa.json"))]
    print("\n  " + ", ".join(f"{name} {'yes' if os.path.exists(p) else 'no'}" for name, p in extras))
    todo = [s for s, state, _ in stage_states(slug) if state != "done"]
    print(f"\nnext: .venv/bin/python scripts/pipeline.py {todo[0]} {slug}" if todo else "\nevery stage is done")


def cmd_go(slug, to="motion", plan=False, hd=False):
    """Run every missing or stale stage up to `to`, in order. Stops when lines.json is still the template, when
    `check` fails, or when `collide` finds a puppet inside the set. By default it stops before the render (look at
    the stills first); `--to report` goes on through render and report."""
    if to not in STAGES:
        sys.exit(f"--to must be one of {', '.join(STAGES)}")
    upto = STAGES[: STAGES.index(to) + 1]
    todo = [(s, state) for s, state, _ in stage_states(slug, hd) if s in upto and state != "done"]
    if not todo:
        print(f"every stage up to {to} is done")
        return
    # a new voice makes every later stage stale; the states are read again before each stage
    print("plan: " + ", ".join(f"{s} ({state})" for s, state in todo) + (" + every later stage up to " + to if todo[0][0] == "voice" else ""))
    if plan:
        return
    calls = {
        "voice": lambda: cmd_voice(slug), "check": lambda: cmd_check(slug), "stills": lambda: cmd_stills(slug),
        "collide": lambda: cmd_collide(slug), "motion": lambda: cmd_motion(slug),
        "render": lambda: cmd_render(slug, hd), "report": lambda: cmd_report(slug),
    }
    for stage in upto:
        _, state, note = next(r for r in stage_states(slug, hd) if r[0] == stage)
        if state == "done":
            continue
        if stage == "voice" and note:
            sys.exit(f"stopped: {note}")
        print(f"\n===== {stage} =====", flush=True)
        try:
            timed(slug, stage, calls[stage], ["--2k"] if stage == "render" and hd else [])
        except SystemExit as e:
            if e.code:
                sys.exit(f"stopped: {stage} failed")
            raise
        if stage == "collide" and open(stage_files(slug)["collide"][0]).read().strip():
            sys.exit("stopped: collide found puppets inside the set (videos/<slug>/build/collide/collide.txt)")
    print("\n" + ("done up to " + to if to != "report" else "done"))


def flag(args, name):
    """Remove `--name` from args; True when it was there."""
    if name in args:
        args.remove(name)
        return True
    return False


def option(args, name, default):
    """Remove `--name value` from args and return value (or default)."""
    if name in args:
        i = args.index(name)
        value = args[i + 1]
        del args[i : i + 2]
        return value
    return default


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__ or open(__file__).read().split("\n\n")[0])
        sys.exit(2)
    cmd, args = sys.argv[1], sys.argv[2:]
    given = list(args)
    hd = flag(args, "--2k")
    started = time.time()
    # Remotion bundles (with their copy of public/) go to a temp folder of this command's own, so a cleanup never
    # deletes the bundle of a render running at the same time in another shell (its public files then 404 mid-render).
    os.environ["TMPDIR"] = tempfile.tempdir = tempfile.mkdtemp(prefix="pipeline-")
    try:
        call = {
            "new": lambda: cmd_new(args[0], args[1]),
            "voice": lambda: cmd_voice(args[0]),
            "register": cmd_register,
            "check": lambda: cmd_check(args[0]),
            "stills": lambda: cmd_stills(args[0], args[1] if len(args) > 1 else None),
            "collide": lambda: cmd_collide(args[0]),
            "motion": lambda: cmd_motion(args[0]),
            "framing": lambda: cmd_framing(args[0]),
            "render": lambda: cmd_render(args[0], hd),
            "glitch": lambda: cmd_glitch(args[0], args[1] if len(args) > 1 else None),
            "qa": lambda: cmd_qa(args[0], args[1] if len(args) > 1 else None),
            "report": lambda: cmd_report(args[0]),
            "status": lambda: cmd_status(args[0]),
            "go": lambda: cmd_go(args[0], option(args, "--to", "motion"), flag(args, "--plan"), hd),
        }[cmd]
        if cmd in STAGES and args:
            timed(args[0], cmd, call, given[1:])
        else:
            call()
    finally:
        clean_remotion_temp(started)
        shutil.rmtree(tempfile.tempdir, ignore_errors=True)

