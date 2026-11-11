# Explainer-cartoon pipeline: the deterministic stages. The creative stages (research, script, scene code,
# review) are done by Claude Code following .claude/skills/make-video/SKILL.md; this file runs everything else.
#
#   .venv/bin/python scripts/pipeline.py new <slug> "<topic>"   scaffold videos/<slug>/ and src/videos/<slug>/
#   .venv/bin/python scripts/pipeline.py voice <slug>           Qwen TTS -> fitted track -> timing.json + pace check; ends
#                                                              non-zero (after writing everything) when the pace misses
#   .venv/bin/python scripts/pipeline.py pace <slug>            duration, words, wpm + speech_cover and long_pauses on the
#                                                              voice track -> build/pace.json (voice runs it); non-zero on a miss
#   .venv/bin/python scripts/pipeline.py physics <slug>         bake videos/<slug>/physics.mjs (Rapier, scripts/physics.mjs)
#                                                              -> src/videos/<slug>/physics.json (run by check/stills when stale)
#   .venv/bin/python scripts/pipeline.py register               regenerate src/videos/index.ts
#   .venv/bin/python scripts/pipeline.py check <slug>           tsc + rule checks on the scene's shot list (hook beats, shots,
#                                                              hard cuts; a whip warns) + plan.json targets (locations,
#                                                              characters, gags, seed_by) + costume pieces out of period for `year`
#   .venv/bin/python scripts/pipeline.py sync <slug>            sound cues vs the picture (scripts/cues.mjs dump) -> build/sync.txt
#   .venv/bin/python scripts/pipeline.py music <slug>           the video's own score: videos/<slug>/music.py (scripts/music)
#                                                              -> public/videos/<slug>/music.wav + build/score.md
#   .venv/bin/python scripts/pipeline.py mix <slug>             voice / music / effects stems -> voice over the bed per section
#                                                              and per line (scripts/mixreport.py) -> build/mix/mix.md
#   .venv/bin/python scripts/pipeline.py stills <slug> [frames] [--shots 3,5]
#                                                              one still per second + the start, middle and end of every
#                                                              shot (or given frames, or every 15 frames through the chosen
#                                                              shots) + contact sheet; a few frames or shots re-measure only
#                                                              their shots' head framing (-> build/stills-check/). The whole-video
#                                                              sheet also gets hue_families and top_hue_share measured
#                                                              the report's way -> build/stills/colour.txt
#   .venv/bin/python scripts/pipeline.py collide <slug> [--shots 3,5]
#                                                              every 5th frame (of the chosen shots): puppets walking or
#                                                              standing inside set objects (--shots -> build/collide-shots/).
#                                                              No pictures: three tabs walk the frames (about 7 min a video, --shots ~30 s)
#   .venv/bin/python scripts/pipeline.py motion <slug> [--shots 3,5]
#                                                              30 % draft render + motion per shot (stillest first) + the
#                                                              colour of the draft (build/colour-draft.txt) + the
#                                                              frame-by-frame QA on the draft (-> build/qa-draft/)
#   .venv/bin/python scripts/pipeline.py framing <slug>         head-framing pre-pass -> public/videos/<slug>/framing.json
#                                                              (run by stills/motion/render when the scene changed)
#   .venv/bin/python scripts/pipeline.py render <slug> [--2k] [--shots 3,5]
#                                                              full MP4 -> output/<slug>.mp4 (broken shots rendered again),
#                                                              then qa; --2k renders the 1440x2560 delivery size.
#                                                              The picture is kept per shot in build/parts/; --shots (motion
#                                                              and render) renders only the shots that changed and reuses the rest
#   .venv/bin/python scripts/pipeline.py glitch <slug> [mp4]    flat runs in a render (a lost WebGL canvas); render retries them
#   .venv/bin/python scripts/pipeline.py qa <slug> [mp4]        frame-by-frame QA (scripts/qa.py) -> videos/<slug>/build/qa/
#   .venv/bin/python scripts/pipeline.py report <slug>          measure the MP4, check facts, write videos/<slug>/report.md
#   .venv/bin/python scripts/pipeline.py status <slug>          every stage done / stale / missing, run times, next command
#   .venv/bin/python scripts/pipeline.py look <slug> <ref-dir> [frames]
#                                                              our stills (post chain on) measured against reference frames
#                                                              (scripts/look.py) -> build/look/look.md + sbs.jpg
#   .venv/bin/python scripts/pipeline.py approve <slug> script|stills [--undo] [--force]
#                                                              record the OK on lines.json / the final contact sheet
#                                                              (build/approvals.json); lapses when that file changes.
#                                                              Refused while the voice's pace (script) or the sheet's
#                                                              colour (stills) misses, unless --force
#   .venv/bin/python scripts/pipeline.py go <slug> [--to stage] [--plan] [--2k]
#                                                              run the missing / stale stages in order (default up to motion),
#                                                              stopping at an approval the files have outgrown, a pace
#                                                              miss at voice, a colour miss at stills or motion, a collision
#   .venv/bin/python scripts/pipeline.py web [--port 8766]      browser panel: every video's stages, run / stop, live log, outputs
# voice, physics, check, sync, music, stills, collide, motion, render and report append their run time to
# videos/<slug>/build/timings.jsonl. Every script renders from one shared bundle (scripts/bundle.mjs, out/bundles/),
# and the heavy stages (framing pass, collide, motion, render) take a machine-wide lock (out/heavy.lock) so two videos
# made at once queue their GPU work instead of halving each other's speed.
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

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # animator/: the Remotion project
REPO = os.path.dirname(ROOT)
VIDEOS = os.path.join(REPO, "videos")  # per-video work: script, research, music.py, build/
OUT = os.path.join(REPO, "output")  # rendered MP4s (gitignored)
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
    "shots": (9, 12),  # one shot per location visit; the camera travels inside it instead of cutting
    "avg_shot": (4.0, 7.0),  # seconds
    "shortest_shot": (1.5, None),
    "longest_shot": (0, 10.0),
    "hard_cuts": (0, 1),  # `false` transitions after the first shot; locations change with a cream "dip"
    "locations": (8, None),
    "characters": (4, None),
    "gags": (2, None),
    "hue_families": (5, 12),
    "top_hue_share": (0, 0.40),
    "seed_by": (0, 20),  # seconds: the twist's object or person first appears
    "lufs": (-17, -14),
    # PROVISIONAL: the old fast-cut, hand-held references gave 8.0 and 10 %; the slow gliding camera (rules.md →
    # Camera) moves less per frame. Recalibrate from the first video made with it.
    "motion": (3.0, None),  # median frame-to-frame change (10 fps, 54x96)
    "still_share": (0, 0.30),  # share of frame pairs that barely change (< 2)
    "glitch_frames": (0, 0),  # broken frames in the render (lost WebGL canvas); render retries them
    "black_frames": (0, 0),  # qa.py: frames with mean luma < 4 %
    "frozen_spans": (0, 0),  # qa.py: 12+ frames without any change
}


def run(*cmd, cwd=ROOT, check=True, capture=False):
    print("$", " ".join(cmd), flush=True)
    return subprocess.run(cmd, cwd=cwd, check=check, text=True, capture_output=capture)


def vdir(slug, *p):
    return os.path.join(VIDEOS, slug, *p)


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


def gate_line(key, value, fmt="{}", ok=None, target=None, note=""):
    """One `  ok   key = value (target ...)` / `  MISS ...` line for a target measured before the report."""
    if ok is None:
        ok = within(key, value)
    target = target or mark(key, value)[0].split("|")[3].strip()
    return ("  ok   " if ok else "  MISS ") + f"{key} = {fmt.format(value)} (target {target}{note})"


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
    "year": "The year the story is set in: a number (negative for BC), [from, to] for a span, or null for a present-day story. `check` tests the costumes against it.",
    "mechanism": "One sentence: the hidden real-world system this video reveals.",
    "beats": {"hook": "", "but": "", "then": "", "conflict": "", "pivot": "You see ...", "so": "So ...", "closing": ""},
    "triple_hook": {
        "visual": "What is in frame and already moving at frame 0 (answers: what is happening?)",
        "verbal": "The first sentence, from frame 0 (answers: why should I care?)",
        "text": "The shot-1 Headline, 2-6 words, not the spoken words (answers: what is this about?)",
    },
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
    misses = pace_check(slug, stop=False)
    print("\nline frames (cut shots to these):")
    for l in t["lines"]:
        print(f"  {l['i']:02d} {l['from']:5d}-{l['to']:5d} {l['speaker']:8s} {l['text']}")
    pace_stop(slug, misses)  # after every output is written and printed


