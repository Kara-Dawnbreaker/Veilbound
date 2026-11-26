import assert from 'node:assert/strict';
import test from 'node:test';
import { REGIONS } from '../data/regions';
import { generateExpeditionMap } from './mapGenerator';

function reachableFromStarts(map: ReturnType<typeof generateExpeditionMap>): Set<string> {
  const visited = new Set<string>();
  const queue = [...map.startNodeIds];
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = map.nodes[id];
    assert.ok(node, `missing map node ${id}`);
    for (const nextId of node.connections) {
      assert.ok(map.nodes[nextId], `dangling connection ${id} -> ${nextId}`);
      queue.push(nextId);
    }
  }
  return visited;
}

test('every region generates a connected map with a reachable boss', () => {
  for (const region of REGIONS) {
    for (const seed of ['ASHEN-001', 'VEIL-002', 'CROWN-003', 'MIST-004']) {
      const map = generateExpeditionMap(region.id, seed, true, {
        forceLegendary: true,
        enableSecretBoss: true,
      });
      const reached = reachableFromStarts(map);
      assert.ok(reached.has(map.bossNodeId), `${region.id} / ${seed}: boss is unreachable`);
      assert.equal(map.nodes[map.bossNodeId].type, 'boss');
      for (const node of Object.values(map.nodes)) {
        assert.ok(Number.isFinite(node.xPct) && node.xPct >= 0 && node.xPct <= 100);
        assert.ok(Number.isFinite(node.yPct) && node.yPct >= 0 && node.yPct <= 100);
      }
    }
  }
});

test('map generation is deterministic for the same region and seed', () => {
  for (const region of REGIONS) {
    const options = { forceLegendary: true, enableSecretBoss: true };
    const first = generateExpeditionMap(region.id, 'DETERMINISTIC', true, options);
    const second = generateExpeditionMap(region.id, 'DETERMINISTIC', true, options);
    assert.deepEqual(first, second);
  }
});

test('hidden branches reconnect to the main route', () => {
  for (const region of REGIONS) {
    const map = generateExpeditionMap(region.id, 'HIDDEN-PATHS', true, {
      forceLegendary: true,
      enableSecretBoss: true,
    });
    const reached = reachableFromStarts(map);
    const hiddenNodes = Object.values(map.nodes).filter((node) => node.isHiddenBranch);
    assert.ok(hiddenNodes.length > 0, `${region.id}: expected hidden branches`);
    for (const hidden of hiddenNodes) {
      assert.ok(reached.has(hidden.id), `${region.id}: hidden branch is unreachable`);
      assert.ok(hidden.connections.length > 0, `${region.id}: hidden branch does not reconnect`);
      assert.ok(hidden.connections.every((id) => Boolean(map.nodes[id])));
    }
  }
});
