// Lexical duplicate check for idea candidates against the videos already made (videos/*/plan.json) and every
// idea in the workspace, trashed and rejected ones included so a rejected topic is not proposed again.
// Tokens are cut to a 5-letter root, which lines up English and Turkish forms of the same word often enough
// ("margarine" / "margarin", "balloons" / "balonlar" do not, so the /ideate skill also does a semantic check).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { normalize, type Dupe, type Idea } from "../shared/model.ts";
import { triageLabels } from "../shared/model.ts";

const stop = new Set(
  (
    "the a an and or of to in on for with by at from is are was were be been it its this that these those why how what " +
    "when who your you their they he she his her them our we us into out up down over under than then so as not no " +
    "do does did can could will would just only more most much many very all any one two day secretly really " +
    "ve ile bir bu su o da de mi mu ne neden nasil icin gibi daha en cok her hic olan olarak sonra once kadar " +
    "aslinda gercekten nicin hangi ki ya veya ama fakat"
  ).split(" "),
);

export function tokens(text: string) {
  const out = new Set<string>();
  for (const w of normalize(text).split(/[^\p{L}\p{N}]+/u)) {
    if (w.length < 3 || stop.has(w)) continue;
    out.add(w.slice(0, 5));
  }
  return out;
}

function overlap(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n / Math.min(a.size, b.size);
}
function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n / (a.size + b.size - n);
}

export type CorpusItem = {
  kind: "video" | "idea";
  ref: string;
  title: string;
  state: string;
  head: Set<string>;
  body: Set<string>;
};

export function videoCorpus(videosDir: string): CorpusItem[] {
  if (!existsSync(videosDir)) return [];
  const items: CorpusItem[] = [];
  for (const slug of readdirSync(videosDir)) {
    const f = join(videosDir, slug, "plan.json");
    if (!existsSync(f)) continue;
    let plan: any = {};
    try {
      plan = JSON.parse(readFileSync(f, "utf8"));
    } catch {
      continue;
    }
    const title = String(plan.title || slug);
    items.push({
      kind: "video",
      ref: slug,
      title,
      state: "Yapıldı",
      head: tokens(title + " " + slug.replace(/-/g, " ")),
      body: tokens(title + " " + (plan.mechanism || "")),
    });
  }
  return items;
}

export function ideaCorpus(ideas: Idea[]): CorpusItem[] {
  return ideas.map((i) => ({
    kind: "idea",
    ref: i.id,
    title: i.titleEn ? `${i.title} / ${i.titleEn}` : i.title,
    state: i.deleted
      ? "Çöpte"
      : i.archived
        ? "Arşivde"
        : triageLabels[i.triage] || i.stage,
    head: tokens(i.title + " " + (i.titleEn || "")),
    body: tokens(
      [i.title, i.titleEn, i.question, i.mechanism, i.summary].join(" "),
    ),
  }));
}

export type CandidateText = {
  title: string;
  titleEn?: string;
  question?: string;
  mechanism?: string;
  summary?: string;
};

/** Best matches at or above `min`, strongest first. Title overlap counts most; the body catches renamed topics. */
export function findDupes(
  c: CandidateText,
  corpus: CorpusItem[],
  { min = 0.4, limit = 3, skipRef = "" } = {},
): Dupe[] {
  const head = tokens(c.title + " " + (c.titleEn || ""));
  const body = tokens(
    [c.title, c.titleEn, c.question, c.mechanism, c.summary].join(" "),
  );
  return corpus
    .filter((x) => x.ref !== skipRef)
    .map((x) => {
      const h = overlap(head, x.head);
      const b = jaccard(body, x.body);
      const score = Math.min(1, 0.6 * h + 0.8 * b);
      const shared = [...head].filter((t) => x.head.has(t));
      return {
        kind: x.kind,
        ref: x.ref,
        title: x.title,
        score: Math.round(score * 100) / 100,
        why:
          `${x.kind === "video" ? "Yapılmış video" : "Fikir"} (${x.state})` +
          (shared.length ? ` · ortak: ${shared.join(", ")}` : ""),
      };
    })
    .filter((d) => d.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
