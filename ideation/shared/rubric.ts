// Quality rubric for generated ideas. It mirrors animator/guide/rules.md: the gates are the things make-video
// cannot work around, the rest decide the order in the triage queue. The model judging a candidate only gives a
// verdict and evidence per criterion; the score is computed here so it is the same everywhere.

export const verdicts = ["pass", "fail", "unknown"] as const;
export type Verdict = (typeof verdicts)[number];

export type Criterion = {
  key: string;
  label: string;
  question: string;
  weight: number;
  gate?: boolean;
};

export const criteria: Criterion[] = [
  {
    key: "brand_free",
    label: "Markasız",
    question:
      "The story is not built around a commercial brand: one company, trademark or branded product/model. Names of temples, mosques, churches, buildings, places, cities, institutions, cultures and people are not brands; an industry is fine.",
    weight: 0,
    gate: true,
  },
  {
    key: "format_fit",
    label: "50–60 sn'ye sığar",
    question:
      "It fills a 50–60 s Short (180–210 spoken words) with one mechanism: not too thin for 50 s, not needing a list of reasons.",
    weight: 0,
    gate: true,
  },
  {
    key: "twist_event",
    label: "Bükülme bir olay",
    question:
      "The twist can arrive as an on-screen event (someone walks in, a door opens, a thing breaks), not as a narrator fact.",
    weight: 0,
    gate: true,
  },
  {
    key: "prop_mechanism",
    label: "Mekanizma nesneyle gösterilir",
    question:
      "The mechanism can be shown only with labelled physical props (dials, buttons, counters, stamps, padlocks), no charts or arrows.",
    weight: 0,
    gate: true,
  },
  {
    key: "hook",
    label: "Hook",
    question:
      "The first hook is a triple hook, all three live within 0.5 s and each doing a different job: a strange, concrete first image already in motion (what is happening?), an opening line that makes the viewer care (why should I care?), and a 2–6 word on-screen headline that labels the video without repeating the line (what is this about?).",
    weight: 3,
  },
  {
    key: "small_story",
    label: "Küçük hikâye",
    question:
      "One character in one concrete situation who thinks they are winning, then learns the win is a trap.",
    weight: 2,
  },
  {
    key: "seed",
    label: "Tohum",
    question:
      "The person or object the twist depends on can be on screen in the first 20 s without giving it away.",
    weight: 1,
  },
  {
    key: "gags",
    label: "Fiziksel gag",
    question:
      "At least two physical gags (fall, smack, spill, pop, dive) come naturally out of the story.",
    weight: 1,
  },
  {
    key: "sourceable",
    label: "Kaynaklanabilir",
    question:
      "Its key numbers and claims are backed by a primary or official source that was actually opened (otherwise unknown).",
    weight: 2,
  },
  {
    key: "novelty",
    label: "Yeni",
    question:
      "It is not a retelling of a video the channel already made or an idea already in the workspace, and not an over-told internet fact.",
    weight: 2,
  },
  {
    key: "channel_fit",
    label: "Kanala uygun",
    question:
      "It fits the channel promise and categories in the ideation settings.",
    weight: 2,
  },
  {
    key: "production",
    label: "Üretilebilir",
    question:
      "The sets, characters and props are buildable with the animator kit in reasonable time (no crowds of hundreds, no detailed real faces).",
    weight: 1,
  },
];

export const gateKeys = criteria.filter((c) => c.gate).map((c) => c.key);

export type RubricEntry = {
  key: string;
  verdict: Verdict;
  evidence: string;
  reason: string;
};

export const UNSURE_GATE_PENALTY = 8;
const credit: Record<Verdict, number> = { pass: 1, unknown: 0.5, fail: 0 };

/** 0–100 from the weighted verdicts; a failed gate makes the candidate ineligible whatever the total. */
export function scoreRubric(entries: RubricEntry[]) {
  const by = new Map(entries.map((e) => [e.key, e]));
  const failedGates = gateKeys.filter((k) => by.get(k)?.verdict === "fail");
  const missing = criteria
    .filter((c) => !by.has(c.key))
    .map((c) => c.key);
  let got = 0,
    total = 0;
  for (const c of criteria) {
    if (!c.weight) continue;
    total += c.weight;
    got += c.weight * credit[by.get(c.key)?.verdict ?? "unknown"];
  }
  // A gate nobody could confirm is a risk make-video will hit later: each one costs points.
  const unsureGates = gateKeys.filter(
    (k) => (by.get(k)?.verdict ?? "unknown") === "unknown",
  );
  const score = Math.max(
    0,
    Math.round((got / total) * 100) - UNSURE_GATE_PENALTY * unsureGates.length,
  );
  return {
    score,
    failedGates,
    unsureGates,
    missing,
    eligible: failedGates.length === 0,
  };
}

/** Maps the rubric onto the older 1–5 hook / story / visual scores the cards and filters already show. */
export function legacyScores(entries: RubricEntry[]) {
  const by = new Map(entries.map((e) => [e.key, e.verdict]));
  const five = (keys: string[]) => {
    const vals = keys.map((k) => credit[by.get(k) ?? "unknown"]);
    return Math.max(1, Math.round(1 + 4 * (vals.reduce((a, b) => a + b, 0) / vals.length)));
  };
  return {
    hook: five(["hook", "seed"]),
    story: five(["small_story", "twist_event", "gags"]),
    visual: five(["prop_mechanism", "production"]),
  };
}
