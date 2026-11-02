# Look-match tools, ported from animated-short's reference study (its measure reports and sbs_sheet.py): put
# numbers on how our frames differ from a set of reference frames, and lay them side by side.
#   .venv/bin/python scripts/look.py measure <out.md> --ours a.jpg b.jpg ... --ref r1.jpg r2.jpg ... [--band 0.62,0.80]
#   .venv/bin/python scripts/look.py sbs <out.jpg> --ours a.jpg ... --ref r1.jpg ... [--h 640]
# `pipeline.py look <slug> <ref-dir>` runs both on the video's stills against every image in <ref-dir>.
# The caption band (default 62-80 % of the height: our captions sit at ~70 %, and reference Shorts burn theirs in
# about there too) is masked before any statistic, so caption outlines never count as the picture's ink or contrast.
# Reference frames are for private study: keep them out of git, and take rules and numbers from them, never shots.
import os
import sys

import numpy as np
from PIL import Image

H = 480  # every frame is measured at this height, so edge and detail numbers compare across sizes

# (key, label, what a higher value means); compare() lists them in this order
METRICS = [
    ("luma_p5", "shadow level (luma p5)", "lifted blacks"),
    ("luma_p50", "mid level (luma median)", "brighter picture"),
    ("luma_p95", "highlight level (luma p95)", "brighter highlights"),
    ("contrast", "contrast (p95 - p5)", "more contrast"),
    ("sat", "mean saturation", "more colour"),
    ("colourful", "colourfulness (Hasler-Süsstrunk)", "more vivid colour"),
    ("warmth", "warmth (R - B, mean)", "warmer"),
    ("hue_families", "hue families (12 bins over 3 %)", "more varied palette"),
    ("top_hue", "top hue share", "one colour dominates more"),
    ("edges", "edge density (strong gradients)", "busier, more line detail"),
    ("dark_lines", "dark line share (thin dark edges)", "more ink-like outlines"),
    ("depth", "depth blur (top-band / centre sharpness)", "background as sharp as the subject"),
]


def load(path, band):
    im = Image.open(path).convert("RGB")
    im = im.resize((round(im.width * H / im.height), H), Image.BILINEAR)
    a = np.asarray(im, np.float32) / 255.0
    keep = np.ones(a.shape[:2], bool)
    keep[int(band[0] * H) : int(band[1] * H)] = False
    return a, keep


def sharpness(g):
    lap = np.abs(4 * g[1:-1, 1:-1] - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:])
    return float(lap.var())


