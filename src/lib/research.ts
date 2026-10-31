export const currencies=['EUR','USD','GBP','CHF','JPY','CAD','AUD','HKD'] as const;
export type Currency=typeof currencies[number];
export type ResearchQuote={price:number;date:string;currency:Currency;source:'manual'|'eodhd'};
export type Candidate={isin:string;name:string;symbol:string;currency:Currency;type:string;quote:ResearchQuote|null};
export type Research={isin:string;symbol:string;currency:Currency;type:'stock'|'etf'|'fund';description:string;recordDate:string|null;fetchedAt:string;target:number|null;counts:{buy:number;hold:number;sell:number}|null;sector:string|null;pe:number|null;benchmark:string|null;holdings:{name:string;weight:number}[]};
export type PricePoint={date:string;price:number};
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
export const positive=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=1e12;
export function validDate(v:unknown,max='9999-12-31'):v is string{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||v>max)return false;const d=new Date(v+'T12:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===v;}
export const text=(v:unknown,max=300)=>typeof v==='string'?v.slice(0,max):null;
export function candidates(input:unknown,isin:string,today:string):Candidate[]{
 if(!Array.isArray(input))return [];const seen=new Set<string>();
 return input.flatMap(v=>{const x=object(v);if(x.ISIN!==isin||!currencies.includes(x.Currency as Currency)||!text(x.Name)||typeof x.Code!=='string'||typeof x.Exchange!=='string')return [];const symbol=x.Code+'.'+x.Exchange;if(!/^[A-Za-z0-9_-]{1,30}\.[A-Za-z0-9_-]{1,15}$/.test(symbol)||seen.has(symbol))return [];seen.add(symbol);
  return [{isin,name:text(x.Name,150)!,symbol,currency:x.Currency as Currency,type:text(x.Type,50)??'',quote:positive(x.previousClose)&&validDate(x.previousCloseDate,today)?{price:x.previousClose,date:x.previousCloseDate,currency:x.Currency as Currency,source:'eodhd' as const}:null}];});
}
export function normalizeResearch(input:unknown,candidate:Candidate,now:string):Research{
 const x=object(input),g=object(x.General);const type=g.Type==='Common Stock'||g.Type==='Preferred Stock'?'stock':g.Type==='ETF'?'etf':g.Type==='FUND'||g.Type==='Mutual Fund'?'fund':null;
 if(!type||g.Code!==candidate.symbol.split('.')[0]||g.CurrencyCode!==candidate.currency||(g.ISIN&&g.ISIN!==candidate.isin))throw new Error('La identidad o moneda de los datos no coincide con la cotización elegida.');
 const a=object(x.AnalystRatings),h=object(x.Highlights),etf=object(x.ETF_Data),fund=object(x.MutualFund_Data);const all=[a.StrongBuy,a.Buy,a.Hold,a.Sell,a.StrongSell];
 const counts=type==='stock'&&all.every(n=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<=10000)?{buy:Number(a.StrongBuy)+Number(a.Buy),hold:Number(a.Hold),sell:Number(a.Sell)+Number(a.StrongSell)}:null;
 const holdings=Object.values(object(etf.Holdings)).slice(0,20).flatMap(v=>{const p=object(v);return text(p.Name)&&typeof p['Assets_%']==='number'&&Number.isFinite(p['Assets_%'])&&p['Assets_%']>=0&&p['Assets_%']<=100?[{name:text(p.Name,150)!,weight:p['Assets_%']}]:[];});
 return {isin:candidate.isin,symbol:candidate.symbol,currency:candidate.currency,type,description:text(g.Description,1800)??'',recordDate:validDate(g.UpdatedAt,now.slice(0,10))?g.UpdatedAt:null,fetchedAt:now,target:type==='stock'?(positive(a.TargetPrice)?a.TargetPrice:positive(h.WallStreetTargetPrice)?h.WallStreetTargetPrice:null):null,counts:counts&&counts.buy+counts.hold+counts.sell>0?counts:null,sector:text(g.Sector,100),pe:type==='stock'&&positive(h.PERatio)?h.PERatio:null,benchmark:type==='etf'?text(etf.Index_Name,150):type==='fund'?text(fund.Benchmark,150):null,holdings};
}
export function targetGap(target:number|null,quote:ResearchQuote|null,currency:Currency):number|null{return positive(target)&&quote&&positive(quote.price)&&quote.currency===currency&&Number.isFinite((target/quote.price-1)*100)?(target/quote.price-1)*100:null;}
export function consensus(counts:Research['counts']):string{if(!counts||counts.buy+counts.hold+counts.sell===0)return 'Sin cobertura';const max=Math.max(counts.buy,counts.hold,counts.sell);if([counts.buy,counts.hold,counts.sell].filter(n=>n===max).length!==1)return 'Mixto';return counts.buy===max?'Compra':counts.sell===max?'Venta':'Mantener';}
export function normalizeHistory(input:unknown,today:string,from:string):PricePoint[]{if(!Array.isArray(input))return [];const rows=new Map<string,PricePoint>();for(const value of input.slice(0,400)){const p=object(value);if(validDate(p.date,today)&&p.date>=from&&positive(p.adjusted_close))rows.set(p.date,{date:p.date,price:p.adjusted_close});}return [...rows.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-270);}
