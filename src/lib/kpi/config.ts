/** Umbrales educativos de revisión; no determinan recomendaciones. */
export type KpiRules = {
  drawdownReview: number;
  issuerConcentration: number;
  volatilityIncrease: number;
  priceStaleDays: number;
  compositionStaleDays: number;
  highCorrelation: number;
  correlationChange: number;
  benchmarkGap: number;
};
export const kpiRules: KpiRules = {
  drawdownReview: 0.15,
  issuerConcentration: 0.2,
  volatilityIncrease: 0.25,
  priceStaleDays: 7,
  compositionStaleDays: 120,
  highCorrelation: 0.85,
  correlationChange: 0.3,
  benchmarkGap: 0.1,
} as const;
