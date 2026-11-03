import { SourceError } from "./http.ts";
import type { Intelligence, SourceState } from "./types.ts";
export function sourceState<T>(
  data: T,
  retrievedAt: string,
  now: string,
  maxAgeSeconds: number,
  observationOld = false,
): SourceState<T> {
  const stale =
    Date.parse(now) - Date.parse(retrievedAt) > maxAgeSeconds * 1000 ||
    observationOld;
  return {
    status: stale ? "stale" : "available",
    retrievedAt,
    data,
    message: stale
      ? "Último dato disponible; revisa su fecha y la fecha de consulta. No se presenta como una nueva publicación."
      : "",
  };
}
export function failedSource<T>(error: unknown): SourceState<T> {
  return {
    status:
      error instanceof SourceError && error.code === "not_configured"
        ? "not_configured"
        : "unavailable",
    retrievedAt: null,
    data: null,
    message:
      error instanceof SourceError
        ? error.message
        : "Respuesta de la fuente no compatible. No se han generado cifras de sustitución.",
  };
}
export async function intelligenceQuery(input: {
  enabled: boolean;
  authorize: () => Promise<unknown>;
  load: () => Promise<Intelligence>;
}) {
  if (!input.enabled)
    throw new SourceError(
      "Los conectores públicos están pendientes de activar.",
      "not_configured",
    );
  await input.authorize();
  return input.load();
}

export function mergeSnapshot(
  previous: Intelligence | null,
  next: Intelligence,
): Intelligence {
  if (!previous) return next;
  const keep = <T>(
    old: SourceState<T>,
    fresh: SourceState<T>,
  ): SourceState<T> =>
    fresh.data === null && old.data !== null
      ? {
          ...old,
          status: "stale",
          message:
            fresh.message +
            " Se conserva la última respuesta disponible con su fecha original.",
        }
      : fresh;
  return {
    ...next,
    ecbRate: keep(previous.ecbRate, next.ecbRate),
    ecbFx: keep(previous.ecbFx, next.ecbFx),
    cot: keep(previous.cot, next.cot),
    sec: keep(previous.sec, next.sec),
  };
}
