export class SourceError extends Error {
  code: "upstream" | "format" | "not_configured";
  constructor(
    message: string,
    code: "upstream" | "format" | "not_configured" = "format",
  ) {
    super(message);
    this.code = code;
  }
}
export type ReadText = (
  url: string,
  options?: { headers?: Record<string, string>; timeoutMs?: number },
) => Promise<string>;
const hosts = new Set([
  "data-api.ecb.europa.eu",
  "publicreporting.cftc.gov",
  "data.sec.gov",
  "www.sec.gov",
]);
export const readText: ReadText = async (url, options) => {
  const target = new URL(url);
  if (
    target.protocol !== "https:" ||
    !hosts.has(target.hostname) ||
    target.username ||
    target.password ||
    target.port
  )
    throw new SourceError("Origen de datos no permitido.");
  try {
    const r = await fetch(target, {
      headers: options?.headers,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(
        Math.max(1, Math.min(options?.timeoutMs ?? 10000, 10000)),
      ),
    });
    if (!r.ok)
      throw new SourceError(
        r.status === 429
          ? "La fuente limita temporalmente las consultas."
          : "La fuente no permite la consulta o no está disponible.",
        "upstream",
      );
    const reader = r.body?.getReader();
    if (!reader) throw new SourceError("Respuesta vacía.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const p = await reader.read();
        if (p.done) break;
        size += p.value.byteLength;
        if (size > 3_000_000) {
          await reader.cancel();
          throw new SourceError("La respuesta supera el límite de tamaño.");
        }
        chunks.push(p.value);
      }
    } finally {
      reader.releaseLock();
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks),
    );
  } catch (e) {
    if (e instanceof SourceError) throw e;
    throw new SourceError(
      "La fuente no ha respondido dentro del tiempo disponible.",
      "upstream",
    );
  }
};
export function record(x: unknown): Record<string, unknown> {
  if (!x || typeof x !== "object" || Array.isArray(x))
    throw new SourceError("Estructura de datos no válida.");
  return x as Record<string, unknown>;
}
export function day(value: unknown, now = new Date().toISOString()): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value > now.slice(0, 10)
  )
    throw new SourceError("Fecha de observación no válida.");
  const d = new Date(value + "T00:00:00Z");
  if (!Number.isFinite(d.valueOf()) || d.toISOString().slice(0, 10) !== value)
    throw new SourceError("Fecha imposible.");
  return value;
}
export function numeric(x: unknown): number {
  if (
    (typeof x !== "string" && typeof x !== "number") ||
    !String(x).trim() ||
    !/^[-+]?\d+(\.\d+)?$/.test(String(x))
  )
    throw new SourceError("Dato numérico ausente o no válido.");
  const n = Number(x);
  if (!Number.isFinite(n) || Math.abs(n) > 1e16)
    throw new SourceError("Dato fuera de rango.");
  return n;
}
export function text(x: unknown, max = 200): string {
  if (typeof x !== "string" || !x.trim() || x.length > max)
    throw new SourceError("Identificador o texto no válido.");
  return x.trim();
}
export function csv(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  const data = input.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (c === '"') {
      if (quoted && data[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === "," || c === "\n")) {
      row.push(cell);
      cell = "";
      if (c === "\n") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else cell += c;
  }
  if (quoted) throw new SourceError("CSV incompleto.");
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift();
  if (
    !headers ||
    new Set(headers).size !== headers.length ||
    rows.length > 1000
  )
    throw new SourceError("Cabecera o tamaño CSV no válidos.");
  return rows.map((r) => {
    if (r.length !== headers.length)
      throw new SourceError("Columnas CSV incompatibles.");
    return Object.fromEntries(headers.map((h, i) => [h, r[i].trim()]));
  });
}
