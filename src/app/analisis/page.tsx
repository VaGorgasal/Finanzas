"use client";
import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { usePortfolio } from "../../context/PortfolioContext";
import { useFinancialPlan } from "../../context/useFinancialPlan";
import { useAnalysis } from "../../context/useAnalysis";
import { Header, Section, Info, Tag } from "../../components/Common";
import { KpiOverview } from "../../components/KpiOverview";
import { KpiChart } from "../../components/KpiChart";
import {
  ANALYSIS_KEY,
  emptyAnalysis,
  parseAnalysis,
  ledgerSignature,
  validateAnalysisPortfolio,
  type Series,
} from "../../lib/kpi/data.ts";
import { analyzeKpis } from "../../lib/kpi/engine.ts";
import {
  compareSeries,
  correlation,
  drawdown,
  rollingVolatility,
  totalReturn,
  volatility,
} from "../../lib/kpi/math.ts";
import {
  dimensions,
  dimensionLabels,
  exposureMatrix,
  stressScenario,
  type Dimension,
} from "../../lib/kpi/exposure.ts";
import { downloadJson } from "../../lib/backup.ts";
import { workspaceStorage } from "../../lib/workspace-storage.ts";
import { eur, nfmt, pct, todayIso } from "../../lib/portfolio.ts";
const percentage = (value: number | null) =>
  value === null ? "No disponible" : pct(value * 100);
