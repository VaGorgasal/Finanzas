import {NextRequest,NextResponse} from 'next/server';
import {requireAccess,serviceFailure,ServiceError} from '../../../lib/server-access.ts';
import {researchQuery} from '../../../lib/server-research.ts';
export const runtime='nodejs';
export const maxDuration=40;
const cache=new Map<string,{until:number;data:unknown}>();
async function provider(path:string,params:Record<string,string>){
 const key=process.env.EODHD_API_KEY;if(!key)throw new ServiceError('El proveedor de seguimiento no está configurado.',503);
 const cacheKey=path+'?'+new URLSearchParams(params).toString();const hit=cache.get(cacheKey);if(hit&&hit.until>Date.now())return hit.data;
 const url=new URL('https://eodhd.com/api/'+path);for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);url.searchParams.set('fmt','json');url.searchParams.set('api_token',key);
 try{const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000),redirect:'error'});if(!response.ok)throw new ServiceError(response.status===429?'El proveedor ha agotado su cuota.':'El plan del proveedor no permite esta consulta o no hay cobertura.',response.status===429?429:502);
  const reader=response.body?.getReader();if(!reader)throw new Error();const chunks:Uint8Array[]=[];let size=0;try{for(;;){const x=await reader.read();if(x.done)break;size+=x.value.byteLength;if(size>2_000_000){await reader.cancel();throw new Error();}chunks.push(x.value);}}finally{reader.releaseLock();}
  const data:unknown=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(cache.size>=100)cache.clear();cache.set(cacheKey,{until:Date.now()+3600000,data});return data;
 }catch(e){if(e instanceof ServiceError)throw e;throw new ServiceError('El proveedor no responde o devuelve datos no válidos. No se han reemplazado tus datos.',502);}
}
export async function GET(request:NextRequest){try{
 const isin=(request.nextUrl.searchParams.get('isin')??'').trim().toUpperCase(),symbol=request.nextUrl.searchParams.get('symbol')??'',mode=request.nextUrl.searchParams.get('mode')??'';
 if(!['','history'].includes(mode))throw new ServiceError('Consulta no válida.',400);
 const result=await researchQuery({isin,symbol,history:mode==='history'},{licensed:process.env.MARKET_RESEARCH_LICENSE_CONFIRMED==='true',authorize:()=>requireAccess(request,'market'),now:new Date().toISOString(),fetchData:provider});
 return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return serviceFailure(e);}}
