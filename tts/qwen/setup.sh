#!/bin/sh
# Qwen3-TTS 1.7B (CustomVoice, MLX) for cartoon-animator: makes .venv here and downloads the model (~4.2 GB) into the
# Hugging Face cache. Needs uv and an Apple Silicon Mac. Override the model with CARTOON_QWEN_MODEL.
set -e
D="$(cd "$(dirname "$0")" && pwd)"
MODEL="${CARTOON_QWEN_MODEL:-mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-bf16}"
uv venv --python 3.12 "$D/.venv"
uv pip install --python "$D/.venv/bin/python" -r "$D/requirements.txt"
"$D/.venv/bin/python" -c "from huggingface_hub import snapshot_download; print(snapshot_download('$MODEL'))"