function Provenance({ series }: { series: Series }) {
  return (
    <p className="hint">
      <a href={series.source} target="_blank" rel="noopener noreferrer">
        Fuente declarada ↗
      </a>{" "}
      · Observación: {series.asOf} · Publicación:{" "}
      {series.publishedAt ?? "No informada"} · Actualización: {series.updatedAt}{" "}
      · EUR · Índice de rentabilidad total aportado.
    </p>
  );
}
function Help({ children }: { children: React.ReactNode }) {
  return (
    <details className="kpiHelp">
      <summary>Cómo interpretar este indicador</summary>
      <div>{children}</div>
    </details>
  );
}
export default function AnalysisPage() {
  const { state, ready } = usePortfolio(),
    { plan, error: planError } = useFinancialPlan(),
    { data, compositions, error, ready: loaded, save } = useAnalysis();
  const [window, setWindow] = useState(90),
    [dimension, setDimension] = useState<Dimension>("sector"),
    [stressKey, setStressKey] = useState(""),
    [shock, setShock] = useState(-40),
    [status, setStatus] = useState(""),
    [instrumentId, setInstrumentId] = useState("");
  const k = analyzeKpis(state, data, compositions, plan, todayIso(), window),
    matrix = exposureMatrix(
      k.valid ? k.active : [],
      compositions,
      data.metadata,
      dimension,
    ),
    stress = stressScenario(matrix, stressKey, shock / 100);
  const instruments = data.series.filter((s) => s.scope === "instrument"),
    selected = instruments.find((s) => s.id === instrumentId) ?? instruments[0];
  const currentSignature = ledgerSignature(state);
  const selectedBenchmark = data.series.find(
      (s) => s.scope === "benchmark" && s.id === selected?.benchmarkId,
    ),
    instrumentComparison =
      selected && selectedBenchmark
        ? compareSeries(selected, selectedBenchmark)
        : null;
  async function load(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    try {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 900000) throw new Error("Máximo 900 KB.");
      const parsed = parseAnalysis(JSON.parse(await file.text()));
      validateAnalysisPortfolio(parsed, state);
      if (
        !confirm(
          "¿Reemplazar los datos de análisis guardados? Las operaciones y los precios de cartera no cambian. Exporta antes si necesitas conservar el análisis anterior.",
        )
      )
        return;
      if (save(parsed)) setStatus("Análisis validado y guardado en tu perfil.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "No se pudo importar.");
    } finally {
      input.value = "";
    }
  }
  function template() {
    downloadJson(
      {
        ...emptyAnalysis(),
        portfolioSignature: currentSignature,
        series: [
          {
            id: "cartera",
            name: "Mi cartera · serie unitarizada",
            scope: "portfolio",
            instrumentId: null,
            currency: "EUR",
            basis: "unitized-total-return",
            calendar: "trading-daily",
            source: "https://",
            asOf: todayIso(),
            publishedAt: null,
            updatedAt: todayIso(),
            points: [],
          },
        ],
        metadata: state.instruments.map((a) => ({
          instrumentId: a.id,
          source: "https://",
          date: todayIso(),
          traits: {},
        })),
      },
      "brujula-analisis-estructura.json",
    );
  }
  return (
    <>
      <Header
        eyebrow="ENTENDER ANTES DE DECIDIR"
        title="Análisis de cartera"
        description="Rentabilidad, riesgo, exposición y liquidez con fuentes y cobertura visibles."
        action={<Tag>Primera entrega · motor local</Tag>}
      />
      <KpiOverview />
      <nav className="kpiNav" aria-label="Secciones de análisis">
        {[
          ["rentabilidad", "Rentabilidad"],
          ["riesgo", "Riesgo"],
          ["concentracion", "Exposiciones"],
          ["correlaciones", "Correlaciones"],
          ["liquidez", "Liquidez"],
          ["datos", "Fuentes y datos"],
        ].map(([id, label]) => (
          <a key={id} href={"#" + id}>
            {label}
          </a>
        ))}
      </nav>
      {!ready || !loaded ? <p role="status">Cargando tu análisis…</p> : null}
      {state.demoMode && (
        <Info tone="amber">
          Estás en demostración. No calculamos diagnósticos personales con sus
          precios ficticios.
        </Info>
      )}
      {!k.valid && !state.demoMode && (
        <Info tone="amber">
          Registra operaciones y valoraciones reales para calcular resultados y
          exposiciones. No se deduce que tu patrimonio sea cero.
        </Info>
      )}
      {error && <Info tone="amber">{error}</Info>}
      {planError && <Info tone="amber">{planError}</Info>}
      {status && <Info>{status}</Info>}
      <Section
        id="rentabilidad"
        title="01 · Rentabilidad"
        extra={<Tag>Inversiones · base EUR</Tag>}
      >
        <div className="kpiMetrics">
          {[
            [
              "Resultado acumulado",
              k.valid ? eur(k.summary.totalPnL) : "No disponible",
            ],
            [
              "Resultado / compras",
              k.valid ? pct(k.summary.returnOnBuys) : "No disponible",
            ],
            [
              "Ganancia realizada en ventas",
              k.valid
                ? eur(k.summary.realizedPnL - k.summary.totalDividends)
                : "No disponible",
            ],
            [
              "Ganancia latente",
              k.valid ? eur(k.summary.unrealizedPnL) : "No disponible",
            ],
            [
              "Dividendos netos",
              k.valid ? eur(k.summary.totalDividends) : "No disponible",
            ],
            [
              "Comisiones registradas",
              k.valid
                ? eur(state.transactions.reduce((n, t) => n + t.fee, 0))
                : "No disponible",
            ],
            ["TIR anual · ACT/365", percentage(k.irr.rate)],
            ["TWR histórico observado", percentage(k.twr)],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <p className="hint">
          {k.irr.reason} El porcentaje sobre compras incluye costes y no es
          anualizado. La ganancia realizada de ventas se presenta separada de
          los dividendos.
        </p>
        <Help>
          El resultado usa las compras, ventas, comisiones y dividendos del
          libro existente. La TIR tiene en cuenta cuándo aportaste o retiraste
          dinero. El TWR encadena la serie unitarizada importada, que debe
          neutralizar cada flujo externo y reflejar dividendos y costes. No se
          transforma el saldo bruto en TWR. Se excluye el efectivo sin invertir.
        </Help>
        {k.portfolio && k.periods ? (
          <>
            <KpiChart
              points={k.portfolio.points.map((p) => ({
                date: p.date,
                value: p.value / k.portfolio!.points[0].value - 1,
              }))}
              label="Rentabilidad total de la serie aportada"
              percent
            />
            <div className="kpiMetrics">
              {Object.entries(k.periods).map(([label, p]) => (
                <div key={label}>
                  <span>
                    {
                      {
                        daily: "Último intervalo diario",
                        monthly: "Mes hasta última observación",
                        yearly: "Año hasta última observación",
                        historical: "Histórico observado",
                      }[label]
                    }
                  </span>
                  <strong>
                    {p ? percentage(p.value) : "Sin inicio de periodo"}
                  </strong>
                  <small>
                    {p
                      ? p.from + " → " + p.to
                      : "Falta valoración de cierre previa"}
                  </small>
                </div>
              ))}
            </div>
            <Provenance series={k.portfolio} />
          </>
        ) : (
          <p>
            Rentabilidad diaria, mensual, anual, TWR y curva histórica no
            disponibles: falta una serie coherente con tus operaciones. Los
            saldos históricos guardados no se usan como sustituto.
          </p>
        )}
        <div className="field">
          <label htmlFor="analysis-benchmark">Benchmark elegido por ti</label>
          <select
            id="analysis-benchmark"
            value={data.benchmarkId ?? ""}
            onChange={(e) =>
              save({ ...data, benchmarkId: e.target.value || null })
            }
          >
            <option value="">Sin referencia asignada</option>
            {data.series
              .filter((s) => s.scope === "benchmark")
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
        {k.benchmarkComparison ? (
          <p>
            Periodo común {k.benchmarkComparison.from} →{" "}
            {k.benchmarkComparison.to}: cartera{" "}
            {percentage(k.benchmarkComparison.own)}, referencia{" "}
            {percentage(k.benchmarkComparison.benchmark)}. Diferencia:{" "}
            {(k.benchmarkComparison.gap * 100).toFixed(2)} puntos porcentuales.
          </p>
        ) : (
          <p className="hint">
            La comparación necesita una referencia de rentabilidad total en EUR
            y al menos dos fechas comunes. No se asigna un índice universal a
            todas las carteras.
          </p>
        )}
        {k.benchmark && <Provenance series={k.benchmark} />}
      </Section>
      <Section id="riesgo" title="02 · Riesgo y drawdown">
        <div className="field">
          <label htmlFor="analysis-window">Ventana de riesgo</label>
          <select
            id="analysis-window"
            value={window}
            onChange={(e) => setWindow(Number(e.target.value))}
          >
            {[30, 90, 252].map((n) => (
              <option key={n} value={n}>
                {n} sesiones
              </option>
            ))}
          </select>
        </div>
        <div className="kpiMetrics">
          {[
            ["Drawdown actual observado", percentage(k.dd?.current ?? null)],
            ["Drawdown máximo observado", percentage(k.dd?.max ?? null)],
            ["Volatilidad anualizada", percentage(k.vol)],
            ["Volatilidad de referencia", percentage(k.benchmarkVolatility)],
            [
              "Drawdown máximo de referencia",
              percentage(k.benchmarkDrawdown?.max ?? null),
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <Help>
          El drawdown mide la caída de un índice de rentabilidad total respecto
          a su máximo observado. No mide caídas del saldo que puedan deberse a
          retiradas. Volatilidad: desviación típica muestral de rendimientos
          diarios simples × √252, con 30, 90 o 252 intervalos completos. Sin
          muestra suficiente o con huecos de más de siete días no se anualiza.
          La periodicidad diaria y el ajuste por flujos son declarados por la
          fuente; revisa su calendario.
        </Help>
        {k.dd ? (
          <>
            <KpiChart
              points={k.dd.curve}
              label="Caídas desde máximos de la serie aportada"
              percent
            />
            <div className="tableScroll">
              <table className="dataTable">
                <caption>
                  Correcciones observadas · duración en días naturales
                </caption>
                <thead>
                  <tr>
                    <th>Máximo</th>
                    <th>Mínimo</th>
                    <th>Caída</th>
                    <th>Recuperación</th>
                    <th>Duración total</th>
                    <th>Desde mínimo hasta recuperar</th>
                  </tr>
                </thead>
                <tbody>
                  {k.dd.episodes.map((e) => (
                    <tr key={e.peak}>
                      <td>{e.peak}</td>
                      <td>{e.trough}</td>
                      <td>{percentage(e.depth)}</td>
                      <td>{e.recovered ?? "Sin recuperar al cierre"}</td>
                      <td>{e.durationDays}</td>
                      <td>{e.recoveryDays ?? "Pendiente"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p>
            Sin serie de rentabilidad total ajustada por flujos: drawdown no
            disponible.
          </p>
        )}
        {k.portfolio && (
          <KpiChart
            points={rollingVolatility(k.portfolio, window)}
            label={`Evolución de volatilidad · ${window} sesiones`}
            percent
          />
        )}
        {instruments.length > 0 && (
          <>
            <h3>Detalle por inversión</h3>
            <div className="field">
              <label htmlFor="analysis-instrument">Serie del producto</label>
              <select
                id="analysis-instrument"
                value={selected?.id ?? ""}
                onChange={(e) => setInstrumentId(e.target.value)}
              >
                {instruments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {selected && (
              <>
                <p>
                  Rentabilidad observada:{" "}
                  {percentage(totalReturn(selected.points))} · Máxima caída:{" "}
                  {percentage(drawdown(selected.points)?.max ?? null)} ·
                  Volatilidad {window}:{" "}
                  {percentage(volatility(selected, window))}
                </p>
                <KpiChart
                  points={selected.points.map((p) => ({
                    date: p.date,
                    value: p.value / selected.points[0].value - 1,
                  }))}
                  label={selected.name + " · rentabilidad total"}
                  percent
                />
                <Provenance series={selected} />
                <div className="field">
                  <label htmlFor="instrument-benchmark">
                    Referencia para este producto
                  </label>
                  <select
                    id="instrument-benchmark"
                    value={selected.benchmarkId ?? ""}
                    onChange={(e) =>
                      save({
                        ...data,
                        series: data.series.map((s) =>
                          s.id === selected.id
                            ? { ...s, benchmarkId: e.target.value || null }
                            : s,
                        ),
                      })
                    }
                  >
                    <option value="">Sin benchmark asignado</option>
                    {data.series
                      .filter((s) => s.scope === "benchmark")
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
                {instrumentComparison && (
                  <p>
                    Comparación común {instrumentComparison.from} →{" "}
                    {instrumentComparison.to}: producto{" "}
                    {percentage(instrumentComparison.own)}, referencia{" "}
                    {percentage(instrumentComparison.benchmark)}; diferencia{" "}
                    {(instrumentComparison.gap * 100).toFixed(2)} puntos
                    porcentuales.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </Section>
      <Section id="concentracion" title="03 · Exposiciones y pruebas de estrés">
        <div className="field">
          <label htmlFor="analysis-dimension">Analizar por</label>
          <select
            id="analysis-dimension"
            value={dimension}
            onChange={(e) => {
              setDimension(e.target.value as Dimension);
              setStressKey("");
            }}
          >
            {dimensions.map((d) => (
              <option key={d} value={d}>
                {dimensionLabels[d]}
              </option>
            ))}
          </select>
        </div>
        {k.valid ? (
          <p>
            <strong>
              Cobertura conocida: {nfmt(matrix.coverage * 100, 1)} %.
            </strong>{" "}
            Sin clasificar: {eur(matrix.unknown)}.{" "}
            {dimension === "theme"
              ? "Las temáticas pueden solaparse y sus pesos no se suman."
              : ""}
          </p>
        ) : (
          <p>
            Cobertura no calculable: faltan operaciones y valoraciones reales.
          </p>
        )}
        <div className="tableScroll">
          <table className="dataTable">
            <caption>
              {dimensionLabels[dimension]} · valoraciones guardadas por producto
            </caption>
            <thead>
              <tr>
                <th>Exposición</th>
                <th>Valor conocido</th>
                <th>Peso</th>
                <th>Productos</th>
                <th>Fuente / fecha</th>
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((r) => (
                <tr key={r.key}>
                  <td>
                    {r.label}
                    <small className="watchMeta">{r.key}</small>
                  </td>
                  <td>{eur(r.value)}</td>
                  <td>{nfmt(r.weight * 100, 2)} %</td>
                  <td>
                    {r.products.join(" · ")}
                    {r.products.length > 1 ? " · Solapamiento" : ""}
                  </td>
                  <td>
                    {r.sources.length
                      ? r.sources.map((s) => (
                          <a
                            key={s.url + s.date}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {s.date} ↗{" "}
                          </a>
                        ))
                      : "Posición directa del libro"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!matrix.rows.length && (
          <p>
            No hay clasificación conocida para esta dimensión. Importa los pesos
            publicados y sus metadatos; no inferimos país, divisa o temática del
            nombre del fondo.
          </p>
        )}
        <Help>
          Los pesos publicados de cada fondo se multiplican por su valor en
          cartera. Los emisores con el mismo identificador se agregan entre
          productos. El resto de cada composición permanece desconocido. La
          moneda EUR de valoración no demuestra exposición subyacente al euro.
          Los metadatos del envoltorio de un fondo no se atribuyen a sus
          componentes.
        </Help>
        <Link href="/exposiciones" className="textLink">
          Importar composición publicada →
        </Link>
        <h3>Escenario configurable</h3>
        <div className="fieldGrid">
          <div className="field">
            <label htmlFor="stress-target">Exposición afectada</label>
            <select
              id="stress-target"
              value={stressKey}
              onChange={(e) => setStressKey(e.target.value)}
            >
              <option value="">Selecciona una exposición conocida</option>
              {matrix.rows.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="stress-shock">Variación hipotética (%)</label>
            <input
              id="stress-shock"
              type="number"
              min="-100"
              max="100"
              step="1"
              value={shock}
              onChange={(e) =>
                setShock(Math.max(-100, Math.min(100, Number(e.target.value))))
              }
            />
          </div>
        </div>
        {stress ? (
          <Info>
            Impacto sobre la exposición conocida:{" "}
            <strong>{eur(stress.impact)}</strong> (
            {percentage(stress.portfolioImpact)} del valor registrado). Quedan{" "}
            {eur(stress.unmodeled)} de exposición desconocida sin modelizar. Es
            un choque lineal hipotético sobre la selección, no una previsión del
            resultado total ni una probabilidad.
          </Info>
        ) : (
          <p className="hint">
            Ejemplo de uso: selecciona Tecnología, si figura en tus datos, y
            aplica −40 %. Los demás activos no reciben un choque y la exposición
            desconocida no se considera inmune.
          </p>
        )}
      </Section>
      <Section
        id="correlaciones"
        title="04 · Correlaciones y contribución al riesgo"
      >
        <Help>
          Correlación de Pearson sobre {window} intervalos diarios comunes, con
          fechas inicial y final idénticas. No rellenamos días sin cotización.
          Una serie plana tiene correlación indefinida. La contribución al
          riesgo usa covarianzas y los pesos actuales como una cartera
          hipotética constante; puede ser negativa y no explica causalmente tu
          resultado histórico.
        </Help>
        {instruments.length >= 2 ? (
          <div className="tableScroll">
            <table className="dataTable">
              <caption>
                Correlaciones · {window} intervalos comunes · EUR
              </caption>
              <thead>
                <tr>
                  <th>Producto</th>
                  {instruments.map((s) => (
                    <th key={s.id}>{s.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {instruments.map((a) => (
                  <tr key={a.id}>
                    <th>{a.name}</th>
                    {instruments.map((b) => (
                      <td key={b.id}>
                        {correlation(a, b, window)?.toFixed(2) ?? "Sin muestra"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>
            Importa al menos dos series de instrumentos en EUR. No se calcula
            una matriz con datos insuficientes.
          </p>
        )}
        {k.risk ? (
          <>
            <p>
              Riesgo anualizado con pesos actuales:{" "}
              {percentage(k.risk.volatility)}. Intervalos comunes: {k.risk.from}{" "}
              → {k.risk.to}.
            </p>
            <div className="tableScroll">
              <table className="dataTable">
                <caption>
                  Contribuciones a la volatilidad · pesos constantes actuales
                </caption>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Contribución absoluta</th>
                    <th>Proporción del riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {k.active.map((h, i) => (
                    <tr key={h.instrument.id}>
                      <td>{h.instrument.name}</td>
                      <td>
                        {(k.risk!.contributions[i].absolute * 100).toFixed(2)}{" "}
                        puntos porcentuales
                      </td>
                      <td>{percentage(k.risk!.contributions[i].share)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="hint">
            Contribución al riesgo no disponible: se necesitan series y una
            muestra común suficiente de todos los productos abiertos, y riesgo
            distinto de cero.
          </p>
        )}
      </Section>
      <Section id="liquidez" title="05 · Liquidez, objetivos y garantías">
        <div className="kpiMetrics">
          {[
            [
              "Liquidez declarada",
              plan.cash === null ? "No informada" : eur(plan.cash),
            ],
            [
              "Reserva elegida",
              k.planReview.reserve === null
                ? "No calculable"
                : eur(k.planReview.reserve),
            ],
            [
              "Disponible tras reserva",
              k.planReview.available === null
                ? "No calculable"
                : eur(k.planReview.available),
            ],
            [
              "Inversiones marcadas a largo plazo",
              k.longTerm === null ? "No disponible" : eur(k.longTerm),
            ],
            [
              "Deuda pendiente declarada",
              plan.debt === null ? "No informada" : eur(plan.debt),
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <Link href="/plan" className="textLink">
          Completar liquidez, obligaciones y objetivos →
        </Link>
        <p className="hint">
          Los ingresos futuros inciertos se excluyen. Las proyecciones de
          objetivos no presuponen rendimientos ni ventas de la cartera.
        </p>
        <div className="tableScroll">
          <table className="dataTable">
            <caption>Necesidades de capital declaradas</caption>
            <thead>
              <tr>
                <th>Objetivo</th>
                <th>Fecha</th>
                <th>Capital</th>
                <th>Proyectado sin rendimiento</th>
                <th>Brecha</th>
                <th>Presupuesto</th>
              </tr>
            </thead>
            <tbody>
              {k.planReview.goals.map((g) => (
                <tr key={g.id}>
                  <td>{g.name}</td>
                  <td>{g.date}</td>
                  <td>{eur(g.target)}</td>
                  <td>{eur(g.projected)}</td>
                  <td>{eur(g.gap)}</td>
                  <td>
                    {g.feasible
                      ? "Coherente con lo declarado"
                      : "Revisar asignación"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details>
          <summary>Marcar inversiones destinadas al largo plazo</summary>
          {state.instruments.map((a) => (
            <label className="checkLine" key={a.id}>
              <input
                type="checkbox"
                checked={data.longTermIds.includes(a.id)}
                onChange={(e) =>
                  save({
                    ...data,
                    longTermIds: e.target.checked
                      ? [...data.longTermIds, a.id]
                      : data.longTermIds.filter((id) => id !== a.id),
                  })
                }
              />
              {a.name}
            </label>
          ))}
        </details>
        <h3>Pignoración · caso declarado</h3>
        {k.collateral ? (
          <p>
            LTV sobre valor de mercado: {percentage(k.collateral.ltv)}.
            Cobertura bancaria declarada:{" "}
            {k.collateral.coverage?.toFixed(2) ?? "Sin deuda"} veces. Margen
            según coeficientes importados: {eur(k.collateral.headroom)}. Fuente:{" "}
            <a
              href={data.collateral!.source}
              target="_blank"
              rel="noopener noreferrer"
            >
              condiciones declaradas
            </a>{" "}
            · {data.collateral!.date}.
          </p>
        ) : (
          <p>
            No hay un caso bancario completo. Puedes incluir deuda y
            coeficientes por producto en el archivo de análisis. No suponemos
            porcentajes de cobertura comunes a todos los bancos ni garantizamos
            financiación.
          </p>
        )}
      </Section>
      <Section
        title="06 · Diagnósticos explicables"
        extra={<Tag>{k.alerts.length} puntos que revisar</Tag>}
      >
        {k.alerts.map((a) => (
          <article className="kpiAlert" key={a.id}>
            <Tag tone={a.level === "review" ? "amber" : "neutral"}>
              {a.level === "review" ? "Revisar" : "Datos pendientes"}
            </Tag>
            <h3>{a.title}</h3>
            <p>
              <strong>Observado:</strong> {a.observed}
            </p>
            <p>
              <strong>Fecha y fuente:</strong> {a.date} · {a.source}
            </p>
            <p>
              <strong>Cambio:</strong> {a.change}
            </p>
            <p>
              <strong>Afecta a:</strong> {a.affected.join(" · ")}
            </p>
            <p>{a.meaning}</p>
            <p>
              <strong>Incertidumbre:</strong> {a.uncertainty}
            </p>
            <p>
              <strong>Falta:</strong> {a.needed}
            </p>
          </article>
        ))}
        <p className="hint">
          Los umbrales son señales educativas configuradas en el motor. No
          generan recomendaciones automáticas de compra o venta.
        </p>
      </Section>
      <Section id="datos" title="Fuentes y datos de análisis">
        <p>
          Esta entrega funciona con el libro existente y datos importados. No
          consulta APIs externas ni envía tu cartera a una IA.
        </p>
        <div className="toolbar">
          <label className="secondaryButton">
            Importar análisis JSON
            <input
              className="visuallyHidden"
              type="file"
              accept=".json,application/json"
              onChange={load}
            />
          </label>
          <button
            className="secondaryButton"
            onClick={() =>
              downloadJson(
                error
                  ? { raw: workspaceStorage().getItem(ANALYSIS_KEY) }
                  : data,
                "brujula-analisis.json",
              )
            }
          >
            Exportar análisis
          </button>
          <button className="textButton" onClick={template}>
            Descargar estructura para mi cartera
          </button>
        </div>
        <p className="hint">
          La estructura descargada no contiene cifras de ejemplo. Completa
          fuentes HTTPS, fechas y al menos dos puntos por serie. Usa índices de
          rentabilidad total, diarios y en EUR; nunca saldos brutos ni precios
          sin ajustar por dividendos. Las series importadas son declaradas, no
          verificadas automáticamente. Los índices de instrumentos y benchmarks
          no son tu rentabilidad personal.
        </p>
        <p className="hint">
          Firma del libro actual: <code>{currentSignature}</code>. Una edición
          de operaciones invalida los KPI históricos de cartera hasta conciliar
          su serie. El análisis se guarda por usuario y forma parte de la copia
          completa v4, que admite copias v1–v3.
        </p>
      </Section>
    </>
  );
}
