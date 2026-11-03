import { unstable_cache } from "next/cache";
import { fetchEcb } from "./ecb.ts";
import { fetchCot } from "./cftc.ts";
import { fetchSec, secIdentity } from "./sec.ts";
import { readText, SourceError, type ReadText } from "./http.ts";
import { failedSource, sourceState } from "./query.ts";
import type { Intelligence, SourceState } from "./types.ts";
export const INTELLIGENCE_TAG = "brujula-public-intelligence-v1";
const stamp = () => new Date().toISOString();
// Cache normalized public observations, including their original retrieval time.
// Authentication and all portfolio data stay outside this shared Data Cache.
const rate = unstable_cache(
  async () => {
    const retrievedAt = stamp();
    return { data: await fetchEcb("rate", readText, retrievedAt), retrievedAt };
  },
  ["ecb-rate-v1"],
  { revalidate: 21600, tags: [INTELLIGENCE_TAG] },
);
const fx = unstable_cache(
  async () => {
    const retrievedAt = stamp();
    return { data: await fetchEcb("fx", readText, retrievedAt), retrievedAt };
  },
  ["ecb-fx-v1"],
  { revalidate: 21600, tags: [INTELLIGENCE_TAG] },
);
const cot = unstable_cache(
  async () => {
    const retrievedAt = stamp();
    return { data: await fetchCot(readText, retrievedAt), retrievedAt };
  },
  ["cftc-disagg-v1"],
  { revalidate: 3600, tags: [INTELLIGENCE_TAG] },
);
const sec = unstable_cache(
  async () => {
    const retrievedAt = stamp(),
      deadline = Date.now() + 40000;
    const read: ReadText = (url, options) => {
      const left = deadline - Date.now();
      if (left < 1)
        throw new SourceError(
          "SEC ha superado el tiempo de consulta disponible.",
          "upstream",
        );
      return readText(url, { ...options, timeoutMs: left });
    };
    return {
      data: await fetchSec(read, retrievedAt, process.env.SEC_USER_AGENT),
      retrievedAt,
    };
  },
  ["sec-soros-13f-v1"],
  { revalidate: 3600, tags: [INTELLIGENCE_TAG] },
);
async function source<T>(
  name: string,
  load: () => Promise<{ data: T; retrievedAt: string }>,
  now: string,
  maxAge: number,
  old?: (x: T) => boolean,
): Promise<SourceState<T>> {
  try {
    const hit = await load();
    return sourceState(hit.data, hit.retrievedAt, now, maxAge, old?.(hit.data));
  } catch (e) {
    console.warn("intelligence_source_unavailable", {
      provider: name,
      code: e instanceof SourceError ? e.code : "format",
    });
    return failedSource<T>(e);
  }
}
export async function loadIntelligence(): Promise<Intelligence> {
  const now = stamp(),
    ago = (date: string, days: number) =>
      Date.parse(now) - Date.parse(date) > days * 86400000;
  const [ecbRate, ecbFx, cotData, secData] = await Promise.all([
    source("ecb-rate", rate, now, 86400),
    source("ecb-fx", fx, now, 86400, (x) => ago(x.points.at(-1)!.date, 7)),
    source("cftc", cot, now, 86400, (x) =>
      x.markets.some((m) => ago(m.date, 14)),
    ),
    source(
      "sec",
      async () => {
        secIdentity(process.env.SEC_USER_AGENT);
        return sec();
      },
      now,
      86400,
    ),
  ]);
  return { generatedAt: now, ecbRate, ecbFx, cot: cotData, sec: secData };
}
