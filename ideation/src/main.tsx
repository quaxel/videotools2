import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Lightbulb,
  BookOpen,
  Files,
  Columns3,
  Archive,
  Settings,
  Plus,
  Search,
  Menu,
  X,
  ArrowUpRight,
  Command,
} from "lucide-react";
import { Workspace, useWorkspace } from "./api";
import { NewIdea } from "./components";
import { Dashboard, Ideas, Pipeline, SettingsPage } from "./pages";
const IdeaDetail = lazy(() =>
  import("./detail").then((m) => ({ default: m.IdeaDetail })),
);
const Documents = lazy(() =>
  import("./research").then((m) => ({ default: m.Documents })),
);
const Sources = lazy(() =>
  import("./research").then((m) => ({ default: m.Sources })),
);
import "./styles.css";
const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15000, refetchOnWindowFocus: false },
  },
});
const nav = [
  ["/", "Dashboard", LayoutDashboard],
  ["/ideas", "Fikir kütüphanesi", Lightbulb],
  ["/sources", "Araştırma", BookOpen],
  ["/documents", "Dokümanlar", Files],
  ["/pipeline", "Üretim panosu", Columns3],
] as const;
function App() {
  const { data } = useWorkspace();
  const [adding, setAdding] = useState(false),
    [mobile, setMobile] = useState(false);
  const [params, setParams] = useSearchParams();
  const search = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(params.get("q") || "");
  const location = useLocation();
  useEffect(() => {
    setDraft(params.get("q") || "");
  }, [params.get("q")]);
  useEffect(() => {
    setMobile(false);
  }, [location.pathname]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      if (draft === (params.get("q") || "")) return;
      const p = new URLSearchParams(params);
      draft ? p.set("q", draft) : p.delete("q");
      setParams(p, { replace: true });
    }, 250);
    return () => clearTimeout(t);
  }, [draft, params, setParams]);
  const count = data.ideas.filter(
    (i) => !i.deleted && !i.archived && i.scope !== "excluded",
  ).length;
  return (
    <div className="app">
      <button
        className={"sidebar-scrim " + (mobile ? "visible" : "")}
        aria-label="Menüyü kapat"
        onClick={() => setMobile(false)}
      />
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <Link to="/" className="brand">
          <div className="brand-symbol">
            i<span>✦</span>
          </div>
          <div>
            ideation<span>FİKİRDEN HİKÂYEYE</span>
          </div>
        </Link>
        <div className="workspace-label">
          <span className="workspace-icon">V</span>
          <div>
            Video çalışma alanı<small>Kişisel kütüphaneniz</small>
          </div>
        </div>
        <div className="nav-caption">ÇALIŞMA ALANI</div>
        <nav>
          {nav.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <Icon size={18} />
              {label}
              {to === "/ideas" && <span className="nav-count">{count}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>✦</span>
          <strong>
            İyi hikâyeler,
            <br />
            iyi sorularla başlar.
          </strong>
          <p>
            Aklınıza takılan bir şeyi
            <br />
            kaybolmadan not edin.
          </p>
          <button onClick={() => setAdding(true)}>
            <Plus size={15} />
            Bir fikir bırak
          </button>
        </div>
        <nav className="bottom-nav">
          <NavLink to="/archive">
            <Archive size={18} />
            Arşiv ve kapsam dışı
          </NavLink>
          <NavLink to="/settings">
            <Settings size={18} />
            Ayarlar
          </NavLink>
        </nav>
        <div className="local-status">
          <span />
          Yerel çalışma alanı<small>Verileriniz bu bilgisayarda</small>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Menüyü aç"
            onClick={() => setMobile(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            Çalışma alanı<span>/</span>
            <strong>
              {location.pathname.startsWith("/ideas/")
                ? "Fikir detayı"
                : location.pathname.startsWith("/documents/")
                  ? "Doküman"
                  : nav.find(([p]) => p === location.pathname)?.[1] ||
                    (location.pathname === "/archive" ? "Arşiv" : "Ayarlar")}
            </strong>
          </div>
          <div className="topbar-right">
            <div className="global-search">
              <Search size={16} />
              <input
                ref={search}
                aria-label="Çalışma alanında ara"
                placeholder="Fikir, kaynak veya not ara…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              {draft ? (
                <button
                  aria-label="Aramayı temizle"
                  onClick={() => setDraft("")}
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd>⌘ K</kbd>
              )}
            </div>
            <button className="button primary" onClick={() => setAdding(true)}>
              <Plus size={16} />
              <span>Yeni fikir</span>
            </button>
            <div className="avatar" title="Kişisel çalışma alanı">
              M
            </div>
          </div>
        </header>
        <main>
          <Suspense
            fallback={
              <div className="empty">
                <div className="loader" />
                <p>Çalışma sayfası açılıyor…</p>
              </div>
            }
          >
            <Routes>
              <Route
                path="/"
                element={<Dashboard onNew={() => setAdding(true)} />}
              />
              <Route
                path="/ideas"
                element={<Ideas onNew={() => setAdding(true)} />}
              />
              <Route path="/ideas/:id" element={<IdeaDetail />} />
              <Route path="/sources" element={<Sources />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/documents/:id" element={<Documents />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route
                path="/archive"
                element={<Ideas archive onNew={() => setAdding(true)} />}
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="*"
                element={
                  <div className="empty">
                    <h1>Bu sayfa bulunamadı</h1>
                    <Link to="/">Dashboard’a dön</Link>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </main>
        <footer className="app-footer">
          <span>
            ideation <span>✦</span> Merakınızı bir sonraki hikâyeye dönüştürün.
          </span>
          <span>20–60 saniyelik büyük fikirler</span>
        </footer>
      </div>
      {adding && <NewIdea onClose={() => setAdding(false)} />}
    </div>
  );
}
const root =
  import.meta.hot?.data.root || createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Workspace>
          <App />
        </Workspace>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
