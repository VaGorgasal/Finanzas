import type { Holding, Instrument, PortfolioSummary, Transaction } from './types';

export const EPS = 1e-8;
const validDay = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00.000Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
};
export function isValidDay(s: string): boolean { return validDay(s); }
export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  return `${y}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function amountOK(v: number): boolean { return Number.isFinite(v) && v >= 0 && v <= 1_000_000_000; }

/** Para movimientos con la misma fecha, las compras se procesan antes de ventas. */
export function sortedTransactions(txs: Transaction[]): Transaction[] {
  const rank = { BUY: 0, DIVIDEND: 1, SELL: 2 };
  return [...txs].sort((a, b) =>
    a.date.localeCompare(b.date) || rank[a.type] - rank[b.type] || a.id.localeCompare(b.id));
}

/** Rechaza una venta sin participaciones previas, incluso cuando se introduce con fecha retroactiva. */
export function validateLedger(txs: Transaction[], instruments: Instrument[], maxDate = todayIso()): string | null {
  const ids = new Set(instruments.map((a) => a.id));
  const balances: Record<string, number> = {};
  const txIds = new Set<string>();
  for (const t of sortedTransactions(txs)) {
    if (!t.id || txIds.has(t.id)) return 'Hay operaciones duplicadas.';
    if (!['BUY', 'SELL', 'DIVIDEND'].includes(t.type)) return 'Tipo de operación no reconocido.';
    txIds.add(t.id);
    if (!ids.has(t.instrumentId)) return 'La operación se refiere a un producto no existente.';
    if (!validDay(t.date) || t.date > maxDate) return 'Indica una fecha válida que no sea futura.';
    if (!amountOK(t.amount) || !amountOK(t.fee)) return 'Los importes deben ser positivos y finitos.';
    if (t.type === 'DIVIDEND') {
      if (t.amount <= 0 || t.units !== 0 || t.fee !== 0) return 'El dividendo debe ser neto, positivo y sin participaciones ni comisión.';
      continue;
    }
    if (!Number.isFinite(t.units) || t.units <= 0 || t.units > 1_000_000_000 || t.amount <= 0) {
      return 'Compras y ventas requieren importe y participaciones mayores que cero.';
    }
    if (t.type === 'SELL' && t.fee > t.amount) return 'La comisión no puede superar el importe de la venta.';
    if (t.type === 'BUY') balances[t.instrumentId] = (balances[t.instrumentId] ?? 0) + t.units;
    if (t.type === 'SELL') {
      if ((balances[t.instrumentId] ?? 0) + EPS < t.units) return 'No puedes vender más participaciones de las que tenías en esa fecha.';
      balances[t.instrumentId] -= t.units;
    }
  }
  return null;
}

export function calculatePortfolio(instruments: Instrument[], transactions: Transaction[]): PortfolioSummary {
  const buckets = new Map<string, {
    instrument: Instrument; units: number; costBasis: number; buysCash: number;
    sellsCash: number; dividendsCash: number; realizedPnL: number;
  }>();
  for (const instrument of instruments) {
    buckets.set(instrument.id, { instrument, units: 0, costBasis: 0, buysCash: 0,
      sellsCash: 0, dividendsCash: 0, realizedPnL: 0 });
  }
  for (const tx of sortedTransactions(transactions)) {
    const b = buckets.get(tx.instrumentId);
    if (!b) continue;
    if (tx.type === 'BUY') {
      b.units += tx.units;
      b.costBasis += tx.amount + tx.fee;
      b.buysCash += tx.amount + tx.fee;
    } else if (tx.type === 'SELL') {
      const average = b.units > EPS ? b.costBasis / b.units : 0;
      const soldCost = average * tx.units;
      b.units = Math.max(0, b.units - tx.units);
      b.costBasis = b.units < EPS ? 0 : Math.max(0, b.costBasis - soldCost);
      b.sellsCash += tx.amount - tx.fee;
      b.realizedPnL += (tx.amount - tx.fee) - soldCost;
    } else {
      b.dividendsCash += tx.amount;
    }
  }
  const holdings: Holding[] = [...buckets.values()].map((b) => {
    const value = b.units * b.instrument.price;
    const unrealizedPnL = value - b.costBasis;
    const totalPnL = b.realizedPnL + unrealizedPnL + b.dividendsCash;
    return {
      instrument: b.instrument, units: b.units, averageCost: b.units > EPS ? b.costBasis / b.units : 0,
      costBasis: b.costBasis, value, buysCash: b.buysCash, sellsCash: b.sellsCash,
      dividendsCash: b.dividendsCash, realizedPnL: b.realizedPnL,
      unrealizedPnL, totalPnL,
      returnOnBuys: b.buysCash > EPS ? totalPnL / b.buysCash * 100 : null,
    };
  });
  const sum = (key: keyof Holding) => holdings.reduce((s, h) => s + Number(h[key] ?? 0), 0);
  const totalBuyCash = sum('buysCash');
  const totalSellCash = sum('sellsCash');
  const totalDividends = sum('dividendsCash');
  const marketValue = sum('value');
  const realizedPnL = sum('realizedPnL') + totalDividends;
  const unrealizedPnL = sum('unrealizedPnL');
  const totalPnL = marketValue + totalSellCash + totalDividends - totalBuyCash;
  return {
    holdings, marketValue, totalBuyCash, totalSellCash, totalDividends,
    netCashContributed: totalBuyCash - totalSellCash - totalDividends,
    realizedPnL, unrealizedPnL, totalPnL,
    returnOnBuys: totalBuyCash > EPS ? totalPnL / totalBuyCash * 100 : null,
  };
}

export const eur = (n: number) => new Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR' }).format(n);
export const nfmt = (n: number, digits = 4) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits }).format(n);
export const pct = (n: number | null) => n === null ? '—' : `${n >= 0 ? '+' : ''}${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n)} %`;
