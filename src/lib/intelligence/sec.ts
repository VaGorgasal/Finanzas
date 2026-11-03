import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  day,
  numeric,
  record,
  SourceError,
  text,
  type ReadText,
} from "./http.ts";
import type { Filing, Holding, HoldingChange, SecData } from "./types.ts";
export const SEC_CIK = "0001029160";
export const SEC_SOURCE =
  "https://www.sec.gov/edgar/browse/?CIK=1029160&owner=exclude";
export function secIdentity(value: string | undefined) {
  if (
    !value ||
    value.length > 200 ||
    /[\r\n]/.test(value) ||
    !/^[\x20-\x7e]+$/.test(value) ||
    !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value) ||
    /example\.|\.invalid\b|tudominio/i.test(value)
  )
    throw new SourceError(
      "SEC pendiente: configura SEC_USER_AGENT con el nombre de la aplicación y un correo técnico real.",
      "not_configured",
    );
  return value;
}
export function parseSubmissions(
  input: unknown,
  now: string,
): { name: string; filings: Filing[] } {
  const root = record(input);
  if (String(root.cik).padStart(10, "0") !== SEC_CIK)
    throw new SourceError("La identidad CIK no coincide.");
  const name = text(root.name),
    recent = record(record(root.filings).recent),
    forms = recent.form;
  if (!Array.isArray(forms) || forms.length > 10000)
    throw new SourceError("Lista de declaraciones no válida.");
  const columns = [
    "accessionNumber",
    "filingDate",
    "reportDate",
    "primaryDocument",
  ] as const;
  for (const key of columns)
    if (
      !Array.isArray(recent[key]) ||
      (recent[key] as unknown[]).length !== forms.length
    )
      throw new SourceError("Columnas SEC desalineadas.");
  const filings: Filing[] = [],
    seen = new Set<string>();
  forms.forEach((form, i) => {
    if (form !== "13F-HR" && form !== "13F-HR/A") return;
    const at = (key: string) => (recent[key] as unknown[])?.[i];
    const accession = text(at("accessionNumber"), 20);
    if (!/^\d{10}-\d{2}-\d{6}$/.test(accession) || seen.has(accession))
      throw new SourceError("Accession SEC no válido o duplicado.");
    seen.add(accession);
    const period = day(at("reportDate"), now),
      filed = day(at("filingDate"), now);
    if (period > filed || !/^\d{4}-(03-31|06-30|09-30|12-31)$/.test(period))
      throw new SourceError("Periodo 13F no compatible.");
    const primaryDocument = text(at("primaryDocument"), 160);
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*\.xml$/i.test(primaryDocument))
      throw new SourceError("Documento primario SEC no compatible.");
    const rawAccepted = at("acceptanceDateTime");
    const accepted =
      typeof rawAccepted === "string" &&
      /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(rawAccepted) &&
      Number.isFinite(Date.parse(rawAccepted)) &&
      Date.parse(rawAccepted) <= Date.parse(now)
        ? rawAccepted
        : null;
    filings.push({
      accession,
      form,
      period,
      filed,
      accepted,
      primaryDocument,
      url: filingBase(accession) + accession + "-index.html",
    });
  });
  return {
    name,
    filings: filings.sort(
      (a, b) =>
        b.period.localeCompare(a.period) ||
        b.filed.localeCompare(a.filed) ||
        b.accession.localeCompare(a.accession),
    ),
  };
}
function filingBase(accession: string) {
  if (!/^\d{10}-\d{2}-\d{6}$/.test(accession))
    throw new SourceError("Accession no válido.");
  return (
    "https://www.sec.gov/Archives/edgar/data/1029160/" +
    accession.replaceAll("-", "") +
    "/"
  );
}
export function parseHoldings(
  xml: string,
  filing: Filing,
  now: string,
): Holding[] {
  day(filing.filed, now);
  if (/<!\s*(DOCTYPE|ENTITY)/i.test(xml) || XMLValidator.validate(xml) !== true)
    throw new SourceError(
      "XML SEC no válido o con declaraciones no permitidas.",
    );
  const parsed = record(
    new XMLParser({
      removeNSPrefix: true,
      parseTagValue: false,
      parseAttributeValue: false,
      trimValues: true,
      maxNestedTags: 30,
    }).parse(xml),
  );
  const root = record(parsed.informationTable),
    raw = root.infoTable,
    rows = Array.isArray(raw) ? raw : [raw];
  if (!rows.length || rows.length > 10000)
    throw new SourceError("Tabla 13F vacía o demasiado grande.");
  const multiplier = filing.filed < "2023-01-03" ? 1000 : 1,
    groups = new Map<string, Holding>();
  for (const row of rows) {
    const r = record(row),
      amount = record(r.shrsOrPrnAmt),
      cusip = text(r.cusip, 9).toUpperCase(),
      className = text(r.titleOfClass, 100),
      name = text(r.nameOfIssuer),
      option = r.putCall ? text(r.putCall, 4).toUpperCase() : "",
      amountType = text(amount.sshPrnamtType, 3).toUpperCase();
    if (
      !/^[A-Z0-9*@#]{9}$/.test(cusip) ||
      !["", "PUT", "CALL"].includes(option) ||
      !["SH", "PRN"].includes(amountType)
    )
      throw new SourceError("Identidad de posición 13F no válida.");
    const shares = numeric(amount.sshPrnamt),
      valueUsd = numeric(r.value) * multiplier;
    if (shares < 0 || valueUsd < 0 || !Number.isSafeInteger(valueUsd))
      throw new SourceError("Importe 13F no válido.");
    const id = [cusip, className.toUpperCase(), option, amountType].join("|"),
      old = groups.get(id);
    const holding = {
      id,
      cusip,
      name,
      className,
      option,
      amountType,
      shares: shares + (old?.shares ?? 0),
      valueUsd: valueUsd + (old?.valueUsd ?? 0),
    };
    if (
      !Number.isSafeInteger(holding.valueUsd) ||
      !Number.isFinite(holding.shares)
    )
      throw new SourceError("Agregación 13F fuera de rango.");
    groups.set(id, holding);
  }
  return [...groups.values()].sort((a, b) => b.valueUsd - a.valueUsd);
}
export function compareHoldings(
  current: Holding[],
  previous: Holding[],
): HoldingChange[] {
  const a = new Map(current.map((x) => [x.id, x])),
    b = new Map(previous.map((x) => [x.id, x]));
  return [...new Set([...a.keys(), ...b.keys()])]
    .map((id) => {
      const x = a.get(id),
        y = b.get(id),
        h = x ?? y!,
        before = y?.shares ?? 0,
        after = x?.shares ?? 0,
        change = after - before;
      return {
        id,
        name: h.name,
        cusip: h.cusip,
        className: h.className,
        option: h.option,
        amountType: h.amountType,
        previous: before,
        current: after,
        change,
        changePct: before > 0 ? (change / before) * 100 : null,
        kind: !y
          ? "nueva declaración"
          : !x
            ? "deja de declararse"
            : change > 0
              ? "aumenta títulos"
              : change < 0
                ? "reduce títulos"
                : "sin cambio",
      } as HoldingChange;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
function consecutive(previous: string, current: string) {
  const d = new Date(current + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() - 2, 0);
  return d.toISOString().slice(0, 10) === previous;
}
async function table(
  filing: Filing,
  read: ReadText,
  headers: Record<string, string>,
  now: string,
) {
  const base = filingBase(filing.accession),
    listing = record(JSON.parse(await read(base + "index.json", { headers }))),
    items = record(listing.directory).item;
  if (!Array.isArray(items) || items.length > 100)
    throw new SourceError("Índice de archivos SEC no compatible.");
  const files = items
    .map(record)
    .map((x) => x.name)
    .filter(
      (x): x is string =>
        typeof x === "string" &&
        /^[A-Za-z0-9][A-Za-z0-9_.-]*\.xml$/i.test(x) &&
        x !== filing.primaryDocument,
    )
    .sort(
      (a, b) => Number(/info|table/i.test(b)) - Number(/info|table/i.test(a)),
    );
  // Never follow arbitrary URLs or an XSL-rendered page from a filing.
  for (const name of files.slice(0, 2)) {
    const xml = await read(base + name, { headers });
    if (/<(?:[\w-]+:)?informationTable\b/.test(xml))
      return parseHoldings(xml, filing, now);
  }
  throw new SourceError(
    "No se ha localizado una tabla de posiciones XML compatible.",
  );
}
export async function fetchSec(
  read: ReadText,
  now: string,
  userAgent: string | undefined,
): Promise<SecData> {
  const headers = { "User-Agent": secIdentity(userAgent) },
    parsed = parseSubmissions(
      JSON.parse(
        await read("https://data.sec.gov/submissions/CIK" + SEC_CIK + ".json", {
          headers,
        }),
      ),
      now,
    );
  const originals = parsed.filings.filter((x) => x.form === "13F-HR"),
    current = originals[0] ?? null,
    previous = originals.find((x) => x.period !== current?.period) ?? null;
  const base = {
    cik: SEC_CIK,
    name: parsed.name,
    filings: parsed.filings.slice(0, 20),
    current,
    previous,
    holdings: [],
    changes: [],
    sourceUrl: SEC_SOURCE,
  };
  if (!current)
    return {
      ...base,
      comparisonNote:
        "No se encuentran declaraciones originales 13F-HR en el historial reciente.",
    };
  if (
    parsed.filings.some(
      (x) =>
        x.form === "13F-HR/A" &&
        (x.period === current.period || x.period === previous?.period),
    )
  )
    return {
      ...base,
      comparisonNote:
        "Hay enmiendas en los periodos comparados. No se calculan posiciones ni cambios hasta conciliarlas con el informe original.",
    };
  try {
    const holdings = await table(current, read, headers, now);
    if (!previous || !consecutive(previous.period, current.period))
      return {
        ...base,
        holdings,
        comparisonNote:
          "Falta un trimestre anterior consecutivo en el historial reciente. No se inventan entradas ni salidas.",
      };
    const old = await table(previous, read, headers, now);
    return {
      ...base,
      holdings,
      changes: compareHoldings(holdings, old),
      comparisonNote:
        "Cambios en títulos declarados entre dos cierres consecutivos. No prueban compras o ventas: pueden incluir operaciones corporativas. No se concilian posiciones confidenciales.",
    };
  } catch (e) {
    if (!(e instanceof SourceError)) throw e;
    return {
      ...base,
      comparisonNote:
        "Declaraciones localizadas; posiciones no disponibles: " + e.message,
    };
  }
}
