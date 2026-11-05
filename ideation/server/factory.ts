// The idea factory's deterministic half: the catalog the /ideate skill reads before it generates, and the
// insert step that validates candidates, scores their rubric, links sources and runs the duplicate check.
// The skill (.claude/skills/ideate) does the generating and judging; nothing here calls a model.
import { join } from "node:path";
import { z } from "zod";
import { Store, repoRoot, uid, AppError } from "./store.ts";
import { videoCorpus, ideaCorpus, findDupes } from "./dedupe.ts";
import {
  rubricEntrySchema,
  dupeSchema,
  sourceTypes,
  type Dupe,
} from "../shared/model.ts";
import { scoreRubric, legacyScores, criteria } from "../shared/rubric.ts";

function localStamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const videosDir = () =>
  process.env.IDEATION_VIDEOS_DIR || join(repoRoot, "videos");

export function catalog(store: Store) {
  const videos = videoCorpus(videosDir());
  const ideas = store.getIdeas();
  const settings = store.settings();
  return {
    channel: {
      promise: settings.channelPromise,
      categories: settings.categories,
    },
    rubric: criteria.map(({ key, label, question, weight, gate }) => ({
      key,
      label,
      question,
      weight,
      gate: !!gate,
    })),
    videos: videos.map((v) => ({ slug: v.ref, title: v.title })),
    ideas: ideaCorpus(ideas).map((i) => ({
      id: i.ref,
      title: i.title,
      state: i.state,
    })),
  };
}

const candidateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  titleEn: z.string().trim().min(1).max(300),
  summary: z.string().max(5000).default(""),
  question: z.string().max(5000).default(""),
  mechanism: z.string().max(5000).default(""),
  category: z.string().trim().min(1).max(100),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  hooks: z
    .array(
      z.object({
        text: z.string().min(1).max(5000),
        language: z.enum(["tr", "en"]).default("en"),
        firstImage: z.string().max(5000).default(""),
        note: z.string().max(5000).default(""),
      }),
    )
    .max(10)
    .default([]),
  visualNotes: z.string().max(10000).default(""),
  limitations: z.string().max(10000).default(""),
  effort: z.enum(["low", "medium", "high", "unknown"]).default("unknown"),
  rubric: z.array(rubricEntrySchema).min(1).max(40),
  rubricSummary: z.string().max(5000).default(""),
  dupes: z.array(dupeSchema).max(10).default([]),
  sources: z
    .array(
      z.object({
        url: z.string().url(),
        title: z.string().trim().min(1).max(1000),
        publisher: z.string().max(500).default(""),
        type: z.enum(sourceTypes).default("other"),
        note: z.string().max(5000).default(""),
      }),
    )
    .max(20)
    .default([]),
});
export type Candidate = z.input<typeof candidateSchema>;

/** Puts the separate scorer's verdicts onto the drafts, matched by titleEn. Unmatched drafts fail validation later. */
export function mergeScores(drafts: any[], scores: any[]) {
  const by = new Map(scores.map((x) => [String(x.titleEn).trim(), x]));
  return drafts.map((d) => {
    const sc = by.get(String(d.titleEn).trim());
    return sc
      ? {
          ...d,
          rubric: sc.rubric,
          dupes: sc.dupes ?? [],
          rubricSummary: sc.rubricSummary ?? "",
        }
      : d;
  });
}

function mergeDupes(a: Dupe[], b: Dupe[]) {
  const by = new Map<string, Dupe>();
  for (const d of [...a, ...b]) {
    const k = d.kind + ":" + d.ref;
    const old = by.get(k);
    if (!old || d.score > old.score)
      by.set(k, old ? { ...d, why: [old.why, d.why].filter(Boolean).join(" · ") } : d);
  }
  return [...by.values()].sort((x, y) => y.score - x.score).slice(0, 5);
}

/** Inserts a batch of candidates as pending ideas. Invalid items are reported, not fatal for the rest. */
export function addCandidates(
  store: Store,
  input: unknown,
  batch = localStamp(),
) {
  const list = z.array(z.unknown()).min(1).max(100).parse(input);
  const corpus = [...videoCorpus(videosDir()), ...ideaCorpus(store.getIdeas())];
  const added: { id: string; title: string; score: number; eligible: boolean; dupes: number }[] = [];
  const errors: { index: number; title: string; error: string }[] = [];
  const known = new Set(criteria.map((c) => c.key));
  list.forEach((raw, index) => {
    try {
      const c = candidateSchema.parse(raw);
      const rubric = c.rubric.filter((r) => known.has(r.key));
      const { score, failedGates, eligible } = scoreRubric(rubric);
      const dupes = mergeDupes(findDupes(c, corpus, { min: 0.3 }), c.dupes);
      const sourceIds = c.sources.map(
        (s) =>
          store.saveSource({
            ...s,
            accessedAt: new Date().toISOString().slice(0, 10),
          }).id,
      );
      const gateLabels = failedGates
        .map((k) => criteria.find((x) => x.key === k)!.label)
        .join(", ");
      const idea = store.saveIdea({
        title: c.title,
        titleEn: c.titleEn,
        summary: c.summary,
        question: c.question,
        mechanism: c.mechanism,
        category: c.category,
        tags: c.tags,
        durationMin: 50,
        durationMax: 60,
        stage: "inbox",
        scope: failedGates.includes("brand_free") ? "excluded" : "eligible",
        scopeReason: failedGates.includes("brand_free")
          ? "Marka merkezli (fabrika değerlendirmesi)."
          : "",
        hooks: c.hooks.map((h, n) => ({ ...h, id: uid(), selected: n === 0 })),
        visualNotes: c.visualNotes,
        limitations: c.limitations,
        effort: c.effort,
        sourceIds: [...new Set(sourceIds)],
        origin: "generated",
        triage: "pending",
        triageReason: eligible ? "" : "Geçemediği kapı: " + gateLabels,
        batch,
        rubric,
        rubricScore: score,
        rubricSummary: c.rubricSummary,
        scores: legacyScores(rubric),
        dupes,
      });
      corpus.push(...ideaCorpus([idea]));
      added.push({
        id: idea.id,
        title: idea.title,
        score,
        eligible,
        dupes: dupes.length,
      });
    } catch (e: any) {
      errors.push({
        index,
        title: String((raw as any)?.title ?? ""),
        error:
          e instanceof z.ZodError
            ? e.issues.map((i) => i.path.join(".") + ": " + i.message).join("; ")
            : e.message,
      });
    }
  });
  if (added.length) store.activity(`Fabrika: ${added.length} aday eklendi (${batch})`);
  return { batch, added, errors };
}

/** Keep moves a candidate into the normal pool; reject archives it but keeps it for future duplicate checks. */
export function triage(
  store: Store,
  id: string,
  body: unknown,
) {
  const { decision, reason, version } = z
    .object({
      decision: z.enum(["kept", "rejected", "pending"]),
      reason: z.string().max(3000).default(""),
      version: z.number().int(),
    })
    .parse(body);
  const idea = store.getIdea(id);
  if (idea.origin !== "generated" && decision !== "kept")
    throw new AppError(400, "Yalnızca fabrika adayları elenebilir.");
  return store.saveIdea(
    {
      ...idea,
      triage: decision,
      triageReason: reason || idea.triageReason,
      archived: decision === "rejected",
    },
    id,
    version,
  );
}
