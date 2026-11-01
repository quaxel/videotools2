import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, extname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { z, ZodError } from "zod";
import { Store, AppError, uid, hash, now, projectRoot } from "./store.ts";
import { newIdea } from "../shared/model.ts";
import { importResearch, previewImport } from "./importer.ts";
import { exportMarkdown, makeBackup, restoreBackup } from "./transfer.ts";

export async function createApp(store = new Store(), seed = true) {
  const app = Fastify({ logger: false, bodyLimit: 2 * 1024 * 1024 });
  let restoring = false;
  if (seed && store.getIdeas().length === 0) importResearch(store);
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  });
  app.addHook("onRequest", async (req, reply) => {
    if (restoring && !["GET", "HEAD", "OPTIONS"].includes(req.method))
      return reply
        .code(503)
        .send({
          error:
            "Yedek geri yükleniyor. Taslağınızı koruyup birazdan yeniden deneyin.",
        });
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers["x-ideation-request"] !== "1"
    )
      return reply.code(403).send({ error: "Geçersiz uygulama isteği." });
    const origin = req.headers.origin;
    if (
      origin &&
      ![
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:4310",
        "http://localhost:4310",
        `http://127.0.0.1:${process.env.PORT || 4310}`,
        `http://localhost:${process.env.PORT || 4310}`,
      ].includes(origin)
    )
      return reply
        .code(403)
        .send({ error: "Bu kaynaktan erişim desteklenmiyor." });
  });
  app.setErrorHandler((err: any, _req, reply) => {
    if (err instanceof ZodError)
      return reply.code(400).send({
        error: err.issues
          .map((i) => i.path.join(".") + ": " + i.message)
          .join("\n"),
      });
    reply.code(err.status || err.statusCode || 500).send({
      error:
        err.status || err.statusCode
          ? err.message
          : "İşlem tamamlanamadı. " +
            (process.env.NODE_ENV === "test"
              ? err.message
              : "Lütfen tekrar deneyin."),
    });
    if (!err.status && !err.statusCode) console.error(err);
  });
  app.get("/api/health", () => ({ ok: true }));
  app.get("/api/state", (req) =>
    store.state(String((req.query as any).q || "")),
  );
  app.post("/api/ideas", (req) => {
    const body = req.body as any;
    return store.saveIdea({ ...newIdea(), ...body });
  });
  app.post("/api/ideas/bulk", (req) => {
    const batch = z
      .object({
        kind: z.enum(["archive", "restore", "priority", "tags"]),
        items: z
          .array(z.object({ id: z.string(), version: z.number().int() }))
          .min(1)
          .max(300),
        tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
      })
      .parse(req.body);
    return store.db.transaction(() => {
      for (const item of batch.items) {
        const idea = store.getIdea(item.id);
        const patch =
          batch.kind === "archive"
            ? { archived: true }
            : batch.kind === "restore"
              ? { archived: false, deleted: false }
              : batch.kind === "priority"
                ? { priority: 1 }
                : { tags: [...new Set([...idea.tags, ...batch.tags])] };
        store.saveIdea({ ...idea, ...patch }, idea.id, item.version);
      }
      return { updated: batch.items.length };
    })();
  });
  app.put("/api/ideas/:id", (req) => {
    const { id } = req.params as any;
    store.getIdea(id);
    const { version, ...data } = req.body as any;
    return store.saveIdea(data, id, z.number().int().parse(version));
  });
  app.post("/api/documents", (req) => store.saveDocument(req.body));
  app.put("/api/documents/:id", (req) => {
    const { id } = req.params as any;
    if (!store.documents().some((d) => d.id === id))
      throw new AppError(404, "Doküman bulunamadı.");
    const { version, ...data } = req.body as any;
    return store.saveDocument(data, id, z.number().int().parse(version));
  });
  app.get("/api/ideas/:id/activity", (req) => {
    const id = (req.params as any).id;
    store.getIdea(id);
    return store.db
      .prepare(
        "SELECT id,idea_id AS ideaId,label,created_at AS createdAt FROM activity WHERE idea_id=? ORDER BY id DESC LIMIT 1000",
      )
      .all(id);
  });
  app.get("/api/documents/:id/revisions", (req) =>
    store.revisions((req.params as any).id),
  );
  app.post("/api/sources", (req) => store.saveSource(req.body));
  app.put("/api/sources/:id", (req) => {
    const id = (req.params as any).id;
    if (!store.sources().some((s) => s.id === id))
      throw new AppError(404, "Kaynak bulunamadı.");
    return store.saveSource(req.body, id);
  });
  app.put("/api/settings", (req) => store.saveSettings(req.body));
  app.get("/api/import/preview", () => {
    const p = previewImport(store);
    return {
      items: p.items.map(({ content, ...i }: any) => i),
      documents: p.docs.map(({ content, ...d }: any) => d),
    };
  });
  app.post("/api/import", async () => {
    if (store.getIdeas().length) {
      const b = await makeBackup(store);
      writeFileSync(join(store.root, "before-import.zip"), b);
    }
    return importResearch(store);
  });
  app.post("/api/upload", async (req) => {
    const file = await req.file();
    if (!file) throw new AppError(400, "Dosya seçilmedi.");
    const bytes = await file.toBuffer();
    if (file.file.truncated)
      throw new AppError(400, "Dosya boyutu sınırı aşıldı.");
    const ideaId = (req.query as any).ideaId || null;
    if (ideaId) store.getIdea(ideaId);
    const ext = extname(file.filename).toLowerCase();
    if ([".md", ".txt"].includes(ext)) {
      return {
        document: store.saveDocument({
          title: file.filename,
          kind: ext === ".md" ? "research" : "note",
          language: "tr",
          content: bytes.toString("utf8"),
          ideaIds: ideaId ? [ideaId] : [],
        }),
      };
    }
    const supported: Record<string, string> = {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
    };
    const mime = supported[ext];
    if (!mime)
      throw new AppError(
        400,
        "Markdown, TXT, PDF, PNG, JPG veya WebP yükleyebilirsiniz.",
      );
    const valid =
      mime === "application/pdf"
        ? bytes.subarray(0, 5).toString() === "%PDF-"
        : mime === "image/png"
          ? bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : mime === "image/jpeg"
            ? bytes[0] === 255 && bytes[1] === 216
            : bytes.subarray(0, 4).toString() === "RIFF" &&
              bytes.subarray(8, 12).toString() === "WEBP";
    if (!valid) throw new AppError(400, "Dosya içeriği uzantısıyla uyuşmuyor.");
    const record = {
      id: uid(),
      name: file.filename.replace(/[\r\n]/g, ""),
      mime,
      size: bytes.length,
      hash: hash(bytes),
      ideaId,
      createdAt: now(),
    };
    writeFileSync(join(store.root, "uploads", record.hash), bytes);
    store.db
      .prepare("INSERT INTO attachments VALUES(?,?)")
      .run(record.id, JSON.stringify(record));
    store.activity("Dosya eklendi: " + record.name, ideaId);
    return { attachment: record };
  });
  app.get("/api/files/:id", (req, reply) => {
    const a = store.attachments().find((a) => a.id === (req.params as any).id);
    if (!a) throw new AppError(404, "Dosya bulunamadı.");
    reply
      .header("Content-Type", a.mime)
      .header("X-Content-Type-Options", "nosniff")
      .header(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(a.name)}`,
      );
    return readFileSync(join(store.root, "uploads", a.hash));
  });
  app.get("/api/export", (req, reply) => {
    const { ids = "", format = "markdown" } = req.query as any;
    const ideas = store
      .getIdeas()
      .filter(
        (i) => !i.deleted && (!ids || String(ids).split(",").includes(i.id)),
      );
    if (!ideas.length)
      throw new AppError(400, "Dışa aktarılacak fikir bulunamadı.");
    if (format === "json") {
      const data = {
        schemaVersion: 1,
        exportedAt: now(),
        ideas,
        sources: store
          .sources()
          .filter((s) => ideas.some((i) => i.sourceIds.includes(s.id))),
        documents: store
          .documents()
          .filter(
            (d) =>
              d.kind !== "original" &&
              d.ideaIds.some((id) => ideas.some((i) => i.id === id)),
          ),
      };
      return reply
        .header(
          "Content-Disposition",
          'attachment; filename="ideation-export.json"',
        )
        .send(data);
    }
    return reply
      .header("Content-Type", "text/markdown; charset=utf-8")
      .header(
        "Content-Disposition",
        'attachment; filename="ideation-export.md"',
      )
      .send(ideas.map((i) => exportMarkdown(store, i)).join("\n\n---\n\n"));
  });
  app.get("/api/backup", async (_req, reply) =>
    reply
      .header("Content-Type", "application/zip")
      .header(
        "Content-Disposition",
        'attachment; filename="ideation-backup.zip"',
      )
      .send(await makeBackup(store)),
  );
  app.post("/api/restore", async (req) => {
    const file = await req.file();
    if (!file) throw new AppError(400, "Yedek seçilmedi.");
    const bytes = await file.toBuffer();
    restoring = true;
    try {
      return await restoreBackup(store, bytes);
    } finally {
      restoring = false;
    }
  });
  const dist = join(projectRoot, "dist");
  if (existsSync(dist)) {
    app.get("/*", (req, reply) => {
      if (req.url.startsWith("/api"))
        return reply.code(404).send({ error: "İşlem bulunamadı." });
      let path: string;
      try {
        path = resolve(dist, "." + decodeURIComponent(req.url.split("?")[0]));
      } catch {
        throw new AppError(400, "Geçersiz yol.");
      }
      if (!path.startsWith(dist + sep)) path = join(dist, "index.html");
      if (!existsSync(path) || !statSync(path).isFile())
        path = join(dist, "index.html");
      const types: Record<string, string> = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
        ".woff": "font/woff",
        ".png": "image/png",
        ".ico": "image/x-icon",
      };
      reply
        .header(
          "Content-Type",
          types[extname(path)] || "application/octet-stream",
        )
        .header("X-Content-Type-Options", "nosniff");
      if (path.includes(sep + "assets" + sep))
        reply.header("Cache-Control", "public,max-age=31536000,immutable");
      return readFileSync(path);
    });
  }
  app.addHook("onClose", () => store.close());
  return app;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const app = await createApp();
  const port = Number(process.env.PORT || 4310);
  await app.listen({ port, host: "127.0.0.1" });
  console.log(`Ideation API: http://127.0.0.1:${port}`);
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () => {
      void app.close().then(() => process.exit(0));
    });
}
