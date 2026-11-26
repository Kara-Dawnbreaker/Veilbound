import type { AttackRangeType, CardAcquisitionSource, CardDef } from '../types/game';
import { EXPANDED_SHARED_CARDS } from './cardsExpandedShared';
import { NEW_HERO_CARDS } from './cardsNewHeroes';

const BASE_CARDS: Record<string, CardDef> = {
  // =========================================================================
  // STARTER & SHARED CORE CARDS
  // =========================================================================
  strike: {
    id: 'strike',
    name: 'Iron Strike',
    category: 'attack',
    rarity: 'starter',
    cost: 1,
    characterPool: 'shared',
    needsTarget: true,
    animationStyle: 'slash',
    effects: [{ type: 'damage', amount: 6 }],
    description: 'Deal 6 damage.',
    upgraded: {
      name: 'Iron Strike +',
      effects: [{ type: 'damage', amount: 9 }],
      description: 'Deal 9 damage.',
    },
  },
  defend: {
    id: 'defend',
    name: 'Raised Guard',
    category: 'defense',
    rarity: 'starter',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'shield',
    effects: [{ type: 'block', amount: 5 }],
    description: 'Gain 5 Block.',
    upgraded: {
      name: 'Raised Guard +',
      effects: [{ type: 'block', amount: 8 }],
      description: 'Gain 8 Block.',
    },
  },
  pommel_bash: {
    id: 'pommel_bash',
    name: 'Pommel Bash',
    category: 'attack',
    rarity: 'common',
    cost: 1,
    characterPool: 'shared',
    needsTarget: true,
    animationStyle: 'slash',
    effects: [
      { type: 'damage', amount: 5 },
      { type: 'draw', amount: 1 },
    ],
    description: 'Deal 5 damage. Draw 1 card.',
    upgraded: {
      name: 'Pommel Bash +',
      effects: [
        { type: 'damage', amount: 8 },
        { type: 'draw', amount: 1 },
      ],
      description: 'Deal 8 damage. Draw 1 card.',
    },
  },
  iron_resolve: {
    id: 'iron_resolve',
    name: 'Iron Resolve',
    category: 'defense',
    rarity: 'common',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'ward',
    keywords: ['retain'],
    effects: [
      { type: 'block', amount: 7 },
      { type: 'apply_status', target: 'self', status: 'ward', amount: 1 },
    ],
    description: 'Retain. Gain 7 Block and 1 Ward.',
    upgraded: {
      name: 'Iron Resolve +',
      keywords: ['retain'],
      effects: [
        { type: 'block', amount: 10 },
        { type: 'apply_status', target: 'self', status: 'ward', amount: 2 },
      ],
      description: 'Retain. Gain 10 Block and 2 Ward.',
    },
  },
  twin_feint: {
    id: 'twin_feint',
    name: 'Twin Slash',
    category: 'attack',
    rarity: 'common',
    cost: 1,
    characterPool: 'shared',
    needsTarget: true,
    animationStyle: 'twin_slash',
    effects: [{ type: 'damage', amount: 4, hits: 2 }],
    description: 'Deal 4 damage twice.',
    upgraded: {
      name: 'Twin Slash +',
      effects: [{ type: 'damage', amount: 6, hits: 2 }],
      description: 'Deal 6 damage twice.',
    },
  },
  severing_blow: {
    id: 'severing_blow',
    name: 'Severing Blow',
    category: 'attack',
    rarity: 'common',
    cost: 1,
    characterPool: 'shared',
    needsTarget: true,
    animationStyle: 'heavy_cleave',
    effects: [
      { type: 'damage', amount: 7 },
      { type: 'apply_status', target: 'selected', status: 'vulnerable', amount: 2 },
    ],
    description: 'Deal 7 damage. Apply 2 Vulnerable.',
    upgraded: {
      name: 'Severing Blow +',
      effects: [
        { type: 'damage', amount: 10 },
        { type: 'apply_status', target: 'selected', status: 'vulnerable', amount: 3 },
      ],
      description: 'Deal 10 damage. Apply 3 Vulnerable.',
    },
  },
  rending_verdict: {
    id: 'rending_verdict',
    name: 'Executioner Edge',
    category: 'attack',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'shared',
    needsTarget: true,
    animationStyle: 'heavy_cleave',
    effects: [{ type: 'damage', amount: 8, critIfTargetVulnerable: true }],
    description: 'Deal 8 damage. Critical Hit (1.5×) if target is Vulnerable.',
    upgraded: {
      name: 'Executioner Edge +',
      effects: [{ type: 'damage', amount: 11, critIfTargetVulnerable: true }],
      description: 'Deal 11 damage. Critical Hit (1.5×) if target is Vulnerable.',
    },
  },
  weaken_gaze: {
    id: 'weaken_gaze',
    name: 'Dread Gaze',
    category: 'skill',
    rarity: 'common',
    cost: 1,
    characterPool: 'shared',
    needsTarget: true,
    animationStyle: 'shadow_spell',
    effects: [
      { type: 'apply_status', target: 'selected', status: 'weak', amount: 2 },
      { type: 'block', amount: 5 },
    ],
    description: 'Apply 2 Weak. Gain 5 Block.',
    upgraded: {
      name: 'Dread Gaze +',
      effects: [
        { type: 'apply_status', target: 'selected', status: 'weak', amount: 3 },
        { type: 'block', amount: 8 },
      ],
      description: 'Apply 3 Weak. Gain 8 Block.',
    },
  },
  arcane_weave: {
    id: 'arcane_weave',
    name: 'Spellblade Weave',
    category: 'attack',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'shared',
    needsTarget: true,
    animationStyle: 'shadow_spell',
    effects: [
      { type: 'damage', amount: 6 },
      {
        type: 'conditional',
        condition: 'if_last_card_category',
        cardCategory: 'attack',
        thenEffects: [
          { type: 'block', amount: 5 },
          { type: 'draw', amount: 1 },
        ],
      },
    ],
    description: 'Deal 6 damage. Chain (last card Attack): Gain 5 Block and draw 1 card.',
    upgraded: {
      name: 'Spellblade Weave +',
      effects: [
        { type: 'damage', amount: 9 },
        {
          type: 'conditional',
          condition: 'if_last_card_category',
          cardCategory: 'attack',
          thenEffects: [
            { type: 'block', amount: 7 },
            { type: 'draw', amount: 1 },
          ],
        },
      ],
      description: 'Deal 9 damage. Chain (last card Attack): Gain 7 Block and draw 1 card.',
    },
  },
  cinder_echo: {
    id: 'cinder_echo',
    name: 'Cinder Echo',
    category: 'skill',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'shared',
    needsTarget: true,
    animationStyle: 'fire_spell',
    keywords: ['echo'],
    effects: [
      { type: 'damage', amount: 5 },
      { type: 'apply_status', target: 'selected', status: 'burn', amount: 2 },
    ],
    description: 'Echo. Deal 5 damage and apply 2 Burn.',
    upgraded: {
      name: 'Cinder Echo +',
      keywords: ['echo'],
      effects: [
        { type: 'damage', amount: 7 },
        { type: 'apply_status', target: 'selected', status: 'burn', amount: 3 },
      ],
      description: 'Echo. Deal 7 damage and apply 3 Burn.',
    },
  },
  whetstone_rite: {
    id: 'whetstone_rite',
    name: 'Forge Temper',
    category: 'ritual',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'ritual',
    effects: [
      { type: 'upgrade_hand_cards', count: 1 },
      { type: 'block', amount: 5 },
    ],
    description: 'Upgrade a random card in your hand for this combat. Gain 5 Block.',
    upgraded: {
      name: 'Forge Temper +',
      effects: [
        { type: 'upgrade_hand_cards', count: -1 },
        { type: 'block', amount: 7 },
      ],
      description: 'Upgrade ALL cards in your hand for this combat. Gain 7 Block.',
    },
  },
  blood_tithe: {
    id: 'blood_tithe',
    name: 'Blood Tithe',
    category: 'ritual',
    rarity: 'uncommon',
    cost: 0,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'ritual',
    effects: [
      { type: 'lose_hp', amount: 3 },
      { type: 'gain_energy', amount: 2 },
      { type: 'draw', amount: 1 },
    ],
    description: 'Lose 3 HP. Gain 2 Energy and draw 1 card.',
    upgraded: {
      name: 'Blood Tithe +',
      effects: [
        { type: 'lose_hp', amount: 2 },
        { type: 'gain_energy', amount: 2 },
        { type: 'draw', amount: 2 },
      ],
      description: 'Lose 2 HP. Gain 2 Energy and draw 2 cards.',
    },
  },
  ossuary_construct: {
    id: 'ossuary_construct',
    name: 'Raise Sentinel',
    category: 'summoning',
    rarity: 'uncommon',
    cost: 2,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'summon',
    keywords: ['exhaust'],
    effects: [{ type: 'summon_companion', companionId: 'bone_construct', duration: 3 }],
    description: 'Exhaust. Summon an Ossuary Sentinel (grants 6 Block & 1 Thorns each turn for 3 turns).',
    upgraded: {
      name: 'Raise Sentinel +',
      cost: 1,
      keywords: ['exhaust'],
      effects: [{ type: 'summon_companion', companionId: 'bone_construct', duration: 4 }],
      description: 'Exhaust. Summon an Ossuary Sentinel for 4 turns.',
    },
  },
  pack_tactics: {
    id: 'pack_tactics',
    name: 'Veil Covenant',
    category: 'power',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'ritual',
    keywords: ['exhaust'],
    triggers: [
      {
        event: 'on_companion_summon',
        effects: [
          { type: 'block', amount: 5 },
          { type: 'apply_status', target: 'all_enemies', status: 'vulnerable', amount: 2 },
        ],
      },
    ],
    effects: [{ type: 'block', amount: 6 }],
    description:
      'Exhaust. Gain 6 Block. Power: Whenever you summon a Companion, gain 5 Block and apply 2 Vulnerable to all enemies.',
    upgraded: {
      name: 'Veil Covenant +',
      cost: 0,
      keywords: ['exhaust'],
      triggers: [
        {
          event: 'on_companion_summon',
          effects: [
            { type: 'block', amount: 7 },
            { type: 'apply_status', target: 'all_enemies', status: 'vulnerable', amount: 2 },
          ],
        },
      ],
      effects: [{ type: 'block', amount: 8 }],
      description: 'Exhaust. Gain 8 Block. Power: On Companion summon, gain 7 Block and apply 2 Vulnerable to all.',
    },
  },
  command_ally: {
    id: 'command_ally',
    name: 'Marshal Bond',
    category: 'skill',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'ritual',
    effects: [
      {
        type: 'conditional',
        condition: 'if_companion_active',
        thenEffects: [
          { type: 'trigger_companion_act' },
          { type: 'draw', amount: 1 },
        ],
        elseEffects: [{ type: 'block', amount: 6 }],
      },
    ],
    description: 'If a Companion is active, trigger its ability immediately and draw 1. Otherwise gain 6 Block.',
    upgraded: {
      name: 'Marshal Bond +',
      cost: 0,
      effects: [
        {
          type: 'conditional',
          condition: 'if_companion_active',
          thenEffects: [
            { type: 'trigger_companion_act' },
            { type: 'draw', amount: 2 },
          ],
          elseEffects: [{ type: 'block', amount: 9 }],
        },
      ],
      description: 'If a Companion is active, trigger its ability immediately and draw 2. Otherwise gain 9 Block.',
    },
  },
  chaos_transmute: {
    id: 'chaos_transmute',
    name: 'Crucible Shift',
    category: 'ritual',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'shadow_spell',
    effects: [
      { type: 'transform_random_hand', count: 1 },
      { type: 'draw', amount: 1 },
    ],
    description: 'Transform 1 random card in your hand into a different card for this combat. Draw 1.',
    upgraded: {
      name: 'Crucible Shift +',
      cost: 0,
      effects: [
        { type: 'transform_random_hand', count: 1 },
        { type: 'draw', amount: 2 },
      ],
      description: 'Transform 1 random card in your hand. Draw 2.',
    },
  },
  veil_siphon: {
    id: 'veil_siphon',
    name: 'Veil Siphon',
    category: 'attack',
    rarity: 'rare',
    cost: 2,
    characterPool: 'shared',
    needsTarget: true,
    animationStyle: 'shadow_spell',
    keywords: ['exhaust'],
    effects: [
      { type: 'damage', amount: 12, pierceBlock: true },
      { type: 'heal', amount: 5 },
    ],
    description: 'Exhaust. Deal 12 piercing damage. Restore 5 HP.',
    upgraded: {
      name: 'Veil Siphon +',
      keywords: ['exhaust'],
      effects: [
        { type: 'damage', amount: 16, pierceBlock: true },
        { type: 'heal', amount: 7 },
      ],
      description: 'Exhaust. Deal 16 piercing damage. Restore 7 HP.',
    },
  },
  crown_resonance: {
    id: 'crown_resonance',
    name: 'Ashen Benediction',
    category: 'ritual',
    rarity: 'mythic',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'ritual',
    keywords: ['innate', 'exhaust'],
    effects: [
      { type: 'apply_status', target: 'self', status: 'strength', amount: 2 },
      { type: 'gain_energy', amount: 1 },
      { type: 'draw', amount: 2 },
    ],
    description: 'Innate. Exhaust. Gain 2 Strength, 1 Energy, and draw 2 cards.',
    upgraded: {
      name: 'Ashen Benediction +',
      cost: 0,
      keywords: ['innate', 'exhaust'],
      effects: [
        { type: 'apply_status', target: 'self', status: 'strength', amount: 3 },
        { type: 'gain_energy', amount: 1 },
        { type: 'draw', amount: 2 },
      ],
      description: 'Innate. Exhaust. Gain 3 Strength, 1 Energy, and draw 2 cards.',
    },
  },
  spectral_aegis: {
    id: 'spectral_aegis',
    name: 'Spectral Aegis',
    category: 'defense',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'ward',
    effects: [
      {
        type: 'conditional',
        condition: 'if_block_gte',
        value: 1,
        thenEffects: [
          { type: 'block', amount: 10 },
          { type: 'draw', amount: 1 },
        ],
        elseEffects: [{ type: 'block', amount: 7 }],
      },
    ],
    description: 'Gain 7 Block. If you already have Block, gain 10 Block and draw 1 instead.',
    upgraded: {
      name: 'Spectral Aegis +',
      effects: [
        {
          type: 'conditional',
          condition: 'if_block_gte',
          value: 1,
          thenEffects: [
            { type: 'block', amount: 14 },
            { type: 'draw', amount: 1 },
          ],
          elseEffects: [{ type: 'block', amount: 10 }],
        },
      ],
      description: 'Gain 10 Block. If you already have Block, gain 14 Block and draw 1 instead.',
    },
  },
  obsidian_lance: {
    id: 'obsidian_lance',
    name: 'Obsidian Lance',
    category: 'attack',
    rarity: 'uncommon',
    cost: 2,
    characterPool: 'shared',
    needsTarget: true,
    animationStyle: 'pierce',
    effects: [
      { type: 'damage', amount: 14, pierceBlock: true },
      { type: 'apply_status', target: 'selected', status: 'bleed', amount: 2 },
    ],
    description: 'Deal 14 damage ignoring enemy Block. Apply 2 Bleed.',
    upgraded: {
      name: 'Obsidian Lance +',
      effects: [
        { type: 'damage', amount: 19, pierceBlock: true },
        { type: 'apply_status', target: 'selected', status: 'bleed', amount: 3 },
      ],
      description: 'Deal 19 damage ignoring enemy Block. Apply 3 Bleed.',
    },
  },
  cinder_storm: {
    id: 'cinder_storm',
    name: 'Cinder Tempest',
    category: 'attack',
    rarity: 'rare',
    cost: 2,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'fire_spell',
    effects: [
      { type: 'damage', amount: 8, targetMode: 'all_enemies' },
      { type: 'apply_status', target: 'all_enemies', status: 'burn', amount: 3 },
    ],
    description: 'Deal 8 damage and apply 3 Burn to all enemies.',
    upgraded: {
      name: 'Cinder Tempest +',
      effects: [
        { type: 'damage', amount: 12, targetMode: 'all_enemies' },
        { type: 'apply_status', target: 'all_enemies', status: 'burn', amount: 5 },
      ],
      description: 'Deal 12 damage and apply 5 Burn to all enemies.',
    },
  },
  desperate_surge: {
    id: 'desperate_surge',
    name: 'Last Vigil',
    category: 'defense',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'ward',
    effects: [
      {
        type: 'conditional',
        condition: 'if_player_hp_below_pct',
        value: 50,
        thenEffects: [
          { type: 'block', amount: 12 },
          { type: 'heal', amount: 4 },
        ],
        elseEffects: [{ type: 'block', amount: 8 }],
      },
    ],
    description: 'Gain 8 Block. If below 50% HP, gain 12 Block and heal 4 HP instead.',
    upgraded: {
      name: 'Last Vigil +',
      effects: [
        {
          type: 'conditional',
          condition: 'if_player_hp_below_pct',
          value: 50,
          thenEffects: [
            { type: 'block', amount: 16 },
            { type: 'heal', amount: 6 },
          ],
          elseEffects: [{ type: 'block', amount: 11 }],
        },
      ],
      description: 'Gain 11 Block. If below 50% HP, gain 16 Block and heal 6 HP instead.',
    },
  },

  // =========================================================================
  // NEW SHARED CARDS: TRAPS, REACTIONS, STANCES, RITUALS, CURSE SYNERGIES
  // =========================================================================
  barbed_snare: {
    id: 'barbed_snare',
    name: 'Barbed Snare',
    category: 'trap',
    rarity: 'common',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'trap',
    effects: [
      {
        type: 'add_trap',
        trapId: 'barbed_snare',
        name: 'Barbed Snare',
        triggerOn: 'enemy_attack',
        damage: 7,
        status: 'bleed',
        statusAmount: 2,
        targetMode: 'attacker',
        charges: 1,
      },
    ],
    description: 'Trap. Trigger on next enemy attack: Deal 7 damage and apply 2 Bleed to the attacker.',
    upgraded: {
      name: 'Barbed Snare +',
      effects: [
        {
          type: 'add_trap',
          trapId: 'barbed_snare',
          name: 'Barbed Snare+',
          triggerOn: 'enemy_attack',
          damage: 11,
          status: 'bleed',
          statusAmount: 3,
          targetMode: 'attacker',
          charges: 1,
        },
      ],
      description: 'Trap. Trigger on next enemy attack: Deal 11 damage and apply 3 Bleed to the attacker.',
    },
  },
  iron_parry: {
    id: 'iron_parry',
    name: 'Iron Parry',
    category: 'reaction',
    rarity: 'common',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'reaction',
    effects: [
      { type: 'block', amount: 5 },
      {
        type: 'add_reaction',
        reactionId: 'iron_parry',
        name: 'Iron Parry',
        triggerOn: 'on_enemy_attack_after',
        counterDamage: 7,
        status: 'weak',
        statusAmount: 1,
      },
    ],
    description: 'Gain 5 Block. Reaction: Counter the next enemy attack this turn for 7 damage and 1 Weak.',
    upgraded: {
      name: 'Iron Parry +',
      effects: [
        { type: 'block', amount: 7 },
        {
          type: 'add_reaction',
          reactionId: 'iron_parry',
          name: 'Iron Parry+',
          triggerOn: 'on_enemy_attack_after',
          counterDamage: 10,
          status: 'weak',
          statusAmount: 2,
        },
      ],
      description: 'Gain 7 Block. Reaction: Counter the next enemy attack this turn for 10 damage and 2 Weak.',
    },
  },
  stance_bulwark: {
    id: 'stance_bulwark',
    name: 'Bastion Form',
    category: 'stance',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'stance',
    effects: [
      { type: 'enter_stance', stance: 'bulwark' },
      { type: 'block', amount: 6 },
    ],
    description: 'Stance: Iron Bulwark (+3 Block on Block gains, +2 Thorns/turn; -20% Attack dmg). Gain 6 Block.',
    upgraded: {
      name: 'Bastion Form +',
      cost: 0,
      effects: [
        { type: 'enter_stance', stance: 'bulwark' },
        { type: 'block', amount: 8 },
      ],
      description: 'Stance: Iron Bulwark (+3 Block on Block gains, +2 Thorns/turn; -20% Attack dmg). Gain 8 Block.',
    },
  },
  stance_wrath: {
    id: 'stance_wrath',
    name: 'Ashen Frenzy',
    category: 'stance',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'stance',
    effects: [
      { type: 'enter_stance', stance: 'wrath' },
      { type: 'draw', amount: 1 },
    ],
    description: 'Stance: Ashen Wrath (+35% Attack dmg & +1 Burn on hit; take +25% attack dmg). Draw 1 card.',
    upgraded: {
      name: 'Ashen Frenzy +',
      cost: 0,
      effects: [
        { type: 'enter_stance', stance: 'wrath' },
        { type: 'draw', amount: 1 },
      ],
      description: 'Stance: Ashen Wrath (+35% Attack dmg & +1 Burn on hit; take +25% attack dmg). Draw 1 card.',
    },
  },
  ashen_pendulum: {
    id: 'ashen_pendulum',
    name: 'Ashen Pendulum',
    category: 'ritual',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'ritual',
    keywords: ['exhaust'],
    effects: [
      {
        type: 'schedule_delayed',
        label: 'Ashen Pendulum',
        turns: 2,
        effects: [
          { type: 'damage', amount: 18, targetMode: 'all_enemies' },
          { type: 'block', amount: 10 },
        ],
      },
    ],
    description: 'Exhaust. Ritual (2 turns): At turn start, deal 18 damage to all enemies and gain 10 Block.',
    upgraded: {
      name: 'Ashen Pendulum +',
      keywords: ['exhaust'],
      effects: [
        {
          type: 'schedule_delayed',
          label: 'Ashen Pendulum+',
          turns: 2,
          effects: [
            { type: 'damage', amount: 25, targetMode: 'all_enemies' },
            { type: 'block', amount: 14 },
          ],
        },
      ],
      description: 'Exhaust. Ritual (2 turns): At turn start, deal 25 damage to all enemies and gain 14 Block.',
    },
  },
  curse_devourer: {
    id: 'curse_devourer',
    name: 'Absolution Rite',
    category: 'skill',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'ward',
    effects: [
      { type: 'block', amount: 5 },
      { type: 'purge_curses_in_hand', drawPerPurged: 1, blockPerPurged: 6, damagePerPurged: 8 },
    ],
    description: 'Gain 5 Block. Exhaust all Curses in hand: +6 Block, +8 AoE dmg & draw 1 per Curse purged.',
    upgraded: {
      name: 'Absolution Rite +',
      cost: 0,
      effects: [
        { type: 'block', amount: 7 },
        { type: 'purge_curses_in_hand', drawPerPurged: 1, blockPerPurged: 8, damagePerPurged: 11 },
      ],
      description: 'Gain 7 Block. Exhaust all Curses in hand: +8 Block, +11 AoE dmg & draw 1 per Curse purged.',
    },
  },
  hex_cleaver: {
    id: 'hex_cleaver',
    name: 'Hexborn Greatsword',
    category: 'attack',
    rarity: 'rare',
    cost: 1,
    characterPool: 'shared',
    needsTarget: true,
    animationStyle: 'heavy_cleave',
    effects: [
      { type: 'damage', amount: 8, scalingSource: 'curses_in_combat', scalingMultiplier: 5 },
    ],
    description: 'Deal 8 damage, plus +5 damage per Curse card in your draw, hand, or discard pile.',
    upgraded: {
      name: 'Hexborn Greatsword +',
      effects: [
        { type: 'damage', amount: 11, scalingSource: 'curses_in_combat', scalingMultiplier: 7 },
      ],
      description: 'Deal 11 damage, plus +7 damage per Curse card in your draw, hand, or discard pile.',
    },
  },
  awakening_blade: {
    id: 'awakening_blade',
    name: 'Dormant Relic Blade',
    category: 'attack',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'shared',
    needsTarget: true,
    animationStyle: 'slash',
    effects: [
      { type: 'damage', amount: 7 },
      { type: 'transform_self', intoCardId: 'awakened_greatsword', upgraded: false },
    ],
    description: 'Deal 7 damage. Transforms into Awakened Greatsword for the rest of this combat.',
    upgraded: {
      name: 'Dormant Relic Blade +',
      effects: [
        { type: 'damage', amount: 10 },
        { type: 'transform_self', intoCardId: 'awakened_greatsword', upgraded: true },
      ],
      description: 'Deal 10 damage. Transforms into Awakened Greatsword+ for the rest of this combat.',
    },
  },
  awakened_greatsword: {
    id: 'awakened_greatsword',
    name: 'Awakened Greatsword',
    category: 'attack',
    rarity: 'rare',
    cost: 1,
    characterPool: 'shared',
    needsTarget: true,
    animationStyle: 'heavy_cleave',
    effects: [
      { type: 'damage', amount: 14, critIfTargetVulnerable: true },
      { type: 'apply_status', target: 'selected', status: 'vulnerable', amount: 2 },
    ],
    description: 'Evolved Blade. Deal 14 damage (Crits Vulnerable targets) and apply 2 Vulnerable.',
    upgraded: {
      name: 'Awakened Greatsword +',
      effects: [
        { type: 'damage', amount: 18, critIfTargetVulnerable: true },
        { type: 'apply_status', target: 'selected', status: 'vulnerable', amount: 3 },
      ],
      description: 'Evolved Blade. Deal 18 damage (Crits Vulnerable targets) and apply 3 Vulnerable.',
    },
  },

  // =========================================================================
  // VAELEN — ASHBOUND KNIGHT EXCLUSIVE CARDS
  // =========================================================================
  ember_cleave: {
    id: 'ember_cleave',
    name: 'Ember Cleave',
    category: 'attack',
    rarity: 'starter',
    cost: 1,
    characterPool: 'vaelen',
    needsTarget: true,
    animationStyle: 'heavy_cleave',
    effects: [
      { type: 'damage', amount: 6 },
      { type: 'apply_status', target: 'selected', status: 'burn', amount: 3 },
    ],
    description: 'Deal 6 damage and apply 3 Burn.',
    upgraded: {
      name: 'Ember Cleave +',
      effects: [
        { type: 'damage', amount: 9 },
        { type: 'apply_status', target: 'selected', status: 'burn', amount: 5 },
      ],
      description: 'Deal 9 damage and apply 5 Burn.',
    },
  },
  cinder_guard: {
    id: 'cinder_guard',
    name: 'Cinder Guard',
    category: 'defense',
    rarity: 'starter',
    cost: 1,
    characterPool: 'vaelen',
    needsTarget: false,
    animationStyle: 'shield',
    effects: [
      { type: 'block', amount: 6 },
      { type: 'apply_status', target: 'self', status: 'thorns', amount: 2 },
    ],
    description: 'Gain 6 Block and 2 Thorns.',
    upgraded: {
      name: 'Cinder Guard +',
      effects: [
        { type: 'block', amount: 9 },
        { type: 'apply_status', target: 'self', status: 'thorns', amount: 3 },
      ],
      description: 'Gain 9 Block and 3 Thorns.',
    },
  },
  searing_riposte: {
    id: 'searing_riposte',
    name: 'Searing Riposte',
    category: 'attack',
    rarity: 'common',
    cost: 1,
    characterPool: 'vaelen',
    needsTarget: true,
    animationStyle: 'slash',
    effects: [
      {
        type: 'conditional',
        condition: 'if_enemy_intending_attack',
        thenEffects: [
          { type: 'damage', amount: 9 },
          { type: 'block', amount: 6 },
        ],
        elseEffects: [{ type: 'damage', amount: 7 }],
      },
    ],
    description: 'Deal 7 damage. If target intends to attack, deal 9 damage and gain 6 Block instead.',
    upgraded: {
      name: 'Searing Riposte +',
      effects: [
        {
          type: 'conditional',
          condition: 'if_enemy_intending_attack',
          thenEffects: [
            { type: 'damage', amount: 12 },
            { type: 'block', amount: 9 },
          ],
          elseEffects: [{ type: 'damage', amount: 10 }],
        },
      ],
      description: 'Deal 10 damage. If target intends to attack, deal 12 damage and gain 9 Block instead.',
    },
  },
  martyr_stance: {
    id: 'martyr_stance',
    name: 'Martyr Bastion',
    category: 'power',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'vaelen',
    needsTarget: false,
    animationStyle: 'ward',
    keywords: ['exhaust'],
    triggers: [
      {
        event: 'on_damage_taken',
        effects: [
          { type: 'apply_status', target: 'self', status: 'thorns', amount: 2 },
          { type: 'block', amount: 4 },
        ],
      },
    ],
    effects: [{ type: 'block', amount: 8 }],
    description: 'Exhaust. Gain 8 Block. Power: Whenever you lose HP, gain 2 Thorns and 4 Block.',
    upgraded: {
      name: 'Martyr Bastion +',
      cost: 0,
      keywords: ['exhaust'],
      triggers: [
        {
          event: 'on_damage_taken',
          effects: [
            { type: 'apply_status', target: 'self', status: 'thorns', amount: 3 },
            { type: 'block', amount: 6 },
          ],
        },
      ],
      effects: [{ type: 'block', amount: 10 }],
      description: 'Exhaust. Gain 10 Block. Power: Whenever you lose HP, gain 3 Thorns and 6 Block.',
    },
  },
  summon_cinder_hound: {
    id: 'summon_cinder_hound',
    name: 'Call Cinder Hound',
    category: 'summoning',
    rarity: 'uncommon',
    cost: 2,
    characterPool: 'vaelen',
    needsTarget: false,
    animationStyle: 'summon',
    keywords: ['exhaust'],
    effects: [{ type: 'summon_companion', companionId: 'cinder_hound', duration: 3 }],
    description: 'Exhaust. Summon a Cinder Hound (deals 5 dmg & 2 Burn each turn for 3 turns).',
    upgraded: {
      name: 'Call Cinder Hound +',
      cost: 1,
      keywords: ['exhaust'],
      effects: [{ type: 'summon_companion', companionId: 'cinder_hound', duration: 4 }],
      description: 'Exhaust. Summon a Cinder Hound for 4 turns.',
    },
  },
  pyre_bastion: {
    id: 'pyre_bastion',
    name: 'Pyre Bastion',
    category: 'defense',
    rarity: 'uncommon',
    cost: 2,
    characterPool: 'vaelen',
    needsTarget: false,
    animationStyle: 'shield',
    effects: [
      { type: 'block', amount: 14 },
      { type: 'apply_status', target: 'all_enemies', status: 'burn', amount: 3 },
    ],
    description: 'Gain 14 Block. Apply 3 Burn to all enemies.',
    upgraded: {
      name: 'Pyre Bastion +',
      effects: [
        { type: 'block', amount: 18 },
        { type: 'apply_status', target: 'all_enemies', status: 'burn', amount: 5 },
      ],
      description: 'Gain 18 Block. Apply 5 Burn to all enemies.',
    },
  },
  ash_execution: {
    id: 'ash_execution',
    name: 'Scorching Verdict',
    category: 'attack',
    rarity: 'rare',
    cost: 2,
    characterPool: 'vaelen',
    needsTarget: true,
    animationStyle: 'heavy_cleave',
    effects: [
      { type: 'damage', amount: 10, scalingStatus: 'burn', scalingSource: 'target', scalingMultiplier: 2 },
    ],
    description: 'Deal 10 damage, plus +2 damage per stack of Burn on the target.',
    upgraded: {
      name: 'Scorching Verdict +',
      effects: [
        { type: 'damage', amount: 12, scalingStatus: 'burn', scalingSource: 'target', scalingMultiplier: 3 },
      ],
      description: 'Deal 12 damage, plus +3 damage per stack of Burn on the target.',
    },
  },
  immolate_oath: {
    id: 'immolate_oath',
    name: 'Immolation Oath',
    category: 'ritual',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'vaelen',
    needsTarget: false,
    animationStyle: 'fire_spell',
    effects: [
      { type: 'exhaust_random_hand', count: 1 },
      { type: 'apply_status', target: 'all_enemies', status: 'burn', amount: 5 },
      { type: 'block', amount: 6 },
    ],
    description: 'Exhaust 1 random card in hand. Apply 5 Burn to all enemies and gain 6 Block.',
    upgraded: {
      name: 'Immolation Oath +',
      effects: [
        { type: 'exhaust_random_hand', count: 1 },
        { type: 'apply_status', target: 'all_enemies', status: 'burn', amount: 8 },
        { type: 'block', amount: 9 },
      ],
      description: 'Exhaust 1 random card in hand. Apply 8 Burn to all enemies and gain 9 Block.',
    },
  },
  furnace_heart: {
    id: 'furnace_heart',
    name: 'Furnace Heart',
    category: 'power',
    rarity: 'rare',
    cost: 1,
    characterPool: 'vaelen',
    needsTarget: false,
    animationStyle: 'ritual',
    keywords: ['exhaust'],
    triggers: [
      {
        event: 'on_block_gained',
        effects: [{ type: 'apply_status', target: 'random_enemy', status: 'burn', amount: 2 }],
      },
    ],
    effects: [{ type: 'apply_status', target: 'self', status: 'strength', amount: 1 }],
    description: 'Exhaust. Gain 1 Strength. Power: Whenever you gain Block this combat, apply 2 Burn to a random enemy.',
    upgraded: {
      name: 'Furnace Heart +',
      cost: 0,
      keywords: ['exhaust'],
      triggers: [
        {
          event: 'on_block_gained',
          effects: [{ type: 'apply_status', target: 'random_enemy', status: 'burn', amount: 3 }],
        },
      ],
      effects: [{ type: 'apply_status', target: 'self', status: 'strength', amount: 2 }],
      description: 'Exhaust. Gain 2 Strength. Power: Whenever you gain Block, apply 3 Burn to a random enemy.',
    },
  },
  cinder_mine: {
    id: 'cinder_mine',
    name: 'Cinder Mine',
    category: 'trap',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'vaelen',
    needsTarget: false,
    animationStyle: 'trap',
    effects: [
      {
        type: 'add_trap',
        trapId: 'cinder_mine',
        name: 'Cinder Mine',
        triggerOn: 'enemy_any_action',
        damage: 8,
        status: 'burn',
        statusAmount: 4,
        targetMode: 'all_enemies',
        charges: 1,
      },
    ],
    description: 'Trap. On next enemy action: Deal 8 damage and apply 4 Burn to ALL enemies.',
    upgraded: {
      name: 'Cinder Mine +',
      effects: [
        {
          type: 'add_trap',
          trapId: 'cinder_mine',
          name: 'Cinder Mine+',
          triggerOn: 'enemy_any_action',
          damage: 12,
          status: 'burn',
          statusAmount: 6,
          targetMode: 'all_enemies',
          charges: 1,
        },
      ],
      description: 'Trap. On next enemy action: Deal 12 damage and apply 6 Burn to ALL enemies.',
    },
  },
  retribution_ward: {
    id: 'retribution_ward',
    name: 'Aegis of Retribution',
    category: 'reaction',
    rarity: 'rare',
    cost: 1,
    characterPool: 'vaelen',
    needsTarget: false,
    animationStyle: 'reaction',
    effects: [
      { type: 'block', amount: 8 },
      {
        type: 'add_reaction',
        reactionId: 'retribution_ward',
        name: 'Aegis Counter',
        triggerOn: 'on_enemy_attack_before',
        block: 6,
        counterDamage: 6,
        status: 'burn',
        statusAmount: 3,
      },
    ],
    description: 'Gain 8 Block. Reaction: Before an enemy attacks, gain 6 Block, deal 6 dmg & apply 3 Burn.',
    upgraded: {
      name: 'Aegis of Retribution +',
      effects: [
        { type: 'block', amount: 11 },
        {
          type: 'add_reaction',
          reactionId: 'retribution_ward',
          name: 'Aegis Counter+',
          triggerOn: 'on_enemy_attack_before',
          block: 9,
          counterDamage: 9,
          status: 'burn',
          statusAmount: 4,
        },
      ],
      description: 'Gain 11 Block. Reaction: Before an enemy attacks, gain 9 Block, deal 9 dmg & apply 4 Burn.',
    },
  },
  ember_consecration: {
    id: 'ember_consecration',
    name: 'Ember Consecration',
    category: 'ritual',
    rarity: 'rare',
    cost: 1,
    characterPool: 'vaelen',
    needsTarget: false,
    animationStyle: 'ritual',
    keywords: ['exhaust'],
    effects: [
      { type: 'lose_hp', amount: 4 },
      {
        type: 'schedule_delayed',
        label: 'Ember Consecration',
        turns: 1,
        effects: [
          { type: 'apply_status', target: 'self', status: 'strength', amount: 2 },
          { type: 'block', amount: 12 },
          { type: 'apply_status', target: 'all_enemies', status: 'burn', amount: 4 },
        ],
      },
    ],
    description: 'Exhaust. Lose 4 HP. Ritual (1 turn): Gain 2 Strength, 12 Block, and 4 Burn to all enemies.',
    upgraded: {
      name: 'Ember Consecration +',
      keywords: ['exhaust'],
      effects: [
        { type: 'lose_hp', amount: 2 },
        {
          type: 'schedule_delayed',
          label: 'Ember Consecration+',
          turns: 1,
          effects: [
            { type: 'apply_status', target: 'self', status: 'strength', amount: 3 },
            { type: 'block', amount: 16 },
            { type: 'apply_status', target: 'all_enemies', status: 'burn', amount: 6 },
          ],
        },
      ],
      description: 'Exhaust. Lose 2 HP. Ritual (1 turn): Gain 3 Strength, 16 Block, and 6 Burn to all enemies.',
    },
  },

  // =========================================================================
  // MORWEN — BLIGHT ARCANIST EXCLUSIVE CARDS
  // =========================================================================
  mire_bolt: {
    id: 'mire_bolt',
    name: 'Mire Bolt',
    category: 'attack',
    rarity: 'starter',
    cost: 1,
    characterPool: 'morwen',
    needsTarget: true,
    animationStyle: 'poison_spell',
    effects: [
      { type: 'damage', amount: 5 },
      { type: 'apply_status', target: 'selected', status: 'poison', amount: 3 },
    ],
    description: 'Deal 5 damage and apply 3 Poison.',
    upgraded: {
      name: 'Mire Bolt +',
      effects: [
        { type: 'damage', amount: 7 },
        { type: 'apply_status', target: 'selected', status: 'poison', amount: 5 },
      ],
      description: 'Deal 7 damage and apply 5 Poison.',
    },
  },
  plague_flask: {
    id: 'plague_flask',
    name: 'Plague Flask',
    category: 'skill',
    rarity: 'starter',
    cost: 1,
    characterPool: 'morwen',
    needsTarget: false,
    animationStyle: 'poison_spell',
    effects: [
      { type: 'apply_status', target: 'all_enemies', status: 'poison', amount: 3 },
      { type: 'apply_status', target: 'all_enemies', status: 'weak', amount: 1 },
    ],
    description: 'Apply 3 Poison and 1 Weak to all enemies.',
    upgraded: {
      name: 'Plague Flask +',
      effects: [
        { type: 'apply_status', target: 'all_enemies', status: 'poison', amount: 5 },
        { type: 'apply_status', target: 'all_enemies', status: 'weak', amount: 2 },
      ],
      description: 'Apply 5 Poison and 2 Weak to all enemies.',
    },
  },
  soul_ward: {
    id: 'soul_ward',
    name: 'Soul Ward',
    category: 'defense',
    rarity: 'starter',
    cost: 1,
    characterPool: 'morwen',
    needsTarget: false,
    animationStyle: 'ward',
    effects: [
      { type: 'block', amount: 6 },
      { type: 'draw', amount: 1 },
    ],
    description: 'Gain 6 Block. Draw 1 card.',
    upgraded: {
      name: 'Soul Ward +',
      effects: [
        { type: 'block', amount: 9 },
        { type: 'draw', amount: 1 },
      ],
      description: 'Gain 9 Block. Draw 1 card.',
    },
  },
  summon_abyssal_wisp: {
    id: 'summon_abyssal_wisp',
    name: 'Conjure Abyssal Wisp',
    category: 'summoning',
    rarity: 'uncommon',
    cost: 2,
    characterPool: 'morwen',
    needsTarget: false,
    animationStyle: 'summon',
    keywords: ['exhaust'],
    effects: [{ type: 'summon_companion', companionId: 'abyssal_wisp', duration: 3 }],
    description: 'Exhaust. Summon an Abyssal Wisp (applies 3 Poison to all enemies each turn for 3 turns).',
    upgraded: {
      name: 'Conjure Abyssal Wisp +',
      cost: 1,
      keywords: ['exhaust'],
      effects: [{ type: 'summon_companion', companionId: 'abyssal_wisp', duration: 4 }],
      description: 'Exhaust. Summon an Abyssal Wisp for 4 turns.',
    },
  },
  catalytic_blight: {
    id: 'catalytic_blight',
    name: 'Catalytic Blight',
    category: 'attack',
    rarity: 'rare',
    cost: 1,
    characterPool: 'morwen',
    needsTarget: true,
    animationStyle: 'poison_spell',
    effects: [
      { type: 'damage', amount: 4, pierceBlock: true, scalingStatus: 'poison', scalingSource: 'target', scalingMultiplier: 2 },
      {
        type: 'conditional',
        condition: 'if_target_has_status',
        status: 'poison',
        thenEffects: [{ type: 'apply_status', target: 'selected', status: 'poison', amount: 3 }],
      },
    ],
    description: 'Deal 4 piercing damage +2 per Poison on target. If poisoned, apply 3 more Poison.',
    upgraded: {
      name: 'Catalytic Blight +',
      effects: [
        { type: 'damage', amount: 6, pierceBlock: true, scalingStatus: 'poison', scalingSource: 'target', scalingMultiplier: 3 },
        {
          type: 'conditional',
          condition: 'if_target_has_status',
          status: 'poison',
          thenEffects: [{ type: 'apply_status', target: 'selected', status: 'poison', amount: 4 }],
        },
      ],
      description: 'Deal 6 piercing damage +3 per Poison on target. If poisoned, apply 4 more Poison.',
    },
  },
  ossuary_wall: {
    id: 'ossuary_wall',
    name: 'Ossuary Bulwark',
    category: 'defense',
    rarity: 'common',
    cost: 2,
    characterPool: 'morwen',
    needsTarget: false,
    animationStyle: 'shield',
    effects: [
      { type: 'block', amount: 13 },
      { type: 'remove_status', target: 'self', status: 'debuffs' },
    ],
    description: 'Gain 13 Block and cleanse all debuffs from yourself.',
    upgraded: {
      name: 'Ossuary Bulwark +',
      effects: [
        { type: 'block', amount: 17 },
        { type: 'remove_status', target: 'self', status: 'debuffs' },
      ],
      description: 'Gain 17 Block and cleanse all debuffs from yourself.',
    },
  },
  alchemical_purge: {
    id: 'alchemical_purge',
    name: 'Alchemical Purge',
    category: 'skill',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'morwen',
    needsTarget: false,
    animationStyle: 'ritual',
    effects: [
      { type: 'exhaust_random_hand', count: 1 },
      { type: 'draw', amount: 2 },
      { type: 'gain_energy', amount: 1 },
    ],
    description: 'Exhaust 1 random card in hand. Draw 2 cards and gain 1 Energy.',
    upgraded: {
      name: 'Alchemical Purge +',
      cost: 0,
      effects: [
        { type: 'exhaust_random_hand', count: 1 },
        { type: 'draw', amount: 2 },
        { type: 'gain_energy', amount: 1 },
      ],
      description: 'Exhaust 1 random card in hand. Draw 2 cards and gain 1 Energy.',
    },
  },
  miasma_ritual: {
    id: 'miasma_ritual',
    name: 'Miasma Conduit',
    category: 'power',
    rarity: 'rare',
    cost: 1,
    characterPool: 'morwen',
    needsTarget: false,
    animationStyle: 'poison_spell',
    keywords: ['exhaust'],
    triggers: [
      {
        event: 'on_card_exhaust',
        effects: [
          { type: 'apply_status', target: 'all_enemies', status: 'poison', amount: 2 },
          { type: 'block', amount: 3 },
        ],
      },
    ],
    effects: [{ type: 'add_card', destination: 'hand', cardId: 'mire_bolt', count: 1 }],
    description: 'Exhaust. Add a Mire Bolt to hand. Power: Whenever a card is Exhausted, apply 2 Poison to all enemies and gain 3 Block.',
    upgraded: {
      name: 'Miasma Conduit +',
      cost: 0,
      keywords: ['exhaust'],
      triggers: [
        {
          event: 'on_card_exhaust',
          effects: [
            { type: 'apply_status', target: 'all_enemies', status: 'poison', amount: 3 },
            { type: 'block', amount: 5 },
          ],
        },
      ],
      effects: [{ type: 'add_card', destination: 'hand', cardId: 'mire_bolt', upgraded: true, count: 1 }],
      description: 'Exhaust. Add a Mire Bolt+ to hand. Power: Whenever a card is Exhausted, apply 3 Poison to all enemies and gain 5 Block.',
    },
  },
  venom_tripwire: {
    id: 'venom_tripwire',
    name: 'Venom Tripwire',
    category: 'trap',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'morwen',
    needsTarget: false,
    animationStyle: 'trap',
    effects: [
      {
        type: 'add_trap',
        trapId: 'venom_tripwire',
        name: 'Venom Tripwire',
        triggerOn: 'enemy_attack',
        damage: 5,
        status: 'poison',
        statusAmount: 4,
        targetMode: 'attacker',
        charges: 1,
      },
    ],
    description: 'Trap. On next enemy attack: Deal 5 damage and apply 4 Poison to the attacker.',
    upgraded: {
      name: 'Venom Tripwire +',
      effects: [
        {
          type: 'add_trap',
          trapId: 'venom_tripwire',
          name: 'Venom Tripwire+',
          triggerOn: 'enemy_attack',
          damage: 8,
          status: 'poison',
          statusAmount: 6,
          targetMode: 'attacker',
          charges: 1,
        },
      ],
      description: 'Trap. On next enemy attack: Deal 8 damage and apply 6 Poison to the attacker.',
    },
  },
  stance_alchemical: {
    id: 'stance_alchemical',
    name: 'Blight Focus',
    category: 'stance',
    rarity: 'rare',
    cost: 1,
    characterPool: 'morwen',
    needsTarget: false,
    animationStyle: 'stance',
    effects: [
      { type: 'enter_stance', stance: 'alchemical' },
      { type: 'apply_status', target: 'all_enemies', status: 'poison', amount: 2 },
    ],
    description: 'Stance: Blight Focus (+1 Poison/Burn applied; Poison stops decaying; lose 2 HP/turn). Apply 2 Poison to all.',
    upgraded: {
      name: 'Blight Focus +',
      cost: 0,
      effects: [
        { type: 'enter_stance', stance: 'alchemical' },
        { type: 'apply_status', target: 'all_enemies', status: 'poison', amount: 3 },
      ],
      description: 'Stance: Blight Focus (+1 Poison/Burn applied; Poison stops decaying; lose 2 HP/turn). Apply 3 Poison to all.',
    },
  },
  blight_aegis: {
    id: 'blight_aegis',
    name: 'Miasma Reflex',
    category: 'reaction',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'morwen',
    needsTarget: false,
    animationStyle: 'reaction',
    effects: [
      { type: 'block', amount: 6 },
      {
        type: 'add_reaction',
        reactionId: 'blight_aegis',
        name: 'Miasma Reflex',
        triggerOn: 'on_enemy_attack_before',
        ward: 1,
        status: 'poison',
        statusAmount: 3,
      },
    ],
    description: 'Gain 6 Block. Reaction: Before an enemy attacks, gain 1 Ward and inflict 3 Poison on the attacker.',
    upgraded: {
      name: 'Miasma Reflex +',
      effects: [
        { type: 'block', amount: 8 },
        {
          type: 'add_reaction',
          reactionId: 'blight_aegis',
          name: 'Miasma Reflex+',
          triggerOn: 'on_enemy_attack_before',
          ward: 1,
          status: 'poison',
          statusAmount: 5,
          draw: 1,
        },
      ],
      description: 'Gain 8 Block. Reaction: Gain 1 Ward, inflict 5 Poison on attacker, and draw 1 next turn.',
    },
  },

  // =========================================================================
  // KAELITH — VEIL STALKER EXCLUSIVE CARDS
  // =========================================================================
  veil_slash: {
    id: 'veil_slash',
    name: 'Veil Slash',
    category: 'attack',
    rarity: 'starter',
    cost: 1,
    characterPool: 'kaelith',
    needsTarget: true,
    animationStyle: 'slash',
    effects: [
      { type: 'damage', amount: 6 },
      { type: 'apply_status', target: 'selected', status: 'bleed', amount: 2 },
    ],
    description: 'Deal 6 damage and apply 2 Bleed.',
    upgraded: {
      name: 'Veil Slash +',
      effects: [
        { type: 'damage', amount: 9 },
        { type: 'apply_status', target: 'selected', status: 'bleed', amount: 3 },
      ],
      description: 'Deal 9 damage and apply 3 Bleed.',
    },
  },
  shadow_step: {
    id: 'shadow_step',
    name: 'Shadow Step',
    category: 'defense',
    rarity: 'starter',
    cost: 0,
    characterPool: 'kaelith',
    needsTarget: false,
    animationStyle: 'ward',
    effects: [
      { type: 'block', amount: 4 },
      { type: 'draw', amount: 1 },
    ],
    description: 'Gain 4 Block. Draw 1 card.',
    upgraded: {
      name: 'Shadow Step +',
      effects: [
        { type: 'block', amount: 7 },
        { type: 'draw', amount: 1 },
      ],
      description: 'Gain 7 Block. Draw 1 card.',
    },
  },
  crimson_flurry: {
    id: 'crimson_flurry',
    name: 'Crimson Flurry',
    category: 'attack',
    rarity: 'starter',
    cost: 1,
    characterPool: 'kaelith',
    needsTarget: true,
    animationStyle: 'twin_slash',
    effects: [
      { type: 'damage', amount: 4, hits: 2 },
      {
        type: 'conditional',
        condition: 'if_cards_played_this_turn_gte',
        value: 2,
        thenEffects: [{ type: 'gain_energy', amount: 1 }],
      },
    ],
    description: 'Deal 4 damage twice. Combo (2+ cards played): Gain 1 Energy.',
    upgraded: {
      name: 'Crimson Flurry +',
      effects: [
        { type: 'damage', amount: 6, hits: 2 },
        {
          type: 'conditional',
          condition: 'if_cards_played_this_turn_gte',
          value: 2,
          thenEffects: [{ type: 'gain_energy', amount: 1 }],
        },
      ],
      description: 'Deal 6 damage twice. Combo (2+ cards played): Gain 1 Energy.',
    },
  },
  dusk_feint: {
    id: 'dusk_feint',
    name: 'Dusk Feint',
    category: 'skill',
    rarity: 'common',
    cost: 0,
    characterPool: 'kaelith',
    needsTarget: true,
    animationStyle: 'shadow_spell',
    keywords: ['exhaust'],
    effects: [
      { type: 'apply_status', target: 'selected', status: 'vulnerable', amount: 2 },
      { type: 'add_card', destination: 'hand', cardId: 'echo_shiv', count: 1 },
    ],
    description: 'Exhaust. Apply 2 Vulnerable. Add an Echo Shiv to your hand.',
    upgraded: {
      name: 'Dusk Feint +',
      keywords: ['exhaust'],
      effects: [
        { type: 'apply_status', target: 'selected', status: 'vulnerable', amount: 3 },
        { type: 'add_card', destination: 'hand', cardId: 'echo_shiv', upgraded: true, count: 1 },
      ],
      description: 'Exhaust. Apply 3 Vulnerable. Add an Echo Shiv+ to your hand.',
    },
  },
  echo_shiv: {
    id: 'echo_shiv',
    name: 'Echo Shiv',
    category: 'attack',
    rarity: 'common',
    cost: 0,
    characterPool: 'kaelith',
    needsTarget: true,
    animationStyle: 'pierce',
    keywords: ['exhaust', 'ethereal'],
    effects: [{ type: 'damage', amount: 4 }],
    description: '0 Cost. Ethereal. Exhaust. Deal 4 damage.',
    upgraded: {
      name: 'Echo Shiv +',
      keywords: ['exhaust', 'ethereal'],
      effects: [{ type: 'damage', amount: 7 }],
      description: '0 Cost. Ethereal. Exhaust. Deal 7 damage.',
    },
  },
  summon_veil_shade: {
    id: 'summon_veil_shade',
    name: 'Summon Veil Shade',
    category: 'summoning',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'kaelith',
    needsTarget: false,
    animationStyle: 'summon',
    keywords: ['exhaust'],
    effects: [{ type: 'summon_companion', companionId: 'veil_shade', duration: 2 }],
    description: 'Exhaust. Summon a Veil Shade (4 piercing dmg & 1 Bleed to all enemies each turn for 2 turns).',
    upgraded: {
      name: 'Summon Veil Shade +',
      keywords: ['exhaust'],
      effects: [{ type: 'summon_companion', companionId: 'veil_shade', duration: 3 }],
      description: 'Exhaust. Summon a Veil Shade for 3 turns.',
    },
  },
  eclipse_mark: {
    id: 'eclipse_mark',
    name: 'Eclipse Mark',
    category: 'power',
    rarity: 'rare',
    cost: 1,
    characterPool: 'kaelith',
    needsTarget: false,
    animationStyle: 'shadow_spell',
    keywords: ['exhaust'],
    triggers: [
      {
        event: 'on_status_applied',
        statusFilter: 'bleed',
        effects: [{ type: 'damage', amount: 3, targetMode: 'random_enemy' }],
      },
    ],
    effects: [{ type: 'apply_status', target: 'all_enemies', status: 'bleed', amount: 2 }],
    description: 'Exhaust. Apply 2 Bleed to all enemies. Power: Whenever you apply Bleed, deal 3 damage to a random enemy.',
    upgraded: {
      name: 'Eclipse Mark +',
      cost: 0,
      keywords: ['exhaust'],
      triggers: [
        {
          event: 'on_status_applied',
          statusFilter: 'bleed',
          effects: [{ type: 'damage', amount: 4, targetMode: 'random_enemy' }],
        },
      ],
      effects: [{ type: 'apply_status', target: 'all_enemies', status: 'bleed', amount: 3 }],
      description: 'Exhaust. Apply 3 Bleed to all enemies. Power: Whenever Bleed is applied, deal 4 damage.',
    },
  },
  phantom_barrage: {
    id: 'phantom_barrage',
    name: 'Phantom Barrage',
    category: 'attack',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'kaelith',
    needsTarget: false,
    animationStyle: 'twin_slash',
    effects: [
      { type: 'add_card', destination: 'hand', cardId: 'echo_shiv', count: 2 },
      { type: 'block', amount: 4 },
    ],
    description: 'Add 2 Echo Shivs to your hand. Gain 4 Block.',
    upgraded: {
      name: 'Phantom Barrage +',
      effects: [
        { type: 'add_card', destination: 'hand', cardId: 'echo_shiv', upgraded: true, count: 2 },
        { type: 'block', amount: 6 },
      ],
      description: 'Add 2 Echo Shiv+ to your hand. Gain 6 Block.',
    },
  },
  moonlit_sever: {
    id: 'moonlit_sever',
    name: 'Moonlit Sever',
    category: 'attack',
    rarity: 'rare',
    cost: 2,
    characterPool: 'kaelith',
    needsTarget: true,
    animationStyle: 'heavy_cleave',
    effects: [
      { type: 'damage', amount: 11, scalingStatus: 'bleed', scalingSource: 'target', scalingMultiplier: 2 },
      {
        type: 'conditional',
        condition: 'if_cards_played_this_turn_gte',
        value: 3,
        thenEffects: [{ type: 'draw', amount: 2 }],
      },
    ],
    description: 'Deal 11 damage +2 per Bleed on target. Combo (3+ cards played): Draw 2 cards.',
    upgraded: {
      name: 'Moonlit Sever +',
      effects: [
        { type: 'damage', amount: 15, scalingStatus: 'bleed', scalingSource: 'target', scalingMultiplier: 3 },
        {
          type: 'conditional',
          condition: 'if_cards_played_this_turn_gte',
          value: 3,
          thenEffects: [{ type: 'draw', amount: 2 }],
        },
      ],
      description: 'Deal 15 damage +3 per Bleed on target. Combo (3+ cards): Draw 2 cards.',
    },
  },
  eclipse_snare: {
    id: 'eclipse_snare',
    name: 'Eclipse Snare',
    category: 'trap',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'kaelith',
    needsTarget: false,
    animationStyle: 'trap',
    effects: [
      {
        type: 'add_trap',
        trapId: 'eclipse_snare',
        name: 'Eclipse Snare',
        triggerOn: 'enemy_defend_or_buff',
        damage: 10,
        status: 'vulnerable',
        statusAmount: 2,
        targetMode: 'attacker',
        charges: 1,
      },
    ],
    description: 'Trap. When an enemy defends or buffs: Deal 10 damage and apply 2 Vulnerable.',
    upgraded: {
      name: 'Eclipse Snare +',
      cost: 0,
      effects: [
        {
          type: 'add_trap',
          trapId: 'eclipse_snare',
          name: 'Eclipse Snare+',
          triggerOn: 'enemy_defend_or_buff',
          damage: 14,
          status: 'vulnerable',
          statusAmount: 3,
          targetMode: 'attacker',
          charges: 1,
        },
      ],
      description: 'Trap. When an enemy defends or buffs: Deal 14 damage and apply 3 Vulnerable.',
    },
  },
  stance_eclipse: {
    id: 'stance_eclipse',
    name: 'Veil Step Stance',
    category: 'stance',
    rarity: 'uncommon',
    cost: 1,
    characterPool: 'kaelith',
    needsTarget: false,
    animationStyle: 'stance',
    effects: [
      { type: 'enter_stance', stance: 'eclipse' },
      { type: 'gain_energy', amount: 1 },
    ],
    description: 'Stance: Veil Step (Attacks apply +1 Bleed; every 3rd card draws 1; -25% Block). Gain 1 Energy.',
    upgraded: {
      name: 'Veil Step Stance +',
      cost: 0,
      effects: [
        { type: 'enter_stance', stance: 'eclipse' },
        { type: 'gain_energy', amount: 1 },
      ],
      description: 'Stance: Veil Step (Attacks apply +1 Bleed; every 3rd card draws 1; -25% Block). Gain 1 Energy.',
    },
  },
  shadow_evasion: {
    id: 'shadow_evasion',
    name: 'Shadow Counter',
    category: 'reaction',
    rarity: 'rare',
    cost: 1,
    characterPool: 'kaelith',
    needsTarget: false,
    animationStyle: 'reaction',
    effects: [
      { type: 'block', amount: 4 },
      { type: 'draw', amount: 1 },
      {
        type: 'add_reaction',
        reactionId: 'shadow_evasion',
        name: 'Shadow Counter',
        triggerOn: 'on_enemy_attack_before',
        ward: 1,
        counterDamage: 8,
        status: 'bleed',
        statusAmount: 2,
      },
    ],
    description: 'Gain 4 Block, draw 1. Reaction: Before an attack, gain 1 Ward, deal 8 dmg & 2 Bleed.',
    upgraded: {
      name: 'Shadow Counter +',
      cost: 0,
      effects: [
        { type: 'block', amount: 6 },
        { type: 'draw', amount: 1 },
        {
          type: 'add_reaction',
          reactionId: 'shadow_evasion',
          name: 'Shadow Counter+',
          triggerOn: 'on_enemy_attack_before',
          ward: 1,
          counterDamage: 11,
          status: 'bleed',
          statusAmount: 3,
        },
      ],
      description: 'Gain 6 Block, draw 1. Reaction: Before an attack, gain 1 Ward, deal 11 dmg & 3 Bleed.',
    },
  },

  // =========================================================================
  // FACTION SIGNATURE & CHARACTER QUEST CARDS
  // =========================================================================
  penitent_absolution: {
    id: 'penitent_absolution',
    name: 'Iron Absolution',
    category: 'attack',
    rarity: 'rare',
    cost: 1,
    characterPool: 'shared',
    needsTarget: true,
    animationStyle: 'heavy_cleave',
    effects: [
      { type: 'damage', amount: 9 },
      { type: 'block', amount: 7 },
      { type: 'apply_status', target: 'selected', status: 'burn', amount: 3 },
    ],
    description: 'Faction Sigil. Deal 9 damage, gain 7 Block, and apply 3 Burn.',
    upgraded: {
      name: 'Iron Absolution +',
      effects: [
        { type: 'damage', amount: 12 },
        { type: 'block', amount: 10 },
        { type: 'apply_status', target: 'selected', status: 'burn', amount: 4 },
      ],
      description: 'Faction Sigil. Deal 12 damage, gain 10 Block, and apply 4 Burn.',
    },
  },
  choir_dirge: {
    id: 'choir_dirge',
    name: 'Dirge of Salt',
    category: 'skill',
    rarity: 'rare',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'shadow_spell',
    effects: [
      { type: 'apply_status', target: 'all_enemies', status: 'weak', amount: 2 },
      { type: 'apply_status', target: 'self', status: 'ward', amount: 1 },
      { type: 'draw', amount: 1 },
    ],
    description: 'Faction Sigil. Apply 2 Weak to all foes, gain 1 Ward, and draw 1 card.',
    upgraded: {
      name: 'Dirge of Salt +',
      cost: 0,
      effects: [
        { type: 'apply_status', target: 'all_enemies', status: 'weak', amount: 2 },
        { type: 'apply_status', target: 'self', status: 'ward', amount: 1 },
        { type: 'draw', amount: 2 },
      ],
      description: 'Faction Sigil. Apply 2 Weak to all foes, gain 1 Ward, and draw 2 cards.',
    },
  },
  circle_bloom: {
    id: 'circle_bloom',
    name: 'Hollowwood Bloom',
    category: 'skill',
    rarity: 'rare',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'poison_spell',
    keywords: ['exhaust'],
    effects: [
      { type: 'apply_status', target: 'all_enemies', status: 'poison', amount: 5 },
      { type: 'heal', amount: 5 },
    ],
    description: 'Faction Sigil. Exhaust. Apply 5 Poison to all enemies and heal 5 HP.',
    upgraded: {
      name: 'Hollowwood Bloom +',
      keywords: ['exhaust'],
      effects: [
        { type: 'apply_status', target: 'all_enemies', status: 'poison', amount: 7 },
        { type: 'heal', amount: 7 },
      ],
      description: 'Faction Sigil. Exhaust. Apply 7 Poison to all enemies and heal 7 HP.',
    },
  },
  court_decree: {
    id: 'court_decree',
    name: 'Abyssal Decree',
    category: 'power',
    rarity: 'rare',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'ward',
    keywords: ['exhaust'],
    effects: [
      { type: 'block', amount: 8 },
      { type: 'apply_status', target: 'self', status: 'thorns', amount: 3 },
    ],
    description: 'Faction Sigil. Gain 8 Block and 3 Thorns for this combat.',
    upgraded: {
      name: 'Abyssal Decree +',
      keywords: ['exhaust'],
      effects: [
        { type: 'block', amount: 12 },
        { type: 'apply_status', target: 'self', status: 'thorns', amount: 4 },
      ],
      description: 'Faction Sigil. Gain 12 Block and 4 Thorns for this combat.',
    },
  },
  bastion_brace: {
    id: 'bastion_brace',
    name: 'Bastion Rampart',
    category: 'defense',
    rarity: 'rare',
    cost: 2,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'shield',
    keywords: ['retain'],
    effects: [
      { type: 'block', amount: 16 },
      { type: 'apply_status', target: 'self', status: 'strength', amount: 2 },
    ],
    description: 'Faction Sigil. Retain. Gain 16 Block and 2 Strength.',
    upgraded: {
      name: 'Bastion Rampart +',
      keywords: ['retain'],
      effects: [
        { type: 'block', amount: 21 },
        { type: 'apply_status', target: 'self', status: 'strength', amount: 3 },
      ],
      description: 'Faction Sigil. Retain. Gain 21 Block and 3 Strength.',
    },
  },
  archivist_index: {
    id: 'archivist_index',
    name: 'Archivist Codex',
    category: 'skill',
    rarity: 'rare',
    cost: 0,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'ritual',
    keywords: ['exhaust'],
    effects: [
      { type: 'draw', amount: 2 },
      { type: 'upgrade_hand_cards', count: 2 },
    ],
    description: 'Faction Sigil. Exhaust. Draw 2 cards and upgrade 2 cards in hand.',
    upgraded: {
      name: 'Archivist Codex +',
      keywords: ['exhaust'],
      effects: [
        { type: 'draw', amount: 3 },
        { type: 'upgrade_hand_cards', count: -1 },
      ],
      description: 'Faction Sigil. Exhaust. Draw 3 cards and upgrade all cards in hand.',
    },
  },
  eclipse_verdict: {
    id: 'eclipse_verdict',
    name: 'Solar Eclipse Verdict',
    category: 'attack',
    rarity: 'mythic',
    cost: 2,
    characterPool: 'shared',
    needsTarget: true,
    animationStyle: 'heavy_cleave',
    effects: [
      { type: 'damage', amount: 18, critIfTargetVulnerable: true },
      { type: 'apply_status', target: 'selected', status: 'vulnerable', amount: 2 },
    ],
    description: 'Faction Sigil. Deal 18 damage (Crit 1.5× if Vulnerable) and apply 2 Vulnerable.',
    upgraded: {
      name: 'Solar Eclipse Verdict +',
      effects: [
        { type: 'damage', amount: 24, critIfTargetVulnerable: true },
        { type: 'apply_status', target: 'selected', status: 'vulnerable', amount: 3 },
      ],
      description: 'Faction Sigil. Deal 24 damage (Crit 1.5× if Vulnerable) and apply 3 Vulnerable.',
    },
  },
  vaelen_quest_oath: {
    id: 'vaelen_quest_oath',
    name: 'Citadel Reclamation',
    category: 'defense',
    rarity: 'mythic',
    cost: 1,
    characterPool: 'vaelen',
    needsTarget: false,
    animationStyle: 'fire_spell',
    keywords: ['retain'],
    effects: [
      { type: 'block', amount: 11 },
      { type: 'apply_status', target: 'all_enemies', status: 'burn', amount: 4 },
      { type: 'apply_status', target: 'self', status: 'thorns', amount: 2 },
    ],
    description: 'Hero Oath. Retain. Gain 11 Block, 2 Thorns, and apply 4 Burn to all enemies.',
    upgraded: {
      name: 'Citadel Reclamation +',
      keywords: ['retain'],
      effects: [
        { type: 'block', amount: 15 },
        { type: 'apply_status', target: 'all_enemies', status: 'burn', amount: 6 },
        { type: 'apply_status', target: 'self', status: 'thorns', amount: 3 },
      ],
      description: 'Hero Oath. Retain. Gain 15 Block, 3 Thorns, and apply 6 Burn to all enemies.',
    },
  },
  morwen_quest_panacea: {
    id: 'morwen_quest_panacea',
    name: 'Veilroot Panacea',
    category: 'skill',
    rarity: 'mythic',
    cost: 1,
    characterPool: 'morwen',
    needsTarget: true,
    animationStyle: 'poison_spell',
    keywords: ['exhaust'],
    effects: [
      { type: 'apply_status', target: 'selected', status: 'poison', amount: 6 },
      { type: 'remove_status', target: 'self', status: 'debuffs' },
      { type: 'heal', amount: 6 },
      { type: 'draw', amount: 1 },
    ],
    description: 'Hero Oath. Exhaust. Apply 6 Poison, cleanse self debuffs, heal 6 HP, draw 1.',
    upgraded: {
      name: 'Veilroot Panacea +',
      cost: 0,
      keywords: ['exhaust'],
      effects: [
        { type: 'apply_status', target: 'selected', status: 'poison', amount: 8 },
        { type: 'remove_status', target: 'self', status: 'debuffs' },
        { type: 'heal', amount: 8 },
        { type: 'draw', amount: 1 },
      ],
      description: 'Hero Oath. Exhaust. Apply 8 Poison, cleanse self debuffs, heal 8 HP, draw 1.',
    },
  },
  kaelith_quest_eclipse: {
    id: 'kaelith_quest_eclipse',
    name: 'Severed Eclipse',
    category: 'attack',
    rarity: 'mythic',
    cost: 1,
    characterPool: 'kaelith',
    needsTarget: true,
    animationStyle: 'twin_slash',
    keywords: ['echo'],
    effects: [
      { type: 'damage', amount: 7, hits: 2 },
      { type: 'apply_status', target: 'selected', status: 'bleed', amount: 3 },
      { type: 'gain_energy', amount: 1 },
    ],
    description: 'Hero Oath. Echo. Deal 7 dmg twice, apply 3 Bleed, and gain 1 Energy.',
    upgraded: {
      name: 'Severed Eclipse +',
      keywords: ['echo'],
      effects: [
        { type: 'damage', amount: 9, hits: 2 },
        { type: 'apply_status', target: 'selected', status: 'bleed', amount: 4 },
        { type: 'gain_energy', amount: 1 },
      ],
      description: 'Hero Oath. Echo. Deal 9 dmg twice, apply 4 Bleed, and gain 1 Energy.',
    },
  },

  // =========================================================================
  // CURSE CARDS
  // =========================================================================
  ashen_curse: {
    id: 'ashen_curse',
    name: 'Ashen Burden',
    category: 'curse',
    rarity: 'curse',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'curse',
    keywords: ['exhaust', 'ethereal'],
    effects: [{ type: 'lose_hp', amount: 2 }],
    description: 'Curse. Ethereal. Play to Exhaust and lose 2 HP, or let it fade.',
  },
  eclipse_dread: {
    id: 'eclipse_dread',
    name: 'Eclipse Dread',
    category: 'curse',
    rarity: 'curse',
    cost: 1,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'curse',
    keywords: ['exhaust'],
    effects: [{ type: 'apply_status', target: 'self', status: 'weak', amount: 1 }],
    description: 'Curse. Exhaust. Playing this inflicts 1 Weak on yourself.',
  },
  void_shackle: {
    id: 'void_shackle',
    name: 'Pact of Embers',
    category: 'curse',
    rarity: 'curse',
    cost: 0,
    characterPool: 'shared',
    needsTarget: false,
    animationStyle: 'curse',
    keywords: ['retain'],
    effects: [
      { type: 'lose_hp', amount: 2 },
      { type: 'gain_energy', amount: 1 },
      { type: 'draw', amount: 1 },
    ],
    description: 'Curse. Retain. Lose 2 HP to gain 1 Energy and draw 1 card.',
  },
};

