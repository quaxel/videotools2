# Explainer-cartoon pipeline: the deterministic stages. The creative stages (research, script, scene code,
# review) are done by Claude Code following .claude/skills/make-video/SKILL.md; this file runs everything else.
#
#   .venv/bin/python scripts/pipeline.py new <slug> "<topic>"   scaffold videos/<slug>/ and src/videos/<slug>/
#   .venv/bin/python scripts/pipeline.py voice <slug>           Qwen TTS -> fitted track -> timing.json + pace check
#   .venv/bin/python scripts/pipeline.py physics <slug>         bake videos/<slug>/physics.mjs (Rapier, scripts/physics.mjs)
#                                                              -> src/videos/<slug>/physics.json (run by check/stills when stale)
#   .venv/bin/python scripts/pipeline.py register               regenerate src/videos/index.ts
#   .venv/bin/python scripts/pipeline.py check <slug>           tsc + rule checks on the scene's shot list
#   .venv/bin/python scripts/pipeline.py sync <slug>            sound cues vs the picture (scripts/cues.mjs dump) -> build/sync.txt
#   .venv/bin/python scripts/pipeline.py music <slug>           the video's own score: videos/<slug>/music.py (scripts/music)
#                                                              -> public/videos/<slug>/music.wav + build/score.md
#   .venv/bin/python scripts/pipeline.py mix <slug>             voice / music / effects stems -> voice over the bed per section
#                                                              and per line (scripts/mixreport.py) -> build/mix/mix.md
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
#   .venv/bin/python scripts/pipeline.py look <slug> <ref-dir> [frames]
#                                                              our stills (post chain on) measured against reference frames
#                                                              (scripts/look.py) -> build/look/look.md + sbs.jpg
#   .venv/bin/python scripts/pipeline.py approve <slug> script|stills [--undo]
#                                                              record the OK on lines.json / the final contact sheet
#                                                              (build/approvals.json); lapses when that file changes
#   .venv/bin/python scripts/pipeline.py go <slug> [--to stage] [--plan] [--2k]
#                                                              run the missing / stale stages in order (default up to motion),
#                                                              stopping at an approval the files have outgrown
#   .venv/bin/python scripts/pipeline.py web [--port 8766]      browser panel: every video's stages, run / stop, live log, outputs
# voice, physics, check, sync, music, stills, collide, motion, render and report append their run time to
# videos/<slug>/build/timings.jsonl.
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
EFFECT_HOT = 9.0  # LU: an effect this far over voice + music knocks (scripts/mixreport.py, same name)
PY = os.path.join(ROOT, ".venv", "bin", "python")
FPS = 30

