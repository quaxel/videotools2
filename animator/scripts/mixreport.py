# Mix report, ported from animated-short's mix.py tables: how far the voice sits above the bed (music + effects),
# per music section and per spoken line, from the three stems `pipeline.py mix` renders (voice.wav, music.wav,
# sfx.wav in <dir>, each at its mix gain, so they sum to the soundtrack).
#   .venv/bin/python scripts/mixreport.py <slug> <dir>
# Writes <dir>/mix.md and <dir>/mix.json. Loudness is BS.1770 (scripts/music/dsp.py): integrated per section and
# stem; per line the 400 ms momentary margin (voice - bed) over windows centred on its words: median and 10th
# percentile. A low p10 means words the bed covers; the report lists the lines under MARGIN_P10 and their worst words.
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "music"))
from dsp import SR, integrated, momentary, read_wav, st  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARGIN_P10 = 3.0  # LU: below this, the bed covers some of the line's words (pipeline.py TARGETS speech_margin_p10)
HOP = 0.01  # s, momentary loudness step


def lufs(x):
    v = integrated(x) if np.any(x) else -np.inf
    return float(v) if np.isfinite(v) else None


def fmt(v):
    return "–" if v is None else f"{v:.1f}"


def sections(cues, fps, total):
    """Spans where the same music plays: every boundary of a music cue cuts a section, named by what plays."""
    edges = sorted({0, total, *(round(m["from"]) for m in cues["music"]), *(round(m["to"]) for m in cues["music"])})
    out = []
    for a, b in zip(edges, edges[1:]):
        if b <= a or a >= total:
            continue
        mid = (a + b) / 2
        names = sorted({os.path.basename(m["src"]).rsplit(".", 1)[0] for m in cues["music"] if m["from"] <= mid < m["to"]})
        if out and out[-1][2] == names:
            out[-1] = (out[-1][0], b, names)
        else:
            out.append((a, b, names))
    # a crossfade of a few frames between two cues is not a section of its own: give it to the one before
    merged = []
    for a, b, n in out:
        if merged and b - a < fps / 2:
            merged[-1] = (merged[-1][0], b, merged[-1][2])
        else:
            merged.append((a, b, n))
    return [(a / fps, min(b, total) / fps, " + ".join(n) or "no music") for a, b, n in merged]


def main(slug, d):
    timing = json.load(open(os.path.join(ROOT, "src", "videos", slug, "timing.json")))
    cues = json.load(open(os.path.join(ROOT, "videos", slug, "build", "cues.json")))
    fps, total = timing["fps"], timing["totalFrames"]
    n = round(total / fps * SR)
    stems = {}
    for k in ("voice", "music", "sfx"):
        x, sr = read_wav(os.path.join(d, f"{k}.wav"))
        assert sr == SR, f"{k}.wav is {sr} Hz"
        x = st(x)[:, :n]
        stems[k] = np.pad(x, ((0, 0), (0, n - x.shape[1])))
    stems["bed"] = stems["music"] + stems["sfx"]
    stems["mix"] = stems["voice"] + stems["bed"]
    cut = lambda x, a, b: x[:, int(a * SR) : int(b * SR)]

    rows = ["| section | time s | voice | music | sfx | bed | margin LU |", "|---|---|---|---|---|---|---|"]
    sec_json = []
    for a, b, name in sections(cues, fps, total):
        v = {k: lufs(cut(stems[k], a, b)) for k in ("voice", "music", "sfx", "bed")}
        margin = None if v["voice"] is None or v["bed"] is None else v["voice"] - v["bed"]
        rows.append(f"| {name} | {a:.2f}-{b:.2f} | {fmt(v['voice'])} | {fmt(v['music'])} | {fmt(v['sfx'])} | {fmt(v['bed'])} | {fmt(margin)} |")
        sec_json.append({"name": name, "from": a, "to": b, **v, "margin": margin})

    # momentary loudness (400 ms windows every 10 ms) of the voice and the bed; a window is "on" a word when its
    # centre falls inside the word
    mv, mb = momentary(stems["voice"], HOP), momentary(stems["bed"], HOP)
    centre = np.arange(len(mv)) * HOP + 0.2
    words = sorted((a / fps, b / fps) for spans in timing["words"].values() for a, b in spans)
    line_rows = ["| line | time s | speech median LU | p10 LU | quietest words (s) |", "|---|---|---|---|---|"]
    lines_json, low = [], []
    for li, line in enumerate(timing.get("lines", [])):
        a, b = line["from"] / fps, line["to"] / fps
        on = np.zeros(len(mv), bool)
        mine = [(wa, wb) for wa, wb in words if wa >= a - 1e-6 and wb <= b + 0.1]
        for wa, wb in mine:
            on |= (centre >= wa) & (centre < wb)
        if not on.any():
            continue
        m = np.where(mb[on] > -70, mv[on] - mb[on], 40.0)  # no bed at all: the voice is free
        med, p10 = float(np.median(m)), float(np.percentile(m, 10))
        worst = []
        for wa, wb in mine:
            k = (centre >= wa) & (centre < wb)
            if k.any():
                worst.append((float(np.min(np.where(mb[k] > -70, mv[k] - mb[k], 40.0))), wa))
        worst = sorted(worst)[:3]
        line_rows.append(f"| {li + 1}: {line['text'][:48]}{'…' if len(line['text']) > 48 else ''} | {a:.2f}-{b:.2f} | {med:.1f} | {p10:.1f}"
                         f"{' **low**' if p10 < MARGIN_P10 else ''} | {', '.join(f'{t:.2f} ({v:.1f})' for v, t in worst)} |")
        lines_json.append({"line": li + 1, "from": a, "to": b, "median": med, "p10": p10, "worst": worst})
        if p10 < MARGIN_P10:
            low.append(li + 1)

    whole = {k: lufs(stems[k]) for k in ("voice", "music", "sfx", "bed", "mix")}
    p10_all = min((l["p10"] for l in lines_json), default=None)
    md = [f"# {slug}: mix\n",
          "Stems rendered by `pipeline.py mix` at their mix gain (`build/mix/voice.wav`, `music.wav`, `sfx.wav`); the music "
          "stem already carries the engine's ducking under the voice. BS.1770 loudness.\n",
          "- Whole video: " + ", ".join(f"{k} {fmt(v)} LUFS" for k, v in whole.items()),
          f"- Lowest line p10 margin: {fmt(p10_all)} LU (target ≥ {MARGIN_P10:.0f})"
          + (f"; lines under it: {', '.join(map(str, low))}" if low else ""), "",
          "## Per music section (integrated LUFS)\n", *rows, "",
          "## Per line: voice over the bed while it speaks\n",
          "Momentary (400 ms) margin voice - bed over the line's words; a word with no bed under it counts as 40 LU.\n",
          *line_rows]
    open(os.path.join(d, "mix.md"), "w").write("\n".join(md) + "\n")
    json.dump({"whole": whole, "sections": sec_json, "lines": lines_json, "p10_min": p10_all, "low_lines": low},
              open(os.path.join(d, "mix.json"), "w"), indent=1)
    print("\n".join(md))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
