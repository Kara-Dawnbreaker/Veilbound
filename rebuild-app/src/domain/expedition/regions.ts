import type { RegionDefinition, RegionId } from './types';

export const REGIONS: readonly RegionDefinition[] = [
  {
    id: 'ashen-marches',
    name: 'The Ashen Marches',
    subtitle: 'Where the old kingdom burned',
    description: 'A wind-scoured frontier of ruined watchtowers, blackened roads and restless things beneath the ash.',
    baseEnemyTier: 1,
    mapRows: 5
  }
] as const;

export function getRegion(regionId: string): RegionDefinition | undefined {
  return REGIONS.find((region) => region.id === regionId);
}

export function isRegionId(value: string): value is RegionId {
  return REGIONS.some((region) => region.id === value);
}
