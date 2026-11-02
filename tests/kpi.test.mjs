import assert from "node:assert/strict";
import { test } from "node:test";
import {
  emptyAnalysis,
  parseAnalysis,
  ledgerSignature,
  validateAnalysisPortfolio,
  ANALYSIS_KEY,
} from "../src/lib/kpi/data.ts";
import {
  returns,
  twr,
  totalReturn,
  drawdown,
  volatility,
  correlationChange,
  correlation,
  riskContributions,
  periodReturns,
  compareSeries,
} from "../src/lib/kpi/math.ts";
import {
  exposureMatrix,
  stressScenario,
  collateralAnalysis,
} from "../src/lib/kpi/exposure.ts";
import { analyzeKpis } from "../src/lib/kpi/engine.ts";
import { calculatePortfolio, validateLedger } from "../src/lib/portfolio.ts";
import { parseCompositions } from "../src/lib/exposures.ts";
import { portfolioIrr, xirr } from "../src/lib/analytics.ts";
import {
  parseBackup,
  createBackup,
  restoreBackupExtras,
} from "../src/lib/backup.ts";
import {
  DATA_KEYS,
  setStorageScope,
  workspaceStorage,
} from "../src/lib/workspace-storage.ts";
import { emptyPlan } from "../src/lib/financial-plan.ts";
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const asset = {
  id: "a",
  name: "Empresa ficticia A",
  isin: "ZZ0000000001",
  kind: "acción",
  category: "otro",
  currency: "EUR",
  quoteSource: "manual",
  price: 12,
  priceDate: "2026-10-30",
  color: "#123456",
  explanation: "",
  risk: "",
};
const state = () => ({
  version: 2,
  demoMode: false,
  completedLessons: [],
  instruments: [asset],
  transactions: [
    {
      id: "buy",
      instrumentId: "a",
      type: "BUY",
      date: "2025-10-01",
      amount: 100,
      units: 10,
      fee: 1,
    },
  ],
});
const baseSeries = (patch = {}) => ({
  id: "p",
  name: "Serie de prueba",
  scope: "portfolio",
  instrumentId: null,
  currency: "EUR",
  basis: "unitized-total-return",
  calendar: "trading-daily",
  source: "https://example.com/fuente",
  asOf: "2026-10-30",
  publishedAt: null,
  updatedAt: "2026-10-30",
  points: [
    { date: "2026-10-29", value: 100 },
    { date: "2026-10-30", value: 110 },
  ],
  ...patch,
});
const points = (
  n,
  transform = (i) => 100 * Math.exp(i * 0.002 + 0.01 * Math.sin(i)),
) => {
  const out = [];
  for (let i = 0; i < 1000 && out.length < n; i++) {
    const d = new Date(Date.UTC(2025, 0, 1 + i));
    if (![0, 6].includes(d.getUTCDay()))
      out.push({
        date: d.toISOString().slice(0, 10),
        value: transform(out.length),
      });
  }
  return out;
};
test("contabilidad de compras sucesivas, venta parcial, dividendos y comisiones se conserva", () => {
  const s = state();
  s.transactions.push(
    {
      id: "b2",
      instrumentId: "a",
      type: "BUY",
      date: "2025-11-01",
      amount: 50,
      units: 5,
      fee: 1,
    },
    {
      id: "sell",
      instrumentId: "a",
      type: "SELL",
      date: "2026-01-01",
      amount: 52,
      units: 4,
      fee: 2,
    },
    {
      id: "div",
      instrumentId: "a",
      type: "DIVIDEND",
      date: "2026-06-01",
      amount: 3,
      units: 0,
      fee: 0,
    },
  );
  assert.equal(
    validateLedger(s.transactions, s.instruments, "2026-11-01"),
    null,
  );
  const k = analyzeKpis(s, emptyAnalysis(), [], emptyPlan(), "2026-11-01");
  near(k.summary.totalPnL, 132 + 50 + 3 - 152);
  near(k.summary.totalDividends, 3);
  near(k.summary.totalPnL, k.summary.realizedPnL + k.summary.unrealizedPnL);
  assert.equal(k.twr, null);
  assert.equal(k.dd, null);
  assert.equal(k.vol, null);
  assert.equal(k.risk, null);
});
test("TWR encadena subperiodos ya libres de flujos, sin confundir aportaciones con rendimiento", () => {
  near(
    twr([
      { opening: 100, closing: 110 },
      { opening: 1110, closing: 999 },
    ]),
    -0.01,
  );
  near(
    totalReturn([
      { date: "2026-01-01", value: 100 },
      { date: "2026-01-02", value: 110 },
      { date: "2026-01-03", value: 99 },
    ]),
    -0.01,
  );
  assert.equal(twr([]), null);
  assert.equal(twr([{ opening: 0, closing: 1 }]), null);
});
test("XIRR mantiene fechas, signos, dividendos y comisiones del motor existente", () => {
  near(
    xirr([
      { date: "2025-01-01", amount: -101 },
      { date: "2026-01-01", amount: 111.1 },
    ]).rate,
    0.1,
  );
  const s = state();
  near(
    analyzeKpis(s, emptyAnalysis(), [], emptyPlan()).irr.rate,
    portfolioIrr(s).rate,
  );
  assert.equal(
    xirr([
      { date: "2025-01-01", amount: 100 },
      { date: "2026-01-01", amount: 110 },
    ]).rate,
    null,
  );
});
test("drawdown usa el índice ajustado; informa recuperación y corrección pendiente", () => {
  const p = [100, 120, 90, 120, 108].map((value, i) => ({
    date: `2026-10-${String(20 + i).padStart(2, "0")}`,
    value,
  }));
  const d = drawdown(p);
  near(d.max, -0.25);
  near(d.current, -0.1);
  assert.equal(d.episodes.length, 2);
  assert.equal(d.episodes[0].recovered, "2026-10-23");
  assert.equal(d.episodes[0].durationDays, 2);
  assert.equal(d.episodes[0].recoveryDays, 1);
  assert.equal(d.episodes[1].recovered, null);
  assert.equal(drawdown(p.slice(0, 1)), null);
});
test("volatilidad muestral requiere N+1 observaciones y rechaza huecos largos", () => {
  const p = points(31),
    s = baseSeries({ points: p });
  const r = returns(p).map((p) => p.value),
    mean = r.reduce((a, b) => a + b, 0) / 30,
    expected = Math.sqrt(
      (r.reduce((sum, x) => sum + (x - mean) ** 2, 0) / 29) * 252,
    );
  near(volatility(s, 30), expected);
  assert.equal(volatility({ ...s, points: p.slice(1) }, 30), null);
  assert.equal(volatility(s, 90), null);
  const broken = p.map((x) => ({ ...x }));
  broken[30].date = "2026-10-30";
  assert.equal(volatility({ ...s, points: broken }, 30), null);
});
test("correlación alinea ambos extremos del intervalo, sin rellenar cotizaciones", () => {
  const p = points(100),
    a = baseSeries({ points: p }),
    b = baseSeries({
      id: "b",
      points: p.map((x) => ({ ...x, value: x.value * 2 })),
    });
  near(correlation(a, b, 90), 1);
  assert.equal(
    correlation(a, { ...b, points: p.map((x) => ({ ...x, value: 100 })) }, 30),
    null,
  );
  assert.equal(
    correlation(
      { ...a, points: p.slice(0, 31) },
      { ...b, points: p.filter((_, i) => i !== 15).slice(0, 30) },
      30,
    ),
    null,
  );
});
test("contribuciones al riesgo concilian y exigen cobertura completa y pesos válidos", () => {
  const a = baseSeries({ points: points(100) }),
    b = baseSeries({
      id: "b",
      points: points(
        100,
        (i) => 100 * Math.exp(i * 0.001 + 0.007 * Math.cos(i)),
      ),
    }),
    risk = riskContributions([a, b], [0.4, 0.6], 90);
  assert.ok(risk);
  near(
    risk.contributions.reduce((s, x) => s + x.absolute, 0),
    risk.volatility,
  );
  near(
    risk.contributions.reduce((s, x) => s + x.share, 0),
    1,
  );
  assert.equal(riskContributions([a, b], [0.4, 0.5], 90), null);
  assert.equal(
    riskContributions(
      [a, { ...b, points: b.points.slice(0, 20) }],
      [0.4, 0.6],
      90,
    ),
    null,
  );
});
test("comparación con benchmark usa las mismas fechas y no inventa el comienzo del mes", () => {
  const a = baseSeries(),
    b = baseSeries({
      id: "benchmark",
      scope: "benchmark",
      points: [
        { date: "2026-10-29", value: 200 },
        { date: "2026-10-30", value: 210 },
      ],
    });
  const c = compareSeries(a, b);
  near(c.own, 0.1);
  near(c.benchmark, 0.05);
  near(c.gap, 0.05);
  assert.equal(periodReturns(a).monthly, null);
  assert.equal(periodReturns(a).yearly, null);
  assert.equal(compareSeries(a, { ...b, points: b.points.slice(1) }), null);
});
test("una edición del libro invalida la serie personal pero actualizar una cotización no la altera", () => {
  const s = state(),
    data = parseAnalysis({
      ...emptyAnalysis(),
      portfolioSignature: ledgerSignature(s),
      series: [baseSeries()],
    });
  validateAnalysisPortfolio(data, s);
  assert.ok(analyzeKpis(s, data, [], emptyPlan()).portfolio);
  const changed = {
    ...s,
    transactions: s.transactions.map((t) => ({ ...t, fee: 2 })),
  };
  assert.equal(analyzeKpis(changed, data, [], emptyPlan()).portfolio, null);
  assert.throws(() => validateAnalysisPortfolio(data, changed));
  assert.equal(
    ledgerSignature({ ...s, instruments: [{ ...asset, price: 13 }] }),
    ledgerSignature(s),
  );
});
test("validación rechaza divisa sin convertir, precios no ajustados, fechas y referencias ambiguas", () => {
  const s = state(),
    raw = {
      ...emptyAnalysis(),
      portfolioSignature: ledgerSignature(s),
      series: [baseSeries()],
    };
  for (const patch of [
    { currency: "USD" },
    { basis: "raw-balance" },
    {
      points: [
        { date: "2026-10-30", value: 100 },
        { date: "2026-10-29", value: 101 },
      ],
    },
    {
      points: [
        { date: "2026-10-29", value: 100 },
        { date: "2026-10-30", value: -1 },
      ],
    },
    { source: "javascript:alert(1)" },
    { source: "https://user:secret@example.com" },
    { asOf: "2099-01-01" },
  ])
    assert.throws(() => parseAnalysis({ ...raw, series: [baseSeries(patch)] }));
  assert.throws(() => parseAnalysis({ ...raw, benchmarkId: "missing" }));
  assert.throws(() =>
    validateAnalysisPortfolio(
      parseAnalysis({
        ...emptyAnalysis(),
        series: [baseSeries({ scope: "instrument", instrumentId: "other" })],
      }),
      s,
    ),
  );
});
test("exposición directa e indirecta agrega identificadores y mantiene lo desconocido", () => {
  const fund = {
    ...asset,
    id: "f",
    isin: "ZZ0000000002",
    kind: "fondo",
    price: 100,
  };
  const holdings = calculatePortfolio(
    [asset, fund],
    [
      {
        id: "a",
        instrumentId: "a",
        type: "BUY",
        date: "2026-10-20",
        amount: 120,
        units: 10,
        fee: 0,
      },
      {
        id: "f",
        instrumentId: "f",
        type: "BUY",
        date: "2026-10-20",
        amount: 100,
        units: 1,
        fee: 0,
      },
    ],
  ).holdings;
  const c = parseCompositions([
    {
      instrumentId: "f",
      source: "https://example.com/fund",
      date: "2026-10-20",
      positions: [
        {
          id: asset.isin,
          name: asset.name,
          weight: 40,
          traits: {
            sector: "Tecnología",
            currency: "USD",
            themes: ["IA", "Semiconductores"],
          },
        },
      ],
    },
  ]);
  const m = [
    {
      instrumentId: "a",
      source: "https://example.com/stock",
      date: "2026-10-20",
      traits: { sector: "Tecnología", currency: "USD" },
    },
  ];
  const company = exposureMatrix(holdings, c, m, "company");
  near(company.known, 160);
  near(company.unknown, 60);
  assert.equal(company.rows.length, 1);
  assert.equal(company.rows[0].products.length, 2);
  const sector = exposureMatrix(holdings, c, m, "sector"),
    stress = stressScenario(sector, "Tecnología", -0.4);
  near(stress.impact, -64);
  near(stress.unmodeled, 60);
  assert.equal(exposureMatrix(holdings, c, [], "country").coverage, 0);
  near(exposureMatrix(holdings, c, m, "theme").coverage, 40 / 220);
  assert.throws(() => stressScenario(sector, "Tecnología", -2));
});
test("liquidez reutiliza el plan, excluye ingresos inciertos y no presupone venta de inversiones", () => {
  const plan = {
    ...emptyPlan(),
    cash: 1000,
    essential: 500,
    debtPayment: 100,
    income: 2000,
    otherExpenses: 300,
    investments: 0,
    reserveMonths: 1,
    goals: [
      {
        id: "g",
        name: "Objetivo",
        target: 2000,
        date: "2027-01-01",
        earmarked: 200,
        monthly: 100,
      },
    ],
    receipts: [
      { id: "r", name: "Ingreso incierto", amount: 100000, date: "2027-01-01" },
    ],
  };
  const k = analyzeKpis(state(), emptyAnalysis(), [], plan, "2026-11-01");
  assert.equal(k.planReview.available, 400);
  assert.equal(k.planReview.goals[0].gap, 1600);
  assert.ok(k.alerts.some((a) => a.id === "liquidity-g"));
});
test("LTV utiliza coeficientes declarados, sin factor bancario universal", () => {
  const h = calculatePortfolio([asset], state().transactions).holdings;
  const r = collateralAnalysis(h, {
    debt: 60,
    source: "https://example.com/bank",
    date: "2026-10-30",
    positions: [{ instrumentId: "a", factor: 0.4 }],
  });
  near(r.ltv, 0.5);
  near(r.eligible, 48);
  near(r.coverage, 0.8);
  near(r.headroom, -12);
  assert.equal(collateralAnalysis(h, null), null);
});
test("copia v4 conserva análisis, lee v1–v3, aísla usuarios y revierte escritura fallida", () => {
  assert.ok(DATA_KEYS.includes(ANALYSIS_KEY));
  for (const format of [
    "brujula-complete-v1",
    "brujula-complete-v2",
    "brujula-complete-v3",
  ])
    assert.deepEqual(
      parseBackup({ format, portfolio: state(), plan: emptyPlan() }).analysis,
      emptyAnalysis(),
    );
  const values = new Map();
  let fail = false;
  globalThis.window = {
    localStorage: {
      getItem: (k) => values.get(k) ?? null,
      setItem(k, v) {
        if (fail && k.endsWith(ANALYSIS_KEY)) {
          fail = false;
          throw new Error("quota");
        }
        values.set(k, v);
      },
      removeItem: (k) => values.delete(k),
    },
    dispatchEvent() {},
  };
  setStorageScope("A");
  const d = { ...emptyAnalysis(), longTermIds: ["a"] };
  workspaceStorage().setItem(ANALYSIS_KEY, JSON.stringify(d));
  assert.deepEqual(createBackup(state()).analysis.longTermIds, ["a"]);
  setStorageScope("B");
  assert.deepEqual(createBackup(state()).analysis.longTermIds, []);
  const before = new Map(values);
  fail = true;
  assert.throws(() =>
    restoreBackupExtras(
      parseBackup({
        format: "brujula-complete-v4",
        portfolio: state(),
        plan: emptyPlan(),
        analysis: d,
      }),
    ),
  );
  assert.deepEqual(values, before);
  setStorageScope("local");
  delete globalThis.window;
});