export const CARDS: Record<string, CardDef> = {
  ...BASE_CARDS,
  ...EXPANDED_SHARED_CARDS,
  ...NEW_HERO_CARDS,
};

const NON_REWARDABLE_IDS = new Set([
  'echo_shiv',
  'ember_dart',
  'awakened_greatsword',
  'vaelen_quest_oath',
  'morwen_quest_panacea',
  'kaelith_quest_eclipse',
  'sylvarin_quest_oath',
  'vesperis_quest_oath',
  'orin_quest_oath',
  'nyx_quest_oath',
]);

export function getCardDef(id: string): CardDef {
  return CARDS[id] ?? CARDS.strike;
}

export function getCardAttackRange(def: CardDef, upgraded = false): AttackRangeType | undefined {
  if (upgraded && def.upgraded?.attackRange) return def.upgraded.attackRange;
  if (def.attackRange) return def.attackRange;
  if (def.category !== 'attack') return undefined;
  const effs = upgraded && def.upgraded ? def.upgraded.effects : def.effects;
  const hasAoe = effs.some((e) => e.type === 'damage' && e.targetMode === 'all_enemies');
  if (hasAoe) return 'aoe';
  if (def.animationStyle === 'arrow_shot') return 'ranged';
  if (
    def.animationStyle === 'arcane_beam' ||
    def.animationStyle === 'fire_spell' ||
    def.animationStyle === 'poison_spell' ||
    def.animationStyle === 'shadow_spell'
  ) {
    return 'magic';
  }
  return 'melee';
}

