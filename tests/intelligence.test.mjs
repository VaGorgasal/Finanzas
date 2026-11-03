import test from "node:test";
import assert from "node:assert/strict";
import { parseEcb, fetchEcb } from "../src/lib/intelligence/ecb.ts";
import { parseCot, cotUrl } from "../src/lib/intelligence/cftc.ts";
import {
  parseSubmissions,
  parseHoldings,
  compareHoldings,
  fetchSec,
  secIdentity,
} from "../src/lib/intelligence/sec.ts";
import { csv, readText, SourceError } from "../src/lib/intelligence/http.ts";
import {
  sourceState,
  failedSource,
  intelligenceQuery,
  mergeSnapshot,
} from "../src/lib/intelligence/query.ts";
import { cronAuthorized } from "../src/lib/intelligence/cron.ts";
const now = "2026-11-02T12:00:00Z";
const ecb = (kind = "rate", rows = ["2026-10-30,2.5", "2026-11-02,2.5"]) =>
  `KEY,TIME_PERIOD,OBS_VALUE,UNIT,UNIT_MULT,OBS_STATUS\n${rows.map((x) => `${kind === "rate" ? "FM.D.U2.EUR.4F.KR.DFR.LEV" : "EXR.D.USD.EUR.SP00.A"},${x},${kind === "rate" ? "PCPA" : "USD"},0,A`).join("\n")}`;
test("ECB preserves rate, FX direction, dates and source without inventing publication time", async () => {
  const rate = parseEcb(ecb(), "rate", now),
    fx = parseEcb(ecb("fx", ["2026-10-30,1.1"]), "fx", now);
  assert.equal(rate.points.at(-1).value, 2.5);
  assert.equal(rate.unit, "% anual");
  assert.equal(rate.publishedAt, null);
  assert.equal(fx.unit, "USD por EUR");
  assert.ok(Math.abs(110 / fx.points[0].value - 100) < 1e-9);
  let requested = "";
  await fetchEcb(
    "rate",
    async (url) => {
      requested = url;
      return ecb();
    },
    now,
  );
  assert.equal(new URL(requested).hostname, "data-api.ecb.europa.eu");
  assert.match(requested, /lastNObservations=260/);
});
test("ECB rejects wrong series, units, duplicate/future/impossible dates and nonnumeric observations", () => {
  for (const input of [
    ecb().replaceAll("PCPA", "USD"),
    ecb().replaceAll(",0,A", ",6,A"),
    ecb().replaceAll("FM.D.U2", "FM.D.US"),
    ecb("rate", ["2026-10-30,2.5", "2026-10-30,2.5"]),
    ecb("rate", ["2026-11-03,2.5"]),
    ecb("rate", ["2026-02-30,2.5"]),
    ecb("rate", ["2026-10-30,NaN"]),
  ])
    assert.throws(() => parseEcb(input, "rate", now));
  assert.throws(() => parseEcb(ecb("fx", ["2026-10-30,0"]), "fx", now));
});
test("ECB does not convert missing cells into zero and CSV handles commas and escaped quotes", () => {
  assert.equal(
    parseEcb(ecb("rate", ["2026-10-30,", "2026-11-02,-0.5"]), "rate", now)
      .points.length,
    1,
  );
  assert.throws(() => parseEcb(ecb("rate", ["2026-10-30,"]), "rate", now));
  assert.deepEqual(csv('a,b\r\n"one, two","three ""four"""\r\n'), [
    { a: "one, two", b: 'three "four"' },
  ]);
  assert.throws(() => csv('a,b\n"x,y'));
});
const cot = (
  date = "2026-10-27",
  long = "120",
  short = "20",
  code = "088691",
) => ({
  cftc_contract_market_code: code,
  report_date_as_yyyy_mm_dd: date + "T00:00:00.000",
  m_money_positions_long_all: long,
  m_money_positions_short_all: short,
  open_interest_all: "400",
});
test("COT compares the same contract and reports Managed Money net contracts and share of open interest", () => {
  const data = parseCot([cot(), cot("2026-10-20", "90", "20")], now),
    m = data.markets[0];
  assert.equal(m.net, 100);
  assert.equal(m.netPct, 25);
  assert.equal(m.change, 30);
  assert.equal(m.previousDate, "2026-10-20");
  assert.equal(data.missing.length, 2);
  assert.equal(data.publishedAt, null);
  const url = new URL(cotUrl());
  assert.match(url.pathname, /72hh-3qpy/);
  assert.match(url.searchParams.get("$where"), /088691/);
  assert.equal(url.searchParams.get("$limit"), "24");
});
test("COT missing previous week remains unavailable, not a fabricated weekly change", () => {
  assert.equal(
    parseCot([cot(), cot("2026-10-13")], now).markets[0].change,
    null,
  );
  assert.equal(parseCot([cot()], now).markets[0].change, null);
});
test("COT rejects duplicates, foreign contracts, future observations and missing/invalid position fields", () => {
  for (const input of [
    [cot(), cot()],
    [cot("2026-10-27", "120", "20", "001602")],
    [cot("2026-11-03")],
    [cot("2026-10-27", "")],
    [cot("2026-10-27", "401")],
    [cot("2026-10-27", "1.5")],
    [],
  ])
    assert.throws(() => parseCot(input, now));
});
const f = {
  accession: "0000902664-26-003507",
  form: "13F-HR",
  period: "2026-06-30",
  filed: "2026-08-14",
  accepted: null,
  primaryDocument: "primary_doc.xml",
  url: "https://www.sec.gov/test",
};
const past = {
  ...f,
  accession: "0000902664-26-002529",
  period: "2026-03-31",
  filed: "2026-05-15",
};
const xml = (
  rows = [
    ["000000001", "PRUEBA &amp; FICTICIA", "COM", "100", "12000", "", "SH"],
  ],
) =>
  `<?xml version="1.0"?><informationTable xmlns="http://www.sec.gov/edgar/document/thirteenf/informationtable">${rows.map(([cusip, name, cl, shares, value, option, type]) => `<infoTable><nameOfIssuer>${name}</nameOfIssuer><titleOfClass>${cl}</titleOfClass><cusip>${cusip}</cusip><value>${value}</value><shrsOrPrnAmt><sshPrnamt>${shares}</sshPrnamt><sshPrnamtType>${type}</sshPrnamtType></shrsOrPrnAmt>${option ? `<putCall>${option}</putCall>` : ""}</infoTable>`).join("")}</informationTable>`;
