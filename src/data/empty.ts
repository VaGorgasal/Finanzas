import type { PortfolioState } from '../lib/types';
/** Cada usuario comienza sin posiciones, precios ni operaciones predefinidas. */
export function makeEmptyPortfolio(): PortfolioState {
  return {version:2, demoMode:false, instruments:[], transactions:[], completedLessons:[]};
}
