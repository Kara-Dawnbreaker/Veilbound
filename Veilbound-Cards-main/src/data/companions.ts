import type { CompanionDef } from '../types/game';

export const COMPANIONS: Record<string, CompanionDef> = {
  cinder_hound: {
    id: 'cinder_hound',
    name: 'Cinder Hound',
    description: 'End of turn: Deals 5 damage to a random enemy and applies 2 Burn.',
    maxDuration: 3,
    color: '#D95B26',
    accentColor: '#F7B267',
    spriteShape: 'hound',
    actEffects: [
      { type: 'damage', amount: 5, targetMode: 'random_enemy' },
      { type: 'apply_status', target: 'random_enemy', status: 'burn', amount: 2 },
    ],
  },
  bone_construct: {
    id: 'bone_construct',
    name: 'Ossuary Sentinel',
    description: 'End of turn: Grants 6 Block and applies 1 Thorns.',
    maxDuration: 3,
    color: '#B8B2A6',
    accentColor: '#6C8EBF',
    spriteShape: 'construct',
    actEffects: [
      { type: 'block', amount: 6 },
      { type: 'apply_status', target: 'self', status: 'thorns', amount: 1 },
    ],
  },
  abyssal_wisp: {
    id: 'abyssal_wisp',
    name: 'Abyssal Wisp',
    description: 'End of turn: Applies 3 Poison to all enemies.',
    maxDuration: 3,
    color: '#349E8C',
    accentColor: '#8CE9D4',
    spriteShape: 'wisp',
    actEffects: [
      { type: 'apply_status', target: 'all_enemies', status: 'poison', amount: 3 },
    ],
  },
  veil_shade: {
    id: 'veil_shade',
    name: 'Veil Shade',
    description: 'End of turn: Deals 4 piercing damage to all enemies and applies 1 Bleed.',
    maxDuration: 2,
    color: '#7E57C2',
    accentColor: '#CE93D8',
    spriteShape: 'sentinel',
    actEffects: [
      { type: 'damage', amount: 4, targetMode: 'all_enemies', pierceBlock: true },
      { type: 'apply_status', target: 'all_enemies', status: 'bleed', amount: 1 },
    ],
  },
  storm_hawk: {
    id: 'storm_hawk',
    name: 'Galecrest Hawk',
    description: 'End of turn: Strikes a random enemy for 6 piercing ranged damage and applies 1 Marked.',
    maxDuration: 3,
    color: '#22C55E',
    accentColor: '#BEF264',
    spriteShape: 'hawk',
    actEffects: [
      { type: 'damage', amount: 6, targetMode: 'random_enemy', pierceBlock: true, attackRange: 'ranged' },
      { type: 'apply_status', target: 'random_enemy', status: 'cursed_mark', amount: 1 },
    ],
  },
  astral_familiar: {
    id: 'astral_familiar',
    name: 'Astral Familiar',
    description: 'End of turn: Deals 4 magic damage to all enemies and applies 2 Burn.',
    maxDuration: 3,
    color: '#38BDF8',
    accentColor: '#FDE047',
    spriteShape: 'familiar',
    actEffects: [
      { type: 'damage', amount: 4, targetMode: 'all_enemies', attackRange: 'magic' },
      { type: 'apply_status', target: 'all_enemies', status: 'burn', amount: 2 },
    ],
  },
  bastion_squire: {
    id: 'bastion_squire',
    name: 'Ironclad Squire',
    description: 'End of turn: Grants 7 Block and applies 2 Thorns.',
    maxDuration: 3,
    color: '#94A3B8',
    accentColor: '#F59E0B',
    spriteShape: 'squire',
    actEffects: [
      { type: 'block', amount: 7 },
      { type: 'apply_status', target: 'self', status: 'thorns', amount: 2 },
    ],
  },
  hollow_wraith: {
    id: 'hollow_wraith',
    name: 'Hollow Wraith',
    description: 'End of turn: Inflicts 1 Weak and 2 Bleed on all enemies.',
    maxDuration: 3,
    color: '#A855F7',
    accentColor: '#E879F9',
    spriteShape: 'sentinel',
    actEffects: [
      { type: 'apply_status', target: 'all_enemies', status: 'weak', amount: 1 },
      { type: 'apply_status', target: 'all_enemies', status: 'bleed', amount: 2 },
    ],
  },
};

export function getCompanionDef(id: string): CompanionDef {
  return COMPANIONS[id] ?? COMPANIONS.cinder_hound;
}
