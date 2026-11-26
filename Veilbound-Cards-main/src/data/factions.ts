import type {
  ContractDef,
  FactionDef,
  FactionId,
  FactionStandingTier,
  RareEncounterDef,
  RareEncounterId,
  WorldEventDef,
  WorldEventId,
} from '../types/game';

export const FACTIONS: Record<FactionId, FactionDef> = {
  iron_penitent: {
    id: 'iron_penitent',
    name: 'Order of the Iron Penitent',
    shortName: 'Iron Penitent',
    leaderName: 'Captain Vorn & Malakor',
    leaderEnemyId: 'oathbreaker_captain',
    philosophy: 'Absolution is forged through cinder, iron chains, and relentless penance.',
    description:
      'Militant flagellants and siege-wardens patrolling the Ashen Marches. Disgraced knights who enforce tolls across scorched roads.',
    homeRegionIds: ['ashen_marches'],
    rivalFactionId: 'blighted_circle',
    alliedFactionId: 'iron_bastion',
    exclusiveRelicId: 'penitent_censer',
    exclusiveCardId: 'penitent_absolution',
    accentColor: '#D97706',
  },
  drowned_choir: {
    id: 'drowned_choir',
    name: 'Choir of the Drowned',
    shortName: 'Drowned Choir',
    leaderName: 'Prelate Vespera',
    leaderEnemyId: 'prelate_vespera',
    philosophy: 'Every oath sinks to salt; only those who sing beneath the tide endure.',
    description:
      'Cantors and tide-priests haunting the Sunken Reliquary. They guard submerged vaults and bind spirits to sunken bells.',
    homeRegionIds: ['sunken_reliquary'],
    rivalFactionId: 'veil_archivists',
    alliedFactionId: 'sunken_court',
    exclusiveRelicId: 'tidal_chime',
    exclusiveCardId: 'choir_dirge',
    accentColor: '#14B8A6',
  },
  blighted_circle: {
    id: 'blighted_circle',
    name: 'The Blighted Circle',
    shortName: 'Blighted Circle',
    leaderName: 'Archdruid Sylvan',
    leaderEnemyId: 'hollow_archdruid',
    philosophy: 'Rot is the oldest scripture; steel rusts while roots claim every throne.',
    description:
      'Exiled botanists and fungal druids tending the Poisoned Hollowwood. Hostile to iron industry, protective of living groves.',
    homeRegionIds: ['hollowwood'],
    rivalFactionId: 'iron_penitent',
    alliedFactionId: 'drowned_choir',
    exclusiveRelicId: 'spore_seal',
    exclusiveCardId: 'circle_bloom',
    accentColor: '#22C55E',
  },
  sunken_court: {
    id: 'sunken_court',
    name: 'The Sunken Court',
    shortName: 'Sunken Court',
    leaderName: 'Lord Thalor',
    leaderEnemyId: 'sunken_sovereign',
    philosophy: 'A kingdom beneath the waves never surrenders its crown to ash.',
    description:
      'Baronial knights and abyssal courtiers holding court in the flooded halls of the Drowned Kingdom.',
    homeRegionIds: ['drowned_kingdom'],
    rivalFactionId: 'iron_bastion',
    alliedFactionId: 'drowned_choir',
    exclusiveRelicId: 'abyssal_signet',
    exclusiveCardId: 'court_decree',
    accentColor: '#38BDF8',
  },
  iron_bastion: {
    id: 'iron_bastion',
    name: 'Highland Iron Bastion',
    shortName: 'Iron Bastion',
    leaderName: 'Thane Korin',
    leaderEnemyId: 'storm_warden',
    philosophy: 'When the sky fractures, raise thicker walls and strike first.',
    description:
      'Cliff-fortress defenders guarding the Shattered Highlands. Pragmatic mercenaries who respect proven strength.',
    homeRegionIds: ['shattered_highlands'],
    rivalFactionId: 'sunken_court',
    alliedFactionId: 'iron_penitent',
    exclusiveRelicId: 'bastion_buckler',
    exclusiveCardId: 'bastion_brace',
    accentColor: '#94A3B8',
  },
  veil_archivists: {
    id: 'veil_archivists',
    name: 'Veil Archivists',
    shortName: 'Veil Archivists',
    leaderName: 'Archivist Morvain',
    leaderEnemyId: 'crypt_lord',
    philosophy: 'History belongs to whoever controls the sealed ink and the hidden road.',
    description:
      'Scholars and bone-librarians charting secret passages beneath the Veiled Catacombs. Brokers of ancient Relics and Curses.',
    homeRegionIds: ['veiled_catacombs'],
    rivalFactionId: 'drowned_choir',
    alliedFactionId: 'eclipse_vanguard',
    exclusiveRelicId: 'archivist_monocle',
    exclusiveCardId: 'archivist_index',
    accentColor: '#A855F7',
  },
  eclipse_vanguard: {
    id: 'eclipse_vanguard',
    name: 'Eclipse Vanguard',
    shortName: 'Eclipse Vanguard',
    leaderName: 'Archon Kael & Malakor II',
    leaderEnemyId: 'archon_kael',
    philosophy: 'Let the sun extinguish so only sovereign will remains.',
    description:
      'Fanatic champions of the Obsidian Citadel and the Crown of Eclipse. Ruthless duelists loyal only to the Sovereign.',
    homeRegionIds: ['obsidian_citadel'],
    rivalFactionId: 'iron_bastion',
    alliedFactionId: 'veil_archivists',
    exclusiveRelicId: 'eclipse_brand',
    exclusiveCardId: 'eclipse_verdict',
    accentColor: '#F59E0B',
  },
};

