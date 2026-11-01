import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store, AppError, repoRoot, hash } from "../server/store.ts";
import { importResearch, previewImport } from "../server/importer.ts";
import { createApp } from "../server/index.ts";
import {
  makeBackup,
  restoreBackup,
  exportMarkdown,
} from "../server/transfer.ts";
import { newIdea, estimateDuration, normalize } from "../shared/model.ts";

function fixture(t: any) {
  const root = mkdtempSync(join(tmpdir(), "ideation-test-"));
  const store = new Store(root);
  t.after(() => {
    try {
      store.close();
    } catch {}
    rmSync(root, { recursive: true, force: true });
  });
  return store;
}
test("bulk updates are atomic when one selected record has a stale version", async (t) => {
  const store = fixture(t);
  const app = await createApp(store, false);
  t.after(async () => app.close());
  const first = store.saveIdea(newIdea("İlk"));
  const second = store.saveIdea(newIdea("İkinci"));
  const headers = { "x-ideation-request": "1" };
  const rejected = await app.inject({
    method: "POST",
    url: "/api/ideas/bulk",
    headers,
    payload: {
      kind: "archive",
      items: [
        { id: first.id, version: 1 },
        { id: second.id, version: 0 },
      ],
    },
  });
  assert.equal(rejected.statusCode, 409);
  assert.equal(store.getIdea(first.id).archived, false);
  assert.equal(store.getIdea(first.id).version, 1);
  const saved = await app.inject({
    method: "POST",
    url: "/api/ideas/bulk",
    headers,
    payload: {
      kind: "tags",
      tags: ["Kısa format"],
      items: [
        { id: first.id, version: 1 },
        { id: second.id, version: 1 },
      ],
    },
  });
  assert.equal(saved.statusCode, 200);
  assert.deepEqual(store.getIdea(first.id).tags, ["Kısa format"]);
  assert.deepEqual(store.getIdea(second.id).tags, ["Kısa format"]);
});
test("imports 20 actual research ideas idempotently, preserving scope and source documents", (t) => {
  const store = fixture(t);
  const path = join(
    repoRoot,
    "animator/videos/video-fikirleri-arastirma-ve-degerlendirme.md",
  );
  const before = hash(readFileSync(path));
  assert.equal(importResearch(store).created, 20);
  const state = store.state();
  assert.equal(state.ideas.length, 20);
  assert.equal(state.ideas.filter((i) => i.scope === "eligible").length, 14);
  assert.equal(state.ideas.filter((i) => i.scope === "excluded").length, 5);
  assert.equal(
    state.ideas.filter((i) => i.scope === "rewrite_required").length,
    1,
  );
  assert.equal(state.documents.length, 22);
  assert.ok(state.sources.length >= 30);
  assert.ok(
    state.ideas.every(
      (i) =>
        i.hooks.length > 0 && i.mechanism.length > 40 && i.sourceIds.length > 0,
    ),
  );
  assert.ok(
    state.ideas.every((i) => i.claims.length === 0 && i.stage === "inbox"),
  );
  assert.ok(state.ideas.find((i) => i.id === "idea-011")!.scenes.length > 0);
  assert.deepEqual(importResearch(store), {
    created: 0,
    unchanged: 20,
    conflicts: 0,
  });
  assert.equal(store.state().sources.length, state.sources.length);
  assert.equal(hash(readFileSync(path)), before);
});
test("local edits survive another import and changed source sections are reported without overwrite", (t) => {
  const store = fixture(t);
  importResearch(store);
  const i = store.getIdea("idea-001");
  store.saveIdea({ ...i, title: "Yerel düzenleme" }, i.id, i.version);
  store.db
    .prepare("UPDATE imports SET hash=? WHERE id=?")
    .run("previous-source-hash", i.id);
  const preview = previewImport(store);
  assert.equal(
    preview.items.find((x: any) => x.externalId === i.id).action,
    "conflict",
  );
  assert.equal(importResearch(store).conflicts, 1);
  assert.equal(store.getIdea(i.id).title, "Yerel düzenleme");
});
test("Turkish full-text search finds the precise idea, hooks and research notes", (t) => {
  const store = fixture(t);
  importResearch(store);
  const a = store.state("ISVICRE").searchMatches!;
  assert.ok(a.ideas.includes("idea-011"));
  assert.ok(!a.ideas.includes("idea-012"));
  assert.ok(store.state("kopru").searchMatches!.ideas.includes("idea-014"));
  assert.equal(normalize("IŞIK"), "isik");
  assert.equal(normalize("İsviçre"), "isvicre");
  assert.equal(estimateDuration("Bir iki üç dört beş", 150), 2);
});
test("scope, duration, claims, references and optimistic idea updates are enforced", (t) => {
  const store = fixture(t);
  const i = store.saveIdea(newIdea("Test fikri"));
  assert.throws(() =>
    store.saveIdea({ ...i, durationMin: 60, durationMax: 20 }, i.id, i.version),
  );
  assert.throws(() =>
    store.saveIdea(
      { ...i, scope: "excluded", stage: "ready" },
      i.id,
      i.version,
    ),
  );
  assert.throws(() =>
    store.saveIdea({ ...i, sourceIds: ["missing"] }, i.id, i.version),
  );
  assert.throws(() =>
    store.saveIdea(
      {
        ...i,
        claims: [
          {
            id: "c1",
            text: "Bir iddia",
            status: "supported",
            limit: "",
            evidence: [],
          },
        ],
      },
      i.id,
      i.version,
    ),
  );
  const next = store.saveIdea({ ...i, summary: "Yeni özet" }, i.id, i.version);
  assert.equal(next.version, 2);
  assert.throws(
    () => store.saveIdea({ ...i, title: "Eski sekme" }, i.id, 1),
    (e: any) => e.status === 409,
  );
  assert.equal(store.getIdea(i.id).title, "Test fikri");
});
test("documents preserve revisions and reject stale saves; contents survive reopening SQLite", (t) => {
  let store = fixture(t);
  const i = store.saveIdea(newIdea("Doküman fikri"));
  const d = store.saveDocument({
    title: "Not",
    kind: "research",
    language: "tr",
    content: "İlk içerik",
    ideaIds: [i.id],
  });
  const updated = store.saveDocument(
    { ...d, content: "Güncel içerik" },
    d.id,
    1,
  );
  assert.equal(updated.version, 2);
  assert.equal(store.revisions(d.id)[0].content, "İlk içerik");
  assert.throws(
    () => store.saveDocument({ ...d, content: "Bayat metin" }, d.id, 1),
    (e: any) => e.status === 409,
  );
  const root = store.root;
  store.close();
  store = new Store(root);
  try {
    assert.equal(store.documents()[0].content, "Güncel içerik");
    assert.equal(store.getIdea(i.id).title, "Doküman fikri");
  } finally {
    store.close();
  }
});
test("API validates writes and supports file upload, preview, export and version conflicts", async (t) => {
  const store = fixture(t);
  const app = await createApp(store, false);
  t.after(async () => {
    await app.close();
  });
  const headers = { "x-ideation-request": "1" };
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/ideas",
        payload: { title: "Denied" },
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/ideas",
        headers: { ...headers, origin: "https://foreign.example" },
        payload: { title: "Denied" },
      })
    ).statusCode,
    403,
  );
  const res = await app.inject({
    method: "POST",
    url: "/api/ideas",
    headers,
    payload: newIdea("API fikri"),
  });
  assert.equal(res.statusCode, 200);
  const idea = res.json();
  assert.equal(
    (
      await app.inject({
        method: "PUT",
        url: "/api/ideas/" + idea.id,
        headers,
        payload: { ...idea, version: 0 },
      })
    ).statusCode,
    409,
  );
  const boundary = "ideationboundary";
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7l8AAAAASUVORK5CYII=",
    "base64",
  );
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n`,
    ),
    png,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const uploaded = await app.inject({
    method: "POST",
    url: "/api/upload?ideaId=" + idea.id,
    headers: {
      ...headers,
      "content-type": "multipart/form-data; boundary=" + boundary,
    },
    payload,
  });
  assert.equal(uploaded.statusCode, 200);
  const attachment = uploaded.json().attachment;
  const file = await app.inject("/api/files/" + attachment.id);
  assert.equal(file.headers["content-type"], "image/png");
  assert.deepEqual(file.rawPayload, png);
  const exported = await app.inject("/api/export?ids=" + idea.id);
  assert.equal(exported.statusCode, 200);
  assert.match(exported.body, /# API fikri/);
  const backup = await app.inject("/api/backup");
  assert.equal(backup.statusCode, 200);
  assert.ok(backup.rawPayload.length > 0);
});
test("complete backups restore data and attachments; corrupt archives leave current data intact", async (t) => {
  const store = fixture(t);
  importResearch(store);
  const idea = store.getIdea("idea-001");
  const bytes = Buffer.from("immutable attachment");
  const attachment = {
    id: "file-test",
    name: "example.pdf",
    mime: "application/pdf",
    size: bytes.length,
    hash: hash(bytes),
    ideaId: idea.id,
    createdAt: new Date().toISOString(),
  };
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(store.root, "uploads", attachment.hash), bytes);
  store.db
    .prepare("INSERT INTO attachments VALUES(?,?)")
    .run(attachment.id, JSON.stringify(attachment));
  const backup = await makeBackup(store);
  store.saveIdea({ ...idea, title: "After backup" }, idea.id, idea.version);
  await restoreBackup(store, backup);
  assert.equal(store.getIdea(idea.id).title, idea.title);
  assert.deepEqual(
    readFileSync(join(store.root, "uploads", attachment.hash)),
    bytes,
  );
  assert.equal(store.state().ideas.length, 20);
  await assert.rejects(restoreBackup(store, Buffer.from("not a zip")));
  assert.equal(store.getIdea(idea.id).title, idea.title);
  assert.match(exportMarkdown(store, store.getIdea(idea.id)), /Kaynaklar/);
});
