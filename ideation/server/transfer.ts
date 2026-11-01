import Database from "better-sqlite3";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
  renameSync,
} from "node:fs";
import { join } from "node:path";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { Store, hash, uid, now, AppError } from "./store.ts";
import {
  stageLabels,
  scopeLabels,
  reviewLabels,
  ideaDataSchema,
  documentSchema,
  sourceSchema,
  settingsSchema,
  type Idea,
} from "../shared/model.ts";

export function exportMarkdown(store: Store, idea: Idea) {
  const sources = store.sources().filter((s) => idea.sourceIds.includes(s.id));
  const docs = store
    .documents()
    .filter((d) => d.ideaIds.includes(idea.id) && d.kind !== "original");
  return `# ${idea.title}\n\n${idea.summary}\n\n- Süre: ${idea.durationMin}–${idea.durationMax} saniye\n- Aşama: ${stageLabels[idea.stage]}\n- Kapsam: ${scopeLabels[idea.scope]}\n${idea.scopeReason ? "\nKapsam gerekçesi: " + idea.scopeReason + "\n" : ""}\n## Hook alternatifleri\n\n${idea.hooks.map((h) => `- ${h.selected ? "**Seçili:** " : ""}${h.text}\n  İlk görüntü: ${h.firstImage || "Henüz belirlenmedi"}`).join("\n")}\n\n## Mekanizma\n\n${idea.mechanism}\n\n## Anlatım sınırları\n\n${idea.limitations}\n\n## İddialar\n\n${idea.claims.map((c) => `- ${c.text} — ${reviewLabels[c.status]}\n${c.evidence.map((e) => `  - ${e.relation}: ${sources.find((s) => s.id === e.sourceId)?.url || e.sourceId} ${e.note}`).join("\n")}`).join("\n")}\n\n## Sahne akışı\n\n${idea.scenes.map((s, n) => `${n + 1}. **${s.duration} sn:** ${s.visual}\n   Anlatım: ${s.narration}\n   Mekân: ${s.location} · Karakter: ${s.character} · Ses: ${s.sound}`).join("\n\n")}\n\n## Kaynaklar\n\n${sources.map((s) => `- [${s.title}](${s.url}) — ${s.note}`).join("\n")}\n\n${docs.map((d) => `## ${d.title}\n\n${d.content}`).join("\n\n---\n\n")}`;
}

export async function makeBackup(store: Store) {
  const temp = join(store.root, "backup-" + uid() + ".sqlite");
  try {
    await store.db.backup(temp);
    const snapshot = new Database(temp, { readonly: true });
    let attachments: any[];
    try {
      attachments = (
        snapshot.prepare("SELECT data FROM attachments").all() as any[]
      ).map((x) => JSON.parse(x.data));
    } finally {
      snapshot.close();
    }
    const db = readFileSync(temp);
    const files: Record<string, Uint8Array> = { "ideation.sqlite": db };
    let expandedSize = db.length;
    if (db.length > 50 * 1024 * 1024)
      throw new AppError(
        413,
        "Veritabanı bu sürümün 50 MB yedek sınırını aşıyor.",
      );
    const hashes: Record<string, string> = { "ideation.sqlite": hash(db) };
    for (const a of attachments) {
      const path = join(store.root, "uploads", a.hash);
      if (!existsSync(path))
        throw new AppError(500, "Yedek oluşturulamadı: eksik dosya " + a.name);
      const bytes = readFileSync(path);
      if (!files["uploads/" + a.hash]) expandedSize += bytes.length;
      if (bytes.length > 50 * 1024 * 1024 || expandedSize > 149 * 1024 * 1024)
        throw new AppError(
          413,
          "Yedek bu sürümün açılmış boyut sınırını aşıyor.",
        );
      files["uploads/" + a.hash] = bytes;
      hashes["uploads/" + a.hash] = hash(bytes);
    }
    files["manifest.json"] = strToU8(
      JSON.stringify({ schemaVersion: 1, createdAt: now(), hashes }),
    );
    const archive = Buffer.from(zipSync(files));
    if (archive.length > 50 * 1024 * 1024)
      throw new AppError(413, "Sıkıştırılmış yedek 50 MB sınırını aşıyor.");
    return archive;
  } finally {
    rmSync(temp, { force: true });
  }
}