export const FACTION_LIST: FactionDef[] = Object.values(FACTIONS);

export function getFactionDef(id: FactionId): FactionDef {
  return FACTIONS[id];
}

export function getFactionStandingTier(rep: number): FactionStandingTier {
  if (rep <= -35) return 'hostile';
  if (rep <= -10) return 'wary';
  if (rep < 15) return 'neutral';
  if (rep < 40) return 'favored';
  return 'exalted';
}

export function getStandingLabel(tier: FactionStandingTier): string {
  switch (tier) {
    case 'hostile':
      return 'Hostile';
    case 'wary':
      return 'Wary';
    case 'neutral':
      return 'Neutral';
    case 'favored':
      return 'Favored';
    case 'exalted':
      return 'Exalted';
  }
}

export function getRegionPrimaryFaction(regionId: string): FactionId {
  for (const faction of FACTION_LIST) {
    if (faction.homeRegionIds.includes(regionId)) return faction.id;
  }
  return 'iron_penitent';
}

export const WORLD_EVENTS: Record<WorldEventId, WorldEventDef> = {
  merchant_caravan_boom: {
    id: 'merchant_caravan_boom',
    name: 'Wayfarer Supply Convoy',
    regionId: 'ashen_marches',
    factionId: 'iron_penitent',
    description:
      'Armored supply wagons have reached the outer roads, lowering merchant prices across the Marches.',
    tacticalEffect: 'Merchant Shop prices -15% in the Ashen Marches.',
    shopPriceMult: 0.85,
    durationRuns: 2,
  },
  iron_convoy_embargo: {
    id: 'iron_convoy_embargo',
    name: 'Iron Convoy Embargo',
    regionId: 'ashen_marches',
    factionId: 'iron_penitent',
    description:
      'Penitent patrols have raised toll barricades along the scorched causeways.',
    tacticalEffect: 'Ordinary foes begin with +4 Block; Gold rewards +15%.',
    enemyStartBlock: 4,
    goldBonusMult: 1.15,
    durationRuns: 2,
  },
  blight_bloom_surge: {
    id: 'blight_bloom_surge',
    name: 'Blight Bloom Surge',
    regionId: 'hollowwood',
    factionId: 'blighted_circle',
    description:
      'Thick spore tides swell through the Hollowwood canopy, mutating woodland beasts.',
    tacticalEffect: 'Hollowwood foes gain +10% Max HP; Relic & Shard spoils increase.',
    enemyHpMult: 1.1,
    goldBonusMult: 1.2,
    durationRuns: 2,
  },
  choir_ritual_tide: {
    id: 'choir_ritual_tide',
    name: 'Choir Ritual Tide',
    regionId: 'sunken_reliquary',
    factionId: 'drowned_choir',
    description:
      'Midnight bells toll beneath the flooded chapels as Prelate cantors gather strength.',
    tacticalEffect: 'Drowned Choir foes start shielded (+5 Block); +15% Gold.',
    enemyStartBlock: 5,
    goldBonusMult: 1.15,
    durationRuns: 2,
  },
  highland_siege: {
    id: 'highland_siege',
    name: 'Highland Siege Readiness',
    regionId: 'shattered_highlands',
    factionId: 'iron_bastion',
    description:
      'Storm beacons flare across every crag, bracing garrisons and tightening supply.',
    tacticalEffect: 'Highland foes +10% Max HP; Shops charge +10% unless Favored.',
    enemyHpMult: 1.1,
    shopPriceMult: 1.1,
    durationRuns: 2,
  },
  veil_archive_unsealed: {
    id: 'veil_archive_unsealed',
    name: 'Unsealed Catacomb Vaults',
    regionId: 'veiled_catacombs',
    factionId: 'veil_archivists',
    description:
      'Archivists have unlocked lower scriptoriums, floodlighting secret routes and bounties.',
    tacticalEffect: 'Shops -15% cost in Catacombs and +20% Gold drops.',
    shopPriceMult: 0.85,
    goldBonusMult: 1.2,
    durationRuns: 2,
  },
  eclipse_convergence: {
    id: 'eclipse_convergence',
    name: 'Eclipse Convergence',
    regionId: 'obsidian_citadel',
    factionId: 'eclipse_vanguard',
    description:
      'Dark solar corona crowns the Citadel spires, empowering the Vanguard.',
    tacticalEffect: 'Citadel enemies +12% Max HP & +4 starting Block; +25% Gold.',
    enemyHpMult: 1.12,
    enemyStartBlock: 4,
    goldBonusMult: 1.25,
    durationRuns: 2,
  },
};

