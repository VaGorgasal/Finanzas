import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalizeQuotes} from '../src/lib/market.ts';
const isin='IE00BYX5NX33';
const row={ISIN:isin,Name:'Fondo',Code:'FUND',Exchange:'EUFUND',Currency:'EUR',previousClose:24.5,previousCloseDate:'2026-10-28'};
test('solo acepta la clase exacta, moneda EUR y precio fechado',()=>{
 assert.equal(normalizeQuotes([row],isin,'2026-10-29')[0].price,24.5);
 for(const change of [{ISIN:'US0378331005'},{Currency:'USD'},{previousClose:null},{previousClose:0},{previousClose:Infinity},{previousCloseDate:'2026-02-30'},{previousCloseDate:'2099-01-01'}]) assert.deepEqual(normalizeQuotes([{...row,...change}],isin,'2026-10-29'),[]);
});
test('deduplica mercados y rechaza respuestas inesperadas',()=>{
 assert.equal(normalizeQuotes([row,row],isin,'2026-10-29').length,1);
 assert.deepEqual(normalizeQuotes({error:'quota'},isin),[]);
});
