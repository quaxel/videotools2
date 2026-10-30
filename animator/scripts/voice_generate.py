# Voice step 1: synthesise every narration line with Qwen3-TTS (MLX).
#   ../tts/qwen/.venv/bin/python scripts/voice_generate.py <slug>
# Reads videos/<slug>/lines.json, writes videos/<slug>/build/voice/NN.wav (one per line).
# Lines whose text, voice and seed are unchanged are skipped.
import hashlib
import json
import os
import sys
import wave

import mlx.core as mx
import numpy as np
from mlx_audio.tts.utils import load_model

MODEL = os.environ.get("CARTOON_QWEN_MODEL", "mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-bf16")


def write_wav(path, audio, rate):
    pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main(slug):
    spec = json.load(open(os.path.join(ROOT, "videos", slug, "lines.json")))
    out_dir = os.path.join(ROOT, "videos", slug, "build", "voice")
    os.makedirs(out_dir, exist_ok=True)
    model = None
    for i, line in enumerate(spec["lines"]):
        v = spec["voices"][line["speaker"]]
        # tempo is applied later by voice_assemble.py, so it does not invalidate a clip
        key = hashlib.sha1(json.dumps([line["text"], {k: x for k, x in v.items() if k != "tempo"}], sort_keys=True).encode()).hexdigest()[:12]
        wav = os.path.join(out_dir, f"{i:02d}.wav")
        stamp = wav + ".key"
        if os.path.exists(wav) and os.path.exists(stamp) and open(stamp).read() == key:
            continue
        if model is None:
            model = load_model(MODEL)
        mx.random.seed(int(v.get("seed", 0)))
        parts = [
            np.asarray(r.audio, dtype=np.float32)
            for r in model.generate(text=line["text"], voice=v["voice"], instruct=v.get("instruct") or None, lang_code="English", split_pattern="")
        ]
        write_wav(wav, np.concatenate(parts), model.sample_rate)
        open(stamp, "w").write(key)
        print(f"{i:02d} {line['speaker']:8s} {line['text']}", flush=True)


if __name__ == "__main__":
    main(sys.argv[1])
