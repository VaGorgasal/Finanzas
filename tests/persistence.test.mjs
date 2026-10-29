import assert from 'node:assert/strict';
import { test } from 'node:test';
import { persistJson } from '../src/lib/persistence.ts';

test('avisa si el navegador bloquea el almacenamiento o supera la cuota', () => {
  assert.equal(persistJson(() => { throw new Error('blocked'); }, 'key', {}), false);
  assert.equal(persistJson(() => ({setItem() { throw new Error('quota'); }}), 'key', {}), false);
});
test('guarda JSON sin alterar el contenido', () => {
  const calls = [];
  const state = {version:2, transactions:[]};
  assert.equal(persistJson(() => ({setItem: (...args) => calls.push(args)}), 'portfolio', state), true);
  assert.deepEqual(calls, [['portfolio', JSON.stringify(state)]]);
});
