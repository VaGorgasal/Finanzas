import { csv, day, numeric, SourceError, type ReadText } from "./http.ts";
import type { Series } from "./types.ts";
export const ECB = {
  rate: {
    key: "FM.D.U2.EUR.4F.KR.DFR.LEV",
    path: "FM/D.U2.EUR.4F.KR.DFR.LEV",
    name: "Facilidad de depósito BCE",
    unit: "% anual",
    expectedUnit: "PCPA",
    currency: null,
    note: "Tipo oficial del BCE. La fecha corresponde a la observación; no es una previsión.",
  },
  fx: {
    key: "EXR.D.USD.EUR.SP00.A",
    path: "EXR/D.USD.EUR.SP00.A",
    name: "Euro / dólar",
    unit: "USD por EUR",
    expectedUnit: "USD",
    currency: "USD",
    note: "Cambio de referencia: dólares por un euro. Para convertir USD a EUR se divide por este valor; no es una cotización ejecutable.",
  },
} as const;
export function parseEcb(
  input: string,
  kind: keyof typeof ECB,
  now: string,
): Series {
  const def = ECB[kind],
    seen = new Set<string>();
  const points = csv(input)
    .flatMap((r) => {
      if (
        r.KEY !== def.key ||
        r.UNIT !== def.expectedUnit ||
        r.UNIT_MULT !== "0"
      )
        throw new SourceError(
          "La serie BCE o sus unidades no coinciden con las solicitadas.",
        );
      const date = day(r.TIME_PERIOD, now);
      if (seen.has(date)) throw new SourceError("Observación BCE duplicada.");
      seen.add(date);
      if (
        !r.OBS_VALUE ||
        r.OBS_VALUE === "." ||
        ["M", "L", "Q"].includes(r.OBS_STATUS)
      )
        return [];
      const value = numeric(r.OBS_VALUE);
      if (
        (kind === "fx" && value <= 0) ||
        (kind === "rate" && (value < -20 || value > 100))
      )
        throw new SourceError("Valor BCE fuera de rango.");
      return [{ date, value }];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!points.length)
    throw new SourceError(
      "La serie BCE no contiene observaciones disponibles.",
    );
  return {
    id: def.key,
    name: def.name,
    unit: def.unit,
    currency: def.currency,
    frequency: "Diaria según publicación BCE",
    source: "Banco Central Europeo",
    sourceUrl:
      "https://data.ecb.europa.eu/data/datasets/" +
      def.key.split(".")[0] +
      "/" +
      def.key,
    publishedAt: null,
    points,
    note: def.note,
  };
}
export async function fetchEcb(
  kind: keyof typeof ECB,
  read: ReadText,
  now: string,
) {
  return parseEcb(
    await read(
      "https://data-api.ecb.europa.eu/service/data/" +
        ECB[kind].path +
        "?lastNObservations=260&format=csvdata",
    ),
    kind,
    now,
  );
}
