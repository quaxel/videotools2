# Qwen3-TTS 1.7B (CustomVoice, MLX) as a long-lived worker for cartoon-animator/cli/tts.mjs.
# Loads the model once, then reads one JSON request per line on stdin and answers one JSON line on stdout:
#   in:  {"id": 1, "text": "...", "voice": "Ryan", "language": "English", "instruct": "", "seed": 123, "out": "/abs/x.wav"}
#   out: {"id": 1, "ok": true, "seconds": 2.4}   or   {"id": 1, "ok": false, "error": "..."}
# First line out is {"ready": true, "speakers": [...], "languages": [...]} once the model is loaded.
# Exits when stdin closes. Everything the libraries print goes to stderr, so stdout carries only the protocol.
# Model: CARTOON_QWEN_MODEL (default mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-bf16, from the Hugging Face cache).

import json
import os
import sys
import wave

proto = os.fdopen(os.dup(1), "w", buffering=1)
os.dup2(2, 1)
sys.stdout = sys.stderr

import mlx.core as mx
import numpy as np
from mlx_audio.tts.utils import load_model

MODEL = os.environ.get("CARTOON_QWEN_MODEL", "mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-bf16")


def send(msg):
    proto.write(json.dumps(msg, ensure_ascii=False) + "\n")


def write_wav(path, audio, rate):
    pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())


def synth(model, req):
    mx.random.seed(int(req.get("seed", 0)))
    parts = [
        np.asarray(r.audio, dtype=np.float32)
        for r in model.generate(
            text=req["text"],
            voice=req["voice"],
            instruct=req.get("instruct") or None,
            lang_code=req.get("language", "auto"),
            # One line is one utterance: no splitting at newlines.
            split_pattern="",
        )
    ]
    if not parts:
        raise RuntimeError("the model returned no audio")
    audio = np.concatenate(parts)
    write_wav(req["out"], audio, model.sample_rate)
    return len(audio) / model.sample_rate


def main():
    try:
        model = load_model(MODEL)
    except Exception as e:
        send({"ready": False, "error": f"could not load {MODEL}: {e}"})
        return
    send({"ready": True, "model": MODEL, "speakers": list(model.get_supported_speakers() or []), "languages": list(model.get_supported_languages() or [])})
    for line in sys.stdin:
        if not line.strip():
            continue
        req = {}
        try:
            req = json.loads(line)
            send({"id": req.get("id"), "ok": True, "seconds": round(synth(model, req), 3)})
        except Exception as e:
            send({"id": req.get("id"), "ok": False, "error": str(e).strip().split("\n")[-1] or type(e).__name__})


if __name__ == "__main__":
    main()
