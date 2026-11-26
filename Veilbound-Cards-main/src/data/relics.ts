import type { RelicDef } from '../types/game';

export const RELICS: Record<string, RelicDef> = {
  ashen_signet: {
    id: 'ashen_signet',
    name: 'Ashen Signet',
    rarity: 'starter',
    characterId: 'vaelen',
    description: 'At the start of combat, gain 5 Block and apply 2 Burn to all enemies.',
  },
  blight_alembic: {
    id: 'blight_alembic',
    name: 'Blight Alembic',
    rarity: 'starter',
    characterId: 'morwen',
    description: 'Whenever you apply Poison, apply +1 additional Poison.',
  },
  veil_lantern: {
    id: 'veil_lantern',
    name: 'Veil Lantern',
    rarity: 'starter',
    characterId: 'kaelith',
    description: 'The first card you play each combat costs 0 Energy and draws 1 card.',
  },
  thornwind_quiver: {
    id: 'thornwind_quiver',
    name: 'Thornwind Quiver',
    rarity: 'starter',
    characterId: 'sylvarin',
    description: 'Your first Ranged or AoE attack each turn deals +3 damage and applies 1 Marked.',
  },
  astral_astrolabe: {
    id: 'astral_astrolabe',
    name: 'Astral Astrolabe',
    rarity: 'starter',
    characterId: 'vesperis',
    description: 'Every 3rd Skill or Ritual played in combat grants +1 Energy.',
  },
  ironclad_aegis: {
    id: 'ironclad_aegis',
    name: 'Ironclad Aegis',
    rarity: 'starter',
    characterId: 'orin',
    description: 'Start combat with 7 Block and 2 Thorns.',
  },
  hollow_censer: {
    id: 'hollow_censer',
    name: 'Hollow Censer',
    rarity: 'starter',
    characterId: 'nyx',
    description: 'Start combat by summoning a Hollow Wraith (2t) and applying 1 Weak to all foes.',
  },
  fletchers_sight: {
    id: 'fletchers_sight',
    name: "Fletcher's Eagle Sight",
    rarity: 'uncommon',
    description: 'All Ranged attacks deal +2 damage and ignore 50% of enemy Block.',
  },
  chronicle_quill: {
    id: 'chronicle_quill',
    name: 'Chronicle Quill',
    rarity: 'rare',
    description: 'Whenever you schedule a Ritual, also gain 4 Block and draw 1 card.',
  },
  bastion_standard: {
    id: 'bastion_standard',
    name: 'Bastion Battle Standard',
    rarity: 'uncommon',
    description: 'Companions act with +1 Turn duration when summoned and grant 3 Block.',
  },
  phantom_bell: {
    id: 'phantom_bell',
    name: 'Phantom Tolling Bell',
    rarity: 'boss',
    description: 'At the start of Turn 1 and Turn 3, apply 2 Vulnerable and 2 Bleed to all enemies.',
  },
  iron_rosary: {
    id: 'iron_rosary',
    name: 'Iron Rosary',
    rarity: 'common',
    description: 'At the start of each combat, gain 1 Strength.',
  },
  ember_phylactery: {
    id: 'ember_phylactery',
    name: 'Ember Phylactery',
    rarity: 'common',
    description: 'Heal 6 HP whenever you win a combat encounter.',
  },
  cartographers_astrolabe: {
    id: 'cartographers_astrolabe',
    name: "Wayfarer's Astrolabe",
    rarity: 'uncommon',
    description: 'Reveals hidden sanctuary paths on the expedition map and grants +15 Gold on pickup.',
  },
  blood_chalice: {
    id: 'blood_chalice',
    name: 'Chalice of Penance',
    rarity: 'uncommon',
    description: 'Whenever you Exhaust a card, gain 3 Block and 1 Energy (once per turn).',
  },
  bone_flute: {
    id: 'bone_flute',
    name: 'Ossuary Flute',
    rarity: 'uncommon',
    description: 'Summoned Companions act immediately upon being summoned.',
  },
  snare_toolkit: {
    id: 'snare_toolkit',
    name: 'Trapmaker Kit',
    rarity: 'uncommon',
    description: 'Whenever one of your Traps triggers, gain 4 Block and deal +3 bonus damage.',
  },
  mirror_buckler: {
    id: 'mirror_buckler',
    name: 'Reaction Buckler',
    rarity: 'uncommon',
    description: 'Start each combat with 1 Ward and +3 counter damage on Reactions.',
  },
  stance_medallion: {
    id: 'stance_medallion',
    name: 'Medallion of Shifting Form',
    rarity: 'rare',
    description: 'Whenever you enter a non-neutral Stance, gain 4 Block and draw 1 card.',
  },
  curse_reliquary: {
    id: 'curse_reliquary',
    name: 'Pact Reliquary',
    rarity: 'rare',
    description: 'Start combat with +1 Strength for every Curse card in your deck.',
  },
  sunless_crown: {
    id: 'sunless_crown',
    name: 'Fragment of the Ashen Crown',
    rarity: 'rare',
    description: 'Gain +1 Max Energy during the first two turns of every combat.',
  },
  warden_plate: {
    id: 'warden_plate',
    name: "Warden's Plate",
    rarity: 'boss',
    description: 'Retain up to 10 Block between turns.',
  },
  thorn_halo: {
    id: 'thorn_halo',
    name: 'Crown of Briars',
    rarity: 'rare',
    description: 'Start every combat with 3 Thorns.',
  },
  merchants_ledger: {
    id: 'merchants_ledger',
    name: "Guild's Ledger",
    rarity: 'common',
    description: 'All Merchant Shop prices are reduced by 25%.',
  },
  // Faction-affiliated & Trophy Relics
  penitent_censer: {
    id: 'penitent_censer',
    name: 'Penitent Censer',
    rarity: 'rare',
    description: 'At the start of combat, apply 2 Burn and 1 Vulnerable to all enemies.',
  },
  tidal_chime: {
    id: 'tidal_chime',
    name: 'Chime of the Drowned',
    rarity: 'rare',
    description: 'Start combat with 1 Ward and +6 Block.',
  },
  spore_seal: {
    id: 'spore_seal',
    name: 'Mycelial Seal',
    rarity: 'rare',
    description: 'Start combat with 3 Poison on all enemies and heal 4 HP on win.',
  },
  abyssal_signet: {
    id: 'abyssal_signet',
    name: 'Sunken Crown Signet',
    rarity: 'rare',
    description: 'Gain +2 Thorns and +5 Block at the start of every combat.',
  },
  bastion_buckler: {
    id: 'bastion_buckler',
    name: 'Highland Bastion Crest',
    rarity: 'rare',
    description: 'Start every combat with 8 Block and 1 Strength.',
  },
  archivist_monocle: {
    id: 'archivist_monocle',
    name: "Archivist's Monocle",
    rarity: 'rare',
    description: 'Reveals Hidden Branches and draws 1 extra card on Turn 1.',
  },
  eclipse_brand: {
    id: 'eclipse_brand',
    name: 'Brand of the Eclipse',
    rarity: 'boss',
    description: 'Start combat with +2 Strength and +1 Burn to all foes.',
  },
  gnarlmaw_heart: {
    id: 'gnarlmaw_heart',
    name: 'Heart of Gnarlmaw',
    rarity: 'boss',
    description: 'Legendary Trophy: Start combat with +3 Thorns and heal 6 HP after combat.',
  },
  pale_compass: {
    id: 'pale_compass',
    name: 'Pale Cartographer Compass',
    rarity: 'boss',
    description: 'Secret Trophy: Draw +1 card on Turn 1 and gain +1 Energy on Turn 1.',
  },
  seraph_feather: {
    id: 'seraph_feather',
    name: 'Hollowed Seraph Pinion',
    rarity: 'boss',
    description: 'Secret Trophy: Start combat with 2 Ward and +1 Strength.',
  },
};

export function getRelicDef(id: string): RelicDef | undefined {
  return RELICS[id];
}

export function getCollectibleRelicIds(): string[] {
  return Object.values(RELICS)
    .filter((r) => r.rarity !== 'starter' && r.rarity !== 'boss')
    .map((r) => r.id);
}

export function getBossRelicIds(): string[] {
  return Object.values(RELICS)
    .filter((r) => r.rarity === 'boss')
    .map((r) => r.id);
}
