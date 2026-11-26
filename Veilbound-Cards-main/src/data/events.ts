import type { EventDef } from '../types/game';

export const EVENTS: Record<string, EventDef> = {
  charred_forge: {
    id: 'charred_forge',
    title: 'The Charred Forge',
    regionIds: ['ashen_marches', 'shattered_highlands'],
    description:
      'Amidst collapsed battlements, a dwarven anvil still radiates stubborn heat. A pair of bellows rests beside cold tongs.',
    choices: [
      {
        id: 'temper_blade',
        label: 'Stoke the coals and temper a weapon',
        outcomeHint: 'Upgrade 1 random card in your deck.',
      },
      {
        id: 'vaelen_kindling',
        label: '[Vaelen] Channel Ember Oath into the hearth',
        outcomeHint: 'Upgrade 2 cards and gain +10 Max HP (lose 6 HP).',
        requiresCharacterId: 'vaelen',
      },
      {
        id: 'scavenge_ingots',
        label: 'Pry loose unmelted brass fittings',
        outcomeHint: 'Gain 45 Gold.',
      },
    ],
  },
  wandering_cartographer: {
    id: 'wandering_cartographer',
    title: 'The Blind Cartographer',
    regionIds: 'all',
    isRare: true,
    description:
      'A hooded surveyor traces relief lines onto tanned parchment with ash-stained fingers. "The road you see is only half the realm," she whispers.',
    choices: [
      {
        id: 'reveal_hidden',
        label: 'Trade 30 Gold for her hidden trail marks',
        outcomeHint: 'Lose 30 Gold. Reveals hidden branches on the map and grants 10 Soul Shards.',
        requiresMinGold: 30,
      },
      {
        id: 'kaelith_shadow_barter',
        label: '[Kaelith] Share Veil sightings',
        outcomeHint: 'Free: Reveals hidden branches on the map and adds a Rare card.',
        requiresCharacterId: 'kaelith',
      },
      {
        id: 'decline_walk',
        label: 'Rest briefly beside her lantern',
        outcomeHint: 'Heal 8 HP.',
      },
    ],
  },
  penitent_shrine: {
    id: 'penitent_shrine',
    title: 'Shrine of Iron Penance',
    regionIds: ['ashen_marches'],
    description:
      'A barbed reliquary stands in the road, its bowl filled with dried blood and tarnished silver coins.',
    choices: [
      {
        id: 'bleed_for_relic',
        label: 'Offer blood to the iron basin',
        outcomeHint: 'Lose 10 HP. Gain a random Relic.',
        requiresMinHp: 12,
      },
      {
        id: 'claim_tribute',
        label: 'Sweep the tarnished coins into your satchel',
        outcomeHint: 'Gain 55 Gold, but add Ashen Burden (Curse) to your deck.',
      },
      {
        id: 'pray_quietly',
        label: 'Bow in silence and move on',
        outcomeHint: 'Remove 1 card from your deck.',
      },
    ],
  },
  cursed_mirror: {
    id: 'cursed_mirror',
    title: 'Mirror of Fractured Oaths',
    regionIds: 'all',
    description:
      'A tall silvered glass stands untouched amidst the ruins. Your reflection holds a weapon you have never carried.',
    choices: [
      {
        id: 'transform_card',
        label: 'Reach into the glass to exchange a memory',
        outcomeHint: 'Transform 1 random starter Strike/Defend into an Uncommon or Rare card.',
      },
      {
        id: 'cross_class_gift',
        label: 'Shatter the frame to claim a foreign echo',
        outcomeHint: 'Gain an upgraded card from another character pool, lose 5 HP.',
        requiresMinHp: 6,
      },
      {
        id: 'veil_reflection',
        label: 'Steady your breath and walk past',
        outcomeHint: 'Gain 12 Soul Shards.',
      },
    ],
  },
  ember_cache: {
    id: 'ember_cache',
    title: 'Smuggler’s Ember Cache',
    regionIds: ['ashen_marches'],
    description:
      'Beneath a charred wagon lies a locked iron coffer wrapped in oiled cloth.',
    choices: [
      {
        id: 'force_lock',
        label: 'Break the lock with steel',
        outcomeHint: 'Gain 40 Gold and 1 random card.',
      },
      {
        id: 'companion_sniff',
        label: '[Summoning Card] Let your bound companion find the false bottom',
        outcomeHint: 'Gain 70 Gold and 15 Soul Shards.',
        requiresCardCategory: 'summoning',
      },
    ],
  },
  hollowwood_circle: {
    id: 'hollowwood_circle',
    title: 'The Rootbound Circle',
    regionIds: ['hollowwood'],
    description:
      'Bioluminescent mushrooms pulse around an ancient hollow oak. Offerings of bone and amber sap rest among its roots.',
    choices: [
      {
        id: 'commune_roots',
        label: 'Drink the amber sap from the hollow',
        outcomeHint: 'Gain +7 Max HP and heal 10 HP.',
      },
      {
        id: 'morwen_harvest',
        label: '[Morwen] Distill the weeping spores',
        outcomeHint: 'Upgrade 1 card and add a Rare card to your deck.',
        requiresCharacterId: 'morwen',
      },
      {
        id: 'map_roots',
        label: 'Follow the glowing rootways',
        outcomeHint: 'Reveals hidden branches on the map and grants +15 Gold.',
      },
    ],
  },
  sunken_confession: {
    id: 'sunken_confession',
    title: 'The Sunken Confessional',
    regionIds: ['sunken_reliquary', 'drowned_kingdom'],
    description:
      'Half-submerged oak booths lean against a mossy pillar. From behind the lattice, a drowned voice offers absolution.',
    choices: [
      {
        id: 'confess_burden',
        label: 'Surrender a regret to the water',
        outcomeHint: 'Remove 1 card from your deck and heal 6 HP.',
      },
      {
        id: 'morwen_tincture',
        label: '[Morwen] Harvest the luminescent vault mold',
        outcomeHint: 'Gain +8 Max HP and add a Rare card.',
        requiresCharacterId: 'morwen',
      },
      {
        id: 'salvage_censer',
        label: 'Take the silver censer',
        outcomeHint: 'Gain 60 Gold.',
      },
    ],
  },
  alchemists_cauldron: {
    id: 'alchemists_cauldron',
    title: 'Abandoned Distillate Vat',
    regionIds: ['sunken_reliquary', 'hollowwood'],
    description:
      'Greenish vapour curls from a stone alembic still simmering over cold blue flame.',
    choices: [
      {
        id: 'drink_elixir',
        label: 'Drink a measured sip of the distillate',
        outcomeHint: 'Heal 18 HP.',
      },
      {
        id: 'dip_cards',
        label: 'Anoint your deck in the arcane mist',
        outcomeHint: 'Upgrade 1 random card and gain 10 Soul Shards.',
      },
    ],
  },
  drowned_belfry: {
    id: 'drowned_belfry',
    title: 'The Drowned Belfry',
    regionIds: ['sunken_reliquary', 'drowned_kingdom'],
    isSecret: true,
    description:
      'A cracked bronze bell hangs just above the black tide. Its clapper pulses with a faint protective ward.',
    choices: [
      {
        id: 'ring_bell',
        label: 'Strike the bell once',
        outcomeHint: 'Gain a random Relic and 15 Soul Shards.',
      },
      {
        id: 'rest_belfry',
        label: 'Tend your wounds in the dry loft',
        outcomeHint: 'Heal 22 HP.',
      },
    ],
  },
  drowned_throne: {
    id: 'drowned_throne',
    title: 'Throne of Salt & Glass',
    regionIds: ['drowned_kingdom'],
    isRare: true,
    description:
      'A submerged dais holds an alabaster crown tangled in kelp and sunken gold chains.',
    choices: [
      {
        id: 'claim_crown_gold',
        label: 'Wrench the golden chains free',
        outcomeHint: 'Gain 75 Gold, but add Ashen Burden (Curse) to your deck.',
      },
      {
        id: 'swear_tide_oath',
        label: 'Kneel before the sunken dais',
        outcomeHint: 'Lose 8 HP. Gain a random Relic and reveal hidden branches.',
        requiresMinHp: 10,
      },
      {
        id: 'collect_pearls',
        label: 'Gather drifted Soul Shards quietly',
        outcomeHint: 'Gain 18 Soul Shards.',
      },
    ],
  },
  highland_beacon: {
    id: 'highland_beacon',
    title: 'Watchfire of the Broken Pass',
    regionIds: ['shattered_highlands'],
    description:
      'An ancient cliffside brazier stands unlit beside a wind-carved map stone overlooking the abyss.',
    choices: [
      {
        id: 'ignite_beacon',
        label: 'Relight the watchfire',
        outcomeHint: 'Heal 14 HP and reveal hidden map branches.',
      },
      {
        id: 'temper_at_wind',
        label: 'Sharpen your gear on the basalt stone',
        outcomeHint: 'Upgrade 1 random card and gain 25 Gold.',
      },
    ],
  },
  catacomb_scriptorium: {
    id: 'catacomb_scriptorium',
    title: 'Sealed Scriptorium',
    regionIds: ['veiled_catacombs'],
    isRare: true,
    description:
      'Row upon row of chained vellum tomes hum with dormant rituals beneath flickering violet candles.',
    choices: [
      {
        id: 'transcribe_ritual',
        label: 'Copy a forbidden Stance or Ritual',
        outcomeHint: 'Gain an upgraded Rare card; lose 6 HP.',
        requiresMinHp: 8,
      },
      {
        id: 'burn_curses',
        label: 'Cast cursed burdens into the consecrated brazier',
        outcomeHint: 'Remove 1 weak/Curse card and gain 12 Soul Shards.',
      },
    ],
  },
  whispering_obelisk: {
    id: 'whispering_obelisk',
    title: 'The Whispering Obelisk',
    regionIds: ['obsidian_spire', 'veiled_catacombs'],
    description:
      'Runes bleed warm gold across a towering shaft of volcanic glass, offering power in exchange for vitality.',
    choices: [
      {
        id: 'carve_oath',
        label: 'Bind a rune to your flesh',
        outcomeHint: 'Lose 10 HP. Gain Ashen Benediction (Mythic card).',
        requiresMinHp: 11,
      },
      {
        id: 'study_runes',
        label: 'Transcribe the ancient geometry',
        outcomeHint: 'Upgrade 2 random cards in your deck.',
      },
      {
        id: 'absorb_shards',
        label: 'Draw out the dormant Soul Shards',
        outcomeHint: 'Gain 25 Soul Shards.',
      },
    ],
  },
  eclipse_crucible: {
    id: 'eclipse_crucible',
    title: 'Crucible of the Eclipse',
    regionIds: ['obsidian_spire'],
    isRare: true,
    description:
      'A floating brazier burns with cold violet light beneath the eclipsed sky.',
    choices: [
      {
        id: 'reforge_deck',
        label: 'Cast a weakness into the brazier',
        outcomeHint: 'Remove 1 card and gain 40 Gold.',
      },
      {
        id: 'claim_relic',
        label: 'Pluck the glowing shard from the coals',
        outcomeHint: 'Lose 8 HP. Gain a random Relic.',
        requiresMinHp: 9,
      },
    ],
  },
};

export function getEventDef(id: string): EventDef {
  return EVENTS[id] ?? EVENTS.charred_forge;
}
