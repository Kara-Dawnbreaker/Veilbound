/**
 * Controlled procedural expedition map generator.
 * Produces a seeded, valid, fully reachable branching DAG for each region across 17 location types,
 * including Crossroads junctions, Hidden branches, regional encounter weights, and anti-repetition rules.
 */

import { getLegendaryEnemiesForRegion, getSecretBossForRegion } from '../data/enemies';
import { getRegionPrimaryFaction, RARE_ENCOUNTERS } from '../data/factions';
import { getRegionDef } from '../data/regions';
import type {
  CombatModifierId,
  ExpeditionMap,
  MapNode,
  MapNodeType,
  RareEncounterId,
} from '../types/game';
import { SeededRNG } from './rng';

export interface NodeTypeMeta {
  label: string;
  description: string;
  dangerRating: 'Safe' | 'Low' | 'Moderate' | 'High' | 'Extreme';
  rewardPreview: string;
  secretConditionHint?: string;
}

const NODE_META: Record<MapNodeType, NodeTypeMeta> = {
  combat: {
    label: 'Skirmish',
    description: 'Patrolling creatures or faction scouts guarding the road ahead.',
    dangerRating: 'Moderate',
    rewardPreview: 'Gold · Soul Shards · Card Choice',
  },
  elite: {
    label: 'Elite Foe',
    description: 'A seasoned champion or apex terror stalking high-value ruins.',
    dangerRating: 'High',
    rewardPreview: 'High Gold · Relic · Higher Rare Card Odds',
  },
  boss: {
    label: 'Region Boss',
    description: 'The sovereign ruler of this realm. Defeat them to unlock new frontiers.',
    dangerRating: 'Extreme',
    rewardPreview: 'Boss Relic · Major Soul Shards · Region Victory',
  },
  shop: {
    label: 'Merchant',
    description: 'A hooded Veil peddler trading cards, Relics, tonics, and deck cleansing.',
    dangerRating: 'Safe',
    rewardPreview: 'Buy Cards & Relics · Heal · Remove Card',
  },
  rest: {
    label: 'Sanctum Fire',
    description: 'A sheltered brazier untouched by the mist where travelers mend steel and flesh.',
    dangerRating: 'Safe',
    rewardPreview: 'Heal 35% HP or Upgrade a Card',
  },
  treasure: {
    label: 'Treasure Chamber',
    description: 'An unplundered coffer sealed beneath fallen masonry.',
    dangerRating: 'Safe',
    rewardPreview: 'Gold · Relic or Bonus Card · Soul Shards',
  },
  event: {
    label: 'Story Event',
    description: 'An uncertain encounter where choices carry lasting rewards or costs.',
    dangerRating: 'Low',
    rewardPreview: 'Narrative Choice · Varied Outcomes',
  },
  hidden: {
    label: 'Hidden Vault',
    description: 'A concealed cache off the charted road, uncovered by Crossroads scouts or Cartographers.',
    dangerRating: 'Safe',
    rewardPreview: 'Rare Relic · Rich Gold · Soul Shards',
    secretConditionHint: 'Revealed via Crossroads, Blind Cartographer, or Astrolabe.',
  },
  shrine: {
    label: 'Ancient Shrine',
    description: 'A weathered monument humming with old oaths. Blessings demand deliberate trade-offs.',
    dangerRating: 'Low',
    rewardPreview: 'Max HP, Upgrades, or Relic for HP / Gold',
  },
  library: {
    label: 'Forgotten Library',
    description: 'Shelves of chained vellum preserving Rituals, Stances, Traps, and forgotten lore.',
    dangerRating: 'Safe',
    rewardPreview: 'Learn Specialized Card · Upgrade · Purge',
  },
  camp: {
    label: 'Abandoned Camp',
    description: 'Warm embers mark a hastily deserted bivouac. Supplies remain—though scavengers may return.',
    dangerRating: 'Low',
    rewardPreview: 'Scavenge Gold & Heal (Chance of Ambush)',
  },
  monster_den: {
    label: 'Monster Den',
    description: 'A swarming lair where beasts fight with fierce Thorns beside rich plunder.',
    dangerRating: 'High',
    rewardPreview: '+50% Gold · Bonus Shards · Card Choice',
  },
  stronghold: {
    label: 'Enemy Stronghold',
    description: 'Fortified enemy barricades (+6 starting Block & +1 Strength to foes).',
    dangerRating: 'Extreme',
    rewardPreview: 'Guaranteed Relic or Upgraded Card · High Shards',
  },
  companion: {
    label: 'Companion Encounter',
    description: 'A stray Veilbound spirit or construct seeking a summoner to bind its pact.',
    dangerRating: 'Safe',
    rewardPreview: 'Add Summoning Card · Strengthen Spirit Bond',
  },
  cursed_altar: {
    label: 'Cursed Altar',
    description: 'Dark obsidian slab offering forbidden power or Relics in exchange for a Curse or blood.',
    dangerRating: 'High',
    rewardPreview: 'Relic or Rare Power (Risk of Curse / HP Loss)',
  },
  challenge: {
    label: 'Challenge Node',
    description: 'Frenzied trial: enemies gain +2 Strength, while you begin Turn 1 with +1 Energy.',
    dangerRating: 'Extreme',
    rewardPreview: 'Double Shards · Upgraded Card · Relic Chance',
  },
  crossroads: {
    label: 'Crossroads',
    description: 'High vantage point where old survey markers reveal secret routes and grant supplies.',
    dangerRating: 'Safe',
    rewardPreview: 'Reveals Hidden Branches · Gold · Minor Heal',
  },
};

