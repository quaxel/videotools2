import { z } from "zod";

export const stages = [
  "inbox",
  "researching",
  "writing",
  "ready",
  "producing",
  "published",
] as const;
export const stageLabels: Record<string, string> = {
  inbox: "Fikir havuzu",
  researching: "Araştırılıyor",
  writing: "Senaryo yazılıyor",
  ready: "Üretime hazır",
  producing: "Üretimde",
  published: "Yayımlandı",
};
export const scopes = ["eligible", "rewrite_required", "excluded"] as const;
export const scopeLabels: Record<string, string> = {
  eligible: "Kapsama uygun",
  rewrite_required: "Yeniden yazılmalı",
  excluded: "Kapsam dışı",
};
export const reviews = [
  "unreviewed",
  "supported",
  "partial",
  "disputed",
  "unsupported",
] as const;
export const reviewLabels: Record<string, string> = {
  unreviewed: "İncelenmedi",
  supported: "Desteklendi",
  partial: "Kısmen desteklendi",
  disputed: "Tartışmalı",
  unsupported: "Destek bulunamadı",
};
export const sourceTypes = [
  "paper",
  "official",
  "firsthand",
  "news",
  "other",
] as const;
export const sourceTypeLabels: Record<string, string> = {
  paper: "Özgün araştırma",
  official: "Resmî kurum",
  firsthand: "Birinci elden",
  news: "İkincil haber",
  other: "Diğer",
};
export const categories = [
  "Bilim ve doğa",
  "İnsan davranışı",
  "Tasarım ve teknoloji",
  "Gündelik sistemler",
  "Tarih ve kültür",
  "Para ve tüketim",
];
const text = z.string().max(200000);
const id = z.string().min(1).max(150);
export const hookSchema = z.object({
  id,
  text: z.string().max(5000),
  language: z.enum(["tr", "en"]),
  firstImage: z.string().max(5000),
  note: z.string().max(5000),
  selected: z.boolean(),
});
export const sceneSchema = z.object({
  id,
  duration: z.number().min(0).max(60),
  narration: z.string().max(5000),
  visual: z.string().max(5000),
  location: z.string().max(500),
  character: z.string().max(500),
  sound: z.string().max(500),
});
export const claimSchema = z.object({
  id,
  text: z.string().min(1).max(10000),
  status: z.enum(reviews),
  limit: z.string().max(5000),
  evidence: z
    .array(
      z.object({
        sourceId: id,
        relation: z.enum(["supports", "partial", "contradicts", "background"]),
        note: z.string().max(5000),
      }),
    )
    .max(100),
});
export const ideaDataSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    summary: text.default(""),
    question: text.default(""),
    mechanism: text.default(""),
    category: z.string().min(1).max(100),
    tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    durationMin: z.number().int().min(20).max(60),
    durationMax: z.number().int().min(20).max(60),
    stage: z.enum(stages).default("inbox"),
    scope: z.enum(scopes).default("eligible"),
    scopeReason: text.default(""),
    priority: z.number().int().min(1).max(3).default(2),
    favorite: z.boolean().default(false),
    archived: z.boolean().default(false),
    deleted: z.boolean().default(false),
    hooks: z.array(hookSchema).max(50).default([]),
    scenes: z.array(sceneSchema).max(100).default([]),
    claims: z.array(claimSchema).max(200).default([]),
    sourceIds: z.array(id).max(300).default([]),
    visualNotes: text.default(""),
    limitations: text.default(""),
    effort: z.enum(["low", "medium", "high", "unknown"]).default("unknown"),
    scores: z
      .object({
        hook: z.number().min(1).max(5).nullable(),
        story: z.number().min(1).max(5).nullable(),
        visual: z.number().min(1).max(5).nullable(),
      })
      .default({ hook: null, story: null, visual: null }),
    measuredDuration: z.number().min(0).max(600).nullable().default(null),
    externalNumber: z.number().int().nullable().default(null),
  })
  .superRefine((v, ctx) => {
    if (v.durationMin > v.durationMax)
      ctx.addIssue({
        code: "custom",
        path: ["durationMax"],
        message: "Üst süre alt süreden küçük olamaz.",
      });
    if (v.hooks.filter((h) => h.selected).length > 1)
      ctx.addIssue({
        code: "custom",
        path: ["hooks"],
        message: "Tek bir hook seçilebilir.",
      });
    for (const [n, c] of v.claims.entries())
      if (
        c.status === "supported" &&
        !c.evidence.some((e) => e.relation === "supports")
      )
        ctx.addIssue({
          code: "custom",
          path: ["claims", n, "evidence"],
          message:
            "Desteklendi olarak işaretlemek için destekleyen bir kaynak bağlayın.",
        });
    if (
      v.scope !== "eligible" &&
      ["ready", "producing", "published"].includes(v.stage)
    )
      ctx.addIssue({
        code: "custom",
        path: ["stage"],
        message: "Bu aşama için fikir kapsama uygun olmalı.",
      });
  });
