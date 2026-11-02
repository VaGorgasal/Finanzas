import { kpiRules } from "./config.ts";
import { calculatePortfolio, todayIso } from "../portfolio.ts";
import { portfolioIrr } from "../analytics.ts";
import { analyzePlan, type Plan } from "../financial-plan.ts";
import type { PortfolioState } from "../types.ts";
import type { Composition } from "../exposures.ts";
import { ledgerSignature, type AnalysisData } from "./data.ts";
import {
  correlationChange,
  drawdown,
  totalReturn,
  volatility,
  compareSeries,
  periodReturns,
  riskContributions,
} from "./math.ts";
import { exposureMatrix, collateralAnalysis } from "./exposure.ts";
export type Alert = {
  id: string;
  level: "review" | "data";
  title: string;
  observed: string;
  date: string;
  source: string;
  change: string;
  affected: string[];
  meaning: string;
  uncertainty: string;
  needed: string;
};
export function analyzeKpis(
  state: PortfolioState,
  data: AnalysisData,
  compositions: Composition[],
  plan: Plan,
  today = todayIso(),
  window = 90,
  rules = kpiRules,
) {
  const summary = calculatePortfolio(state.instruments, state.transactions),
    active = summary.holdings.filter((h) => h.units > 1e-8),
    missingPrices = active.some((h) => h.instrument.quoteSource === "demo"),
    valid = !state.demoMode && !missingPrices && state.transactions.length > 0;
  const raw = data.series.find((s) => s.scope === "portfolio"),
    coherent = data.portfolioSignature === ledgerSignature(state),
    portfolio = valid && coherent ? raw : null;
  const benchmark = data.series.find(
      (s) => s.id === data.benchmarkId && s.scope === "benchmark",
    ),
    dd = portfolio ? drawdown(portfolio.points) : null,
    vol = portfolio ? volatility(portfolio, window) : null;
  const exposure = exposureMatrix(
      valid ? active : [],
      compositions,
      data.metadata,
      "company",
    ),
    products = exposureMatrix(
      valid ? active : [],
      compositions,
      data.metadata,
      "product",
    );
  const planReview = analyzePlan(
    plan,
    valid ? summary.marketValue : null,
    today,
  );
  const longTerm = valid
    ? active
        .filter((h) => data.longTermIds.includes(h.instrument.id))
        .reduce((s, h) => s + h.value, 0)
    : null;
  const commonValuationDate =
    new Set(active.map((h) => h.instrument.priceDate)).size <= 1;
  const instrumentSeries = active.map((h) =>
    data.series.find(
      (s) => s.scope === "instrument" && s.instrumentId === h.instrument.id,
    ),
  );
  const risk =
    valid &&
    commonValuationDate &&
    active.length > 0 &&
    instrumentSeries.every((s) => s !== undefined) &&
    summary.marketValue > 0
      ? riskContributions(
          instrumentSeries.filter((s) => s !== undefined),
          active.map((h) => h.value / summary.marketValue),
          window,
        )
      : null;
  const dates = [...new Set(active.map((h) => h.instrument.priceDate))];
  const alerts: Alert[] = [];
  const add = (a: Alert) => alerts.push(a);
  if (dates.length > 1)
    add({
      id: "mixed-valuations",
      level: "data",
      title: "Las valoraciones no comparten fecha",
      observed: dates.join(" · "),
      date: today,
      source: "Precios guardados de cada posición",
      change: "No hay una valoración común verificable.",
      affected: active.map((h) => h.instrument.name),
      meaning:
        "Los pesos son una mezcla de fechas. Se suspende la contribución al riesgo.",
      uncertainty:
        "Los pesos de concentración son orientativos hasta actualizar.",
      needed: "Valorar todos los productos abiertos a la misma fecha.",
    });
  if (
    compositions.some(
      (c) =>
        (Date.parse(today) - Date.parse(c.date)) / 86400000 >
        rules.compositionStaleDays,
    )
  )
    add({
      id: "old-compositions",
      level: "data",
      title: "Composición con más de 120 días",
      observed: "Hay pesos publicados antiguos.",
      date: today,
      source: "Fuentes de composición declaradas",
      change: "Sin una composición posterior importada.",
      affected: compositions
        .filter(
          (c) =>
            (Date.parse(today) - Date.parse(c.date)) / 86400000 >
            rules.compositionStaleDays,
        )
        .map(
          (c) =>
            state.instruments.find((a) => a.id === c.instrumentId)?.name ??
            c.instrumentId,
        ),
      meaning: "Las posiciones y sus pesos pueden haber cambiado.",
      uncertainty: "Cobertura y fechas parciales",
      needed: "Consultar la última publicación de la gestora.",
    });
  if (raw && !coherent)
    add({
      id: "stale-ledger",
      level: "data",
      title: "Historial de rentabilidad pendiente de conciliar",
      observed: "El libro de operaciones ha cambiado.",
      date: raw.asOf,
      source: raw.source,
      change: "Firma de operaciones distinta de la importada.",
      affected: ["Cartera"],
      meaning:
        "La serie anterior podría representar otra cartera. Se suspenden sus estadísticas.",
      uncertainty: "Alta",
      needed: "Importar una serie calculada con las operaciones actuales.",
    });
  if (!portfolio)
    add({
      id: "series-missing",
      level: "data",
      title: "Histórico ajustado por flujos no disponible",
      observed: "TWR, drawdown y volatilidad personales sin cálculo.",
      date: today,
      source: "Datos del perfil",
      change: "Sin comparación histórica verificable.",
      affected: ["Cartera"],
      meaning:
        "Los saldos brutos no permiten separar aportaciones de rendimiento.",
      uncertainty: "Datos insuficientes",
      needed:
        "Serie diaria de rentabilidad total unitarizada, fuente y firma de operaciones.",
    });
  if (dd && dd.current <= -rules.drawdownReview)
    add({
      id: "drawdown",
      level: "review",
      title: `Corrección de cartera superior al ${rules.drawdownReview * 100} %`,
      observed: `${(dd.current * 100).toFixed(2)} % desde el máximo observado.`,
      date: portfolio!.points.at(-1)!.date,
      source: portfolio!.source,
      change: periodReturns(portfolio!).daily
        ? `Último intervalo diario: ${(periodReturns(portfolio!).daily!.value * 100).toFixed(2)} %`
        : "Sin intervalo diario comparable.",
      affected: ["Cartera"],
      meaning:
        "La pérdida desde máximos merece contrastarse con el horizonte y la necesidad de capital.",
      uncertainty: "El histórico importado puede ser parcial.",
      needed:
        "Revisar cobertura, fecha de precios y objetivos; no implica una orden.",
    });
  if (vol !== null && portfolio) {
    const previous =
      portfolio.points.length > window + 1
        ? volatility(
            { ...portfolio, points: portfolio.points.slice(0, -1) },
            window,
          )
        : null;
    if (
      previous !== null &&
      previous > 0 &&
      vol > previous * (1 + rules.volatilityIncrease)
    )
      add({
        id: "volatility",
        level: "review",
        title: "Aumento de volatilidad",
        observed: `Volatilidad anualizada ${(vol * 100).toFixed(2)} %.`,
        date: portfolio.asOf,
        source: portfolio.source,
        change: `${((vol / previous - 1) * 100).toFixed(1)} % frente a la ventana desplazada una sesión.`,
        affected: ["Cartera"],
        meaning:
          "La dispersión de rendimientos ha aumentado en la ventana seleccionada.",
        uncertainty:
          "Ventanas solapadas; no demuestra un cambio persistente de régimen.",
        needed: "Más sesiones y contraste con el benchmark.",
      });
  }
  for (const row of exposure.rows.filter(
    (r) => r.weight >= rules.issuerConcentration,
  ))
    add({
      id: "concentration-" + row.key,
      level: "review",
      title: "Exposición conocida elevada a " + row.label,
      observed: `${(row.weight * 100).toFixed(1)} % del valor registrado.`,
      date: row.sources.map((s) => s.date).sort()[0] ?? today,
      source: row.sources[0]?.url ?? "Posición directa del libro",
      change: "Sin composición anterior comparable.",
      affected: row.products,
      meaning: "Varias inversiones pueden depender del mismo emisor.",
      uncertainty: `Cobertura de composición ${(exposure.coverage * 100).toFixed(1)} %.`,
      needed:
        "Actualizar las composiciones restantes antes de interpretar el riesgo total.",
    });
  const comparison =
    portfolio && benchmark ? compareSeries(portfolio, benchmark) : null;
  if (comparison && comparison.gap <= -rules.benchmarkGap)
    add({
      id: "benchmark-gap",
      level: "review",
      title: "Diferencia negativa frente a la referencia elegida",
      observed: `${(comparison.gap * 100).toFixed(2)} puntos porcentuales en el periodo común.`,
      date: comparison.to,
      source: portfolio!.source + " · " + benchmark!.source,
      change: `Comparación desde ${comparison.from}; no es una variación frente a otro periodo.`,
      affected: ["Cartera", benchmark!.name],
      meaning:
        "El rendimiento importado queda por debajo del índice que has asignado.",
      uncertainty:
        "La referencia puede no representar el riesgo y la composición de la cartera.",
      needed:
        "Verificar adecuación del benchmark y homogeneidad de dividendos, costes y divisa.",
    });
  const pairSignals: Alert[] = [];
  const coveredSeries = instrumentSeries.filter((s) => s !== undefined);
  for (let i = 0; i < coveredSeries.length; i++)
    for (let j = i + 1; j < coveredSeries.length; j++) {
      const a = coveredSeries[i],
        b = coveredSeries[j],
        change = correlationChange(a, b, window);
      if (
        !change ||
        !(
          change.current >= rules.highCorrelation ||
          (change.delta !== null &&
            Math.abs(change.delta) >= rules.correlationChange)
        )
      )
        continue;
      pairSignals.push({
        id: "correlation-" + a.id + "-" + b.id,
        level: "review",
        title: "Dependencia entre inversiones: " + a.name + " / " + b.name,
        observed: `Correlación ${change.current.toFixed(2)} sobre ${window} intervalos comunes.`,
        date: change.date,
        source: a.source + " · " + b.source,
        change:
          change.previous === null
            ? "Sin ventana anterior completa comparable."
            : `Ventana anterior no solapada: ${change.previous.toFixed(2)}; cambio ${change.delta!.toFixed(2)}.`,
        affected: [a.name, b.name],
        meaning:
          "Una relación histórica alta o cambiante puede reducir la diversificación esperada.",
        uncertainty:
          "Correlación histórica, sin causalidad ni garantía de continuidad.",
        needed:
          "Contrastar las composiciones y ampliar el historial antes de concluir concentración económica.",
      });
    }
  alerts.push(...pairSignals.slice(0, 5));
  const stale = [
    ...active
      .filter(
        (h) =>
          (Date.parse(today) - Date.parse(h.instrument.priceDate)) / 86400000 >
          rules.priceStaleDays,
      )
      .map((h) => h.instrument.name),
    ...data.series
      .filter(
        (s) =>
          (Date.parse(today) - Date.parse(s.asOf)) / 86400000 >
          rules.priceStaleDays,
      )
      .map((s) => s.name),
  ];
  if (stale.length)
    add({
      id: "old-data",
      level: "data",
      title: "Datos con más de siete días",
      observed: stale.join(", "),
      date: today,
      source: "Fechas conservadas en el perfil",
      change: "No se han actualizado automáticamente.",
      affected: stale,
      meaning:
        "Las cifras describen el periodo observado y pueden no representar la situación actual.",
      uncertainty: "Alta para decisiones actuales",
      needed: "Actualizar precios o series desde sus fuentes.",
    });
  for (const goal of planReview.goals.filter(
    (g) => g.months <= 24 && g.gap > 0,
  ))
    add({
      id: "liquidity-" + goal.id,
      level: "review",
      title: "Capital próximo pendiente: " + goal.name,
      observed: `Brecha de ${goal.gap.toFixed(2)} € para ${goal.date}.`,
      date: today,
      source: "Mi plan financiero",
      change: "Proyección sin rentabilidad; no hay plan anterior comparable.",
      affected: ["Liquidez personal"],
      meaning:
        "Las aportaciones previstas al objetivo no cubren el capital necesario.",
      uncertainty: "Depende de la coherencia del presupuesto declarado.",
      needed:
        "Revisar aportaciones y liquidez asignada. No se presupone vender inversiones.",
    });
  return {
    valid,
    missingPrices,
    summary,
    active,
    portfolio,
    benchmark,
    irr: portfolioIrr(state),
    twr: portfolio ? totalReturn(portfolio.points) : null,
    periods: portfolio ? periodReturns(portfolio) : null,
    dd,
    vol,
    benchmarkComparison:
      portfolio && benchmark ? compareSeries(portfolio, benchmark) : null,
    benchmarkDrawdown: benchmark ? drawdown(benchmark.points) : null,
    benchmarkVolatility: benchmark ? volatility(benchmark, window) : null,
    exposure,
    products,
    risk,
    planReview,
    longTerm,
    collateral: valid ? collateralAnalysis(active, data.collateral) : null,
    alerts,
  };
}
