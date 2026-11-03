export type Point = { date: string; value: number };
export type Series = {
  id: string;
  name: string;
  unit: string;
  currency: string | null;
  frequency: string;
  source: string;
  sourceUrl: string;
  publishedAt: string | null;
  points: Point[];
  note: string;
};
export type CotMarket = {
  code: string;
  name: string;
  date: string;
  long: number;
  short: number;
  net: number;
  openInterest: number;
  netPct: number;
  previousDate: string | null;
  change: number | null;
};
export type CotData = {
  markets: CotMarket[];
  missing: string[];
  sourceUrl: string;
  publishedAt: null;
};
export type Filing = {
  accession: string;
  form: "13F-HR" | "13F-HR/A";
  period: string;
  filed: string;
  accepted: string | null;
  primaryDocument: string;
  url: string;
};
export type Holding = {
  id: string;
  cusip: string;
  name: string;
  className: string;
  option: string;
  amountType: string;
  shares: number;
  valueUsd: number;
};
export type HoldingChange = {
  id: string;
  name: string;
  cusip: string;
  className: string;
  option: string;
  amountType: string;
  previous: number;
  current: number;
  change: number;
  changePct: number | null;
  kind:
    | "nueva declaración"
    | "deja de declararse"
    | "aumenta títulos"
    | "reduce títulos"
    | "sin cambio";
};
export type SecData = {
  cik: string;
  name: string;
  filings: Filing[];
  current: Filing | null;
  previous: Filing | null;
  holdings: Holding[];
  changes: HoldingChange[];
  comparisonNote: string;
  sourceUrl: string;
};
export type SourceState<T> = {
  status: "available" | "stale" | "unavailable" | "not_configured";
  retrievedAt: string | null;
  data: T | null;
  message: string;
};
export type Intelligence = {
  generatedAt: string;
  ecbRate: SourceState<Series>;
  ecbFx: SourceState<Series>;
  cot: SourceState<CotData>;
  sec: SourceState<SecData>;
};