export const CONTRACTS: ContractDef[] = [
  {
    id: 'contract_legendary_hunt',
    title: 'Bounty: Apex Terror',
    issuerFactionId: 'iron_bastion',
    type: 'hunt_legendary',
    description: 'Track and slay a Legendary Creature stalking a hidden or wild lair.',
    targetCount: 1,
    rewardShards: 28,
    rewardGold: 60,
    rewardReputation: 18,
  },
  {
    id: 'contract_faction_leader',
    title: 'Headhunter: Break Command',
    issuerFactionId: 'veil_archivists',
    type: 'defeat_faction_leader',
    description: 'Defeat a Faction Leader or Boss champion during this expedition.',
    targetCount: 1,
    rewardShards: 24,
    rewardGold: 50,
    rewardReputation: 15,
  },
  {
    id: 'contract_hidden_survey',
    title: 'Archivist Survey: Hidden Ways',
    issuerFactionId: 'veil_archivists',
    type: 'clear_hidden',
    description: 'Uncover and visit at least 1 Hidden Branch node during the expedition.',
    targetCount: 1,
    rewardShards: 20,
    rewardGold: 45,
    rewardReputation: 16,
  },
  {
    id: 'contract_elite_gauntlet',
    title: 'Iron Vanguard Trial',
    issuerFactionId: 'iron_penitent',
    type: 'slay_elites',
    description: 'Clear 2 Elite, Stronghold, or Challenge encounters in a single run.',
    targetCount: 2,
    rewardShards: 26,
    rewardGold: 55,
    rewardReputation: 18,
  },
  {
    id: 'contract_shrine_pilgrim',
    title: 'Pilgrimage of Oaths',
    issuerFactionId: 'drowned_choir',
    type: 'shrine_pilgrimage',
    description: 'Visit 2 Shrines, Libraries, or Secret Altars to gather ancient lore.',
    targetCount: 2,
    rewardShards: 22,
    rewardGold: 40,
    rewardReputation: 16,
  },
  {
    id: 'contract_unbroken_march',
    title: 'Unbroken March',
    issuerFactionId: 'eclipse_vanguard',
    type: 'no_rest_run',
    description: 'Conquer the Region Boss without ever using a Rest Site.',
    targetCount: 1,
    rewardShards: 35,
    rewardGold: 75,
    rewardReputation: 20,
  },
  {
    id: 'contract_sovereign_conquest',
    title: 'Reclaim the Road',
    issuerFactionId: 'sunken_court',
    type: 'win_expedition',
    description: 'Defeat the Region Boss to stabilize regional trade and faction order.',
    targetCount: 1,
    rewardShards: 22,
    rewardGold: 45,
    rewardReputation: 14,
  },
];

export function getContractDef(id: string): ContractDef | undefined {
  return CONTRACTS.find((c) => c.id === id);
}

