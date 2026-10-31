import {candidates,normalizeResearch,normalizeHistory,type Candidate,type Research,type PricePoint} from './research.ts';
import {ServiceError} from './service-error.ts';
type Result={candidates:Candidate[];candidate?:Candidate;research?:Research;history?:PricePoint[]};
type Deps={authorize:()=>Promise<unknown>;licensed:boolean;now:string;fetchData:(path:string,params:Record<string,string>)=>Promise<unknown>};
export async function researchQuery(input:{isin:string;symbol:string;history:boolean},deps:Deps):Promise<Result>{
 const {isin,symbol,history}=input;
 if(!/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)||(symbol&&!/^[A-Za-z0-9_-]{1,30}\.[A-Za-z0-9_-]{1,15}$/.test(symbol))||(history&&!symbol))throw new ServiceError('ISIN o cotización no válidos.',400);
 if(!deps.licensed)throw new ServiceError('Los datos de seguimiento están pendientes de activar: falta confirmar la cobertura y los derechos de uso del proveedor. Tus listas y notas siguen disponibles.',503);
 await deps.authorize();
 const options=candidates(await deps.fetchData('search/'+isin,{limit:'50'}),isin,deps.now.slice(0,10));
 if(!options.length)throw new ServiceError('No hay cobertura verificada por ISIN y moneda. Puedes conservar el seguimiento y registrar un precio manual.',404);
 if(!symbol)return {candidates:options};
 const candidate=options.find(c=>c.symbol===symbol);if(!candidate)throw new ServiceError('Esta cotización no corresponde al ISIN solicitado.',400);
 if(history){const from=new Date(deps.now);from.setUTCDate(from.getUTCDate()-365);const first=from.toISOString().slice(0,10);const points=normalizeHistory(await deps.fetchData('eod/'+symbol,{from:first,to:deps.now.slice(0,10),period:'d',order:'a'}),deps.now.slice(0,10),first);if(points.length<2)throw new ServiceError('No hay suficientes precios históricos ajustados para este producto.',404);return {candidates:options,candidate,history:points};}
 let research:Research;try{research=normalizeResearch(await deps.fetchData('v1.1/fundamentals/'+symbol,{filter:'General,Highlights,AnalystRatings,ETF_Data,MutualFund_Data'}),candidate,deps.now);}catch(e){if(e instanceof ServiceError)throw e;throw new ServiceError('La ficha no tiene identidad, moneda o cobertura verificables. Conservamos los datos anteriores.',502);}
 return {candidates:options,candidate,research};
}
