import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculatePortfolio, validateLedger, sortedTransactions } from '../src/lib/portfolio.ts';
const a = {id:'a',name:'Activo de prueba',isin:'IE00BYX5NX33',kind:'fondo',category:'global',color:'#008f85',explanation:'',risk:'',price:10.15,priceDate:'2026-10-28',quoteSource:'demo',currency:'EUR'};
const b = {...a,id:'b',price:5.78,isin:'IE00B3WJKG14'};
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≠ ${expected}`);

test('la demo de 72 € separa capital, valor y ganancias ficticias',()=>{
  const txs=[{id:'1',instrumentId:'a',type:'BUY',date:'2026-10-20',amount:60,units:6,fee:0},{id:'2',instrumentId:'b',type:'BUY',date:'2026-10-20',amount:12,units:2,fee:0}];
  assert.equal(validateLedger(txs,[a,b],'2026-10-29'),null);
  const r=calculatePortfolio([a,b],txs);
  near(r.marketValue,72.46);near(r.netCashContributed,72);near(r.totalPnL,.46);near(r.unrealizedPnL,.46);near(r.realizedPnL,0);
});

test('coste medio, venta parcial, dividendo y comisiones no duplican ganancias',()=>{
  const asset={...a,price:12};
  const txs=[
    {id:'3',instrumentId:'a',type:'SELL',date:'2026-10-22',amount:78,units:6,fee:2},
    {id:'4',instrumentId:'a',type:'DIVIDEND',date:'2026-10-25',amount:3,units:0,fee:0},
    {id:'2',instrumentId:'a',type:'BUY',date:'2026-10-21',amount:50,units:5,fee:0},
    {id:'1',instrumentId:'a',type:'BUY',date:'2026-10-20',amount:100,units:10,fee:1},
  ];
  assert.equal(validateLedger(txs,[asset],'2026-10-29'),null);
  const r=calculatePortfolio([asset],txs);const h=r.holdings[0];
  near(h.units,9);near(h.costBasis,90.6);near(h.averageCost,90.6/9);
  near(h.realizedPnL,15.6);near(h.unrealizedPnL,17.4);near(h.dividendsCash,3);
  near(r.totalPnL,36);near(r.realizedPnL,18.6);near(r.netCashContributed,72);
  near(r.marketValue,108);near(r.marketValue-r.netCashContributed,r.totalPnL);
});

test('impide vender antes de comprar aunque la edición sea retroactiva',()=>{
  const txs=[{id:'s',instrumentId:'a',type:'SELL',date:'2026-10-19',amount:50,units:5,fee:0},{id:'b',instrumentId:'a',type:'BUY',date:'2026-10-20',amount:60,units:6,fee:0}];
  assert.match(validateLedger(txs,[a],'2026-10-29'),/vender más/i);
});

test('impide sobreventa, comisiones absurdas, fechas imposibles e importes NaN',()=>{
  const tx={id:'1',instrumentId:'a',type:'BUY',date:'2026-10-20',amount:100,units:10,fee:0};
  const sell={id:'2',instrumentId:'a',type:'SELL',date:'2026-10-21',amount:150,units:11,fee:0};
  assert.match(validateLedger([tx,sell],[a],'2026-10-29'),/vender más/i);
  assert.match(validateLedger([tx,{...sell,units:1,fee:151}],[a],'2026-10-29'),/comisión/i);
  assert.match(validateLedger([{...tx,date:'2026-02-30'}],[a],'2026-10-29'),/fecha/i);
  assert.match(validateLedger([{...tx,amount:NaN}],[a],'2026-10-29'),/importe/i);
  assert.match(validateLedger([{...tx,type:'UNKNOWN'}],[a],'2026-10-29'),/Tipo de operación/i);
});

test('ventas totales no dejan coste residual y los dividendos computan',()=>{
  const asset={...a,price:10};
  const txs=[{id:'1',instrumentId:'a',type:'BUY',date:'2026-10-20',amount:99,units:10,fee:1},{id:'2',instrumentId:'a',type:'SELL',date:'2026-10-21',amount:120,units:10,fee:1},{id:'3',instrumentId:'a',type:'DIVIDEND',date:'2026-10-22',amount:2,units:0,fee:0}];
  const h=calculatePortfolio([asset],txs).holdings[0];
  near(h.units,0);near(h.costBasis,0);near(h.realizedPnL,19);near(h.totalPnL,21);
});

test('compraventa en la misma fecha sigue orden documentado',()=>{
  const txs=[{id:'a',instrumentId:'a',type:'SELL',date:'2026-10-20',amount:10,units:1,fee:0},{id:'b',instrumentId:'a',type:'BUY',date:'2026-10-20',amount:10,units:1,fee:0}];
  assert.deepEqual(sortedTransactions(txs).map(t=>t.type),['BUY','SELL']);
  assert.equal(validateLedger(txs,[a],'2026-10-29'),null);
});


test('rechaza operaciones malformadas antes de ordenar el libro', () => {
  for (const txs of [[null], [null, null], [{id: 7}], [{id:'x', date: 12, instrumentId:'a'}]]) {
    assert.match(validateLedger(txs, [a]), /incorrectos/i);
  }
});
test('los identificadores heredados no permiten ventas sin compras', () => {
  for (const id of ['__proto__', 'constructor', 'toString']) {
    const asset = {...a, id};
    const sell = {id:'sell',instrumentId:id,type:'SELL',date:'2026-10-20',amount:10,units:1,fee:0};
    assert.match(validateLedger([sell],[asset]), /vender más/i);
  }
});
