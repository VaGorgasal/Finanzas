/** Importe negociado sin comisiones / precio de ejecución en EUR. */
export function purchaseUnits(amount:number,price:number):number|null {
  if(!Number.isFinite(amount)||!Number.isFinite(price)||amount<=0||price<=0)return null;
  const units=amount/price;
  return Number.isFinite(units)&&units>=1e-8?units:null;
}
