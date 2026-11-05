---
name: ideate
description: Generate, research lightly and strictly score a batch of new video idea candidates for the 50-60 s explainer Shorts, check them against every video already made and every idea in the workspace, and load them into the ideation app's triage queue (Fabrika). Use when the user asks for new video ideas or runs "/ideate [count] [seed theme]", e.g. "/ideate 10" or "/ideate 8 airports".
---

# Idea factory: generate and score candidates

The ideation app (`ideation/`) holds the queue; this skill fills it. You generate and judge. The app validates,
computes the score from your verdicts, runs a lexical duplicate check and shows the queue at
http://localhost:5173/factory, where the user keeps (`y`) or rejects (`n`) each candidate.

Arguments: a count N (default 10, max 20) and an optional seed theme. Work from `ideation/` for every command.

## 1. Read the context, every time

```bash
npx tsx scripts/candidates.ts catalog > <scratchpad>/catalog.json
```

It holds the channel scope (`channel.promise`, `channel.categories`), the rubric (criteria with the gate flag),
every video already made (`videos`, by slug and title) and every idea in the workspace with its state, trashed and
rejected ones included. A rejected or trashed idea is a "no" from the user: do not propose it again under a new
name.

Also read `../animator/guide/rules.md` (Story and Script sections). The rubric questions are short forms of it.

House rules that override everything:
- No topic centred on one company, brand or branded product/model. An industry (airlines, gyms, casinos) or a
  public institution is fine. Hiding the brand name does not make a brand story eligible.
- The format is the make-video Short: 50–60 s, 180–210 words, one character, a twist that arrives as an event,
  a mechanism shown with labelled physical props. Topics that need a list of reasons or a chart fail.
- Stay inside `channel.categories` and the channel promise. If a seed theme was given, every candidate must be
  about it.

## 2. Generate wide, then cut (about 3 × N raw ideas)

Look for real, sourceable mechanisms and events, not trivia lists. Use web search to find material, for example:
public reports and studies (regulators, statistics offices, transport and health agencies), patents, museum and
archive collections, engineering incident reports, behavioural-economics and perception research, odd laws and
court rulings, local history ("the day X happened"), animal senses and body science.

The channel's proven shapes (see `catalog.videos`):
- "Why <everyday thing> secretly works like this" — a hidden system behind prices, stores, buildings, rules.
- "The day <strange real event> happened" — one dated, documented event with a physical cause.
- "You wake up with <an animal's sense>" — perception from the inside.
Zodiac videos are a separate series: never propose them.

Cut every raw idea that matches a made video or an existing idea in meaning (not just in words: "oversell"
= "overbooking"), that is brand-centred, or whose payoff is a fact with no twist event. Keep the best N.

## 3. Light research for the N you keep

For each, open 1–2 sources with WebFetch, preferably primary or official, and note the key number or fact the
story rests on. Only list sources you actually opened. WebFetch returns a small model's summary, not the
page: put a number in `sources[].note` only when you asked for the sentence verbatim and it came back verbatim.
When sources disagree on a number, say so in `limitations` and leave the number out of the title. Full fact-checking happens later in make-video; here you
only need enough to judge "sourceable". If you could not open one, leave `sources` empty.

## 4. Write the drafts

Turkish for `title`, `summary`, `question`, `mechanism` and `limitations` (the app is Turkish); English for
`titleEn` and the hooks (the videos are English). Per candidate:

- `title` — Turkish working title, a question or a striking statement.
- `titleEn` — the English video title in the channel's style ("Why ...", "The Day ...").
- `question` — the viewer's question in one sentence.
- `mechanism` — the hidden mechanism in one or two sentences, with the key number.
- `summary` — the six beats in a few sentences: hook image, the one character and situation, the rise (they
  think they are winning), the twist **event**, the mechanism behind the scenes, the ending/loop.
- `hooks` — 1–3 English opening lines; first word "He", "It's" or "You"; `firstImage` says what the first 1 s
  shows. The first hook is the preferred one.
- `visualNotes` — the labelled props that show the mechanism (UPPERCASE labels), 3+ locations and 2 physical
  gags.
