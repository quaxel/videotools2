# Scene scaffold: writes the skeleton every new video used to re-type by hand, cut to the voice frames.
#
#   .venv/bin/python scripts/scaffold.py <slug> [--force] [--dry-run]
#
# Run it after `pipeline.py voice <slug>`. It reads
#   ../videos/<slug>/plan.json     title, locations (id / set / colour), characters (id / look), triple_hook, seed, gags, year
#   ../videos/<slug>/lines.json    only to check that timing.json was made from it
#   src/videos/<slug>/timing.json  every line's frame span, the captions (sentence ends inside a line) and the words
# and writes
#   src/videos/<slug>/Scene.tsx    engine imports, timing import, looks, one placeholder set per location, 2-3 hook
#                                  beats + 9-12 shots (a Stage, a widePath camera keyed on the line frames, placeholder
#                                  puppets), the Headline, the SHOTS list, empty SFX / MUSIC, the Video export
#   ../videos/<slug>/camera_plan.md  one row per shot to fill in
# Neither file is overwritten without --force; --dry-run only prints the shot table. The generated scene type-checks
# and passes `pipeline.py check <slug>`; every place the author must replace carries `// TODO(author): ...` with the
# rule it has to meet. The rules it cuts to are guide/rules.md → Story / Picture (mirrored in the constants below and
# in pipeline.py's TARGETS, HOOK_END, HOOK_BEAT_MIN).
import itertools
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # animator/
REPO = os.path.dirname(ROOT)
FPS = 30

HOOK_END = 105  # frames: every hook beat ends by here (pipeline.py HOOK_END)
BEAT = (21, 45)  # frames: a hook beat is 0.7-1.5 s
BEAT_FLOOR = 18  # frames: what `check` still accepts (HOOK_BEAT_MIN 0.6 s)
SHOTS = (9, 12)  # body shots, one location each
SHOT = (45, 300)  # frames: none under 1.5 s or over 10 s
AVG = (120, 210)  # frames: average 4-7 s

# ---------- reading the plan ----------

# Colour words found in plan.json texts (a location's `colour`, a character's `look`) -> a mid-tone hex.
COLOURS = {
    "red": "#b8423a", "crimson": "#a83038", "scarlet": "#c8382a", "tomato": "#c8483a", "maroon": "#7a2a2e", "brick": "#9a5a48",
    "orange": "#d8823a", "ochre": "#c89648", "amber": "#d8a048", "gold": "#d8b048", "golden": "#d8b048", "yellow": "#e8cc5a",
    "butter": "#ecd880", "sand": "#d8c090", "straw": "#dcc478", "cream": "#e8dcc0", "beige": "#d8c8a8", "tan": "#c8a878",
    "brown": "#8a5a3a", "taupe": "#8a7a6a", "khaki": "#a89a68", "olive": "#7a7a3e", "green": "#4a8a52", "lime": "#8ab848",
    "mint": "#9ad8b8", "teal": "#4a7a7e", "turquoise": "#5ac0b8", "cyan": "#7ad0d8", "sky": "#9acce8", "blue": "#4a6a9a",
    "navy": "#2e3a6a", "indigo": "#3e3a7a", "violet": "#6a4a9a", "purple": "#7a4ab8", "plum": "#6a4a6a", "magenta": "#b84a98",
    "pink": "#e89ab0", "rose": "#d8889a", "white": "#f2ece4", "ivory": "#f0ead8", "grey": "#8a8e96", "gray": "#8a8e96",
    "silver": "#b8bcc4", "steel": "#7a8890", "slate": "#5a6470", "black": "#2a2a30", "charcoal": "#3a3e46", "dark": "#3a3a48",
    "night": "#2a3460", "pale": "#dcdcd4", "ginger": "#c86a2a", "blond": "#d8b060", "blonde": "#d8b060", "fair": "#d8b060",
    "auburn": "#8a3a1e", "chestnut": "#7a4a2a", "bald": "",
    "burgundy": "#7a2a3a", "terracotta": "#c06a48", "coral": "#e8806a", "lilac": "#b8a0d8", "lavender": "#b0a0d8", "peach": "#f0b890",
    "mustard": "#c8a030", "emerald": "#2e8a5a", "bronze": "#a87840", "copper": "#b86a3a", "rust": "#a8502a", "aqua": "#6ac8c8",
    "azure": "#5a9ad8", "wine": "#6a2a3a", "sepia": "#9a7a50", "salmon": "#e89080", "jade": "#4a9a7a",
}
# Colour word -> the Room moods that suit it, best first (src/three/moods.ts). Neighbouring locations never share one.
MOODS = ("warm", "daylight", "cold", "dream", "night", "neon", "golden", "office", "alarm", "dusk")
MOOD_FOR = {
    "red": ("alarm", "warm"), "crimson": ("alarm", "warm"), "scarlet": ("alarm", "warm"), "tomato": ("warm", "alarm"),
    "maroon": ("alarm", "dusk"), "brick": ("warm", "office"), "orange": ("warm", "golden"), "ochre": ("golden", "warm"),
    "amber": ("golden", "warm"), "gold": ("golden", "warm"), "golden": ("golden", "warm"), "yellow": ("golden", "daylight"),
    "butter": ("golden", "daylight"), "sand": ("golden", "daylight"), "straw": ("golden", "daylight"),
    "cream": ("daylight", "office"), "beige": ("daylight", "warm"), "tan": ("warm", "golden"), "brown": ("warm", "golden"),
    "taupe": ("office", "warm"), "khaki": ("office", "golden"), "olive": ("office", "golden"), "green": ("office", "daylight"),
    "lime": ("daylight", "office"), "mint": ("office", "daylight"), "teal": ("cold", "office"), "turquoise": ("daylight", "cold"),
    "cyan": ("daylight", "cold"), "sky": ("daylight", "cold"), "blue": ("cold", "night"), "navy": ("night", "cold"),
    "indigo": ("night", "dream"), "violet": ("dream", "dusk"), "purple": ("dream", "neon"), "plum": ("dusk", "dream"),
    "magenta": ("neon", "dream"), "pink": ("dusk", "dream"), "rose": ("dusk", "warm"), "white": ("daylight", "office"),
    "ivory": ("daylight", "office"), "grey": ("office", "cold"), "gray": ("office", "cold"), "silver": ("office", "cold"),
    "steel": ("cold", "office"), "slate": ("cold", "office"), "black": ("night", "cold"), "charcoal": ("night", "office"),
    "dark": ("night", "cold"), "night": ("night", "cold"), "pale": ("daylight", "office"),
    "burgundy": ("alarm", "dusk"), "terracotta": ("warm", "golden"), "coral": ("warm", "dusk"), "lilac": ("dream", "dusk"),
    "lavender": ("dream", "dusk"), "peach": ("warm", "dusk"), "mustard": ("golden", "warm"), "emerald": ("office", "cold"),
    "bronze": ("golden", "warm"), "copper": ("warm", "golden"), "rust": ("warm", "alarm"), "aqua": ("daylight", "cold"),
    "azure": ("daylight", "cold"), "wine": ("alarm", "dusk"), "sepia": ("golden", "warm"), "salmon": ("dusk", "warm"), "jade": ("office", "cold"),
}
WALLS = ("panel", "wallpaper", "brick", "plaster", "tile", "plain")
FLOORS = ("concrete", "wood", "tile", "carpet", "plain")
SKINS = ("#f0c8a8", "#e8b898", "#d8a888", "#f4d0b0", "#c89878", "#a87858")
HAIRS = ("#2a1e16", "#6a3a1e", "#8a7a68", "#d8b060", "#1a1410", "#b8b0a8")
OUTFITS = ("#4a6a9a", "#7a6a56", "#4a8a52", "#b8423a", "#7a4ab8", "#3a3e46", "#d8a048", "#4a7a7e")
GARMENTS = r"(?:uniform|coveralls?|trench|blazer|frock|habit|sari|poncho|pinafore|sash|armou?r|coat|suit|shirt|dress|robe|deel|surcoat|jacket|jumper|sweater|overalls?|gown|blouse|tunic|toga|cloak|cape|hoodie|vest|apron|kimono|doublet|smock|outfit|clothes|tee|t-shirt|scrubs|jersey)"
WOMAN = r"\b(?:woman|women|girl|female|she|her|mother|mom|mum|wife|queen|lady|princess|daughter|sister|grandmother|waitress|actress|nun|maid|widow)\b"
HAIR = {"dark": "#2a1e16", "black": "#1a1410", "brown": "#6a3a1e", "grey": "#b8b0a8", "gray": "#b8b0a8", "white": "#e8e4dc", "silver": "#c8c8c8", "red": "#a8482a"}  # hair shades of colour words
HAIR_ONLY = ("bald", "fair", "blond", "blonde", "ginger", "auburn", "chestnut", "dark", "pale")
# PuppetLook fields (src/puppet/Puppet.tsx) a plan's look object may carry, by value type.
LOOK_COLOUR = ("skin", "hair", "outfit", "pattern", "lanyard", "cap", "chain", "apron", "kerchief", "hat", "beard", "vest", "suspenders", "shorts", "pants", "shoes", "iris", "patch", "mud", "belt", "wraps", "mail", "cloak", "stubble")
LOOK_BOOL = ("glasses", "long", "skirt", "tunic", "tied")
LOOK_ENUM = {"hatStyle": ("wide", "bowler", "boater", "helmet", "stahl", "crown", "shako", "galea"), "build": ("broad", "narrow")}
EXPRESSIONS = ("neutral", "happy", "thinking", "worried", "determined", "skeptical", "excited", "confused")
# Camera moves, in the mix rules.md asks for (about half push-ins, a third cranes, a fifth sideways tracks).
MOVES = ("push", "crane", "push", "track", "push", "crane", "push", "push", "crane", "track", "push", "crane")
RESERVED = {"TIMING", "SLUG", "ASPECT", "SHOTS", "SFX", "MUSIC", "OPEN_CAM", "HEADLINE", "HOOK_OUT", "Scene", "React"}