# The report measures speech_cover and long_pauses on the final mix; on the bare voice track whisper finds a little
# more cover (music and effects hide word edges). Over 51 videos (17 against their MP4, 34 against the report's
# rounded figure) the voice track read a median 0.3 points higher, 1.4 at the 90th percentile and 2.6 at most, and
# three videos lost more than 2.0. With this margin none of the 16 videos that missed 80 % in the report would have
# passed here (two of them read above 80 % on the voice track); a 3-point margin would only stop more videos that
# pass. long_pauses is whisper-jittery by one either way between track and mix (9 of the 10 report misses show here).
VOICE_COVER_MARGIN = 0.02

# What to change in lines.json for each pace miss (SKILL.md step 4), by (metric, too low / too high).
PACE_HINTS = {
    ("words", "low"): "add a sentence or a few words (180-210)",
    ("words", "high"): "cut a sentence or a few words (180-210)",
    ("duration", "low"): "add a few words or a line; do not slow the voice down to fill time",
    ("duration", "high"): "cut words, or tempo +0.05 on the slowest speaker",
    ("wpm", "low"): "tempo +0.05 on the slow speaker, or a shorter pauseAfter",
    ("wpm", "high"): "tempo -0.05 on the fast speaker",
    ("long_pauses", "high"): "shorten or drop pauseAfter (only the lines before the pivot and before the closing line may carry about 0.4), or join two short lines",
    ("speech_cover", "low"): "a few more words in the lines with the longest silence after them, a shorter pauseAfter, or tempo +0.05 on a slow speaker",
}


def pace_path(slug):
    return vdir(slug, "build", "pace.json")


def voice_current(slug):
    """timing.json and voice.wav exist and are not older than lines.json (the voice is of these lines)."""
    wav, timing, lines = os.path.join(ROOT, "public", "videos", slug, "voice.wav"), sdir(slug, "timing.json"), vdir(slug, "lines.json")
    return all(map(os.path.exists, (wav, timing, lines))) and os.path.getmtime(timing) >= os.path.getmtime(lines)


def pace_check(slug, stop=True):
    """words and duration (timing.json) and wpm, speech_cover and long_pauses (whisper on the voice track), measured
    right after `voice`, so a miss is fixed in lines.json before any scene work instead of being found by the report
    after the 2K render. Writes build/pace.json and returns the misses [(metric, value text, fix hint)]. With `stop`
    (the `pace` command) a miss ends the run non-zero, like `voice` does after printing its line frames."""
    wav = os.path.join(ROOT, "public", "videos", slug, "voice.wav")
    t = json.load(open(sdir(slug, "timing.json")))
    words = sum(len(l["text"].split()) for l in t["lines"])
    dur = t["totalFrames"] / FPS
    m = audio_metrics(wav)
    # wpm the report's way: the words whisper hears per minute. It reads up to 8 below the script's own count
    # (a number or a hyphenated word is one word to whisper), which is how videos passed here and missed there.
    wpm, script_wpm = m["wpm"], words / dur * 60
    cover_lo = TARGETS["speech_cover"][0] + VOICE_COVER_MARGIN
    print(f"\n{dur:.1f}s, {words} words, {wpm:.0f} wpm heard by whisper ({script_wpm:.0f} by the script's word count)")
    rows = [  # (metric, value, format, ok, line)
        ("duration", dur, "{:.1f}", within("duration", dur), None),
        ("words", words, "{}", within("words", words), None),
        ("wpm", wpm, "{:.0f}", within("wpm", wpm), None),
        ("long_pauses", m["long_pauses"], "{}", within("long_pauses", m["long_pauses"]), None),
        ("speech_cover", m["speech_cover"], "{:.1%}", m["speech_cover"] >= cover_lo,
         gate_line("speech_cover", m["speech_cover"], "{:.1%}", m["speech_cover"] >= cover_lo, f"≥ {cover_lo:.0%}",
                   f" on the voice track: the final mix measures up to {VOICE_COVER_MARGIN * 100:.0f} points lower")),
    ]
    misses = []
    for key, val, fmt, ok, line in rows:
        print(line or gate_line(key, val, fmt, ok))
        if not ok:
            lo = cover_lo if key == "speech_cover" else TARGETS[key][0]
            hint = PACE_HINTS[(key, "low" if lo is not None and val < lo else "high")]
            misses.append((key, fmt.format(val), hint))
            print(f"         fix: {hint}")
    os.makedirs(os.path.dirname(pace_path(slug)), exist_ok=True)
    json.dump({"voice_mtime": os.path.getmtime(wav), "duration": dur, "words": words, "wpm": wpm, "script_wpm": script_wpm,
               "long_pauses": int(m["long_pauses"]), "speech_cover": float(m["speech_cover"]),
               "misses": [list(x) for x in misses]}, open(pace_path(slug), "w"), indent=1)
    if stop:
        pace_stop(slug, misses)
    return misses


def pace_misses(slug, measure=False):
    """The pace misses of the current voice track from build/pace.json: [] when it passes, None when it has not been
    measured for this track (no voice yet, lines.json edited since, or a voice made before pace.json existed).
    With `measure` an unmeasured current track is measured now (whisper, ~20 s)."""
    if not voice_current(slug):
        return None
    wav = os.path.join(ROOT, "public", "videos", slug, "voice.wav")
    p = pace_path(slug)
    saved = json.load(open(p)) if os.path.exists(p) else None
    if saved and abs(saved["voice_mtime"] - os.path.getmtime(wav)) < 1e-3:
        return [tuple(x) for x in saved["misses"]]
    return pace_check(slug, stop=False) if measure else None


def pace_waived(slug):
    """The script was approved with --force while the pace missed, and lines.json has not changed since."""
    return approved(slug, "script") and bool(approvals(slug)["script"].get("forced"))


def pace_stop(slug, misses):
    """End the run non-zero on a pace miss (so `go` stops at voice), unless the script approval waived it."""
    if not misses:
        return
    what = ", ".join(f"{k} {v}" for k, v, _ in misses)
    if pace_waived(slug):
        print(f"\npace misses ({what}) accepted by `approve {slug} script --force`")
        return
    sys.exit(f"\npace MISS: {what}. Fix lines.json now (hints above) and run `voice` again (unchanged lines are cached): "
             f"after the scene is built a re-voice moves every cut. `pace {slug}` re-measures without re-voicing; "
             f"`approve {slug} script --force` accepts the miss.")


# ---------- register ----------

def cmd_register():
    base = os.path.join(ROOT, "src", "videos")
    slugs = sorted(d for d in os.listdir(base) if os.path.exists(os.path.join(base, d, "Scene.tsx")))
    lines = ["// Generated by scripts/pipeline.py (register). One entry per folder in src/videos/ that has a Scene.tsx."]
    lines += [f'import * as v{i} from "./{s}/Scene";' for i, s in enumerate(slugs)]
    # A scene may export SIZE = [width, height] (16:9 long form); the rest are 1080x1920 Shorts.
    entries = ", ".join(f"{{ slug: v{i}.SLUG, Scene: v{i}.Scene, frames: v{i}.timing.totalFrames, size: (v{i} as {{ SIZE?: [number, number] }}).SIZE }}" for i in range(len(slugs)))
    lines += ["", f"export const VIDEOS = [{entries}];", ""]
    open(os.path.join(base, "index.ts"), "w").write("\n".join(lines))
    print("registered:", ", ".join(slugs))


# ---------- check ----------

SHOT_RE = re.compile(r"\[\s*(\d+)\s*,\s*(\d+|TIMING\.totalFrames)\s*,\s*(\w+)\s*,\s*(true|false|\"dissolve\"|\"dip\")\s*\]")


def shot_list(slug):
    src = open(sdir(slug, "Scene.tsx")).read()
    body = src[src.index("const SHOTS") :]
    total = json.load(open(sdir(slug, "timing.json")))["totalFrames"]
    # the transition in: True (whip pan), "dissolve", "dip" or False (a cut)
    trans = lambda t: True if t == "true" else t.strip('"') if t.startswith('"') else False
    return [(int(a), total if b.startswith("TIMING") else int(b), name, trans(fade)) for a, b, name, fade in SHOT_RE.findall(body)]