const submission = (filings = [f, past]) => ({
  cik: "1029160",
  name: "PRUEBA FICTICIA, NO DATOS REALES",
  filings: {
    recent: {
      form: filings.map((x) => x.form),
      accessionNumber: filings.map((x) => x.accession),
      filingDate: filings.map((x) => x.filed),
      reportDate: filings.map((x) => x.period),
      primaryDocument: filings.map((x) => x.primaryDocument),
    },
  },
});
test("SEC validates CIK, columns, filenames, periods and accession numbers", () => {
  assert.equal(parseSubmissions(submission(), now).filings.length, 2);
  assert.throws(() => parseSubmissions({ ...submission(), cik: "1" }, now));
  const bad = submission();
  bad.filings.recent.reportDate = [];
  assert.throws(() => parseSubmissions(bad, now));
  for (const changed of [
    { accession: "../../etc" },
    { primaryDocument: "../../secret.xml" },
    { period: "2026-06-29" },
    { filed: "2026-11-03" },
  ])
    assert.throws(() =>
      parseSubmissions(submission([{ ...f, ...changed }]), now),
    );
});
test("SEC parses XML namespaces, keeps leading zero CUSIPs and aggregates only identical security identities", () => {
  const h = parseHoldings(
    xml([
      ["000000001", "PRUEBA", "COM", "10", "100", "", "SH"],
      ["000000001", "PRUEBA", "COM", "20", "200", "", "SH"],
      ["000000001", "PRUEBA", "COM", "50", "500", "PUT", "SH"],
    ]),
    f,
    now,
  );
  assert.equal(h.length, 2);
  assert.equal(h.find((x) => !x.option).shares, 30);
  assert.equal(h.find((x) => !x.option).valueUsd, 300);
  assert.equal(h[0].cusip, "000000001");
  assert.equal(parseHoldings(xml(), f, now)[0].name, "PRUEBA & FICTICIA");
});
test("SEC value convention uses filing date, including amendments to older periods", () => {
  const modern = parseHoldings(
      xml(),
      { ...f, period: "2022-03-31", filed: "2023-01-03" },
      now,
    )[0],
    old = parseHoldings(
      xml(),
      { ...f, period: "2022-03-31", filed: "2022-05-15" },
      now,
    )[0];
  assert.equal(modern.valueUsd, 12000);
  assert.equal(old.valueUsd, 12000000);
});
test("SEC rejects DTD, invalid XML, negative values and malformed identities", () => {
  assert.throws(() =>
    parseHoldings('<!DOCTYPE x [<!ENTITY a "x">]>' + xml(), f, now),
  );
  assert.throws(() => parseHoldings(xml().replace("</infoTable>", ""), f, now));
  for (const body of [
    xml().replace("<value>12000", "<value>-1"),
    xml().replace("000000001", "bad"),
    xml().replace(">SH<", ">XX<"),
  ])
    assert.throws(() => parseHoldings(body, f, now));
});
test("13F comparison uses quantities instead of changes in value and separates options", () => {
  const a = parseHoldings(xml(), f, now),
    b = parseHoldings(xml().replace("<value>12000", "<value>9000"), past, now);
  assert.equal(compareHoldings(a, b)[0].kind, "sin cambio");
  assert.equal(compareHoldings(a, [])[0].kind, "nueva declaración");
  assert.equal(compareHoldings([], a)[0].kind, "deja de declararse");
  const less = parseHoldings(
    xml().replace("<sshPrnamt>100", "<sshPrnamt>50"),
    past,
    now,
  );
  assert.equal(compareHoldings(a, less)[0].changePct, 100);
});
test("SEC refuses to make network requests without a real configured technical identity", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      fetchSec(
        async () => {
          calls++;
          return "";
        },
        now,
        undefined,
      ),
    /SEC_USER_AGENT/,
  );
  assert.equal(calls, 0);
  for (const identity of [
    undefined,
    "Fake",
    "Test test@example.com",
    "Brujula test@domain.invalid",
    "App\r\nX: y x@real.com",
  ])
    assert.throws(() => secIdentity(identity));
});
test("SEC amendments block both holdings and comparisons without silently replacing originals", async () => {
  const amend = { ...f, form: "13F-HR/A", accession: "0000902664-26-003508" },
    data = submission([amend, f, past]);
  let calls = 0;
  const output = await fetchSec(
    async () => {
      calls++;
      return JSON.stringify(data);
    },
    now,
    "TEST app engineering@nonexistent-test.org",
  );
  assert.equal(calls, 1);
  assert.equal(output.holdings.length, 0);
  assert.equal(output.changes.length, 0);
  assert.match(output.comparisonNote, /enmiendas/);
});
test("SEC loads two consecutive original quarters using fixed archive paths and headers", async () => {
  const urls = [];
  const read = async (url, options) => {
    urls.push(url);
    assert.match(options.headers["User-Agent"], /^TEST/);
    if (url.includes("submissions")) return JSON.stringify(submission());
    if (url.endsWith("index.json"))
      return JSON.stringify({
        directory: {
          item: [
            { name: "primary_doc.xml" },
            { name: "../outside.xml" },
            { name: "informationtable.xml" },
          ],
        },
      });
    return xml().replace(
      "<sshPrnamt>100",
      url.includes("002529") ? "<sshPrnamt>50" : "<sshPrnamt>100",
    );
  };
  const out = await fetchSec(
    read,
    now,
    "TEST app engineering@nonexistent-test.org",
  );
  assert.equal(out.holdings.length, 1);
  assert.equal(out.changes[0].change, 50);
  assert.equal(urls.length, 5);
  assert.ok(urls.every((x) => !x.includes("../")));
});
test("SEC nonconsecutive quarters and unavailable XML do not fabricate changes", async () => {
  const load = async (period) =>
    fetchSec(
      async (url) =>
        url.includes("submissions")
          ? JSON.stringify(submission([f, { ...past, period }]))
          : url.endsWith("index.json")
            ? JSON.stringify({
                directory: { item: [{ name: "informationtable.xml" }] },
              })
            : xml(),
      now,
      "TEST app engineering@nonexistent-test.org",
    );
  assert.equal((await load("2025-12-31")).changes.length, 0);
  const out = await fetchSec(
    async (url) =>
      url.includes("submissions")
        ? JSON.stringify(submission())
        : JSON.stringify({ directory: { item: [] } }),
    now,
    "TEST app engineering@nonexistent-test.org",
  );
  assert.equal(out.filings.length, 2);
  assert.equal(out.holdings.length, 0);
  assert.match(out.comparisonNote, /no disponibles/);
});
test("source states distinguish freshness, missing configuration and unavailable data without stamping an old retrieval as new", () => {
  const old = "2026-10-01T00:00:00Z",
    s = sourceState({ value: 2 }, old, now, 3600);
  assert.equal(s.status, "stale");
  assert.equal(s.retrievedAt, old);
  assert.equal(
    failedSource(new SourceError("pending", "not_configured")).status,
    "not_configured",
  );
  assert.equal(failedSource(new Error("secret")).data, null);
  assert.doesNotMatch(failedSource(new Error("secret")).message, /secret/);
});
test("authorization and disabled services never fetch sources first", async () => {
  let calls = 0;
  const load = async () => {
    calls++;
    return {};
  };
  await assert.rejects(() =>
    intelligenceQuery({ enabled: false, authorize: async () => {}, load }),
  );
  assert.equal(calls, 0);
  await assert.rejects(() =>
    intelligenceQuery({
      enabled: true,
      authorize: async () => {
        throw new Error("no session");
      },
      load,
    }),
  );
  assert.equal(calls, 0);
  assert.deepEqual(
    await intelligenceQuery({ enabled: true, authorize: async () => {}, load }),
    {},
  );
  assert.equal(calls, 1);
});
test("cron requires an exact strong bearer secret", () => {
  const key = "fake-test-secret-long-enough-123";
  assert.equal(cronAuthorized("Bearer " + key, key), true);
  for (const header of [null, "Bearer wrong", "bearer " + key])
    assert.equal(cronAuthorized(header, key), false);
  assert.equal(cronAuthorized("Bearer short", "short"), false);
});

