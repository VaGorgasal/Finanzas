import {isValidDay,todayIso} from './portfolio.ts';
import type {Holding} from './types.ts';
export type Composition={instrumentId:string;date:string;source:string;positions:{id:string;name:string;weight:number}[]};
export function parseCompositions(value:unknown):Composition[]{
 if(!Array.isArray(value)||value.length>100)throw new Error('Composición no válida.');
 const ids=new Set<string>();return value.map(x=>{if(!x||typeof x.instrumentId!=='string'||ids.has(x.instrumentId)||!isValidDay(x.date)||x.date>todayIso()||typeof x.source!=='string')throw new Error('Revisa producto, fecha y fuente.');const url=new URL(x.source);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Usa una fuente HTTPS.');ids.add(x.instrumentId);
 if(!Array.isArray(x.positions)||x.positions.length>1000)throw new Error('Máximo 1000 posiciones por producto.');const seen=new Set<string>();let sum=0;const positions=x.positions.map((p:{id:string;name:string;weight:number})=>{if(!p||typeof p.id!=='string'||!p.id.trim()||p.id.length>100||seen.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>150||!Number.isFinite(p.weight)||p.weight<=0||p.weight>100)throw new Error('Posición subyacente no válida.');seen.add(p.id);sum+=p.weight;return {id:p.id,name:p.name,weight:p.weight};});if(sum>100.00001)throw new Error('Los pesos superan el 100%.');return {instrumentId:x.instrumentId,date:x.date,source:url.href,positions};});
}
export function aggregateExposure(holdings:Holding[],compositions:Composition[]){
 const active=holdings.filter(h=>h.units>1e-8);const total=active.reduce((n,h)=>n+h.value,0);const rows=new Map<string,{id:string;name:string;value:number;products:string[]}>();let covered=0;
 for(const h of active){const c=compositions.find(x=>x.instrumentId===h.instrument.id);const positions=h.instrument.kind==='acción'?[{id:h.instrument.isin,name:h.instrument.name,weight:100}]:c?.positions??[];
 for(const p of positions){const value=h.value*p.weight/100;covered+=value;const row=rows.get(p.id)??{id:p.id,name:p.name,value:0,products:[]};row.value+=value;row.products.push(h.instrument.name);rows.set(p.id,row);}}
 return {coverage:total?covered/total:0,rows:[...rows.values()].map(r=>({...r,weight:total?r.value/total:0})).sort((a,b)=>b.value-a.value)};
}
