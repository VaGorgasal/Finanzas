export type AssetKind = 'fondo' | 'etf' | 'acción' | 'otro';
export type AssetCategory = 'global' | 'tecnología' | 'sectorial' | 'otro';
export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND';

export interface Instrument {
  id: string;
  name: string;
  isin: string;
  kind: AssetKind;
  category: AssetCategory;
  color: string;
  explanation: string;
  risk: string;
  price: number;
  priceDate: string; // AAAA-MM-DD, valor aportado por usuario o demo
  quoteSource: 'demo' | 'manual';
  currency: 'EUR';
}

export interface Transaction {
  id: string;
  instrumentId: string;
  type: TransactionType;
  date: string;
  amount: number; // BUY: importe negociado; SELL: importe bruto de venta; DIVIDEND: dividendo neto
  units: number;  // BUY/SELL: participaciones, DIVIDEND: 0
  fee: number;    // BUY/SELL: costes adicionales, DIVIDEND: 0
}

export interface PortfolioState {
  version: 2;
  demoMode: boolean;
  instruments: Instrument[];
  transactions: Transaction[];
  completedLessons: string[];
}

export interface Holding {
  instrument: Instrument;
  units: number;
  averageCost: number;
  costBasis: number;
  value: number;
  buysCash: number;
  sellsCash: number;
  dividendsCash: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  returnOnBuys: number | null;
}

export interface PortfolioSummary {
  holdings: Holding[];
  marketValue: number;
  totalBuyCash: number;
  totalSellCash: number;
  totalDividends: number;
  netCashContributed: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  returnOnBuys: number | null;
}