- `limitations` — what could make it fail: thin evidence, a contested number, sensitivity.
- `category` — exactly one of `channel.categories`.
- `tags`, `effort` (`low` | `medium` | `high`).

## 5. Score in a separate pass

Do not grade your own drafts in the same breath. Write the drafts (everything above, no `rubric`) to
`<scratchpad>/drafts.json`, then spawn one fresh general-purpose subagent with this prompt (fill in the paths):

> You are a strict editor for a YouTube Shorts channel that makes 50–60 s vertical animated explainers. Judge N
> idea drafts against a rubric. You did not write them; be critical, do not be generous.
> Read: the drafts `<scratchpad>/drafts.json` (Turkish fields plus English `titleEn` and hooks; `sources` are pages
> that were actually opened, `note` says what they back); the catalog `<scratchpad>/catalog.json` (`rubric`,
> `channel`, `videos` already made, workspace `ideas` incl. trashed/archived ones, which count as already
> considered); the format rules `<repo>/animator/guide/rules.md` (Story and Script); and, for any made video that
> looks close to a draft, `<repo>/videos/<slug>/plan.json` to compare the core.
> House rules: no topic centred on one company, brand or branded product/model (an industry or public institution
> is fine; a story that rests on one specific aircraft/train/car model counts as model-centred). Zodiac is
> off-limits.
> For each draft give one entry per rubric key (all of them): verdict "pass" | "fail" | "unknown".
> - `sourceable`: pass only if a listed source plausibly backs the key number/claim and is reasonably
>   authoritative; a blog or forum quoting a study is "unknown"; a contested core claim is "fail".
> - `novelty`: fail if a made video or workspace idea has the same core mechanism or premise (meaning, not words),
>   or if it is an over-told internet fact with nothing new.
> - Gates (brand_free, format_fit, twist_event, prop_mechanism): a twist that is really narrated information fails
>   twist_event; a contested or two-sided mechanism fails prop_mechanism or format_fit; a story whose beats
>   contradict the mechanism should be called out in small_story.
> Output ONLY a JSON array, same order as the drafts, each element: {"titleEn": "<as in draft>", "rubric":
> [{"key", "verdict", "evidence": "<short quote from the draft or source note, max 160 chars>", "reason": "<one
> short Turkish sentence>"}], "dupes": [{"kind": "video"|"idea", "ref": "<slug or idea id>", "title", "score":
> <0-1>, "why": "Anlamsal: <Turkish, short>"}], "rubricSummary": "<two Turkish sentences: strongest point, biggest
> risk>"}. Only list dupes with score ≥ 0.4. Write it to `<scratchpad>/scores.json` and also return it.

Do not give numeric scores; the app computes the score from the verdicts. A failed gate makes a candidate
ineligible whatever the rest says, and each gate left `unknown` costs points. Keep gate failures in the batch:
the user sees why, and the rejection is remembered.

## 6. Load into the app

The drafts file is an array of candidates in this shape (the scorer adds `rubric`, `dupes`, `rubricSummary`):

```json
[{
  "title": "...", "titleEn": "...", "question": "...", "mechanism": "...", "summary": "...",
  "category": "Gündelik sistemler", "tags": ["..."], "effort": "medium",
  "hooks": [{ "text": "It's the button everyone presses ...", "language": "en", "firstImage": "...", "note": "" }],
  "visualNotes": "...", "limitations": "...",
  "sources": [{ "url": "https://...", "title": "...", "publisher": "...", "type": "official", "note": "key number" }]
}]
```

Source `type`: `paper` | `official` | `firsthand` | `news` | `other`.

```bash
npx tsx scripts/candidates.ts add <scratchpad>/drafts.json --scores <scratchpad>/scores.json
```

It merges the verdicts by `titleEn`, then prints each candidate's score, `GATE` when a gate failed, `DUP` when a
duplicate was found, and any validation errors (a draft the scorer skipped fails for a missing `rubric`). Fix the
errors and add only the failed items again; re-adding a good item creates a copy.

## 7. Report

One short message: how many were added, the top three with score and one line each, how many failed a gate or
were flagged as duplicates, the channel scope and seed used, and the link http://localhost:5173/factory. Ask the
user to triage there; do not keep or reject candidates yourself.
