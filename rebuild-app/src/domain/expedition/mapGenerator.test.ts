import test from 'node:test';
import assert from 'node:assert/strict';
import { getRegion } from './regions';
import { generateExpeditionMap, getReachableNodes, validateExpeditionMap } from './mapGenerator';

const region = getRegion('ashen-marches')!;

test('same seed produces the same map', () => {
  assert.deepEqual(generateExpeditionMap(region, 'ember-17'), generateExpeditionMap(region, 'ember-17'));
});

test('different seeds can produce different encounter layouts', () => {
  const first = generateExpeditionMap(region, 'ember-17');
  const second = generateExpeditionMap(region, 'winter-42');
  assert.notDeepEqual(first.nodes.map((node) => node.type), second.nodes.map((node) => node.type));
});

test('all nodes are reachable and the boss is connected', () => {
  const map = generateExpeditionMap(region, 'marches-validation');
  assert.deepEqual(validateExpeditionMap(map), []);
  assert.equal(map.nodes.find((node) => node.id === map.bossNodeId)?.type, 'boss');
});

test('reachable-node lookup only returns direct next steps', () => {
  const map = generateExpeditionMap(region, 'route-test');
  const reachable = getReachableNodes(map, map.startNodeId);
  assert.equal(reachable.length, 3);
  assert.ok(reachable.every((node) => node.row === 1));
});

test('unknown current node has no reachable destinations', () => {
  const map = generateExpeditionMap(region, 'missing-node');
  assert.deepEqual(getReachableNodes(map, 'not-a-node'), []);
});
