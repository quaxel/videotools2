import { useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Link2,
  ExternalLink,
  FileText,
  Upload,
  ArrowLeft,
  BookOpen,
  Search,
  Download,
  Image,
  File,
  CheckCircle2,
  AlertCircle,
  PenLine,
  Check,
} from "lucide-react";
import { useWorkspace } from "./api";
import { PageHeading, Modal, Badge, Empty, dateLabel } from "./components";
import { DocumentEditor } from "./editor";
import {
  sourceTypeLabels,
  sourceTypes,
  documentKinds,
  documentKindLabels,
  reviewLabels,
  reviews,
  type Source,
  type Idea,
  type Claim,
  type Doc,
} from "../shared/model";

export function SourceModal({
  onClose,
  source,
  idea,
}: {
  onClose: () => void;
  source?: Source;
  idea?: Idea;
}) {
  const { action } = useWorkspace();
  const [form, setForm] = useState(
    source || {
      title: "",
      url: "",
      publisher: "",
      publishedAt: "",
      accessedAt: new Date().toISOString().slice(0, 10),
      type: "other" as const,
      note: "",
    },
  );
  const [busy, setBusy] = useState(false);
  function field(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  return (
    <Modal
      title={source ? "Kaynağı düzenle" : "Araştırmaya bir kaynak ekle"}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const s = await action<Source>(
              source ? "/sources/" + source.id : "/sources",
              source ? "PUT" : "POST",
              form,
            );
            if (idea && !idea.sourceIds.includes(s.id))
              await action("/ideas/" + idea.id, "PUT", {
                ...idea,
                sourceIds: [...idea.sourceIds, s.id],
              });
            onClose();
          } catch {
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Kaynak başlığı
          <input
            required
            value={form.title}
            onChange={(e) => field("title", e.target.value)}
            placeholder="Makale veya sayfa başlığı"
          />
        </label>
        <label>
          Bağlantı
          <input
            type="url"
            required
            value={form.url}
            onChange={(e) => field("url", e.target.value)}
            placeholder="https://…"
          />
        </label>
        <div className="form-grid">
          <label>
            Kurum / yazar
            <input
              value={form.publisher}
              onChange={(e) => field("publisher", e.target.value)}
            />
          </label>
          <label>
            Kaynak türü
            <select
              value={form.type}
              onChange={(e) => field("type", e.target.value)}
            >
              {sourceTypes.map((t) => (
                <option key={t} value={t}>
                  {sourceTypeLabels[t]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            Yayın tarihi
            <input
              placeholder="Örn. 2015-05-28"
              value={form.publishedAt}
              onChange={(e) => field("publishedAt", e.target.value)}
            />
          </label>
          <label>
            Erişim tarihi
            <input
              type="date"
              value={form.accessedAt}
              onChange={(e) => field("accessedAt", e.target.value)}
            />
          </label>
        </div>
        <label>
          Araştırma notu
          <textarea
            rows={3}
            value={form.note}
            onChange={(e) => field("note", e.target.value)}
            placeholder="Neyi destekliyor? Hangi sınırları var?"
          />
        </label>
        <p className="form-help">
          Bağlantı eklemek bir iddiayı otomatik olarak doğrulamaz. Aynı URL
          varsa mevcut kaynak kullanılır.
        </p>
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button className="button primary" disabled={busy}>
            <Link2 size={15} />
            Kaynağı kaydet
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function Sources() {
  const { data } = useWorkspace();
  const [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<Source | undefined>();
  const [type, setType] = useState("");
  let sources = data.sources.filter((s) => !type || s.type === type);
  if (data.searchMatches)
    sources = sources.filter((s) => data.searchMatches!.sources.includes(s.id));
  return (
    <>
      <PageHeading
        eyebrow="BİR HİKÂYENİN DAYANAKLARI"
        title="Araştırma kütüphanesi"
        description="Kaynaklarınızı bir araya getirin. Hangi bilgiyi neden kullandığınızı unutmayın."
        actions={
          <button className="button primary" onClick={() => setAdding(true)}>
            <Plus size={16} />
            Kaynak ekle
          </button>
        }
      />
      <div className="research-summary">
        <div>
          <BookOpen size={25} />
          <strong>{data.sources.length}</strong>
          <span>kayıtlı kaynak</span>
        </div>
        <div>
          <Link2 size={25} />
          <strong>
            {data.ideas.filter((i) => i.sourceIds.length && !i.deleted).length}
          </strong>
          <span>kaynak bağlı fikir</span>
        </div>
        <div>
          <CheckCircle2 size={25} />
          <strong>
            {data.ideas.reduce(
              (n, i) =>
                n + i.claims.filter((c) => c.status === "supported").length,
              0,
            )}
          </strong>
          <span>desteklenmiş iddia</span>
        </div>
      </div>
      <div className="filter-bar">
        <span className="muted">Kaynak türü</span>
        <select
          aria-label="Kaynak türü filtresi"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Tüm kaynaklar</option>
          {sourceTypes.map((t) => (
            <option key={t} value={t}>
              {sourceTypeLabels[t]}
            </option>
          ))}
        </select>
        <span className="grow" />
        <span className="muted">{sources.length} sonuç</span>
      </div>
      <div className="source-list">
        {sources.map((s) => (
          <article className="source-card" key={s.id}>
            <span className="source-favicon">
              <BookOpen size={20} />
            </span>
            <div className="source-main">
              <div className="inline-actions">
                <Badge>{sourceTypeLabels[s.type]}</Badge>
                <small>{s.publisher || new URL(s.url).hostname}</small>
              </div>
              <a href={s.url} target="_blank" rel="noreferrer">
                <h3>
                  {s.title}
                  <ExternalLink size={14} />
                </h3>
              </a>
              <p>{s.note || "Bu kaynak için henüz not eklenmedi."}</p>
              <div className="source-linked">
                {data.ideas
                  .filter((i) => i.sourceIds.includes(s.id) && !i.deleted)
                  .map((i) => (
                    <Link key={i.id} to={"/ideas/" + i.id + "?tab=research"}>
                      {i.title}
                    </Link>
                  ))}
              </div>
            </div>
            <button
              className="icon-button"
              aria-label="Kaynağı düzenle"
              onClick={() => setEditing(s)}
            >
              <PenLine size={16} />
            </button>
          </article>
        ))}
      </div>
      {!sources.length && (
        <Empty
          title="Kaynak bulunamadı"
          text="Filtreyi değiştirin veya ilk araştırma kaynağınızı ekleyin."
        />
      )}
      {(adding || editing) && (
        <SourceModal
          source={editing}
          onClose={() => {
            setAdding(false);
            setEditing(undefined);
          }}
        />
      )}
    </>
  );
}

export function NewDocument({
  onClose,
  ideaId,
  kind = "research",
}: {
  onClose: () => void;
  ideaId?: string;
  kind?: Doc["kind"];
}) {
  const { data, action } = useWorkspace();
  const navigate = useNavigate();
  const [title, setTitle] = useState(""),
    [docKind, setKind] = useState(kind),
    [language, setLanguage] = useState(data.settings.defaultLanguage);
  const [linked, setLinked] = useState(ideaId || "");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Yeni doküman" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const d = await action<Doc>(
              "/documents",
              "POST",
              {
                title,
                kind: docKind,
                language,
                ideaIds: linked ? [linked] : [],
                content: "",
              },
              "Doküman oluşturuldu.",
            );
            onClose();
            navigate("/documents/" + d.id);
          } catch {
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Doküman başlığı
          <input
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn. Pembe margarin · Senaryo v1"
          />
        </label>
        <div className="form-grid">
          <label>
            Tür
            <select
              value={docKind}
              onChange={(e) => setKind(e.target.value as Doc["kind"])}
            >
              {documentKinds
                .filter((k) => k !== "original")
                .map((k) => (
                  <option key={k} value={k}>
                    {documentKindLabels[k]}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Dil
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "tr" | "en")}
            >
              <option value="tr">Türkçe</option>
              <option value="en">İngilizce</option>
            </select>
          </label>
        </div>
        <label>
          İlgili fikir
          <select value={linked} onChange={(e) => setLinked(e.target.value)}>
            <option value="">Genel çalışma alanı dokümanı</option>
            {data.ideas
              .filter((i) => !i.deleted)
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
          </select>
        </label>
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button disabled={busy} className="button primary">
            <Plus size={16} />
            Oluştur
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function UploadButton({ ideaId }: { ideaId?: string }) {
  const { action } = useWorkspace();
  const [busy, setBusy] = useState(false);
  return (
    <label
      className={"button secondary upload-button " + (busy ? "disabled" : "")}
    >
      <Upload size={16} />
      {busy ? "Yükleniyor…" : "Dosya yükle"}
      <input
        disabled={busy}
        type="file"
        accept=".md,.txt,.pdf,.png,.jpg,.jpeg,.webp"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          const body = new FormData();
          body.append("file", file);
          try {
            await action(
              "/upload" +
                (ideaId ? "?ideaId=" + encodeURIComponent(ideaId) : ""),
              "POST",
              body,
              "Dosya kaydedildi.",
            );
          } catch {
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}
export function AttachmentList({ ideaId }: { ideaId?: string }) {
  const { data } = useWorkspace();
  const files = data.attachments.filter((a) => !ideaId || a.ideaId === ideaId);
  return (
    <div className="attachment-list">
      {files.map((a) => (
        <a
          href={"/api/files/" + a.id}
          target="_blank"
          rel="noreferrer"
          className="attachment"
          key={a.id}
        >
          {a.mime.startsWith("image/") ? (
            <img src={"/api/files/" + a.id} alt={a.name} />
          ) : (
            <div className="file-thumb">
              <FileText size={30} />
              <span>PDF</span>
            </div>
          )}
          <div>
            <strong>{a.name}</strong>
            <small>
              {Math.round(a.size / 1024)} KB · {dateLabel(a.createdAt)}
            </small>
          </div>
          <ExternalLink size={15} />
        </a>
      ))}
      {!files.length && (
        <div className="empty-inline">
          Henüz ek dosya yok. Markdown, PDF veya referans görsellerinizi
          yükleyebilirsiniz.
        </div>
      )}
    </div>
  );
}
export function Documents() {
  const { data } = useWorkspace();
  const { id } = useParams();
  const [adding, setAdding] = useState(false),
    [kind, setKind] = useState("");
  const doc = data.documents.find((d) => d.id === id);
  let docs = data.documents.filter((d) => !kind || d.kind === kind);
  if (data.searchMatches)
    docs = docs.filter((d) => data.searchMatches!.documents.includes(d.id));
  if (id && !doc)
    return (
      <Empty
        title="Doküman bulunamadı"
        action={<Link to="/documents">Dokümanlara dön</Link>}
      />
    );
  return (
    <>
      {doc ? (
        <>
          <Link className="back-link" to="/documents">
            <ArrowLeft size={16} />
            Doküman kütüphanesi
          </Link>
          <div className="document-context">
            <Badge>{documentKindLabels[doc.kind]}</Badge>
            {doc.ideaIds.map((i) => {
              const idea = data.ideas.find((x) => x.id === i);
              return idea ? (
                <Link key={i} to={"/ideas/" + i}>
                  {idea.title}
                </Link>
              ) : null;
            })}
          </div>
          <DocumentEditor key={doc.id} document={doc} />
        </>
      ) : (
        <>
          <PageHeading
            eyebrow="NOTLARDAN SENARYOLARA"
            title="Doküman kütüphanesi"
            description="Araştırmalar, taslaklar ve referanslar. Her şey kendi yerinde."
            actions={
              <>
                <UploadButton />
                <button
                  className="button primary"
                  onClick={() => setAdding(true)}
                >
                  <Plus size={16} />
                  Yeni doküman
                </button>
              </>
            }
          />
          <div className="filter-bar">
            <select
              aria-label="Doküman türü filtresi"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="">Tüm dokümanlar</option>
              {documentKinds.map((k) => (
                <option key={k} value={k}>
                  {documentKindLabels[k]}
                </option>
              ))}
            </select>
            <span className="muted">{docs.length} doküman</span>
          </div>
          <div className="document-grid">
            {docs.map((d) => (
              <Link
                key={d.id}
                to={"/documents/" + d.id}
                className="document-card"
              >
                <div className={"doc-card-cover " + d.kind}>
                  <FileText size={30} />
                  <span>{d.language.toUpperCase()} / MARKDOWN</span>
                </div>
                <Badge>{documentKindLabels[d.kind]}</Badge>
                <h3>{d.title}</h3>
                <p>
                  {d.content.replace(/[#*>|]/g, "").slice(0, 115) ||
                    "Yeni bir hikâye için boş bir sayfa."}
                </p>
                <div className="card-footer">
                  <span>{dateLabel(d.updatedAt)}</span>
                  <span>
                    v{d.version} · {d.ideaIds.length} fikir
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {!docs.length && (
            <Empty
              title="Bu görünümde doküman yok"
              text="Yeni bir not oluşturun veya dosya yükleyin."
            />
          )}
          <section className="section-block">
            <div className="section-heading">
              <div>
                <h2>Dosyalar ve referanslar</h2>
                <p>
                  PDF ve görsel dosyaların içeriği henüz metin aramasına dahil
                  değil.
                </p>
              </div>
            </div>
            <AttachmentList />
          </section>
        </>
      )}
      {adding && <NewDocument onClose={() => setAdding(false)} />}
    </>
  );
}

export function IdeaResearch({ idea }: { idea: Idea }) {
  const { data, action } = useWorkspace();
  const [adding, setAdding] = useState(false),
    [linking, setLinking] = useState(false),
    [claim, setClaim] = useState<Claim | null>(null),
    [newClaim, setNewClaim] = useState(false);
  const sourceList = data.sources.filter((s) => idea.sourceIds.includes(s.id));
  const docs = data.documents.filter(
    (d) => d.ideaIds.includes(idea.id) && d.kind === "research",
  );
  const [docId, setDocId] = useState("");
  const selected = docs.find((d) => d.id === docId) || docs[0];
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Araştırmanın dayanakları</h2>
          <p>Kaynakları toplayın, senaryodaki iddiaları tek tek eşleyin.</p>
        </div>
        <div className="inline-actions">
          <button
            className="button secondary small"
            onClick={() => setLinking(true)}
          >
            <Link2 size={15} />
            Mevcut kaynak
          </button>
          <button
            className="button primary small"
            onClick={() => setAdding(true)}
          >
            <Plus size={15} />
            Kaynak ekle
          </button>
        </div>
      </div>
      <div className="idea-source-grid">
        {sourceList.map((s) => (
          <div className="mini-source" key={s.id}>
            <Badge>{sourceTypeLabels[s.type]}</Badge>
            <a href={s.url} target="_blank" rel="noreferrer">
              <strong>{s.title}</strong>
              <ExternalLink size={14} />
            </a>
            <small>{s.publisher}</small>
          </div>
        ))}
      </div>
      {!sourceList.length && (
        <Empty
          title="Henüz kaynak eklenmedi"
          text="İlk bağlantıyı ekleyerek araştırmaya başlayın."
        />
      )}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>
              İddia ve kanıtlar
              <span className="tiny-count">{idea.claims.length}</span>
            </h2>
            <p>Kaynak bulunması, iddianın doğrulandığı anlamına gelmez.</p>
          </div>
          <button
            className="button secondary small"
            onClick={() => setNewClaim(true)}
          >
            <Plus size={15} />
            İddia ekle
          </button>
        </div>
        {idea.claims.length ? (
          <div className="claim-list">
            {idea.claims.map((c) => (
              <article className="claim-card" key={c.id}>
                <div>
                  <Badge tone={c.status}>{reviewLabels[c.status]}</Badge>
                  <h3>{c.text}</h3>
                  {c.limit && <p>{c.limit}</p>}
                  {c.evidence.map((e) => (
                    <a
                      key={e.sourceId}
                      href={sourceList.find((s) => s.id === e.sourceId)?.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Link2 size={13} />
                      {
                        {
                          supports: "Destekliyor",
                          partial: "Kısmen destekliyor",
                          contradicts: "Çelişiyor",
                          background: "Arka plan",
                        }[e.relation]
                      }{" "}
                      · {sourceList.find((s) => s.id === e.sourceId)?.title}
                      {e.note && " — " + e.note}
                    </a>
                  ))}
                </div>
                <button
                  className="icon-button"
                  aria-label="İddiayı düzenle"
                  onClick={() => setClaim(c)}
                >
                  <PenLine size={16} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="research-empty">
            <FlaskIcon />
            <div>
              <h3>İddiaları ayırma zamanı</h3>
              <p>
                Örneğin bir sayı, tarih veya neden–sonuç cümlesi ekleyin.
                Ardından onu destekleyen kaynağı bağlayın.
              </p>
            </div>
            <button
              className="button secondary small"
              onClick={() => setNewClaim(true)}
            >
              İlk iddiayı ekle
            </button>
          </div>
        )}
      </section>
      {selected && (
        <section className="section-block">
          <div className="section-heading">
            <h2>Araştırma notları</h2>
            {docs.length > 1 && (
              <select
                aria-label="Araştırma dokümanı"
                value={selected.id}
                onChange={(e) => setDocId(e.target.value)}
              >
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          <DocumentEditor key={selected.id} document={selected} />
        </section>
      )}
      {adding && <SourceModal idea={idea} onClose={() => setAdding(false)} />}{" "}
      {linking && <LinkSources idea={idea} onClose={() => setLinking(false)} />}{" "}
      {(claim || newClaim) && (
        <ClaimModal
          idea={idea}
          claim={claim || undefined}
          onClose={() => {
            setClaim(null);
            setNewClaim(false);
          }}
        />
      )}
    </>
  );
}
function FlaskIcon() {
  return (
    <span className="empty-icon">
      <BookOpen size={25} />
    </span>
  );
}
function LinkSources({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const { data, action } = useWorkspace();
  const [ids, setIds] = useState(idea.sourceIds);
  const [q, setQ] = useState("");
  return (
    <Modal title="Kaynak kütüphanesinden bağla" onClose={onClose}>
      <input
        aria-label="Kaynak ara"
        placeholder="Kaynak başlığında ara…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="source-picker">
        {data.sources
          .filter((s) =>
            s.title.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr")),
          )
          .map((s) => (
            <label key={s.id}>
              <input
                type="checkbox"
                checked={ids.includes(s.id)}
                onChange={(e) =>
                  setIds((v) =>
                    e.target.checked
                      ? [...v, s.id]
                      : v.filter((id) => id !== s.id),
                  )
                }
              />
              <span>
                {s.title}
                <small>{s.publisher}</small>
              </span>
            </label>
          ))}
      </div>
      <div className="modal-footer">
        <button className="button secondary" onClick={onClose}>
          Vazgeç
        </button>
        <button
          className="button primary"
          onClick={async () => {
            try {
              await action(
                "/ideas/" + idea.id,
                "PUT",
                { ...idea, sourceIds: ids },
                "Kaynak ilişkileri kaydedildi.",
              );
              onClose();
            } catch {}
          }}
        >
          Bağlantıları kaydet
        </button>
      </div>
    </Modal>
  );
}
function ClaimModal({
  idea,
  claim,
  onClose,
}: {
  idea: Idea;
  claim?: Claim;
  onClose: () => void;
}) {
  const { data, action } = useWorkspace();
  const [form, setForm] = useState<Claim>(
    claim || {
      id: crypto.randomUUID(),
      text: "",
      status: "unreviewed",
      limit: "",
      evidence: [],
    },
  );
  const sources = data.sources.filter((s) => idea.sourceIds.includes(s.id));
  return (
    <Modal
      title={claim ? "İddia ve kanıtı düzenle" : "Araştırılacak bir iddia ekle"}
      onClose={onClose}
      wide
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await action(
              "/ideas/" + idea.id,
              "PUT",
              {
                ...idea,
                claims: claim
                  ? idea.claims.map((c) => (c.id === claim.id ? form : c))
                  : [...idea.claims, form],
              },
              "İddia kaydedildi.",
            );
            onClose();
          } catch {}
        }}
      >
        <label>
          İddia
          <textarea
            required
            rows={2}
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            placeholder="Kaynakla kontrol edeceğiniz somut cümle"
          />
        </label>
        <label>
          İnceleme durumu
          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as Claim["status"] })
            }
          >
            {reviews.map((r) => (
              <option key={r} value={r}>
                {reviewLabels[r]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kapsam / sınırlama
          <textarea
            rows={2}
            value={form.limit}
            onChange={(e) => setForm({ ...form, limit: e.target.value })}
            placeholder="Hangi yıl, hangi ülke veya hangi koşullarda geçerli?"
          />
        </label>
        <h3>Kanıt ilişkileri</h3>
        {sources.length ? (
          sources.map((s) => {
            const evidence = form.evidence.find((e) => e.sourceId === s.id);
            return (
              <div className="evidence-edit" key={s.id}>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={!!evidence}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        evidence: e.target.checked
                          ? [
                              ...form.evidence,
                              {
                                sourceId: s.id,
                                relation: "supports",
                                note: "",
                              },
                            ]
                          : form.evidence.filter((x) => x.sourceId !== s.id),
                      })
                    }
                  />
                  {s.title}
                </label>
                {evidence && (
                  <div className="form-grid">
                    <select
                      aria-label="Kanıt ilişkisi"
                      value={evidence.relation}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          evidence: form.evidence.map((x) =>
                            x.sourceId === s.id
                              ? { ...x, relation: e.target.value as any }
                              : x,
                          ),
                        })
                      }
                    >
                      <option value="supports">Destekliyor</option>
                      <option value="partial">Kısmen destekliyor</option>
                      <option value="contradicts">Çelişiyor</option>
                      <option value="background">Arka plan</option>
                    </select>
                    <input
                      aria-label="Kanıt notu"
                      value={evidence.note}
                      placeholder="Bölüm, alıntı veya açıklama"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          evidence: form.evidence.map((x) =>
                            x.sourceId === s.id
                              ? { ...x, note: e.target.value }
                              : x,
                          ),
                        })
                      }
                    />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="muted">
            Önce fikre kaynak bağlayın. İddiayı incelenmedi olarak
            saklayabilirsiniz.
          </p>
        )}
        <div className="modal-footer">
          {claim && (
            <button
              type="button"
              className="button danger ghost"
              onClick={async () => {
                try {
                  await action(
                    "/ideas/" + idea.id,
                    "PUT",
                    {
                      ...idea,
                      claims: idea.claims.filter((c) => c.id !== claim.id),
                    },
                    "İddia kaldırıldı.",
                  );
                  onClose();
                } catch {}
              }}
            >
              İddiayı kaldır
            </button>
          )}
          <button type="button" className="button secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button className="button primary">
            <Check size={16} />
            Kaydet
          </button>
        </div>
      </form>
    </Modal>
  );
}
