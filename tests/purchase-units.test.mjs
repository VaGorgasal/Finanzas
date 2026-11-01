import assert from 'node:assert/strict';
import {test} from 'node:test';
import {purchaseUnits} from '../src/lib/purchase-units.ts';
test('calcula unidades fraccionadas sin redondear a títulos enteros',()=>{
 assert.equal(purchaseUnits(100,25),4);
 assert.equal(purchaseUnits(60,25.5),60/25.5);
});
test('rechaza importes o precios vacíos, negativos, no finitos o unidades inferiores al mínimo',()=>{
 for(const [amount,price] of [[0,25],[100,0],[-1,25],[100,-1],[NaN,25],[100,Infinity],[Infinity,25],[1e-20,1],[1e308,1e-308]]) assert.equal(purchaseUnits(amount,price),null);
});
