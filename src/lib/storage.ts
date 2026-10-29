import type { CashEntry, Instrument, PortfolioState, Transaction } from './types';
import { makeEmptyPortfolio } from '../data/empty';
import { validateLedger, isValidDay, todayIso } from './portfolio';
import { persistJson } from './persistence';
import { validateCashEntries } from './cash';
export const STORAGE_KEY = 'brujula-financiera-v02';

function isRecord(a: unknown): a is Record<string, unknown> {
  return typeof a === 'object' && a !== null && !Array.isArray(a);
}
/** La importación se valida antes de permitir usarla en la calculadora. */
export function parsePortfolio(input: unknown): PortfolioState {
  if (!isRecord(input) || input.version !== 2 || !Array.isArray(input.instruments) || !Array.isArray(input.transactions) || !Array.isArray(input.completedLessons)) {
    throw new Error('El archivo no contiene una cartera compatible con Brújula V0.2.');
  }
  if (input.instruments.length > 100 || input.transactions.length > 5000) throw new Error('El archivo supera los límites de la versión de prueba.');
  const instruments = input.instruments as Instrument[];
  const transactions = input.transactions as Transaction[];
  const allowedKinds = ['fondo', 'etf', 'acción', 'otro'];
  const allowedCategories = ['global', 'tecnología', 'sectorial', 'otro'];
  const identifiers = new Set<string>();
  const isins = new Set<string>();
  for (const p of instruments) {
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || typeof p.name !== 'string' || typeof p.isin !== 'string' || typeof p.color !== 'string' ||
      !allowedKinds.includes(p.kind) || !allowedCategories.includes(p.category) || typeof p.explanation !== 'string' || typeof p.risk !== 'string' ||
      p.currency !== 'EUR' || !Number.isFinite(p.price) || p.price <= 0 || p.price > 1e9 || !isValidDay(p.priceDate) ||
      (p.quoteSymbol!==undefined && (typeof p.quoteSymbol!=='string' || !p.quoteSymbol.trim() || p.quoteSymbol.length>100)) ||
      !['demo','manual','eodhd'].includes(p.quoteSource) || !p.id.trim() || !p.name.trim() || p.priceDate > todayIso() || p.id.length > 100 || p.name.length > 150 || p.explanation.length > 1000 || p.risk.length > 1000 ||
      !/^#[\da-fA-F]{6}$/.test(p.color) || !/^[A-Z]{2}[A-Z0-9]{10}$/.test(p.isin) || identifiers.has(p.id) || isins.has(p.isin)) {
      throw new Error('Uno de los productos tiene datos incorrectos o duplicados.');
    }
    identifiers.add(p.id); isins.add(p.isin);
  }
  const error = validateLedger(transactions, instruments);
  if (error) throw new Error(error);
  const cashEntries = input.cashEntries ?? [];
  const cashError=validateCashEntries(cashEntries,todayIso());
  if(cashError)throw new Error(cashError);
  if(input.cashTracking!==undefined && typeof input.cashTracking!=='boolean')throw new Error('Estado de efectivo no válido.');
  const completedLessons = input.completedLessons.filter((x): x is string => typeof x === 'string' && x.length < 80).slice(0,100);
  return { version:2, demoMode: input.demoMode === true,
    instruments: instruments.map(x => ({...x})), transactions:transactions.map(x=>({...x})), completedLessons, cashTracking:input.cashTracking===true || (cashEntries as CashEntry[]).length>0, cashEntries:(cashEntries as CashEntry[]).map(x=>({id:x.id,date:x.date,type:x.type,amount:x.amount})) };
}
export function readPortfolio(): PortfolioState {
  if (typeof window === 'undefined') return makeEmptyPortfolio();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const saved = raw ? parsePortfolio(JSON.parse(raw) as unknown) : makeEmptyPortfolio();
    // La demostración es una sesión explícita y no se recupera al abrir la aplicación.
    return saved.demoMode ? {...makeEmptyPortfolio(), completedLessons:saved.completedLessons} : saved;
  } catch { return makeEmptyPortfolio(); }
}
export function savePortfolio(p: PortfolioState): boolean {
  return persistJson(() => window.localStorage, STORAGE_KEY, p);
}
