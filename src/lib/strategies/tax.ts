import {isValidDay, validateLedger} from '../portfolio.ts';
import type {PortfolioState, Transaction} from '../types.ts';
export const TAX_KEY='brujula-tax-v1';
export const TAX_RULE={id:'ES-common-savings-2025-2026-v1',years:[2025,2026],verifiedAt:'2026-11-12',source:'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764&p=20260930&tn=1',articles:'33.5, 35, 37.2, 49, 66, 76 y 94'};
export type Carry={year:number;kind:'gains'|'income';amount:number};
export type TaxContext={year:number;commonRegime:boolean;completeHistory:boolean;otherGains:number;otherIncome:number;savingsMinimum:number;carry:Carry[];dividends:Record<string,{gross:number;withholding:number}>;order:Record<string,number>;eligibleTransfers:Record<string,string>;lossReviews:Record<string,{deductible:number;source:string}>};
export const emptyTaxContext=(year=2026):TaxContext=>({year,commonRegime:false,completeHistory:false,otherGains:0,otherIncome:0,savingsMinimum:0,carry:[],dividends:{},order:{},eligibleTransfers:{},lossReviews:{}});
const record=(x:unknown):Record<string,unknown>=>{if(!x||typeof x!=='object'||Array.isArray(x))throw new Error('Objeto fiscal inválido.');return x as Record<string,unknown>;};
const num=(x:unknown,signed=false):number=>{if(typeof x!=='number'||!Number.isFinite(x)||Math.abs(x)>1e9||!signed&&x<0)throw new Error('Importe fiscal inválido.');return x;};
const ref=(x:unknown):string=>{if(typeof x!=='string'||!x.trim()||x.length>1000)throw new Error('Falta referencia documental.');return x.trim();};
export function parseTaxContext(value:unknown):TaxContext{
 const x=record(value),year=Number(x.year);if(!Number.isInteger(x.year)||year<2000||year>2100||typeof x.commonRegime!=='boolean'||typeof x.completeHistory!=='boolean'||!Array.isArray(x.carry)||x.carry.length>8)throw new Error('Contexto fiscal inválido.');
 const seen=new Set<string>();const carry=x.carry.map(v=>{const c=record(v),y=Number(c.year),key=y+':'+c.kind;if(!Number.isInteger(c.year)||y<year-4||y>=year||!['gains','income'].includes(String(c.kind))||seen.has(key))throw new Error('Saldo duplicado o fuera de los cuatro ejercicios anteriores.');seen.add(key);return {year:y,kind:c.kind as Carry['kind'],amount:num(c.amount)};});
 function map<T>(v:unknown,f:(v:unknown)=>T):Record<string,T>{const entries=Object.entries(record(v));if(entries.length>5100)throw new Error('Demasiadas evidencias.');return Object.fromEntries(entries.map(([k,x])=>{if(!k||k.length>100)throw new Error('Identificador inválido.');return [k,f(x)];}));}
 return {year,commonRegime:x.commonRegime,completeHistory:x.completeHistory,otherGains:num(x.otherGains,true),otherIncome:num(x.otherIncome,true),savingsMinimum:num(x.savingsMinimum),carry,
 dividends:map(x.dividends,v=>{const d=record(v),gross=num(d.gross),withholding=num(d.withholding);if(withholding>gross)throw new Error('Retención superior al bruto.');return {gross,withholding};}),
 order:map(x.order,v=>{const n=num(v);if(!Number.isInteger(n)||n<1)throw new Error('Orden inválido.');return n;}),eligibleTransfers:map(x.eligibleTransfers,ref),lossReviews:map(x.lossReviews,v=>{const r=record(v);return {deductible:num(r.deductible),source:ref(r.source)};})};
}
export function savingsTax(base:number){if(!Number.isFinite(base)||base<0)throw new Error('Base inválida.');let last=0,total=0;[6000,50000,200000,300000,Infinity].forEach((limit,i)=>{total+=Math.max(0,Math.min(base,limit)-last)*[.19,.21,.23,.27,.30][i];last=limit;});return total;}
/** Current-year cross offsets, previous same basket, then previous cross basket.
 * Cross offsets share the original 25% cap; remaining balances retain their year. */
