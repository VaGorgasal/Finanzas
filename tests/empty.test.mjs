import assert from 'node:assert/strict';
import {test} from 'node:test';
import {makeEmptyPortfolio} from '../src/data/empty.ts';
test('la cartera inicial no contiene inversiones ni precios ficticios', () => {
  const state=makeEmptyPortfolio();
  assert.equal(state.demoMode,false);
  assert.deepEqual(state.instruments,[]);
  assert.deepEqual(state.transactions,[]);
});
test('las carteras de distintos usuarios no comparten listas', () => {
  const first=makeEmptyPortfolio(), second=makeEmptyPortfolio();
  first.completedLessons.push('lesson');
  assert.deepEqual(second.completedLessons,[]);
});