def q(v):  # a TS / JSON literal, non-ASCII kept as written
    return json.dumps(v, ensure_ascii=False)


def load(path, what):
    if not os.path.exists(path):
        sys.exit(f"scaffold: {what} is missing: {os.path.relpath(path, ROOT)}")
    return json.load(open(path, encoding="utf-8"))


def words_of(text):
    return re.findall(r"[a-z]+", str(text).lower())


def colour_words(text):
    return [w for w in words_of(text) if COLOURS.get(w)]


def shade(hexc, k):
    v = int(hexc[1:], 16)
    return "#" + "".join(f"{max(0, min(255, round(((v >> s) & 255) * k))):02x}" for s in (16, 8, 0))


def ident(text, upper=True):
    s = re.sub(r"[^0-9a-zA-Z]+", "_", str(text)).strip("_") or "X"
    s = s.upper() if upper else "".join(p[:1].upper() + p[1:] for p in s.split("_"))
    return ("_" + s) if s[0].isdigit() else s


def unique(name, taken):
    base, n = name, 2
    while name in taken:
        name, n = f"{base}{'_' if base.isupper() else ''}{n}", n + 1
    taken.add(name)
    return name


def story_from(year):
    """The earliest year of the story, or None for a present-day (or unstated) one."""
    if isinstance(year, bool):
        return None
    if isinstance(year, int):
        return year
    if isinstance(year, list) and year and all(isinstance(y, int) for y in year):
        return min(year)
    return None


def look_of(char, k, year, notes):
    """(TS object literal, how it was made) for one plan character. A look object passes through its kit fields; a
    free-text look gives skin / hair / outfit guessed from its colour words and nothing that could be out of period."""
    look, cid = char.get("look"), char.get("id")
    if isinstance(look, dict):
        out, dropped = {}, []
        for key, v in look.items():
            if (key in LOOK_COLOUR and isinstance(v, str) and re.fullmatch(r"#[0-9a-fA-F]{3,8}", v)) or (key in LOOK_BOOL and v is True) or (key in LOOK_ENUM and v in LOOK_ENUM[key]):
                out[key] = v
            elif key in LOOK_COLOUR and isinstance(v, str) and COLOURS.get(v.lower()):
                out[key] = COLOURS[v.lower()]
            else:
                dropped.append(key)
        for key, pal in (("skin", SKINS), ("hair", HAIRS), ("outfit", OUTFITS)):
            out.setdefault(key, pal[k % len(pal)])
        if dropped:
            notes.append(f"character {cid}: look fields the kit does not have were left out: {', '.join(dropped)}")
        ordered = {key: out[key] for key in ("skin", "hair", "outfit")} | {key: v for key, v in out.items() if key not in ("skin", "hair", "outfit")}
        return ordered, "from the plan's look object"
    text = str(look or "")
    low = text.lower()
    out = {"skin": SKINS[k % len(SKINS)], "hair": HAIRS[k % len(HAIRS)], "outfit": OUTFITS[k % len(OUTFITS)]}
    guessed = []
    hair_word = None
    clauses = [re.findall(r"[a-z]+", c) for c in re.split(r"[,;:.()]", low)]

    def before(noun):  # the colour word nearest in front of the first word matching `noun`, within its clause
        for toks in clauses:
            for n, t in enumerate(toks):
                if re.fullmatch(noun, t):
                    hit = next((x for x in reversed(toks[max(0, n - 4):n]) if x in COLOURS), None)
                    if hit:
                        return hit
        return None

    h = before(r"hair|haired|curls|braids?|ponytail")
    if h and (HAIR.get(h) or COLOURS.get(h)):
        hair_word, out["hair"] = h, HAIR.get(h) or COLOURS[h]
        guessed.append(f"hair {h}")
    elif re.search(r"\bbald\b", low):
        out["hair"] = out["skin"]
        guessed.append("bald: hair in the skin colour")
    g = before(GARMENTS)
    cols = [w for w in colour_words(low) if w != hair_word and w not in HAIR_ONLY]
    if g and COLOURS.get(g):
        out["outfit"] = COLOURS[g]
        guessed.append(f"outfit {g}")
    elif cols:
        out["outfit"] = COLOURS[cols[0]]
        guessed.append(f"outfit {cols[0]}")
    if re.search(WOMAN, low) or re.search(r"\blong\b[^,;.]*\bhair\b", low):
        out["long"] = True
        guessed.append("long hair")
    start = story_from(year)
    if re.search(r"\b(?:glasses|spectacles)\b", low) and (start is None or start >= 1300):
        out["glasses"] = True
        guessed.append("glasses")
    if re.search(r"\bbeard(?:ed)?\b", low) and "long" not in out:
        out["beard"] = out["hair"]
        guessed.append("beard")
    return out, ("guessed from the plan's text: " + ", ".join(guessed)) if guessed else "neutral placeholder: the plan's text names no colour the kit knows"


