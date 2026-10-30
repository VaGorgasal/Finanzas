import type { PortfolioState, Instrument } from '../lib/types.ts';

export const demoInstruments: Instrument[] = [
  {
    id: 'fidelity-world',
    name: 'Fidelity MSCI World Index Fund P-ACC-EUR',
    isin: 'IE00BYX5NX33',
    kind: 'fondo', category: 'global', color: '#109c93',
    explanation: 'Sigue empresas grandes y medianas de países desarrollados. Es el núcleo diversificado de la cartera.',
    risk: 'Renta variable mundial: puede sufrir pérdidas significativas y tiene exposición importante a EE. UU.',
    price: 10.15, priceDate: '2026-10-28', quoteSource: 'demo', currency: 'EUR',
  },
  {
    id: 'ishares-tech',
    name: 'iShares S&P 500 Information Technology UCITS ETF',
    isin: 'IE00B3WJKG14',
    kind: 'etf', category: 'tecnología', color: '#7894e9',
    explanation: 'Sigue compañías tecnológicas estadounidenses. Sirve para observar el riesgo de concentración sectorial.',
    risk: 'Mayor concentración y volatilidad; se solapa con empresas ya presentes en el MSCI World.',
    price: 5.78, priceDate: '2026-10-28', quoteSource: 'demo', currency: 'EUR',
  },
];

/** Todos los precios, importes y unidades de la semilla son sintéticos, NO cotizaciones reales. */
export function makeDemoPortfolio(): PortfolioState {
  return {
    version: 2,
    demoMode: true,
    instruments: demoInstruments.map((x) => ({ ...x })),
    transactions: [
      { id: 'demo-buy-world', instrumentId: 'fidelity-world', type: 'BUY', date: '2026-10-20', amount: 60, units: 6, fee: 0 },
      { id: 'demo-buy-tech', instrumentId: 'ishares-tech', type: 'BUY', date: '2026-10-20', amount: 12, units: 2, fee: 0 },
    ],
    completedLessons: [],
  };
}
