import assert from 'node:assert/strict';
import {test} from 'node:test';
import {marketKind,normalizeQuotes} from '../src/lib/market.ts';
import {instrumentFromQuote,selectProductQuote} from '../src/lib/instrument-lookup.ts';
const isin='ZZ0000000001',today='2026-11-01';
const quote={isin,name:'Producto ficticio',symbol:'QA.EUFUND',currency:'EUR',price:25.5,date:'2026-10-30',source:'eodhd',kind:'fondo'};
test('la ficha automática conserva nombre, ISIN, tipo, moneda y precio fechado sin crear compras',()=>{
 const asset=instrumentFromQuote(quote,isin,'test-id',today);
 assert.equal(asset.name,quote.name);assert.equal(asset.kind,'fondo');assert.equal(asset.currency,'EUR');assert.equal(asset.price,25.5);assert.equal(asset.priceDate,quote.date);assert.equal(asset.quoteSource,'eodhd');assert.equal(asset.quoteSymbol,quote.symbol);assert.equal(asset.category,'otro');assert.equal('units' in asset,false);
});
test('una respuesta de otro ISIN, moneda, fecha o símbolo no registra el producto',()=>{
 for(const patch of [{isin:'ZZ0000000002'},{currency:'USD'},{price:0},{price:Infinity},{price:1e10},{date:'2026-02-30'},{date:'2099-01-01'},{name:''},{source:'manual'},{symbol:'https://example.com'}])assert.throws(()=>instrumentFromQuote({...quote,...patch},isin,'test-id',today));
});
test('varios mercados requieren selección y una selección antigua no sirve para otro ISIN',()=>{
 const second={...quote,symbol:'QA.XETRA'};
 assert.equal(selectProductQuote([quote],isin),quote);assert.equal(selectProductQuote([quote,second],isin),null);assert.equal(selectProductQuote([quote,second],isin,second.symbol),second);
 assert.equal(selectProductQuote([quote],'ZZ0000000002',quote.symbol),null);assert.equal(selectProductQuote([quote],isin,'STALE.US'),null);
});
test('clasifica acciones, ETF y fondos por el tipo declarado por el proveedor',()=>{
 for(const [raw,kind] of [['Common Stock','acción'],['Preferred Stock','acción'],['ETF','etf'],['Fund','fondo'],['FUND','fondo'],['Mutual Fund','fondo'],['Index','otro'],[null,'otro']]){
  assert.equal(marketKind(raw),kind);
  const rows=normalizeQuotes([{ISIN:isin,Name:quote.name,Code:'QA',Exchange:'EUFUND',Currency:'EUR',Type:raw,previousClose:quote.price,previousCloseDate:quote.date}],isin,today);
  assert.equal(rows[0].kind,kind);
 }
});
