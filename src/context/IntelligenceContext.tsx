"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useAccount } from "./AccountContext";
import { remoteFetch } from "../lib/supabase.ts";
import type { Intelligence } from "../lib/intelligence/types.ts";
import { mergeSnapshot } from "../lib/intelligence/query.ts";
type State = {
  data: Intelligence | null;
  loading: boolean;
  error: string;
  refresh: () => void;
};
const Context = createContext<State | null>(null);
export function IntelligenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAccount(),
    owner = user?.id ?? null;
  const [data, setData] = useState<Intelligence | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const run = useRef<() => void>(() => {});
  useEffect(() => {
    let alive = true,
      busy = false,
      lastAttempt = 0;
    const controller = new AbortController();
    async function load() {
      if (!owner || busy || document.visibilityState === "hidden") return;
      busy = true;
      lastAttempt = Date.now();
      setLoading(true);
      try {
        const response = await remoteFetch("/api/intelligence", {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok)
          throw new Error(
            payload.error ?? "No se pudieron consultar las fuentes.",
          );
        if (
          !payload ||
          typeof payload.generatedAt !== "string" ||
          !payload.ecbRate ||
          !payload.ecbFx ||
          !payload.cot ||
          !payload.sec
        )
          throw new Error("Respuesta de fuentes no válida.");
        if (alive) {
          setData((previous) => mergeSnapshot(previous, payload));
          setError("");
        }
      } catch (e) {
        if (alive && !controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "No se pudieron consultar las fuentes.",
          );
      } finally {
        busy = false;
        if (alive) setLoading(false);
      }
    }
    queueMicrotask(() => {
      if (!alive) return;
      setData(null);
      setError("");
      setLoading(false);
      if (owner) void load();
    });
    run.current = () => {
      void load();
    };
    // One owner-scoped context deduplicates the overview and detailed views.
    const visible = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastAttempt >= 1800000
      )
        void load();
    };
    const timer = window.setInterval(visible, 60000);
    document.addEventListener("visibilitychange", visible);
    return () => {
      alive = false;
      controller.abort();
      run.current = () => {};
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [owner]);
  const refresh = useCallback(() => run.current(), []);
  return (
    <Context.Provider value={{ data, loading, error, refresh }}>
      {children}
    </Context.Provider>
  );
}
export function useIntelligence() {
  const value = useContext(Context);
  if (!value) throw new Error("Falta IntelligenceProvider.");
  return value;
}
