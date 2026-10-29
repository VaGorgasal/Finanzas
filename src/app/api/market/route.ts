import { NextRequest, NextResponse } from 'next/server';
import { normalizeQuotes } from '../../../lib/market';
export const runtime='nodejs';
const cache=new Map<string,{until:number; quotes:ReturnType<typeof normalizeQuotes>}>();
let windowStart=0, requests=0;
export async function GET(request:NextRequest) {
  const isin=(request.nextUrl.searchParams.get('isin')||'').trim().toUpperCase();
  if (!/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)) return NextResponse.json({error:'Introduce un ISIN válido de 12 caracteres.'},{status:400});
  const key=process.env.EODHD_API_KEY;
  if (!key) return NextResponse.json({error:'El proveedor de precios no está configurado en el servidor.'},{status:503});
  const now=Date.now(), hit=cache.get(isin);
  if (hit && hit.until>now) return NextResponse.json({quotes:hit.quotes});
  if (now-windowStart>86400000) {windowStart=now; requests=0;}
  // Presupuesto conservador para la prueba privada; compartido por instancia.
  if (requests>=15) return NextResponse.json({error:'Se ha alcanzado el límite diario de consultas de esta prueba. Puedes introducir un precio manual.'},{status:429});
  requests++;
  try {
    const url=new URL('https://eodhd.com/api/search/'+isin);
    url.searchParams.set('api_token',key); url.searchParams.set('fmt','json'); url.searchParams.set('limit','50');
    const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});
    if (!response.ok) return NextResponse.json({error:response.status===429?'El proveedor ha agotado su cuota de consultas.':'El proveedor no permite esta consulta. Comprueba la clave y la cobertura del plan.'},{status:502});
    const quotes=normalizeQuotes(await response.json(),isin);
    if (!quotes.length) return NextResponse.json({error:'No hay precios fechados en EUR para este ISIN. Puede faltar cobertura o estar cotizado en otra moneda; utiliza la valoración manual.'},{status:404});
    if(cache.size>=100) cache.clear();
    cache.set(isin,{until:now+3600000,quotes});
    return NextResponse.json({quotes});
  } catch { return NextResponse.json({error:'El proveedor no responde. Se conserva tu valoración anterior.'},{status:502}); }
}
