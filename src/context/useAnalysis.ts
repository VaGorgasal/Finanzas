"use client";
import { useEffect, useState, useRef } from "react";
import { workspaceStorage } from "../lib/workspace-storage.ts";
import {
  ANALYSIS_KEY,
  emptyAnalysis,
  parseAnalysis,
  type AnalysisData,
} from "../lib/kpi/data.ts";
import { parseCompositions, type Composition } from "../lib/exposures.ts";
import { EXPOSURES_KEY } from "../lib/backup.ts";
export function useAnalysis() {
  const alive = useRef(false),
    storageRef = useRef<ReturnType<typeof workspaceStorage> | null>(null);
  const [data, setData] = useState<AnalysisData>(emptyAnalysis),
    [compositions, setCompositions] = useState<Composition[]>([]),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  useEffect(() => {
    alive.current = true;
    const storage = workspaceStorage();
    storageRef.current = storage;
    function read() {
      if (!alive.current) return;
      try {
        const raw = storage.getItem(ANALYSIS_KEY),
          c = storage.getItem(EXPOSURES_KEY);
        setData(raw ? parseAnalysis(JSON.parse(raw)) : emptyAnalysis());
        setCompositions(c ? parseCompositions(JSON.parse(c)) : []);
        setError("");
      } catch {
        setError(
          "No se han podido leer los datos de análisis. El original se conserva; exporta una copia antes de reemplazarlo.",
        );
      }
      setReady(true);
    }
    const changed = (e: Event) => {
      const key = (e as CustomEvent).detail?.key;
      if (key === ANALYSIS_KEY || key === EXPOSURES_KEY) read();
    };
    queueMicrotask(read);
    window.addEventListener("brujula-data-restored", read);
    window.addEventListener("brujula-local-change", changed);
    return () => {
      alive.current = false;
      window.removeEventListener("brujula-data-restored", read);
      window.removeEventListener("brujula-local-change", changed);
    };
  }, []);
  function save(input: unknown) {
    try {
      if (!alive.current || !storageRef.current)
        throw new Error("La vista de análisis ya no está activa.");
      const valid = parseAnalysis(input);
      storageRef.current.setItem(ANALYSIS_KEY, JSON.stringify(valid));
      setData(valid);
      setError("");
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo guardar el análisis.",
      );
      return false;
    }
  }
  return { data, compositions, error, ready, save };
}
