import type {Holding,Instrument,PortfolioSummary,Transaction} from './types.ts';
export const EPS=1e-8;
export function isValidDay(s:string):boolean{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===s;}
export function todayIso():string{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
const amountOK=(v:number)=>Number.isFinite(v)&&v>=0&&v<=1e9;
/** Mismo día: compras, traspasos ordenados por secuencia, dividendos y ventas. */
export function sortedTransactions(txs:Transaction[]):Transaction[]{const rank={BUY:0,TRANSFER:1,DIVIDEND:2,SELL:3};return [...txs].sort((a,b)=>a.date.localeCompare(b.date)||rank[a.type]-rank[b.type]||(a.sequence??0)-(b.sequence??0)||a.id.localeCompare(b.id));}
export function validateLedger(txs:Transaction[],instruments:Instrument[],maxDate=todayIso()):string|null{
 const assets=new Map(instruments.map(a=>[a.id,a]));const balances=new Map<string,number>();const ids=new Set<string>();const orders=new Set<string>();
 for(const t of txs){if(!t||typeof t!=='object'||typeof t.id!=='string'||!t.id.trim()||t.id.length>100||typeof t.instrumentId!=='string'||typeof t.date!=='string')return 'Una operación tiene datos incorrectos.';}
 for(const t of sortedTransactions(txs)){
  if(ids.has(t.id))return 'Hay operaciones duplicadas.';ids.add(t.id);
  if(!['BUY','SELL','DIVIDEND','TRANSFER'].includes(t.type))return 'Tipo de operación no reconocido.';
  if(!assets.has(t.instrumentId))return 'La operación se refiere a un producto no existente.';
  if(!isValidDay(t.date)||t.date>maxDate)return 'Indica una fecha válida que no sea futura.';
  if(!amountOK(t.amount)||!amountOK(t.fee))return 'Los importes deben ser positivos y finitos.';
  if(t.type==='TRANSFER'){
   if(typeof t.targetInstrumentId!=='string'||t.targetInstrumentId===t.instrumentId||assets.get(t.instrumentId)?.kind!=='fondo'||assets.get(t.targetInstrumentId)?.kind!=='fondo')return 'El traspaso requiere dos fondos distintos registrados.';
   if(!Number.isFinite(t.units)||t.units<=0||t.units>1e9||typeof t.targetUnits!=='number'||!Number.isFinite(t.targetUnits)||t.targetUnits<=0||t.targetUnits>1e9||t.amount!==0||t.fee!==0)return 'El traspaso requiere participaciones positivas y no admite cobros ni comisiones.';
   if(!Number.isInteger(t.sequence)||t.sequence!<1||t.sequence!>1000000)return 'Indica un orden válido para el traspaso.';
   const order=t.date+':'+t.sequence;if(orders.has(order))return 'Los traspasos del mismo día requieren órdenes distintos.';orders.add(order);
   const held=balances.get(t.instrumentId)??0;if(held+EPS<t.units)return 'No puedes traspasar más participaciones de las disponibles en esa fecha.';
   balances.set(t.instrumentId,Math.max(0,held-t.units));balances.set(t.targetInstrumentId,(balances.get(t.targetInstrumentId)??0)+t.targetUnits);continue;
  }
  if(t.targetInstrumentId!==undefined||t.targetUnits!==undefined||t.sequence!==undefined)return 'Los datos de traspaso solo se admiten en un traspaso.';
  if(t.type==='DIVIDEND'){if(t.amount<=0||t.units!==0||t.fee!==0)return 'El dividendo debe ser neto, positivo y sin participaciones ni comisión.';continue;}
  if(!Number.isFinite(t.units)||t.units<=0||t.units>1e9||t.amount<=0)return 'Compras y ventas requieren importe y participaciones mayores que cero.';
  if(t.type==='SELL'&&t.fee>t.amount)return 'La comisión no puede superar el importe de la venta.';
  if(t.type==='BUY')balances.set(t.instrumentId,(balances.get(t.instrumentId)??0)+t.units);
  else{const held=balances.get(t.instrumentId)??0;if(held+EPS<t.units)return 'No puedes vender más participaciones de las que tenías en esa fecha.';balances.set(t.instrumentId,Math.max(0,held-t.units));}
 }
 return null;
}
export function calculatePortfolio(instruments:Instrument[],transactions:Transaction[]):PortfolioSummary{
 const buckets=new Map(instruments.map(instrument=>[instrument.id,{instrument,units:0,costBasis:0,buysCash:0,sellsCash:0,dividendsCash:0,realizedPnL:0}]));
 for(const tx of sortedTransactions(transactions)){const b=buckets.get(tx.instrumentId);if(!b)continue;
  if(tx.type==='BUY'){b.units+=tx.units;b.costBasis+=tx.amount+tx.fee;b.buysCash+=tx.amount+tx.fee;}
  else if(tx.type==='SELL'){const soldCost=(b.units>EPS?b.costBasis/b.units:0)*tx.units;b.units=Math.max(0,b.units-tx.units);b.costBasis=b.units<EPS?0:Math.max(0,b.costBasis-soldCost);b.sellsCash+=tx.amount-tx.fee;b.realizedPnL+=tx.amount-tx.fee-soldCost;}
  else if(tx.type==='TRANSFER'){const target=buckets.get(tx.targetInstrumentId!);if(!target)continue;const carried=(b.units>EPS?b.costBasis/b.units:0)*tx.units;b.units=Math.max(0,b.units-tx.units);b.costBasis=b.units<EPS?0:Math.max(0,b.costBasis-carried);target.units+=tx.targetUnits!;target.costBasis+=carried;}
  else b.dividendsCash+=tx.amount;
 }
 const holdings:Holding[]=[...buckets.values()].map(b=>{const value=b.units*b.instrument.price;const unrealizedPnL=value-b.costBasis;const totalPnL=b.realizedPnL+unrealizedPnL+b.dividendsCash;const received=transactions.some(t=>t.type==='TRANSFER'&&t.targetInstrumentId===b.instrument.id);return {...b,value,averageCost:b.units>EPS?b.costBasis/b.units:0,unrealizedPnL,totalPnL,returnOnBuys:!received&&b.buysCash>EPS?totalPnL/b.buysCash*100:null};});
 const sum=(key:keyof Holding)=>holdings.reduce((n,h)=>n+Number(h[key]??0),0);const totalBuyCash=sum('buysCash'),totalSellCash=sum('sellsCash'),totalDividends=sum('dividendsCash'),marketValue=sum('value');const totalPnL=marketValue+totalSellCash+totalDividends-totalBuyCash;
 return {holdings,marketValue,totalBuyCash,totalSellCash,totalDividends,netCashContributed:totalBuyCash-totalSellCash-totalDividends,realizedPnL:sum('realizedPnL')+totalDividends,unrealizedPnL:sum('unrealizedPnL'),totalPnL,returnOnBuys:totalBuyCash>EPS?totalPnL/totalBuyCash*100:null};
}
export const eur=(n:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);
export const nfmt=(n:number,digits=4)=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:digits}).format(n);
export const pct=(n:number|null)=>n===null?'—':(n>=0?'+':'')+new Intl.NumberFormat('es-ES',{maximumFractionDigits:2,minimumFractionDigits:2}).format(n)+' %';