export function getNodeTypeMeta(type: MapNodeType): NodeTypeMeta {
  return NODE_META[type] ?? NODE_META.combat;
}

const DEFAULT_WEIGHTS: Partial<Record<MapNodeType, number>> = {
  combat: 24,
  event: 15,
  shop: 10,
  rest: 10,
  shrine: 8,
  library: 7,
  camp: 8,
  monster_den: 8,
  stronghold: 5,
  companion: 6,
  cursed_altar: 5,
  challenge: 5,
  treasure: 5,
  elite: 6,
};

function pickWeightedNodeType(
  weights: Partial<Record<MapNodeType, number>>,
  rng: SeededRNG,
  forbidden: Set<MapNodeType>
): MapNodeType {
  const entries = (Object.entries({ ...DEFAULT_WEIGHTS, ...weights }) as [MapNodeType, number][]).filter(
    ([type, weight]) => weight > 0 && !forbidden.has(type) && type !== 'boss' && type !== 'hidden' && type !== 'crossroads'
  );
  if (entries.length === 0) return 'combat';
  const total = entries.reduce((acc, [, w]) => acc + w, 0);
  let roll = rng.next() * total;
  for (const [type, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return entries[entries.length - 1][0];
}

function populateNodeEncounterData(
  node: MapNode,
  region: ReturnType<typeof getRegionDef>,
  rng: SeededRNG
): void {
  const meta = getNodeTypeMeta(node.type);
  node.label = meta.label;
  node.description = meta.description;
  node.dangerRating = meta.dangerRating;
  node.rewardPreview = meta.rewardPreview;
  node.secretConditionHint = meta.secretConditionHint;

  let modifier: CombatModifierId = 'none';
  if (node.type === 'combat') {
    node.encounterIds = rng.pick(region.ordinaryEncounterGroups);
  } else if (node.type === 'elite') {
    node.encounterIds = rng.pick(region.eliteEncounterGroups);
  } else if (node.type === 'monster_den') {
    const pool = region.denEncounterGroups?.length ? region.denEncounterGroups : region.ordinaryEncounterGroups;
    node.encounterIds = rng.pick(pool);
    modifier = 'monster_den';
  } else if (node.type === 'stronghold') {
    const pool = region.strongholdEncounterGroups?.length ? region.strongholdEncounterGroups : region.eliteEncounterGroups;
    node.encounterIds = rng.pick(pool);
    modifier = 'stronghold';
  } else if (node.type === 'challenge') {
    const pool = region.challengeEncounterGroups?.length ? region.challengeEncounterGroups : region.eliteEncounterGroups;
    node.encounterIds = rng.pick(pool);
    modifier = 'challenge_frenzy';
  } else if (node.type === 'boss') {
    node.encounterIds = region.bossEncounterGroup;
  } else if (node.type === 'event') {
    node.eventId = rng.pick(region.eventPoolIds);
  }
  if (modifier !== 'none') {
    node.combatModifier = modifier;
  }
  if (node.type === 'shop' || node.type === 'stronghold' || node.type === 'boss') {
    node.factionId = getRegionPrimaryFaction(region.id);
  }
}

export interface MapGenerationOptions {
  enableLegendary?: boolean;
  forceLegendary?: boolean;
  enableSecretBoss?: boolean;
}

export function generateExpeditionMap(
  regionId: string,
  seed: string,
  revealHiddenByDefault = false,
  options: MapGenerationOptions = {}
): ExpeditionMap {
  const region = getRegionDef(regionId);
  const rng = new SeededRNG(`${seed}:${regionId}`);
  const totalRows = Math.max(8, region.mapRows); // 8..10 rows: row 0 start .. row totalRows-1 boss

  const nodes: Record<string, MapNode> = {};
  const rowNodeIds: string[][] = [];

  // Row 0: 2 starting combat paths
  const startIds: string[] = [];
  for (let c = 0; c < 2; c++) {
    const id = `r0_c${c}`;
    const xPct = c === 0 ? 33 : 67;
    const node: MapNode = {
      id,
      row: 0,
      col: c,
      xPct,
      yPct: 90,
      type: 'combat',
      label: 'Vanguard Skirmish',
      connections: [],
      visited: false,
      revealed: true,
    };
    populateNodeEncounterData(node, region, rng);
    node.label = c === 0 ? 'West Vanguard' : 'East Vanguard';
    nodes[id] = node;
    startIds.push(id);
  }
  rowNodeIds.push(startIds);

  const middleRowCount = totalRows - 1;
  const crossroadsRow = Math.max(2, Math.floor(middleRowCount / 2) - 1);
  const milestoneRow = Math.min(middleRowCount - 2, crossroadsRow + 2);
  let prevRowTypes: Set<MapNodeType> = new Set(['combat']);

  // Middle rows: 1 .. totalRows - 2
  for (let r = 1; r < middleRowCount; r++) {
    const isPreBoss = r === middleRowCount - 1;
    const cols = isPreBoss ? 2 : r === crossroadsRow ? 3 : rng.int(2, 4);
    const ids: string[] = [];
    const yPct = 90 - (r / (totalRows - 1)) * 78;
    const currentRowTypes: Set<MapNodeType> = new Set();

    for (let c = 0; c < cols; c++) {
      const id = `r${r}_c${c}`;
      const baseX =
        cols === 2
          ? c === 0
            ? 32
            : 68
          : cols === 3
          ? c === 0
            ? 20
            : c === 1
            ? 50
            : 80
          : c === 0
          ? 16
          : c === 1
          ? 38
          : c === 2
          ? 62
          : 84;
      const jitterX = rng.int(-3, 3);

      let type: MapNodeType = 'combat';
      if (isPreBoss) {
        type = c === 0 ? 'rest' : 'shop';
      } else if (r === 1) {
        type = c === 0 ? 'event' : c === cols - 1 ? 'camp' : 'combat';
      } else if (r === crossroadsRow && c === 1) {
        type = 'crossroads';
      } else if (r === milestoneRow) {
        if (c === 0) type = 'elite';
        else if (c === 1) type = 'treasure';
        else if (c === 2) type = rng.next() < 0.5 ? 'shrine' : 'library';
        else type = 'rest';
      } else {
        const forbidden = new Set<MapNodeType>();
        // Avoid repeating same non-combat location type horizontally or on back-to-back rows
        for (const prev of prevRowTypes) {
          if (prev !== 'combat') forbidden.add(prev);
        }
        for (const cur of currentRowTypes) {
          if (cur !== 'combat') forbidden.add(cur);
        }
        // Keep elites/strongholds slightly deeper in the act
        if (r <= 1) {
          forbidden.add('elite');
          forbidden.add('stronghold');
          forbidden.add('challenge');
        }
        type = pickWeightedNodeType(region.nodeWeights ?? {}, rng, forbidden);
      }

      currentRowTypes.add(type);
      const node: MapNode = {
        id,
        row: r,
        col: c,
        xPct: Math.max(10, Math.min(90, baseX + jitterX)),
        yPct,
        type,
        label: '',
        connections: [],
        visited: false,
        revealed: true,
      };
      populateNodeEncounterData(node, region, rng);
      nodes[id] = node;
      ids.push(id);
    }
    prevRowTypes = currentRowTypes;
    rowNodeIds.push(ids);
  }

  // Final Boss row
  const bossId = `r${totalRows - 1}_boss`;
  const bossNode: MapNode = {
    id: bossId,
    row: totalRows - 1,
    col: 0,
    xPct: 50,
    yPct: 10,
    type: 'boss',
    label: 'Region Boss',
    connections: [],
    visited: false,
    revealed: true,
  };
  populateNodeEncounterData(bossNode, region, rng);
  nodes[bossId] = bossNode;
  rowNodeIds.push([bossId]);

  // Connect rows cleanly without messy edge crossings while ensuring every node is reachable
  for (let r = 0; r < rowNodeIds.length - 1; r++) {
    const currRow = rowNodeIds[r];
    const nextRow = rowNodeIds[r + 1];

    currRow.forEach((fromId, idx) => {
      const targetIdx = Math.min(
        nextRow.length - 1,
        Math.round((idx / Math.max(1, currRow.length - 1)) * (nextRow.length - 1))
      );
      const toId = nextRow[targetIdx];
      if (!nodes[fromId].connections.includes(toId)) {
        nodes[fromId].connections.push(toId);
      }
      if (nextRow.length > 1 && rng.next() < 0.58) {
        const altIdx = targetIdx + 1 < nextRow.length ? targetIdx + 1 : targetIdx - 1;
        const altId = nextRow[altIdx];
        if (altId && !nodes[fromId].connections.includes(altId)) {
          nodes[fromId].connections.push(altId);
        }
      }
    });

    // Guarantee every node in nextRow has at least one incoming connection
    nextRow.forEach((toId, nIdx) => {
      const hasIncoming = currRow.some((fromId) => nodes[fromId].connections.includes(toId));
      if (!hasIncoming) {
        const nearestFromIdx = Math.min(
          currRow.length - 1,
          Math.round((nIdx / Math.max(1, nextRow.length - 1)) * (currRow.length - 1))
        );
        nodes[currRow[nearestFromIdx]].connections.push(toId);
      }
    });
  }

  // Hidden Branch 1: Hidden Vault anchored off Crossroads row (or middle row)
  const branchRow1 = Math.min(crossroadsRow, middleRowCount - 2);
  const anchorRow1 = rowNodeIds[branchRow1];
  const rejoinRow1 = rowNodeIds[branchRow1 + 1];
  if (anchorRow1?.length && rejoinRow1?.length) {
    const anchorId = anchorRow1[anchorRow1.length - 1];
    const hiddenId = `r${branchRow1}_hidden_east`;
    const anchorNode = nodes[anchorId];
    const hiddenNode: MapNode = {
      id: hiddenId,
      row: branchRow1,
      col: 99,
      xPct: Math.min(93, Math.max(82, anchorNode.xPct + 12)),
      yPct: Math.max(18, anchorNode.yPct - 4.5),
      type: 'hidden',
      label: 'Hidden Vault',
      connections: [rejoinRow1[rejoinRow1.length - 1]],
      visited: false,
      revealed: revealHiddenByDefault,
      isHiddenBranch: true,
    };
    populateNodeEncounterData(hiddenNode, region, rng);
    nodes[hiddenId] = hiddenNode;
    anchorNode.connections.push(hiddenId);
  }

  // Hidden Branch 2 (for 9+ row regions or secondary side secret): Secret Shrine / Library / Cursed Altar off West flank
  const branchRow2 = Math.max(1, Math.min(milestoneRow - 1, middleRowCount - 3));
  const anchorRow2 = rowNodeIds[branchRow2];
  const rejoinRow2 = rowNodeIds[branchRow2 + 1];
  if (anchorRow2?.length && rejoinRow2?.length) {
    const anchorId2 = anchorRow2[0];
    const secretType: MapNodeType = rng.pick(['library', 'shrine', 'cursed_altar', 'companion']);
    const hiddenId2 = `r${branchRow2}_hidden_west`;
    const anchorNode2 = nodes[anchorId2];
    const hiddenNode2: MapNode = {
      id: hiddenId2,
      row: branchRow2,
      col: -1,
      xPct: Math.max(7, Math.min(18, anchorNode2.xPct - 12)),
      yPct: Math.max(18, anchorNode2.yPct - 4.5),
      type: secretType,
      label: '',
      connections: [rejoinRow2[0]],
      visited: false,
      revealed: revealHiddenByDefault,
      isHiddenBranch: true,
    };
    populateNodeEncounterData(hiddenNode2, region, rng);
    hiddenNode2.label = `Secret ${hiddenNode2.label}`;
    hiddenNode2.secretConditionHint = 'Hidden side-path unlocked via Crossroads or Cartographer.';
    nodes[hiddenId2] = hiddenNode2;
    anchorNode2.connections.push(hiddenId2);
  }

  // Rare Encounter tagging: upgrade one story event node into a Rare Encounter
  const eventNodes = Object.values(nodes).filter((n) => n.type === 'event' && !n.isHiddenBranch);
  if (eventNodes.length > 0 && rng.next() < 0.72) {
    const rareIds = Object.keys(RARE_ENCOUNTERS) as RareEncounterId[];
    const chosenEvent = rng.pick(eventNodes);
    const rareId = rng.pick(rareIds);
    const rareDef = RARE_ENCOUNTERS[rareId];
    chosenEvent.rareEncounterId = rareId;
    chosenEvent.factionId = rareDef.factionId;
    chosenEvent.label = rareDef.title;
    chosenEvent.description = rareDef.description;
    chosenEvent.rewardPreview = 'Rare Encounter · Faction Standing · Secret Leads';
  }

  // Legendary Creature Hunt: non-blocking optional apex encounter on a mid-late branch
  const spawnLegendary =
    options.enableLegendary !== false && (options.forceLegendary || rng.next() < 0.75);
  if (spawnLegendary) {
    const legendaryCandidates = getLegendaryEnemiesForRegion(regionId);
    const legendary = rng.pick(legendaryCandidates);
    const huntAnchorRowIdx = Math.min(milestoneRow, middleRowCount - 2);
    const huntAnchorRow = rowNodeIds[huntAnchorRowIdx];
    const huntRejoinRow = rowNodeIds[huntAnchorRowIdx + 1];
    if (huntAnchorRow?.length && huntRejoinRow?.length) {
      const anchor = nodes[huntAnchorRow[0]];
      const legId = `r${huntAnchorRowIdx}_legendary`;
      nodes[legId] = {
        id: legId,
        row: huntAnchorRowIdx,
        col: 98,
        xPct: Math.max(8, anchor.xPct - 10),
        yPct: Math.max(18, anchor.yPct - 4.5),
        type: 'elite',
        label: `Hunt: ${legendary.name}`,
        description: `${legendary.lore} (Optional Legendary Hunt)`,
        dangerRating: 'Extreme',
        rewardPreview: 'Trophy Relic · High Gold · Major Soul Shards',
        connections: [huntRejoinRow[0]],
        visited: false,
        revealed: true,
        isLegendary: true,
        factionId: legendary.factionId,
        encounterIds: [legendary.id],
        combatModifier: 'legendary_hunt',
      };
      anchor.connections.push(legId);
    }
  }

  // Optional Secret Boss Sanctum: hidden off the milestone row, rejoining the pre-boss row
  if (options.enableSecretBoss !== false) {
    const secretBoss = getSecretBossForRegion(regionId);
    const sbAnchorRowIdx = Math.min(milestoneRow, middleRowCount - 2);
    const sbAnchorRow = rowNodeIds[sbAnchorRowIdx];
    const preBossRow = rowNodeIds[middleRowCount - 1];
    if (sbAnchorRow?.length && preBossRow?.length) {
      const anchor = nodes[sbAnchorRow[sbAnchorRow.length - 1]];
      const sbId = `r${sbAnchorRowIdx}_secret_boss`;
      nodes[sbId] = {
        id: sbId,
        row: sbAnchorRowIdx,
        col: 100,
        xPct: Math.min(93, Math.max(82, anchor.xPct + 11)),
        yPct: Math.max(16, anchor.yPct - 5.5),
        type: 'elite',
        label: `Secret: ${secretBoss.name}`,
        description: `${secretBoss.lore} (Optional Secret Boss)`,
        dangerRating: 'Extreme',
        rewardPreview: 'Secret Trophy Relic · 45+ Shards · Faction Legend',
        secretConditionHint: 'Revealed via Rare Encounters, Crossroads, or Wayfarer Astrolabe.',
        connections: [preBossRow[preBossRow.length - 1]],
        visited: false,
        revealed: revealHiddenByDefault,
        isHiddenBranch: true,
        isSecretBoss: true,
        factionId: secretBoss.factionId,
        encounterIds: [secretBoss.id],
        combatModifier: 'secret_sanctum',
      };
      anchor.connections.push(sbId);
    }
  }

  return {
    regionId,
    seed,
    nodes,
    startNodeIds: startIds,
    bossNodeId: bossId,
    currentNodeId: null,
  };
}

export function getReachableNodeIds(map: ExpeditionMap): string[] {
  if (!map.currentNodeId) {
    return map.startNodeIds.filter((id) => map.nodes[id]?.revealed);
  }
  const current = map.nodes[map.currentNodeId];
  if (!current) return [];
  return current.connections.filter((id) => map.nodes[id] && map.nodes[id].revealed);
}

export function revealHiddenMapNodes(map: ExpeditionMap): ExpeditionMap {
  const nextNodes = { ...map.nodes };
  for (const id of Object.keys(nextNodes)) {
    if (nextNodes[id].isHiddenBranch && !nextNodes[id].revealed) {
      nextNodes[id] = { ...nextNodes[id], revealed: true };
    }
  }
  return { ...map, nodes: nextNodes };
}

export function revealSecretBossNode(map: ExpeditionMap): ExpeditionMap {
  const nextNodes = { ...map.nodes };
  for (const id of Object.keys(nextNodes)) {
    if (nextNodes[id].isSecretBoss && !nextNodes[id].revealed) {
      nextNodes[id] = { ...nextNodes[id], revealed: true };
    }
  }
  return { ...map, nodes: nextNodes };
}
