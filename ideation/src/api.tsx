import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import type { State } from "../shared/model";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const form = body instanceof FormData;
  const res = await fetch("/api" + path, {
    method,
    headers: {
      "x-ideation-request": "1",
      ...(!form && body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: body === undefined ? undefined : form ? body : JSON.stringify(body),
  });
  const result = await res.json();
  if (!res.ok)
    throw new ApiError(result.error || "İşlem tamamlanamadı.", res.status);
  return result;
}
type Context = {
  data: State;
  refresh: () => Promise<void>;
  action: <T = any>(
    path: string,
    method: string,
    body?: unknown,
    message?: string,
  ) => Promise<T>;
  notify: (message: string, error?: boolean) => void;
};
const WorkspaceContext = createContext<Context | null>(null);
export function Workspace({ children }: { children: ReactNode }) {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const client = useQueryClient();
  const [toasts, setToasts] = useState<
    { id: number; text: string; error: boolean }[]
  >([]);
  const query = useQuery({
    queryKey: ["workspace", q],
    queryFn: () => api<State>("/state?q=" + encodeURIComponent(q)),
    retry: 1,
  });
  function notify(text: string, error = false) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, error }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5500);
  }
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["workspace"] }),
      client.invalidateQueries({ queryKey: ["idea-history"] }),
    ]);
  }
  async function action<T = any>(
    path: string,
    method: string,
    body?: unknown,
    message?: string,
  ) {
    try {
      const result = await api<T>(path, method, body);
      await refresh();
      if (message) notify(message);
      return result;
    } catch (e) {
      notify((e as Error).message, true);
      throw e;
    }
  }
  if (query.isPending)
    return (
      <div className="boot">
        <div className="brand-symbol">
          i<span>✦</span>
        </div>
        <h2>Fikirleriniz hazırlanıyor</h2>
        <p>Araştırma masası açılıyor…</p>
        <div className="loader" />
      </div>
    );
  if (query.isError)
    return (
      <div className="boot">
        <h2>Çalışma alanına ulaşılamadı</h2>
        <p>{query.error.message}</p>
        <button onClick={() => query.refetch()}>Yeniden dene</button>
      </div>
    );
  return (
    <WorkspaceContext.Provider
      value={{ data: query.data, refresh, action, notify }}
    >
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={t.error ? "toast error" : "toast"}>
            {t.text}
            <button
              aria-label="Bildirimi kapat"
              onClick={() => setToasts((v) => v.filter((x) => x.id !== t.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const c = useContext(WorkspaceContext);
  if (!c) throw new Error("Workspace missing");
  return c;
}
