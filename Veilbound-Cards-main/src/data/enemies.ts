import type { EnemyDef } from '../types/game';

export const ENEMIES: Record<string, EnemyDef> = {
  // =========================================================================
  // REGION 1: THE ASHEN MARCHES — CREATURES & PENITENT FACTION
  // =========================================================================
  ash_stalker: {
    id: 'ash_stalker',
    name: 'Ash Stalker',
    group: 'creature',
    role: 'ordinary',
    tacticalArchetype: 'assassin',
    mechanicHint: 'Assassin: Exploits exposed low-Block prey and inflicts Bleed.',
    regionId: 'ashen_marches',
    maxHp: 32,
    spriteStyle: 'ash_stalker',
    lore: 'Skeletal carrion prowlers whose ribs smolder with battlefield embers.',
    selectIntent: ({ turn, hp, maxHp, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 2 : difficulty === 'penance' ? 1 : 0;
      if (hp < maxHp * 0.4 && turn % 2 === 0) {
        return {
          type: 'multi_attack',
          label: 'Desperate Frenzy',
          damage: 4 + (difficulty === 'eclipse' ? 1 : 0),
          hits: 2,
        };
      }
      if (turn % 3 === 1) {
        return { type: 'attack', label: 'Cinder Rake', damage: 7 + dmgBoost };
      }
      if (turn % 3 === 2) {
        return {
          type: 'attack_debuff',
          label: 'Ashen Bite',
          damage: 5 + dmgBoost,
          status: 'bleed',
          statusAmount: 2,
        };
      }
      return {
        type: 'buff',
        label: 'Stoke Embers',
        selfStatus: 'strength',
        selfStatusAmount: 2,
        block: 5,
      };
    },
  },
  cinder_husk: {
    id: 'cinder_husk',
    name: 'Cinder Husk',
    group: 'creature',
    role: 'ordinary',
    tacticalArchetype: 'guardian',
    mechanicHint: 'Shields allies when outnumbered or inflicts Frail against fortified foes.',
    regionId: 'ashen_marches',
    maxHp: 38,
    spriteStyle: 'cinder_husk',
    lore: 'Charred armor animated by lingering ash. Protects nearby horrors and crushes guarded travelers.',
    selectIntent: ({ turn, alliesCount, playerBlock, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 2 : difficulty === 'penance' ? 1 : 0;
      if (alliesCount > 1 && turn % 3 === 2) {
        return {
          type: 'defend',
          label: 'Cinder Phalanx',
          block: 4,
          blockAllies: 6,
        };
      }
      if (playerBlock > 8) {
        return {
          type: 'debuff',
          label: 'Choking Ash',
          status: 'frail',
          statusAmount: 2,
          block: 6,
        };
      }
      if (turn % 2 === 1) {
        return {
          type: 'attack_defend',
          label: 'Charred Slam',
          damage: 8 + dmgBoost,
          block: 6,
        };
      }
      return {
        type: 'debuff',
        label: 'Smoldering Dust',
        status: 'frail',
        statusAmount: 2,
        block: 4,
      };
    },
  },
  penitent_crossbowman: {
    id: 'penitent_crossbowman',
    name: 'Penitent Arbalist',
    group: 'faction',
    factionName: 'Order of the Iron Penitent',
    role: 'ordinary',
    tacticalArchetype: 'aggressor',
    mechanicHint: 'Alternates shielded reloads with twin-bolt volleys.',
    regionId: 'ashen_marches',
    maxHp: 28,
    spriteStyle: 'crossbowman',
    lore: 'Fanatic marksmen who bolt jagged iron into fleeing deserters.',
    selectIntent: ({ turn, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 2 : difficulty === 'penance' ? 1 : 0;
      if (turn === 1 || turn % 3 === 0) {
        return {
          type: 'defend',
          label: 'Reload & Pavise',
          block: 8 + dmgBoost * 2,
        };
      }
      return {
        type: 'multi_attack',
        label: 'Twin Quarrels',
        damage: 4 + (difficulty === 'eclipse' ? 1 : 0),
        hits: 2,
      };
    },
  },
  iron_flagellant: {
    id: 'iron_flagellant',
    name: 'Iron Flagellant',
    group: 'faction',
    factionName: 'Order of the Iron Penitent',
    role: 'ordinary',
    tacticalArchetype: 'aggressor',
    mechanicHint: 'Starts with Thorns; enters a high-damage frenzy below 50% HP.',
    regionId: 'ashen_marches',
    maxHp: 36,
    spriteStyle: 'flagellant',
    lore: 'Zealots who grow stronger when wounded in penance.',
    startingStatuses: { thorns: 1 },
    selectIntent: ({ turn, hp, maxHp, difficulty }) => {
      const enraged = hp <= maxHp * 0.5;
      const dmgBoost = difficulty === 'eclipse' ? 2 : difficulty === 'penance' ? 1 : 0;
      if (enraged && turn % 2 === 0) {
        return {
          type: 'attack',
          label: 'Frenzied Scourge',
          damage: 13 + dmgBoost,
          isCharged: true,
        };
      }
      return {
        type: 'attack_debuff',
        label: 'Brand of Iron',
        damage: 6 + dmgBoost,
        status: 'vulnerable',
        statusAmount: 1,
      };
    },
  },
  oathbreaker_captain: {
    id: 'oathbreaker_captain',
    name: 'Captain Vorn, Oathbreaker',
    title: 'Faction Leader',
    group: 'faction',
    factionId: 'iron_penitent',
    factionName: 'Order of the Iron Penitent',
    role: 'leader',
    tacticalArchetype: 'summoner',
    mechanicHint: 'Summoner: Rallies Penitent Arbalists and bolsters squad Strength.',
    regionId: 'ashen_marches',
    maxHp: 74,
    scale: 1.16,
    spriteStyle: 'oathbreaker',
    lore: 'Disgraced commander of the Iron Penitents who rallies squads under scarred steel.',
    selectIntent: ({ turn, alliesCount, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 1 : 0;
      if (turn === 1 && alliesCount < 2) {
        return {
          type: 'summon',
          label: 'Rally Penitent',
          summonEnemyId: 'penitent_crossbowman',
          block: 6,
        };
      }
      if (alliesCount > 1 && turn % 3 === 0) {
        return {
          type: 'buff',
          label: 'Command the Line',
          buffAlliesStatus: 'strength',
          buffAlliesAmount: 2,
          blockAllies: 5,
        };
      }
      if (turn % 3 === 2) {
        return {
          type: 'multi_attack',
          label: 'Execution Volley',
          damage: 5 + (difficulty === 'eclipse' ? 1 : 0),
          hits: 3,
        };
      }
      return {
        type: 'attack_defend',
        label: 'Towering Cleave',
        damage: 11 + dmgBoost,
        block: 8,
      };
    },
  },
  cinder_warden: {
    id: 'cinder_warden',
    name: 'Malakor, the Cinder Warden',
    title: 'Regional Boss',
    group: 'faction',
    factionName: 'Order of the Iron Penitent',
    role: 'boss',
    tacticalArchetype: 'boss',
    mechanicHint: 'Fortifies inside Kiln Armor; fractures at 50% HP to unleash multi-hit Kiln Eruptions.',
    regionId: 'ashen_marches',
    maxHp: 130,
    scale: 1.35,
    spriteStyle: 'cinder_warden',
    lore: 'Keeper of the Citadel Furnace. When his outer plate fractures, the living kiln within erupts.',
    phases: [
      {
        phaseNumber: 2,
        name: 'Infernal Reckoning',
        hpThresholdPct: 50,
        dialogue: 'The furnace cracks open—let the Marches burn with me!',
        onEnterSelfStatus: [
          { status: 'strength', amount: 3 },
          { status: 'thorns', amount: 2 },
        ],
        onEnterPlayerStatus: [{ status: 'burn', amount: 3 }],
        onEnterBlock: 16,
      },
    ],
    selectIntent: ({ turn, phase, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 2 : 0;
      if (phase >= 2) {
        if (turn % 3 === 0) {
          return {
            type: 'multi_attack',
            label: 'Kiln Eruption',
            damage: 6 + (difficulty === 'eclipse' ? 1 : 0),
            hits: 3,
            isCharged: true,
          };
        }
        if (turn % 3 === 1) {
          return {
            type: 'curse',
            label: 'Ashen Verdict',
            damage: 11 + dmgBoost,
            curseCardId: 'ashen_curse',
          };
        }
        return {
          type: 'attack_defend',
          label: 'Molten Aegis',
          damage: 10 + dmgBoost,
          block: 12,
        };
      }

      if (turn % 3 === 1) {
        return {
          type: 'attack',
          label: 'Smoldering Maul',
          damage: 12 + dmgBoost,
        };
      }
      if (turn % 3 === 2) {
        return {
          type: 'attack_debuff',
          label: 'Cinder Shower',
          damage: 8 + dmgBoost,
          status: 'burn',
          statusAmount: 3,
        };
      }
      return {
        type: 'defend',
        label: 'Iron Furnace Stance',
        block: 14,
        selfStatus: 'strength',
        selfStatusAmount: 1,
      };
    },
  },

  // =========================================================================
  // REGION 2: THE SUNKEN RELIQUARY — CREATURES & CHOIR OF THE DROWNED
  // =========================================================================
  mire_leech: {
    id: 'mire_leech',
    name: 'Mire Leech',
    group: 'creature',
    role: 'ordinary',
    tacticalArchetype: 'aggressor',
    mechanicHint: 'Inflicts Poison and strikes harder against already-poisoned prey.',
    regionId: 'sunken_reliquary',
    maxHp: 38,
    spriteStyle: 'mire_leech',
    lore: 'Blind pale parasites bloated on reliquary alchemy.',
    selectIntent: ({ turn, playerStatuses, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 2 : difficulty === 'penance' ? 1 : 0;
      const playerPoisoned = (playerStatuses?.poison ?? 0) > 0;
      if (turn % 2 === 1) {
        return {
          type: 'attack_debuff',
          label: 'Venomous Latch',
          damage: 7 + dmgBoost,
          status: 'poison',
          statusAmount: 2,
        };
      }
      return {
        type: 'attack',
        label: playerPoisoned ? 'Blight Drain' : 'Siphon Fang',
        damage: (playerPoisoned ? 11 : 9) + dmgBoost,
      };
    },
  },
  drowned_acolyte: {
    id: 'drowned_acolyte',
    name: 'Drowned Acolyte',
    group: 'faction',
    factionId: 'drowned_choir',
    factionName: 'Choir of the Drowned',
    role: 'ordinary',
    tacticalArchetype: 'support',
    mechanicHint: 'Support: Mends wounded allies with Reliquary chants and weakens attackers.',
    regionId: 'sunken_reliquary',
    maxHp: 42,
    spriteStyle: 'drowned_acolyte',
    lore: 'Submerged choristers whose hymns restore sunken horrors while numbing foes.',
    selectIntent: ({ turn, woundedAllyExists, alliesCount, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 2 : difficulty === 'penance' ? 1 : 0;
      if (woundedAllyExists && alliesCount > 1 && turn % 2 === 0) {
        return {
          type: 'buff',
          label: 'Hymn of Renewal',
          healAllies: 7,
          block: 5,
        };
      }
      if (turn % 3 === 1) {
        return {
          type: 'debuff',
          label: 'Dirge of Silt',
          status: 'weak',
          statusAmount: 2,
          block: 7,
        };
      }
      return {
        type: 'attack',
        label: 'Censer Strike',
        damage: 10 + dmgBoost,
      };
    },
  },
  crypt_gorger: {
    id: 'crypt_gorger',
    name: 'Crypt Gorger',
    group: 'creature',
    role: 'ordinary',
    tacticalArchetype: 'guardian',
    mechanicHint: 'Cycles between heavy Sunken Shell fortification and Crushing Maw strikes.',
    regionId: 'sunken_reliquary',
    maxHp: 48,
    spriteStyle: 'crypt_gorger',
    lore: 'Hulking stone-jawed scavengers nesting in flooded tombs.',
    selectIntent: ({ turn, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 1 : 0;
      if (turn % 2 === 0) {
        return {
          type: 'attack',
          label: 'Crushing Maw',
          damage: 14 + dmgBoost,
          isCharged: true,
        };
      }
      return {
        type: 'defend',
        label: 'Sunken Shell',
        block: 12,
      };
    },
  },
  choir_cantor: {
    id: 'choir_cantor',
    name: 'Choir Cantor',
    group: 'faction',
    factionName: 'Choir of the Drowned',
    role: 'ordinary',
    tacticalArchetype: 'support',
    mechanicHint: 'Empowers all allies with Strength and builds Ritual stacks over time.',
    regionId: 'sunken_reliquary',
    maxHp: 40,
    spriteStyle: 'choir_cantor',
    lore: 'Conducts dissonant liturgy that empowers nearby horrors.',
    selectIntent: ({ turn, alliesCount, difficulty }) => {
      if (alliesCount > 1 && turn % 3 === 2) {
        return {
          type: 'buff',
          label: 'Choir Crescendo',
          buffAlliesStatus: 'strength',
          buffAlliesAmount: 2,
          blockAllies: 5,
        };
      }
      if (turn % 3 === 1) {
        return {
          type: 'buff',
          label: 'Abyssal Litany',
          selfStatus: 'ritual',
          selfStatusAmount: 2,
          block: 6,
        };
      }
      return {
        type: 'multi_attack',
        label: 'Resonant Lash',
        damage: 5 + (difficulty === 'eclipse' ? 1 : 0),
        hits: 2,
      };
    },
  },
  prelate_vespera: {
    id: 'prelate_vespera',
    name: 'High Prelate Vespera',
    title: 'Faction Leader',
    group: 'faction',
    factionId: 'drowned_choir',
    factionName: 'Choir of the Drowned',
    role: 'leader',
    tacticalArchetype: 'controller',
    mechanicHint: 'Controller: Summons an Acolyte and punishes fortified stances with Frail & Curses.',
    regionId: 'sunken_reliquary',
    maxHp: 94,
    scale: 1.18,
    spriteStyle: 'prelate_vespera',
    lore: 'Blind matriarch of the Sunken Choir who weaves curses into sacred chants.',
    selectIntent: ({ turn, alliesCount, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 1 : 0;
      if (turn === 1 && alliesCount < 2) {
        return {
          type: 'summon',
          label: 'Call Chorister',
          summonEnemyId: 'drowned_acolyte',
          block: 8,
        };
      }
      if (turn % 3 === 0) {
        return {
          type: 'curse',
          label: 'Sunken Excommunication',
          damage: 9 + dmgBoost,
          curseCardId: 'ashen_curse',
        };
      }
      return {
        type: 'attack_debuff',
        label: 'Tidal Toll',
        damage: 12 + dmgBoost,
        status: 'frail',
        statusAmount: 2,
      };
    },
  },
  ossuary_leviathan: {
    id: 'ossuary_leviathan',
    name: 'The Ossuary Leviathan',
    title: 'Regional Boss',
    group: 'creature',
    role: 'boss',
    tacticalArchetype: 'boss',
    mechanicHint: 'Coils behind Thorns before Abyssal Thrash; summons a Mire Leech at 50% HP.',
    regionId: 'sunken_reliquary',
    maxHp: 175,
    scale: 1.4,
    spriteStyle: 'ossuary_leviathan',
    lore: 'An ancient serpent fused from cathedral arches and drowned martyrs.',
    phases: [
      {
        phaseNumber: 2,
        name: 'Tidal Awakening',
        hpThresholdPct: 50,
        dialogue: 'The vaulted waters surge! None escape the Reliquary tide!',
        onEnterSelfStatus: [{ status: 'strength', amount: 3 }],
        onEnterPlayerStatus: [{ status: 'vulnerable', amount: 2 }],
        onEnterBlock: 18,
        onEnterSummonId: 'mire_leech',
      },
    ],
    selectIntent: ({ turn, phase, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 2 : 0;
      if (phase >= 2) {
        if (turn % 2 === 0) {
          return {
            type: 'multi_attack',
            label: 'Abyssal Thrash',
            damage: 7 + (difficulty === 'eclipse' ? 1 : 0),
            hits: 3,
            isCharged: true,
          };
        }
        return {
          type: 'attack_debuff',
          label: 'Floodgate Crush',
          damage: 14 + dmgBoost,
          status: 'poison',
          statusAmount: 3,
        };
      }
      if (turn % 3 === 1) {
        return {
          type: 'attack',
          label: 'Bone-Arch Slam',
          damage: 15 + dmgBoost,
        };
      }
      if (turn % 3 === 2) {
        return {
          type: 'defend',
          label: 'Calcified Coil',
          block: 16,
          selfStatus: 'thorns',
          selfStatusAmount: 2,
        };
      }
      return {
        type: 'attack_debuff',
        label: 'Miasma Breath',
        damage: 10 + dmgBoost,
        status: 'poison',
        statusAmount: 3,
      };
    },
  },

  // =========================================================================
  // REGION 3: THE OBSIDIAN SPIRE — SENTINELS & ECLIPSE VANGUARD
  // =========================================================================
  basalt_sentinel: {
    id: 'basalt_sentinel',
    name: 'Basalt Sentinel',
    group: 'creature',
    role: 'ordinary',
    tacticalArchetype: 'guardian',
    mechanicHint: 'Adapts with extra Block & Thorns if you play 3+ Attacks in a turn.',
    regionId: 'obsidian_spire',
    maxHp: 56,
    spriteStyle: 'basalt_sentinel',
    lore: 'Living monoliths carved from volcanic glass.',
    startingStatuses: { thorns: 2 },
    selectIntent: ({ turn, playerAttacksLastTurn = 0, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 1 : 0;
      if (playerAttacksLastTurn >= 3) {
        return {
          type: 'defend',
          label: 'Volcanic Bulwark',
          block: 15,
          selfStatus: 'thorns',
          selfStatusAmount: 2,
        };
      }
      if (turn % 2 === 1) {
        return {
          type: 'attack_defend',
          label: 'Obsidian Bastion',
          damage: 11 + dmgBoost,
          block: 10,
        };
      }
      return {
        type: 'attack',
        label: 'Monolith Smash',
        damage: 16 + dmgBoost,
        isCharged: true,
      };
    },
  },
  void_harpy: {
    id: 'void_harpy',
    name: 'Eclipse Shrieker',
    group: 'creature',
    role: 'ordinary',
    tacticalArchetype: 'aggressor',
    mechanicHint: 'Rips away defenses with Vulnerable before diving for multi-hit talons.',
    regionId: 'obsidian_spire',
    maxHp: 46,
    spriteStyle: 'void_harpy',
    lore: 'Winged omens that tear through wards in blinding dives.',
    selectIntent: ({ turn, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 2 : difficulty === 'penance' ? 1 : 0;
      if (turn % 3 === 1) {
        return {
          type: 'multi_attack',
          label: 'Talon Flurry',
          damage: 5 + (difficulty === 'eclipse' ? 1 : 0),
          hits: 3,
        };
      }
      return {
        type: 'attack_debuff',
        label: 'Shatter Screech',
        damage: 9 + dmgBoost,
        status: 'vulnerable',
        statusAmount: 2,
      };
    },
  },
  vanguard_duelist: {
    id: 'vanguard_duelist',
    name: 'Vanguard Duelist',
    group: 'faction',
    factionId: 'eclipse_vanguard',
    factionName: 'Eclipse Vanguard',
    role: 'ordinary',
    tacticalArchetype: 'assassin',
    mechanicHint: 'Assassin: Exploits exposed prey with Bleed incisions and Crescent Combos.',
    regionId: 'obsidian_spire',
    maxHp: 52,
    spriteStyle: 'vanguard_duelist',
    lore: 'Elite blade-dancers sworn to the Sovereign of the Eclipse.',
    selectIntent: ({ turn, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 2 : difficulty === 'penance' ? 1 : 0;
      if (turn % 2 === 1) {
        return {
          type: 'multi_attack',
          label: 'Crescent Combo',
          damage: 7 + (difficulty === 'eclipse' ? 1 : 0),
          hits: 2,
        };
      }
      return {
        type: 'attack_debuff',
        label: 'Hamstring Cut',
        damage: 10 + dmgBoost,
        status: 'bleed',
        statusAmount: 3,
      };
    },
  },
  archon_kael: {
    id: 'archon_kael',
    name: 'Archon Kael, Eclipse Marshal',
    title: 'Faction Leader',
    group: 'faction',
    factionName: 'Eclipse Vanguard',
    role: 'leader',
    tacticalArchetype: 'tactician',
    mechanicHint: 'Punishes heavy Block (>=12) with Eclipse Dread curses.',
    regionId: 'obsidian_spire',
    maxHp: 118,
    scale: 1.22,
    spriteStyle: 'archon_kael',
    lore: 'First blade of the Spire whose commands turn defense into slaughter.',
    selectIntent: ({ turn, playerBlock, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 2 : 0;
      if (turn % 3 === 1) {
        return {
          type: 'multi_attack',
          label: 'Vanguard Tempest',
          damage: 6 + (difficulty === 'eclipse' ? 1 : 0),
          hits: 3,
        };
      }
      if (playerBlock >= 12) {
        return {
          type: 'curse',
          label: 'Break the Shield',
          damage: 13 + dmgBoost,
          curseCardId: 'eclipse_dread',
          isCharged: true,
        };
      }
      return {
        type: 'attack_defend',
        label: 'Solar Riposte',
        damage: 14 + dmgBoost,
        block: 12,
      };
    },
  },
  sovereign_eclipse: {
    id: 'sovereign_eclipse',
    name: 'Sovereign of the Eclipse',
    title: 'Apex Boss',
    group: 'faction',
    factionName: 'Eclipse Vanguard',
    role: 'boss',
    tacticalArchetype: 'boss',
    mechanicHint: 'Three-phase Sovereign: raises Umbral Mantle at 66% HP and unleashes Eclipse Cataclysm below 33% HP.',
    regionId: 'obsidian_spire',
    maxHp: 225,
    scale: 1.45,
    spriteStyle: 'sovereign_eclipse',
    lore: 'The crowned architect of the Veil who holds the fractured sunless throne.',
    phases: [
      {
        phaseNumber: 2,
        name: 'Umbral Mantle',
        hpThresholdPct: 66,
        dialogue: 'Kneel before the darkened crown. Your resolve fractures!',
        onEnterSelfStatus: [
          { status: 'strength', amount: 2 },
          { status: 'ward', amount: 3 },
        ],
        onEnterPlayerStatus: [{ status: 'weak', amount: 2 }],
        onEnterBlock: 18,
      },
      {
        phaseNumber: 3,
        name: 'Solar Collapse',
        hpThresholdPct: 33,
        dialogue: 'All light expires at the apex of the Spire!',
        onEnterSelfStatus: [{ status: 'strength', amount: 4 }],
        onEnterPlayerStatus: [{ status: 'bleed', amount: 3 }],
        onEnterBlock: 22,
      },
    ],
    selectIntent: ({ turn, phase, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 2 : 0;
      if (phase >= 3) {
        if (turn % 2 === 0) {
          return {
            type: 'multi_attack',
            label: 'Eclipse Cataclysm',
            damage: 7 + (difficulty === 'eclipse' ? 1 : 0),
            hits: 4,
            isCharged: true,
          };
        }
        return {
          type: 'curse',
          label: 'Crown Sentence',
          damage: 16 + dmgBoost,
          curseCardId: 'eclipse_dread',
        };
      }
      if (phase === 2) {
        if (turn % 2 === 1) {
          return {
            type: 'attack_defend',
            label: 'Umbral Bulwark',
            damage: 14 + dmgBoost,
            block: 16,
          };
        }
        return {
          type: 'multi_attack',
          label: 'Twin Eclipse Blades',
          damage: 9 + (difficulty === 'eclipse' ? 1 : 0),
          hits: 2,
        };
      }
      if (turn % 3 === 1) {
        return {
          type: 'attack',
          label: 'Obsidian Decree',
          damage: 17 + dmgBoost,
        };
      }
      if (turn % 3 === 2) {
        return {
          type: 'debuff',
          label: 'Veil Suppression',
          status: 'vulnerable',
          statusAmount: 2,
          block: 14,
        };
      }
      return {
        type: 'multi_attack',
        label: 'Sovereign Volley',
        damage: 6 + (difficulty === 'eclipse' ? 1 : 0),
        hits: 3,
      };
    },
  },

  // =========================================================================
  // REGION 4: THE HOLLOWWOOD — CORRUPTED FLORA & BLIGHTED CIRCLE
  // =========================================================================
  briar_stalker: {
    id: 'briar_stalker',
    name: 'Briar Stalker',
    group: 'creature',
    role: 'ordinary',
    tacticalArchetype: 'aggressor',
    mechanicHint: 'Starts with Thorns; lashes with Bleed-inflicting tendrils.',
    regionId: 'hollowwood',
    maxHp: 35,
    spriteStyle: 'spore_stalker',
    lore: 'Twisted root-beasts armored in iron-hard brambles and weeping sap.',
    startingStatuses: { thorns: 2 },
    selectIntent: ({ turn, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 2 : difficulty === 'penance' ? 1 : 0;
      if (turn % 2 === 1) {
        return {
          type: 'attack_debuff',
          label: 'Thorn Lash',
          damage: 6 + dmgBoost,
          status: 'bleed',
          statusAmount: 2,
        };
      }
      return {
        type: 'multi_attack',
        label: 'Bramble Flurry',
        damage: 4 + (difficulty === 'eclipse' ? 1 : 0),
        hits: 2,
      };
    },
  },
  rot_dryad: {
    id: 'rot_dryad',
    name: 'Spore Dryad',
    group: 'faction',
    factionName: 'The Blighted Circle',
    role: 'ordinary',
    tacticalArchetype: 'support',
    mechanicHint: 'Inflicts Poison clouds and restores wounded grove allies.',
    regionId: 'hollowwood',
    maxHp: 37,
    spriteStyle: 'thorn_dryad',
    lore: 'Once guardians of ancient oaks, now vessels of creeping jade spores.',
    selectIntent: ({ turn, woundedAllyExists, alliesCount, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 2 : difficulty === 'penance' ? 1 : 0;
      if (woundedAllyExists && alliesCount > 1 && turn % 2 === 0) {
        return {
          type: 'buff',
          label: 'Verdant Spores',
          healAllies: 6,
          blockAllies: 4,
        };
      }
      if (turn % 3 === 1) {
        return {
          type: 'debuff',
          label: 'Pollen Haze',
          status: 'poison',
          statusAmount: 3,
          block: 6,
        };
      }
      return {
        type: 'attack_debuff',
        label: 'Sap Fang',
        damage: 7 + dmgBoost,
        status: 'weak',
        statusAmount: 1,
      };
    },
  },
  hollow_archdruid: {
    id: 'hollow_archdruid',
    name: 'Sylvaris, Hollow Archdruid',
    title: 'Regional Boss',
    group: 'faction',
    factionName: 'The Blighted Circle',
    role: 'boss',
    tacticalArchetype: 'boss',
    mechanicHint: 'Calls a Briar Stalker on Turn 1 and awakens Overgrowth Thorns at 50% HP.',
    regionId: 'hollowwood',
    maxHp: 142,
    scale: 1.32,
    spriteStyle: 'hollow_archdruid',
    lore: 'Ancient grove-keeper whose staff roots deep into the poisoned soil of the Hollowwood.',
    phases: [
      {
        phaseNumber: 2,
        name: 'Heartroot Awakening',
        hpThresholdPct: 50,
        dialogue: 'Let the black roots drink your warmth!',
        onEnterSelfStatus: [
          { status: 'thorns', amount: 3 },
          { status: 'strength', amount: 2 },
        ],
        onEnterPlayerStatus: [{ status: 'poison', amount: 3 }],
        onEnterBlock: 14,
      },
    ],
    selectIntent: ({ turn, phase, alliesCount, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 1 : 0;
      if (turn === 1 && alliesCount < 2) {
        return {
          type: 'summon',
          label: 'Awaken Briar',
          summonEnemyId: 'briar_stalker',
          block: 8,
        };
      }
      if (phase >= 2 && turn % 2 === 0) {
        return {
          type: 'multi_attack',
          label: 'Root Tempest',
          damage: 6 + (difficulty === 'eclipse' ? 1 : 0),
          hits: 3,
          isCharged: true,
        };
      }
      if (turn % 3 === 2) {
        return {
          type: 'curse',
          label: 'Withered Bough',
          damage: 9 + dmgBoost,
          curseCardId: 'ashen_curse',
        };
      }
      return {
        type: 'attack_defend',
        label: 'Bark Bastion',
        damage: 11 + dmgBoost,
        block: 10,
      };
    },
  },

  // =========================================================================
  // REGION 5: THE DROWNED KINGDOM — SUNKEN COURT
  // =========================================================================
  abyssal_knight: {
    id: 'abyssal_knight',
    name: 'Abyssal Halberdier',
    group: 'faction',
    factionName: 'The Sunken Court',
    role: 'elite',
    tacticalArchetype: 'guardian',
    mechanicHint: 'Uses heavy Tideshield blocks and punishes unshielded foes.',
    regionId: 'drowned_kingdom',
    maxHp: 72,
    scale: 1.15,
    spriteStyle: 'abyssal_knight',
    lore: 'Barnacle-encrusted palace guards keeping eternal vigil over submerged marble halls.',
    selectIntent: ({ turn, playerBlock, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 1 : 0;
      if (turn % 3 === 1) {
        return {
          type: 'attack_defend',
          label: 'Tidewall Guard',
          damage: 10 + dmgBoost,
          block: 12,
        };
      }
      if (playerBlock < 6) {
        return {
          type: 'multi_attack',
          label: 'Riptide Halberd',
          damage: 7 + (difficulty === 'eclipse' ? 1 : 0),
          hits: 2,
          isCharged: true,
        };
      }
      return {
        type: 'attack_debuff',
        label: 'Crushing Undertow',
        damage: 11 + dmgBoost,
        status: 'frail',
        statusAmount: 2,
      };
    },
  },
  sunken_sovereign: {
    id: 'sunken_sovereign',
    name: 'King Aurelian, The Drowned',
    title: 'Regional Boss',
    group: 'faction',
    factionName: 'The Sunken Court',
    role: 'boss',
    tacticalArchetype: 'boss',
    mechanicHint: 'Rallies an Abyssal Halberdier or bolsters Court Ward; surges at 50% HP.',
    regionId: 'drowned_kingdom',
    maxHp: 186,
    scale: 1.38,
    spriteStyle: 'sunken_sovereign',
    lore: 'Monarch of a forgotten coastal empire who drowned his own throne to outlast the Eclipse.',
    phases: [
      {
        phaseNumber: 2,
        name: 'Abyssal Coronation',
        hpThresholdPct: 50,
        dialogue: 'My crown rests beneath fathomless black water—join my court!',
        onEnterSelfStatus: [
          { status: 'strength', amount: 3 },
          { status: 'ward', amount: 2 },
        ],
        onEnterPlayerStatus: [{ status: 'frail', amount: 2 }],
        onEnterBlock: 18,
      },
    ],
    selectIntent: ({ turn, phase, alliesCount, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 2 : 0;
      if (turn === 1 && alliesCount < 2) {
        return {
          type: 'summon',
          label: 'Summon Royal Guard',
          summonEnemyId: 'drowned_acolyte',
          block: 10,
        };
      }
      if (phase >= 2 && turn % 2 === 0) {
        return {
          type: 'multi_attack',
          label: 'Deluge Decree',
          damage: 8 + (difficulty === 'eclipse' ? 1 : 0),
          hits: 3,
          isCharged: true,
        };
      }
      if (turn % 3 === 2) {
        return {
          type: 'curse',
          label: 'Weight of Fathoms',
          damage: 12 + dmgBoost,
          curseCardId: 'ashen_curse',
        };
      }
      return {
        type: 'attack_defend',
        label: 'Trident Judgment',
        damage: 15 + dmgBoost,
        block: 12,
      };
    },
  },

  // =========================================================================
  // REGION 6: THE SHATTERED HIGHLANDS — CRAG BEASTS & IRON BASTION
  // =========================================================================
  crag_wyvern: {
    id: 'crag_wyvern',
    name: 'Crag Wyvern',
    group: 'creature',
    role: 'ordinary',
    tacticalArchetype: 'aggressor',
    mechanicHint: 'Builds Strength through Wing Gale before diving with multi-hit talons.',
    regionId: 'shattered_highlands',
    maxHp: 50,
    spriteStyle: 'crag_wyvern',
    lore: 'Razor-winged drakes nesting among fractured viaducts and storm clouds.',
    selectIntent: ({ turn, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 2 : difficulty === 'penance' ? 1 : 0;
      if (turn % 3 === 1) {
        return {
          type: 'buff',
          label: 'Thermals & Roar',
          selfStatus: 'strength',
          selfStatusAmount: 2,
          block: 8,
        };
      }
      if (turn % 3 === 2) {
        return {
          type: 'multi_attack',
          label: 'Gale Talons',
          damage: 6 + (difficulty === 'eclipse' ? 1 : 0),
          hits: 2,
        };
      }
      return {
        type: 'attack_debuff',
        label: 'Swooping Rend',
        damage: 11 + dmgBoost,
        status: 'bleed',
        statusAmount: 2,
      };
    },
  },
  storm_warden: {
    id: 'storm_warden',
    name: 'Thane Korin, Storm Warden',
    title: 'Regional Boss',
    group: 'faction',
    factionName: 'Highland Iron Bastion',
    role: 'boss',
    tacticalArchetype: 'boss',
    mechanicHint: 'Gains Ward & Thorns on defensive turns; channels Lightning Cleaves below 50% HP.',
    regionId: 'shattered_highlands',
    maxHp: 192,
    scale: 1.35,
    spriteStyle: 'storm_warden',
    lore: 'Commander of the cliff-top watchtowers who forged lightning rods into greatswords.',
    phases: [
      {
        phaseNumber: 2,
        name: 'Tempest Unbound',
        hpThresholdPct: 50,
        dialogue: 'The storm answers only steel! Face the thunderhead!',
        onEnterSelfStatus: [
          { status: 'strength', amount: 3 },
          { status: 'thorns', amount: 3 },
        ],
        onEnterPlayerStatus: [{ status: 'vulnerable', amount: 2 }],
        onEnterBlock: 16,
      },
    ],
    selectIntent: ({ turn, phase, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 2 : 0;
      if (phase >= 2 && turn % 2 === 1) {
        return {
          type: 'multi_attack',
          label: 'Thunderhead Greatsword',
          damage: 9 + (difficulty === 'eclipse' ? 1 : 0),
          hits: 3,
          isCharged: true,
        };
      }
      if (turn % 3 === 1) {
        return {
          type: 'attack',
          label: 'Tempest Breaker',
          damage: 16 + dmgBoost,
        };
      }
      if (turn % 3 === 2) {
        return {
          type: 'defend',
          label: 'Lightning Aegis',
          block: 16,
          selfStatus: 'ward',
          selfStatusAmount: 1,
        };
      }
      return {
        type: 'attack_debuff',
        label: 'Shockwave Slam',
        damage: 12 + dmgBoost,
        status: 'weak',
        statusAmount: 2,
      };
    },
  },

  // =========================================================================
  // REGION 7: THE VEILED CATACOMBS — ARCHIVISTS & CRYPT LORDS
  // =========================================================================
  sepulcher_wraith: {
    id: 'sepulcher_wraith',
    name: 'Sepulcher Wraith',
    group: 'creature',
    role: 'ordinary',
    tacticalArchetype: 'controller',
    mechanicHint: 'Controller: Begins with Ward and punishes greedy setups with Dread Curses.',
    regionId: 'veiled_catacombs',
    maxHp: 54,
    spriteStyle: 'sepulcher_wraith',
    lore: 'Lantern-bearing shades guarding forbidden tombs beneath the library vaults.',
    startingStatuses: { ward: 1 },
    selectIntent: ({ turn, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 2 : difficulty === 'penance' ? 1 : 0;
      if (turn % 3 === 0) {
        return {
          type: 'curse',
          label: 'Sepulcher Whisper',
          damage: 8 + dmgBoost,
          curseCardId: 'eclipse_dread',
        };
      }
      if (turn % 2 === 1) {
        return {
          type: 'attack_debuff',
          label: 'Chill Touch',
          damage: 10 + dmgBoost,
          status: 'weak',
          statusAmount: 2,
        };
      }
      return {
        type: 'defend',
        label: 'Spectral Shroud',
        block: 11,
        selfStatus: 'ward',
        selfStatusAmount: 1,
      };
    },
  },
  crypt_lord: {
    id: 'crypt_lord',
    name: 'Archivist Morvain, Crypt Lord',
    title: 'Regional Boss',
    group: 'faction',
    factionName: 'Veil Archivists',
    role: 'boss',
    tacticalArchetype: 'boss',
    mechanicHint: 'Stacks Ritual Strength and summons a Sepulcher Wraith at 55% HP.',
    regionId: 'veiled_catacombs',
    maxHp: 205,
    scale: 1.38,
    spriteStyle: 'crypt_lord',
    lore: 'Immortal keeper of sealed Veil scrolls whose gilded ribs shelter forbidden liturgy.',
    startingStatuses: { ritual: 1 },
    phases: [
      {
        phaseNumber: 2,
        name: 'Unsealed Vault',
        hpThresholdPct: 55,
        dialogue: 'Every forbidden tome awakens to claim your soul!',
        onEnterSelfStatus: [{ status: 'ritual', amount: 2 }],
        onEnterPlayerStatus: [{ status: 'vulnerable', amount: 2 }],
        onEnterBlock: 16,
        onEnterSummonId: 'sepulcher_wraith',
      },
    ],
    selectIntent: ({ turn, phase, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 2 : 0;
      if (phase >= 2 && turn % 2 === 0) {
        return {
          type: 'multi_attack',
          label: 'Liturgy of Ruin',
          damage: 8 + (difficulty === 'eclipse' ? 1 : 0),
          hits: 3,
          isCharged: true,
        };
      }
      if (turn % 3 === 1) {
        return {
          type: 'curse',
          label: 'Seal of Condemnation',
          damage: 13 + dmgBoost,
          curseCardId: 'eclipse_dread',
        };
      }
      if (turn % 3 === 2) {
        return {
          type: 'attack_defend',
          label: 'Ossuary Ward',
          damage: 14 + dmgBoost,
          block: 15,
        };
      }
      return {
        type: 'attack_debuff',
        label: 'Siphon Scroll',
        damage: 12 + dmgBoost,
        status: 'bleed',
        statusAmount: 3,
      };
    },
  },

  // =========================================================================
  // LEGENDARY CREATURES (RARE REGIONAL HUNTS)
  // =========================================================================
  gnarlmaw_behemoth: {
    id: 'gnarlmaw_behemoth',
    name: 'Grove-Stalker Gnarlmaw',
    title: 'Legendary Creature',
    group: 'creature',
    role: 'legendary',
    tacticalArchetype: 'aggressor',
    mechanicHint: 'Legendary: Sheds Thorns and crushes armored defenders with Rootbreaker Roar.',
    regionId: 'hollowwood',
    maxHp: 138,
    scale: 1.3,
    spriteStyle: 'gnarlmaw_behemoth',
    lore: 'An ancient apex predator fused with iron-oak heartwood that hunts intruders along forgotten trails.',
    startingStatuses: { thorns: 3 },
    selectIntent: ({ turn, playerBlock, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 1 : 0;
      if (playerBlock >= 12) {
        return {
          type: 'attack_debuff',
          label: 'Splintering Jaw',
          telegraphNote: 'Shattering heavy Block with Frail & Poison',
          damage: 14 + dmgBoost,
          status: 'frail',
          statusAmount: 2,
          isCharged: true,
        };
      }
      if (turn % 3 === 1) {
        return {
          type: 'multi_attack',
          label: 'Thorn Rampage',
          damage: 6 + (difficulty === 'eclipse' ? 1 : 0),
          hits: 3,
        };
      }
      return {
        type: 'attack_defend',
        label: 'Heartwood Carapace',
        damage: 11 + dmgBoost,
        block: 14,
        selfStatus: 'thorns',
        selfStatusAmount: 2,
      };
    },
  },
  sanctum_automaton: {
    id: 'sanctum_automaton',
    name: 'Clockwork Sanctum Warden',
    title: 'Legendary Construct',
    group: 'creature',
    role: 'legendary',
    tacticalArchetype: 'guardian',
    mechanicHint: 'Legendary: Charges Radiant Siege Beams behind Ward plates and heavy Block.',
    regionId: 'sunken_reliquary',
    maxHp: 150,
    scale: 1.28,
    spriteStyle: 'sanctum_automaton',
    lore: 'A gilded Reliquary guardian forged before the drowning, still enforcing forbidden vaults.',
    startingStatuses: { ward: 2 },
    selectIntent: ({ turn, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 2 : 0;
      if (turn % 3 === 0) {
        return {
          type: 'attack',
          label: 'Reliquary Siege Beam',
          telegraphNote: 'Charged cannon discharge',
          damage: 21 + dmgBoost,
          isCharged: true,
        };
      }
      if (turn % 3 === 2) {
        return {
          type: 'defend',
          label: 'Gilded Bulwark',
          block: 16,
          selfStatus: 'ward',
          selfStatusAmount: 1,
        };
      }
      return {
        type: 'attack_debuff',
        label: 'Piston Crush',
        damage: 12 + dmgBoost,
        status: 'weak',
        statusAmount: 2,
      };
    },
  },
  highland_colossus: {
    id: 'highland_colossus',
    name: 'Basalt Sky-Colossus',
    title: 'Legendary Titan',
    group: 'creature',
    role: 'legendary',
    tacticalArchetype: 'tactician',
    mechanicHint: 'Legendary: Braces with Stone Stance after heavy attack turns; punishes greedy setup.',
    regionId: 'shattered_highlands',
    maxHp: 168,
    scale: 1.34,
    spriteStyle: 'highland_colossus',
    lore: 'A storm-scarred monolith animated by ancient runic batteries overlooking the broken cliffs.',
    startingStatuses: { thorns: 2 },
    selectIntent: ({ turn, playerAttacksLastTurn = 0, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 2 : 0;
      if (playerAttacksLastTurn >= 3 && turn % 2 === 0) {
        return {
          type: 'defend',
          label: 'Monolith Brace',
          telegraphNote: 'Countering multi-attack pressure',
          block: 18,
          selfStatus: 'strength',
          selfStatusAmount: 2,
        };
      }
      if (turn % 3 === 1) {
        return {
          type: 'attack',
          label: 'Seismic Hammer',
          damage: 18 + dmgBoost,
          isCharged: true,
        };
      }
      return {
        type: 'attack_debuff',
        label: 'Gale Tremor',
        damage: 13 + dmgBoost,
        status: 'vulnerable',
        statusAmount: 2,
      };
    },
  },
  vespera_houndmaster: {
    id: 'vespera_houndmaster',
    name: 'Vespera’s Pack-Master',
    title: 'Legendary Stalker',
    group: 'faction',
    factionId: 'iron_penitent',
    factionName: 'Order of the Iron Penitent',
    role: 'legendary',
    tacticalArchetype: 'summoner',
    mechanicHint: 'Legendary: Hunts beside Ash Stalkers and empowers pack Bleed attacks.',
    regionId: 'ashen_marches',
    maxHp: 112,
    scale: 1.22,
    spriteStyle: 'vespera_houndmaster',
    lore: 'A rogue inquisitor who tames skeletal cinder-hounds along forgotten smuggler roads.',
    selectIntent: ({ turn, alliesCount, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 1 : 0;
      if (turn === 1 && alliesCount < 2) {
        return {
          type: 'summon',
          label: 'Unleash Cinder Pack',
          telegraphNote: 'Summoning pack stalker',
          summonEnemyId: 'ash_stalker',
          block: 8,
        };
      }
      if (alliesCount > 1 && turn % 3 === 2) {
        return {
          type: 'buff',
          label: 'Blood-Scent Whistle',
          telegraphNote: 'Empowering pack Strength',
          buffAlliesStatus: 'strength',
          buffAlliesAmount: 2,
          blockAllies: 6,
        };
      }
      return {
        type: 'multi_attack',
        label: 'Twin Chain-Lash',
        damage: 7 + (difficulty === 'eclipse' ? 1 : 0),
        hits: 2,
        status: 'bleed',
        statusAmount: 2,
      };
    },
  },

  // =========================================================================
  // OPTIONAL SECRET BOSSES (DISCOVERED VIA HIDDEN PATHS / RARE ENCOUNTERS)
  // =========================================================================
  pale_cartographer: {
    id: 'pale_cartographer',
    name: 'The Pale Cartographer',
    title: 'Secret Boss',
    group: 'faction',
    factionId: 'veil_archivists',
    factionName: 'Veil Archivists',
    role: 'secret_boss',
    tacticalArchetype: 'boss',
    mechanicHint: 'Secret Boss: Rewrites fate with Ward & Curses; ascends into Uncharted Severance below 55% HP.',
    regionId: 'veiled_catacombs',
    maxHp: 172,
    scale: 1.32,
    spriteStyle: 'pale_cartographer',
    lore: 'The immortal surveyor who inked the Veil’s first borders—and erased entire citadels from memory.',
    startingStatuses: { ward: 2 },
    phases: [
      {
        phaseNumber: 2,
        name: 'Redrawn Meridian',
        hpThresholdPct: 55,
        dialogue: 'Your path was never on my parchment—allow me to erase it.',
        onEnterSelfStatus: [
          { status: 'strength', amount: 3 },
          { status: 'ward', amount: 2 },
        ],
        onEnterPlayerStatus: [{ status: 'vulnerable', amount: 2 }],
        onEnterBlock: 16,
      },
    ],
    selectIntent: ({ turn, phase, lastIntentType, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 2 : 0;
      if (phase >= 2 && turn % 2 === 0) {
        return {
          type: 'multi_attack',
          label: 'Astral Compass Sever',
          telegraphNote: 'Precision phase barrage',
          damage: 7 + (difficulty === 'eclipse' ? 1 : 0),
          hits: 3,
          isCharged: true,
        };
      }
      if (turn % 3 === 1 && lastIntentType !== 'curse') {
        return {
          type: 'curse',
          label: 'Inked Sentence',
          telegraphNote: 'Binding Eclipse Dread curse',
          damage: 11 + dmgBoost,
          curseCardId: 'eclipse_dread',
        };
      }
      return {
        type: 'attack_defend',
        label: 'Meridian Ward',
        damage: 13 + dmgBoost,
        block: 14,
      };
    },
  },
  sunken_oracle: {
    id: 'sunken_oracle',
    name: 'Lyra, the Sunken Oracle',
    title: 'Secret Boss',
    group: 'faction',
    factionId: 'sunken_court',
    factionName: 'The Sunken Court',
    role: 'secret_boss',
    tacticalArchetype: 'boss',
    mechanicHint: 'Secret Boss: Commands Poison tides and Ritual chants; floods the arena below 50% HP.',
    regionId: 'drowned_kingdom',
    maxHp: 185,
    scale: 1.35,
    spriteStyle: 'sunken_oracle',
    lore: 'Prophetess sealed inside the Hollow Mirror chamber whose visions foresaw the Ashen Crown’s fall.',
    startingStatuses: { ritual: 1 },
    phases: [
      {
        phaseNumber: 2,
        name: 'Mirror Tide',
        hpThresholdPct: 50,
        dialogue: 'Look into the black water—see every future drown.',
        onEnterSelfStatus: [{ status: 'ritual', amount: 2 }],
        onEnterPlayerStatus: [{ status: 'poison', amount: 4 }],
        onEnterBlock: 18,
        onEnterSummonId: 'mire_leech',
      },
    ],
    selectIntent: ({ turn, phase, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 2 : 0;
      if (phase >= 2 && turn % 2 === 1) {
        return {
          type: 'multi_attack',
          label: 'Prophetic Deluge',
          damage: 8 + (difficulty === 'eclipse' ? 1 : 0),
          hits: 3,
          isCharged: true,
        };
      }
      if (turn % 3 === 2) {
        return {
          type: 'attack_debuff',
          label: 'Abyssal Omen',
          damage: 12 + dmgBoost,
          status: 'poison',
          statusAmount: 4,
        };
      }
      return {
        type: 'attack_defend',
        label: 'Glass Basin Ward',
        damage: 13 + dmgBoost,
        block: 15,
        selfStatus: 'ward',
        selfStatusAmount: 1,
      };
    },
  },
  hollowed_seraph: {
    id: 'hollowed_seraph',
    name: 'Seraph of the Hollowed Crown',
    title: 'Secret Boss',
    group: 'faction',
    factionId: 'eclipse_vanguard',
    factionName: 'Eclipse Vanguard',
    role: 'secret_boss',
    tacticalArchetype: 'boss',
    mechanicHint: 'Secret Boss: Dual-wing guardian weaving Ward, Burn, and multi-hit Solar Judgments.',
    regionId: 'obsidian_spire',
    maxHp: 215,
    scale: 1.4,
    spriteStyle: 'hollowed_seraph',
    lore: 'An unrecorded winged custodian guarding the false sun beneath the Obsidian Citadel.',
    startingStatuses: { ward: 2, thorns: 2 },
    phases: [
      {
        phaseNumber: 2,
        name: 'Fractured Halo',
        hpThresholdPct: 50,
        dialogue: 'If the Crown burns, let its ashes blind the world!',
        onEnterSelfStatus: [
          { status: 'strength', amount: 3 },
          { status: 'ward', amount: 2 },
        ],
        onEnterPlayerStatus: [{ status: 'burn', amount: 4 }],
        onEnterBlock: 20,
      },
    ],
    selectIntent: ({ turn, phase, difficulty }) => {
      const dmgBoost = difficulty === 'eclipse' ? 3 : difficulty === 'penance' ? 2 : 0;
      if (phase >= 2 && turn % 2 === 0) {
        return {
          type: 'multi_attack',
          label: 'Radiant Cataclysm',
          damage: 8 + (difficulty === 'eclipse' ? 1 : 0),
          hits: 4,
          isCharged: true,
        };
      }
      if (turn % 3 === 1) {
        return {
          type: 'attack_debuff',
          label: 'Cinder Pinion',
          damage: 15 + dmgBoost,
          status: 'burn',
          statusAmount: 4,
        };
      }
      return {
        type: 'defend',
        label: 'Ashen Wing Aegis',
        block: 18,
        selfStatus: 'ward',
        selfStatusAmount: 1,
      };
    },
  },
};

export function getEnemyDef(id: string): EnemyDef {
  return ENEMIES[id] ?? ENEMIES.ash_stalker;
}

const BACKLINE_ENEMY_IDS = new Set([
  'penitent_crossbowman',
  'drowned_acolyte',
  'choir_cantor',
  'prelate_vespera',
  'void_harpy',
  'rot_dryad',
  'sepulcher_wraith',
]);

const FRONTLINE_GUARD_IDS = new Set([
  'cinder_husk',
  'crypt_gorger',
  'basalt_sentinel',
  'abyssal_knight',
  'sanctum_automaton',
  'oathbreaker_captain',
  'iron_flagellant',
  'highland_colossus',
  'storm_warden',
]);

export function getEnemyDefaultPosition(def: EnemyDef): 'frontline' | 'backline' {
  if (def.defaultPosition) return def.defaultPosition;
  return BACKLINE_ENEMY_IDS.has(def.id) ? 'backline' : 'frontline';
}

export function doesEnemyGuardBackline(def: EnemyDef): boolean {
  if (typeof def.guardsBackline === 'boolean') return def.guardsBackline;
  return FRONTLINE_GUARD_IDS.has(def.id) || def.tacticalArchetype === 'guardian';
}

export function getLegendaryEnemiesForRegion(regionId: string): EnemyDef[] {
  const exact = Object.values(ENEMIES).filter(
    (e) => e.role === 'legendary' && e.regionId === regionId
  );
  if (exact.length > 0) return exact;
  return Object.values(ENEMIES).filter((e) => e.role === 'legendary');
}

export function getSecretBossForRegion(regionId: string): EnemyDef {
  const exact = Object.values(ENEMIES).find(
    (e) => e.role === 'secret_boss' && e.regionId === regionId
  );
  if (exact) return exact;
  if (regionId === 'sunken_reliquary' || regionId === 'drowned_kingdom') {
    return ENEMIES.sunken_oracle;
  }
  if (regionId === 'obsidian_spire' || regionId === 'shattered_highlands') {
    return ENEMIES.hollowed_seraph;
  }
  return ENEMIES.pale_cartographer;
}