export async function restoreBackup(store: Store, buffer: Buffer) {
  let files: Record<string, Uint8Array>;
  try {
    let expandedSize = 0;
    files = unzipSync(buffer, {
      filter: (f) => {
        expandedSize += f.originalSize;
        if (
          f.originalSize > 50 * 1024 * 1024 ||
          expandedSize > 150 * 1024 * 1024
        )
          throw new Error("Yedek boyutu sınırı aşıldı");
        return true;
      },
    });
  } catch {
    throw new AppError(400, "Geçersiz yedek arşivi.");
  }
  let manifest: any;
  try {
    manifest = JSON.parse(strFromU8(files["manifest.json"]));
  } catch {
    throw new AppError(400, "Yedek manifesti eksik.");
  }
  if (
    manifest.schemaVersion !== 1 ||
    !files["ideation.sqlite"] ||
    !manifest.hashes ||
    typeof manifest.hashes !== "object"
  )
    throw new AppError(400, "Desteklenmeyen yedek biçimi.");
  let size = 0;
  for (const [name, bytes] of Object.entries(files)) {
    size += bytes.length;
    if (size > 150 * 1024 * 1024) throw new AppError(400, "Yedek çok büyük.");
    if (
      name !== "manifest.json" &&
      name !== "ideation.sqlite" &&
      !/^uploads\/[a-f0-9]{64}$/.test(name)
    )
      throw new AppError(400, "Yedekte beklenmeyen dosya yolu.");
    if (
      name !== "manifest.json" &&
      manifest.hashes[name] !== hash(Buffer.from(bytes))
    )
      throw new AppError(400, "Yedek bütünlük kontrolü başarısız.");
  }
  const staging = join(store.root, "restore-" + uid());
  mkdirSync(staging);
  const incoming = join(staging, "ideation.sqlite");
  try {
    writeFileSync(incoming, files["ideation.sqlite"]);
    const verify = new Database(incoming, { readonly: true });
    try {
      if (verify.pragma("integrity_check", { simple: true }) !== "ok")
        throw new Error("Bütünlük hatası");
      const versions = verify
        .prepare("SELECT version FROM migrations")
        .all() as any[];
      if (versions.length !== 1 || versions[0].version !== 1)
        throw new Error("Şema uyumsuz");
      for (const table of [
        "ideas",
        "documents",
        "sources",
        "revisions",
        "settings",
        "imports",
        "attachments",
        "activity",
      ])
        verify.prepare(`SELECT * FROM ${table} LIMIT 1`).get();
      if ((verify.pragma("foreign_key_check") as any[]).length)
        throw new Error("Yedekte kırık kayıt ilişkileri var");
      for (const [table, schema] of [
        ["ideas", ideaDataSchema],
        ["documents", documentSchema],
        ["sources", sourceSchema],
        ["settings", settingsSchema],
      ] as const) {
        for (const row of verify.prepare(`SELECT data FROM ${table}`).all() as {
          data: string;
        }[])
          schema.parse(JSON.parse(row.data));
      }
      const attached = (
        verify.prepare("SELECT data FROM attachments").all() as any[]
      ).map((x) => JSON.parse(x.data));
      for (const a of attached)
        if (!/^[a-f0-9]{64}$/.test(a.hash) || !files["uploads/" + a.hash])
          throw new Error("Ek dosya eksik");
    } finally {
      verify.close();
    }
    const recovery = await makeBackup(store);
    const recoveryDir = join(store.root, "recovery");
    mkdirSync(recoveryDir, { recursive: true });
    writeFileSync(
      join(recoveryDir, "before-restore-" + Date.now() + ".zip"),
      recovery,
    );
    for (const [name, bytes] of Object.entries(files))
      if (name.startsWith("uploads/"))
        writeFileSync(join(store.root, name), bytes);
    store.db.pragma("wal_checkpoint(TRUNCATE)");
    store.db.close();
    const active = join(store.root, "ideation.sqlite"),
      rollback = join(staging, "rollback.sqlite");
    renameSync(active, rollback);
    try {
      renameSync(incoming, active);
      store.db = store.open();
      store.migrate();
      store.reindex();
      store.activity("Çalışma alanı yedekten geri yüklendi");
    } catch (error) {
      try {
        store.db.close();
      } catch {}
      rmSync(active, { force: true });
      rmSync(active + "-wal", { force: true });
      rmSync(active + "-shm", { force: true });
      renameSync(rollback, active);
      store.db = store.open();
      throw error;
    }
    return { ok: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      400,
      "Yedek geri yüklenemedi: " + (error as Error).message,
    );
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
