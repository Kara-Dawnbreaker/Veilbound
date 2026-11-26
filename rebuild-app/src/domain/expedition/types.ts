export type HeroId = 'vaelen' | 'morwen' | 'kaelith' | 'sylvarin' | 'vesperis' | 'orin' | 'nyx';
export type RegionId = 'ashen-marches';
export type DifficultyId = 'standard' | 'penance' | 'eclipse';
export type MapNodeType = 'start' | 'combat' | 'elite' | 'event' | 'rest' | 'treasure' | 'boss';

export interface HeroDefinition {
  id: HeroId;
  name: string;
  title: string;
  archetype: string;
  summary: string;
  strengths: string[];
  weakness: string;
  startingHealth: number;
  startingEnergy: number;
}

export interface RegionDefinition {
  id: RegionId;
  name: string;
  subtitle: string;
  description: string;
  baseEnemyTier: number;
  mapRows: number;
}

export interface MapNode {
  id: string;
  row: number;
  lane: number;
  type: MapNodeType;
  nextNodeIds: string[];
}

export interface ExpeditionMap {
  seed: string;
  regionId: RegionId;
  startNodeId: string;
  bossNodeId: string;
  nodes: MapNode[];
}

export interface ExpeditionState {
  id: string;
  seed: string;
  heroId: HeroId;
  regionId: RegionId;
  difficultyId: DifficultyId;
  map: ExpeditionMap;
  currentNodeId: string;
  visitedNodeIds: string[];
  status: 'active' | 'victory' | 'defeat';
}

export type ExpeditionCreationError = 'unknown-hero' | 'unknown-region';
