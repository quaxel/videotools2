# Voice step 2: lay the generated lines end to end and get word timings.
#   .venv/bin/python scripts/voice_assemble.py <slug>
#
# 1. Trims leading/trailing silence, shortens long pauses, speeds each speaker by its `tempo`.
# 2. Places the lines one after another with GAP seconds of air (plus a line's optional `pauseAfter`).
# 3. Transcribes each clip with word timestamps and maps them back onto the script words.
# 4. Writes public/videos/<slug>/voice.wav and src/videos/<slug>/timing.json: per-line frame spans,
#    captions (1-2 word chunks), per-speaker word spans and per-speaker mouth tracks. Scenes are cut to these frames.
#
#   .venv/bin/python scripts/voice_assemble.py <slug> --mouth   only (re)writes the mouth tracks from the fitted clips
import difflib
import json
import os
import re
import subprocess
import sys
import wave

import numpy as np
from faster_whisper import WhisperModel

GAP = 0.12  # seconds of air between lines
TAIL = 0.8  # seconds held after the last line
RATE = 48000


def ffmpeg(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def duration(path):
    with wave.open(path) as w:
        return w.getnframes() / w.getframerate()


def read_16k(path):
    """Decode to 16 kHz float32 with ffmpeg (avoids faster-whisper's PyAV decoder)."""
    pcm = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], check=True, capture_output=True
    ).stdout
    return np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768.0


def envelope(audio, hop=160):
    """Loudness in dB per 10 ms frame."""
    n = len(audio) // hop
    frames = audio[: n * hop].reshape(n, hop)
    return 20 * np.log10(np.sqrt((frames**2).mean(axis=1)) + 1e-9)


def mouth_tracks(placed, fps, frames):
    """Per speaker, how open the mouth is on every video frame, from the clip's loudness: a string of digits 0-9.

    Each line is levelled against its own loud parts, so quiet and loud speakers move their mouths alike. The
    mouth snaps open on a syllable and closes over two frames, which reads as speech rather than flapping."""
    tracks = {}
    for p in placed:
        env = p["env"]
        voiced = env[env > -45]
        if not len(voiced):
            continue
        ref = np.percentile(voiced, 90)
        lo, hi = ref - 22, ref + 3
        track = tracks.setdefault(p["speaker"], [0.0] * frames)
        prev = 0.0
        first = round(p["start"] * fps)
        for k in range(first, min(frames, first + int(p["dur"] * fps) + 2)):
            a = int((k / fps - p["start"]) * 100)
            b = int(((k + 1) / fps - p["start"]) * 100)
            win = env[max(0, a) : max(0, min(b, len(env)))]
            raw = float(np.clip((win.max() - lo) / (hi - lo), 0, 1)) if len(win) else 0.0
            prev = max(raw, prev * 0.45)
            track[k] = max(track[k], prev)
    return {sp: "".join(str(min(9, round(v * 9))) for v in t) for sp, t in tracks.items()}


def voiced_span(env, a, b, floor=-32.0):
    """First and last loud 10 ms frame between a and b seconds, or None."""
    lo, hi = int(a * 100), min(int(b * 100), len(env))
    loud = [k for k in range(lo, hi) if env[k] > floor]
    return (loud[0] / 100, (loud[-1] + 1) / 100) if loud else None


def norm(word):
    return re.sub(r"[^a-z0-9']", "", word.lower())


