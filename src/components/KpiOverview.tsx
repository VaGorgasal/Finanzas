"use client";
import Link from "next/link";
import { usePortfolio } from "../context/PortfolioContext";
import { useFinancialPlan } from "../context/useFinancialPlan";
import { useAnalysis } from "../context/useAnalysis";
import { analyzeKpis } from "../lib/kpi/engine.ts";
import { eur, nfmt, pct } from "../lib/portfolio.ts";
export function KpiOverview() {
  const { state, ready } = usePortfolio(),
    { plan } = useFinancialPlan(),
    { data, compositions, ready: loaded } = useAnalysis();
  const k = analyzeKpis(state, data, compositions, plan);
  const cards = [
    {
      title: "Rentabilidad",
      value: k.valid ? eur(k.summary.totalPnL) : "Pendiente",
      detail: k.valid
        ? "Resultado acumulado · " +
          pct(k.summary.returnOnBuys) +
          " sobre compras"
        : "Registra tus operaciones y precios reales",
      href: "/analisis#rentabilidad",
    },
    {
      title: "Riesgo y drawdown",
      value: k.dd ? pct(k.dd.current * 100) : "Sin serie ajustada",
      detail: k.dd
        ? "Máximo observado · serie hasta " + k.portfolio!.asOf
        : "Las aportaciones no se tratan como ganancias",
      href: "/analisis#riesgo",
    },
    {
      title: "Concentración",
      value: k.valid
        ? nfmt(k.exposure.coverage * 100, 1) + " % conocido"
        : "Pendiente",
      detail: "Cobertura de empresas y emisores subyacentes",
      href: "/analisis#concentracion",
    },
    {
      title: "Condiciones de mercado",
      value: "Fuente pendiente",
      detail: "Segunda entrega · indicadores macroeconómicos",
      href: "/mercados",
    },
    {
      title: "Flujos y posicionamiento",
      value: "Sin datos conectados",
      detail: "Segunda entrega · COT, flujos y declaraciones 13F",
      href: "/mercados",
    },
    {
      title: "Liquidez y objetivos",
      value:
        k.planReview.available === null
          ? "Completa tu plan"
          : eur(k.planReview.available),
      detail: "Disponible después de la reserva declarada",
      href: "/analisis#liquidez",
    },
  ];
  return (
    <section className="kpiOverview" aria-labelledby="kpi-overview-title">
      <div className="kpiSectionHead">
        <h2 id="kpi-overview-title">Tu torre de control</h2>
        <Link href="/analisis">Abrir análisis →</Link>
      </div>
      <div className="kpiCards">
        {cards.map((c) => (
          <Link className="kpiCard" key={c.title} href={c.href}>
            <span>{c.title}</span>
            <strong>{ready && loaded ? c.value : "Cargando…"}</strong>
            <small>{c.detail}</small>
            <span className="kpiCardArrow" aria-hidden="true">
              ↗
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