function isStandardDropEligible(c: CardDef): boolean {
  if (c.rarity === 'starter' || c.rarity === 'curse') return false;
  if (NON_REWARDABLE_IDS.has(c.id)) return false;
  if (
    c.acquisitionSource === 'boss_drop' ||
    c.acquisitionSource === 'secret_event' ||
    c.acquisitionSource === 'quest' ||
    c.acquisitionSource === 'generated'
  ) {
    return false;
  }
  return true;
}

export function getRewardableCardIds(characterId: string): string[] {
  return Object.values(CARDS)
    .filter(
      (c) =>
        isStandardDropEligible(c) &&
        (c.characterPool === 'shared' || c.characterPool === characterId)
    )
    .map((c) => c.id);
}

export function getSpecialDropCardIds(
  source: Extract<CardAcquisitionSource, 'boss_drop' | 'secret_event' | 'quest' | 'faction'>,
  characterId?: string
): string[] {
  return Object.values(CARDS)
    .filter(
      (c) =>
        c.acquisitionSource === source &&
        (!characterId || c.characterPool === 'shared' || c.characterPool === characterId)
    )
    .map((c) => c.id);
}

export function getCrossPoolCardIds(characterId: string): string[] {
  return Object.values(CARDS)
    .filter(
      (c) =>
        isStandardDropEligible(c) &&
        c.characterPool !== 'shared' &&
        c.characterPool !== characterId
    )
    .map((c) => c.id);
}

export function getLibraryCardIds(characterId: string): string[] {
  return Object.values(CARDS)
    .filter(
      (c) =>
        isStandardDropEligible(c) &&
        ['skill', 'power', 'ritual', 'trap', 'reaction', 'stance'].includes(c.category) &&
        (c.characterPool === 'shared' || c.characterPool === characterId)
    )
    .map((c) => c.id);
}