def chunk_words(words):
    """Group (text, start, end) words into caption chunks of 1-3 words."""
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        text = " ".join(x[0] for x in cur)
        if w[0][-1] in ".,!?:" or len(cur) == 2 or len(text) >= 9:
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    return chunks


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main(slug):
    spec = json.load(open(os.path.join(ROOT, "..", "videos", slug, "lines.json")))
    fps = spec.get("fps", 30)
    build = os.path.join(ROOT, "..", "videos", slug, "build", "voice")
    fitted = os.path.join(build, "fitted")
    os.makedirs(fitted, exist_ok=True)
    stt = WhisperModel("small.en", compute_type="int8")

    placed, t = [], 0.0
    for i, line in enumerate(spec["lines"]):
        src = os.path.join(build, f"{i:02d}.wav")
        out = os.path.join(fitted, f"{i:02d}.wav")
        ffmpeg(
            "-i", src, "-af",
            "silenceremove=start_periods=1:start_threshold=-42dB:stop_periods=-1:stop_duration=0.18:stop_threshold=-42dB:stop_silence=0.12,"
            "areverse,silenceremove=start_periods=1:start_threshold=-42dB,areverse,"
            f"atempo={line.get('voice', {}).get('tempo', spec['voices'][line['speaker']].get('tempo', 1.0))},aresample={RATE}",
            "-ac", "1", out,
        )
        start = t + GAP if i else 0.0
        d = duration(out)
        audio = read_16k(out)
        segs, _ = stt.transcribe(audio, word_timestamps=True, language="en", initial_prompt=line["text"])
        heard = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]
        placed.append({"i": i, "speaker": line["speaker"], "text": line["text"], "start": start, "dur": d, "heard": heard, "env": envelope(audio)})
        t = start + d + line.get("pauseAfter", 0.0)
    total = t + TAIL

    # Map heard words onto the script's own words so captions show what was written.
    captions, spans = [], {}
    for p in placed:
        script = p["text"].split()
        heard = p["heard"]
        sm = difflib.SequenceMatcher(a=[norm(w) for w in script], b=[norm(h[0]) for h in heard], autojunk=False)
        times = [None] * len(script)
        for a, b, n in sm.get_matching_blocks():
            for k in range(n):
                times[a + k] = (heard[b + k][1], heard[b + k][2])
        # Whisper often drops or squashes repeated words ("Seven. Seven."): treat near-zero spans as unknown.
        times = [t if t and t[1] - t[0] >= 0.08 else None for t in times]
        # Unknown words are placed on the voiced audio between their neighbours, else spread evenly.
        for k in range(len(script)):
            if times[k] is None:
                prev = next((times[j][1] for j in range(k - 1, -1, -1) if times[j]), 0.0)
                nxt = next((times[j][0] for j in range(k + 1, len(script)) if times[j]), p["dur"])
                gap_words = next((j for j in range(k + 1, len(script)) if times[j]), len(script)) - k
                step = (nxt - prev) / (gap_words + 1)
                times[k] = (prev + step * 0.5, prev + step)
                if gap_words == 1:
                    times[k] = voiced_span(p["env"], prev, nxt) or times[k]
        words = [(w, p["start"] + s, p["start"] + e) for w, (s, e) in zip(script, times)]
        if p["speaker"] != "narrator":
            words[0] = ("“" + words[0][0], *words[0][1:])
            words[-1] = (words[-1][0] + "”", *words[-1][1:])
        spans.setdefault(p["speaker"], []).extend([round(s * fps), round(e * fps)] for _, s, e in words)
        for c in chunk_words(words):
            captions.append({"from": round(c[0][1] * fps), "to": round(c[-1][2] * fps) + 4, "text": " ".join(x[0] for x in c)})
    # A chunk stays up until the next one starts, unless there is a long silence in between.
    for a, b in zip(captions, captions[1:]):
        a["to"] = b["from"] if b["from"] - a["to"] < 12 else a["to"]

    # Mix every fitted line at its start time.
    inputs, filters = [], []
    for k, p in enumerate(placed):
        inputs += ["-i", os.path.join(fitted, f"{p['i']:02d}.wav")]
        ms = int(p["start"] * 1000)
        filters.append(f"[{k}]adelay={ms}|{ms}[d{k}]")
    mix = "".join(f"[d{k}]" for k in range(len(placed)))
    filters.append(f"{mix}amix=inputs={len(placed)}:normalize=0,apad=whole_dur={total:.3f},loudnorm=I=-16:TP=-1.5:LRA=11[out]")
    wav_out = os.path.join(ROOT, "public", "videos", slug, "voice.wav")
    os.makedirs(os.path.dirname(wav_out), exist_ok=True)
    ffmpeg(*inputs, "-filter_complex", ";".join(filters), "-map", "[out]", "-ar", str(RATE), "-ac", "1", wav_out)

    lines = [
        {"i": p["i"], "speaker": p["speaker"], "text": p["text"], "from": round(p["start"] * fps), "to": round((p["start"] + p["dur"]) * fps)}
        for p in placed
    ]
    timing = {"fps": fps, "totalFrames": round(total * fps), "lines": lines, "captions": captions, "words": spans}
    timing["mouth"] = mouth_tracks(placed, fps, timing["totalFrames"])
    out_dir = os.path.join(ROOT, "src", "videos", slug)
    os.makedirs(out_dir, exist_ok=True)
    json.dump(timing, open(os.path.join(out_dir, "timing.json"), "w"), indent=1)
    print(f"total {total:.2f}s, {len(captions)} caption chunks")
    for p in placed:
        print(f"{p['i']:02d} {p['start']:6.2f}s +{p['dur']:.2f}  {p['text'][:48]}")


def mouth_only(slug):
    """Add mouth tracks to an existing timing.json from the fitted clips, without transcribing again."""
    path = os.path.join(ROOT, "src", "videos", slug, "timing.json")
    timing = json.load(open(path))
    fitted = os.path.join(ROOT, "..", "videos", slug, "build", "voice", "fitted")
    placed = []
    for line in timing["lines"]:
        clip = os.path.join(fitted, f"{line['i']:02d}.wav")
        placed.append({"speaker": line["speaker"], "start": line["from"] / timing["fps"], "dur": duration(clip), "env": envelope(read_16k(clip))})
    timing["mouth"] = mouth_tracks(placed, timing["fps"], timing["totalFrames"])
    json.dump(timing, open(path, "w"), indent=1)
    print(f"mouth tracks for {', '.join(timing['mouth'])}")


if __name__ == "__main__":
    if "--mouth" in sys.argv:
        mouth_only(sys.argv[1])
    else:
        main(sys.argv[1])
