import type {AssetKind} from './types.ts';
export type MarketQuote = {isin:string; name:string; symbol:string; currency:'EUR'; price:number; date:string; source:'eodhd';kind?:AssetKind};
export function marketKind(value:unknown):AssetKind{
 const type=typeof value==='string'?value.trim().toUpperCase():'';
 if(type==='ETF')return 'etf';
 if(['FUND','MUTUAL FUND'].includes(type))return 'fondo';
 if(['COMMON STOCK','PREFERRED STOCK','STOCK'].includes(type))return 'acción';
 return 'otro';
}
export function normalizeQuotes(input:unknown, isin:string, maxDate=new Date().toISOString().slice(0,10)): MarketQuote[] {
  if (!Array.isArray(input)) return [];
  const seen=new Set<string>();
  return input.flatMap((x:Record<string,unknown>)=>{
    if (!x || x.ISIN!==isin || x.Currency!=='EUR' || typeof x.Name!=='string' || typeof x.Code!=='string' || typeof x.Exchange!=='string') return [];
    const price=x.previousClose, date=x.previousCloseDate;
    if (typeof price!=='number' || !Number.isFinite(price) || price<=0 || price>1e9 || typeof date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date>maxDate) return [];
    const day=new Date(date+'T12:00:00Z');
    if (Number.isNaN(day.valueOf()) || day.toISOString().slice(0,10)!==date) return [];
    const symbol=x.Code+'.'+x.Exchange;if(!/^[A-Za-z0-9_-]{1,30}\.[A-Za-z0-9_-]{1,15}$/.test(symbol)||!x.Name.trim()||x.Name.length>150)return [];
    if (seen.has(symbol)) return [];
    seen.add(symbol);
    return [{isin,name:x.Name,symbol,currency:'EUR' as const,price,date,source:'eodhd' as const,kind:marketKind(x.Type)}];
  });
}
export async function lookupQuotes(isin:string,signal?:AbortSignal):Promise<MarketQuote[]> {
  const {remoteFetch}=await import('./supabase.ts');
  const response=await remoteFetch('/api/market?isin='+encodeURIComponent(isin),{signal});
  const data=await response.json();
  if (!response.ok) throw new Error(data.error || 'No se ha podido consultar el proveedor.');
  if(!Array.isArray(data.quotes))throw new Error('El proveedor no ha devuelto una ficha válida.');
  return data.quotes;
}
