import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../server/store.ts";
import { addCandidates, catalog, triage, mergeScores } from "../server/factory.ts";
import { createApp } from "../server/index.ts";
import { findDupes, videoCorpus, tokens } from "../server/dedupe.ts";
import { scoreRubric, criteria } from "../shared/rubric.ts";
import { newIdea } from "../shared/model.ts";

function fixture(t: any) {
  const root = mkdtempSync(join(tmpdir(), "ideation-factory-"));
  const videos = join(root, "videos");
  mkdirSync(join(videos, "pink-margarine"), { recursive: true });
  writeFileSync(
    join(videos, "pink-margarine", "plan.json"),
    JSON.stringify({
      title: "The Law That Made Margarine Pink",
      mechanism: "New Hampshire allowed margarine only if dyed pink.",
    }),
  );
  process.env.IDEATION_VIDEOS_DIR = videos;
  const store = new Store(join(root, "data"));
  t.after(() => {
    try {
      store.close();
    } catch {}
    delete process.env.IDEATION_VIDEOS_DIR;
    rmSync(root, { recursive: true, force: true });
  });
  return store;
}
const allPass = criteria.map((c) => ({
  key: c.key,
  verdict: "pass" as const,
  evidence: "",
  reason: "ok",
}));
function candidate(over: Record<string, unknown> = {}) {
  return {
    title: "Yaya düğmeleri neden çoğu zaman bir işe yaramaz",
    titleEn: "Why crosswalk buttons often do nothing",
    summary: "A man hammers the button; the light was on a timer all along.",
    question: "Does the button change the light?",
    mechanism: "Fixed-time signals ignore the button at busy hours.",
    category: "Gündelik sistemler",
    hooks: [{ text: "He has pressed this button 41 times.", language: "en" }],
    rubric: allPass,
    ...over,
  };
}

test("rows saved before the factory fields existed read back with defaults", (t) => {
  const store = fixture(t);
  const idea = store.saveIdea(newIdea("Eski fikir"));
  const raw = JSON.parse(
    (store.db.prepare("SELECT data FROM ideas WHERE id=?").get(idea.id) as any)
      .data,
  );
  for (const k of ["origin", "triage", "rubric", "dupes", "titleEn"]) delete raw[k];
  store.db
    .prepare("UPDATE ideas SET data=? WHERE id=?")
    .run(JSON.stringify(raw), idea.id);
  const back = store.getIdea(idea.id);
  assert.equal(back.origin, "manual");
  assert.equal(back.triage, "none");
  assert.deepEqual(back.dupes, []);
  assert.equal(back.rubricScore, null);
});

test("rubric score is weighted and a failed gate makes it ineligible", () => {
  assert.equal(scoreRubric(allPass).score, 100);
  assert.equal(scoreRubric([]).score, 50 - 4 * 8);
  assert.equal(scoreRubric([]).unsureGates.length, 4);
  const branded = allPass.map((e) =>
    e.key === "brand_free" ? { ...e, verdict: "fail" as const } : e,
  );
  const r = scoreRubric(branded);
  assert.equal(r.score, 100);
  assert.equal(r.eligible, false);
  assert.deepEqual(r.failedGates, ["brand_free"]);
});

test("dedupe matches an English and Turkish retelling of a made video", (t) => {
  fixture(t);
  assert.ok(tokens("margarin").has("marga") && tokens("Margarine").has("marga"));
  const corpus = videoCorpus(process.env.IDEATION_VIDEOS_DIR!);
  const hit = findDupes(
    {
      title: "Margarinin pembe boyandığı yasa",
      titleEn: "When margarine had to be dyed pink",
    },
    corpus,
  );
  assert.equal(hit[0]?.ref, "pink-margarine");
  assert.deepEqual(
    findDupes({ title: "Kahve halkası", titleEn: "Why coffee leaves a ring" }, corpus),
    [],
  );
});

test("candidates insert as pending, are hidden in the catalog by state and triage round-trips", (t) => {
  const store = fixture(t);
  const r = addCandidates(store, [
    candidate(),
    candidate({
      title: "Margarin neden pembeydi",
      titleEn: "Why margarine was pink",
    }),
    candidate({
      title: "Bir şirketin logosu",
      titleEn: "A company logo",
      rubric: allPass.map((e) =>
        e.key === "brand_free" ? { ...e, verdict: "fail" } : e,
      ),
    }),
    { title: "missing fields" },
  ]);
  assert.equal(r.added.length, 3);
  assert.equal(r.errors.length, 1);
  const [plain, dupe, branded] = r.added.map((a) => store.getIdea(a.id));
  assert.equal(plain.triage, "pending");
  assert.equal(plain.origin, "generated");
  assert.equal(plain.durationMin, 50);
  assert.equal(plain.hooks[0].selected, true);
  assert.equal(dupe.dupes[0]?.ref, "pink-margarine");
  assert.equal(branded.scope, "excluded");
  assert.match(branded.triageReason, /Markasız/);

  const rejected = triage(store, plain.id, {
    decision: "rejected",
    reason: "too thin",
    version: plain.version,
  });
  assert.equal(rejected.archived, true);
  assert.equal(rejected.triageReason, "too thin");
  const c = catalog(store);
  assert.ok(c.ideas.some((i) => i.id === plain.id && i.state === "Arşivde"));
  assert.ok(c.videos.some((v) => v.slug === "pink-margarine"));

  // A rejected topic still blocks a later retelling.
  const again = addCandidates(store, [
    candidate({ title: "Yaya butonu yalan", titleEn: "Crosswalk buttons do nothing" }),
  ]);
  assert.equal(store.getIdea(again.added[0].id).dupes[0]?.ref, plain.id);

  const kept = triage(store, rejected.id, {
    decision: "kept",
    version: rejected.version,
  });
  assert.equal(kept.archived, false);
  assert.equal(kept.triage, "kept");
});

test("scores merge by English title and the HTTP routes add and triage candidates", async (t) => {
  const store = fixture(t);
  const app = await createApp(store, false);
  t.after(async () => app.close());
  const { rubric, ...draft } = candidate();
  const merged = mergeScores([draft], [{ titleEn: " Why crosswalk buttons often do nothing", rubric, rubricSummary: "ok" }]);
  assert.equal(merged[0].rubric.length, criteria.length);
  const headers = { "x-ideation-request": "1" };
  const denied = await app.inject({ method: "POST", url: "/api/factory/candidates", payload: merged });
  assert.equal(denied.statusCode, 403);
  const added = await app.inject({ method: "POST", url: "/api/factory/candidates", headers, payload: merged });
  assert.equal(added.statusCode, 200);
  const id = added.json().added[0].id;
  const idea = store.getIdea(id);
  const kept = await app.inject({
    method: "POST",
    url: `/api/ideas/${id}/triage`,
    headers,
    payload: { decision: "kept", version: idea.version },
  });
  assert.equal(kept.statusCode, 200);
  assert.equal(kept.json().triage, "kept");
  const stale = await app.inject({
    method: "POST",
    url: `/api/ideas/${id}/triage`,
    headers,
    payload: { decision: "rejected", version: idea.version },
  });
  assert.equal(stale.statusCode, 409);
});
