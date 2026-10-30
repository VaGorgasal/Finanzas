import type {PortfolioState} from './types.ts';
import {calculatePortfolio,isValidDay,todayIso} from './portfolio.ts';
export type Flow={date:string;amount:number};
/** TIR anual, base ACT/365. Solo se resuelve un patrón de signos convencional. */
export function xirr(input:Flow[]):{rate:number|null;reason:string}{
 const grouped=new Map<string,number>();
 for(const f of input){if(!isValidDay(f.date)||!Number.isFinite(f.amount))return {rate:null,reason:'Flujos no válidos.'};grouped.set(f.date,(grouped.get(f.date)??0)+f.amount);}
 const flows=[...grouped].sort(([a],[b])=>a.localeCompare(b)).filter(([,n])=>Math.abs(n)>1e-8);
 const signs=flows.map(([,n])=>Math.sign(n));
 const changes=signs.slice(1).filter((s,i)=>s!==signs[i]).length;
 if(flows.length<2||signs[0]!==-1||changes!==1)return {rate:null,reason:'No hay una TIR única verificable con este patrón de cobros y pagos.'};
 const start=Date.parse(flows[0][0]);const times=flows.map(([d,n])=>({t:(Date.parse(d)-start)/86400000/365,n}));
 if(times.at(-1)!.t<30/365)return {rate:null,reason:'Menos de 30 días de historial: no anualizamos el resultado.'};
 const npv=(log:number)=>times.reduce((sum,x)=>sum+x.n*Math.exp(-log*x.t),0);
 let low=-13.8,high=13.8;
 if(!(npv(low)>0&&npv(high)<0))return {rate:null,reason:'La TIR queda fuera del intervalo de cálculo.'};
 for(let i=0;i<160;i++){const mid=(low+high)/2;if(npv(mid)>0)low=mid;else high=mid;}
 return {rate:Math.expm1((low+high)/2),reason:'TIR anual estimada de las inversiones, con fechas reales. Excluye el efectivo sin invertir.'};
}
export function portfolioIrr(state:PortfolioState){
 if(state.demoMode)return {rate:null,reason:'La demostración no representa una rentabilidad personal.'};
 const summary=calculatePortfolio(state.instruments,state.transactions);
 const open=summary.holdings.filter(h=>h.units>1e-8);
 if(open.some(h=>h.instrument.quoteSource==='demo'))return {rate:null,reason:'Faltan precios reales.'};
 const dates=[...new Set(open.map(h=>h.instrument.priceDate))];
 if(dates.length>1)return {rate:null,reason:'Actualiza todas las posiciones abiertas a una misma fecha para calcular la TIR.'};
 const end=dates[0]??state.transactions.map(t=>t.date).sort().at(-1)??todayIso();
 if(state.transactions.some(t=>t.date>end))return {rate:null,reason:'Hay operaciones posteriores a la fecha de valoración.'};
 const flows=state.transactions.filter(t=>t.type!=='TRANSFER').map(t=>({date:t.date,amount:t.type==='BUY'?-(t.amount+t.fee):t.type==='SELL'?t.amount-t.fee:t.amount}));
 return xirr([...flows,{date:end,amount:summary.marketValue}]);
}
export type Snapshot={date:string;value:number;netContributed:number;result:number};
export function parseSnapshots(value:unknown):Snapshot[]{
 if(!Array.isArray(value)||value.length>2000)throw new Error('Historial no válido.');
 const seen=new Set<string>();
 return value.map(x=>{if(!x||!isValidDay(x.date)||x.date>todayIso()||seen.has(x.date)||!Number.isFinite(x.value)||x.value<0||!Number.isFinite(x.netContributed)||!Number.isFinite(x.result)||Math.abs(x.value-x.netContributed-x.result)>.02)throw new Error('Valoración histórica no válida.');seen.add(x.date);return {date:x.date,value:x.value,netContributed:x.netContributed,result:x.result};}).sort((a,b)=>a.date.localeCompare(b.date));
}
