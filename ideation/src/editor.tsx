import { useEffect, useRef, useState, lazy, Suspense } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Save,
  Eye,
  Code2,
  History,
  AlertCircle,
  Download,
  Check,
} from "lucide-react";
import type { Doc } from "../shared/model";
import { wordCount, estimateDuration } from "../shared/model";
import { useWorkspace, api } from "./api";
import { Modal, Badge, dateLabel } from "./components";

export function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
const CodeEditor = lazy(() =>
  import("./code-editor").then((m) => ({ default: m.CodeEditor })),
);

export function DocumentEditor({ document }: { document: Doc }) {
  const { data, refresh, notify, action } = useWorkspace();
  const key = "ideation-draft-" + document.id;
  const initial = useRef(
    (() => {
      try {
        return JSON.parse(localStorage.getItem(key) || "null");
      } catch {
        return null;
      }
    })(),
  );
  const [content, setContent] = useState(
      initial.current?.content ?? document.content,
    ),
    [title, setTitle] = useState(initial.current?.title ?? document.title);
  const [version, setVersion] = useState(
      initial.current?.version ?? document.version,
    ),
    [status, setStatus] = useState<
      "saved" | "dirty" | "saving" | "error" | "conflict"
    >(initial.current ? "dirty" : "saved");
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [revisions, setRevisions] = useState<any[] | null>(null);
  const [reading, setReading] = useState<any>(null);
  const saved = useRef({ content: document.content, title: document.title });
  const latest = useRef({ content, title, version });
  latest.current = { content, title, version };
  const saving = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (
        latest.current.content !== saved.current.content ||
        latest.current.title !== saved.current.title
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
  function change(next: string) {
    setContent(next);
    setStatus("dirty");
    localStorage.setItem(
      key,
      JSON.stringify({
        content: next,
        title: latest.current.title,
        version: latest.current.version,
      }),
    );
  }
  async function save() {
    if (saving.current || !latest.current.title.trim()) return;
    const captured = { ...latest.current };
    if (
      captured.content === saved.current.content &&
      captured.title === saved.current.title
    )
      return;
    saving.current = true;
    setStatus("saving");
    try {
      const result = await api<Doc>("/documents/" + document.id, "PUT", {
        ...document,
        content: captured.content,
        title: captured.title,
        version: captured.version,
      });
      saved.current = { content: captured.content, title: captured.title };
      latest.current.version = result.version;
      if (mounted.current) setVersion(result.version);
      if (
        latest.current.content === captured.content &&
        latest.current.title === captured.title
      ) {
        localStorage.removeItem(key);
        if (mounted.current) setStatus("saved");
      } else if (mounted.current) setStatus("dirty");
      await refresh();
    } catch (e) {
      if (mounted.current)
        setStatus((e as any).status === 409 ? "conflict" : "error");
      notify((e as Error).message, true);
    } finally {
      saving.current = false;
    }
  }
  useEffect(() => {
    if (status !== "dirty") return;
    const timer = setTimeout(() => void save(), 1200);
    return () => clearTimeout(timer);
  }, [content, title, status, version]);
  async function copyDraft() {
    try {
      await action(
        "/documents",
        "POST",
        { ...document, title: title + " · Kurtarılan taslak", content },
        "Taslağınız yeni doküman olarak kaydedildi.",
      );
      localStorage.removeItem(key);
    } catch {}
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/markdown;charset=utf-8" }),
    );
    const a = window.document.createElement("a");
    a.href = url;
    a.download = title.replace(/[^\p{L}\p{N} _-]/gu, "") + ".md";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="document-editor">
      <div className="document-editor-head">
        <input
          className="document-title"
          aria-label="Doküman başlığı"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setStatus("dirty");
            localStorage.setItem(
              key,
              JSON.stringify({
                content: latest.current.content,
                title: e.target.value,
                version,
              }),
            );
          }}
        />
        <div className="editor-state" role="status">
          {status === "saved" ? (
            <>
              <Check size={14} />
              Kaydedildi · v{version}
            </>
          ) : status === "saving" ? (
            "Kaydediliyor…"
          ) : status === "dirty" ? (
            "Kaydedilmemiş değişiklik"
          ) : (
            <>
              <AlertCircle size={14} />{" "}
              {status === "conflict" ? "Sürüm çakışması" : "Kaydedilemedi"}
            </>
          )}
        </div>
      </div>
      {initial.current && status !== "saved" && (
        <div className="info-banner">
          Bu tarayıcıda kaydedilmemiş bir taslak bulundu ve korundu.
        </div>
      )}
      {(status === "conflict" || status === "error") && (
        <div className="warning-box">
          <AlertCircle size={18} />
          <div>
            <strong>Taslağınız korundu.</strong>
            <p>
              {status === "conflict"
                ? "Bu dokümanın yeni bir sürümü var. Taslağı ayrı kaydedebilir veya en güncel sürümü açabilirsiniz."
                : "Bağlantıyı kontrol edip yeniden kaydetmeyi deneyin."}
            </p>
            <div className="inline-actions">
              <button
                className="button secondary small"
                onClick={() => void copyDraft()}
              >
                Taslağı yeni doküman yap
              </button>
              {status === "error" ? (
                <button
                  className="button primary small"
                  onClick={() => void save()}
                >
                  Yeniden dene
                </button>
              ) : (
                <button
                  className="button secondary small"
                  onClick={() => {
                    localStorage.removeItem(key);
                    window.location.reload();
                  }}
                >
                  Taslağı bırakıp güncel sürümü aç
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="editor-toolbar">
        <div className="segmented">
          <button
            className={mode === "preview" ? "active" : ""}
            onClick={() => setMode("preview")}
          >
            <Eye size={15} />
            Önizleme
          </button>
          <button
            className={mode === "edit" ? "active" : ""}
            onClick={() => setMode("edit")}
          >
            <Code2 size={15} />
            Düzenle
          </button>
        </div>
        <div className="inline-actions">
          <button
            className="icon-button"
            aria-label="Sürüm geçmişi"
            onClick={async () => {
              try {
                setRevisions(
                  await api("/documents/" + document.id + "/revisions"),
                );
              } catch (e) {
                notify((e as Error).message, true);
              }
            }}
          >
            <History size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Markdown indir"
            onClick={download}
          >
            <Download size={17} />
          </button>
          <button
            className="button secondary small"
            disabled={
              status === "saved" || status === "saving" || status === "conflict"
            }
            onClick={() => void save()}
          >
            <Save size={14} />
            Kaydet
          </button>
        </div>
      </div>
      {mode === "edit" ? (
        <Suspense
          fallback={<div className="empty-inline">Editör hazırlanıyor…</div>}
        >
          <CodeEditor value={content} onChange={change} />
        </Suspense>
      ) : (
        <div className="document-preview">
          <Markdown
            text={
              content || "*Bu doküman henüz boş. Düzenle sekmesinden başlayın.*"
            }
          />
        </div>
      )}
      <div className="editor-footer">
        <span>
          {wordCount(content)} kelime · {document.language.toUpperCase()}
        </span>
        {document.kind === "script" && (
          <span>
            Tahmini {estimateDuration(content, data.settings.wordsPerMinute)} sn
            · {data.settings.wordsPerMinute} kelime/dk
          </span>
        )}
        <span>Markdown · otomatik kayıt</span>
      </div>
      {revisions && (
        <Modal
          title="Doküman sürümleri"
          wide
          onClose={() => {
            setRevisions(null);
            setReading(null);
          }}
        >
          {reading ? (
            <>
              <button className="text-link" onClick={() => setReading(null)}>
                ← Sürüm listesine dön
              </button>
              <div className="revision-preview">
                <Markdown text={reading.content} />
              </div>
              <button
                className="button primary"
                onClick={() => {
                  change(reading.content);
                  setTitle(reading.title);
                  setMode("edit");
                  setRevisions(null);
                  setReading(null);
                }}
              >
                Bu sürümü taslağa al
              </button>
            </>
          ) : (
            <>
              <p className="muted">
                Eski sürümü açıp taslağa alabilirsiniz. Kayıt geçmişi korunur.
              </p>
              <div className="revision-row">
                <strong>Güncel sürüm · v{version}</strong>
                <Badge tone="ready">Açık</Badge>
              </div>
              {revisions.length ? (
                revisions.map((r) => (
                  <button
                    key={r.id}
                    className="revision-row"
                    onClick={() => setReading(r)}
                  >
                    <span>
                      <strong>Sürüm {r.version}</strong>
                      <small>
                        {dateLabel(r.createdAt)} · {r.title}
                      </small>
                    </span>
                    <Eye size={17} />
                  </button>
                ))
              ) : (
                <p className="muted">Henüz önceki sürüm yok.</p>
              )}
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
