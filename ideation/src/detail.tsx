import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  Download,
  Archive,
  Trash2,
  RotateCcw,
  Plus,
  Check,
  PenLine,
  Clock3,
  ArrowUp,
  ArrowDown,
  Save,
  FileText,
  AlertCircle,
  Image,
  Type,
} from "lucide-react";
import { useWorkspace, api } from "./api";
import { useQuery } from "@tanstack/react-query";
import {
  Art,
  Badge,
  Stage,
  Modal,
  Empty,
  Readiness,
  dateLabel,
} from "./components";
import {
  IdeaResearch,
  NewDocument,
  UploadButton,
  AttachmentList,
} from "./research";
import { DocumentEditor } from "./editor";
import {
  stageLabels,
  stages,
  scopeLabels,
  scopes,
  type Idea,
  type Hook,
  type Scene,
} from "../shared/model";

const tabs = [
  ["overview", "Genel bakış"],
  ["research", "Araştırma"],
  ["hooks", "Hook’lar"],
  ["script", "Senaryo"],
  ["scenes", "Sahne akışı"],
  ["files", "Dosyalar"],
  ["history", "Geçmiş"],
];
export function IdeaDetail() {
  const { id } = useParams();
  const { data, action } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [newDoc, setNewDoc] = useState(false);
  const idea = data.ideas.find((i) => i.id === id);
  if (!idea)
    return (
      <Empty
        title="Fikir bulunamadı"
        action={<Link to="/ideas">Fikir kütüphanesine dön</Link>}
      />
    );
  const tab = params.get("tab") || "overview";
  async function update(patch: Partial<Idea>, message: string) {
    try {
      await action("/ideas/" + idea!.id, "PUT", { ...idea, ...patch }, message);
    } catch {}
  }
  return (
    <>
      <Link
        className="back-link"
        to={
          idea.deleted || idea.archived || idea.scope === "excluded"
            ? "/archive"
            : "/ideas"
        }
      >
        <ArrowLeft size={16} />
        Fikir kütüphanesi
      </Link>
      <div className="idea-detail-heading">
        <div>
          <div className="inline-actions">
            <Badge>{idea.category}</Badge>
            <Stage value={idea.stage} />
            <Badge tone={idea.scope}>{scopeLabels[idea.scope]}</Badge>
          </div>
          <h1>{idea.title}</h1>
          <div className="detail-subtitle">
            <span>
              <Clock3 size={14} />
              {idea.durationMin}–{idea.durationMax} saniye
            </span>
            <span>Öncelik {idea.priority}</span>
            <span>Son düzenleme {dateLabel(idea.updatedAt)}</span>
          </div>
        </div>
        <div className="detail-actions">
          <button
            className={"icon-button " + (idea.favorite ? "selected" : "")}
            aria-label="Favori durumunu değiştir"
            onClick={() =>
              void update(
                { favorite: !idea.favorite },
                "Favori durumu güncellendi.",
              )
            }
          >
            <Star size={19} fill={idea.favorite ? "currentColor" : "none"} />
          </button>
          <a
            className="button secondary small"
            href={"/api/export?ids=" + idea.id}
          >
            <Download size={15} />
            Paket indir
          </a>
          {idea.deleted ? (
            <button
              className="button secondary small"
              onClick={() =>
                void update({ deleted: false }, "Fikir geri alındı.")
              }
            >
              <RotateCcw size={15} />
              Geri al
            </button>
          ) : (
            <>
              <button
                className="icon-button"
                aria-label={idea.archived ? "Arşivden çıkar" : "Arşivle"}
                onClick={() =>
                  void update(
                    { archived: !idea.archived },
                    idea.archived
                      ? "Fikir arşivden çıkarıldı."
                      : "Fikir arşivlendi.",
                  )
                }
              >
                <Archive size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Çöp kutusuna taşı"
                onClick={() =>
                  void update(
                    { deleted: true },
                    "Fikir çöp kutusuna taşındı. Arşivden geri alabilirsiniz.",
                  )
                }
              >
                <Trash2 size={17} />
              </button>
            </>
          )}
        </div>
      </div>
      {idea.scope !== "eligible" && (
        <div className="warning-box">
          <AlertCircle size={19} />
          <p>
            <strong>{scopeLabels[idea.scope]}.</strong> {idea.scopeReason} Bu
            kayıt üretim listesine alınmaz; önceki araştırma korunur.
          </p>
        </div>
      )}
      <div className="tabs">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => {
              const p = new URLSearchParams(params);
              p.set("tab", key);
              setParams(p);
            }}
          >
            {label}
            {key === "hooks" && <span>{idea.hooks.length}</span>}
            {key === "research" && <span>{idea.sourceIds.length}</span>}
          </button>
        ))}
      </div>
      <div className="detail-body">
        {tab === "overview" && <Overview key={idea.id} idea={idea} />}{" "}
        {tab === "research" && <IdeaResearch idea={idea} />}{" "}
        {tab === "hooks" && <Hooks idea={idea} />}{" "}
        {tab === "scenes" && <Scenes key={idea.id} idea={idea} />}{" "}
        {tab === "script" && (
          <Scripts idea={idea} onNew={() => setNewDoc(true)} />
        )}{" "}
        {tab === "files" && (
          <>
            <div className="section-heading">
              <div>
                <h2>Fikrin dosyaları</h2>
                <p>Görsel referansları ve belgeleri bu hikâyeye bağlayın.</p>
              </div>
              <div className="inline-actions">
                <UploadButton ideaId={idea.id} />
                <button
                  className="button primary small"
                  onClick={() => setNewDoc(true)}
                >
                  <Plus size={15} />
                  Doküman oluştur
                </button>
              </div>
            </div>
            <AttachmentList ideaId={idea.id} />
            <div className="linked-documents">
              {data.documents
                .filter((d) => d.ideaIds.includes(idea.id))
                .map((d) => (
                  <Link
                    to={"/documents/" + d.id}
                    className="document-row"
                    key={d.id}
                  >
                    <FileText size={20} />
                    <div>
                      <strong>{d.title}</strong>
                      <small>
                        Sürüm {d.version} · {dateLabel(d.updatedAt)}
                      </small>
                    </div>
                  </Link>
                ))}
            </div>
          </>
        )}{" "}
        {tab === "history" && <IdeaHistory idea={idea} />}
      </div>
      {newDoc && (
        <NewDocument
          ideaId={idea.id}
          kind={tab === "script" ? "script" : "note"}
          onClose={() => setNewDoc(false)}
        />
      )}
    </>
  );
}

