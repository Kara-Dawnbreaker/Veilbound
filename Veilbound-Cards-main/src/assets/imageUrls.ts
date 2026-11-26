/**
 * Vite-bundled ES imports for static key art and region backdrops.
 * Kept separate from src/data/* so Node/tsx CLI scripts can import game data cleanly.
 */

import titleKeyArtUrl from './images/title_key_art_1794584705726.jpg';
import ashenMarchesUrl from './images/region_ashen_marches_1794584706948.jpg';
import hollowwoodUrl from './images/region_hollowwood_1794590735230.jpg';
import sunkenReliquaryUrl from './images/region_sunken_reliquary_1794584706623.jpg';
import drownedKingdomUrl from './images/region_drowned_kingdom_1794590734082.jpg';
import shatteredHighlandsUrl from './images/region_shattered_highlands_1794590735615.jpg';
import veiledCatacombsUrl from './images/region_veiled_catacombs_1794590735220.jpg';
import obsidianSpireUrl from './images/region_obsidian_spire_1794584706440.jpg';

export const TITLE_KEY_ART_URL = titleKeyArtUrl;

export const REGION_BACKDROP_URLS: Record<string, string> = {
  ashen_marches: ashenMarchesUrl,
  hollowwood: hollowwoodUrl,
  sunken_reliquary: sunkenReliquaryUrl,
  drowned_kingdom: drownedKingdomUrl,
  shattered_highlands: shatteredHighlandsUrl,
  veiled_catacombs: veiledCatacombsUrl,
  obsidian_spire: obsidianSpireUrl,
};

export function getRegionBackdropUrl(regionId: string): string {
  return REGION_BACKDROP_URLS[regionId] ?? ashenMarchesUrl;
}