def ts_look(d):
    return "{ " + ", ".join(f"{k}: {q(v)}" for k, v in d.items()) + " }"


def location_styles(locs, order, notes):
    """Per location index: mood, wall, floor, patterns. `order` is the sequence of location indices the shots visit,
    so that two neighbouring shots never share a mood."""
    style = {}
    prev = None
    for n, i in enumerate(order):
        if i in style:
            prev = style[i]["mood"]
            continue
        loc = locs[i]
        text = f"{loc.get('colour', '')}"
        cols = colour_words(text) or colour_words(loc.get("set", ""))
        if cols:
            wall = COLOURS[cols[0]]
            cand = [m for c in cols for m in MOOD_FOR.get(c, ())]
        else:
            wall = OUTFITS[i % len(OUTFITS)]
            cand = []
            notes.append(f"location {loc.get('id')}: no colour word recognised in {text!r}; wall colour and mood are placeholders")
        nxt = style.get(order[n + 1], {}).get("mood") if n + 1 < len(order) else None
        used = [s["mood"] for s in style.values()]
        mood = next((m for m in cand if m not in (prev, nxt) and m not in used), None) or next((m for m in cand if m not in (prev, nxt)), None)
        if mood is None:
            mood = next((m for m in MOODS if m not in (prev, nxt) and m not in used), None) or next(m for m in MOODS if m not in (prev, nxt))
        dark = mood in ("night", "cold", "dream", "neon", "alarm", "dusk")
        style[i] = {"mood": mood, "wall": wall, "floor": shade(wall, 0.5 if not dark else 0.42), "wallPattern": WALLS[len(style) % len(WALLS)], "floorPattern": FLOORS[len(style) % len(FLOORS)]}
        prev = mood
    return style


# ---------- reading the voice timing ----------

ABBREV = re.compile(r"\b(?:mr|mrs|ms|dr|st|vs|no|jr|sr|etc|prof|gen|col|lt|capt|sgt|mt)\.$", re.I)
SENT_END = re.compile(r"[.!?][\"'”’)\]]*$")


def sentences(timing):
    """The spoken sentences in order: { line, speaker, text, from, to, cut, line_end }. `cut` is the frame a shot
    change after the sentence goes on (just before the next one starts, as the existing scenes cut); the last
    sentence's is totalFrames. Sentence ends inside a line come from the captions; a line without captions is one unit."""
    lines, total = timing["lines"], timing["totalFrames"]
    caps = sorted((c for c in timing.get("captions") or [] if isinstance(c, dict) and "from" in c), key=lambda c: c["from"])
    spans = sorted(tuple(w) for ws in (timing.get("words") or {}).values() for w in ws if isinstance(w, (list, tuple)) and len(w) == 2) if isinstance(timing.get("words"), dict) else []

    def cut_before(start, speech_end):  # the cut between a sentence ending at speech_end and one starting at start
        ends = [b for _, b in spans if speech_end - 30 <= b <= start]
        last = max(ends) if ends else min(speech_end, start)
        return max(min(last, start), start - 2)

    units = []
    for n, line in enumerate(lines):
        nxt = lines[n + 1]["from"] if n + 1 < len(lines) else total + 1
        mine = [c for c in caps if line["from"] - 1 <= c["from"] < nxt]
        groups, cur = [], []
        for c in mine:
            cur.append(c)
            t = str(c.get("text", "")).strip()
            if SENT_END.search(t) and not ABBREV.search(t):
                groups.append(cur)
                cur = []
        if cur:
            groups.append(cur)
        if len(groups) <= 1:
            parts = [(line["from"], line["to"], str(line.get("text", "")).strip(), mine)]
        else:
            parts = [(g[0]["from"], g[-1]["to"], " ".join(str(c.get("text", "")).strip() for c in g), g) for g in groups]
            parts[0] = (line["from"], *parts[0][1:])
            parts[-1] = (parts[-1][0], line["to"], *parts[-1][2:])
        for k, (a, b, text, g) in enumerate(parts):
            units.append({"line": line.get("i", n), "speaker": line.get("speaker", "narrator"), "text": text, "from": a, "to": b, "caps": g, "line_end": k == len(parts) - 1})
    for u, v in zip(units, units[1:]):
        u["cut"] = cut_before(v["from"], u["to"])
    units[-1]["cut"] = total
    return units


def first_words(timing):
    """The first line's words as (start, end, text). The voice stage writes one span per script word; when the counts
    differ (or there are no word spans) the captions stand in, two words at a time."""
    line = timing["lines"][0]
    nxt = timing["lines"][1]["from"] if len(timing["lines"]) > 1 else timing["totalFrames"] + 1
    words = timing.get("words")
    spans = sorted(tuple(w) for w in (words.get(line.get("speaker"), []) if isinstance(words, dict) else []) if isinstance(w, (list, tuple)) and len(w) == 2 and line["from"] - 1 <= w[0] < nxt)
    tokens = str(line.get("text", "")).split()
    if spans and len(spans) == len(tokens):
        return [(a, b, t) for (a, b), t in zip(spans, tokens)], True
    caps = [c for c in timing.get("captions") or [] if isinstance(c, dict) and line["from"] - 1 <= c.get("from", -9) < nxt]
    return [(c["from"], c["to"], str(c.get("text", "")).strip()) for c in caps], False