function Overview({ idea }: { idea: Idea }) {
  const { data, action } = useWorkspace();
  const [form, setForm] = useState(idea),
    [busy, setBusy] = useState(false);
  function field(k: string, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  return (
    <div className="overview-grid">
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const result = await action<Idea>(
              "/ideas/" + idea.id,
              "PUT",
              form,
              "Fikir kaydedildi.",
            );
            setForm(result);
          } catch {
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="section-heading">
          <h2>Hikâyenin çekirdeği</h2>
          <Badge>v{form.version}</Badge>
        </div>
        <label>
          Başlık
          <input
            required
            maxLength={300}
            value={form.title}
            onChange={(e) => field("title", e.target.value)}
          />
        </label>
        <label>
          Kısa açıklama
          <textarea
            rows={3}
            value={form.summary}
            onChange={(e) => field("summary", e.target.value)}
          />
        </label>
        <label>
          İzleyicinin sorusu
          <textarea
            rows={2}
            value={form.question}
            onChange={(e) => field("question", e.target.value)}
            placeholder="Neden böyle oluyor?"
          />
        </label>
        <label>
          Şaşırtıcı cevap / mekanizma
          <textarea
            rows={6}
            value={form.mechanism}
            onChange={(e) => field("mechanism", e.target.value)}
          />
        </label>
        <label>
          Anlatımda korunacak sınırlar
          <textarea
            rows={3}
            value={form.limitations}
            onChange={(e) => field("limitations", e.target.value)}
            placeholder="Neyi genellememeliyiz? Hangi koşullar önemli?"
          />
        </label>
        <label>
          Görsel uygulanabilirlik notları
          <textarea
            rows={4}
            value={form.visualNotes}
            onChange={(e) => field("visualNotes", e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Hazırlık zorluğu
            <select
              value={form.effort}
              onChange={(e) => field("effort", e.target.value)}
            >
              <option value="unknown">Henüz değerlendirilmedi</option>
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
            </select>
          </label>
          <label>
            Ölçülen ses süresi (sn)
            <input
              type="number"
              min={0}
              max={600}
              step="0.1"
              value={form.measuredDuration ?? ""}
              onChange={(e) =>
                field(
                  "measuredDuration",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              placeholder="Ses üretilmedi"
            />
          </label>
        </div>
        <button disabled={busy} className="button primary">
          <Save size={16} />
          {busy ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
        </button>
      </form>
      <aside className="detail-aside">
        <Art idea={idea} />
        <div className="panel">
          <h3>Düzen ve durum</h3>
          <label>
            Kategori
            <select
              value={form.category}
              onChange={(e) => field("category", e.target.value)}
            >
              {[...new Set([...data.settings.categories, form.category])].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Üretim aşaması
            <select
              value={form.stage}
              onChange={(e) => field("stage", e.target.value)}
            >
              {stages.map((s) => (
                <option
                  disabled={
                    form.scope !== "eligible" &&
                    ["ready", "producing", "published"].includes(s)
                  }
                  key={s}
                  value={s}
                >
                  {stageLabels[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Editoryal kapsam
            <select
              value={form.scope}
              onChange={(e) => {
                field("scope", e.target.value);
                if (
                  e.target.value !== "eligible" &&
                  ["ready", "producing", "published"].includes(form.stage)
                )
                  field("stage", "inbox");
              }}
            >
              {scopes.map((s) => (
                <option value={s} key={s}>
                  {scopeLabels[s]}
                </option>
              ))}
            </select>
          </label>
          {form.scope !== "eligible" && (
            <label>
              Kapsam gerekçesi
              <textarea
                rows={3}
                value={form.scopeReason}
                onChange={(e) => field("scopeReason", e.target.value)}
              />
            </label>
          )}
          <div className="form-grid">
            <label>
              Alt süre
              <input
                type="number"
                required
                min={20}
                max={60}
                value={form.durationMin}
                onChange={(e) => field("durationMin", Number(e.target.value))}
              />
            </label>
            <label>
              Üst süre
              <input
                type="number"
                required
                min={20}
                max={60}
                value={form.durationMax}
                onChange={(e) => field("durationMax", Number(e.target.value))}
              />
            </label>
          </div>
          <label>
            Öncelik
            <select
              value={form.priority}
              onChange={(e) => field("priority", Number(e.target.value))}
            >
              <option value={1}>P1 · Önce değerlendir</option>
              <option value={2}>P2 · Sırada beklesin</option>
              <option value={3}>P3 · Daha sonra</option>
            </select>
          </label>
          <label>
            Etiketler
            <input
              defaultValue={form.tags.join(", ")}
              onBlur={(e) =>
                field(
                  "tags",
                  e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                )
              }
              placeholder="Virgülle ayırın"
            />
          </label>
          <button
            className="button secondary small full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await action<Idea>(
                  "/ideas/" + idea.id,
                  "PUT",
                  form,
                  "Fikir kaydedildi.",
                );
                setForm(result);
              } catch {
              } finally {
                setBusy(false);
              }
            }}
          >
            <Save size={14} />
            Durumu kaydet
          </button>
        </div>
        <div className="panel">
          <h3>Editoryal değerlendirme</h3>
          <p className="form-help">
            İzlenme tahmini değildir. Eksik değerlendirmeler boş kalır.
          </p>
          {[
            ["hook", "Hook"],
            ["story", "Hikâye"],
            ["visual", "Görsel anlatım"],
          ].map(([key, label]) => (
            <label className="score-row" key={key}>
              {label}
              <select
                value={form.scores[key as keyof Idea["scores"]] ?? ""}
                onChange={(e) =>
                  field("scores", {
                    ...form.scores,
                    [key]: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}/5
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="panel">
          <h3>Sonraki adımlar</h3>
          <Readiness idea={idea} />
        </div>
      </aside>
    </div>
  );
}

function Hooks({ idea }: { idea: Idea }) {
  const { action } = useWorkspace();
  const [editing, setEditing] = useState<Hook | null>(null);
  const [adding, setAdding] = useState(false);
  async function save(hooks: Hook[]) {
    try {
      await action(
        "/ideas/" + idea.id,
        "PUT",
        { ...idea, hooks },
        "Hook’lar kaydedildi.",
      );
      return true;
    } catch {
      return false;
    }
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>İlk saniyeler</h2>
          <p>
            Cümlenin yanında ilk görüntüyü de düşünün. Bir açılışı seçili
            tutabilirsiniz.
          </p>
        </div>
        <button
          className="button primary small"
          onClick={() => setAdding(true)}
        >
          <Plus size={15} />
          Hook ekle
        </button>
      </div>
      <div className="hooks-grid">
        {idea.hooks.map((h, n) => (
          <article
            className={"hook-card " + (h.selected ? "chosen" : "")}
            key={h.id}
          >
            <div className="section-heading">
              <Badge tone={h.selected ? "ready" : "neutral"}>
                {h.selected ? "Seçili açılış" : "Alternatif " + (n + 1)}
              </Badge>
              <span className="muted">{h.language.toUpperCase()}</span>
            </div>
            <blockquote>“{h.text}”</blockquote>
            <div className="hook-image">
              <Image size={17} />
              <div>
                <strong>İlk görüntü</strong>
                <p>
                  {h.firstImage ||
                    "İlk 2–3 saniyede ne görüyoruz? Henüz eklenmedi."}
                </p>
              </div>
            </div>
            <div className="hook-image">
              <Type size={17} />
              <div>
                <strong>Ekran metni</strong>
                <p>
                  {h.onScreen ||
                    "İlk karedeki başlık (2–6 kelime, konuşulanı tekrar etmez). Henüz eklenmedi."}
                </p>
              </div>
            </div>
            {h.note && <p className="muted">{h.note}</p>}
            <div className="hook-actions">
              <button
                className={
                  "button small " + (h.selected ? "secondary" : "primary")
                }
                onClick={() =>
                  void save(
                    idea.hooks.map((x) => ({ ...x, selected: x.id === h.id })),
                  )
                }
              >
                <Check size={14} />
                {h.selected ? "Seçili" : "Bu açılışı seç"}
              </button>
              <button
                className="button secondary small"
                onClick={() => setEditing(h)}
              >
                <PenLine size={14} />
                Düzenle
              </button>
            </div>
          </article>
        ))}
      </div>
      {!idea.hooks.length && (
        <Empty
          title="Hikâye ilk cümlesini bekliyor"
          text="İzleyiciye soruyu açın. Cevabın tamamını ilk cümlede tüketmeyin."
          action={
            <button className="button primary" onClick={() => setAdding(true)}>
              İlk hook’u yaz
            </button>
          }
        />
      )}{" "}
      {(adding || editing) && (
        <HookModal
          hook={editing || undefined}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
          onSave={async (hook) => {
            const hooks = editing
              ? idea.hooks.map((h) => (h.id === hook.id ? hook : h))
              : [...idea.hooks, hook];
            const updated = hooks.map((h) => ({
              ...h,
              selected: hook.selected ? h.id === hook.id : h.selected,
            }));
            if (await save(updated)) {
              setEditing(null);
              setAdding(false);
            }
          }}
          onDelete={
            editing
              ? async () => {
                  if (await save(idea.hooks.filter((h) => h.id !== editing.id)))
                    setEditing(null);
                }
              : undefined
          }
        />
      )}
    </>
  );
}
function HookModal({
  hook,
  onClose,
  onSave,
  onDelete,
}: {
  hook?: Hook;
  onClose: () => void;
  onSave: (h: Hook) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState<Hook>(
    hook ? { ...hook, onScreen: hook.onScreen ?? "" } : {
      id: crypto.randomUUID(),
      text: "",
      language: "tr",
      firstImage: "",
      onScreen: "",
      note: "",
      selected: false,
    },
  );
  return (
    <Modal
      title={hook ? "Açılışı düzenle" : "Yeni hook alternatifi"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <label>
          Açılış cümlesi
          <textarea
            required
            autoFocus
            rows={3}
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
          />
        </label>
        <label>
          İlk görüntü
          <textarea
            rows={3}
            value={form.firstImage}
            onChange={(e) => setForm({ ...form, firstImage: e.target.value })}
            placeholder="İlk karede göreceğimiz somut sahne"
          />
        </label>
        <label>
          Ekran metni
          <input
            value={form.onScreen}
            onChange={(e) => setForm({ ...form, onScreen: e.target.value })}
            placeholder="İlk karedeki başlık, 2–6 kelime"
          />
        </label>
        <label>
          Dil
          <select
            value={form.language}
            onChange={(e) =>
              setForm({ ...form, language: e.target.value as "tr" | "en" })
            }
          >
            <option value="tr">Türkçe</option>
            <option value="en">İngilizce</option>
          </select>
        </label>
        <label>
          Değerlendirme notu
          <textarea
            rows={2}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={form.selected}
            onChange={(e) => setForm({ ...form, selected: e.target.checked })}
          />
          Seçili açılış olarak kullan
        </label>
        <div className="modal-footer">
          {onDelete && (
            <button
              className="button danger ghost"
              type="button"
              onClick={onDelete}
            >
              Kaldır
            </button>
          )}
          <button className="button secondary" type="button" onClick={onClose}>
            Vazgeç
          </button>
          <button className="button primary">
            <Save size={15} />
            Kaydet
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Scripts({ idea, onNew }: { idea: Idea; onNew: () => void }) {
  const { data } = useWorkspace();
  const docs = data.documents.filter(
    (d) => d.kind === "script" && d.ideaIds.includes(idea.id),
  );
  const [selected, setSelected] = useState("");
  const doc = docs.find((d) => d.id === selected) || docs[0];
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Kelimelerden hikâyeye</h2>
          <p>
            Senaryonun dilini ve sürümlerini ayrı tutun. Süre, konuşma hızına
            göre tahmin edilir.
          </p>
        </div>
        <div className="inline-actions">
          {docs.length > 0 && (
            <select
              aria-label="Senaryo seçimi"
              value={doc.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} · {d.language.toUpperCase()}
                </option>
              ))}
            </select>
          )}
          <button className="button primary small" onClick={onNew}>
            <Plus size={15} />
            Yeni senaryo
          </button>
        </div>
      </div>
      {doc ? (
        <DocumentEditor key={doc.id} document={doc} />
      ) : (
        <Empty
          title="Bu fikrin senaryosu henüz yazılmadı"
          text="Araştırma notları bir senaryo değildir. Seçili hook’tan başlayarak yeni bir taslak oluşturun."
          action={
            <button className="button primary" onClick={onNew}>
              <Plus size={16} />
              Senaryo oluşturmaya başla
            </button>
          }
        />
      )}
    </>
  );
}

function Scenes({ idea }: { idea: Idea }) {
  const { action } = useWorkspace();
  const [scenes, setScenes] = useState<Scene[]>(idea.scenes),
    [version, setVersion] = useState(idea.version),
    [busy, setBusy] = useState(false);
  const total = scenes.reduce((n, s) => n + s.duration, 0);
  function field(id: string, key: keyof Scene, value: any) {
    setScenes((s) => s.map((x) => (x.id === id ? { ...x, [key]: value } : x)));
  }
  function move(n: number, delta: number) {
    const items = [...scenes];
    const other = n + delta;
    if (other < 0 || other >= items.length) return;
    [items[n], items[other]] = [items[other], items[n]];
    setScenes(items);
  }
  let elapsed = 0;
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Hikâyenin görüntüsü</h2>
          <p>Her sahne, anlatılan bilgiyi görünür kılsın.</p>
        </div>
        <div className="inline-actions">
          <Badge tone={total > 60 || total < 20 ? "warning" : "ready"}>
            Toplam {total} sn
          </Badge>
          <button
            className="button secondary small"
            onClick={() =>
              setScenes((s) => [
                ...s,
                {
                  id: crypto.randomUUID(),
                  duration: 5,
                  narration: "",
                  visual: "",
                  location: "",
                  character: "",
                  sound: "",
                },
              ])
            }
          >
            <Plus size={15} />
            Sahne ekle
          </button>
          <button
            disabled={busy}
            className="button primary small"
            onClick={async () => {
              setBusy(true);
              try {
                const saved = await action<Idea>(
                  "/ideas/" + idea.id,
                  "PUT",
                  { ...idea, version, scenes },
                  "Sahne akışı kaydedildi.",
                );
                setVersion(saved.version);
              } catch {
              } finally {
                setBusy(false);
              }
            }}
          >
            <Save size={15} />
            Akışı kaydet
          </button>
        </div>
      </div>
      {total > 60 && (
        <div className="warning-box">
          <AlertCircle size={18} />
          Sahne toplamı 60 saniyeyi aşıyor. Hedef süreyi gözden geçirin.
        </div>
      )}
      <div className="scene-list">
        {scenes.map((s, n) => {
          const start = elapsed;
          elapsed += s.duration;
          return (
            <article className="scene-card" key={s.id}>
              <div className="scene-time">
                <strong>{String(n + 1).padStart(2, "0")}</strong>
                <span>
                  {start}–{elapsed} sn
                </span>
                <div className="inline-actions">
                  <button
                    className="icon-button"
                    aria-label="Sahneyi yukarı taşı"
                    disabled={!n}
                    onClick={() => move(n, -1)}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Sahneyi aşağı taşı"
                    disabled={n === scenes.length - 1}
                    onClick={() => move(n, 1)}
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>
              <div className="scene-fields">
                <div className="form-grid">
                  <label>
                    Görüntü
                    <textarea
                      rows={3}
                      value={s.visual}
                      onChange={(e) => field(s.id, "visual", e.target.value)}
                      placeholder="Ne görüyoruz?"
                    />
                  </label>
                  <label>
                    Anlatım
                    <textarea
                      rows={3}
                      value={s.narration}
                      onChange={(e) => field(s.id, "narration", e.target.value)}
                      placeholder="Bu sahnede ne duyuyoruz?"
                    />
                  </label>
                </div>
                <div className="form-grid four">
                  <label>
                    Süre (sn)
                    <input
                      type="number"
                      min={0}
                      max={60}
                      step="0.5"
                      value={s.duration}
                      onChange={(e) =>
                        field(s.id, "duration", Number(e.target.value))
                      }
                    />
                  </label>
                  <label>
                    Mekân
                    <input
                      value={s.location}
                      onChange={(e) => field(s.id, "location", e.target.value)}
                    />
                  </label>
                  <label>
                    Karakter
                    <input
                      value={s.character}
                      onChange={(e) => field(s.id, "character", e.target.value)}
                    />
                  </label>
                  <label>
                    Ses notu
                    <input
                      value={s.sound}
                      onChange={(e) => field(s.id, "sound", e.target.value)}
                    />
                  </label>
                </div>
              </div>
              <button
                className="icon-button"
                aria-label="Sahneyi kaldır"
                onClick={() =>
                  setScenes((items) => items.filter((x) => x.id !== s.id))
                }
              >
                <Trash2 size={16} />
              </button>
            </article>
          );
        })}
      </div>
      {!scenes.length && (
        <Empty
          title="Henüz sahne yok"
          text="Görüntünün hikâyeyi nasıl taşıyacağını planlayın."
        />
      )}
    </>
  );
}

function IdeaHistory({ idea }: { idea: Idea }) {
  const q = useQuery({
    queryKey: ["idea-history", idea.id, idea.version],
    queryFn: () => api<any[]>("/ideas/" + idea.id + "/activity"),
  });
  return (
    <div className="panel activity-list">
      <h2>Fikrin geçmişi</h2>
      {q.isPending ? (
        <p className="muted">Geçmiş yükleniyor…</p>
      ) : q.isError ? (
        <p>Geçmiş yüklenemedi.</p>
      ) : (
        q.data.map((a) => (
          <div className="activity-item" key={a.id}>
            <span className="activity-dot" />
            <div>
              <strong>{a.label}</strong>
              <small>{new Date(a.createdAt).toLocaleString("tr-TR")}</small>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