export const RARE_ENCOUNTERS: Record<RareEncounterId, RareEncounterDef> = {
  veiled_reliquary_broker: {
    id: 'veiled_reliquary_broker',
    title: 'The Veiled Reliquary Broker',
    subtitle: 'Rare Wanderer · Veil Archivists',
    factionId: 'veil_archivists',
    description:
      'A masked Archivist drags a brass-bound trunk behind a blind pack-hound. "Rare oaths are wasted on the dead," she murmurs, opening velvet trays of sealed curios.',
    choices: [
      {
        id: 'broker_buy_relic',
        label: 'Purchase a Sealed Relic (55 Gold)',
        outcomeHint: 'Lose 55 Gold. Gain a random Relic and +10 Veil Archivists reputation.',
        requiresMinGold: 55,
      },
      {
        id: 'broker_trade_curse',
        label: 'Accept a Sealed Secret Map for an Ashen Burden',
        outcomeHint: 'Reveal Hidden Branches + Secret Boss route, +25 Shards, add 1 Curse.',
      },
      {
        id: 'broker_part',
        label: 'Exchange road warnings and depart',
        outcomeHint: 'Gain +12 Soul Shards and +6 Veil Archivists reputation.',
      },
    ],
  },
  stranded_vanguard: {
    id: 'stranded_vanguard',
    title: 'Stranded Iron Outrider',
    subtitle: 'Rare Encounter · Iron Bastion',
    factionId: 'iron_bastion',
    description:
      'A wounded Bastion lancer kneels beside a splintered banner. His pack holds siege rations and an annotated dispatch.',
    choices: [
      {
        id: 'vanguard_aid',
        label: 'Share medical supplies (-8 HP)',
        outcomeHint: 'Lose 8 HP. Gain +16 Iron Bastion reputation, +1 Relic, and upgrade 1 card.',
        requiresMinHp: 10,
      },
      {
        id: 'vanguard_escort',
        label: 'Buy his dispatch map (35 Gold)',
        outcomeHint: 'Lose 35 Gold. Reveal Hidden Branches and gain +10 Iron Bastion reputation.',
        requiresMinGold: 35,
      },
      {
        id: 'vanguard_scavenge',
        label: 'Claim abandoned rations peacefully',
        outcomeHint: 'Heal +12 HP and gain +25 Gold.',
      },
    ],
  },
  archivist_scholar: {
    id: 'archivist_scholar',
    title: 'Traveling Pale Scholar',
    subtitle: 'Rare Scholar · Secret Lore',
    factionId: 'veil_archivists',
    description:
      'Perched atop a fallen obelisk, an ink-stained scholar copies runes from the mist. He recognizes the mark etched into your lantern.',
    choices: [
      {
        id: 'scholar_decode',
        label: 'Transcribe a Forbidden Treatise',
        outcomeHint: 'Add an upgraded Rare card to your deck and reveal Secret routes.',
      },
      {
        id: 'scholar_purify',
        label: 'Have him exorcise a Curse or weak technique',
        outcomeHint: 'Remove 1 card from your deck and gain +15 Soul Shards.',
      },
      {
        id: 'scholar_converse',
        label: 'Ask about the Secret Guardians of this realm',
        outcomeHint: 'Unlock Hidden Branches and gain +10 Veil Archivists reputation.',
      },
    ],
  },
  roaming_duelist: {
    id: 'roaming_duelist',
    title: 'Champion Outside the Stronghold',
    subtitle: 'Rare Encounter · Faction Envoy',
    factionId: 'eclipse_vanguard',
    description:
      'An armored champion waits alone beside a ruined milestone, sword planted in stone. "Prove your steel or walk the long road around."',
    choices: [
      {
        id: 'duelist_spar',
        label: 'Cross blades in an honorable duel',
        outcomeHint: 'Enter a high-reward Elite duel (Relic + Reputation + Gold).',
      },
      {
        id: 'duelist_parley',
        label: 'Offer 40 Gold in tribute for safe passage',
        outcomeHint: 'Lose 40 Gold. Gain +12 Eclipse Vanguard reputation and +10 Max HP.',
        requiresMinGold: 40,
      },
      {
        id: 'duelist_bypass',
        label: 'Slip past under veil of fog',
        outcomeHint: 'Gain +15 Gold and continue undisturbed.',
      },
    ],
  },
  hollow_mirror_pact: {
    id: 'hollow_mirror_pact',
    title: 'The Hollow Mirror Shrine',
    subtitle: 'Rare Anomaly · Secret Boss Omen',
    factionId: 'sunken_court',
    description:
      'A basin of black mercury reflects not your face, but a crowned phantom watching from an unseen chamber.',
    choices: [
      {
        id: 'mirror_unseal',
        label: 'Drink the cold reflection (-10 HP)',
        outcomeHint: 'Lose 10 HP. Reveal Secret Boss & Hidden paths, gain +20 Soul Shards & Relic.',
        requiresMinHp: 12,
      },
      {
        id: 'mirror_duplicate',
        label: 'Press your deck to the glass',
        outcomeHint: 'Upgrade 2 random cards in your deck.',
      },
      {
        id: 'mirror_leave',
        label: 'Shatter the basin rim and claim silver shards',
        outcomeHint: 'Gain +50 Gold and +10 Soul Shards.',
      },
    ],
  },
};

export function getRareEncounterDef(id: RareEncounterId): RareEncounterDef {
  return RARE_ENCOUNTERS[id];
}
