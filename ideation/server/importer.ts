import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Store, projectRoot, repoRoot, hash, now, uid } from "./store.ts";
import { newIdea, type Scene, type Hook } from "../shared/model.ts";

function section(text: string, heading: string) {
  const start = text.indexOf("## " + heading + "\n");
  if (start < 0) throw new Error("Kaynak bölümü bulunamadı: " + heading);
  const tail = text.slice(start);
  return tail
    .slice(
      0,
      tail.indexOf("\n## ", 4) > 0 ? tail.indexOf("\n## ", 4) : undefined,
    )
    .trim();
}
function subsection(text: string, part: string) {
  const match = text.match(
    new RegExp(
      "### [^\\n]*(?:" + part + ")[^\\n]*\\n([\\s\\S]*?)(?=\\n### |$)",
      "i",
    ),
  );
  return match?.[1]?.trim() || "";
}
export function previewImport(store: Store) {
  const manifest = JSON.parse(
    readFileSync(join(projectRoot, "seed/import-manifest.json"), "utf8"),
  );
  const docs = manifest.documents.map((d: any) => {
    const content = readFileSync(join(repoRoot, d.repoRelativePath), "utf8");
    const currentHash = hash(content);
    return { ...d, content, currentHash, changed: currentHash !== d.sha256 };
  });
  return {
    manifest,
    docs,
    existing: store.getIdeas().length,
    items: manifest.ideas.map((i: any) => {
      const d = docs.find((d: any) => d.id === i.sourceDocumentId);
      const content = section(d.content, i.sourceHeading);
      const existing = store.db
        .prepare("SELECT hash FROM imports WHERE id=?")
        .get(i.externalId) as any;
      return {
        ...i,
        content,
        hash: hash(content),
        action: existing
          ? existing.hash === hash(content)
            ? "unchanged"
            : "conflict"
          : "create",
      };
    }),
  };
}
export function importResearch(store: Store) {
  const p = previewImport(store);
  const counts = { created: 0, unchanged: 0, conflicts: 0 };
  store.db.transaction(() => {
    for (const d of p.docs) {
      if (!store.documents().some((x) => x.id === d.id))
        store.saveDocument(
          {
            title:
              d.id === "research-batch-01"
                ? "Fikir araştırmaları · İlk 10"
                : "Fikir araştırmaları · İkinci 10",
            kind: "original",
            language: "tr",
            content: d.content,
            ideaIds: [],
            sourceRef: d.repoRelativePath,
          },
          d.id,
        );
    }
    for (const item of p.items) {
      if (item.action === "unchanged") {
        counts.unchanged++;
        continue;
      }
      if (item.action === "conflict") {
        counts.conflicts++;
        continue;
      }
      const text = item.content;
      const sourceIds: string[] = [];
      const sourceSection = subsection(text, "Kaynak");
      for (const m of sourceSection.matchAll(
        /\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g,
      )) {
        try {
          const s = store.saveSource({
            title: m[1],
            url: m[2],
            type: /özgün|makale|araştırma/i.test(m[1])
              ? "paper"
              : /röportaj/i.test(m[1])
                ? "firsthand"
                : /kurum|resmî|Museum|müze|LADWP|ENTSO|EFF|Cambridge|Agroscope|Winterthur|Smithsonian/i.test(
                      m[1],
                    )
                  ? "official"
                  : "other",
            publisher: new URL(m[2]).hostname,
            accessedAt: "2026-10-31",
            note: "Araştırma dokümanından aktarıldı. İddia düzeyinde inceleme bekliyor.",
          });
          sourceIds.push(s.id);
        } catch {
          throw new Error("Kaynak ayrıştırılamadı: " + m[2]);
        }
      }
      const hooks: Hook[] = [
        ...subsection(text, "Hook").matchAll(/^> (.+)$/gm),
      ].map((m, n) => ({
        id: uid(),
        text: m[1],
        language: "tr",
        firstImage: "",
        onScreen: "",
        note: "Araştırma taslağından aktarıldı.",
        selected: n === 0,
      }));
      const scenes: Scene[] = [];
      for (const line of text.split("\n")) {
        const m = line.match(/^\|\s*(\d+)[–-](\d+)\s*sn\s*\|\s*(.+?)\s*\|$/);
        if (m)
          scenes.push({
            id: uid(),
            duration: Number(m[2]) - Number(m[1]),
            narration: "",
            visual: m[3],
            location: "",
            character: "",
            sound: "",
          });
      }
      const dur = text.match(/\*\*Önerilen süre:\*\*\s*(\d+)[–-](\d+)/);
      const research = subsection(text, "Araştırmayla desteklenen|Belgelenen");
      const visual = subsection(text, "Görsel");
      const category = [1, 18].includes(item.originalNumber)
        ? "Para ve tüketim"
        : [2, 7, 13, 19].includes(item.originalNumber)
          ? "Tarih ve kültür"
          : [10, 11, 16, 17].includes(item.originalNumber)
            ? "Bilim ve doğa"
            : item.originalNumber === 5
              ? "İnsan davranışı"
              : [3, 6, 14].includes(item.originalNumber)
                ? "Gündelik sistemler"
                : "Tasarım ve teknoloji";
      const d = newIdea(item.title);
      Object.assign(d, {
        summary: research.split("\n\n")[0] || "",
        question: hooks[0]?.text || "",
        mechanism: research,
        category,
        durationMin: dur ? Number(dur[1]) : 20,
        durationMax: dur ? Number(dur[2]) : 40,
        scope: item.scopeStatus,
        scopeReason: item.scopeReason || "",
        hooks,
        scenes,
        sourceIds: [...new Set(sourceIds)],
        visualNotes: visual,
        limitations:
          text.match(
            /\*\*(?:Korunacak sınır|Anlatımda kritik ayrıntı|Anlatım sınırı):\*\*\s*([^\n]+)/,
          )?.[1] || "",
        priority: [1, 5, 7, 11, 13, 16].includes(item.originalNumber) ? 1 : 2,
        externalNumber: item.originalNumber,
        tags: ["Araştırma " + (item.originalNumber <= 10 ? "01" : "02")],
      });
      const table = p.docs
        .find((x: any) => x.id === item.sourceDocumentId)
        .content.split("\n")
        .find((l: string) => l.startsWith(`| ${item.originalNumber} |`));
      if (table && item.originalNumber <= 10) {
        const cols = table.split("|").map((s: string) => s.trim());
        d.scores = {
          hook: Number(cols[4]) || null,
          story: Number(cols[5]) || null,
          visual: Number(cols[6]) || null,
        };
      }
      store.saveIdea(d, item.externalId);
      store.saveDocument(
        {
          title: item.title + " · Araştırma",
          kind: "research",
          language: "tr",
          content: text,
          ideaIds: [item.externalId],
          sourceRef: item.sourceDocumentId + "#" + item.sourceHeading,
        },
        "doc-" + item.externalId,
      );
      store.db
        .prepare("INSERT INTO imports VALUES(?,?,?)")
        .run(item.externalId, item.hash, now());
      counts.created++;
    }
    for (const original of store
      .documents()
      .filter((d) => d.kind === "original")) {
      const linked = p.items
        .filter((i: any) => i.sourceDocumentId === original.id)
        .map((i: any) => i.externalId);
      if (!original.ideaIds.length)
        store.saveDocument(
          { ...original, ideaIds: linked },
          original.id,
          original.version,
        );
    }
    store.activity(
      `${counts.created} fikir içe aktarıldı; ${counts.conflicts} değişiklik inceleme bekliyor`,
    );
    store.reindex();
  })();
  return counts;
}
