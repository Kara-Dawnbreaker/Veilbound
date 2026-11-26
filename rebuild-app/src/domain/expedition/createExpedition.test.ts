import test from 'node:test';
import assert from 'node:assert/strict';
import { createExpedition } from './createExpedition';

test('creates a fresh expedition with selected hero and region', () => {
  const result = createExpedition({ heroId: 'vaelen', regionId: 'ashen-marches', seed: 'test-run' });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.expedition.heroId, 'vaelen');
  assert.equal(result.expedition.regionId, 'ashen-marches');
  assert.equal(result.expedition.currentNodeId, 'start');
  assert.deepEqual(result.expedition.visitedNodeIds, ['start']);
  assert.equal(result.expedition.status, 'active');
});

test('rejects unknown hero and region IDs', () => {
  assert.deepEqual(createExpedition({ heroId: 'unknown', regionId: 'ashen-marches', seed: 'x' }), { ok: false, error: 'unknown-hero' });
  assert.deepEqual(createExpedition({ heroId: 'vaelen', regionId: 'unknown', seed: 'x' }), { ok: false, error: 'unknown-region' });
});

test('empty seeds use a stable default', () => {
  const result = createExpedition({ heroId: 'nyx', regionId: 'ashen-marches', seed: '  ' });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.expedition.seed, 'veilbound-default');
});
