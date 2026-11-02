import { isValidDay, todayIso } from "../portfolio.ts";
import type { PortfolioState } from "../types.ts";
export const ANALYSIS_KEY = "brujula-analysis-v1";
export type Point = { date: string; value: number };
export type Series = {
  id: string;
  name: string;
  scope: "portfolio" | "instrument" | "benchmark";
  instrumentId: string | null;
  benchmarkId?: string | null;
  currency: "EUR";
  basis: "unitized-total-return";
  calendar: "trading-daily";
  source: string;
  asOf: string;
  publishedAt: string | null;
  updatedAt: string;
  points: Point[];
};
export type Traits = {
  sector?: string;
  country?: string;
  region?: string;
  currency?: string;
  assetClass?: string;
  themes?: string[];
};
export type AnalysisData = {
  version: 1;
  portfolioSignature: string | null;
  series: Series[];
  benchmarkId: string | null;
  metadata: {
    instrumentId: string;
    source: string;
    date: string;
    traits: Traits;
  }[];
  longTermIds: string[];
  collateral: null | {
    debt: number;
    source: string;
    date: string;
    positions: { instrumentId: string; factor: number }[];
  };
};
export const emptyAnalysis = (): AnalysisData => ({
  version: 1,
  portfolioSignature: null,
  series: [],
  benchmarkId: null,
  metadata: [],
  longTermIds: [],
  collateral: null,
});
const record = (x: unknown): Record<string, unknown> => {
  if (!x || typeof x !== "object" || Array.isArray(x))
    throw new Error("Objeto de análisis no válido.");
  return x as Record<string, unknown>;
};
const str = (x: unknown, max = 150): string => {
  if (typeof x !== "string" || !x.trim() || x.length > max)
    throw new Error("Texto de análisis no válido.");
  return x.trim();
};
const positive = (x: unknown): x is number =>
  typeof x === "number" && Number.isFinite(x) && x > 0 && x <= 1e12;
