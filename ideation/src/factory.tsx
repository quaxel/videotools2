import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  X,
  AlertTriangle,
  Copy,
  ExternalLink,
  Terminal,
  RotateCcw,
  ArrowUpRight,
} from "lucide-react";
import { useWorkspace } from "./api";
import { Empty } from "./components";
import { criteria, scoreRubric } from "../shared/rubric";
import type { Idea } from "../shared/model";

type Tab = "pending" | "kept" | "rejected";
const tabs: [Tab, string][] = [
  ["pending", "Bekleyen"],
  ["kept", "Tutulan"],
  ["rejected", "Elenen"],
];
const verdictLabel = { pass: "Geçti", fail: "Kaldı", unknown: "Belirsiz" };

function tone(score: number | null, eligible: boolean) {
  if (!eligible) return "bad";
  if (score == null) return "muted";
  return score >= 75 ? "good" : score >= 55 ? "mid" : "low";
}

export function FactoryPage() {
  const { data, action, notify } = useWorkspace();
  const [tab, setTab] = useState<Tab>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const reasonRef = useRef<HTMLInputElement>(null);
  const generated = data.ideas.filter(
    (i) => i.origin === "generated" && !i.deleted,
  );
  const list = useMemo(
    () =>
      generated
        .filter((i) => i.triage === tab)
        .sort(
          (a, b) =>
            Number(scoreRubric(b.rubric).eligible) -
              Number(scoreRubric(a.rubric).eligible) ||
            (b.rubricScore ?? 0) - (a.rubricScore ?? 0),
        ),
    [generated, tab],
  );
  const selected =
    list.find((i) => i.id === selectedId) || list[0] || null;
  const counts = Object.fromEntries(
    tabs.map(([t]) => [t, generated.filter((i) => i.triage === t).length]),
  ) as Record<Tab, number>;

  useEffect(() => {
    setReason("");
    document
      .querySelector(".factory-queue button.active")
      ?.scrollIntoView({ block: "nearest" });
  }, [selected?.id]);

  async function decide(idea: Idea, decision: Tab) {
    const index = list.findIndex((i) => i.id === idea.id);
    const next = list[index + 1] || list[index - 1];
    await action(
      `/ideas/${idea.id}/triage`,
      "POST",
      { decision, reason, version: idea.version },
      decision === "kept"
        ? "Fikir havuzuna alındı."
        : decision === "rejected"
          ? "Elendi; tekrar kontrolü için saklanıyor."
          : "Eleme kuyruğuna geri alındı.",
    ).catch(() => {});
    setSelectedId(next?.id ?? null);
  }

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        if (e.key === "Escape") target.blur();
        if (e.key === "Enter" && target === reasonRef.current && selected)
          void decide(selected, "rejected");
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || !list.length) return;
      const i = Math.max(0, list.findIndex((x) => x.id === selected?.id));
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedId(list[Math.min(list.length - 1, i + 1)].id);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedId(list[Math.max(0, i - 1)].id);
      } else if (e.key === "y" && selected && tab === "pending") {
        void decide(selected, "kept");
      } else if (e.key === "n" && selected && tab === "pending") {
        e.preventDefault();
        reasonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  return (
    <div className="factory">
      <div className="page-heading">
        <div>
          <h1>Fikir fabrikası</h1>
          <p>
            Üretilen adaylar kalite ölçütlerine göre sıralanır. Tuttukların fikir
            havuzuna geçer; elediklerin bir daha önerilmemesi için saklanır.
          </p>
        </div>
      </div>
      <div className="factory-run">
        <Terminal size={16} />
        <span>
          Yeni aday üretmek için Claude Code'da çalıştır:
          <code>/ideate 10</code>
          <small>veya bir tohumla: /ideate 10 havalimanları</small>
        </span>
        <button
          className="icon-button"
          aria-label="Komutu kopyala"
          onClick={() => {
            void navigator.clipboard?.writeText("/ideate 10");
            notify("Komut kopyalandı.");
          }}
        >
          <Copy size={15} />
        </button>
      </div>
      <div className="factory-tabs" role="tablist">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => {
              setTab(t);
              setSelectedId(null);
            }}
          >
            {label}
            <span>{counts[t]}</span>
          </button>
        ))}
        <small className="factory-keys">
          <kbd>j</kbd>/<kbd>k</kbd> gez · <kbd>y</kbd> tut · <kbd>n</kbd> ele
        </small>
      </div>
      {!list.length ? (
        <Empty
          title={
            tab === "pending" ? "Eleme bekleyen aday yok" : "Bu listede aday yok"
          }
          text={
            tab === "pending"
              ? "Claude Code'da /ideate çalıştırınca adaylar burada sıralanır."
              : undefined
          }
        />
      ) : (
        <div className="factory-grid">
          <ol className="factory-queue">
            {list.map((i) => {
              const r = scoreRubric(i.rubric);
              return (
                <li key={i.id}>
                  <button
                    className={i.id === selected?.id ? "active" : ""}
                    onClick={() => setSelectedId(i.id)}
                  >
                    <span className={"score-chip " + tone(i.rubricScore, r.eligible)}>
                      {r.eligible ? i.rubricScore ?? "–" : "✕"}
                    </span>
                    <span className="queue-text">
                      <strong>{i.title}</strong>
                      <small>
                        {i.category}
                        {i.dupes.length > 0 && (
                          <em className="dupe-flag">
                            <Copy size={11} /> benzer
                          </em>
                        )}
                      </small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {selected && (
            <Candidate
              idea={selected}
              tab={tab}
              reason={reason}
              setReason={setReason}
              reasonRef={reasonRef}
              decide={decide}
              sources={data.sources.filter((s) =>
                selected.sourceIds.includes(s.id),
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Candidate({
  idea,
  tab,
  reason,
  setReason,
  reasonRef,
  decide,
  sources,
}: {
  idea: Idea;
  tab: Tab;
  reason: string;
  setReason: (v: string) => void;
  reasonRef: React.RefObject<HTMLInputElement | null>;
  decide: (idea: Idea, d: Tab) => Promise<void>;
  sources: { id: string; url: string; title: string; publisher: string }[];
}) {
  const r = scoreRubric(idea.rubric);
  const by = new Map(idea.rubric.map((e) => [e.key, e]));
  const hook = idea.hooks.find((h) => h.selected) || idea.hooks[0];
  return (
    <article className="candidate">
      <header className="candidate-head">
        <div>
          <div className="card-category">{idea.category}</div>
          <h2>{idea.title}</h2>
          {idea.titleEn && <p className="title-en">{idea.titleEn}</p>}
        </div>
        <div className={"score-ring " + tone(idea.rubricScore, r.eligible)}>
          <strong>{r.eligible ? idea.rubricScore ?? "–" : "✕"}</strong>
          <small>{r.eligible ? "/ 100" : "kapı"}</small>
        </div>
      </header>

      {!r.eligible && (
        <div className="candidate-alert bad">
          <AlertTriangle size={16} />
          Geçemediği kapı:{" "}
          {r.failedGates
            .map((k) => criteria.find((c) => c.key === k)?.label)
            .join(", ")}
        </div>
      )}
      {r.eligible && r.unsureGates.length > 0 && (
        <div className="candidate-alert warn">
          <AlertTriangle size={16} />
          Doğrulanamayan kapı:{" "}
          {r.unsureGates
            .map((k) => criteria.find((c) => c.key === k)?.label)
            .join(", ")}
        </div>
      )}
      {idea.dupes.length > 0 && (
        <div className="candidate-alert warn">
          <Copy size={16} />
          <div>
            <strong>Benzer içerik var</strong>
            {idea.dupes.map((d) => (
              <div key={d.kind + d.ref} className="dupe-row">
                <span className="dupe-score">{Math.round(d.score * 100)}%</span>
                {d.kind === "idea" ? (
                  <Link to={"/ideas/" + d.ref}>{d.title}</Link>
                ) : (
                  <span>{d.title}</span>
                )}
                <small>{d.why}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {hook && (
        <section className="candidate-hook">
          <span>Hook</span>
          <p>“{hook.text}”</p>
          {hook.firstImage && <small>İlk görüntü: {hook.firstImage}</small>}
        </section>
      )}

      <dl className="candidate-facts">
        {idea.question && (
          <>
            <dt>Soru</dt>
            <dd>{idea.question}</dd>
          </>
        )}
        {idea.mechanism && (
          <>
            <dt>Mekanizma</dt>
            <dd>{idea.mechanism}</dd>
          </>
        )}
        {idea.summary && (
          <>
            <dt>Hikâye</dt>
            <dd>{idea.summary}</dd>
          </>
        )}
        {idea.rubricSummary && (
          <>
            <dt>Değerlendirme</dt>
            <dd>{idea.rubricSummary}</dd>
          </>
        )}
      </dl>

      <table className="rubric-table">
        <tbody>
          {criteria.map((c) => {
            const e = by.get(c.key);
            const v = e?.verdict ?? "unknown";
            return (
              <tr key={c.key} className={c.gate ? "gate" : ""}>
                <th>
                  {c.label}
                  {c.gate && <span className="gate-tag">kapı</span>}
                </th>
                <td>
                  <span className={"verdict " + v}>{verdictLabel[v]}</span>
                </td>
                <td>
                  {e?.reason || <span className="muted-cell">—</span>}
                  {e?.evidence && <small>{e.evidence}</small>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {(sources.length > 0 || idea.limitations) && (
        <section className="candidate-more">
          {sources.length > 0 && (
            <>
              <h3>Açılan kaynaklar</h3>
              <ul>
                {sources.map((s) => (
                  <li key={s.id}>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.title}
                      <ExternalLink size={12} />
                    </a>
                    {s.publisher && <small>{s.publisher}</small>}
                  </li>
                ))}
              </ul>
            </>
          )}
          {idea.limitations && (
            <>
              <h3>Riskler</h3>
              <p>{idea.limitations}</p>
            </>
          )}
        </section>
      )}

      <footer className="candidate-actions">
        {tab === "pending" ? (
          <>
            <input
              ref={reasonRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Eleme nedeni (isteğe bağlı, Enter ile ele)"
              aria-label="Eleme nedeni"
            />
            <button
              className="button secondary"
              onClick={() => void decide(idea, "rejected")}
            >
              <X size={16} />
              Ele
            </button>
            <button
              className="button primary"
              onClick={() => void decide(idea, "kept")}
            >
              <Check size={16} />
              Tut
            </button>
          </>
        ) : (
          <>
            {idea.triageReason && (
              <span className="triage-reason">{idea.triageReason}</span>
            )}
            <button
              className="button secondary"
              onClick={() => void decide(idea, "pending")}
            >
              <RotateCcw size={15} />
              Kuyruğa geri al
            </button>
          </>
        )}
        <Link className="button ghost" to={"/ideas/" + idea.id}>
          Detay
          <ArrowUpRight size={15} />
        </Link>
      </footer>
    </article>
  );
}
