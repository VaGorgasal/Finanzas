import type {MarketQuote} from './market.ts';
import type {Instrument} from './types.ts';
import {isValidDay,todayIso} from './portfolio.ts';
export function selectProductQuote(quotes:MarketQuote[],isin:string,symbol=''):MarketQuote|null{
 const exact=quotes.filter(q=>q.isin===isin);return symbol?exact.find(q=>q.symbol===symbol)??null:exact.length===1?exact[0]:null;
}
export function instrumentFromQuote(quote:MarketQuote,isin:string,id:string,today=todayIso()):Instrument{
 if(quote.isin!==isin||!/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)||quote.currency!=='EUR'||quote.source!=='eodhd'||
  typeof quote.name!=='string'||!quote.name.trim()||quote.name.length>150||!Number.isFinite(quote.price)||quote.price<=0||quote.price>1e9||
  !isValidDay(quote.date)||quote.date>today||!/^[A-Za-z0-9_-]{1,30}\.[A-Za-z0-9_-]{1,15}$/.test(quote.symbol))throw new Error('La ficha recibida no coincide con el ISIN o no tiene una valoración válida en euros.');
 const kind=['fondo','etf','acción','otro'].includes(quote.kind??'')?quote.kind!:'otro';
 return {id,isin,name:quote.name.trim(),kind,category:'otro',currency:'EUR',color:'#497d52',price:quote.price,priceDate:quote.date,quoteSource:'eodhd',quoteSymbol:quote.symbol,
  explanation:'Producto identificado por ISIN en EODHD. Valoración al último cierre disponible.',risk:'Consulta la documentación oficial para conocer los riesgos y condiciones del producto.'};
}
