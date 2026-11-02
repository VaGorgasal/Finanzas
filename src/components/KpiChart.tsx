import type { Point } from "../lib/kpi/data.ts";
export function KpiChart({
  points,
  label,
  percent = false,
}: {
  points: Point[];
  label: string;
  percent?: boolean;
}) {
  if (points.length < 2)
    return <p className="hint">Sin serie suficiente para este gráfico.</p>;
  const min = Math.min(...points.map((p) => p.value)),
    max = Math.max(...points.map((p) => p.value)),
    span = max - min || 1;
  const path = points
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${36 + (i / (points.length - 1)) * 640},${165 - ((p.value - min) / span) * 140}`,
    )
    .join(" ");
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(
      n * (percent ? 100 : 1),
    ) + (percent ? " %" : "");
  return (
    <figure className="kpiChart">
      <figcaption>{label}</figcaption>
      <svg
        viewBox="0 0 710 205"
        role="img"
        aria-label={`${label}. De ${points[0].date} a ${points.at(-1)!.date}. Valores de ${fmt(min)} a ${fmt(max)}.`}
      >
        <line
          x1="36"
          x2="676"
          y1="165"
          y2="165"
          stroke="currentColor"
          opacity=".15"
        />
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" />
        <text x="36" y="195">
          {points[0].date}
        </text>
        <text x="676" y="195" textAnchor="end">
          {points.at(-1)!.date}
        </text>
        <text x="36" y="17">
          {fmt(max)}
        </text>
        <text x="676" y="17" textAnchor="end">
          mín. {fmt(min)}
        </text>
      </svg>
      <details>
        <summary>Ver datos del gráfico ({points.length})</summary>
        <div className="tableScroll kpiChartData">
          <table className="dataTable">
            <caption>{label}</caption>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date}>
                  <td>{p.date}</td>
                  <td>{fmt(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