test('partial failures preserve the previous public observation and its original timestamp',()=>{
 const good=sourceState({value:2},now,now,3600),bad=failedSource(new SourceError('upstream failed','upstream'));
 const previous={generatedAt:now,ecbRate:good,ecbFx:good,cot:good,sec:bad};
 const next={...previous,generatedAt:'2026-11-03T12:00:00Z',ecbRate:bad};
 const output=mergeSnapshot(previous,next);assert.equal(output.ecbRate.status,'stale');assert.deepEqual(output.ecbRate.data,{value:2});assert.equal(output.ecbRate.retrievedAt,now);assert.equal(output.ecbFx.status,'available');assert.equal(mergeSnapshot(null,next),next);
});
test("HTTP transport blocks arbitrary destinations and redirections, bounds response size and does not disclose upstream bodies", async () => {
  await assert.rejects(() => readText("https://attacker.test/a"));
  await assert.rejects(() => readText("https://data.sec.gov:444/a"));
  await assert.rejects(() => readText("http://data.sec.gov/a"));
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.redirect, "error");
      return new Response("private body", { status: 403 });
    };
    await assert.rejects(
      () => readText("https://data.sec.gov/a"),
      (e) => !e.message.includes("private body"),
    );
    globalThis.fetch = async () => new Response(new Uint8Array(3000001));
    await assert.rejects(() => readText("https://data.sec.gov/a"), /tamaño/);
  } finally {
    globalThis.fetch = original;
  }
});
