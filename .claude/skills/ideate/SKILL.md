---
name: ideate
description: Generate, research lightly and strictly score a batch of new video idea candidates for the 50-60 s explainer Shorts, check them against every video already made and every idea in the workspace, and load them into the ideation app's triage queue (Fabrika). Use when the user asks for new video ideas or runs "/ideate [count] [seed theme]", e.g. "/ideate 10" or "/ideate 8 airports".
---

# Idea factory: generate and score candidates

You generate and judge; the ideation app (`ideation/`) validates, scores your verdicts, checks lexical duplicates and
shows the queue at http://localhost:5173/factory, where the user keeps (`y`) or rejects (`n`) each one. Arguments: a
count N (default 10, max 20) and an optional seed theme. Run every command from `ideation/`.

## 1. Context

`npx tsx scripts/candidates.ts catalog > <scratchpad>/catalog.json`: the channel scope (`channel.promise`,
`channel.categories`), the rubric, every video made and every idea with its state. A rejected or trashed idea is the
user's "no": never propose it again under a new name. Read `../animator/guide/rules.md` → Story and Script too; the
rubric is a short form of it.

### House rules (override everything)

- No topic centred on one commercial brand: a company, trademark or branded product or model (a story resting on one
  aircraft, train or car model counts). Temples, buildings, places, institutions, cultures and people are not brands,
  and an industry (airlines, gyms) is fine. Hiding the name does not make a brand story eligible.
- The make-video format: 50-60 s, 180-210 words, one main character in a cast of at least 4, a twist that arrives as
  an event, the mechanism shown with labelled physical props. A list of reasons or a chart fails.
- Inside `channel.categories` and the promise; with a seed theme, every candidate is about it. Never zodiac (a
  separate series).

## 2. Generate about 3 × N, keep N

Real, sourceable mechanisms and events, not trivia: public reports and studies, patents, museum and archive
collections, incident reports, behavioural and perception research, odd laws and rulings, local history, animal
senses, body science. The proven shapes: "Why <everyday thing> secretly works like this", "The day <strange real
event> happened", "You wake up with <an animal's sense>". Cut anything that matches a made video or an idea in meaning
("oversell" = "overbooking"), is brand-centred, or pays off with a fact instead of a twist event.

## 3. Light research

For each kept idea open 1-2 sources with WebFetch, primary or official where possible, for the key number or fact.
List only pages you opened (none opened: `sources` empty). WebFetch returns a summary, not the page: put a number in
`sources[].note` only when you asked for the sentence verbatim and got it. Disagreeing sources go in `limitations`,
and the number stays out of the title. This only has to show "sourceable"; make-video checks the facts.

## 4. Drafts → `<scratchpad>/drafts.json`

Turkish for `title`, `question`, `mechanism`, `summary`, `limitations` (the app is Turkish); English for `titleEn` and
the hooks (the videos are English).

```json
[{
  "title": "...", "titleEn": "...", "question": "...", "mechanism": "...", "summary": "...",
  "category": "Gündelik sistemler", "tags": ["..."], "effort": "medium",
  "hooks": [{ "text": "...", "language": "en", "firstImage": "...", "onScreen": "...", "note": "" }],
  "visualNotes": "...", "limitations": "...",
  "sources": [{ "url": "https://...", "title": "...", "publisher": "...", "type": "official", "note": "key number" }]
}]
```

- `title`: a question or striking statement. `titleEn`: in the channel's style ("Why ...", "The Day ...").
  `question`: the viewer's question in one sentence. `mechanism`: one or two sentences with the key number.
- `summary`: the seven beats of rules.md → Story, a sentence each, so a kept idea carries into `plan.json`: hook (the
  strange event, the main character), but, then (they think they are winning), conflict (the twist **event**), pivot
  ("You see ..." on props), so, closing (hands back to the first line).
- `hooks`: 1-3 triple hooks, the preferred first, each with three different jobs live by 0.5 s: `text` the opening
  line (a claim that sounds impossible or a question, tied to the viewer), `firstImage` what is in frame and already
  moving at frame 0 (not a still view), `onScreen` a 2-6 word headline (a label, question or contrasting angle, never
  the words of `text`).
- `visualNotes`: the labelled props (UPPERCASE labels), the 3-4 locations that carry the story (the video needs 8),
  two physical gags. `limitations`: thin evidence, a contested number, sensitivity.
- `category`: one of `channel.categories`. `effort`: `low` | `medium` | `high`. Source `type`: `paper` | `official` |
  `firsthand` | `news` | `other`.

## 5. Score in a separate pass

Never grade your own drafts. Spawn one fresh general-purpose subagent with this prompt (paths filled in):

> You are a strict editor for a YouTube Shorts channel of 50-60 s vertical animated explainers. Judge the idea drafts
> in `<scratchpad>/drafts.json` against the rubric; you did not write them, so be critical. Read the catalog
> `<scratchpad>/catalog.json` (`rubric`, `channel`, `videos` made, workspace `ideas`, trashed and archived ones
> included), the house rules in `<repo>/.claude/skills/ideate/SKILL.md` → House rules, `<repo>/animator/guide/rules.md`
> → Story and Script, and for a made video close to a draft its `<repo>/videos/<slug>/plan.json`. `sources` are pages
> that were opened; `note` says what they back.
> For each draft give a verdict "pass" | "fail" | "unknown" for every rubric key:
> - `sourceable`: pass only if a listed, reasonably authoritative source backs the key claim; a blog quoting a study
>   is unknown; a contested core claim fails.
> - `novelty`: fail if a made video or idea has the same core mechanism or premise, or it is an over-told fact.
> - Gates (brand_free, format_fit, twist_event, prop_mechanism): narrated information is no twist event; a contested
>   mechanism fails prop_mechanism or format_fit; beats that contradict the mechanism go in small_story.
> - `hook`: the first hook as a triple hook; fail a still `firstImage`, a missing `onScreen` or one that repeats
>   `text`, or two channels doing one job.
> Output only a JSON array in the drafts' order: {"titleEn", "rubric": [{"key", "verdict", "evidence": "<quote from
> draft or source note, ≤ 160 chars>", "reason": "<one Turkish sentence>"}], "dupes": [{"kind": "video"|"idea", "ref":
> "<slug or id>", "title", "score": <0-1>, "why": "Anlamsal: <short Turkish>"}] (score ≥ 0.4 only), "rubricSummary":
> "<two Turkish sentences: strongest point, biggest risk>"}. Write it to `<scratchpad>/scores.json` and return it.

No numeric scores: the app computes them. A failed gate makes a candidate ineligible and each `unknown` gate costs
points; keep gate failures in the batch so the user sees why and the rejection is remembered.

## 6. Load and report

`npx tsx scripts/candidates.ts add <scratchpad>/drafts.json --scores <scratchpad>/scores.json` merges the verdicts by
`titleEn` and prints each score, `GATE`, `DUP` and validation errors. Fix and re-add only the failed items (re-adding
a good one makes a copy).

Report in one short message: how many were added, the top three with score and a line each, how many failed a gate or
were flagged as duplicates, the scope and seed used, and http://localhost:5173/factory. The user triages there; never
keep or reject candidates yourself.