export type IdeaData = z.infer<typeof ideaDataSchema>;
export type Idea = IdeaData & {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type Hook = z.infer<typeof hookSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type Claim = z.infer<typeof claimSchema>;
export const documentKinds = [
  "research",
  "script",
  "evaluation",
  "brief",
  "publishing",
  "note",
  "original",
] as const;
export const documentKindLabels: Record<string, string> = {
  research: "Araştırma",
  script: "Senaryo",
  evaluation: "Değerlendirme",
  brief: "Görsel brief",
  publishing: "Yayın metni",
  note: "Not",
  original: "Orijinal araştırma",
};
export const documentSchema = z.object({
  title: z.string().trim().min(1).max(300),
  kind: z.enum(documentKinds),
  language: z.enum(["tr", "en"]),
  content: text,
  ideaIds: z.array(id).max(300),
  sourceRef: z.string().max(2000).nullable().default(null),
});
export type Doc = z.infer<typeof documentSchema> & {
  id: string;
  version: number;
  updatedAt: string;
};
export const sourceSchema = z.object({
  url: z
    .string()
    .url()
    .max(5000)
    .refine(
      (v) => ["https:", "http:"].includes(new URL(v).protocol),
      "HTTP veya HTTPS bağlantısı kullanın.",
    ),
  title: z.string().trim().min(1).max(1000),
  publisher: z.string().max(500).default(""),
  publishedAt: z.string().max(100).default(""),
  accessedAt: z.string().max(100).default(""),
  type: z.enum(sourceTypes).default("other"),
  note: text.default(""),
});
export type Source = z.infer<typeof sourceSchema> & { id: string };
export const settingsSchema = z.object({
  wordsPerMinute: z.number().int().min(60).max(300),
  categories: z.array(z.string().trim().min(1).max(100)).min(1).max(40),
  channelPromise: z.string().max(1000),
  defaultLanguage: z.enum(["tr", "en"]),
});
export type Settings = z.infer<typeof settingsSchema>;
export type Attachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  hash: string;
  ideaId: string | null;
  createdAt: string;
};
export type Activity = {
  id: number;
  ideaId: string | null;
  label: string;
  createdAt: string;
};
export type State = {
  ideas: Idea[];
  documents: Doc[];
  sources: Source[];
  attachments: Attachment[];
  activity: Activity[];
  settings: Settings;
  searchMatches?: { ideas: string[]; documents: string[]; sources: string[] };
};
export function normalize(v: string) {
  return v
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}
export function wordCount(v: string) {
  return (v.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || []).length;
}
export function estimateDuration(text: string, wpm: number) {
  return Math.round((wordCount(text) / wpm) * 60);
}
export function newIdea(title = ""): IdeaData {
  return ideaDataSchema.parse({
    title: title || "Yeni fikir",
    category: categories[0],
    durationMin: 20,
    durationMax: 40,
  });
}
