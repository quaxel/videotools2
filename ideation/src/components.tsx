import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Clock3,
  Star,
  X,
  Plus,
  Coffee,
  FlaskConical,
  Bridge,
  Radio,
  BookOpen,
  Printer,
  Coins,
  TrafficCone,
  Lightbulb,
  Atom,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { stageLabels, scopeLabels, newIdea, type Idea } from "../shared/model";
import { useWorkspace } from "./api";
import inventory from "../seed/import-manifest.json";

export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const d = ref.current;
    d?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      "input:not([type=hidden]),textarea",
    )?.focus();
    const close = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d?.addEventListener("cancel", close);
    return () => {
      d?.removeEventListener("cancel", close);
      d?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={"modal " + (wide ? "wide" : "")}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Kapat" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
export function Stage({ value }: { value: string }) {
  return <Badge tone={value}>{stageLabels[value] || value}</Badge>;
}
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Lightbulb size={28} />
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{actions}</div>
    </div>
  );
}
export function NewIdea({ onClose }: { onClose: () => void }) {
  const { data, action } = useWorkspace();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(data.settings.categories[0]);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Yeni bir fikir ekle" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const idea = await action<Idea>(
              "/ideas",
              "POST",
              { ...newIdea(title), category, summary },
              "Yeni fikir kaydedildi.",
            );
            onClose();
            navigate("/ideas/" + idea.id);
          } catch {
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Fikrin başlığı
          <input
            required
            autoFocus
            maxLength={300}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Aklınıza takılan o soru…"
          />
        </label>
        <label>
          Kategori
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {data.settings.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Kısa not
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="Neyi araştırmak istiyorsunuz?"
          />
        </label>
        <p className="form-help">
          Detayları sonra tamamlayabilirsiniz. Fikir, havuza eklenir.
        </p>
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button className="button primary" disabled={busy || !title.trim()}>
            <Plus size={16} />
            Fikri kaydet
          </button>
        </div>
      </form>
    </Modal>
  );
}
export const displayTitles: Record<number, string> = {
  1: "Pembe olmayan margarin neden yasaktı?",
  2: "Filmlerdeki nükleer iz",
  3: "Avrupa’nın kaybolan altı dakikası",
  4: "Yazıcının gizli sarı noktaları",
  5: "Hiçbir şey olmadan trafik nasıl sıkışır?",
  6: "Suyun üstündeki 96 milyon siyah top",
  7: "İlk webcam neden kahveyi izliyordu?",
  8: "Tasarruflu ışıklar kar altında kaldı",
  9: "İnternetin lav lambaları",
  10: "Metal kokusu aslında nereden geliyor?",
  11: "Peynirin kaybolan delikleri",
  12: "IKEA’nın sönen koltukları",
  13: "Sıvıya dönüşen Nobel madalyaları",
  14: "İnsanlar yürüdü, köprü sallandı",
  15: "Bir kuştan ilham alan tren",
  16: "Yeşil kitapların gizlediği arsenik",
  17: "Folyo metalinin pahalı günleri",
  18: "Hollywood aslında bir reklamdı",
  19: "Eyfel’i korumaya yardım eden radyo",
  20: "Uçarken uzayan Concorde",
};
export function titleOf(idea: Idea) {
  return idea.externalNumber &&
    inventory.ideas.some(
      (i) => i.originalNumber === idea.externalNumber && i.title === idea.title,
    )
    ? displayTitles[idea.externalNumber] || idea.title
    : idea.title;
}
export function Art({ idea, small = false }: { idea: Idea; small?: boolean }) {
  const n = idea.externalNumber || 0;
  const kind = [1, 11].includes(n)
    ? "food"
    : [7].includes(n)
      ? "coffee"
      : [13, 2].includes(n)
        ? "lab"
        : [3, 8, 10, 17, 20].includes(n)
          ? "science"
          : [14, 19, 18, 6].includes(n)
            ? "city"
            : "tech";
  const Icon =
    n === 11
      ? Lightbulb
      : n === 7
        ? Coffee
        : n === 13
          ? FlaskConical
          : n === 14
            ? Bridge
            : n === 19
              ? Radio
              : n === 16
                ? BookOpen
                : n === 4
                  ? Printer
                  : n === 17
                    ? Coins
                    : n === 5
                      ? TrafficCone
                      : n === 3
                        ? Clock3
                        : n === 10
                          ? Atom
                          : Lightbulb;
  return (
    <div
      className={"art art-" + kind + (small ? " small" : "")}
      aria-hidden="true"
    >
      <div className="art-orbit" />
      <div className="art-grid" />
      <span className="art-spark s1">+</span>
      <span className="art-spark s2">✦</span>
      <span className="art-dot d1" />
      <span className="art-dot d2" />
      {n === 1 ? (
        <div className="butter">
          <div className="butter-lid">MARGARİN</div>
          <div className="butter-face">
            <i />
            <i />
            <span>PEMBE?</span>
          </div>
        </div>
      ) : n === 11 ? (
        <svg className="cheese-drawing" viewBox="0 0 180 130">
          <path
            d="M20 54 124 17 161 52 68 93Z"
            fill="#ffdc67"
            stroke="#875f1c"
            strokeWidth="2"
          />
          <path
            d="M20 54v45l48 23V93Z"
            fill="#f6ba47"
            stroke="#875f1c"
            strokeWidth="2"
          />
          <path
            d="m68 93 93-41v44l-93 26Z"
            fill="#ffd267"
            stroke="#875f1c"
            strokeWidth="2"
          />
          {[
            [60, 52, 7],
            [109, 37, 6],
            [119, 60, 8],
            [87, 77, 5],
            [93, 101, 6],
            [139, 84, 7],
            [40, 86, 5],
          ].map(([x, y, r], i) => (
            <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.7} fill="#d69c35" />
          ))}
        </svg>
      ) : (
        <div className="art-object">
          <Icon strokeWidth={1.2} />
          {n === 13 && <span className="liquid" />}
        </div>
      )}
      <span className="art-code">
        {n ? String(n).padStart(2, "0") : "✦"} / IDEATION
      </span>
    </div>
  );
}
export function IdeaCard({ idea }: { idea: Idea }) {
  const { action } = useWorkspace();
  const hook = idea.hooks.find((h) => h.selected);
  return (
    <article className="idea-card">
      <Link to={"/ideas/" + idea.id} className="art-link" tabIndex={-1}>
        <Art idea={idea} />
      </Link>
      <button
        className={"favorite icon-button " + (idea.favorite ? "selected" : "")}
        aria-label={idea.favorite ? "Favorilerden çıkar" : "Favorilere ekle"}
        onClick={() =>
          void action(
            "/ideas/" + idea.id,
            "PUT",
            { ...idea, favorite: !idea.favorite },
            "Favoriler güncellendi.",
          ).catch(() => {})
        }
      >
        <Star size={17} fill={idea.favorite ? "currentColor" : "none"} />
      </button>
      <div className="card-body">
        <div className="card-category">
          {idea.category}
          <ArrowUpRight size={15} />
        </div>
        <Link to={"/ideas/" + idea.id}>
          <h3>{titleOf(idea)}</h3>
        </Link>
        <p>
          {hook?.text ||
            idea.summary ||
            "Bu fikrin hikâyesini birlikte geliştirin."}
        </p>
        <div className="card-footer">
          <Stage value={idea.stage} />
          <span>
            <Clock3 size={13} />
            {idea.durationMin}–{idea.durationMax} sn
          </span>
        </div>
        {idea.scope !== "eligible" && (
          <div className="card-scope">
            <AlertCircle size={12} />
            {scopeLabels[idea.scope]}
          </div>
        )}
      </div>
    </article>
  );
}
export function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
}
export function Readiness({ idea }: { idea: Idea }) {
  const missing = [
    !idea.hooks.some((h) => h.selected) && "Hook seçilmedi",
    !idea.sourceIds.length && "Kaynak eklenmedi",
    !idea.claims.length && "İddialar ayrıştırılmadı",
    idea.claims.some((c) => c.status === "unreviewed") &&
      "İncelenmemiş iddia var",
    !idea.scenes.length && "Sahne akışı eksik",
    idea.scope !== "eligible" && "Kapsam uygun değil",
  ].filter(Boolean) as string[];
  return (
    <div className="readiness">
      {missing.length ? (
        missing.map((x) => (
          <span key={x}>
            <AlertCircle size={14} />
            {x}
          </span>
        ))
      ) : (
        <span className="success">
          <CheckCircle2 size={14} />
          Temel alanlar tamamlandı; son editoryal incelemeyi yapın.
        </span>
      )}
    </div>
  );
}
