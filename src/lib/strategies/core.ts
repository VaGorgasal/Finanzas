import {calculatePortfolio,isValidDay,validateLedger} from '../portfolio.ts';
import {parsePortfolio} from '../storage.ts';
import {ledgerSignature} from '../kpi/data.ts';
import {calculateTax,parseTaxContext,type TaxContext} from './tax.ts';
import type {PortfolioState,Instrument,Transaction} from '../types.ts';
export const STRATEGIES_KEY='brujula-strategies-v1';
export type StrategyDraft={name:string;thesis:string;risks:string;alternatives:string;decision:string;sources:{url:string;publishedAt:string}[];baseline:PortfolioState;capturedAt:string;instruments:Instrument[];operations:Transaction[];initialCash:number;contribution:number;taxReserve:number;tax:TaxContext;shocks:Record<string,number>};
export type StrategyVersion={id:string;strategyId:string;revision:number;savedAt:string;engine:'strategy-v1';draft:StrategyDraft;result:ReturnType<typeof evaluateStrategy>};
export function validateDraft(d:StrategyDraft){
 if(!d||typeof d!=='object')throw new Error('Estrategia inválida.');
 for(const k of ['name','thesis','risks','alternatives','decision'] as const)if(typeof d[k]!=='string'||d[k].length>5000)throw new Error('Texto de estrategia inválido.');
 if(!d.name.trim()||!isValidDay(d.capturedAt)||d.capturedAt>new Date().toISOString().slice(0,10))throw new Error('Falta nombre o fecha válida.');
 const baseline=parsePortfolio(d.baseline);
 if(baseline.transactions.some(t=>t.date>d.capturedAt)||baseline.instruments.some(a=>a.priceDate>d.capturedAt))throw new Error('La fotografía contiene datos posteriores a su fecha.');
 if(!Array.isArray(d.instruments)||!Array.isArray(d.operations)||d.operations.length>100)throw new Error('Máximo cien operaciones simuladas.');
 const allAssets=parsePortfolio({...baseline,instruments:[...baseline.instruments,...d.instruments]}).instruments;
 if(d.instruments.some(a=>a.priceDate>d.capturedAt))throw new Error('Precio posterior a la captura.');
 if(![d.initialCash,d.contribution,d.taxReserve].every(n=>Number.isFinite(n)&&n>=0&&n<=1e9))throw new Error('Capital o reserva inválidos.');
 parseTaxContext(d.tax);const ids=new Set(baseline.transactions.map(t=>t.id));
 for(const t of d.operations){if(!t||ids.has(t.id)||!['BUY','SELL','TRANSFER'].includes(t.type)||t.date<d.capturedAt||Number(t.date.slice(0,4))!==d.tax.year||t.fx)throw new Error('Operación inválida: usa EUR y fechas desde la captura, dentro del ejercicio seleccionado.');ids.add(t.id);}
 const cutoff=d.operations.reduce((day,t)=>t.date>day?t.date:day,d.capturedAt),error=validateLedger([...baseline.transactions,...d.operations],allAssets,cutoff);if(error)throw new Error(error);
 if(!Array.isArray(d.sources)||d.sources.length>30)throw new Error('Máximo treinta fuentes.');
 for(const s of d.sources){const u=new URL(s.url);if(u.protocol!=='https:'||u.username||u.password||!isValidDay(s.publishedAt)||s.publishedAt>d.capturedAt)throw new Error('Fuente inválida o publicada después de la captura.');}
 if(!d.shocks||typeof d.shocks!=='object'||Array.isArray(d.shocks))throw new Error('Hipótesis inválidas.');
 for(const [id,n] of Object.entries(d.shocks))if(!allAssets.some(a=>a.id===id)||!Number.isFinite(n)||n< -1||n>10)throw new Error('Variación supuesta entre −100% y +1000%.');
 return {baseline,allAssets,cutoff};
}
export function evaluateStrategy(d:StrategyDraft){
 const {baseline,allAssets,cutoff}=validateDraft(d),scenario={...baseline,instruments:allAssets,transactions:[...baseline.transactions,...d.operations]};
 const before=calculatePortfolio(baseline.instruments,baseline.transactions),after=calculatePortfolio(allAssets,scenario.transactions);
 const cashBefore=d.initialCash+d.contribution;let cashAfter=cashBefore,minCash=cashBefore;
 for(const t of [...d.operations].sort((a,b)=>a.date.localeCompare(b.date)||(d.tax.order[a.id]??0)-(d.tax.order[b.id]??0))){cashAfter+=t.type==='SELL'?t.amount-t.fee:t.type==='BUY'?-t.amount-t.fee:0;minCash=Math.min(minCash,cashAfter);}
 const baselineTax=calculateTax(baseline,d.tax,cutoff),tax=calculateTax(scenario,d.tax,cutoff),incrementalTax=baselineTax.estimatedTax===null||tax.estimatedTax===null?null:tax.estimatedTax-baselineTax.estimatedTax;
 const reserve=incrementalTax===null?d.taxReserve:Math.max(0,d.taxReserve,incrementalTax),warnings=[...tax.issues];
 if(minCash<-.005)warnings.push('Una compra ocurre antes de disponer del efectivo necesario.');
 if(cashAfter-reserve<-.005)warnings.push('Falta financiación para compras, comisiones y reserva fiscal.');
 if(incrementalTax===null)warnings.push('Efectivo neto fiscal desconocido: la reserva manual es solo una hipótesis.');
 if(allAssets.some(a=>(Date.parse(d.capturedAt)-Date.parse(a.priceDate))/86400000>7))warnings.push('Hay precios de más de siete días.');
 const concentration=(s:typeof before)=>s.marketValue>0?Math.max(0,...s.holdings.map(h=>h.value))/s.marketValue:null;
 const stressed=(s:typeof before)=>s.holdings.reduce((n,h)=>n+h.value*(1+(d.shocks[h.instrument.id]??0)),0);
 return {signature:ledgerSignature(baseline),beforeValue:before.marketValue,afterValue:after.marketValue,beforeConcentration:concentration(before),afterConcentration:concentration(after),cashBefore,cashAfter,minCash,fees:d.operations.reduce((n,t)=>n+t.fee,0),baselineTax,tax,incrementalTax,reserve,availableAfterReserve:cashAfter-reserve,netCashAfterTax:incrementalTax===null?null:cashAfter-Math.max(0,incrementalTax),funded:minCash>=-.005&&cashAfter-reserve>=-.005,projectedHold:stressed(before)+cashBefore,projectedStrategy:stressed(after)+cashAfter-reserve,warnings};
}
function sizeOK(value:unknown){if(new TextEncoder().encode(JSON.stringify(value)).length>500000)throw new Error('Historial mayor de 500 KB. Exporta y elimina estrategias antiguas; nunca se borran automáticamente.');}
export function saveStrategyVersion(existing:StrategyVersion[],draft:StrategyDraft,strategyId:string,id:string,savedAt:string):StrategyVersion[]{
 const result=evaluateStrategy(draft),versions=existing.filter(v=>v.strategyId===strategyId);
 if(existing.length>=100)throw new Error('Máximo cien versiones. Exporta antes de eliminar estrategias.');
 if(versions.length&&JSON.stringify(versions[0].draft.baseline)!==JSON.stringify(draft.baseline))throw new Error('Crea otra estrategia para actualizar la fotografía inicial.');
 if(existing.some(v=>v.id===id))throw new Error('Versión duplicada.');
 const next=[...existing,{id,strategyId,revision:versions.length+1,savedAt,engine:'strategy-v1' as const,draft:structuredClone(draft),result}];sizeOK(next);return next;
}
export function parseStrategies(value:unknown):StrategyVersion[]{
 if(!Array.isArray(value)||value.length>100)throw new Error('Historial inválido.');sizeOK(value);
 const ids=new Set<string>(),counts=new Map<string,number>(),bases=new Map<string,string>();
 return value.map(v=>{if(!v||typeof v!=='object'||v.engine!=='strategy-v1'||typeof v.id!=='string'||!v.id||v.id.length>100||ids.has(v.id)||typeof v.strategyId!=='string'||!v.strategyId||v.strategyId.length>100||typeof v.savedAt!=='string'||!Number.isFinite(Date.parse(v.savedAt)))throw new Error('Versión inválida.');
 ids.add(v.id);const n=(counts.get(v.strategyId)??0)+1;counts.set(v.strategyId,n);if(n!==v.revision)throw new Error('Historial incompleto o desordenado.');
 const result=evaluateStrategy(v.draft),base=JSON.stringify(v.draft.baseline);if(bases.has(v.strategyId)&&bases.get(v.strategyId)!==base)throw new Error('Fotografía inicial modificada.');bases.set(v.strategyId,base);
 if(JSON.stringify(result)!==JSON.stringify(v.result))throw new Error('Resultado histórico no concilia con sus datos y motor.');return structuredClone(v) as StrategyVersion;});
}