export function offsetSavings(gains:number,income:number,carry:Carry[]){
 let g=Math.max(0,gains),i=Math.max(0,income),lg=Math.max(0,-gains),li=Math.max(0,-income),cg=g*.25,ci=i*.25;
 let used=Math.min(lg,ci);lg-=used;i-=used;ci-=used;used=Math.min(li,cg);li-=used;g-=used;cg-=used;
 const remaining=carry.map(c=>({...c})).sort((a,b)=>a.year-b.year);
 for(const c of remaining){const n=Math.min(c.amount,c.kind==='gains'?g:i);c.amount-=n;if(c.kind==='gains')g-=n;else i-=n;}
 for(const c of remaining){const n=Math.min(c.amount,c.kind==='gains'?Math.min(i,ci):Math.min(g,cg));c.amount-=n;if(c.kind==='gains'){i-=n;ci-=n;}else{g-=n;cg-=n;}}
 return {base:g+i,gains:g,income:i,currentLosses:{gains:lg,income:li},carry:remaining};
}
export type Lot={instrumentId:string;origin:string;acquired:string;rank:number;units:number;cost:number};
export type Match={origin:string;acquired:string;rank:number;units:number;cost:number};
export type Disposal={id:string;instrumentId:string;date:string;proceeds:number;cost:number;gain:number;deductibleLoss:number|null;matches:Match[]};
export function calculateTax(state:PortfolioState,input:TaxContext,cutoff:string){
 const c=parseTaxContext(input);if(!isValidDay(cutoff))throw new Error('Fecha fiscal inválida.');const txs=state.transactions.filter(t=>t.date<=cutoff),error=validateLedger(txs,state.instruments,cutoff);if(error)throw new Error(error);
 const issues:string[]=[];if(!c.commonRegime)issues.push('Confirma España, régimen común.');if(!c.completeHistory)issues.push('Falta confirmar historial completo de todos los intermediarios para la misma titularidad, costes y ausencia de operaciones societarias no registradas.');if(!TAX_RULE.years.includes(c.year))issues.push('Ejercicio sin reglas verificadas.');
 const ordered=[...txs].sort((a,b)=>a.date.localeCompare(b.date)||(c.order[a.id]??0)-(c.order[b.id]??0)||a.id.localeCompare(b.id));
 for(const day of new Set(txs.map(t=>t.date))){const group=txs.filter(t=>t.date===day&&t.type!=='DIVIDEND'),ranks=group.map(t=>c.order[t.id]);if(group.length>1&&(ranks.some(n=>!n)||new Set(ranks).size!==ranks.length))issues.push(`Falta orden inequívoco de las operaciones del ${day}.`);}
 const lots:Lot[]=[],disposals:Disposal[]=[];let gains=c.otherGains,income=c.otherIncome,withholding=0,rank=0;
 function consume(t:Transaction):Match[]{let need=t.units;const matches:Match[]=[];for(const l of lots.filter(l=>l.instrumentId===t.instrumentId&&l.units>1e-8).sort((a,b)=>a.acquired.localeCompare(b.acquired)||a.rank-b.rank)){
 const units=Math.min(need,l.units),cost=l.cost*units/l.units;matches.push({origin:l.origin,acquired:l.acquired,rank:l.rank,units,cost});l.units-=units;l.cost-=cost;need-=units;if(need<1e-8)break;
 }if(need>1e-8)throw new Error('Orden fiscal incompatible con los títulos disponibles.');return matches;}
 for(const t of ordered){const current=Number(t.date.slice(0,4))===c.year;
 if(t.type==='BUY')lots.push({instrumentId:t.instrumentId,origin:t.id,acquired:t.date,rank:rank++,units:t.units,cost:t.amount+t.fee});
 else if(t.type==='TRANSFER'){if(!c.eligibleTransfers[t.id])issues.push(`Traspaso ${t.id}: falta acreditación de elegibilidad y continuidad fiscal.`);for(const m of consume(t))lots.push({instrumentId:t.targetInstrumentId!,origin:m.origin,acquired:m.acquired,rank:m.rank,units:t.targetUnits!*m.units/t.units,cost:m.cost});}
 else if(t.type==='SELL'){const matches=consume(t),cost=matches.reduce((n,m)=>n+m.cost,0),proceeds=t.amount-t.fee,gain=proceeds-cost;let deductibleLoss:number|null=gain>=0?0:null;
 if(gain<0){const review=c.lossReviews[t.id];if(review&&review.deductible<=-gain+1e-8)deductibleLoss=review.deductible;else if(current)issues.push(`Venta ${t.id}: pérdida sin revisión documental de recompras homogéneas anteriores y posteriores (dos meses o un año según admisión a negociación), en todos los intermediarios.`);}
 disposals.push({id:t.id,instrumentId:t.instrumentId,date:t.date,proceeds,cost,gain,deductibleLoss,matches});if(current)gains+=gain>=0?gain:-(deductibleLoss??0);
 }else if(current){const d=c.dividends[t.id];if(!d||Math.abs(d.gross-d.withholding-t.amount)>.01)issues.push(`Dividendo ${t.id}: faltan bruto y retención conciliados con el neto.`);else{income+=d.gross;withholding+=d.withholding;}}}
 const offsets=offsetSavings(gains,income,c.carry),estimatedTax=issues.length?null:Math.max(0,savingsTax(offsets.base)-savingsTax(Math.min(offsets.base,c.savingsMinimum)));
 return {rule:TAX_RULE.id,issues:[...new Set(issues)],disposals:disposals.filter(d=>Number(d.date.slice(0,4))===c.year),lots:lots.filter(l=>l.units>1e-8),gains,income,withholding,offsets,estimatedTax};
}
