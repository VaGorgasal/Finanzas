import {
  day,
  numeric,
  record,
  SourceError,
  text,
  type ReadText,
} from "./http.ts";
import type { CotData, CotMarket } from "./types.ts";
export const COT_CONTRACTS = {
  "088691": "Oro · COMEX",
  "085692": "Cobre · COMEX",
  "067651": "WTI físico · NYMEX",
} as const;
export const COT_SOURCE =
  "https://publicreporting.cftc.gov/stories/s/Disaggregated-Futures/ubmb-6exi/";
export function cotUrl() {
  const url = new URL(
    "https://publicreporting.cftc.gov/resource/72hh-3qpy.json",
  );
  url.searchParams.set(
    "$select",
    "market_and_exchange_names,cftc_contract_market_code,report_date_as_yyyy_mm_dd,open_interest_all,m_money_positions_long_all,m_money_positions_short_all",
  );
  url.searchParams.set(
    "$where",
    "cftc_contract_market_code in ('088691','085692','067651')",
  );
  url.searchParams.set("$order", "report_date_as_yyyy_mm_dd DESC");
  url.searchParams.set("$limit", "24");
  return url.toString();
}
export function parseCot(input: unknown, now: string): CotData {
  if (!Array.isArray(input) || input.length > 24)
    throw new SourceError("Formato COT no válido.");
  const groups = new Map<string, CotMarket[]>();
  for (const item of input) {
    const r = record(item),
      code = text(r.cftc_contract_market_code, 6);
    if (!(code in COT_CONTRACTS))
      throw new SourceError("Contrato COT no solicitado.");
    const raw = text(r.report_date_as_yyyy_mm_dd, 30);
    if (!/^\d{4}-\d{2}-\d{2}T00:00:00\.000$/.test(raw))
      throw new SourceError("Fecha COT no válida.");
    const date = day(raw.slice(0, 10), now),
      long = numeric(r.m_money_positions_long_all),
      short = numeric(r.m_money_positions_short_all),
      openInterest = numeric(r.open_interest_all);
    if (
      [long, short, openInterest].some(
        (n) => n < 0 || !Number.isSafeInteger(n),
      ) ||
      !openInterest ||
      long > openInterest ||
      short > openInterest
    )
      throw new SourceError("Posiciones COT no válidas.");
    const rows = groups.get(code) ?? [];
    if (rows.some((x) => x.date === date))
      throw new SourceError("Contrato y fecha COT duplicados.");
    rows.push({
      code,
      name: COT_CONTRACTS[code as keyof typeof COT_CONTRACTS],
      date,
      long,
      short,
      openInterest,
      net: long - short,
      netPct: ((long - short) / openInterest) * 100,
      previousDate: null,
      change: null,
    });
    groups.set(code, rows);
  }
  const markets: CotMarket[] = [],
    missing: string[] = [];
  for (const [code, name] of Object.entries(COT_CONTRACTS)) {
    const rows = groups.get(code)?.sort((a, b) => b.date.localeCompare(a.date));
    if (!rows?.length) {
      missing.push(name);
      continue;
    }
    const first = rows[0],
      previous = rows[1];
    if (previous) {
      first.previousDate = previous.date;
      const gap =
        (Date.parse(first.date) - Date.parse(previous.date)) / 86400000;
      if (gap === 7) first.change = first.net - previous.net;
    }
    markets.push(first);
  }
  if (!markets.length)
    throw new SourceError("No hay contratos disponibles en el informe COT.");
  return { markets, missing, sourceUrl: COT_SOURCE, publishedAt: null };
}
export async function fetchCot(read: ReadText, now: string) {
  return parseCot(JSON.parse(await read(cotUrl())), now);
}
