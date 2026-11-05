import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Lightbulb,
  FlaskConical,
  NotebookPen,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Clock3,
  FileText,
  Star,
  LayoutGrid,
  List,
  Download,
  RotateCcw,
  Filter,
  GripVertical,
  Upload,
  Save,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { useWorkspace, api } from "./api";
import {
  PageHeading,
  IdeaCard,
  Stage,
  Badge,
  Empty,
  dateLabel,
  titleOf,
  Modal,
} from "./components";
import {
  stageLabels,
  stages,
  scopeLabels,
  type Idea,
  type Settings,
} from "../shared/model";

export function Dashboard({ onNew }: { onNew: () => void }) {
  const { data } = useWorkspace();
  const [params] = useSearchParams();
  const active = data.ideas.filter(
    (i) =>
      !i.deleted && !i.archived && i.scope === "eligible" && i.triage !== "pending",
  );
  const ready = active.filter((i) => i.stage === "ready");
  const candidates = active
    .filter((i) => !["producing", "published"].includes(i.stage))
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        (a.externalNumber || 999) - (b.externalNumber || 999),
    );
  const filtered = data.searchMatches
    ? active.filter((i) => data.searchMatches!.ideas.includes(i.id))
    : candidates.slice(0, 3);
  const stats = [
    {
      label: "Aktif fikir",
      value: active.length,
      icon: Lightbulb,
      color: "blue",
      note: "Keşfedilmeyi bekleyen hikâyeler",
      link: "/ideas?scope=eligible",
    },
    {
      label: "Araştırılıyor",
      value: active.filter((i) => i.stage === "researching").length,
      icon: FlaskConical,
      color: "mint",
      note: "Kaynakların peşindeyiz",
      link: "/ideas?stage=researching",
    },
    {
      label: "Senaryo aşamasında",
      value: active.filter((i) => i.stage === "writing").length,
      icon: NotebookPen,
      color: "peach",
      note: "Kelimeler görüntüye dönüşüyor",
      link: "/ideas?stage=writing",
    },
    {
      label: "Üretime hazır",
      value: ready.length,
      icon: CheckCircle2,
      color: "lavender",
      note: "Bir sonraki adımı bekliyor",
      link: "/ideas?stage=ready",
    },
  ];
  const docs = data.documents
    .filter(
      (d) =>
        d.kind !== "original" &&
        d.ideaIds.some((id) => active.some((i) => i.id === id)),
    )
    .slice(0, 4);
  const gaps = candidates
    .filter(
      (i) =>
        !i.claims.length ||
        !i.hooks.some((h) => h.selected) ||
        !i.sourceIds.length,
    )
    .slice(0, 3);
  return (
    <>
      <section className="stats-grid">
        {stats.map((s) => (
          <Link key={s.label} className="stat-card" to={s.link}>
            <div className="stat-number">
              {s.value}
              <span>{s.label}</span>
            </div>
          </Link>
        ))}
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>
              {params.get("q")
                ? "Aramanızla eşleşen fikirler"
                : "Radarınızdaki fikirler"}
              <span className="tiny-count">
                {params.get("q") ? filtered.length : candidates.length}
              </span>
            </h2>
          </div>
          <Link
            className="text-link"
            to={
              "/ideas" +
              (params.get("q")
                ? "?q=" + encodeURIComponent(params.get("q")!)
                : "")
            }
          >
            Tüm fikirler
            <ArrowRight size={16} />
          </Link>
        </div>
        {filtered.length ? (
          <div className="idea-grid">
            {filtered.map((i) => (
              <IdeaCard key={i.id} idea={i} />
            ))}
          </div>
        ) : (
          <Empty
            title="Burada henüz bir fikir yok"
            text="Yeni bir soru ekleyin veya aramanızı değiştirin."
            action={
              <button className="button secondary" onClick={onNew}>
                <Plus size={16} />
                Fikir ekle
              </button>
            }
          />
        )}
      </section>
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Son dokümanlar</h2>
            </div>
            <Link
              to="/documents"
              className="icon-button"
              aria-label="Tüm dokümanlar"
            >
              <ArrowUpRight size={18} />
            </Link>
          </div>
          {docs.length ? (
            docs.map((d) => (
              <Link
                className="document-row"
                key={d.id}
                to={"/documents/" + d.id}
              >
                <span className="doc-icon">
                  <FileText size={19} />
                </span>
                <div>
                  <strong>{d.title.replace(" · Araştırma", "")}</strong>
                  <small>
                    {d.language.toUpperCase()} · Sürüm {d.version} ·{" "}
                    {dateLabel(d.updatedAt)}
                  </small>
                </div>
                <ChevronRight size={16} />
              </Link>
            ))
          ) : (
            <Empty title="Dokümanlar burada görünecek" />
          )}
        </section>
        <section className="panel next-steps">
          <div className="section-heading">
            <div>
              <h2>Sıradaki işler</h2>
            </div>
          </div>
          {gaps.map((i) => (
            <Link
              key={i.id}
              className="task-row"
              to={"/ideas/" + i.id + "?tab=research"}
            >
              <span className="task-circle" />
              <div>
                <strong>
                  {!i.sourceIds.length
                    ? "İlk kaynağı ekleyin"
                    : !i.claims.length
                      ? "İddiaları kaynaklarla eşleyin"
                      : "Araştırmayı tamamlayın"}
                </strong>
                <small>{titleOf(i)}</small>
              </div>
              <ArrowUpRight size={15} />
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}

export function Ideas({
  archive = false,
  onNew,
}: {
  archive?: boolean;
  onNew: () => void;
}) {
  const { data, action } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<string[]>([]);
  const [tagging, setTagging] = useState(false),
    [bulkTags, setBulkTags] = useState("");
  const view = params.get("view") || "grid";
  const bin = params.get("bin") === "1";
  function filter(key: string, v: string) {
    const p = new URLSearchParams(params);
    v ? p.set(key, v) : p.delete(key);
    setParams(p);
  }
  useEffect(() => setSelected([]), [params.toString(), archive]);
  let ideas = data.ideas.filter((i) =>
    archive
      ? bin
        ? i.deleted
        : !i.deleted && (i.archived || i.scope === "excluded")
      : !i.deleted &&
          !i.archived &&
          i.scope !== "excluded" &&
          i.triage !== "pending",
  );
  const q = params.get("q");
  if (q && data.searchMatches)
    ideas = ideas.filter((i) => data.searchMatches!.ideas.includes(i.id));
  for (const field of ["category", "stage", "scope"] as const) {
    const v = params.get(field);
    if (v) ideas = ideas.filter((i) => i[field] === v);
  }
  if (params.get("favorite")) ideas = ideas.filter((i) => i.favorite);
  const duration = params.get("duration");
  if (duration) {
    const [a, b] = duration.split("-").map(Number);
    ideas = ideas.filter((i) => i.durationMin <= b && i.durationMax >= a);
  }
  ideas.sort((a, b) =>
    params.get("sort") === "recent"
      ? b.updatedAt.localeCompare(a.updatedAt)
      : a.priority - b.priority ||
        (a.externalNumber || 999) - (b.externalNumber || 999),
  );
  async function bulk(what: string) {
    try {
      await action(
        "/ideas/bulk",
        "POST",
        {
          kind: what,
          items: selected.map((id) => ({
            id,
            version: data.ideas.find((i) => i.id === id)!.version,
          })),
          tags: bulkTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
        "Seçilen fikirler güncellendi.",
      );
      setSelected([]);
      return true;
    } catch {
      return false;
    }
  }
  return (
    <>
      <PageHeading
        eyebrow={
          archive ? "ARAŞTIRMALAR KAYBOLMASIN" : "MERAKINIZIN KÜTÜPHANESİ"
        }
        title={archive ? "Arşiv ve kapsam dışı" : "Fikir kütüphanesi"}
        description={
          archive
            ? "Ertelenen ve kapsam dışında kalan araştırmalarınız burada güvende."
            : "Bir soruyla başlayan bütün hikâyeler, tek bir yerde."
        }
        actions={
          <>
            <a
              className="button secondary"
              href={
                "/api/export?format=markdown" +
                "&ids=" +
                (selected.length ? selected : ideas.map((i) => i.id)).join(",")
              }
            >
              <Download size={16} />
              Dışa aktar
            </a>
            <button className="button primary" onClick={onNew}>
              <Plus size={16} />
              Yeni fikir
            </button>
          </>
        }
      />
      {archive && (
        <div className="tabs slim">
          <button
            className={!bin ? "active" : ""}
            onClick={() => filter("bin", "")}
          >
            Arşiv ve kapsam dışı
          </button>
          <button
            className={bin ? "active" : ""}
            onClick={() => filter("bin", "1")}
          >
            Çöp kutusu
          </button>
        </div>
      )}
      <div className="filter-bar">
        <div className="filter-controls">
          <Filter size={16} />
          <select
            aria-label="Kategori filtresi"
            value={params.get("category") || ""}
            onChange={(e) => filter("category", e.target.value)}
          >
            <option value="">Tüm kategoriler</option>
            {data.settings.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Aşama filtresi"
            value={params.get("stage") || ""}
            onChange={(e) => filter("stage", e.target.value)}
          >
            <option value="">Tüm aşamalar</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {stageLabels[s]}
              </option>
            ))}
          </select>
          <select
            aria-label="Kapsam filtresi"
            value={params.get("scope") || ""}
            onChange={(e) => filter("scope", e.target.value)}
          >
            <option value="">Tüm kapsamlar</option>
            <option value="eligible">Kapsama uygun</option>
            <option value="rewrite_required">Yeniden yazılmalı</option>
            {archive && <option value="excluded">Kapsam dışı</option>}
          </select>
          <select
            aria-label="Süre filtresi"
            value={params.get("duration") || ""}
            onChange={(e) => filter("duration", e.target.value)}
          >
            <option value="">Tüm süreler</option>
            <option value="20-30">20–30 sn</option>
            <option value="30-45">30–45 sn</option>
            <option value="45-60">45–60 sn</option>
          </select>
          <button
            className={
              "filter-favorite " + (params.get("favorite") ? "active" : "")
            }
            onClick={() =>
              filter("favorite", params.get("favorite") ? "" : "1")
            }
          >
            <Star size={15} />
            Favoriler
          </button>
        </div>
        <div className="view-controls">
          <span>{ideas.length} fikir</span>
          <button
            className={view === "grid" ? "active" : ""}
            aria-label="Kart görünümü"
            onClick={() => filter("view", "grid")}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={view === "list" ? "active" : ""}
            aria-label="Tablo görünümü"
            onClick={() => filter("view", "list")}
          >
            <List size={18} />
          </button>
        </div>
      </div>
      <div className="library-meta">
        <label className="check-label">
          <input
            type="checkbox"
            checked={!!ideas.length && selected.length === ideas.length}
            onChange={(e) =>
              setSelected(e.target.checked ? ideas.map((i) => i.id) : [])
            }
          />
          Tümünü seç
        </label>
        {selected.length ? (
          <div className="bulk-actions">
            <strong>{selected.length} seçili</strong>
            <button onClick={() => void bulk("priority")}>Öncelik ver</button>
            <button onClick={() => setTagging(true)}>Etiket ekle</button>
            <button onClick={() => void bulk(archive ? "restore" : "archive")}>
              {archive ? "Geri al" : "Arşivle"}
            </button>
            <a href={"/api/export?format=json&ids=" + selected.join(",")}>
              JSON indir
            </a>
          </div>
        ) : (
          <span>Marka merkezli hikâyeler aktif listede gösterilmez.</span>
        )}
        <select
          aria-label="Sıralama"
          value={params.get("sort") || "priority"}
          onChange={(e) => filter("sort", e.target.value)}
        >
          <option value="priority">Öncelik sırası</option>
          <option value="recent">Son güncellenen</option>
        </select>
      </div>
      {ideas.length ? (
        view === "grid" ? (
          <div className="idea-grid library-grid">
            {ideas.map((i) => (
              <div
                className={
                  "selectable-card " +
                  (selected.includes(i.id) ? "checked" : "")
                }
                key={i.id}
              >
                <input
                  className="card-checkbox"
                  aria-label={i.title + " seç"}
                  type="checkbox"
                  checked={selected.includes(i.id)}
                  onChange={(e) =>
                    setSelected((s) =>
                      e.target.checked
                        ? [...s, i.id]
                        : s.filter((x) => x !== i.id),
                    )
                  }
                />
                <IdeaCard idea={i} />
              </div>
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th />
                  <th>Fikir</th>
                  <th>Kategori</th>
                  <th>Süre</th>
                  <th>Aşama</th>
                  <th>Kapsam</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ideas.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <input
                        aria-label={i.title + " seç"}
                        type="checkbox"
                        checked={selected.includes(i.id)}
                        onChange={(e) =>
                          setSelected((s) =>
                            e.target.checked
                              ? [...s, i.id]
                              : s.filter((x) => x !== i.id),
                          )
                        }
                      />
                    </td>
                    <td>
                      <Link className="table-title" to={"/ideas/" + i.id}>
                        {titleOf(i)}
                      </Link>
                      <small>
                        Öncelik {i.priority} · {dateLabel(i.updatedAt)}
                      </small>
                    </td>
                    <td>{i.category}</td>
                    <td className="nowrap">
                      {i.durationMin}–{i.durationMax} sn
                    </td>
                    <td>
                      <Stage value={i.stage} />
                    </td>
                    <td>
                      <Badge tone={i.scope}>{scopeLabels[i.scope]}</Badge>
                    </td>
                    <td>
                      <Link aria-label="Fikri aç" to={"/ideas/" + i.id}>
                        <ArrowUpRight size={17} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <Empty
          title={
            bin ? "Çöp kutusu boş" : "Bu filtrelere uygun fikir bulunamadı"
          }
          text="Filtreleri değiştirin veya aklınızdaki yeni fikri ekleyin."
          action={
            <button className="button secondary" onClick={() => setParams({})}>
              Filtreleri temizle
            </button>
          }
        />
      )}{" "}
      {tagging && (
        <Modal
          title="Seçilen fikirlere etiket ekle"
          onClose={() => setTagging(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await bulk("tags")) {
                setTagging(false);
                setBulkTags("");
              }
            }}
          >
            <label>
              Etiketler
              <input
                autoFocus
                required
                value={bulkTags}
                onChange={(e) => setBulkTags(e.target.value)}
                placeholder="Örn. Öncelikli, Kısa format"
              />
            </label>
            <p className="form-help">
              {selected.length} fikrin mevcut etiketleri korunur.
            </p>
            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setTagging(false)}
              >
                Vazgeç
              </button>
              <button className="button primary">Etiketleri ekle</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function Pipeline() {
  const { data, action } = useWorkspace();
  const active = data.ideas.filter(
    (i) =>
      !i.deleted && !i.archived && i.scope === "eligible" && i.triage !== "pending",
  );
  async function move(i: Idea, stage: string) {
    try {
      await action(
        "/ideas/" + i.id,
        "PUT",
        { ...i, stage },
        "Üretim aşaması güncellendi.",
      );
    } catch {}
  }
  return (
    <>
      <PageHeading
        eyebrow="FİKİRDEN YAYINA"
        title="Hikâyelerin yolculuğu"
        description="Kartları taşıyın veya aşama menüsünü kullanın. Her fikir kendi hızında ilerlesin."
      />
      <div className="pipeline">
        {stages.map((stage) => (
          <section
            key={stage}
            className="pipeline-column"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/idea");
              const i = active.find((i) => i.id === id);
              if (i) void move(i, stage);
            }}
          >
            <div className="pipeline-head">
              <span className={"stage-dot " + stage} />
              <h2>{stageLabels[stage]}</h2>
              <span>{active.filter((i) => i.stage === stage).length}</span>
            </div>
            <div className="pipeline-cards">
              {active
                .filter((i) => i.stage === stage)
                .sort((a, b) => a.priority - b.priority)
                .map((i) => (
                  <article
                    key={i.id}
                    className="pipeline-card"
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/idea", i.id)
                    }
                  >
                    <div className="pipeline-category">
                      <span>{i.category}</span>
                      <GripVertical size={14} />
                    </div>
                    <Link to={"/ideas/" + i.id}>
                      <h3>{titleOf(i)}</h3>
                    </Link>
                    <p>{i.hooks.find((h) => h.selected)?.text || i.summary}</p>
                    <div className="pipeline-card-footer">
                      <span>
                        <Clock3 size={12} />
                        {i.durationMin}–{i.durationMax} sn
                      </span>
                      <Badge tone={i.priority === 1 ? "priority" : "neutral"}>
                        P{i.priority}
                      </Badge>
                    </div>
                    <select
                      aria-label={i.title + " aşaması"}
                      value={i.stage}
                      onChange={(e) => void move(i, e.target.value)}
                    >
                      {stages.map((s) => (
                        <option key={s} value={s}>
                          {stageLabels[s]}
                        </option>
                      ))}
                    </select>
                  </article>
                ))}
              {!active.some((i) => i.stage === stage) && (
                <div className="pipeline-placeholder">
                  Bir hikâyeye
                  <br />
                  burada yer var.
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

export function SettingsPage() {
  const { data, action, notify } = useWorkspace();
  const [form, setForm] = useState<Settings>(data.settings),
    [cats, setCats] = useState(data.settings.categories.join("\n"));
  const [preview, setPreview] = useState<any>(null),
    [restore, setRestore] = useState<File | null>(null),
    [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="SİZE GÖRE BİR ÇALIŞMA ALANI"
        title="Ayarlar ve veri yönetimi"
        description="Editoryal tercihlerinizi düzenleyin, araştırmalarınızı yanınıza alın."
      />
      <div className="settings-grid">
        <section className="panel">
          <h2>Çalışma alanı</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await action(
                  "/settings",
                  "PUT",
                  {
                    ...form,
                    categories: [
                      ...new Set(
                        cats
                          .split("\n")
                          .map((c) => c.trim())
                          .filter(Boolean),
                      ),
                    ],
                  },
                  "Ayarlar kaydedildi.",
                );
              } catch {}
            }}
          >
            <label>
              Kanalın vaadi
              <textarea
                rows={2}
                value={form.channelPromise}
                onChange={(e) =>
                  setForm({ ...form, channelPromise: e.target.value })
                }
              />
            </label>
            <div className="form-grid">
              <label>
                Konuşma hızı (kelime/dk)
                <input
                  type="number"
                  min={60}
                  max={300}
                  required
                  value={form.wordsPerMinute}
                  onChange={(e) =>
                    setForm({ ...form, wordsPerMinute: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Varsayılan içerik dili
                <select
                  value={form.defaultLanguage}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      defaultLanguage: e.target.value as "tr" | "en",
                    })
                  }
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">İngilizce</option>
                </select>
              </label>
            </div>
            <p className="form-help">
              Bu hızdan hesaplanan süre tahmindir; ölçülen ses süresi ayrı
              tutulur.
            </p>
            <label>
              Kategoriler · her satıra bir tane
              <textarea
                rows={7}
                value={cats}
                onChange={(e) => setCats(e.target.value)}
              />
            </label>
            <button className="button primary">
              <Save size={16} />
              Ayarları kaydet
            </button>
          </form>
        </section>
        <div className="settings-stack">
          <section className="panel">
            <div className="section-heading">
              <h2>Verileriniz sizde kalsın</h2>
              <ShieldCheck size={21} />
            </div>
            <p className="muted">
              Tam yedek; fikirlerinizi, sürüm geçmişini ve yüklediğiniz
              dosyaları içerir.
            </p>
            <div className="button-stack">
              <a className="button secondary" href="/api/backup">
                <Download size={16} />
                Tam yedek indir (.zip)
              </a>
              <a className="button secondary" href="/api/export?format=json">
                <FileText size={16} />
                Fikirleri JSON olarak indir
              </a>
              <a
                className="button secondary"
                href="/api/export?format=markdown"
              >
                <FileText size={16} />
                Fikirleri Markdown olarak indir
              </a>
              <label className="button secondary upload-button">
                <Upload size={16} />
                Yedekten geri yükle
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    setRestore(e.target.files?.[0] || null);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </section>
          <section className="panel">
            <h2>Araştırmaları içe aktar</h2>
            <p className="muted">
              Depodaki iki araştırma dokümanını kontrol eder. Aynı fikirler
              tekrar eklenmez; değişen kaynaklar inceleme için işaretlenir.
            </p>
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  setPreview(await api("/import/preview"));
                } catch (e) {
                  notify((e as Error).message, true);
                }
              }}
            >
              <Upload size={16} />
              İçe aktarmayı önizle
            </button>
          </section>
          <section className="policy-card">
            <ShieldCheck size={22} />
            <h3>Markasız hikâyeler</h3>
            <p>
              Şirket ve markalı ürün merkezli hikâyeler kapsam dışı tutulur.
              Araştırma kurumları ve tarihî yerlerin adları bu sınırlamaya
              girmez.
            </p>
          </section>
        </div>
      </div>
      {preview && (
        <Modal
          title="Araştırma import önizlemesi"
          wide
          onClose={() => setPreview(null)}
        >
          <p className="muted">
            Değişmiş bölümler mevcut düzenlemelerinizin üzerine yazılmaz.
            Orijinal araştırmayı Dokümanlar bölümünden karşılaştırabilirsiniz.
          </p>
          <div className="import-list">
            {preview.items.map((i: any) => (
              <div key={i.externalId}>
                <span>
                  {i.originalNumber}. {i.title}
                </span>
                <Badge
                  tone={
                    i.action === "conflict"
                      ? "warning"
                      : i.action === "create"
                        ? "ready"
                        : "neutral"
                  }
                >
                  {i.action === "conflict"
                    ? "Kaynak değişmiş"
                    : i.action === "create"
                      ? "Yeni kayıt"
                      : "Zaten mevcut"}
                </Badge>
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setPreview(null)}
            >
              Kapat
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await action(
                    "/import",
                    "POST",
                    {},
                    "İçe aktarma tamamlandı.",
                  );
                  notify(
                    `${r.created} yeni, ${r.unchanged} değişmemiş, ${r.conflicts} inceleme bekliyor.`,
                  );
                  setPreview(null);
                } catch {
                } finally {
                  setBusy(false);
                }
              }}
            >
              Yeni kayıtları içe aktar
            </button>
          </div>
        </Modal>
      )}
      {restore && (
        <Modal
          title="Çalışma alanını yedekten geri yükle"
          onClose={() => setRestore(null)}
        >
          <div className="warning-box">
            <AlertCircle size={20} />
            <p>
              <strong>{restore.name}</strong> içindeki çalışma alanı mevcut
              kayıtların yerini alacak. İşlemden önce mevcut verinizin kurtarma
              yedeği otomatik alınır.
            </p>
          </div>
          <p className="muted">
            Bu işlem yalnızca Ideation tarafından oluşturulan tam yedekleri
            kabul eder.
          </p>
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setRestore(null)}
            >
              Vazgeç
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const f = new FormData();
                f.append("file", restore);
                try {
                  await action("/restore", "POST", f, "Yedek geri yüklendi.");
                  setRestore(null);
                } catch {
                } finally {
                  setBusy(false);
                }
              }}
            >
              <RotateCcw size={16} />
              Geri yükle
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