def hook_beats(timing, units, notes):
    """Cut frames of the 2-3 hook beats: [c1, c2(, c3)], each beat 0.7-1.5 s, the last ending by HOOK_END, each cut
    just before a word of the first line starts (in the pause before it when there is one)."""
    words, exact = first_words(timing)
    line_cut = next(u["cut"] for u in units if u["line_end"])  # where a cut after the whole first line goes
    limit = min(HOOK_END, line_cut)
    cand = {}  # cut frame -> bonus for a phrase end or a pause before it
    for (_, pe, pt), (a, _, _) in zip(words, words[1:]):
        c = max(pe, a - 2) if a - pe >= 2 else a
        if 0 < c <= limit:
            cand[c] = (4 if pt.rstrip("\"'”’)").endswith((",", ";", ":", ".", "!", "?", "—")) else 0) + (2 if a - pe >= 4 else 0)
    if line_cut <= HOOK_END:
        cand[line_cut] = 6
    if not exact and words:
        notes.append("hook: timing.json has no word spans matching the first line's words; the beats are cut on caption starts (two words at a time)")

    def best(lo):
        found = None
        for n in (3, 2):
            for cuts in itertools.combinations(sorted(cand), n):
                lens = [b - a for a, b in zip((0,) + cuts, cuts)]
                if min(lens) < lo or max(lens) > BEAT[1]:
                    continue
                mean = sum(lens) / n
                score = (3 - n) * 40 + (limit - cuts[-1]) * 0.6 + sum((v - mean) ** 2 for v in lens) ** 0.5 - sum(cand[c] for c in cuts)
                if found is None or score < found[0]:
                    found = (score, list(cuts))
        return found and found[1]

    cuts = best(BEAT[0])
    if cuts:
        if len(cuts) == 2 and limit < 3 * BEAT[0]:
            notes.append(f"hook: the first line ends at frame {line_cut}, room for only 2 beats")
        return cuts
    cuts = best(BEAT_FLOOR)
    if cuts:
        notes.append(f"hook: no word boundaries of the first line (it ends at frame {line_cut}) give beats of 0.7-1.5 s; used beats down to 0.6 s, which `check` accepts")
        return cuts
    n = 3 if limit >= 3 * BEAT[0] else 2
    step = max(BEAT_FLOOR, min(BEAT[1], limit // n))
    cuts = [step * (k + 1) for k in range(n)]
    notes.append(f"hook: the first line gives no usable word boundaries before frame {limit}; the beats are cut evenly at {cuts}, not on words: move them onto stressed words")
    return cuts


def said_between(timing, a, b):
    """The words of the first line that start in frames [a, b)."""
    return " ".join(t for s, _, t in first_words(timing)[0] if a <= s < b)


def body_cuts(units, start, total, want, notes):
    """The body shots as (from, to) spans from the hook's end to the last frame, cut only on sentence ends: 9-12 of
    them, none under 1.5 s or over 10 s, average 4-7 s, as near `want` shots as that allows, line ends preferred to
    sentence ends inside a line."""
    bounds = [(start, True)] + [(u["cut"], u["line_end"]) for u in units if u["cut"] > start]
    n = len(bounds) - 1
    span = total - start
    for (a, _), (b, _) in zip(bounds, bounds[1:]):
        if b - a > SHOT[1]:
            notes.append(f"a sentence runs {(b - a) / FPS:.1f} s without an end to cut on (frames {a}-{b}; a shot is at most 10 s): split it in lines.json and re-voice, or cut inside it by hand")
    best = None
    for shots in range(1, min(n, 16) + 1):
        target = span / shots
        INF = float("inf")
        # cost[k][j]: best cost of cutting the first j atoms into k shots
        cost = [[INF] * (n + 1) for _ in range(shots + 1)]
        back = [[0] * (n + 1) for _ in range(shots + 1)]
        cost[0][0] = 0.0
        for k in range(1, shots + 1):
            for j in range(k, n + 1):
                for i in range(k - 1, j):
                    if cost[k - 1][i] == INF:
                        continue
                    length = bounds[j][0] - bounds[i][0]
                    c = cost[k - 1][i] + ((length - target) / target) ** 2
                    c += 100 * (max(0, SHOT[0] - length) / SHOT[0] + max(0, length - SHOT[1]) / SHOT[1]) + (100 if length < SHOT[0] or length > SHOT[1] else 0)
                    c += 0 if bounds[j][1] or j == n else 0.12
                    c += 100 if i == 0 and bounds[j][0] <= HOOK_END else 0  # `check` would count it as a hook beat
                    if c < cost[k][j]:
                        cost[k][j], back[k][j] = c, i
        if cost[shots][n] == INF:
            continue
        c = cost[shots][n] + 0.25 * abs(shots - want)
        c += 1000 * (max(0, SHOTS[0] - shots) + max(0, shots - SHOTS[1]))
        c += 300 * (1 if not AVG[0] <= target <= AVG[1] else 0)
        if best is None or c < best[0]:
            idx, j = [n], n
            for k in range(shots, 0, -1):
                j = back[k][j]
                idx.append(j)
            idx.reverse()
            best = (c, [(bounds[a][0], bounds[b][0]) for a, b in zip(idx, idx[1:])])
    spans = best[1]
    if not SHOTS[0] <= len(spans) <= SHOTS[1]:
        notes.append(f"{len(spans)} shots after the hook (want 9-12): the voice has only {n} sentence ends after frame {start}; `check` will fail until lines.json gives more (or fewer) sentence ends")
    avg = span / len(spans)
    if not AVG[0] <= avg <= AVG[1]:
        notes.append(f"average shot {avg / FPS:.1f} s (want 4-7 s)")
    for a, b in spans:
        if b - a < SHOT[0]:
            notes.append(f"shot {a}-{b} is {(b - a) / FPS:.1f} s (min 1.5 s): no later sentence end fits; `check` will fail on it")
        if b - a > SHOT[1]:
            notes.append(f"shot {a}-{b} is {(b - a) / FPS:.1f} s (max 10 s): no sentence end inside it; `check` will fail on it")
    return spans


def assign_locations(nshots, locs, notes):
    """Location index per body shot: the first and the last shot are the opening location (the video loops), the
    shots between them walk the plan's other locations in order."""
    L = len(locs)
    if nshots == 1:
        return [0]
    same = lambda a, b: a.get("id") == b.get("id") or (a.get("set") and a.get("set") == b.get("set"))
    rest = list(range(1, L - 1 if L > 2 and same(locs[0], locs[-1]) else L))
    mid = nshots - 2
    if not rest:
        return [0] * nshots
    if mid <= 0:
        picked = []
    elif mid == len(rest):
        picked = rest
    elif mid < len(rest):
        picked = [rest[round(k * (len(rest) - 1) / max(1, mid - 1))] for k in range(mid)] if mid > 1 else [rest[0]]
        left = [locs[i].get("id") for i in rest if i not in picked]
        notes.append(f"{len(rest)} locations after the opening one but {mid} shots between the first and the last: left out {', '.join(map(str, left))}")
    else:
        picked = [rest[min(len(rest) - 1, k * len(rest) // mid)] for k in range(mid)]
        notes.append(f"{mid} shots between the first and the last but only {len(rest)} locations after the opening one: some take two shots in a row (joined by \"dissolve\")")
    return [0] + picked + [0]


# ---------- writing the scene ----------

def vec(v):
    return "[" + ", ".join(f"{x:.2f}".rstrip("0").rstrip(".") if abs(x) > 1e-9 else "0" for x in v) + "]"


def cam(pos, tgt):
    return f"position: {vec(pos)}, target: {vec(tgt)}, fov: 40"


def move_views(move, s):
    """(start, end) views of a placeholder move round a puppet standing at the origin; s = ±1 mirrors it."""
    if move == "crane":
        return ((0.2 * s, 1.95, 2.0), (0.05 * s, 0.9, -0.4)), ((0.08 * s, 1.02, 1.95), (0, 0.78, -0.35))
    if move == "track":
        return ((-0.45 * s, 1.2, 2.3), (-0.35 * s, 0.95, -0.5)), ((0.35 * s, 1.2, 2.3), (0.3 * s, 0.95, -0.5))
    return ((0.35 * s, 1.25, 2.5), (0.05 * s, 0.9, -0.4)), ((0.12 * s, 1.0, 1.75), (0.02 * s, 0.8, -0.35))


OPEN_VIEW = ((0.35, 1.25, 2.5), (0.05, 0.9, -0.4))
BEAT_VIEWS = (  # three different pictures of one event, each already moving
    (OPEN_VIEW, ((0.2, 1.1, 1.9), (0.03, 0.85, -0.35)), None, "fast push from the opening view"),
    (((0.28, 1.06, 1.55), (0.0, 0.92, -0.3)), ((0.1, 1.0, 1.3), (0.0, 0.9, -0.3)), 1.2, "close on the face reacting"),
    (((-0.5, 0.7, 1.9), (-0.05, 0.8, -0.3)), ((-0.15, 0.78, 1.6), (0.0, 0.82, -0.3)), 1.3, "low angle, quick track: the impact or the result"),
)


def lerp(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def short(text, n=6):
    w = str(text).split()
    return " ".join(w[:n]) + (" …" if len(w) > n else "")


def one_line(text):
    return re.sub(r"\s+", " ", str(text)).strip()


def build(slug, plan, timing, notes):
    total = timing["totalFrames"]
    units = sentences(timing)
    locs = [l for l in plan.get("locations") or [] if isinstance(l, dict)]
    if not locs:
        locs = [{"id": "opening", "set": "TODO", "colour": ""}]
        notes.append("plan.json has no locations: one placeholder location is used for every shot")
    chars = [c if isinstance(c, dict) else {"id": str(c), "look": ""} for c in plan.get("characters") or []]
    if not chars:
        chars = [{"id": "hero", "look": ""}]
        notes.append("plan.json has no characters: one placeholder character `hero` is used")
    year = plan.get("year")
    if "year" not in plan:
        notes.append("plan.json has no `year`: assumed a present-day story (set it: `check` tests the costumes against it)")

    beats = hook_beats(timing, units, notes)
    hook_end = beats[-1]
    same = lambda a, b: a.get("id") == b.get("id") or (a.get("set") and a.get("set") == b.get("set"))
    want = max(SHOTS[0], min(SHOTS[1], len(locs) if len(locs) > 2 and same(locs[0], locs[-1]) else len(locs) + 1))
    spans = body_cuts(units, hook_end, total, want, notes)
    where = assign_locations(len(spans), locs, notes)
    styles = location_styles(locs, where, notes)

    # looks: the plan's characters, plus any speaker in lines.json the plan forgot
    # the shot components (H1.., S1..) and their camera keys are named after the shot: keep characters and sets off them
    taken = set(RESERVED) | {f"{p}{k}{x}" for p in "HS" for k in range(1, 31) for x in ("", "_START", "_END")}
    cast = {}
    for k, c in enumerate(chars):
        cid = str(c.get("id") or f"char{k + 1}")
        d, how = look_of(c, k, year, notes)
        cast[cid] = {"const": unique(ident(cid), taken), "look": d, "how": how, "text": one_line(c.get("look") if not isinstance(c.get("look"), dict) else q(c.get("look")))}
    speakers = [u["speaker"] for u in units]
    for sp in dict.fromkeys(speakers):
        if sp != "narrator" and sp not in cast:
            d, how = look_of({"id": sp, "look": ""}, len(cast), year, notes)
            cast[sp] = {"const": unique(ident(sp), taken), "look": d, "how": "speaker in lines.json that plan.json's characters do not list: neutral placeholder", "text": ""}
            notes.append(f"speaker `{sp}` is not among plan.json's characters: given a neutral look")
    ids = list(cast)
    hero = ids[0]

    set_names = {}
    for i in dict.fromkeys(where):
        set_names[i] = unique(ident(locs[i].get("id") or f"loc{i + 1}", upper=False) + "Set", taken)

    # shots: hook beats H1.., body shots S1..
    shots = []
    for k, (a, b) in enumerate(zip([0] + beats, beats)):
        shots.append({"name": f"H{k + 1}", "from": a, "to": b, "loc": where[0], "trans": "false", "hook": k})
    seed = plan.get("seed") if isinstance(plan.get("seed"), dict) else {}
    gags = [g for g in plan.get("gags") or [] if isinstance(g, dict)]
    rot = 1
    for k, (a, b) in enumerate(spans):
        mine = [u for u in units if a < u["cut"] <= b]
        trans = "false" if k == 0 else '"dissolve"' if where[k] == where[k - 1] else '"dip"'
        who = [sp for sp in dict.fromkeys(u["speaker"] for u in mine) if sp in cast]
        if k in (0, len(spans) - 1):
            who = [hero] + [w for w in who if w != hero]
        elif not who:
            who = [ids[rot % len(ids)]]
            rot += 1
        elif len(who) == 1 and len(ids) > 1:
            other = next(i for i in ids[rot % len(ids):] + ids if i != who[0])
            who.append(other)
        shots.append({"name": f"S{k + 1}", "from": a, "to": b, "loc": where[k], "trans": trans, "units": mine, "who": who[:2], "move": MOVES[k % len(MOVES)], "last": k == len(spans) - 1, "body": k})
    for sh in shots[: len(beats)]:
        sh["units"] = [units[0]]
        sh["who"] = [hero]

    th = plan.get("triple_hook") if isinstance(plan.get("triple_hook"), dict) else {}
    headline = one_line(th.get("text") or "")
    if not headline or len(headline.split()) > 6 or "(" in headline:
        guess = " ".join(re.sub(r"[^\w\s'?!-]", "", str(plan.get("title") or slug.replace("-", " "))).upper().split()[:6])
        notes.append(("plan.json has no triple_hook.text" if not headline else "plan.json triple_hook.text is not a 2-6 word headline") + f": the Headline shows the title's first words ({guess!r}); write the real one")
        headline = guess
    visual = one_line(th.get("visual") or (plan.get("beats") or {}).get("hook") or "")

    o = []
    w = o.append
    w('import React from "react";')
    w("import {")
    for name in sorted(["CameraShot", "ease", "faceChange", "frameSpot", "Headline", "InkBox", "Label", "mix", "moodBackground", "MUSIC_FILES", "MusicCue", "pup", "PuppetLook", "Room", "Sfx", "sfx", "Shot", "Stage", "Timing", "useShotFrame", "Video", "wide", "widePath"], key=str.lower):
        w(f"  {name},")
    w('} from "../../engine";')
    w('import TIMING_JSON from "./timing.json";')
    w("")
    w(f"// {q(one_line(plan.get('title') or slug))}: {one_line(plan.get('mechanism') or '')}")
    w(f"// Scaffolded by scripts/scaffold.py from plan.json and the voice timing ({total} frames, {len(beats)} hook beats + {len(spans)} shots).")
    w("// Every TODO(author) below is a placeholder to replace; delete each TODO as you do it. Helpers (ease, mix, rand,")
    w("// pup, one, multi, wide, widePath, solveReach, UNITS) come from the engine: import them, never declare one here")
    w("// (guide/library.md → Shared helpers). New props go in ./props.tsx.")
    w("")
    w("const TIMING = TIMING_JSON as Timing;")
    w(f"export const SLUG = {q(slug)};")
    w("export const timing = TIMING;")
    w("")
    w("const ASPECT = 9 / 16;")
    w("")
    era = "present day" if story_from(year) is None else f"story year {q(year)}"
    w(f"// ---------- cast ({era}) ----------")
    w("// TODO(author): looks. Give each character the whole costume the plan decided, head to feet, right for the year")
    w("// (SKILL.md step 3; library.md → Puppets, Period check; `check` tests kit pieces against plan.json `year`). Women")
    w("// get `long: true`. A piece the kit lacks is built in this folder.")
    w("")
    for cid, c in cast.items():
        if c["text"]:
            w(f"// {cid} — plan: {c['text']}")
        w(f"const {c['const']}: PuppetLook = {ts_look(c['look'])}; // {c['how']}")
    w("")
    w("// ---------- locations ----------")
    w("// TODO(author): sets. Each is a bare Room in the plan's colour with a name card (`card`, off in the hook). Build the real set from kit props")
    w("// or reuse an existing one (library.md → Set kit, themed sets; a new place: research references first, then room →")
    w("// light → puppets → camera, a still after each step). Pixar look: rounded forms, painted wear on big surfaces, a")
    w("// background layer behind the subject, something moving besides the camera (rules.md → Picture: Painted, not")
    w("// rendered; Depth; Secondary motion). Keep each location its own colour family and mood (no colour")
    w("// over 40 % of the runtime); lift signs 1-2 cm off walls (Z-depth).")
    for i, name in set_names.items():
        loc, st = locs[i], styles[i]
        label = re.sub(r"[^A-Z0-9 ]+", " ", str(loc.get("id") or f"location {i + 1}").upper()).strip()[:18] or "SET"
        w("")
        w(f"// {loc.get('id')} — plan: {one_line(loc.get('set'))} ({one_line(loc.get('colour'))})")
        w(f"const {name}: React.FC<{{ camera: CameraShot; card?: boolean; children?: React.ReactNode }}> = ({{ camera, card = true, children }}) => (")
        w(f'  <Room camera={{camera}} mood="{st["mood"]}" floor="{st["floor"]}" wall="{st["wall"]}" wallPattern="{st["wallPattern"]}" floorPattern="{st["floorPattern"]}" width={{6}} depth={{4}}>')
        w(f"    {{card && <Label text={q(label)} position={{[0, 1.78, -1.9]}} width={{{min(1.2, 0.3 + 0.06 * len(label)):.2f}}} />}}")
        w("    {children}")
        w("  </Room>")
        w(");")
    w("")
    l0 = timing["lines"][0]
    w("// ---------- the hook: " + f"{len(beats)} beats on words of the first line, hard cuts, all over by frame {hook_end} ----------")
    w(f"// line {l0.get('i', 0)} ({l0['from']}-{l0['to']}) {l0.get('speaker', 'narrator')}: {q(one_line(l0.get('text')))}")
    if visual:
        w(f"// plan, at frame 0: {visual}")
    w("// TODO(author): hook. Each beat is a different picture of the same strange event (the thing coming at the lens, a")
    w("// face reacting, the impact or the result), shows its peak at its first frame and has the camera already moving;")
    w("// the hero object close to the lens (rules.md → Story, Fast opening). By frame 15 the strange thing is in frame and")
    w("// moving, the first sentence is running and the headline is in (Triple hook): the three do different jobs.")
    w("")
    w(f"const OPEN_CAM: CameraShot = {{ {cam(*OPEN_VIEW)} }}; // frame 0, and where the last shot comes to rest (the loop)")
    w(f"const HEADLINE = {q(headline)}; // TODO(author): 2-6 words on at most 2 lines, never the spoken sentence (Triple hook, Text)")
    w(f"const HOOK_OUT = {max(beats[0], hook_end - 12)}; // video frame the headline fades at: near the end of the hook")
    size = 92 if len(headline) <= 14 else 70
    for sh in shots[: len(beats)]:
        k, n = sh["hook"], sh["to"] - sh["from"]
        a, b, kk, what = BEAT_VIEWS[k]
        st = styles[sh["loc"]]
        said = said_between(timing, sh["from"], sh["to"]) or short(units[0]["text"])
        sh["said"] = one_line(said)
        w("")
        w(f"// ---------- hook beat {k + 1} · frames {sh['from']}-{sh['to']} ({n / FPS:.1f} s) · {locs[sh['loc']].get('id')} · on: {q(one_line(said))} ----------")
        w(f"const {sh['name']}: React.FC = () => {{")
        w(f"  const f = useShotFrame(); // 0..{n - 1}")
        w(f"  // TODO(author): camera path. Placeholder: {what}. Already moving at its first frame; a jolt only on an impact sound.")
        w("  const camera = widePath(")
        w("    [")
        ktxt = f", k: {kk}" if kk else ""
        w(f"      {{ at: 0, {'...OPEN_CAM' if k == 0 else cam(*a)}{ktxt} }},")
        w(f"      {{ at: {n - 1}, {cam(*b)}{ktxt} }},")
        w("    ],")
        w("    f,")
        w("  );")
        w("  return (")
        w("    <>")
        w("      <Stage")
        w(f"        set={{<{set_names[sh['loc']]} camera={{camera}} card={{false}}>{{/* TODO(author): props and gags: the strange thing itself, in frame and changing at frame 0 */}}</{set_names[sh['loc']]}>}}")
        w("        camera={camera}")
        w(f'        bg={{moodBackground("{st["mood"]}")}}')
        w("        blur={2.2}")
        w("        puppets={[")
        w("          // TODO(author): acting. The reaction at its peak on this beat's first frame (rules.md → Act on the words).")
        expr = ("shocked", "worried", "confused")[k]
        w(f'          pup({q(hero)}, {cast[hero]["const"]}, [0, -0.3], {{ view: "front", expression: "{expr}", lookX: mix(0.3, -0.2, ease(f, 0, {n - 1})) }}),')
        w("        ]}")
        w("      />")
        w(f"      <Headline f={{f}} text={{HEADLINE}} at={{{4 - sh['from']}}} out={{HOOK_OUT - {sh['from']}}} size={{{size}}} />")
        w("    </>")
        w("  );")
        w("};")
    w("")
    w(f"// ---------- the story: {len(spans)} shots, one location each, each ending on a sentence end ----------")
    for sh in shots[len(beats):]:
        k, n = sh["body"], sh["to"] - sh["from"]
        st, loc = styles[sh["loc"]], locs[sh["loc"]]
        w("")
        w(f"// ---------- {k + 1}. frames {sh['from']}-{sh['to']} ({n / FPS:.1f} s) · {loc.get('id')} ({st['mood']}) ----------")
        seen = set()
        for u in sh["units"]:
            if u["line"] in seen:
                continue
            seen.add(u["line"])
            part = [v for v in sh["units"] if v["line"] == u["line"]]
            text = " ".join(v["text"] for v in part)
            if k == 0 and u is units[0] and hook_end < units[0]["cut"]:
                text = "(the hook beats carry its start) " + text
            w(f"// line {u['line']} ({part[0]['from']}-{part[-1]['to']}) {u['speaker']}: {q(one_line(text))}")
        w("// TODO(author): picture. Show what these lines say: one idea, readable in one second, at most 6 words of text in")
        w("// frame, the puppet 40-60 % of the frame height (rules.md → Picture: Explanation shots, Character size).")
        lines_here = {u["line"] for u in sh["units"]}
        if seed.get("what") and seed.get("first_line") in lines_here:
            w(f"// TODO(author): seed. On screen in this shot, by line {seed.get('first_line')}: {one_line(seed.get('what'))} (rules.md → Seed: visible within the first 20 s).")
        for g in gags:
            if g.get("line") in lines_here:
                w(f"// TODO(author): gag, line {g.get('line')}: {one_line(g.get('what'))} (rules.md → Gags: a physical action in steps, dust or stars on the hit, the world reacts).")
        if sh["trans"] == '"dissolve"':
            w('// TODO(author): this shot stays in the previous shot\'s location, so it comes in on "dissolve" (a change of time in one place); re-light it, or join the two into one shot with a camera move.')
        if sh["last"]:
            w("// TODO(author): loop. This shot is back in the opening location and ends on the opening picture: the camera comes to")
            w("// rest on OPEN_CAM, the strange thing is back in its frame-0 state, the light is the opening light, no dip, fade or")
            w("// hold at the end; the closing line hands over to the first sentence (rules.md → Story, Closing line).")
        # camera keys: frame 0, the start of each later sentence in the shot, the last frame
        inner = []
        for u in sh["units"]:
            at = u["from"] - sh["from"]
            if at >= 24 and n - 1 - at >= 24 and (not inner or at - inner[-1][0] >= 24):
                inner.append((at, u))
        if len(inner) > 3:
            keep = [x for x in inner if x[1]["from"] == next(v["from"] for v in units if v["line"] == x[1]["line"])][:3] or inner[:3]
            inner = sorted(keep, key=lambda x: x[0])
        if sh["last"]:
            a, b = ((0.1, 1.0, 1.6), (0.0, 0.82, -0.35)), OPEN_VIEW
            move = "pull back and rise to the opening view"
        else:
            a, b = move_views(sh["move"], 1 if k % 2 else -1)
            move = {"push": "push in", "crane": "crane down", "track": "sideways track"}[sh["move"]]
        sh["move_text"] = move
        w(f"const {sh['name']}_START: CameraShot = {{ {cam(*a)} }};")
        w(f"const {sh['name']}_END: CameraShot = " + ("OPEN_CAM;" if sh["last"] else f"{{ {cam(*b)} }};"))
        w(f"const {sh['name']}: React.FC = () => {{")
        w(f"  const f = useShotFrame(); // 0..{n - 1}")
        w(f"  // TODO(author): camera path. Placeholder: {move}. One key per subject, on the frame the narrator names it (the keys below")
        w("  // sit on this shot's sentence starts, shot-relative); net travel 25-40 % of the frame width, eased out to rest; across the")
        w("  // video about half push-ins, a third cranes, a fifth sideways tracks (rules.md → Camera speed, Camera moves). Write the")
        w(f"  // plan first in ../videos/{slug}/camera_plan.md (from animator/).")
        w("  const camera = widePath(")
        w("    [")
        w(f"      {{ at: 0, ...{sh['name']}_START }},")
        for at, u in inner:
            t = at / (n - 1)
            w(f"      {{ at: {at}, {cam(lerp(a[0], b[0], t), lerp(a[1], b[1], t))} }}, // {q(short(u['text'], 5))}")
        w(f"      {{ at: {n - 1}, ...{sh['name']}_END }},")
        w("    ],")
        w("    f,")
        w("  );")
        w("  return (")
        w("    <Stage")
        w(f"      set={{<{set_names[sh['loc']]} camera={{camera}}>{{/* TODO(author): props: the labelled physical props this line needs, each resting on something (rules.md → Nothing floats) */}}</{set_names[sh['loc']]}>}}")
        w("      camera={camera}")
        w(f'      bg={{moodBackground("{st["mood"]}")}}')
        w("      blur={2.2}")
        w("      puppets={[")
        w("        // TODO(author): acting. Characters touch the world (sit, hold, push, walk in profile), a gesture or face change")
        w("        // lands on the stressed word, hands on any tool and moving (rules.md → Characters touch the world, Act on the")
        w("        // words, No action twice the same way). A puppet whose id is a speaker in lines.json lip-syncs by itself.")
        mid = inner[0][0] if inner else max(1, n // 2)
        spots = ([0, -0.3],) if len(sh["who"]) == 1 else ([-0.32, -0.3], [0.32, -0.38])
        for j, cid in enumerate(sh["who"]):
            e1, e2 = EXPRESSIONS[(k + j) % len(EXPRESSIONS)], EXPRESSIONS[(k + j + 1) % len(EXPRESSIONS)]
            look = f"lookX: mix({-0.3 if j == 0 else 0.4}, {0.3 if j == 0 else -0.4}, ease(f, {mid}, {min(n - 1, mid + 20)}))"
            w(f'        pup({q(cid)}, {cast[cid]["const"]}, {q(list(spots[j]))}, {{ view: "front", ...faceChange([[0, "{e1}"], [{mid}, "{e2}"]], f), {look} }}),')
        w("      ]}")
        w("      // TODO(author): light. Pass `light` when the shot has a strong source (fire, lamp, headlights); the mood lights the rest")
        w("      // (library.md → Puppet lighting; rules.md → Light follows the story).")
        w("      // TODO(author): foreground. A real object of this place near the lens at the frame edge, never over a face or a label,")
        w("      // under a third of the frame; none in a shot whose camera travels a lot (rules.md → Depth).")
        side = -0.92 if k % 2 else 0.92
        w(f'      foreground={{<InkBox size={{[0.16, 0.12, 0.14]}} position={{frameSpot(wide({sh["name"]}_START), ASPECT, {side}, -0.92, 1.15)}} color="{shade(st["wall"], 0.7)}" ink={{0.006}} />}}')
        w("    />")
        w("  );")
        w("};")
    w("")
    w("// ---------- the cut ----------")
    w(f"// Cut to the voice (timing.json): the hook beats on words of the first line, every other cut on a sentence end.")
    w('// `false` = hard cut (only between the hook beats, at most one more after them), "dip" = a new location, "dissolve" =')
    w("// a change of time in one place. One entry per line: `pipeline.py check` parses them. After a re-voice the frames")
    w("// move: re-cut from the new timing.json.")
    w("")
    w("const SHOTS: Shot[] = [")
    for sh in shots:
        end = "TIMING.totalFrames" if sh["to"] == total else sh["to"]
        w(f"  [{sh['from']}, {end}, {sh['name']}, {sh['trans']}],")
    w("];")
    first = shots[len(beats)]
    w("")
    w("// TODO(author): sound effects. One for every mechanical action on screen, on the frame it happens (shot start + shot")
    w("// frame); every one-shot effect takes the location's `space`; organic or repeated sounds come from the foley takes")
    w("// (foleyCues on frames from the motion); a sting on the pivot line; nothing starts in the last 8 frames (rules.md →")
    w("// Sound; library.md → Sound, Foley). Then `pipeline.py sync` and `mix`.")
    w("const SFX: Sfx[] = [")
    w(f'  // {{ at: {first["to"]} + 40, src: sfx("pop"), volume: 0.5, space: "room" }}, // a label popping in 40 frames into shot 2')
    w("];")
    w("")
    w("// TODO(author): music. At least three beds across the video, changed on shot boundaries, the last one cut so its end")
    w("// meets the first one's start for the loop (rules.md → Sound, Story → Closing line). `sync` fails with no music.")
    w("const MUSIC: MusicCue[] = [")
    w(f"  // {{ src: MUSIC_FILES.upbeat, from: 0, to: {first['to']}, volume: 0.26 }},")
    w("];")
    w("")
    w("export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;")
    w("")
    return "\n".join(o), shots, units, locs, styles, len(beats), headline


def camera_plan(slug, shots, locs, styles, nbeats, headline):
    o = [f"# Camera plan — {slug}", "", "Frames are video frames (30 fps). Travel is net, as a share of the frame width.",
         "Skeleton from scripts/scaffold.py: fill every TODO before writing the shots (guide/rules.md → Camera moves: about half",
         "push-ins, a third cranes, a fifth sideways tracks; 25-40 % net travel; one key per subject on the frame it is named).", "",
         "| # | Frames | Location | Path start → end | Move | Travel | Foreground / midground / background | In-world labels |",
         "|---|--------|----------|------------------|------|--------|-------------------------------------|-----------------|"]
    for sh in shots:
        loc = locs[sh["loc"]]
        place = f"{loc.get('id')} ({one_line(loc.get('colour')) or styles[sh['loc']]['mood']})"
        if "hook" in sh:
            labels = f"headline {headline}" if sh["hook"] == 0 else "TODO"
            o.append(f"| {sh['name']} | {sh['from']}-{sh['to']} | {place} | TODO → TODO | hook beat: fast {('push', 'push', 'track')[sh['hook']]}, already moving | TODO | TODO / TODO / TODO | {labels} |")
        else:
            end = " → the opening view (loop)" if sh["last"] else " → TODO"
            o.append(f"| {sh['body'] + 1} | {sh['from']}-{sh['to']} | {place} | TODO{end} | {sh['move_text']} (placeholder) | TODO 25-40 % | TODO / TODO / TODO | TODO |")
    o += ["", "Lines per shot:", ""]
    for sh in shots[nbeats:]:
        said = " ".join(u["text"] for u in sh["units"])
        o.append(f"- {sh['body'] + 1} ({(sh['to'] - sh['from']) / FPS:.1f} s): {one_line(said)}")
    trans = ", ".join(f"{sh['body'] + 1} {sh['trans'].strip(chr(34))}" for sh in shots[nbeats + 1:])
    o += ["", f"Transitions: hard cuts between the {nbeats} hook beats and into shot 1; then {trans}. The last shot ends on the opening picture (no dip or hold): the video loops.", ""]
    return "\n".join(o)


def summary(shots, units, locs, nbeats, total):
    rows = []
    for sh in shots:
        ls = sorted({u["line"] for u in sh["units"]})
        span = f"{ls[0]}" if len(ls) == 1 else f"{ls[0]}-{ls[-1]}"
        said = short(" ".join(u["text"] for u in sh["units"]), 7) if "body" in sh else short(sh["said"], 7)
        rows.append((sh["name"], f"{sh['from']}-{sh['to']}", f"{(sh['to'] - sh['from']) / FPS:.1f}", sh["trans"].strip('"'), str(locs[sh["loc"]].get("id")), span, said))
    head = ("shot", "frames", "sec", "in", "location", "lines", "starts")
    wid = [max(len(r[i]) for r in rows + [head]) for i in range(6)]
    fmt = lambda r: "  ".join(c.ljust(wid[i]) for i, c in enumerate(r[:6])) + "  " + r[6]
    out = [fmt(head)] + [fmt(r) for r in rows]
    body = [sh for sh in shots if "body" in sh]
    lens = [(s["to"] - s["from"]) / FPS for s in body]
    out.append(f"{nbeats} hook beats (to frame {shots[nbeats - 1]['to']}) + {len(body)} shots, average {sum(lens) / len(lens):.2f} s, shortest {min(lens):.1f} s, longest {max(lens):.1f} s, {total} frames")
    return "\n".join(out)


def self_check(shots, total, nbeats):
    """The rules `pipeline.py check` applies to the shot list, on what was just laid out."""
    bad = []
    if shots[0]["from"] != 0 or shots[-1]["to"] != total:
        bad.append("the shots do not run from 0 to totalFrames")
    bad += [f"gap between {a['name']} and {b['name']}" for a, b in zip(shots, shots[1:]) if a["to"] != b["from"]]
    if not (2 <= nbeats <= 3 and all(s["to"] <= HOOK_END and s["to"] - s["from"] >= BEAT_FLOOR for s in shots[:nbeats])):
        bad.append("the hook beats do not fit 2-3 beats of at least 0.6 s by frame 105")
    if shots[nbeats]["to"] <= HOOK_END:
        bad.append(f"shot 1 ends by frame {HOOK_END}, so `check` would count it as a hook beat")
    return bad


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    force, dry = "--force" in argv, "--dry-run" in argv
    if len(args) != 1:
        sys.exit("usage: scripts/scaffold.py <slug> [--force] [--dry-run]")
    slug = args[0]
    plan = load(os.path.join(REPO, "videos", slug, "plan.json"), "the plan")
    lines = load(os.path.join(REPO, "videos", slug, "lines.json"), "the script")
    timing = load(os.path.join(ROOT, "src", "videos", slug, "timing.json"), "the voice timing (run `pipeline.py voice` first)")
    scene = os.path.join(ROOT, "src", "videos", slug, "Scene.tsx")
    plan_md = os.path.join(REPO, "videos", slug, "camera_plan.md")
    there = [os.path.relpath(p, ROOT) for p in (scene, plan_md) if os.path.exists(p)]
    if there and not force and not dry:
        sys.exit(f"scaffold: {' and '.join(there)} already exist{'s' if len(there) == 1 else ''}; nothing written (--force overwrites, --dry-run only prints the shot table)")
    notes = []
    if not timing.get("lines"):
        sys.exit("scaffold: timing.json has no lines")
    said, voiced = [one_line(l.get("text")) for l in lines.get("lines") or []], [one_line(l.get("text")) for l in timing["lines"]]
    if said != voiced:
        notes.append("lines.json and timing.json differ (the script was edited after `voice`): the cut follows timing.json; run `pipeline.py voice` again and re-scaffold")
    src, shots, units, locs, styles, nbeats, headline = build(slug, plan, timing, notes)
    notes += self_check(shots, timing["totalFrames"], nbeats)
    print(summary(shots, units, locs, nbeats, timing["totalFrames"]))
    print("could not satisfy / assumed:" if notes else "every shot rule is met from the timing.")
    for n in notes:
        print("  -", n)
    if dry:
        return
    os.makedirs(os.path.dirname(scene), exist_ok=True)
    open(scene, "w", encoding="utf-8").write(src)
    open(plan_md, "w", encoding="utf-8").write(camera_plan(slug, shots, locs, styles, nbeats, headline))
    print(f"wrote {os.path.relpath(scene, ROOT)} ({src.count(chr(10))} lines, {src.count('TODO(author)')} TODOs) and {os.path.relpath(plan_md, ROOT)}")
    print(f"next: .venv/bin/python scripts/pipeline.py check {slug}")


if __name__ == "__main__":
    main(sys.argv[1:])
