"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useIntelligence } from "../context/IntelligenceContext";
import { useAccount } from "../context/AccountContext";
import { Section, Tag } from "./Common";
import { KpiChart } from "./KpiChart";
import { downloadJson } from "../lib/backup.ts";
import type {
  Intelligence,
  Series,
  SourceState,
} from "../lib/intelligence/types.ts";
const number = (x: number, digits = 2) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: digits }).format(x);
const statusNames = {
  available: "Dato disponible",
  stale: "Revisar fecha",
  unavailable: "Fuente no disponible",
  not_configured: "Configuración pendiente",
};
function Status({ value }: { value: SourceState<unknown> }) {
  return (
    <Tag tone={value.status === "available" ? "mint" : "amber"}>
      {statusNames[value.status]}
    </Tag>
  );
}
function Retrieved({ value }: { value: SourceState<unknown> }) {
  return (
    <p className="hint">
      Consulta al origen: {value.retrievedAt ?? "todavía no realizada"}.{" "}
      {value.message}
    </p>
  );
}
function SeriesCard({ value }: { value: SourceState<Series> }) {
  const series = value.data,
    last = series?.points.at(-1),
    previous = series?.points.at(-2);
  return (
    <article className="marketSourceCard">
      <Status value={value} />
      <h3>{series?.name ?? "Serie BCE pendiente"}</h3>
      {series && last ? (
        <>
          <strong className="marketSourceValue">
            {number(last.value, 4)} <small>{series.unit}</small>
          </strong>
          <p>
            Observado: <strong>{last.date}</strong>
          </p>
          <p className="hint">
            {previous
              ? `Cambio desde ${previous.date}: ${number(last.value - previous.value, 4)} ${series.unit === "USD por EUR" ? "USD por EUR" : "puntos porcentuales"}.`
              : "Sin observación anterior comparable."}
          </p>
          <p>{series.note}</p>
          <details>
            <summary>Histórico y fuente</summary>
            <KpiChart
              points={series.points}
              label={series.name + " · " + series.unit}
            />
            <a
              className="tinyLink"
              href={series.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {series.source} ↗
            </a>
            <p className="hint">
              Fecha de publicación: no suministrada en esta consulta.
            </p>
          </details>
        </>
      ) : (
        <p>
          Sin cifras de sustitución. La serie se mostrará cuando el origen
          responda con unidades y fechas válidas.
        </p>
      )}
      <Retrieved value={value} />
    </article>
  );
}
export function MarketDataView({ data }: { data: Intelligence }) {
  const cot = data.cot.data,
    sec = data.sec.data;
  const changes = sec?.changes.filter((x) => x.kind !== "sin cambio") ?? [];
  return (
    <>
      <Section
        id="macro"
        title="Tipos y divisas"
        extra={<Tag>Fuente original · BCE</Tag>}
      >
        <div className="marketSourceGrid">
          <SeriesCard value={data.ecbRate} />
          <SeriesCard value={data.ecbFx} />
        </div>
      </Section>
      <Section
        id="posicionamiento"
        title="Posicionamiento en materias primas"
        extra={<Status value={data.cot} />}
      >
        <p>
          Managed Money · informe desagregado de futuros, sin opciones. Los
          contratos de oro, cobre y WTI se muestran por separado.
        </p>
        {cot ? (
          <>
            <div className="tableScroll">
              <table className="dataTable">
                <caption>Contratos declarados · CFTC</caption>
                <thead>
                  <tr>
                    <th>Mercado</th>
                    <th>Posiciones a</th>
                    <th>Largos</th>
                    <th>Cortos</th>
                    <th>Neto</th>
                    <th>Neto / interés abierto</th>
                    <th>Variación semanal</th>
                  </tr>
                </thead>
                <tbody>
                  {cot.markets.map((m) => (
                    <tr key={m.code}>
                      <td>{m.name}</td>
                      <td>{m.date}</td>
                      <td>{number(m.long, 0)}</td>
                      <td>{number(m.short, 0)}</td>
                      <td>{number(m.net, 0)}</td>
                      <td>{number(m.netPct)} %</td>
                      <td>
                        {m.change === null
                          ? "Sin semana comparable"
                          : number(m.change, 0) + " contratos"}
                        {m.previousDate && (
                          <small className="marketSmall">
                            Frente a {m.previousDate}
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cot.missing.length > 0 && (
              <p className="info info-amber">
                Sin datos para: {cot.missing.join(", ")}.
              </p>
            )}
            <a
              className="tinyLink"
              href={cot.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Informe y metodología · CFTC ↗
            </a>
          </>
        ) : (
          <p>
            No hay posiciones disponibles. Una fuente ausente no equivale a
            posicionamiento cero.
          </p>
        )}
        <Retrieved value={data.cot} />
        <p className="hint">
          Son posiciones agregadas, no flujos monetarios ni señales de compra o
          venta. La publicación suele ser posterior a la observación; no se
          inventa su hora exacta.
        </p>
      </Section>
      <Section
        id="institucionales"
        title="Seguimiento institucional · 13F"
        extra={<Status value={data.sec} />}
      >
        <p>
          Soros Fund Management · CIK 0001029160. Seguimiento de un gestor
          público; no se utiliza tu cartera personal para consultar la SEC.
        </p>
        {sec ? (
          <>
            <p>{sec.comparisonNote}</p>
            <div className="tableScroll">
              <table className="dataTable">
                <caption>
                  Últimas declaraciones localizadas · {sec.name}
                </caption>
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th>Presentación</th>
                    <th>Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.filings.slice(0, 8).map((f) => (
                    <tr key={f.accession}>
                      <td>{f.period}</td>
                      <td>{f.filed}</td>
                      <td>
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {f.form} · {f.accession} ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sec.holdings.length > 0 && (
              <details>
                <summary>
                  Posiciones declaradas a {sec.current?.period} (
                  {sec.holdings.length})
                </summary>
                <div className="tableScroll">
                  <table className="dataTable">
                    <caption>
                      Veinte mayores valores declarados en USD. No es su valor
                      actual.
                    </caption>
                    <thead>
                      <tr>
                        <th>Emisor / clase</th>
                        <th>CUSIP</th>
                        <th>Tipo</th>
                        <th>Cantidad</th>
                        <th>Valor declarado USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sec.holdings.slice(0, 20).map((h) => (
                        <tr key={h.id}>
                          <td>
                            {h.name}
                            <small className="marketSmall">{h.className}</small>
                          </td>
                          <td>{h.cusip}</td>
                          <td>{h.option || h.amountType}</td>
                          <td>{number(h.shares, 0)}</td>
                          <td>{number(h.valueUsd, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
            {changes.length > 0 && (
              <details>
                <summary>
                  Cambios entre {sec.previous?.period} y {sec.current?.period} (
                  {changes.length})
                </summary>
                <div className="tableScroll">
                  <table className="dataTable">
                    <caption>
                      Hasta cincuenta cambios, por nombre. Exporta para
                      consultar el conjunto.
                    </caption>
                    <thead>
                      <tr>
                        <th>Emisor / clase</th>
                        <th>Tipo</th>
                        <th>Anterior</th>
                        <th>Actual</th>
                        <th>Cambio en cantidades</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changes.slice(0, 50).map((h) => (
                        <tr key={h.id}>
                          <td>
                            {h.name}
                            <small className="marketSmall">
                              {h.className} · {h.cusip}
                            </small>
                          </td>
                          <td>{h.option || h.amountType}</td>
                          <td>{number(h.previous, 0)}</td>
                          <td>{number(h.current, 0)}</td>
                          <td>
                            {h.kind}
                            <small className="marketSmall">
                              {number(h.change, 0)}
                              {h.changePct !== null
                                ? " · " + number(h.changePct) + " %"
                                : ""}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
            <a
              className="tinyLink"
              href={sec.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Historial completo en SEC EDGAR ↗
            </a>
          </>
        ) : (
          <p>
            El conector requiere que el servidor se identifique ante SEC con un
            contacto técnico real. No necesita una clave de pago.
          </p>
        )}
        <Retrieved value={data.sec} />
        <p className="hint">
          13F es una foto parcial y retrasada: no incluye posiciones cortas ni
          garantiza conocer todas las inversiones. Una enmienda bloquea la
          comparación hasta su conciliación. No se convierten cambios declarados
          en recomendaciones.
        </p>
      </Section>
      <div className="toolbar">
        <button
          className="secondaryButton"
          onClick={() => downloadJson(data, "brujula-fuentes-publicas.json")}
        >
          Exportar datos y fuentes consultados
        </button>
      </div>
    </>
  );
}
export function MarketData() {
  const { data, loading, error, refresh } = useIntelligence(),
    { user } = useAccount();
  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);
  return (
    <div className="publicMarketData">
      <Section
        title="Datos publicados por sus fuentes"
        extra={
          <button
            className="secondaryButton"
            disabled={!user || loading}
            onClick={refresh}
          >
            {loading ? "Consultando…" : "Consultar fuentes"}
          </button>
        }
      >
        <p>
          Actualización cada 30 minutos con la pestaña visible. Cada fuente
          conserva su frecuencia real; consultar de nuevo no crea una
          publicación nueva.
        </p>
        {!user && (
          <p>
            <Link href="/cuenta">Inicia sesión</Link> para consultar los
            conectores.
          </p>
        )}
        {error && (
          <p className="info info-amber" role="alert">
            {error}{" "}
            {data
              ? "Se conservan en esta vista los datos anteriores con sus fechas."
              : ""}
          </p>
        )}
        {loading && <p role="status">Consultando fuentes oficiales…</p>}
        {!data && !loading && user && !error && (
          <p>Las fuentes todavía no se han consultado.</p>
        )}
      </Section>
      {data && <MarketDataView data={data} />}
      <Section title="Cobertura que sigue pendiente">
        <p>
          VIX, crédito high yield, liquidez global, flujos de ETF y
          fundamentales no están incluidos en estos tres conectores. Las
          noticias y sus interpretaciones de IA son servicios separados.
        </p>
      </Section>
    </div>
  );
}