# The fast opening (rules.md → Story, Hook): 2-3 quick beats of the strange event, hard cuts between them, all over by
# 3.5 s. They are not location shots: the shot count, the shortest and average shot and the hard-cut limit are
# measured on the shots after them.
HOOK_END = 105  # frames
HOOK_BEAT_MIN = 0.6  # seconds (rules.md says 0.7; scaffold falls back to 0.6 when the first sentence is short)
HOOK_BEAT_MAX = 1.5  # seconds
HOOK_BEATS_MIN = 2
HOOK_BEATS_MAX = 3


def split_hook(shots):
    """(hook beats, body shots). Beats are the leading shots that end by HOOK_END, when there are at least two; a
    video that opens on one longer shot has none."""
    beats = [s for s in shots if s[1] <= HOOK_END]
    return (beats, shots[len(beats):]) if len(beats) >= 2 else ([], shots)


def shot_stats(slug):
    """(all shots, average and longest length of the body shots in seconds)."""
    shots = shot_list(slug)
    lens = [(b - a) / FPS for a, b, _, _ in split_hook(shots)[1]]
    return shots, sum(lens) / len(lens), max(lens)


def hard_cuts(shots):
    """`false` transitions among the body shots, after the first: the cut from the last hook beat into shot 1 is part
    of the fast opening (scaffold writes it), so it is not counted."""
    return sum(1 for _, _, _, t in shots[1:] if t is False)


def seed_seconds(slug, plan=None, timing=None):
    """When the plan's seed first appears: the start of its `first_line` in timing.json (999 when out of range)."""
    plan = plan if plan is not None else json.load(open(vdir(slug, "plan.json")))
    timing = timing if timing is not None else json.load(open(sdir(slug, "timing.json")))
    seed = plan.get("seed")
    line = seed.get("first_line", 0) if isinstance(seed, dict) else None
    return timing["lines"][line]["from"] / FPS if isinstance(line, int) and 0 <= line < len(timing["lines"]) else 999


def plan_problems(slug):
    """The report's plan targets (locations, characters, gags, seed_by), measured at `check` from plan.json and
    timing.json so a miss shows before the render."""
    path = vdir(slug, "plan.json")
    if not os.path.exists(path):
        return [f"no videos/{slug}/plan.json"]
    plan = json.load(open(path))
    out = []
    for key, what in (("locations", "locations"), ("characters", "characters"), ("gags", "gags")):
        n = len(plan.get(key) or [])
        if not within(key, n):
            out.append(f"plan.json has {n} {what} (want ≥ {TARGETS[key][0]})")
    seed = seed_seconds(slug, plan)
    if seed == 999:
        out.append("plan.json `seed.first_line` is missing or not a line index of timing.json")
    elif not within("seed_by", seed):
        out.append(f"the seed's first line starts at {seed:.1f}s (want ≤ {TARGETS['seed_by'][1]}s): move `seed.first_line` earlier")
    return out


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
    beats, body = split_hook(shots)
    for a, b, n, _ in body:
        if (b - a) / FPS > TARGETS["longest_shot"][1]:
            problems.append(f"{n} is {(b - a) / FPS:.1f}s (max {TARGETS['longest_shot'][1]}s)")
        if (b - a) / FPS < TARGETS["shortest_shot"][0]:
            problems.append(f"{n} is {(b - a) / FPS:.1f}s (min {TARGETS['shortest_shot'][0]}s; only hook beats that end by {HOOK_END / FPS:.1f}s may be shorter)")
    for a, b, n, _ in beats:
        if (b - a) / FPS < HOOK_BEAT_MIN:
            problems.append(f"hook beat {n} is {(b - a) / FPS:.1f}s (min {HOOK_BEAT_MIN}s: shorter does not read)")
        if (b - a) / FPS > HOOK_BEAT_MAX:
            problems.append(f"hook beat {n} is {(b - a) / FPS:.1f}s (max {HOOK_BEAT_MAX}s: the fast opening drags)")
    if len(beats) < HOOK_BEATS_MIN:
        problems.append(f"no fast opening: the first shot runs past {HOOK_END / FPS:.1f}s; cut the first sentence into "
                        f"{HOOK_BEATS_MIN}-{HOOK_BEATS_MAX} hook beats of {HOOK_BEAT_MIN}-{HOOK_BEAT_MAX}s that end by then (rules.md → Story 1)")
    if len(beats) > HOOK_BEATS_MAX:
        problems.append(f"{len(beats)} hook beats (at most {HOOK_BEATS_MAX} before {HOOK_END / FPS:.1f}s)")
    if not within("shots", len(body)):
        problems.append(f"{len(body)} shots after the hook (want {TARGETS['shots'][0]}-{TARGETS['shots'][1]}: one per location visit)")
    cuts = hard_cuts(body)
    if cuts > TARGETS["hard_cuts"][1]:
        problems.append(f"{cuts} hard cuts (at most {TARGETS['hard_cuts'][1]}): change location with \"dip\", stay in one with a camera move")
    whips = [n for _, _, n, t in shots[1:] if t is True]
    if whips:
        print(f"  WARN whip transition (`true`) into {', '.join(whips)}: new videos use \"dip\", \"dissolve\" or one hard cut (rules.md → Transitions)")
    problems += plan_problems(slug)
    print((f"{len(beats)} hook beats + " if beats else "") + f"{len(body)} shots, average {avg:.2f}s, longest {longest:.2f}s, hard cuts {cuts}")
    out_of_period = 0
    try:
        costume, summary, out_of_period = costume_problems(slug)
        print(summary)
        problems += costume
    except Exception as e:  # a bug in this lint must never block a video
        print(f"  WARN costume check failed: {e!r}")
    for p in problems:
        print("  MISS", p)
    if out_of_period:
        print("  A look that is right on purpose (a present-day historian in an 1815 story) gets `// period-ok: <why>` on one of its lines.")
    marker = vdir(slug, "build", "check.ok")
    if res.returncode or problems:
        if os.path.exists(marker):
            os.remove(marker)
        sys.exit(1)
    os.makedirs(os.path.dirname(marker), exist_ok=True)
    open(marker, "w").write(time.strftime("%Y-%m-%d %H:%M:%S\n"))


# ---------- period costume (part of check) ----------
# The years each costume piece belongs to (None = open-ended), checked against plan.json `year`. Coarse on purpose and
# only for pieces that read as one era whatever their colour (a bowler at Waterloo, a lanyard on an 1880s lawman);
# `vest`, `suspenders` and `shoes` pass for older dress in the right colours, so the plan and the stills review judge
# those and the rest of the costume. A look that is right on purpose carries `// period-ok: <why>` on one of its lines.
COSTUME_ERAS = {  # PuppetLook field -> (from, until, what it is)
    "cap": (1900, None, "a backwards baseball cap"),
    "lanyard": (1950, None, "an ID lanyard"),
    "shorts": (1900, None, "athletic shorts"),
    "bib": (1900, None, "a race number bib"),
    "glasses": (1300, None, "glasses"),
    "tunic": (None, 1500, "the early-medieval / Roman tunic"),
    "mail": (None, 1600, "a mail shirt"),
}
HAT_ERAS = {  # hatStyle -> (from, until)
    "bowler": (1850, None), "boater": (1860, None), "shako": (1790, 1920),
    "stahl": (1916, None), "helmet": (1941, None), "galea": (-200, 400),
}
ITEM_ERAS = {"phone": (1990, None, "a mobile phone")}  # pose `hold.item` -> (from, until, what it is)
YEAR_HELP = "write the year the story is set in (a number, negative for BC, or [from, to]), or null for a present-day story"
UNSET = ("undefined", "false", "null", "")


def _year(y):
    return f"{-y} BC" if y < 0 else str(y)


def _era(a, b):
    return f"from {_year(a)}" if b is None else f"until {_year(b)}" if a is None else f"{_year(a)}-{_year(b)}"


def _scan(code, i, quote):
    """One step of a string-aware walk over TS source: (next index, quote state, whether code[i] is code)."""
    c = code[i]
    if quote:
        if c == "\\":
            return i + 2, quote, False
        if c == quote or (c == "\n" and quote != "`"):  # a ' or " string never spans lines: a JSX apostrophe stays local
            return i + 1, None, False
        return i + 1, quote, False
    if c in "\"'`":
        return i + 1, c, False
    return i + 1, None, True


