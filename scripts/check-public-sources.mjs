// Explicit live diagnostic, never run by unit tests or during a build.
import { writeFile } from "node:fs/promises";
import { fetchEcb } from "../src/lib/intelligence/ecb.ts";
import { fetchCot } from "../src/lib/intelligence/cftc.ts";
import { fetchSec } from "../src/lib/intelligence/sec.ts";
import { readText } from "../src/lib/intelligence/http.ts";
import { sourceState, failedSource } from "../src/lib/intelligence/query.ts";
const now = new Date().toISOString();
async function run(name, load) {
  try {
    const data = await load();
    console.log(name + ": respuesta validada");
    return sourceState(data, now, now, 86400);
  } catch (error) {
    const state = failedSource(error);
    console.log(name + ": " + state.status + " · " + state.message);
    if (state.status !== "not_configured") process.exitCode = 1;
    return state;
  }
}
const [ecbRate, ecbFx, cot, sec] = await Promise.all([
  run("BCE tipo de depósito", () => fetchEcb("rate", readText, now)),
  run("BCE EUR/USD", () => fetchEcb("fx", readText, now)),
  run("CFTC", () => fetchCot(readText, now)),
  run("SEC", () => fetchSec(readText, now, process.env.SEC_USER_AGENT)),
]);
const snapshot = { generatedAt: now, ecbRate, ecbFx, cot, sec };
const index = process.argv.indexOf("--output");
if (index >= 0) {
  if (!process.argv[index + 1]) throw new Error("Falta ruta de salida.");
  await writeFile(process.argv[index + 1], JSON.stringify(snapshot, null, 2), {
    mode: 0o600,
  });
}
