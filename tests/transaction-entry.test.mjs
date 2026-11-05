import assert from 'node:assert/strict';
import {test} from 'node:test';
import {executionPrice,preserveTransactionFx} from '../src/lib/transaction-entry.ts';
import {purchaseUnits} from '../src/lib/purchase-units.ts';
import {instrumentFromQuote} from '../src/lib/instrument-lookup.ts';
import {parsePortfolio} from '../src/lib/storage.ts';
import {calculatePortfolio,validateLedger} from '../src/lib/portfolio.ts';

const quote={isin:'IE00B4L5Y983',name:'ETF de prueba',symbol:'TEST.XETRA',currency:'EUR',price:30,date:'2026-10-29',source:'eodhd',kind:'etf'};
const asset=instrumentFromQuote(quote,quote.isin,'test');
const buy={id:'buy',instrumentId:asset.id,type:'BUY',date:'2026-10-20',amount:100,units:4,fee:1};

test('editar por importe conserva el precio ejecutado aunque la cotización haya cambiado',()=>{
 const price=executionPrice(buy.amount,buy.units);
 assert.equal(price,25);
 assert.notEqual(price,asset.price);
 assert.equal(purchaseUnits(buy.amount,price),buy.units);
 for(const [amount,units] of [[0,1],[1,0],[Infinity,1],[1,NaN],[-1,2]])assert.equal(executionPrice(amount,units),null);
});
test('una corrección de unidades conserva la evidencia de divisa y rechaza cambios incompatibles',()=>{
 const original={...buy,fx:{currency:'USD',amount:125,fee:1.25,eurPerUnit:0.8,date:buy.date,source:'Banco de prueba'}};
 const corrected=preserveTransactionFx({...buy,units:5},original);
 assert.deepEqual(corrected.fx,original.fx);
 assert.notEqual(corrected.fx,original.fx);
 for(const patch of [{amount:101},{fee:2},{date:'2026-10-21'},{type:'SELL'},{instrumentId:'different'}])
   assert.throws(()=>preserveTransactionFx({...buy,...patch},original),/conversión de divisa/);
 const restored=parsePortfolio(JSON.parse(JSON.stringify({version:2,demoMode:false,instruments:[asset],transactions:[corrected],completedLessons:[]})));
 assert.deepEqual(restored.transactions[0].fx,original.fx);
});
test('ficha → compra en euros → venta → dividendo → copia concilia unidades y resultados',()=>{
 const txs=[{...buy,units:purchaseUnits(100,25)},
  {id:'sell',instrumentId:asset.id,type:'SELL',date:'2026-10-21',amount:30,units:1,fee:0.5},
  {id:'div',instrumentId:asset.id,type:'DIVIDEND',date:'2026-10-22',amount:2,units:0,fee:0}];
 const restored=parsePortfolio(JSON.parse(JSON.stringify({version:2,demoMode:false,instruments:[asset],transactions:txs,completedLessons:[]})));
 const summary=calculatePortfolio(restored.instruments,restored.transactions);
 assert.equal(summary.holdings[0].units,3);
 assert.equal(summary.marketValue,90);
 assert.equal(summary.totalBuyCash,101);
 assert.equal(summary.totalSellCash,29.5);
 assert.equal(summary.totalPnL,20.5);
 assert.equal(summary.realizedPnL+summary.unrealizedPnL,20.5);
 assert.match(validateLedger([...txs,{...txs[1],id:'oversell',units:4}],restored.instruments),/No puedes vender/);
});