def measure_one(path, band):
    a, keep = load(path, band)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    mx, mn = a.max(-1), a.min(-1)
    sat = np.where(mx > 1e-3, (mx - mn) / np.maximum(mx, 1e-3), 0)
    rg, yb = r - g, 0.5 * (r + g) - b
    k = keep
    colourful = float(np.hypot(rg[k].std(), yb[k].std()) + 0.3 * np.hypot(rg[k].mean(), yb[k].mean()))
    # hue families over pixels with real colour
    hue = (np.degrees(np.arctan2(np.sqrt(3) * (g - b), 2 * r - g - b)) + 360) % 360
    coloured = k & (sat > 0.2) & (mx > 0.15)
    hist = np.bincount((hue[coloured] // 30).astype(int), minlength=12) / max(1, coloured.sum())
    gy, gx = np.gradient(luma)
    grad = np.hypot(gx, gy)
    strong = grad > 0.08
    # a thin dark line: a strong edge on a pixel darker than its 5x5 neighbourhood mean by a margin
    pad = np.pad(luma, 2, mode="edge")
    local = sum(pad[i : i + H, j : j + luma.shape[1]] for i in range(5) for j in range(5)) / 25
    dark = strong & (luma < local - 0.08) & (luma < 0.35)
    top = luma[: int(0.25 * H)]
    centre = luma[int(0.3 * H) : int(0.6 * H), luma.shape[1] // 4 : 3 * luma.shape[1] // 4]
    return {
        "luma_p5": float(np.percentile(luma[k], 5)),
        "luma_p50": float(np.percentile(luma[k], 50)),
        "luma_p95": float(np.percentile(luma[k], 95)),
        "contrast": float(np.percentile(luma[k], 95) - np.percentile(luma[k], 5)),
        "sat": float(sat[k].mean()),
        "colourful": colourful,
        "warmth": float((r - b)[k].mean()),
        "hue_families": int((hist > 0.03).sum()),
        "top_hue": float(hist.max()),
        "edges": float(strong[k].mean()),
        "dark_lines": float(dark[k].mean()),
        "depth": sharpness(top) / max(sharpness(centre), 1e-9),
    }


def stats(paths, band):
    rows = [measure_one(p, band) for p in paths]
    return {key: (float(np.mean([r[key] for r in rows])), float(np.std([r[key] for r in rows]))) for key, _, _ in METRICS}, rows


def compare(out, ours, refs, band=(0.62, 0.80)):
    """Markdown table: our mean against the references' mean for every metric, with what closing the gap means."""
    o, _ = stats(ours, band)
    r, _ = stats(refs, band)
    lines = [
        f"# Look: ours ({len(ours)} frames) vs references ({len(refs)} frames)\n",
        f"Caption band {band[0]:.0%}-{band[1]:.0%} of the height masked; frames measured at {H} px high.\n",
        "| metric | ours | refs (± sd) | gap | to match |",
        "|---|---|---|---|---|",
    ]
    for key, label, higher in METRICS:
        (om, _), (rm, rs) = o[key], r[key]
        gap = om - rm
        off = abs(gap) > max(rs, 1e-6)  # outside one reference standard deviation
        hint = "" if not off else (f"go lower (ours: {higher})" if gap > 0 else f"go higher ({higher})")
        lines.append(f"| {label} | {om:.3f} | {rm:.3f} ± {rs:.3f} | {gap:+.3f} | {'**' + hint + '**' if hint else 'ok'} |")
    open(out, "w").write("\n".join(lines) + "\n")
    print("\n".join(lines))


def sbs(out, ours, refs, h=640):
    """Row 1 our frames, row 2 the reference frames, all at the same height (animated-short's sbs_sheet.py)."""
    def row(paths):
        ims = [Image.open(p).convert("RGB") for p in paths]
        ims = [im.resize((round(im.width * h / im.height), h), Image.LANCZOS) for im in ims]
        canvas = Image.new("RGB", (sum(im.width for im in ims) + 8 * (len(ims) - 1), h), "white")
        x = 0
        for im in ims:
            canvas.paste(im, (x, 0))
            x += im.width + 8
        return canvas

    rows = [row(p) for p in (ours, refs) if p]
    sheet = Image.new("RGB", (max(r.width for r in rows), sum(r.height for r in rows) + 16 * (len(rows) - 1)), "white")
    y = 0
    for r in rows:
        sheet.paste(r, (0, y))
        y += r.height + 16
    sheet.save(out, quality=88)
    print(out, sheet.size)


def parse(args):
    out, groups, cur, opts = args[0], {"--ours": [], "--ref": []}, None, {}
    i = 1
    while i < len(args):
        a = args[i]
        if a in groups:
            cur = a
        elif a in ("--band", "--h"):
            opts[a] = args[i + 1]
            i += 1
        else:
            groups[cur].append(a)
        i += 1
    return out, groups["--ours"], groups["--ref"], opts


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in ("measure", "sbs"):
        print(open(__file__).read().split("\n\n")[0])
        sys.exit(2)
    out, ours, refs, opts = parse(sys.argv[2:])
    if not ours or (sys.argv[1] == "measure" and not refs):
        sys.exit("give frames after --ours" + (" and --ref" if sys.argv[1] == "measure" else ""))
    if sys.argv[1] == "measure":
        compare(out, ours, refs, tuple(float(v) for v in opts.get("--band", "0.62,0.80").split(",")))
    else:
        sbs(out, ours, refs, int(opts.get("--h", 640)))
