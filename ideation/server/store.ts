import Database from "better-sqlite3";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  renameSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  categories,
  normalize,
  ideaDataSchema,
  documentSchema,
  sourceSchema,
  settingsSchema,
  type IdeaData,
  type Idea,
  type Doc,
  type Source,
  type Settings,
  type State,
} from "../shared/model.ts";

export const projectRoot = resolve(
  fileURLToPath(new URL("../", import.meta.url)),
);
export const repoRoot = resolve(projectRoot, "..");
export const dataRoot = resolve(
  process.env.IDEATION_DATA_DIR || join(projectRoot, ".data"),
);
export const now = () => new Date().toISOString();
export const uid = () => randomUUID();
export const hash = (b: Buffer | string) =>
  createHash("sha256").update(b).digest("hex");
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export class Store {
  db: Database.Database;
  root: string;
  constructor(root = dataRoot) {
    this.root = root;
    mkdirSync(join(root, "uploads"), { recursive: true });
    this.db = this.open();
    this.migrate();
  }
  open() {
    const db = new Database(join(this.root, "ideation.sqlite"));
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    return db;
  }
  migrate() {
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY)",
    );
    const version =
      (
        this.db
          .prepare("SELECT MAX(version) AS version FROM migrations")
          .get() as any
      ).version || 0;
    if (version > 1)
      throw new Error(
        "Bu veritabanı daha yeni bir uygulama sürümü gerektiriyor.",
      );
    if (version === 0)
      this.db.transaction(() =>
        this.db.exec(
          readFileSync(
            join(projectRoot, "server/db/migrations/001-initial.sql"),
            "utf8",
          ),
        ),
      )();
    this.db
      .prepare("INSERT OR IGNORE INTO settings VALUES(1,?)")
      .run(
        JSON.stringify({
          wordsPerMinute: 180,
          categories,
          channelPromise: "Gündelik hayat neden böyle işliyor?",
          defaultLanguage: "tr",
        }),
      );
  }
  activity(label: string, ideaId: string | null = null) {
    this.db
      .prepare("INSERT INTO activity(idea_id,label,created_at) VALUES(?,?,?)")
      .run(ideaId, label, now());
  }
  getIdeas(): Idea[] {
    return (
      this.db
        .prepare("SELECT * FROM ideas ORDER BY updated_at DESC,id")
        .all() as any[]
    ).map((r) => ({
      ...JSON.parse(r.data),
      id: r.id,
      version: r.version,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }
  getIdea(id: string) {
    const r = this.db.prepare("SELECT * FROM ideas WHERE id=?").get(id) as any;
    if (!r) throw new AppError(404, "Fikir bulunamadı.");
    return {
      ...JSON.parse(r.data),
      id: r.id,
      version: r.version,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    } as Idea;
  }
  validateReferences(d: IdeaData) {
    for (const id of d.sourceIds) {
      if (!this.db.prepare("SELECT id FROM sources WHERE id=?").get(id))
        throw new AppError(400, "Kaynak bulunamadı.");
    }
    for (const c of d.claims)
      for (const e of c.evidence)
        if (!d.sourceIds.includes(e.sourceId))
          throw new AppError(400, "Kanıt kaynağı önce fikre bağlanmalı.");
  }
  saveIdea(input: unknown, id: string = uid(), expected?: number) {
    const d = ideaDataSchema.parse(input);
    this.validateReferences(d);
    const old = this.db
      .prepare("SELECT version FROM ideas WHERE id=?")
      .get(id) as any;
    if (old && expected !== old.version)
      throw new AppError(
        409,
        "Bu fikir başka bir yerde değiştirildi. Güncel kaydı açıp değişikliklerinizi yeniden uygulayın.",
      );
    const t = now();
    this.db.transaction(() => {
      if (old)
        this.db
          .prepare(
            "UPDATE ideas SET data=?,version=version+1,updated_at=? WHERE id=?",
          )
          .run(JSON.stringify(d), t, id);
      else
        this.db
          .prepare("INSERT INTO ideas VALUES(?,?,1,?,?)")
          .run(id, JSON.stringify(d), t, t);
      this.activity(old ? "Fikir güncellendi" : "Yeni fikir eklendi", id);
      this.reindex();
    })();
    return this.getIdea(id);
  }
  documents(): Doc[] {
    return (
      this.db
        .prepare("SELECT * FROM documents ORDER BY updated_at DESC")
        .all() as any[]
    ).map((r) => ({
      ...JSON.parse(r.data),
      id: r.id,
      version: r.version,
      updatedAt: r.updated_at,
    }));
  }
  saveDocument(input: unknown, id: string = uid(), expected?: number) {
    const d = documentSchema.parse(input);
    for (const ideaId of d.ideaIds) this.getIdea(ideaId);
    const old = this.db
      .prepare("SELECT * FROM documents WHERE id=?")
      .get(id) as any;
    if (old && expected !== old.version)
      throw new AppError(
        409,
        "Doküman başka bir sekmede değiştirildi. Taslağınız korundu; güncel sürümü açın veya taslağı yeni doküman olarak kaydedin.",
      );
    const t = now();
    this.db.transaction(() => {
      if (old) {
        this.db
          .prepare("INSERT INTO revisions VALUES(?,?,?,?,?)")
          .run(uid(), id, old.version, old.data, t);
        this.db
          .prepare(
            "UPDATE documents SET data=?,version=version+1,updated_at=? WHERE id=?",
          )
          .run(JSON.stringify(d), t, id);
      } else
        this.db
          .prepare("INSERT INTO documents VALUES(?,?,1,?)")
          .run(id, JSON.stringify(d), t);
      this.activity(
        old ? "Doküman kaydedildi" : "Doküman oluşturuldu",
        d.ideaIds[0] || null,
      );
      this.reindex();
    })();
    return this.documents().find((x) => x.id === id)!;
  }
  revisions(id: string) {
    return (
      this.db
        .prepare(
          "SELECT * FROM revisions WHERE document_id=? ORDER BY version DESC",
        )
        .all(id) as any[]
    ).map((r) => ({
      id: r.id,
      version: r.version,
      ...JSON.parse(r.data),
      createdAt: r.created_at,
    }));
  }
  sources(): Source[] {
    return (this.db.prepare("SELECT * FROM sources").all() as any[]).map(
      (r) => ({ ...JSON.parse(r.data), id: r.id }),
    );
  }
  saveSource(input: unknown, id?: string) {
    const d = sourceSchema.parse(input);
    const u = new URL(d.url);
    u.hash = "";
    u.searchParams.sort();
    const normalized = u.href;
    const duplicate = this.db
      .prepare("SELECT id FROM sources WHERE url=?")
      .get(normalized) as any;
    if (duplicate && id && duplicate.id !== id)
      throw new AppError(409, "Bu bağlantı kaynak kütüphanesinde zaten var.");
    if (duplicate && !id)
      return this.sources().find((s) => s.id === duplicate.id)!;
    const target = id || uid();
    this.db.transaction(() => {
      this.db
        .prepare(
          "INSERT INTO sources VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET url=excluded.url,data=excluded.data",
        )
        .run(target, normalized, JSON.stringify(d));
      this.reindex();
    })();
    return { ...d, id: target };
  }
  settings(): Settings {
    return JSON.parse(
      (this.db.prepare("SELECT data FROM settings WHERE id=1").get() as any)
        .data,
    );
  }
  saveSettings(input: unknown) {
    const d = settingsSchema.parse(input);
    this.db
      .prepare("UPDATE settings SET data=? WHERE id=1")
      .run(JSON.stringify(d));
    this.activity("Çalışma alanı ayarları güncellendi");
    return d;
  }
  attachments() {
    return (this.db.prepare("SELECT data FROM attachments").all() as any[]).map(
      (r) => JSON.parse(r.data),
    );
  }
  state(q = ""): State {
    const state: State = {
      ideas: this.getIdeas(),
      documents: this.documents(),
      sources: this.sources(),
      attachments: this.attachments(),
      settings: this.settings(),
      activity: this.db
        .prepare(
          "SELECT id,idea_id AS ideaId,label,created_at AS createdAt FROM activity ORDER BY id DESC LIMIT 50",
        )
        .all() as any[],
    };
    if (q.trim()) {
      const tokens = normalize(q).match(/[\p{L}\p{N}]+/gu) || [];
      const expression = tokens.map((t) => `"${t}"*`).join(" AND ");
      const rows = expression
        ? (this.db
            .prepare(
              "SELECT kind,entity_id,idea_ids FROM search WHERE search MATCH ?",
            )
            .all(expression) as any[])
        : [];
      const ideas = new Set<string>();
      const documents = new Set<string>();
      const sources = new Set<string>();
      for (const r of rows) {
        if (r.kind === "idea") ideas.add(r.entity_id);
        if (r.kind === "document") documents.add(r.entity_id);
        if (r.kind === "source") sources.add(r.entity_id);
        for (const i of JSON.parse(r.idea_ids)) ideas.add(i);
      }
      state.searchMatches = {
        ideas: [...ideas],
        documents: [...documents],
        sources: [...sources],
      };
    }
    return state;
  }
  reindex() {
    this.db.prepare("DELETE FROM search").run();
    const put = this.db.prepare(
      "INSERT INTO search(kind,entity_id,idea_ids,content) VALUES(?,?,?,?)",
    );
    const ideas = this.getIdeas();
    for (const i of ideas)
      if (!i.deleted)
        put.run(
          "idea",
          i.id,
          "[]",
          normalize(
            [
              i.title,
              i.summary,
              i.mechanism,
              i.question,
              i.tags.join(" "),
              i.visualNotes,
              ...i.hooks.map((h) => h.text),
              ...i.claims.map((c) => c.text),
            ].join(" "),
          ),
        );
    for (const d of this.documents())
      put.run(
        "document",
        d.id,
        JSON.stringify(d.kind === "original" ? [] : d.ideaIds),
        normalize(d.title + " " + d.content),
      );
    for (const s of this.sources())
      put.run(
        "source",
        s.id,
        JSON.stringify(
          ideas.filter((i) => i.sourceIds.includes(s.id)).map((i) => i.id),
        ),
        normalize(s.title + " " + s.publisher + " " + s.note),
      );
  }
  close() {
    this.db.close();
  }
}
