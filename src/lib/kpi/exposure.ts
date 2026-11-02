import type { Holding } from "../types.ts";
import type { Composition } from "../exposures.ts";
import type { AnalysisData, Traits } from "./data.ts";
export const dimensions = [
  "company",
  "sector",
  "country",
  "region",
  "currency",
  "assetClass",
  "theme",
  "product",
] as const;
export type Dimension = (typeof dimensions)[number];
export const dimensionLabels: Record<Dimension, string> = {
  company: "Empresas / emisores",
  sector: "Sectores",
  country: "Países",
  region: "Regiones",
  currency: "Divisas subyacentes",
  assetClass: "Clases de activos",
  theme: "Temáticas",
  product: "Productos",
};
export type ExposureRow = {
  key: string;
  label: string;
  value: number;
  weight: number;
  products: string[];
  sources: { url: string; date: string }[];
};
export function exposureMatrix(
  holdings: Holding[],
  compositions: Composition[],
  metadata: AnalysisData["metadata"],
  dimension: Dimension,
) {
  const active = holdings.filter((h) => h.units > 1e-8),
    total = active.reduce((s, h) => s + h.value, 0);
  const rows = new Map<string, ExposureRow>();
  const productsByRow = new Map<string, Set<string>>();
  let known = 0;
  const add = (
    key: string,
    label: string,
    value: number,
    product: string,
    productId: string,
    source: { url: string; date: string } | null,
  ) => {
    const row = rows.get(key) ?? {
      key,
      label,
      value: 0,
      weight: 0,
      products: [],
      sources: [],
    };
    row.value += value;
    const productIds = productsByRow.get(key) ?? new Set<string>();
    if (!productIds.has(productId)) row.products.push(product);
    productIds.add(productId);
    productsByRow.set(key, productIds);
    if (
      source &&
      !row.sources.some((s) => s.url === source.url && s.date === source.date)
    )
      row.sources.push(source);
    rows.set(key, row);
  };
  for (const h of active) {
    const a = h.instrument;
    if (dimension === "product") {
      known += h.value;
      add(a.id, a.name, h.value, a.name, a.id, null);
      continue;
    }
    const c = compositions.find((c) => c.instrumentId === a.id),
      m = metadata.find((m) => m.instrumentId === a.id);
    const positions =
      a.kind === "acción"
        ? [
            {
              id: a.isin,
              name: a.name,
              weight: 100,
              traits: { assetClass: "Acciones", ...m?.traits } as Traits,
            },
          ]
        : (c?.positions ?? []);
    for (const p of positions) {
      const value = (h.value * p.weight) / 100,
        source =
          a.kind === "acción"
            ? m
              ? { url: m.source, date: m.date }
              : null
            : c
              ? { url: c.source, date: c.date }
              : null;
      let labels: string[] = [];
      if (dimension === "company") labels = [p.id];
      else if (dimension === "theme") labels = p.traits?.themes ?? [];
      else {
        const label = p.traits?.[dimension];
        if (label) labels = [label];
      }
      if (labels.length) {
        known += value;
        for (const label of labels)
          add(
            label,
            dimension === "company" ? p.name : label,
            value,
            a.name,
            a.id,
            source,
          );
      }
    }
  }
  return {
    total,
    known,
    unknown: Math.max(0, total - known),
    coverage: total ? known / total : 0,
    rows: [...rows.values()]
      .map((r) => ({ ...r, weight: total ? r.value / total : 0 }))
      .sort((a, b) => b.value - a.value),
  };
}
export function stressScenario(
  exposure: ReturnType<typeof exposureMatrix>,
  key: string,
  shock: number,
) {
  if (!Number.isFinite(shock) || shock < -1 || shock > 1)
    throw new Error("El choque debe estar entre −100 % y +100 %.");
  const row = exposure.rows.find((r) => r.key === key);
  if (!row) return null;
  return {
    affected: row.value,
    impact: row.value * shock,
    portfolioImpact: exposure.total
      ? (row.value * shock) / exposure.total
      : null,
    unmodeled: exposure.unknown,
    coverage: exposure.coverage,
  };
}
export function collateralAnalysis(
  holdings: Holding[],
  caseData: AnalysisData["collateral"],
) {
  if (!caseData) return null;
  let value = 0,
    eligible = 0;
  for (const p of caseData.positions) {
    const h = holdings.find(
      (h) => h.instrument.id === p.instrumentId && h.units > 1e-8,
    );
    if (!h || h.instrument.quoteSource === "demo") return null;
    value += h.value;
    eligible += h.value * p.factor;
  }
  return {
    value,
    eligible,
    ltv: value ? caseData.debt / value : null,
    coverage: caseData.debt ? eligible / caseData.debt : null,
    headroom: eligible - caseData.debt,
  };
}