const url = (x: unknown) => {
  const u = new URL(str(x, 1000));
  if (u.protocol !== "https:" || u.username || u.password)
    throw new Error("La fuente debe ser HTTPS y no incluir credenciales.");
  return u.href;
};
const day = (x: unknown) => {
  const d = str(x, 10);
  if (!isValidDay(d) || d > todayIso())
    throw new Error("Fecha inválida o futura.");
  return d;
};
export function parseTraits(input: unknown): Traits {
  const x = record(input);
  const result: Traits = {};
  for (const k of [
    "sector",
    "country",
    "region",
    "currency",
    "assetClass",
  ] as const)
    if (x[k] !== undefined) result[k] = str(x[k], 80);
  if (x.themes !== undefined) {
    if (!Array.isArray(x.themes) || x.themes.length > 12)
      throw new Error("Máximo doce temáticas.");
    result.themes = [...new Set(x.themes.map((v) => str(v, 80)))];
  }
  return result;
}
export function parseAnalysis(input: unknown): AnalysisData {
  const x = record(input);
  if (
    new TextEncoder().encode(JSON.stringify(x)).byteLength > 900000 ||
    x.version !== 1 ||
    !Array.isArray(x.series) ||
    x.series.length > 15 ||
    !Array.isArray(x.metadata) ||
    x.metadata.length > 100 ||
    !Array.isArray(x.longTermIds) ||
    x.longTermIds.length > 100
  )
    throw new Error("Máximo 15 series, 100 productos y 900 KB de análisis.");
  const seen = new Set<string>();
  const scopes = new Set<string>();
  const series = x.series.map((v) => {
    const s = record(v);
    const id = str(s.id, 100);
    if (
      seen.has(id) ||
      !["portfolio", "instrument", "benchmark"].includes(String(s.scope)) ||
      s.currency !== "EUR" ||
      s.basis !== "unitized-total-return" ||
      s.calendar !== "trading-daily" ||
      !Array.isArray(s.points) ||
      s.points.length < 2 ||
      s.points.length > 1500
    )
      throw new Error(
        "Serie inválida: usa rentabilidad total unitarizada diaria, en EUR, con 2–1500 puntos.",
      );
    seen.add(id);
    const scope = s.scope as Series["scope"];
    const instrumentId =
      scope === "instrument" ? str(s.instrumentId, 100) : null;
    const unique =
      scope === "instrument"
        ? scope + instrumentId
        : scope === "portfolio"
          ? scope
          : null;
    if (unique && scopes.has(unique))
      throw new Error("Solo una serie por cartera o instrumento.");
    if (unique) scopes.add(unique);
    let previous = "";
    const inputPoints = s.points;
    const points = inputPoints.map((p, i) => {
      const q = record(p);
      const date = day(q.date);
      if (
        date <= previous ||
        !(positive(q.value) || (q.value === 0 && i === inputPoints.length - 1))
      )
        throw new Error(
          "Fechas de serie estrictamente crecientes y valores positivos.",
        );
      previous = date;
      return { date, value: q.value };
    });
    const asOf = day(s.asOf),
      updatedAt = day(s.updatedAt),
      publishedAt = s.publishedAt === null ? null : day(s.publishedAt);
    if (
      asOf < previous ||
      updatedAt < asOf ||
      (publishedAt !== null && publishedAt < asOf)
    )
      throw new Error("Revisa fecha observada, publicación y actualización.");
    return {
      id,
      name: str(s.name),
      scope,
      instrumentId,
      currency: "EUR",
      basis: "unitized-total-return",
      calendar: "trading-daily",
      source: url(s.source),
      asOf,
      publishedAt,
      updatedAt,
      benchmarkId: s.benchmarkId == null ? null : str(s.benchmarkId, 100),
      points,
    } as Series;
  });
  for (const s of series)
    if (
      s.benchmarkId &&
      !series.some((b) => b.id === s.benchmarkId && b.scope === "benchmark")
    )
      throw new Error("Referencia del instrumento no encontrada.");
  const signature =
    x.portfolioSignature === null ? null : str(x.portfolioSignature, 40);
  if (series.some((s) => s.scope === "portfolio") && !signature)
    throw new Error(
      "La serie de cartera debe declarar la firma de sus operaciones.",
    );
  const benchmarkId = x.benchmarkId === null ? null : str(x.benchmarkId, 100);
  if (
    benchmarkId &&
    !series.some((s) => s.id === benchmarkId && s.scope === "benchmark")
  )
    throw new Error("Índice de referencia no encontrado.");
  const metadataIds = new Set<string>();
  const metadata = x.metadata.map((v) => {
    const m = record(v);
    const instrumentId = str(m.instrumentId, 100);
    if (metadataIds.has(instrumentId)) throw new Error("Metadatos duplicados.");
    metadataIds.add(instrumentId);
    return {
      instrumentId,
      source: url(m.source),
      date: day(m.date),
      traits: parseTraits(m.traits),
    };
  });
  const longTermIds = [...new Set(x.longTermIds.map((v) => str(v, 100)))];
  let collateral: AnalysisData["collateral"] = null;
  if (x.collateral !== null) {
    const c = record(x.collateral);
    if (
      typeof c.debt !== "number" ||
      !Number.isFinite(c.debt) ||
      c.debt < 0 ||
      c.debt > 1e12 ||
      !Array.isArray(c.positions) ||
      !c.positions.length ||
      c.positions.length > 100
    )
      throw new Error("Caso de pignoración no válido.");
    const ids = new Set<string>();
    collateral = {
      debt: c.debt,
      source: url(c.source),
      date: day(c.date),
      positions: c.positions.map((v) => {
        const p = record(v),
          instrumentId = str(p.instrumentId, 100);
        if (
          ids.has(instrumentId) ||
          typeof p.factor !== "number" ||
          !Number.isFinite(p.factor) ||
          p.factor < 0 ||
          p.factor > 1
        )
          throw new Error(
            "Coeficiente bancario entre 0 y 1, sin productos duplicados.",
          );
        ids.add(instrumentId);
        return { instrumentId, factor: p.factor };
      }),
    };
  }
  return {
    version: 1,
    portfolioSignature: signature,
    series,
    benchmarkId,
    metadata,
    longTermIds,
    collateral,
  };
}
/** Identificador de coherencia, no firma de seguridad. No incluye cotizaciones variables. */
export function ledgerSignature(state: PortfolioState) {
  const text = JSON.stringify({
    assets: state.instruments.map((a) => [a.id, a.isin, a.currency]).sort(),
    transactions: [...state.transactions]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((t) => [
        t.id,
        t.instrumentId,
        t.type,
        t.date,
        t.amount,
        t.units,
        t.fee,
        t.targetInstrumentId ?? null,
        t.targetUnits ?? null,
        t.sequence ?? null,
        t.fx
          ? [
              t.fx.currency,
              t.fx.amount,
              t.fx.fee,
              t.fx.eurPerUnit,
              t.fx.date,
              t.fx.source,
            ]
          : null,
      ]),
  });
  let a = 2166136261,
    b = 5381;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ text.charCodeAt(i);
  }
  return (
    (a >>> 0).toString(16).padStart(8, "0") +
    (b >>> 0).toString(16).padStart(8, "0")
  );
}
export function validateAnalysisPortfolio(
  data: AnalysisData,
  state: PortfolioState,
) {
  const ids = new Set(state.instruments.map((a) => a.id));
  const refs = [
    ...data.series
      .filter((s) => s.scope === "instrument")
      .map((s) => s.instrumentId!),
    ...data.metadata.map((m) => m.instrumentId),
    ...data.longTermIds,
    ...(data.collateral?.positions.map((p) => p.instrumentId) ?? []),
  ];
  if (refs.some((id) => !ids.has(id)))
    throw new Error("El archivo referencia productos ajenos a esta cartera.");
  if (
    data.series.some((s) => s.scope === "portfolio") &&
    data.portfolioSignature !== ledgerSignature(state)
  )
    throw new Error(
      "La serie de cartera pertenece a otro historial de operaciones.",
    );
}
