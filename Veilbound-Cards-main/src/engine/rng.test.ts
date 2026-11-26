import assert from 'node:assert/strict';
import test from 'node:test';
import { SeededRNG } from './rng';

test('same seed produces the same sequence', () => {
  const a = new SeededRNG('veilbound-regression-seed');
  const b = new SeededRNG('veilbound-regression-seed');
  assert.deepEqual(Array.from({ length: 64 }, () => a.next()), Array.from({ length: 64 }, () => b.next()));
});

test('integer bounds are inclusive and never exceeded', () => {
  const rng = new SeededRNG(12345);
  for (let i = 0; i < 500; i++) {
    const value = rng.int(3, 7);
    assert.ok(value >= 3 && value <= 7);
  }
  assert.equal(rng.int(5, 5), 5);
});

test('pick rejects empty pools instead of returning undefined', () => {
  const rng = new SeededRNG('empty-pool');
  assert.throws(() => rng.pick([]), /non-empty collection/);
});

test('shuffle returns a permutation without mutating the source', () => {
  const source = [1, 2, 3, 4, 5];
  const copy = [...source];
  const shuffled = new SeededRNG('shuffle').shuffle(source);
  assert.deepEqual(source, copy);
  assert.deepEqual([...shuffled].sort(), copy);
});