def _blank_comments(src):
    """The source with comments turned into spaces; newlines stay, so offsets and line numbers still match."""
    out, i, quote = list(src), 0, None
    while i < len(src):
        if not quote and src.startswith("//", i):
            j = src.find("\n", i)
            j = len(src) if j < 0 else j
            out[i:j] = " " * (j - i)
            i = j
        elif not quote and src.startswith("/*", i):
            j = src.find("*/", i + 2)
            j = len(src) if j < 0 else j + 2
            out[i:j] = [ch if ch == "\n" else " " for ch in src[i:j]]
            i = j
        else:
            i, quote, _ = _scan(src, i, quote)
    return "".join(out)


def _objects(code):
    """(start, end) of every {...} in comment-free code, braces inside strings skipped."""
    spans, stack, i, quote = [], [], 0, None
    while i < len(code):
        c = code[i]
        i, quote, is_code = _scan(code, i, quote)
        if is_code and c == "{":
            stack.append(i - 1)
        elif is_code and c == "}" and stack:
            spans.append((stack.pop(), i - 1))
    return spans


def _entries(code, start, end):
    """Top-level entries of the object code[start..end] as (offset, key, value); a spread has key '...'."""
    out, depth, quote, piece, i = [], 0, None, start + 1, start + 1

    def flush(a, b):
        text = code[a:b]
        s = text.strip()
        off = a + len(text) - len(text.lstrip())
        if s.startswith("..."):
            out.append((off, "...", s[3:].strip()))
        elif re.fullmatch(r"\w+", s):  # shorthand `{ skin, hair }`
            out.append((off, s, s))
        elif (m := re.match(r"(\w+)\s*\??\s*:\s*(.*)\Z", s, re.S)):
            out.append((off, m.group(1), m.group(2).strip()))

    while i < end:
        c = code[i]
        i, quote, is_code = _scan(code, i, quote)
        if not is_code:
            continue
        if c in "([{":
            depth += 1
        elif c in ")]}":
            depth -= 1
        elif c == "," and depth == 0:
            flush(piece, i - 1)
            piece = i
    flush(piece, end)
    return out


def costume_problems(slug, year=None):
    """Costume pieces in the video's looks (and held items) that do not fit the story's year, as check MISS lines.
    Returns (problems, summary line, number of out-of-period pieces). `year` overrides plan.json's."""
    if year is None:
        plan = vdir(slug, "plan.json")
        data = json.load(open(plan)) if os.path.exists(plan) else {}
        if "year" not in data:  # videos made before the check
            return [], "costume: plan.json has no `year`, not checked", 0
        if data["year"] is None:
            return [], "costume: present-day story (`year` null), not checked", 0
        year = data["year"]
    whole = lambda y: isinstance(y, int) and not isinstance(y, bool)
    if not (whole(year) or (isinstance(year, list) and len(year) == 2 and all(whole(y) for y in year))):
        return [f"plan.json `year`: {YEAR_HELP}"], "costume: plan.json `year` is not a year", 0
    lo, hi = (year, year) if whole(year) else (min(year), max(year))
    story = _year(lo) if lo == hi else f"{_year(lo)}-{_year(hi)}"
    clash = lambda a, b: (a is not None and hi < a) or (b is not None and lo > b)
    found, looks = [], 0
    for dirpath, _, files in os.walk(sdir(slug)):
        for name in sorted(files):
            if not name.endswith((".ts", ".tsx")):
                continue
            path = os.path.join(dirpath, name)
            src = open(path, encoding="utf-8").read()
            lines, code, rel = src.split("\n"), _blank_comments(src), os.path.relpath(path, ROOT)
            line_of = lambda off: code.count("\n", 0, off) + 1

            def excused(a, b):  # `period-ok` on the look's own lines, or on a comment line right above it
                if any("period-ok" in lines[k] for k in range(a - 1, min(len(lines), b))):
                    return True
                prev = lines[a - 2].strip() if a >= 2 else ""
                return prev.startswith("//") and "period-ok" in prev

            def assigned(start):  # the const an object literal is assigned to, if any
                m = re.search(r"(?:const|let|var)\s+(\w+)\s*(?::[^=;{}]*)?=\s*$", code[max(0, start - 200):start])
                return m.group(1) if m else None

            parsed = [(s, _entries(code, *s)) for s in _objects(code)]
            names = set(re.findall(r"(?:const|let|var)\s+(\w+)\s*:\s*PuppetLook\b", code))
            names |= {assigned(s[0]) for s, ents in parsed if any(k == "skin" for _, k, _ in ents)} - {None}
            for (start, end), ents in parsed:
                if not any(k == "skin" or (k == "..." and v in names) for _, k, v in ents):
                    continue
                looks += 1
                if excused(line_of(start), line_of(end)):
                    continue
                who = assigned(start) or "a look"
                for off, k, v in ents:
                    if v in UNSET:
                        continue
                    if k == "hatStyle":
                        for style in re.findall(r"[\"'](\w+)[\"']", v):
                            if style in HAT_ERAS and clash(*HAT_ERAS[style]):
                                found.append(f'{rel}:{line_of(off)} {who}: hatStyle "{style}" ({_era(*HAT_ERAS[style])}) in a story set in {story}')
                    elif k in COSTUME_ERAS and clash(*COSTUME_ERAS[k][:2]):
                        a, b, what = COSTUME_ERAS[k]
                        found.append(f"{rel}:{line_of(off)} {who}: `{k}` is {what} ({_era(a, b)}) in a story set in {story}")
            for m in re.finditer(r"\bhold\s*:\s*\{[^{}]*?\bitem\s*:\s*[\"'](\w+)[\"']", code):
                item, ln = m.group(1), line_of(m.start())
                if item in ITEM_ERAS and clash(*ITEM_ERAS[item][:2]) and not excused(ln, ln):
                    a, b, what = ITEM_ERAS[item]
                    found.append(f'{rel}:{ln} hold item "{item}" is {what} ({_era(a, b)}) in a story set in {story}')
    return found, f"costume: story set in {story}, {looks} looks checked, {len(found)} pieces out of period", len(found)


# ---------- stills / render ----------

# ---------- shared bundle, heavy-stage lock ----------

def bundle_dir():
    """The shared Remotion bundle for the current src/ (scripts/bundle.mjs builds it when src/ changed)."""
    return run("node", "scripts/bundle.mjs", capture=True).stdout.strip().splitlines()[-1]