TARGETS = {
    "duration": (50, 60),  # seconds
    "words": (180, 210),
    "wpm": (190, 215),
    "long_pauses": (0, 1),  # gaps > 0.6 s in the narration
    "speech_cover": (0.80, 1.0),
    "bed_vs_speech_db": (None, -5.0),
    "speech_margin_p10": (3.0, None),  # LU, mix.py: the quietest line's 10th-percentile voice-over-bed margin
    "effects_hot": (0, 0),  # mixreport.py: one-shot effects more than EFFECT_HOT over voice + music round them
    "effects_repeated": (0, 0),  # mixreport.py: runs of 3+ cues of one file within a second (no takes)
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

SHOT_RE = re.compile(r"\[\s*(\d+)\s*,\s*(\d+|TIMING\.totalFrames)\s*,\s*(\w+)\s*,\s*(true|false|\"dissolve\")\s*\]")


def shot_list(slug):
    src = open(sdir(slug, "Scene.tsx")).read()
    body = src[src.index("const SHOTS") :]
    total = json.load(open(sdir(slug, "timing.json")))["totalFrames"]
    # the transition in: True (whip pan), "dissolve" or False (a cut)
    trans = lambda t: True if t == "true" else "dissolve" if t == '"dissolve"' else False
    return [(int(a), total if b.startswith("TIMING") else int(b), name, trans(fade)) for a, b, name, fade in SHOT_RE.findall(body)]


def shot_stats(slug):
    shots = shot_list(slug)
    lens = [(b - a) / FPS for a, b, _, _ in shots]
    return shots, sum(lens) / len(lens), max(lens)


# ---------- physics: rigid bodies baked offline ----------

def physics_stale(slug):
    """The video has a physics spec and its baked table is missing or older than the spec or the baker."""
    spec, out = vdir(slug, "physics.mjs"), sdir(slug, "physics.json")
    if not os.path.exists(spec):
        return False
    return not os.path.exists(out) or os.path.getmtime(out) < newest(spec, os.path.join(ROOT, "scripts", "physics.mjs"))


def cmd_physics(slug, force=True):
    """Bake videos/<slug>/physics.mjs into src/videos/<slug>/physics.json, which the scene imports like timing.json."""
    if not os.path.exists(vdir(slug, "physics.mjs")):
        if force:
            print(f"no videos/{slug}/physics.mjs: nothing to bake")
        return
    if force or physics_stale(slug):
        run("node", "scripts/physics.mjs", vdir(slug, "physics.mjs"), sdir(slug, "physics.json"))


def cmd_check(slug):
    cmd_physics(slug, force=False)  # tsc needs the baked table the scene imports
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
    cmd_physics(slug, force=False)
    if force or framing_stale(slug):
        cmd_register()
        run("node", "scripts/framing.mjs", slug)


def cmd_stills(slug, frames=None):
    cmd_register()
    cmd_framing(slug, force=False)
    run("node", "scripts/stills.mjs", slug, vdir(slug, "build", "stills"), *([frames] if frames else []))


def cmd_collide(slug):
    cmd_physics(slug, force=False)
    cmd_register()
    print("$ COLLIDE=1 node scripts/stills.mjs", slug, flush=True)
    subprocess.run(["node", "scripts/stills.mjs", slug, vdir(slug, "build", "collide")], cwd=ROOT, check=True, env={**os.environ, "COLLIDE": "1"})


# ---------- sync: the sound cues against the picture ----------

def cues_path(slug):
    return vdir(slug, "build", "cues.json")


def cmd_cues(slug, force=False):
    """The scene's resolved shot / effect / music tables (scripts/cues.mjs), dumped again when the scene or the
    engine is newer than the dump."""
    out = cues_path(slug)
    if force or not os.path.exists(out) or newest(sdir(slug), os.path.join(ROOT, "src", "engine")) > os.path.getmtime(out):
        cmd_register()
        run("node", "scripts/cues.mjs", slug, out)
    # Effects with a `space` play a baked file (public/space/<space>/<src>): make the missing ones now, before sync,
    # mix or render needs them.
    run(PY, "scripts/foley.py", "space", "--cues", out)
    return json.load(open(out))


def played_src(e):
    """The file a cue plays (engine/sound.tsx playedSrc): its own, or the version baked for its space."""
    return f"space/{e['space']}/{e['src']}" if e.get("space") and e.get("until") is None else e["src"]


LOOP_SNAP = 6  # frames: a looped effect that ends this close to a cut, but not on it, was meant to end on it
WHOOSH_SLACK = 3  # frames around a whip's FADE window that still count as "on" it


def sync_issues(slug):
    """Cue-level faults between the soundtrack and the picture: ("error" | "warn", message) pairs.
    Errors: cues outside the video, a missing file, narration past the end, no music anywhere. Warnings: a whip with
    no whoosh, a looped effect that just misses a cut, gaps in the music, a loop seam whose sound changes."""
    cues = cmd_cues(slug)
    timing = json.load(open(sdir(slug, "timing.json")))
    total = timing["totalFrames"]
    fade = int(re.search(r"FADE = (\d+)", open(os.path.join(ROOT, "src", "engine", "clock.tsx")).read()).group(1))
    names = {a: n for a, _, n, _ in shot_list(slug)}
    cuts = [a for a, _, _ in cues["shots"][1:]]
    out = []
    err = lambda m: out.append(("error", m))
    warn = lambda m: out.append(("warn", m))
    for e in cues["sfx"]:
        at, until, src = round(e["at"]), e.get("until"), e["src"]
        if not os.path.exists(os.path.join(ROOT, "public", played_src(e))):
            err(f"{played_src(e)} at {at}: no such file in public/")
        if at < 0 or at >= total:
            err(f"{src} at {at}: outside the video (0-{total})")
        if until is not None:
            until = round(until)
            if until <= at:
                err(f"{src} at {at}: loops until {until}, which is not after its start")
            elif until > total:
                err(f"{src} at {at}: loops until {until}, past the end ({total})")
            near = [c for c in cuts if 0 < abs(until - c) <= LOOP_SNAP]
            if near and until not in cuts and until != total:
                c = near[0]
                warn(f"{src} at {at}: loop ends at {until}, {abs(until - c)} frame(s) {'before' if until < c else 'after'} the cut to {names.get(c, c)} at {c}")
    # A whoosh on a whip is a habit, not a rule (rules.md): one line for all the silent whips.
    whooshes = [round(e["at"]) for e in cues["sfx"] if "whoosh" in e["src"]]
    silent = [a for a, _, whip in cues["shots"][1:] if whip is True and not any(a - fade - WHOOSH_SLACK <= w <= a + WHOOSH_SLACK for w in whooshes)]
    if silent:
        warn(f"{len(silent)} whip(s) without a whoosh in their {fade}-frame pan: " + ", ".join(f"{names.get(a, a)} {a}" for a in silent))
    music = sorted((round(m["from"]), round(m["to"]), m["src"]) for m in cues["music"])
    for a, b, src in music:
        if not os.path.exists(os.path.join(ROOT, "public", src)):
            err(f"music {src} ({a}-{b}): no such file in public/")
        if a < 0 or b > total:
            err(f"music {src} ({a}-{b}): outside the video (0-{total})")
    if not music:
        err("no music cue")
    else:
        reach = 0
        for a, b, src in music:
            if a - reach > 2:
                warn(f"no music in {reach}-{a} ({(a - reach) / FPS:.1f}s)")
            reach = max(reach, b)
        if total - reach > 2:
            warn(f"no music in {reach}-{total} (the end)")
    spoken = [l["to"] for l in timing.get("lines", [])] + [c["to"] for c in timing.get("captions", [])]
    if spoken and max(spoken) > total:
        err(f"the narration ends at {max(spoken)}, after the video ({total})")
    # The loop seam: the last frame plays into frame 0, so the same bed should be under both.
    bed = lambda f: sorted({m["src"] for m in cues["music"] if m["from"] <= f < m["to"]})
    held = lambda f: sorted({e["src"] for e in cues["sfx"] if e.get("until") is not None and e["at"] <= f < e["until"]})
    if bed(total - 1) != bed(0):
        warn(f"loop seam: music {', '.join(bed(total - 1)) or 'none'} at the end, {', '.join(bed(0)) or 'none'} at frame 0")
    if held(total - 1) != held(0):
        warn(f"loop seam: looped effects {', '.join(held(total - 1)) or 'none'} at the end, {', '.join(held(0)) or 'none'} at frame 0")
    return out


def cmd_sync(slug):
    """Check the sound cues against the picture (sync_issues); videos/<slug>/build/sync.txt lists every finding.
    Fails on errors only: warnings are for a look, some are on purpose."""
    issues = sync_issues(slug)
    report = vdir(slug, "build", "sync.txt")
    lines = [f"{level.upper():5s} {msg}" for level, msg in issues]
    open(report, "w").write("\n".join(lines) + ("\n" if lines else ""))
    print("\n".join(lines) or "sync: no issues")
    errors = sum(1 for level, _ in issues if level == "error")
    print(f"sync: {errors} error(s), {len(issues) - errors} warning(s) -> {os.path.relpath(report, ROOT)}")
    if errors:
        sys.exit(1)


# ---------- music: the video's own score ----------

def cmd_music(slug):
    """Run videos/<slug>/music.py (built on scripts/music/score.py) after a fresh cue dump: it writes
    public/videos/<slug>/music.wav, cut to the picture and looping into its own start, and build/score.md.
    The scene plays it with `score` on Video; without a music.py the video keeps the library loops."""
    script = vdir(slug, "music.py")
    if not os.path.exists(script):
        print(f"no videos/{slug}/music.py: {slug} uses the library loops")
        return
    cmd_cues(slug)
    run(PY, script, slug)


# ---------- mix: the voice over the bed ----------

def cmd_mix(slug):
    """Render the soundtrack's three stems (voice, music, effects; scripts/sound.mjs with STEM) into build/mix/ and
    measure how far the voice sits above the rest (scripts/mixreport.py -> build/mix/mix.md, mix.json)."""
    cmd_cues(slug)
    out = vdir(slug, "build", "mix")
    os.makedirs(out, exist_ok=True)
    for stem in ("voice", "music", "sfx"):
        print(f"$ STEM={stem} node scripts/sound.mjs {slug}", flush=True)
        subprocess.run(["node", "scripts/sound.mjs", slug, os.path.join(out, f"{stem}.wav")], cwd=ROOT, check=True, env={**os.environ, "STEM": stem})
    run(PY, "scripts/mixreport.py", slug, out)
    return json.load(open(os.path.join(out, "mix.json")))


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
    # Without the post chain the blank canvas keeps Stage's CSS vignette (corners ~0.6 of the centre), which a white
    # flash covers; with it the vignette is drawn in WebGL and goes too, so a bare flat run must outlast a flash (3-4).
    centre = g[:, 40:56, 20:34].mean((1, 2))
    corners = (g[:, :6, :6].mean((1, 2)) + g[:, :6, -6:].mean((1, 2)) + g[:, -6:, :6].mean((1, 2)) + g[:, -6:, -6:].mean((1, 2))) / 4
    vignette = corners < 0.85 * centre
    # a flash (an explosion, a cut to white) can hold for half a second, but it is near white; a lost canvas shows the
    # shot's background colour
    flat = list((sharp < 12) & (vignette | (centre < 235)))
    # a lost canvas stays lost for several frames (7-19 seen); a dark graphic can dip for one or two
    found, i = [], 0
    while i < len(flat):
        j = i
        while j < len(flat) and flat[j]:
            j += 1
        if j - i >= 6 or (j - i >= 3 and vignette[i:j].any()):
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
    """Frames of the scene's impact sounds, from the resolved cue dump (spreads included, e.g. cues built from a
    physics bake's impacts). If the dump fails, from the source: `at` may be an expression over numeric top-level
    constants (`42 + SLAP`); one that does not resolve is skipped."""
    try:
        impact = {f"sfx/{n}.wav" for n in IMPACT_SFX}
        return [round(e["at"]) for e in cmd_cues(slug)["sfx"] if e["src"] in impact or e.get("hit")]
    except SystemExit:
        print("cue dump failed: impact frames read from Scene.tsx", file=sys.stderr)
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
    """Shots and planned jumps for qa.py: whip pans and dissolves (FADE / DISSOLVE frames before the shot,
    engine/clock.tsx) and the 10-frame camera shake after every impact sound."""
    clock = open(os.path.join(ROOT, "src", "engine", "clock.tsx")).read()
    fade, dissolve = (int(re.search(rf"\b{k} = (\d+)", clock).group(1)) for k in ("FADE", "DISSOLVE"))
    shots = shot_list(slug)
    planned = [[a - (dissolve if t == "dissolve" else fade), a + 1] for a, _, _, t in shots if t]
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
    checked for broken frames (glitch_frames) and rendered again, up to RENDER_RETRIES times, until it is clean; a
    segment whose render process fails (a crashed browser) is rendered again the same way."""
    total = json.load(open(os.path.join(ROOT, "src", "videos", slug, "timing.json")))["totalFrames"]
    parts = []
    began = time.time()

    cuts = sorted({s[0] for s in shot_list(slug)} | {total})

    def segment(start, end, split=True):
        # A tab can die with "Page crashed!" (a V8 fatal check while copying an object literal, seen in kings-sticks
        # whenever one tab rendered across the cut at frame 1204). A crashed segment is rendered again one shot at a
        # time, so no tab crosses a cut.
        part = f"{out}.part{start}.mp4"
        for attempt in range(RENDER_RETRIES + 1):
            ok = run("npx", "remotion", "render", slug, part, f"--frames={start}-{end}", "--muted", *args,
                     check=False).returncode == 0
            clean_remotion_temp(began)
            if not ok:
                inner = [c for c in cuts if start < c <= end]
                if split and inner:
                    edges = [start] + inner + [end + 1]
                    print(f"render crashed in {start}-{end}, rendering it shot by shot: {edges}")
                    for a, b in zip(edges, edges[1:]):
                        segment(a, b - 1, split=False)
                    return
                # A segment with no cut inside it: a fresh browser usually gets through it.
                if attempt == RENDER_RETRIES:
                    raise SystemExit(f"render of frames {start}-{end} failed {RENDER_RETRIES + 1} times")
                print(f"render of frames {start}-{end} failed, rendering the segment again")
                continue
            found = glitch_frames(part, start)
            if not found:
                break
            print(f"broken (flat) frames {spans(found)} in {start}-{end}"
                  + (", rendering the segment again" if attempt < RENDER_RETRIES else ", giving up: check these frames as stills"))
        parts.append(part)

    for start in range(0, total, RENDER_SEGMENT):
        segment(start, min(total, start + RENDER_SEGMENT) - 1)
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
    cmd_cues(slug)  # bakes the effects' spaces the soundtrack plays
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
    mixed = cmd_mix(slug)
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
        ("speech_margin_p10", mixed["p10_min"] if mixed["p10_min"] is not None else 99.0, "{:.1f} LU"),
        ("effects_hot", sum(1 for e in mixed.get("effects", []) if e["margin"] is not None and e["margin"] > EFFECT_HOT), "{}"),
        ("effects_repeated", len(mixed.get("repeats", [])), "{}"),
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
        + (f" Unplanned white frames: {spans(qa['white'])}." if qa["white"] else "")
        + (f" **Audio and picture differ in length by {qa['av_gap']:+.3f} s.**" if abs(qa.get("av_gap") or 0) > 1.5 / FPS else ""),
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
STAGES = ("voice", "physics", "check", "sync", "music", "stills", "collide", "motion", "render", "report")
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


def plays_score(slug):
    """The scene plays its own score (`score` on Video), by the last cue dump."""
    p = cues_path(slug)
    return os.path.exists(p) and any(m["src"].endswith(f"videos/{slug}/music.wav") for m in json.load(open(p))["music"])


def stage_files(slug):
    voice = os.path.join(ROOT, "public", "videos", slug, "voice.wav")
    score = os.path.join(ROOT, "public", "videos", slug, "music.wav")
    mp4 = os.path.join(ROOT, "out", f"{slug}.mp4")
    return {
        "voice": (sdir(slug, "timing.json"), [vdir(slug, "lines.json")]),
        "physics": (sdir(slug, "physics.json"), [vdir(slug, "physics.mjs"), os.path.join(ROOT, "scripts", "physics.mjs")]),
        "check": (vdir(slug, "build", "check.ok"), [sdir(slug)]),
        "sync": (vdir(slug, "build", "sync.txt"), [sdir(slug), os.path.join(ROOT, "src", "engine", "sound.tsx")]),
        "music": (score, [vdir(slug, "music.py"), sdir(slug, "timing.json"), cues_path(slug), os.path.join(ROOT, "scripts", "music")]),
        "stills": (vdir(slug, "build", "stills", "contact.jpg"), [sdir(slug)]),
        "collide": (vdir(slug, "build", "collide", "collide.txt"), [sdir(slug)]),
        "motion": (os.path.join(ROOT, "out", "drafts", f"{slug}.mp4"), [sdir(slug), voice]),
        "render": (mp4, [sdir(slug), voice] + ([score] if plays_score(slug) else [])),
        "report": (vdir(slug, "report.md"), [mp4, vdir(slug, "plan.json"), vdir(slug, "research.md")]),
    }


HD_SIZE = "1440x2560"


def video_size(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                        "-of", "csv=s=x:p=0", path], capture_output=True, text=True)
    return r.stdout.strip()


def stage_states(slug, hd=False, probe=True):
    """[(stage, 'done' | 'stale' | 'missing', note)] in pipeline order. With `hd`, a render that is not 2K is stale.
    `probe=False` skips reading the render's size (the panel's list view)."""
    rows = []
    for stage, (out, inputs) in stage_files(slug).items():
        if not os.path.exists(out):
            state = "missing"
        else:
            state = "stale" if newest(*inputs) > os.path.getmtime(out) else "done"
        note = ""
        if stage == "render" and os.path.exists(out) and probe:
            size = video_size(out)
            note = size + ("" if size == HD_SIZE else ", not 2K (render --2k for delivery)")
            if hd and size != HD_SIZE:
                state = "stale"
        if stage == "voice" and (not os.path.exists(vdir(slug, "lines.json")) or "Replace me." in open(vdir(slug, "lines.json")).read()):
            note = "write lines.json first"
        if stage == "collide" and os.path.exists(out) and open(out).read().strip():
            note = f"{len(open(out).read().strip().splitlines())} collision(s) to fix"
        if stage == "check" and not os.path.exists(sdir(slug, "Scene.tsx")):
            note = "write src/videos/<slug>/Scene.tsx first"
        if stage == "sync" and os.path.exists(out) and open(out).read().strip():
            found = open(out).read().splitlines()
            errors = sum(1 for l in found if l.startswith("ERROR"))
            note = f"{errors} error(s), {len(found) - errors} warning(s) in build/sync.txt"
            if errors:
                state = "stale"
        if stage == "music" and not os.path.exists(vdir(slug, "music.py")):
            state, note = "done", "library loops (no videos/<slug>/music.py)"
        if stage == "physics" and not os.path.exists(vdir(slug, "physics.mjs")):
            state, note = "done", "no physics (no videos/<slug>/physics.mjs)"
        gate = GATES.get(stage)
        if gate and state != "done" and not approved(slug, gate):
            note = "; ".join(filter(None, [note, f"waits for `approve {slug} {gate}`"]))
        if stage in ("motion", "render") and state == "done":
            if newest(*(os.path.join(ROOT, "src", d) for d in SHARED)) > os.path.getmtime(out):
                note = "; ".join(filter(None, [note, "engine, puppets or sets changed since (affects every video; re-render only if needed)"]))
        rows.append((stage, state, note))
    return rows


# ---------- approvals ----------
# The user's OK on a stage's input, kept with that file's modification time: editing the file afterwards (new
# lines, new stills) makes the approval lapse. `go` stops before a gated stage until it is approved again; the
# stages run on their own whenever called.
GATED = {"script": lambda slug: vdir(slug, "lines.json"), "stills": lambda slug: stage_files(slug)["stills"][0]}
GATES = {"voice": "script", "render": "stills"}  # stage -> the approval it waits for in `go`


def approvals_path(slug):
    return vdir(slug, "build", "approvals.json")


def approvals(slug):
    p = approvals_path(slug)
    return json.load(open(p)) if os.path.exists(p) else {}


def approved(slug, gate):
    a, f = approvals(slug).get(gate), GATED[gate](slug)
    return bool(a) and os.path.exists(f) and abs(a["mtime"] - os.path.getmtime(f)) < 1e-3


def cmd_approve(slug, gate, undo=False):
    if gate not in GATED:
        sys.exit(f"approve what? {' | '.join(GATED)}")
    f = GATED[gate](slug)
    if not undo and not os.path.exists(f):
        sys.exit(f"nothing to approve: {os.path.relpath(f, ROOT)} does not exist")
    a = approvals(slug)
    if undo:
        a.pop(gate, None)
    else:
        a[gate] = {"mtime": os.path.getmtime(f), "at": time.strftime("%Y-%m-%d %H:%M:%S")}
    os.makedirs(os.path.dirname(approvals_path(slug)), exist_ok=True)
    json.dump(a, open(approvals_path(slug), "w"), indent=1)
    print(f"{slug}: {gate} {'approval withdrawn' if undo else 'approved'} ({os.path.relpath(f, ROOT)})")


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
    given = approvals(slug)
    print("  approvals: " + ", ".join(f"{g} {'ok ' + given[g]['at'] if approved(slug, g) else ('lapsed (file changed)' if g in given else 'no')}" for g in GATED))
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
        "voice": lambda: cmd_voice(slug), "physics": lambda: cmd_physics(slug), "check": lambda: cmd_check(slug), "sync": lambda: cmd_sync(slug),
        "music": lambda: cmd_music(slug), "stills": lambda: cmd_stills(slug),
        "collide": lambda: cmd_collide(slug), "motion": lambda: cmd_motion(slug),
        "render": lambda: cmd_render(slug, hd), "report": lambda: cmd_report(slug),
    }
    for stage in upto:
        _, state, note = next(r for r in stage_states(slug, hd) if r[0] == stage)
        if state == "done":
            continue
        if stage == "voice" and (not os.path.exists(vdir(slug, "lines.json")) or "Replace me." in open(vdir(slug, "lines.json")).read()):
            sys.exit("stopped: write lines.json first")
        gate = GATES.get(stage)
        if gate and not approved(slug, gate):
            look = "read lines.json with the user" if gate == "script" else "look at build/stills/contact.jpg with the user"
            sys.exit(f"stopped before {stage}: {gate} not approved ({look}, then `pipeline.py approve {slug} {gate}`)")
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


# ---------- look: our frames against reference frames ----------

IMAGES = (".jpg", ".jpeg", ".png", ".webp")


def cmd_look(slug, refs, frames=None):
    """Stills of the video with the post chain on (the look being matched), then scripts/look.py: the numbers
    against every image in `refs` (look.md) and a side-by-side sheet of up to 6 of each (sbs.jpg)."""
    ref = sorted(os.path.join(refs, f) for f in os.listdir(refs) if f.lower().endswith(IMAGES))
    if not ref:
        sys.exit(f"no images in {refs}")
    out = vdir(slug, "build", "look")
    cmd_register()
    cmd_framing(slug, force=False)
    print("$ POST=1 node scripts/stills.mjs", slug, flush=True)
    subprocess.run(["node", "scripts/stills.mjs", slug, out, *([frames] if frames else [])], cwd=ROOT, check=True, env={**os.environ, "POST": "1"})
    ours = sorted(os.path.join(out, f) for f in os.listdir(out) if f[0].isdigit() and f.endswith(".jpg"))
    run(PY, "scripts/look.py", "measure", os.path.join(out, "look.md"), "--ours", *ours, "--ref", *ref)
    pick = lambda xs: [xs[round(i * (len(xs) - 1) / 5)] for i in range(6)] if len(xs) > 6 else xs
    run(PY, "scripts/look.py", "sbs", os.path.join(out, "sbs.jpg"), "--ours", *pick(ours), "--ref", *pick(ref))


def cmd_web(port):
    sys.path.insert(0, os.path.join(ROOT, "scripts"))
    import web

    web.serve(port)


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
            "physics": lambda: cmd_physics(args[0]),
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
            "sync": lambda: cmd_sync(args[0]),
            "cues": lambda: cmd_cues(args[0], force=True),
            "music": lambda: cmd_music(args[0]),
            "mix": lambda: cmd_mix(args[0]),
            "look": lambda: cmd_look(args[0], args[1], args[2] if len(args) > 2 else None),
            "approve": lambda: cmd_approve(args[0], args[1] if len(args) > 1 else "", flag(args, "--undo")),
            "web": lambda: cmd_web(int(option(args, "--port", "8766"))),
            "go": lambda: cmd_go(args[0], option(args, "--to", "motion"), flag(args, "--plan"), hd),
        }[cmd]
        optional = {"music": "music.py", "physics": "physics.mjs"}  # stages that do nothing without their file
        if cmd in STAGES and args and not (cmd in optional and not os.path.exists(vdir(args[0], optional[cmd]))):
            timed(args[0], cmd, call, given[1:])
        else:
            call()
    except KeyboardInterrupt:  # Ctrl-C, or Stop in the panel: the cleanup below still runs, no traceback
        print("stopped", file=sys.stderr)
        sys.exit(130)
    finally:
        clean_remotion_temp(started)
        shutil.rmtree(tempfile.tempdir, ignore_errors=True)

