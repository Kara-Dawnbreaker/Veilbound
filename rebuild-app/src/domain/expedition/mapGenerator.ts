import type { ExpeditionMap, MapNode, MapNodeType, RegionDefinition } from './types';

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: string): () => number {
  let state = hashSeed(seed) || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function chooseNodeType(row: number, rows: number, random: () => number): MapNodeType {
  if (row === rows) return 'boss';
  if (row === 1) return 'combat';
  const roll = random();
  if (row === 2) return roll < 0.68 ? 'combat' : 'event';
  if (row === 3) return roll < 0.34 ? 'rest' : roll < 0.68 ? 'combat' : 'treasure';
  if (row === 4) return roll < 0.38 ? 'elite' : roll < 0.7 ? 'event' : 'combat';
  return roll < 0.36 ? 'treasure' : roll < 0.68 ? 'rest' : 'combat';
}

/** Creates a reproducible, layered route. Every lane remains connected to the boss. */
export function generateExpeditionMap(region: RegionDefinition, seed: string): ExpeditionMap {
  const random = createRandom(seed);
  const nodes: MapNode[] = [];
  const startNodeId = 'start';
  const bossNodeId = `r${region.mapRows}-boss`;

  nodes.push({ id: startNodeId, row: 0, lane: 1, type: 'start', nextNodeIds: [] });

  for (let row = 1; row <= region.mapRows; row += 1) {
    const isBossRow = row === region.mapRows;
    const lanes = isBossRow ? [1] : [0, 1, 2];
    for (const lane of lanes) {
      const id = isBossRow ? bossNodeId : `r${row}-l${lane}`;
      nodes.push({
        id,
        row,
        lane,
        type: chooseNodeType(row, region.mapRows, random),
        nextNodeIds: []
      });
    }
  }

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const start = byId.get(startNodeId)!;
  start.nextNodeIds = [0, 1, 2].map((lane) => `r1-l${lane}`);

  for (let row = 1; row < region.mapRows; row += 1) {
    for (let lane = 0; lane < 3; lane += 1) {
      const node = byId.get(`r${row}-l${lane}`)!;
      if (row === region.mapRows - 1) {
        node.nextNodeIds = [bossNodeId];
        continue;
      }
      const next = new Set<number>([lane]);
      if (random() < 0.55) next.add(Math.max(0, lane - 1));
      if (random() < 0.55) next.add(Math.min(2, lane + 1));
      node.nextNodeIds = [...next].map((nextLane) => `r${row + 1}-l${nextLane}`);
    }
  }

  return { seed, regionId: region.id, startNodeId, bossNodeId, nodes };
}

export function getReachableNodes(map: ExpeditionMap, currentNodeId: string): MapNode[] {
  const current = map.nodes.find((node) => node.id === currentNodeId);
  if (!current) return [];
  const nextIds = new Set(current.nextNodeIds);
  return map.nodes.filter((node) => nextIds.has(node.id));
}

export function validateExpeditionMap(map: ExpeditionMap): string[] {
  const errors: string[] = [];
  const ids = new Set(map.nodes.map((node) => node.id));
  if (ids.size !== map.nodes.length) errors.push('Map contains duplicate node IDs.');
  if (!ids.has(map.startNodeId)) errors.push('Start node does not exist.');
  if (!ids.has(map.bossNodeId)) errors.push('Boss node does not exist.');

  for (const node of map.nodes) {
    for (const nextId of node.nextNodeIds) {
      const next = map.nodes.find((candidate) => candidate.id === nextId);
      if (!next) errors.push(`Node ${node.id} links to missing node ${nextId}.`);
      else if (next.row <= node.row) errors.push(`Route edge ${node.id} -> ${nextId} does not move forward.`);
    }
  }

  const visited = new Set<string>();
  const queue = [map.startNodeId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = map.nodes.find((candidate) => candidate.id === id);
    if (node) queue.push(...node.nextNodeIds);
  }
  if (!visited.has(map.bossNodeId)) errors.push('Boss is not reachable from the start.');
  for (const node of map.nodes) {
    if (!visited.has(node.id)) errors.push(`Node ${node.id} is unreachable from the start.`);
  }
  return errors;
}