test("pérdida terminal total se representa como −100 %, sin dividir por un índice cero", () => {
  near(
    totalReturn([
      { date: "2026-10-29", value: 100 },
      { date: "2026-10-30", value: 0 },
    ]),
    -1,
  );
  near(
    drawdown([
      { date: "2026-10-29", value: 100 },
      { date: "2026-10-30", value: 0 },
    ]).max,
    -1,
  );
  assert.equal(twr([{ opening: 0, closing: 1 }]), null);
});

test("la firma no depende del orden de las propiedades JSON de una operación", () => {
  const s = state();
  const other = {
    ...s,
    transactions: s.transactions.map((t) =>
      Object.fromEntries(Object.entries(t).reverse()),
    ),
  };
  assert.equal(ledgerSignature(s), ledgerSignature(other));
});
test("las valoraciones sin fecha común suspenden la contribución al riesgo", () => {
  const s = state();
  s.instruments.push({
    ...asset,
    id: "b",
    isin: "ZZ0000000002",
    priceDate: "2026-10-29",
  });
  s.transactions.push({ ...s.transactions[0], id: "b", instrumentId: "b" });
  const data = {
    ...emptyAnalysis(),
    series: s.instruments.map((a) =>
      baseSeries({
        id: a.id,
        scope: "instrument",
        instrumentId: a.id,
        points: points(100),
      }),
    ),
  };
  const k = analyzeKpis(s, data, [], emptyPlan(), "2026-11-01");
  assert.equal(k.risk, null);
  assert.ok(k.alerts.some((a) => a.id === "mixed-valuations"));
});
test("los diagnósticos no inventan una variación diaria cuando faltan cotizaciones", () => {
  const s = state(),
    data = {
      ...emptyAnalysis(),
      portfolioSignature: ledgerSignature(s),
      series: [
        baseSeries({
          points: [
            { date: "2026-01-01", value: 100 },
            { date: "2026-10-30", value: 70 },
          ],
        }),
      ],
    };
  const k = analyzeKpis(s, data, [], emptyPlan(), "2026-11-01");
  assert.match(
    k.alerts.find((a) => a.id === "drawdown").change,
    /Sin intervalo/,
  );
  assert.equal(k.vol, null);
});

test("compara correlaciones entre ventanas completas no solapadas", () => {
  const dates = points(61);
  let av = 100,
    bv = 100;
  const a = [{ ...dates[0], value: av }],
    b = [{ ...dates[0], value: bv }];
  for (let i = 1; i < 61; i++) {
    const r = 0.008 * Math.sin(i);
    av *= 1 + r;
    bv *= 1 + (i <= 30 ? r : -r);
    a.push({ ...dates[i], value: av });
    b.push({ ...dates[i], value: bv });
  }
  const c = correlationChange(
    baseSeries({ points: a }),
    baseSeries({ points: b }),
    30,
  );
  near(c.previous, 1);
  near(c.current, -1);
  near(c.delta, -2);
});
