import assert from 'node:assert/strict';
import {test} from 'node:test';
import {xirr,portfolioIrr,parseSnapshots} from '../src/lib/analytics.ts';
test('TIR ACT/365 recupera un 10% y distingue aportaciones de rentabilidad',()=>{
 const r=xirr([{date:'2025-01-01',amount:-100},{date:'2026-01-01',amount:110}]);assert.ok(Math.abs(r.rate-.1)<1e-8);
 assert.equal(xirr([{date:'2025-01-01',amount:-100},{date:'2025-01-02',amount:110}]).rate,null);
 assert.equal(xirr([{date:'2024-01-01',amount:-100},{date:'2025-01-01',amount:250},{date:'2026-01-01',amount:-160}]).rate,null);
});
test('TIR no utiliza valoraciones de distintas fechas o anteriores a movimientos',()=>{
 const state={demoMode:false,instruments:[{id:'a',kind:'fondo',price:11,priceDate:'2026-10-20',quoteSource:'manual'},{id:'b',kind:'fondo',price:11,priceDate:'2026-10-21',quoteSource:'manual'}],transactions:[{id:'1',instrumentId:'a',type:'BUY',date:'2025-01-01',amount:100,units:10,fee:0},{id:'2',instrumentId:'b',type:'BUY',date:'2025-01-01',amount:100,units:10,fee:0}]};assert.equal(portfolioIrr(state).rate,null);
 state.instruments[1].priceDate='2026-10-20';state.transactions[1].date='2026-10-21';assert.equal(portfolioIrr(state).rate,null);
});
test('historial rechaza fechas duplicadas, futuras y resultados que no concilian',()=>{
 const row={date:'2026-10-20',value:110,netContributed:100,result:10};assert.deepEqual(parseSnapshots([row]),[row]);assert.throws(()=>parseSnapshots([row,row]));assert.throws(()=>parseSnapshots([{...row,result:50}]));assert.throws(()=>parseSnapshots([{...row,date:'9999-01-01'}]));
});
