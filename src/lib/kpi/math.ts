import type { Point, Series } from "./data.ts";
export type ReturnPoint = { from: string; date: string; value: number };
export function returns(points: Point[]): ReturnPoint[] {
  return points.slice(1).map((p, i) => ({
    from: points[i].date,
    date: p.date,
    value: p.value / points[i].value - 1,
  }));
}
export function twr(
  periods: { opening: number; closing: number }[],
): number | null {
  if (
    !periods.length ||
    periods.some(
      (p) =>
        !Number.isFinite(p.opening) ||
        p.opening <= 0 ||
        !Number.isFinite(p.closing) ||
        p.closing < 0,
    )
  )
    return null;
  const result = periods.reduce((v, p) => (v * p.closing) / p.opening, 1) - 1;
  return Number.isFinite(result) ? result : null;
}
export function totalReturn(points: Point[]) {
  return twr(
    points
      .slice(1)
      .map((p, i) => ({ opening: points[i].value, closing: p.value })),
  );
}
const ms = (date: string) => Date.parse(date + "T00:00:00Z");
const days = (a: string, b: string) => (ms(b) - ms(a)) / 86400000;
export function dailyWindow(
  series: Series,
  window: number,
): ReturnPoint[] | null {
  if (![30, 90, 252].includes(window)) return null;
  const r = returns(series.points).slice(-window);
  return r.length === window && r.every((p) => days(p.from, p.date) <= 7)
    ? r
    : null;
}
export function variance(values: number[]) {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((n, v) => n + (v - mean) ** 2, 0) / (values.length - 1);
}
export function volatility(series: Series, window: number) {
  const r = dailyWindow(series, window);
  if (!r) return null;
  const v = variance(r.map((p) => p.value));
  return v === null ? null : Math.sqrt(v * 252);
}
export function rollingVolatility(series: Series, window: number): Point[] {
  const r = returns(series.points),
    out: Point[] = [];
  for (let i = window; i <= r.length; i++) {
    const sample = r.slice(i - window, i);
    if (sample.every((p) => days(p.from, p.date) <= 7)) {
      const v = variance(sample.map((p) => p.value));
      if (v !== null)
        out.push({ date: sample.at(-1)!.date, value: Math.sqrt(v * 252) });
    }
  }
  return out;
}
export type Episode = {
  peak: string;
  trough: string;
  recovered: string | null;
  depth: number;
  daysToTrough: number;
  recoveryDays: number | null;
  durationDays: number;
};
export function drawdown(points: Point[]) {
  if (points.length < 2) return null;
  let peak = points[0],
    episode: Episode | null = null;
  const episodes: Episode[] = [],
    curve: Point[] = [];
  for (const p of points) {
    if (p.value >= peak.value) {
      if (episode) {
        episode.recovered = p.date;
        episode.recoveryDays = days(episode.trough, p.date);
        episode.durationDays = days(episode.peak, p.date);
        episodes.push(episode);
        episode = null;
      }
      peak = p;
    }
    const depth = p.value / peak.value - 1;
    curve.push({ date: p.date, value: depth });
    if (depth < 0) {
      episode ??= {
        peak: peak.date,
        trough: p.date,
        recovered: null,
        depth,
        daysToTrough: days(peak.date, p.date),
        recoveryDays: null,
        durationDays: days(peak.date, p.date),
      };
      episode.durationDays = days(peak.date, p.date);
      if (depth < episode.depth) {
        episode.depth = depth;
        episode.trough = p.date;
        episode.daysToTrough = days(peak.date, p.date);
      }
    }
  }
  if (episode) episodes.push(episode);
  return {
    current: curve.at(-1)!.value,
    max: Math.min(0, ...episodes.map((e) => e.depth)),
    episodes,
    curve,
  };
}
export function periodReturns(series: Series) {
  const p = series.points,
    last = p.at(-1)!;
  const year = Number(last.date.slice(0, 4)),
    month = Number(last.date.slice(5, 7));
  const monthly = new Date(Date.UTC(year, month - 1, 0))
    .toISOString()
    .slice(0, 10);
  const yearly = `${year - 1}-12-31`;
  const change = (boundary: string) => {
    const first = p.filter((x) => x.date <= boundary).at(-1);
    return first && days(first.date, boundary) <= 7
      ? { from: first.date, to: last.date, value: last.value / first.value - 1 }
      : null;
  };
  const previous = p.at(-2);
  return {
    daily:
      previous && days(previous.date, last.date) <= 7
        ? {
            from: previous.date,
            to: last.date,
            value: last.value / previous.value - 1,
          }
        : null,
    monthly: change(monthly),
    yearly: change(yearly),
    historical: {
      from: p[0].date,
      to: last.date,
      value: last.value / p[0].value - 1,
    },
  };
}
export function compareSeries(a: Series, b: Series) {
  const other = new Map(b.points.map((p) => [p.date, p]));
  const common = a.points.filter((p) => other.has(p.date));
  if (common.length < 2) return null;
  const first = common[0],
    last = common.at(-1)!;
  const own = last.value / first.value - 1,
    benchmark = other.get(last.date)!.value / other.get(first.date)!.value - 1;
  return {
    from: first.date,
    to: last.date,
    own,
    benchmark,
    gap: own - benchmark,
  };
}
export function alignedReturns(
  series: Series[],
  window: number,
  multiple: 1 | 2 = 1,
) {
  if (![30, 90, 252].includes(window) || !series.length) return null;
  const maps = series.map(
    (s) =>
      new Map(
        returns(s.points)
          .filter((p) => days(p.from, p.date) <= 7)
          .map((p) => [p.from + "|" + p.date, p.value]),
      ),
  );
  const keys = [...maps[0].keys()]
    .filter((k) => maps.every((m) => m.has(k)))
    .slice(-window * multiple);
  if (keys.length < window * multiple) return null;
  return { keys, values: maps.map((m) => keys.map((k) => m.get(k)!)) };
}
export function covariance(a: number[], b: number[]) {
  if (a.length !== b.length || a.length < 2) return null;
  const am = a.reduce((x, y) => x + y, 0) / a.length,
    bm = b.reduce((x, y) => x + y, 0) / b.length;
  return (
    a.reduce((sum, x, i) => sum + (x - am) * (b[i] - bm), 0) / (a.length - 1)
  );
}
export function correlation(a: Series, b: Series, window: number) {
  const aligned = alignedReturns([a, b], window);
  if (!aligned) return null;
  const [x, y] = aligned.values,
    vx = variance(x)!,
    vy = variance(y)!;
  if (vx <= 1e-20 || vy <= 1e-20) return null;
  return Math.max(-1, Math.min(1, covariance(x, y)! / Math.sqrt(vx * vy)));
}
export function riskContributions(
  series: Series[],
  weights: number[],
  window: number,
) {
  if (
    series.length !== weights.length ||
    weights.some((w) => !Number.isFinite(w) || w < 0) ||
    Math.abs(weights.reduce((a, b) => a + b, 0) - 1) > 1e-6
  )
    return null;
  const aligned = alignedReturns(series, window);
  if (!aligned) return null;
  const cov = series.map((_, i) =>
    series.map(
      (_, j) => covariance(aligned.values[i], aligned.values[j])! * 252,
    ),
  );
  const marginal = weights.map((_, i) =>
    weights.reduce((sum, w, j) => sum + w * cov[i][j], 0),
  );
  const v = weights.reduce((sum, w, i) => sum + w * marginal[i], 0);
  if (v <= 1e-20) return null;
  const vol = Math.sqrt(v);
  return {
    volatility: vol,
    contributions: weights.map((w, i) => ({
      absolute: (w * marginal[i]) / vol,
      share: (w * marginal[i]) / v,
    })),
    from: aligned.keys[0].split("|")[0],
    to: aligned.keys.at(-1)!.split("|")[1],
  };
}

export function correlationChange(a: Series, b: Series, window: number) {
  const current = correlation(a, b, window);
  if (current === null) return null;
  const aligned = alignedReturns([a, b], window, 2);
  const prior = aligned ? aligned.values.map((v) => v.slice(0, window)) : null;
  let previous: number | null = null;
  if (prior) {
    const va = variance(prior[0])!,
      vb = variance(prior[1])!;
    if (va > 1e-20 && vb > 1e-20)
      previous = Math.max(
        -1,
        Math.min(1, covariance(prior[0], prior[1])! / Math.sqrt(va * vb)),
      );
  }
  const dates = alignedReturns([a, b], window)!.keys;
  return {
    current,
    previous,
    delta: previous === null ? null : current - previous,
    date: dates.at(-1)!.split("|")[1],
  };
}
