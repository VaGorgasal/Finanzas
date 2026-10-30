export type MarketQuote = {isin:string; name:string; symbol:string; currency:'EUR'; price:number; date:string; source:'eodhd'};
export function normalizeQuotes(input:unknown, isin:string, maxDate=new Date().toISOString().slice(0,10)): MarketQuote[] {
  if (!Array.isArray(input)) return [];
  const seen=new Set<string>();
  return input.flatMap((x:Record<string,unknown>)=>{
    if (!x || x.ISIN!==isin || x.Currency!=='EUR' || typeof x.Name!=='string' || typeof x.Code!=='string' || typeof x.Exchange!=='string') return [];
    const price=x.previousClose, date=x.previousCloseDate;
    if (typeof price!=='number' || !Number.isFinite(price) || price<=0 || price>1e9 || typeof date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date>maxDate) return [];
    const day=new Date(date+'T12:00:00Z');
    if (Number.isNaN(day.valueOf()) || day.toISOString().slice(0,10)!==date) return [];
    const symbol=x.Code+'.'+x.Exchange;
    if (seen.has(symbol)) return [];
    seen.add(symbol);
    return [{isin,name:x.Name,symbol,currency:'EUR' as const,price,date,source:'eodhd' as const}];
  });
}
export async function lookupQuotes(isin:string):Promise<MarketQuote[]> {
  const {remoteFetch}=await import('./supabase.ts');
  const response=await remoteFetch('/api/market?isin='+encodeURIComponent(isin));
  const data=await response.json();
  if (!response.ok) throw new Error(data.error || 'No se ha podido consultar el proveedor.');
  return data.quotes;
}
