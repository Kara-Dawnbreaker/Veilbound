import { getHero } from './heroes';
import { getRegion } from './regions';
import { generateExpeditionMap } from './mapGenerator';
import type { DifficultyId, ExpeditionCreationError, ExpeditionState } from './types';

export type CreateExpeditionResult =
  | { ok: true; expedition: ExpeditionState }
  | { ok: false; error: ExpeditionCreationError };

export function createExpedition(input: {
  heroId: string;
  regionId: string;
  seed: string;
  difficultyId?: DifficultyId;
}): CreateExpeditionResult {
  const hero = getHero(input.heroId);
  if (!hero) return { ok: false, error: 'unknown-hero' };
  const region = getRegion(input.regionId);
  if (!region) return { ok: false, error: 'unknown-region' };

  const seed = input.seed.trim() || 'veilbound-default';
  const map = generateExpeditionMap(region, seed);
  return {
    ok: true,
    expedition: {
      id: `expedition-${seed}`,
      seed,
      heroId: hero.id,
      regionId: region.id,
      difficultyId: input.difficultyId ?? 'standard',
      map,
      currentNodeId: map.startNodeId,
      visitedNodeIds: [map.startNodeId],
      status: 'active'
    }
  };
}