class heavy_lock:
    """One heavy stage (framing pass, collide, motion draft, render) at a time on this machine, across videos and
    shells: two at once share the GPU and each runs well under half speed, and the 3D tabs run out of GPU memory.
    A waiting stage prints who holds the lock. NO_HEAVY_LOCK=1 skips it."""

    PATH = os.path.join(ROOT, "out", "heavy.lock")

    def __init__(self, slug, stage):
        self.tag = f"{slug} {stage} (pid {os.getpid()})"

    def __enter__(self):
        if os.environ.get("NO_HEAVY_LOCK") == "1" or os.environ.get("HEAVY_LOCK_HELD") == "1":
            self.fh = None
            return self
        import fcntl

        os.makedirs(os.path.dirname(self.PATH), exist_ok=True)
        self.fh = open(self.PATH, "a+")
        try:
            fcntl.flock(self.fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            self.fh.seek(0)
            holder = self.fh.read().strip() or "another stage"
            print(f"waiting for the heavy-stage lock: {holder} is running", flush=True)
            began = time.time()
            fcntl.flock(self.fh, fcntl.LOCK_EX)
            print(f"got the lock after {time.time() - began:.0f} s", flush=True)
        self.fh.seek(0)
        self.fh.truncate()
        self.fh.write(self.tag)
        self.fh.flush()
        os.environ["HEAVY_LOCK_HELD"] = "1"  # nested stages (render -> framing) don't wait on themselves
        return self

    def __exit__(self, *exc):
        if self.fh:
            import fcntl

            os.environ.pop("HEAVY_LOCK_HELD", None)
            self.fh.seek(0)
            self.fh.truncate()
            fcntl.flock(self.fh, fcntl.LOCK_UN)
            self.fh.close()


def framing_partial_path(slug):
    """Written by a partial framing pass (stills of a few shots): which frame spans framing.json is fresh for."""
    return vdir(slug, "build", "framing.partial.json")


def framing_outdated(slug):
    """framing.json is missing or older than the scene, its timing, the shared engine, puppets or sets."""
    out = os.path.join(ROOT, "public", "videos", slug, "framing.json")
    if not os.path.exists(out):
        return True
    newest = 0.0
    for d in (sdir(slug), os.path.join(ROOT, "src", "engine"), os.path.join(ROOT, "src", "puppet"), os.path.join(ROOT, "src", "three")):
        for dirpath, _, files in os.walk(d):
            for f in files:
                newest = max(newest, os.path.getmtime(os.path.join(dirpath, f)))
    return os.path.getmtime(out) < newest


def framing_stale(slug):
    """The whole framing table needs a pass: outdated, or only some shots were measured since the last change."""
    return framing_outdated(slug) or os.path.exists(framing_partial_path(slug))


def cmd_framing(slug, force=True, spans=None):
    """The head-framing pre-pass (scripts/framing.mjs). With `spans` [(a, b), ...] (whole shots) it measures only
    those, when they are not already fresh, and records them in build/framing.partial.json; a later full stage
    (collide, motion, render, stills of the whole video) then runs the full pass."""
    cmd_physics(slug, force=False)
    marker = framing_partial_path(slug)
    if spans:
        outdated = framing_outdated(slug)
        fresh = [] if outdated else (json.load(open(marker))["spans"] if os.path.exists(marker) else None)
        if fresh is None or (fresh and all(any(a >= x and b <= y for x, y in fresh) for a, b in spans)):
            return  # the full table is fresh, or these shots were measured since the last change
        cmd_register()
        with heavy_lock(slug, "framing"):
            run("node", "scripts/framing.mjs", slug, ",".join(f"{a}-{b}" for a, b in spans))
        os.makedirs(os.path.dirname(marker), exist_ok=True)
        json.dump({"spans": sorted(set(map(tuple, fresh + list(spans))))}, open(marker, "w"))
        return
    if force or framing_stale(slug):
        cmd_register()
        with heavy_lock(slug, "framing"):
            run("node", "scripts/framing.mjs", slug)
        if os.path.exists(marker):
            os.remove(marker)


def pick_shots(slug, spec):
    """`--shots 3,5` (1-based shot numbers) or shot names -> [(start, end), ...] in frames (end exclusive)."""
    shots = shot_list(slug)
    chosen = []
    for tok in spec.split(","):
        tok = tok.strip()
        hit = [s for i, s in enumerate(shots, 1) if tok == str(i) or tok == s[2]]
        if not hit:
            sys.exit(f"--shots: no shot '{tok}' (1-{len(shots)} or one of {', '.join(s[2] for s in shots)})")
        chosen += [(a, b) for a, b, _, _ in hit]
    return chosen


def default_frames(slug, spans=None):
    """The frames stills renders: one per second plus the start, middle and end of every shot (camera moves are
    where heads and signs leave the frame), or, for chosen shots, every 15 frames through them plus their ends."""
    total = json.load(open(sdir(slug, "timing.json")))["totalFrames"]
    if spans:
        frames = {f for a, b in spans for f in list(range(a + 2, b - 2, 15)) + [b - 3]}
    else:
        edges = set()
        for a, b, _, _ in shot_list(slug):
            edges |= {a + 2, (a + b) // 2, b - 3}
        frames = sorted(edges)
        # a per-second still within 6 frames of a shot-edge still shows the same picture
        for f in range(15, total, FPS):
            if all(abs(f - e) >= 6 for e in edges):
                frames.append(f)
    return sorted(f for f in frames if 0 <= f < total)


def spans_of(slug, frames):
    """The whole shots [(start, end_inclusive)] that contain the given frames."""
    shots = shot_list(slug)
    return sorted({(a, b - 1) for a, b, _, _ in shots for f in frames if a <= f < b})


def cmd_stills(slug, frames=None, shots=None):
    cmd_register()
    spans = pick_shots(slug, shots) if shots else None
    if frames:
        frame_list = [int(f) for f in frames.split(",")]
    else:
        frame_list = default_frames(slug, spans)
    if frames or shots:
        cmd_framing(slug, force=False, spans=spans_of(slug, frame_list))
    else:
        cmd_framing(slug, force=False)
    # A few frames or shots go to build/stills-check/, so build/stills/ stays the whole-video sheet the stills
    # approval and `go` look at.
    out = vdir(slug, "build", "stills-check" if frames or shots else "stills")
    run("node", "scripts/stills.mjs", slug, out, ",".join(map(str, frame_list)))
    if not (frames or shots):
        stills_colour(slug, out)


# ---------- colour: hue families, on the report's MP4 and on the stills sheet ----------

HUE_NAMES = ("red", "orange", "yellow", "lime", "green", "spring green", "cyan", "azure", "blue", "violet", "magenta", "rose")
HUE_SIZE = (54, 96)  # the picture is measured at this size (frame_diffs)


def hue_family(f):
    """The hue family (0-11, 30° each from red) that most of the saturated, not dark pixels of the frames `f`
    (RGB 0-255, shape (..., 3)) fall in: the report's unit of colour, one per second of picture."""
    import numpy as np

    f = f / 255
    mx, mn = f.max(-1), f.min(-1)
    chroma = mx - mn + 1e-6
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    h = np.where(mx == r, ((g - b) / chroma) % 6, np.where(mx == g, (b - r) / chroma + 2, (r - g) / chroma + 4)) * 60
    m = (chroma / (mx + 1e-6) > 0.35) & (mx > 0.25)
    hist, _ = np.histogram(h[m], bins=12, range=(0, 360))
    return int(hist.argmax())


def hue_summary(families):
    """(hue_families, top_hue_share, the top family) of one family per second."""
    cnt = Counter(families)
    top, n = cnt.most_common(1)[0]
    return len(cnt), n / len(families), top


def hue_name(k):
    return f"{HUE_NAMES[k]} ({k * 30}-{k * 30 + 30}°)"


# How far the sheet's top_hue_share was from the MP4's on the videos compared (one to three stills stand for a
# second the report measures from ten frames): a share this close under the limit is printed as CLOSE.
STILLS_HUE_SLACK = 0.06


def colour_lines(slug, families, source, close=0.0):
    """The colour of a picture given one hue family per second (`families`: [(second, family)]): ok / MISS lines for
    hue_families and top_hue_share, the dominant family and the shots that carry it, and what to change on a miss."""
    shots = shot_list(slug)
    shot_at = lambda k: next((n for a, b, n, _ in shots if a <= k * FPS + FPS // 2 < b), "?")
    seconds = [(k, f, shot_at(k)) for k, f in families]
    fams, share, top = hue_summary([f for _, f, _ in seconds])
    lines = [gate_line(key, val, fmt).strip() for key, val, fmt in (("hue_families", fams, "{}"), ("top_hue_share", share, "{:.0%}"))]
    limit = TARGETS["top_hue_share"][1]
    if share <= limit < share + close:
        lines.append(f"CLOSE top_hue_share: the sheet has read up to {close * 100:.0f} points under the MP4; `motion` measures "
                     f"it on every frame of the draft, so move a shot off {HUE_NAMES[top]} now if that is cheap")
    by_shot = Counter(n for _, f, n in seconds if f == top)
    length = Counter(n for _, _, n in seconds)
    lines.append(f"dominant: {hue_name(top)} leads {sum(by_shot.values())} of {len(seconds)} s, carried by "
                 + ", ".join(f"{n} {c} of {length[n]} s" for n, c in by_shot.most_common()))
    lines.append("families (seconds led): " + ", ".join(f"{HUE_NAMES[f]} {c}" for f, c in Counter(f for _, f, _ in seconds).most_common()))
    lines.append("per shot: " + "; ".join(
        f"{n} " + "/".join(f"{HUE_NAMES[f]} {c}" for f, c in Counter(f for _, f, m in seconds if m == n).most_common())
        for n in dict.fromkeys(m for _, _, m in seconds)))
    lines.append(source)
    if share > limit:
        lines.append(f"fix: give some of the shots above another leading colour (set, sky, floor, costume) or pull their grade "
                     f"back, until {HUE_NAMES[top]} leads at most {limit:.0%} of the seconds")
    if not within("hue_families", fams):
        lines.append("fix: " + ("too few colour families: let some locations lead with a colour no other shot has" if fams < TARGETS["hue_families"][0]
                                else "too many colour families: let neighbouring shots share a palette"))
    return lines


def stills_colour(slug, out):
    """hue_families and top_hue_share from the whole-video stills, the way the report measures them on the MP4
    (hue_family per second of picture, hue_summary), so a one-colour video is seen on the first sheet and not after
    the 2K render. The stills are the picture the render makes: the same composition with the video's own post chain
    and grade (stills.mjs passes no `post` prop unless POST is set, and neither does the render). The default stills
    are not even in time (one per second plus three per shot), so every second of the video is measured from the
    stills that fall inside it and each second counts once, as in the report. Prints the lines and writes
    <out>/colour.txt."""
    import numpy as np

    names = sorted(f for f in os.listdir(out) if f[:-4].isdigit() and f.endswith(".jpg"))
    at = np.array([int(f[:-4]) for f in names])
    w, h = HUE_SIZE
    raw = subprocess.run(["ffmpeg", "-v", "error", "-pattern_type", "glob", "-i", os.path.join(out, "[0-9]*.jpg"),
                          "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    F = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3).astype(np.float32)
    if len(F) != len(names):
        sys.exit(f"colour: read {len(F)} pictures for {len(names)} stills in {out}")
    total = json.load(open(sdir(slug, "timing.json")))["totalFrames"]
    families = []
    for k in range(total // FPS):
        inside = (at >= k * FPS) & (at < (k + 1) * FPS)
        if inside.any():
            families.append((k, hue_family(F[inside])))
    post = os.environ.get("POST")
    lines = colour_lines(slug, families, f"measured on {len(names)} stills, one family per second of the video ({len(families)} s), with the "
                         + (f"post chain forced by POST={post}" if post is not None else "video's own post chain and grade, as the render draws it")
                         + "; the report measures the MP4 the same way, from ten frames a second.", close=STILLS_HUE_SLACK)
    open(os.path.join(out, "colour.txt"), "w").write("\n".join(lines) + "\n")
    print(f"\ncolour of the sheet ({os.path.relpath(os.path.join(out, 'colour.txt'), REPO)}):\n  " + "\n  ".join(lines))


def draft_colour(slug, F):
    """The same on every frame of the motion draft (`F` from frame_diffs: 10 frames a second), exactly as the report
    will measure the delivery render -> build/colour-draft.txt."""
    lines = colour_lines(slug, [(k, hue_family(F[k * 10 : (k + 1) * 10])) for k in range(len(F) // 10)],
                         "measured on the motion draft, ten frames a second: the report's own measure.")
    open(vdir(slug, "build", "colour-draft.txt"), "w").write("\n".join(lines) + "\n")
    print("\ncolour of the draft (build/colour-draft.txt):\n  " + "\n  ".join(lines))


def colour_misses(slug):
    """The MISS lines of the last whole-video sheet (build/stills/colour.txt) and of the last motion draft
    (build/colour-draft.txt, while the sheet is not newer than it: a new sheet is the scene's newer picture)."""
    sheet, draft = vdir(slug, "build", "stills", "colour.txt"), vdir(slug, "build", "colour-draft.txt")
    read = lambda p, tag: [f"{l.strip()} [{tag}]" for l in open(p) if l.startswith("MISS")] if os.path.exists(p) else []
    found = read(sheet, "stills")
    if os.path.exists(draft) and not (os.path.exists(sheet) and os.path.getmtime(sheet) > os.path.getmtime(draft)):
        found += read(draft, "draft")
    return found


def colour_stop(slug):
    """The message `go` stops with while the colour misses, unless the stills were approved with --force over it (a plain
    approval was given while nothing missed, so a later miss, such as motion's draft, still stops `go`)."""
    found = colour_misses(slug)
    if not found or (approved(slug, "stills") and approvals(slug)["stills"].get("forced")):
        return None
    return (f"colour misses: {'; '.join(found)} (videos/{slug}/build/stills/colour.txt and build/colour-draft.txt name the hue "
            f"and its shots). Change those shots and run `stills` again, or accept it with `pipeline.py approve {slug} stills --force`")


def cmd_collide(slug, shots=None):
    """Every 5th frame (of the chosen shots with --shots): puppets walking or standing inside set objects.
    stills.mjs walks the frames in tabs that stay open and takes no pictures, so the folder holds collide.txt only."""
    cmd_physics(slug, force=False)
    cmd_register()
    args = []
    if shots:
        args = [",".join(str(f) for a, b in pick_shots(slug, shots) for f in range(a, b, 5))]
    print("$ COLLIDE=1 node scripts/stills.mjs", slug, *args, flush=True)
    with heavy_lock(slug, "collide"):
        subprocess.run(["node", "scripts/stills.mjs", slug, vdir(slug, "build", "collide" if not shots else "collide-shots"), *args],
                       cwd=ROOT, check=True, env={**os.environ, "COLLIDE": "1"})


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
END_QUIET = 8  # frames at the end where no effect may start (rules.md → Sound)
WHOOSH_SLACK = 3  # frames around a whip's FADE window that still count as "on" it


def sync_issues(slug):
    """Cue-level faults between the soundtrack and the picture: ("error" | "warn", message) pairs.
    Errors: cues outside the video, a missing file, narration past the end, no music anywhere. Warnings: a whip with
    no whoosh, a looped effect that just misses a cut, gaps in the music."""
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
        elif at >= total - END_QUIET:
            warn(f"{src} at {at}: starts in the last {END_QUIET} frames ({total}), so it is cut into a click")
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
    found = glitch_frames(path or os.path.join(OUT, f"{slug}.mp4"))
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
    """Shots and planned jumps for qa.py: whip pans, dissolves and dips (FADE / DISSOLVE / DIP frames before the shot,
    engine/clock.tsx) and the 10-frame camera shake after every impact sound."""
    clock = open(os.path.join(ROOT, "src", "engine", "clock.tsx")).read()
    lead = {k: int(re.search(rf"\b{k} = (\d+)", clock).group(1)) for k in ("FADE", "DISSOLVE", "DIP")}
    shots = shot_list(slug)
    planned = [[a - lead[{"dissolve": "DISSOLVE", "dip": "DIP"}.get(t, "FADE")], a + 1] for a, _, _, t in shots if t]
    planned += [[f, f + 10] for f in impact_frames(slug)]
    return {"shots": [{"id": n, "a": a, "b": b} for a, b, n, _ in shots], "planned": planned}


def cmd_qa(slug, path=None, into="qa"):
    """Frame-by-frame QA of a render (scripts/qa.py) into videos/<slug>/build/qa/ (`into`: "qa-draft" for the draft)."""
    path = path or os.path.join(OUT, f"{slug}.mp4")
    out = vdir(slug, "build", into)
    os.makedirs(out, exist_ok=True)
    meta = os.path.join(out, "meta.json")
    json.dump(qa_meta(slug), open(meta, "w"), indent=1)
    run(PY, "scripts/qa.py", path, out, meta)
    return json.load(open(os.path.join(out, "qa.json")))


RENDER_RETRIES = 2
SHARED_SRC = ("engine", "puppet", "three", "ui")  # src/ folders every shot draws from


def parts_dir(slug, cache):
    """The cached picture of each shot for one render size (`cache`: "draft", "1080", "2k")."""
    return vdir(slug, "build", "parts", cache)


def part_signature(sl, i, args):
    """What a shot's frames depend on besides its own code: its span, how it enters and how the next shot enters."""
    return [sl[i][0], sl[i][1], sl[i][2], sl[i][3], sl[i + 1][3] if i + 1 < len(sl) else None, list(args)]


def render_todo(slug, args, cache, shots):
    """The shot indexes a `--shots` render must draw: the chosen shots, the shot before each one that enters with a
    transition, and every other shot whose cached part is missing, has other frames or transitions, or is older than
    the shared code or the voice timing (the captions and the mouths come from timing.json)."""
    sl = shot_list(slug)
    store = parts_dir(slug, cache)
    index = os.path.join(store, "parts.json")
    known = json.load(open(index)) if os.path.exists(index) else {}
    changed = {i for i, s in enumerate(sl) if (s[0], s[1]) in set(shots)}
    todo = changed | {i - 1 for i in changed if i > 0 and sl[i][3]}
    shared = newest(*(os.path.join(ROOT, "src", d) for d in SHARED_SRC), os.path.join(ROOT, "remotion.config.ts"),
                    sdir(slug, "timing.json"))
    for i in sorted(set(range(len(sl))) - todo):
        path = os.path.join(store, f"{sl[i][0]:05d}-{sl[i][1]:05d}.mp4")
        name = os.path.basename(path)
        why = ("no cached part" if not os.path.exists(path) else "its frames or transitions changed" if known.get(name) != part_signature(sl, i, args)
               else "shared code or the voice timing changed since it was rendered" if os.path.getmtime(path) < shared else "")
        if why:
            print(f"  {sl[i][2]}: {why}, rendering it too")
            todo.add(i)
    return todo


def render_video(slug, out, *args, cache, shots=None, todo=None):
    """Render the picture of `slug` to `out` (muted), one part per shot, and join the parts without re-encoding.
    Each part is checked for broken frames (glitch_frames) and rendered again, up to RENDER_RETRIES times, until it
    is clean; a part whose render process fails (a crashed browser) is rendered again the same way. One part per
    shot also means no tab renders across a cut (a tab died with "Page crashed!" there in kings-sticks) and no tab
    keeps a finished shot's WebGL context alive.

    The parts stay in videos/<slug>/build/parts/<cache>/. With `shots` [(start, end), ...] (the shots that changed,
    from `--shots`) only those are rendered, plus the shot before each one that enters with a transition (its last
    frames show the changed shot coming in); every other shot's part is reused when it still fits: same frames, same
    transitions, and rendered after the last change to the shared engine, puppet, set and ui code. A part that does
    not fit is rendered too. Without `shots` every shot is rendered."""
    total = json.load(open(os.path.join(ROOT, "src", "videos", slug, "timing.json")))["totalFrames"]
    began = time.time()
    sl = shot_list(slug)
    store = parts_dir(slug, cache)
    os.makedirs(store, exist_ok=True)
    sig = lambda i: part_signature(sl, i, args)
    part = lambda i: os.path.join(store, f"{sl[i][0]:05d}-{sl[i][1]:05d}.mp4")
    index = os.path.join(store, "parts.json")
    known = json.load(open(index)) if os.path.exists(index) else {}
    if shots is not None and todo is None:
        todo = render_todo(slug, args, cache, shots)
    if todo is None:
        todo = set(range(len(sl)))
    else:
        print(f"rendering {len(todo)} of {len(sl)} shots ({', '.join(sl[i][2] for i in sorted(todo))}); the rest come from {os.path.relpath(store, REPO)}", flush=True)
    broken = []
    serve = bundle_dir()  # one bundle for every part, instead of the CLI bundling src/ + public/ per part

    def render_part(i):
        start, end = sl[i][0], sl[i][1] - 1
        tmp = part(i) + ".new.mp4"
        for attempt in range(RENDER_RETRIES + 1):
            ok = run("npx", "remotion", "render", serve, slug, tmp, f"--frames={start}-{end}", "--muted", *args,
                     check=False).returncode == 0
            clean_remotion_temp(began)
            if not ok:
                if attempt == RENDER_RETRIES:
                    raise SystemExit(f"render of frames {start}-{end} ({sl[i][2]}) failed {RENDER_RETRIES + 1} times")
                print(f"render of frames {start}-{end} ({sl[i][2]}) failed, rendering the shot again")
                continue
            found = glitch_frames(tmp, start)
            if not found:
                break
            print(f"broken (flat) frames {spans(found)} in {start}-{end}"
                  + (", rendering the shot again" if attempt < RENDER_RETRIES else ", giving up: check these frames as stills"))
        os.replace(tmp, part(i))
        if found:  # still broken after every retry: used for this video, but never reused as a good part
            broken.append(sl[i][2])
            known.pop(os.path.basename(part(i)), None)
        else:
            known[os.path.basename(part(i))] = sig(i)
        json.dump(known, open(index, "w"), indent=1)  # after every part: a stopped render keeps what it finished

    for i in sorted(todo):
        render_part(i)
    keep = {os.path.basename(part(i)) for i in range(len(sl))}
    for name in os.listdir(store):  # parts of shots that no longer exist (the cuts moved)
        if name.endswith(".mp4") and name not in keep:
            os.remove(os.path.join(store, name))
    json.dump({k: v for k, v in known.items() if k in keep}, open(index, "w"), indent=1)
    listing = f"{out}.parts.txt"
    with open(listing, "w") as fh:
        fh.writelines(f"file '{part(i)}'\n" for i in range(len(sl)))
    run("ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", listing, "-c", "copy", out)
    os.remove(listing)
    if broken:
        print(f"WARNING: {', '.join(broken)} still had broken frames after {RENDER_RETRIES + 1} renders; they are not cached, "
              "so the next render draws them again (the report's glitch_frames row counts them)")
    return [sl[i] for i in sorted(todo)]


def render_plan(slug, shots, args, cache):
    """For `--shots`: (chosen shot spans, the shot indexes to render, the frame spans whose head framing must be fresh,
    which are exactly the shots that will be rendered)."""
    chosen, _ = changed_spans(slug, shots)
    if not chosen:
        return None, None, None
    todo = render_todo(slug, args, cache, chosen)
    sl = shot_list(slug)
    fresh = None if len(todo) == len(sl) else [(sl[i][0], sl[i][1] - 1) for i in sorted(todo)]
    return chosen, todo, fresh


def changed_spans(slug, shots):
    """`--shots` for motion and render: the chosen shots, and the frame spans whose head framing must be fresh (the
    chosen shots and the shot before each, which is rendered again with them)."""
    if not shots:
        return None, None
    chosen = pick_shots(slug, shots)
    sl = shot_list(slug)
    idx = {i for i, s in enumerate(sl) if (s[0], s[1]) in set(chosen)}
    idx |= {i - 1 for i in idx if i > 0 and sl[i][3]}
    return chosen, [(sl[i][0], sl[i][1] - 1) for i in sorted(idx)]


def cmd_motion(slug, shots=None):
    """The 30 % draft render: motion per shot, then the frame-by-frame QA on the draft (build/qa-draft/), so a pop,
    a frozen span or a black frame is found before the delivery render instead of after it."""
    import numpy as np

    cmd_register()
    margs = ("--scale=0.3", "--log=error")
    chosen, todo, fresh = render_plan(slug, shots, margs, "draft")
    cmd_framing(slug, force=False, spans=fresh)
    draft = os.path.join(OUT, "drafts", f"{slug}.mp4")
    os.makedirs(os.path.dirname(draft), exist_ok=True)
    with heavy_lock(slug, "motion"):
        render_video(slug, draft, *margs, cache="draft", shots=chosen, todo=todo)
    F, d = frame_diffs(draft)
    med, still = float(np.median(d)), float((d < 2).mean())
    for key, val in (("motion", med), ("still_share", still)):
        print(gate_line(key, val, "{:.2f}"))
    draft_colour(slug, F)
    print("\nstillest shots (median change):")
    for m, name, a, b in motion_by_shot(slug, d)[:8]:
        print(f"  {m:5.1f}  {name:16s} {a}-{b}")
    # The loop (rules.md → Story, closing): the last frame should run into frame 0. Not a gate: the captions and the
    # headline differ across the seam, so this is a number to read next to the video's own cuts.
    F, _ = frame_diffs(draft)
    seam = float(np.abs(F[-1] - F[0]).mean())
    cuts = [float(d[a // 3 - 1]) for a, _, _, _ in shot_list(slug)[1:] if 0 < a // 3 - 1 < len(d)]
    print(f"\nloop seam: last frame -> first frame changes {seam:.1f} (median frame to frame {med:.1f}"
          + (f", this video's cuts {min(cuts):.0f}-{max(cuts):.0f}" if cuts else "") + "); near the cuts' size it reads as a cut, not a loop")
    print("\n----- QA on the draft -----", flush=True)
    qa = cmd_qa(slug, draft, "qa-draft")
    faults = [f"{len(qa[k])} {k}" for k in ("black", "white", "frozen") if qa[k]]
    where = os.path.relpath(vdir(slug, "build", "qa-draft"), REPO)
    print(f"\ndraft QA: {', '.join(faults) if faults else 'no black, white or frozen frames'}; {len(qa['pops'])} pop(s) to look at"
          + (f" on {where}/sheet_*.jpg (each sheet starts at the frame in its name, 60 frames a sheet): {spans(qa['pops'])}" if qa["pops"] else "")
          + ". Fix what is real before `render`.")


# `render <slug> --2k`: the delivery size, 1440x2560 (YouTube serves Shorts above 1080p from a 1440p upload).
HD_SCALE = "1.3333333333333333"  # 4/3 to full precision: 1080 and 1920 times it must come out as whole pixels


def cmd_render(slug, hd=False, shots=None):
    cmd_register()
    rargs, cache = ("--log=error", *([f"--scale={HD_SCALE}"] if hd else [])), "2k" if hd else "1080"
    chosen, todo, fresh = render_plan(slug, shots, rargs, cache)
    cmd_framing(slug, force=False, spans=fresh)
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, f"{slug}.mp4")
    picture, sound = f"{out}.picture.mp4", f"{out}.sound.wav"
    with heavy_lock(slug, "render"):
        render_video(slug, picture, *rargs, cache=cache, shots=chosen, todo=todo)
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
    fams, top, _ = hue_summary([hue_family(F[k * 10 : (k + 1) * 10]) for k in range(len(F) // 10)])
    return motion, still, d, fams, top


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
    mp4 = os.path.join(OUT, f"{slug}.mp4")
    plan = json.load(open(vdir(slug, "plan.json")))
    lines = json.load(open(vdir(slug, "lines.json")))["lines"]
    timing = json.load(open(sdir(slug, "timing.json")))
    shots, avg, longest = shot_stats(slug)
    am = audio_metrics(mp4)
    motion, still, diffs, fams, top = video_metrics(mp4)
    qa = cmd_qa(slug, mp4)
    mixed = cmd_mix(slug)
    seed_at = seed_seconds(slug, plan, timing)
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
        ("shots", len(split_hook(shots)[1]), "{}"),
        ("avg_shot", avg, "{:.2f}s"),
        ("shortest_shot", min((b - a) / FPS for a, b, _, _ in split_hook(shots)[1]), "{:.2f}s"),
        ("longest_shot", longest, "{:.2f}s"),
        ("hard_cuts", hard_cuts(split_hook(shots)[1]), "{}"),
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
    mp4 = os.path.join(OUT, f"{slug}.mp4")
    return {
        "voice": (sdir(slug, "timing.json"), [vdir(slug, "lines.json")]),
        "physics": (sdir(slug, "physics.json"), [vdir(slug, "physics.mjs"), os.path.join(ROOT, "scripts", "physics.mjs")]),
        "check": (vdir(slug, "build", "check.ok"), [sdir(slug), vdir(slug, "plan.json")]),
        "sync": (vdir(slug, "build", "sync.txt"), [sdir(slug), os.path.join(ROOT, "src", "engine", "sound.tsx")]),
        "music": (score, [vdir(slug, "music.py"), sdir(slug, "timing.json"), cues_path(slug), os.path.join(ROOT, "scripts", "music")]),
        "stills": (vdir(slug, "build", "stills", "contact.jpg"), [sdir(slug)]),
        "collide": (vdir(slug, "build", "collide", "collide.txt"), [sdir(slug)]),
        "motion": (os.path.join(OUT, "drafts", f"{slug}.mp4"), [sdir(slug), voice]),
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
        if stage == "voice" and state == "done" and pace_misses(slug) and not pace_waived(slug):
            state, note = "stale", "pace misses: " + ", ".join(f"{k} {v}" for k, v, _ in pace_misses(slug)) + " (fix lines.json, voice again)"
        if stage in ("stills", "motion") and os.path.exists(out):
            found = [l for l in colour_misses(slug) if l.endswith("[stills]" if stage == "stills" else "[draft]")]
            note = "; ".join(found) + (" (build/stills/colour.txt)" if stage == "stills" else " (build/colour-draft.txt)") if found else ""
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


def gate_misses(slug, gate, measure=False):
    """What the measured gate of an approval misses: the pace of the voice made from lines.json (script; with
    `measure` a voice track that has no pace.json yet is measured now), the colour of the sheet and draft (stills)."""
    if gate == "script":
        return [f"{k} {v} ({hint})" for k, v, hint in pace_misses(slug, measure) or []]
    return colour_misses(slug)


def cmd_approve(slug, gate, undo=False, force=False, strict=False):
    """Record (or withdraw) the OK. With `strict` (the command line) it is refused while the gate's measured targets
    miss, unless `force`. An approval recorded over a miss is marked `forced`: that is what lets `go` and `voice`
    carry on with the miss. The panel's Approve button is the user's own click and is not strict."""
    if gate not in GATED:
        sys.exit(f"approve what? {' | '.join(GATED)}")
    f = GATED[gate](slug)
    if not undo and not os.path.exists(f):
        sys.exit(f"nothing to approve: {os.path.relpath(f, ROOT)} does not exist")
    a = approvals(slug)
    found = [] if undo else gate_misses(slug, gate, measure=strict)
    if found and strict and not force:
        sys.exit(f"not approved: the {gate} misses its targets:\n  " + "\n  ".join(found)
                 + f"\nfix it and approve again, or accept the miss with `approve {slug} {gate} --force`")
    if found:
        print("approved over these misses:\n  " + "\n  ".join(found))
    if gate == "script" and not undo and pace_misses(slug) is None:
        print("pace not measured for these lines yet: `voice` measures it and stops on a miss")
    if undo:
        a.pop(gate, None)
    else:
        a[gate] = {"mtime": os.path.getmtime(f), "at": time.strftime("%Y-%m-%d %H:%M:%S"), **({"forced": True} if found else {})}
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
    `voice` misses its pace targets, when `check` fails, when the stills sheet or the motion draft misses the colour
    targets (until `approve <slug> stills --force`), or when `collide` finds a puppet inside the set. By default it stops before the render (look at
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
        if stage in ("motion", "render") and colour_stop(slug):  # a miss left standing from an earlier run
            sys.exit(f"stopped before {stage}: {colour_stop(slug)}")
        print(f"\n===== {stage} =====", flush=True)
        try:
            timed(slug, stage, calls[stage], ["--2k"] if stage == "render" and hd else [])
        except SystemExit as e:
            if e.code:
                sys.exit(f"stopped: {stage} failed" + (f": {e.code.strip()}" if isinstance(e.code, str) else ""))
            raise
        if stage in ("stills", "motion") and colour_stop(slug):
            sys.exit(f"stopped: {colour_stop(slug)}")
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
    shots = option(args, "--shots", None)
    started = time.time()
    # Remotion bundles (with their copy of public/) go to a temp folder of this command's own, so a cleanup never
    # deletes the bundle of a render running at the same time in another shell (its public files then 404 mid-render).
    os.environ["TMPDIR"] = tempfile.tempdir = tempfile.mkdtemp(prefix="pipeline-")
    try:
        call = {
            "new": lambda: cmd_new(args[0], args[1]),
            "voice": lambda: cmd_voice(args[0]),
            "pace": lambda: pace_check(args[0]),  # ends non-zero on a miss, like voice
            "register": cmd_register,
            "physics": lambda: cmd_physics(args[0]),
            "check": lambda: cmd_check(args[0]),
            "stills": lambda: cmd_stills(args[0], args[1] if len(args) > 1 and not args[1].startswith("--") else None, shots),
            "collide": lambda: cmd_collide(args[0], shots),
            "motion": lambda: cmd_motion(args[0], shots),
            "framing": lambda: cmd_framing(args[0]),
            "render": lambda: cmd_render(args[0], hd, shots),
            "glitch": lambda: cmd_glitch(args[0], args[1] if len(args) > 1 else None),
            "qa": lambda: cmd_qa(args[0], args[1] if len(args) > 1 else None),
            "report": lambda: cmd_report(args[0]),
            "status": lambda: cmd_status(args[0]),
            "sync": lambda: cmd_sync(args[0]),
            "cues": lambda: cmd_cues(args[0], force=True),
            "music": lambda: cmd_music(args[0]),
            "mix": lambda: cmd_mix(args[0]),
            "look": lambda: cmd_look(args[0], args[1], args[2] if len(args) > 2 else None),
            "approve": lambda: cmd_approve(args[0], args[1] if len(args) > 1 else "", flag(args, "--undo"), flag(args, "--force"), strict=True),
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

