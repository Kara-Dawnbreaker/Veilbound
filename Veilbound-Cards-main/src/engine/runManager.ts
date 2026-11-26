/**
 * Expedition & Meta-Progression orchestrator.
 * Handles run creation, rewards, shops, rests, events, interactive world locations, and region unlocks.
 */

import {
  CARDS,
  getCardDef,
  getCrossPoolCardIds,
  getLibraryCardIds,
  getRewardableCardIds,
  getSpecialDropCardIds,
} from '../data/cards';
import { getCharacterDef } from '../data/characters';
import { getFactionDef, getRareEncounterDef, getRegionPrimaryFaction } from '../data/factions';
import { getBossRelicIds, getCollectibleRelicIds } from '../data/relics';
import { DIFFICULTIES, getRegionDef, getUnlockedRegionsOnVictory } from '../data/regions';
import type {
  CardInstance,
  CombatModifierId,
  DifficultyId,
  FactionId,
  InteractiveLocationState,
  MapNodeType,
  RareEncounterId,
  RewardState,
  RunState,
  SaveDataV1,
  ShopInventory,
} from '../types/game';
import { generateExpeditionMap, revealHiddenMapNodes, revealSecretBossNode } from './mapGenerator';
import { generateRunSeed, SeededRNG } from './rng';
import {
  advanceWorldStateAfterRun,
  createActiveContract,
  getMerchantFactionPricing,
  getRegionWorldModifiers,
} from './worldManager';

let cardUidCounter = 100;
export function createCardInstance(defId: string, upgraded = false): CardInstance {
  cardUidCounter += 1;
  return {
    uid: `deck_${Date.now().toString(36)}_${cardUidCounter}`,
    defId,
    upgraded,
  };
}

export interface HeroCombatOptions {
  heroAbilityUpgraded: boolean;
  heroAbilityAlternate: boolean;
  passiveAmplified: boolean;
  bonusEnergyTurn1: number;
  bonusDrawTurn1: number;
}

export function getHeroCombatOptions(save: SaveDataV1, characterId: string): HeroCombatOptions {
  const charDef = getCharacterDef(characterId);
  const meta = save.characterProgress[characterId];
  const unlocked = new Set(meta?.unlockedNodeIds ?? []);

  let heroAbilityUpgraded = false;
  let passiveAmplified = false;
  let bonusEnergyTurn1 = 0;
  let bonusDrawTurn1 = 0;

  for (const node of charDef.progressionNodes) {
    if (!unlocked.has(node.id)) continue;
    if (node.bonus.type === 'active_ability_upgrade') heroAbilityUpgraded = true;
    if (node.bonus.type === 'passive_amplify' || node.id === 'vaelen_relic_1') {
      passiveAmplified = true;
    }
    if (node.bonus.type === 'bonus_energy_t1') bonusEnergyTurn1 += node.bonus.amount;
    if (node.id === 'vaelen_passive_amp') bonusEnergyTurn1 += 1;
    if (node.bonus.type === 'starting_draw_turn_1') bonusDrawTurn1 += node.bonus.amount;
  }

  return {
    heroAbilityUpgraded,
    heroAbilityAlternate: Boolean(meta?.useAlternateAbility),
    passiveAmplified,
    bonusEnergyTurn1,
    bonusDrawTurn1,
  };
}

export function startNewRun(
  save: SaveDataV1,
  characterId: string,
  regionId: string,
  difficulty: DifficultyId,
  customSeed?: string,
  contractId?: string
): { nextSave: SaveDataV1; run: RunState } {
  const charDef = getCharacterDef(characterId);
  const meta = save.characterProgress[characterId];
  const unlockedNodes = new Set(meta?.unlockedNodeIds ?? []);

  let maxHp = charDef.maxHp;
  let gold = charDef.startingGold;
  const relics = [charDef.startingRelicId];
  const autoUpgradedIds = new Set<string>();
  const extraCards: { cardId: string; upgraded: boolean }[] = [];

  for (const node of charDef.progressionNodes) {
    if (!unlockedNodes.has(node.id)) continue;
    if (node.bonus.type === 'max_hp') maxHp += node.bonus.amount;
    if (node.bonus.type === 'starting_gold') gold += node.bonus.amount;
    if (node.bonus.type === 'starting_relic' && !relics.includes(node.bonus.relicId)) {
      relics.push(node.bonus.relicId);
    }
    if (node.bonus.type === 'upgrade_starter_card') {
      autoUpgradedIds.add(node.bonus.cardId);
    }
    if (node.bonus.type === 'starting_card_add') {
      extraCards.push({ cardId: node.bonus.cardId, upgraded: Boolean(node.bonus.upgraded) });
    }
  }

  const deck: CardInstance[] = charDef.startingDeck.map((cardId) => {
    let upgrade = false;
    if (autoUpgradedIds.has(cardId)) {
      upgrade = true;
      autoUpgradedIds.delete(cardId);
    }
    return createCardInstance(cardId, upgrade);
  });

  for (const ec of extraCards) {
    deck.push(createCardInstance(ec.cardId, ec.upgraded));
  }

  if (meta?.questCompleted && save.unlockedQuestCards?.includes(charDef.quest.unlockedCardId)) {
    deck.push(createCardInstance(charDef.quest.unlockedCardId, false));
  }

  const activeContract = contractId ? createActiveContract(contractId) : undefined;
  const seed = (customSeed ?? '').trim() || generateRunSeed();
  const revealHidden =
    relics.includes('cartographers_astrolabe') || relics.includes('archivist_monocle');
  const map = generateExpeditionMap(regionId, seed, revealHidden, {
    enableLegendary: true,
    forceLegendary: activeContract?.contractId === 'contract_legendary_hunt',
    enableSecretBoss: true,
  });

  const run: RunState = {
    runId: `run_${Date.now().toString(36)}`,
    seed,
    characterId,
    regionId,
    difficulty,
    hp: maxHp,
    maxHp,
    gold,
    earnedShards: 0,
    deck,
    relics,
    map,
    currentScreen: 'EXPEDITION_MAP',
    activeContract,
    selectedAuraStyle: meta?.selectedAuraStyle ?? 'default',
    turnsTakenTotal: 0,
    enemiesDefeated: 0,
    nodesCleared: 0,
    restUsedCount: 0,
    shrineVisitedCount: 0,
    hiddenClearedCount: 0,
    elitesClearedCount: 0,
    legendariesDefeatedThisRun: [],
    factionLeadersDefeatedThisRun: [],
    secretBossesDefeatedThisRun: [],
  };

  const nextSave: SaveDataV1 = {
    ...save,
    totalRuns: save.totalRuns + 1,
    characterProgress: {
      ...save.characterProgress,
      [characterId]: {
        ...save.characterProgress[characterId],
        runsAttempted: (save.characterProgress[characterId]?.runsAttempted ?? 0) + 1,
      },
    },
    activeRun: run,
  };

  return { nextSave, run };
}

export function getTurnOneBonusDraw(save: SaveDataV1, characterId: string): number {
  return getHeroCombatOptions(save, characterId).bonusDrawTurn1;
}

export interface RewardGenerationOptions {
  isLegendary?: boolean;
  isSecretBoss?: boolean;
  save?: SaveDataV1;
}

export function generateCombatRewards(
  run: RunState,
  isElite: boolean,
  isBoss: boolean,
  combatModifier: CombatModifierId = 'none',
  options: RewardGenerationOptions = {}
): RewardState {
  const rng = new SeededRNG(`${run.seed}:reward:${run.nodesCleared}:${run.enemiesDefeated}`);
  const diffMult = DIFFICULTIES.find((d) => d.id === run.difficulty)?.shardMultiplier ?? 1;
  const isLegendary = Boolean(options.isLegendary || combatModifier === 'legendary_hunt');
  const isSecretBoss = Boolean(options.isSecretBoss || combatModifier === 'secret_sanctum');
  const worldMods = options.save ? getRegionWorldModifiers(options.save, run.regionId) : null;
  const worldGoldMult = worldMods?.goldBonusMult ?? 1;

  let gold = isBoss ? rng.int(85, 110) : isElite ? rng.int(42, 60) : rng.int(22, 34);
  let baseShards = isBoss ? 25 : isElite ? 12 : 5;
  let upgradeOdds = isElite ? 0.35 : 0.12;
  let grantRelic = isElite || isBoss || isLegendary || isSecretBoss;
  let sourceLabel: string | undefined;

  if (combatModifier === 'monster_den') {
    gold = Math.round(gold * 1.5);
    baseShards += 5;
    upgradeOdds = 0.25;
    sourceLabel = 'Monster Den Plunder';
  } else if (combatModifier === 'stronghold') {
    gold += 28;
    baseShards += 10;
    upgradeOdds = 0.4;
    grantRelic = true;
    sourceLabel = 'Stronghold Spoils';
  } else if (combatModifier === 'challenge_frenzy') {
    gold += 30;
    baseShards = baseShards * 2 + 6;
    upgradeOdds = 0.75;
    if (rng.next() < 0.6) grantRelic = true;
    sourceLabel = 'Challenge Trial Spoils';
  } else if (isLegendary) {
    gold += 45;
    baseShards += 20;
    upgradeOdds = 0.75;
    grantRelic = true;
    sourceLabel = 'Legendary Hunt Trophy';
  } else if (isSecretBoss) {
    gold += 85;
    baseShards += 40;
    upgradeOdds = 1.0;
    grantRelic = true;
    sourceLabel = 'Secret Sanctum Trophy';
  }

  gold = Math.round(gold * worldGoldMult);
  const shards = Math.round(baseShards * diffMult);
  const pool = rng.shuffle(getRewardableCardIds(run.characterId));
  const selectedIds = pool.slice(0, 3);
  if (isSecretBoss) {
    const secretPool = getSpecialDropCardIds('secret_event', run.characterId);
    if (secretPool.length > 0 && !selectedIds.includes(secretPool[0])) {
      selectedIds[0] = rng.pick(secretPool);
    }
  } else if ((isBoss || isLegendary) && rng.next() < 0.35) {
    const bossPool = getSpecialDropCardIds('boss_drop', run.characterId);
    if (bossPool.length > 0 && !selectedIds.includes(bossPool[0])) {
      selectedIds[0] = rng.pick(bossPool);
    }
  }
  const cardChoices: CardInstance[] = selectedIds.map((id, idx) => {
    const upgraded =
      ((combatModifier === 'challenge_frenzy' || isLegendary || isSecretBoss) && idx === 0) ||
      rng.next() < upgradeOdds;
    return createCardInstance(id, upgraded);
  });

  let relicId: string | undefined;
  if (grantRelic) {
    if (isSecretBoss) {
      const secretPreferred =
        run.regionId === 'obsidian_spire' || run.regionId === 'shattered_highlands'
          ? 'seraph_feather'
          : 'pale_compass';
      if (!run.relics.includes(secretPreferred)) {
        relicId = secretPreferred;
      }
    } else if (isLegendary) {
      if (!run.relics.includes('gnarlmaw_heart')) {
        relicId = 'gnarlmaw_heart';
      }
    }
    if (!relicId) {
      const bossPool = isBoss || isSecretBoss ? getBossRelicIds().filter((id) => !run.relics.includes(id)) : [];
      const availableRelics =
        bossPool.length > 0 && rng.next() < 0.5
          ? bossPool
          : getCollectibleRelicIds().filter((id) => !run.relics.includes(id));
      if (availableRelics.length > 0) {
        relicId = rng.pick(availableRelics);
      }
    }
  }

  const primaryFaction = getRegionPrimaryFaction(run.regionId);
  const reputationDelta = isSecretBoss
    ? { factionId: primaryFaction, amount: 8 }
    : isLegendary
    ? { factionId: primaryFaction, amount: 10 }
    : undefined;

  return {
    gold,
    shards,
    cardChoices,
    relicId,
    cardPicked: false,
    relicPicked: !relicId,
    isBossReward: isBoss,
    isLegendaryReward: isLegendary,
    isSecretBossReward: isSecretBoss,
    sourceLabel,
    reputationDelta,
  };
}

export function generateShopInventory(run: RunState, save?: SaveDataV1): ShopInventory {
  const rng = new SeededRNG(`${run.seed}:shop:${run.nodesCleared}`);
  const ledgerMult = run.relics.includes('merchants_ledger') ? 0.75 : 1.0;
  const factionPricing = save ? getMerchantFactionPricing(save, run.regionId) : null;
  const worldPricingMult = save ? getRegionWorldModifiers(save, run.regionId).shopPriceMult : 1.0;
  const effectiveWorldMult =
    factionPricing && (factionPricing.tier === 'favored' || factionPricing.tier === 'exalted')
      ? Math.min(1, worldPricingMult)
      : worldPricingMult;

  const discount = Math.max(
    0.5,
    ledgerMult * (factionPricing?.priceMult ?? 1.0) * effectiveWorldMult
  );

  const ownPool = rng.shuffle(getRewardableCardIds(run.characterId));
  const crossPool = rng.shuffle(getCrossPoolCardIds(run.characterId));
  const chosenIds = [...ownPool.slice(0, 3), ...(crossPool.length > 0 ? [crossPool[0]] : [])];
  if (factionPricing?.bonusCardId && !chosenIds.includes(factionPricing.bonusCardId)) {
    chosenIds.push(factionPricing.bonusCardId);
  }

  const cards = chosenIds.map((cardId) => {
    const def = getCardDef(cardId);
    const basePrice =
      def.rarity === 'legendary'
        ? 155
        : def.rarity === 'secret'
        ? 150
        : def.rarity === 'mythic'
        ? 140
        : def.rarity === 'epic'
        ? 120
        : def.rarity === 'rare'
        ? 105
        : def.rarity === 'uncommon'
        ? 75
        : 50;
    const upgraded = rng.next() < 0.2;
    return {
      cardId,
      upgraded,
      price: Math.round((basePrice + (upgraded ? 20 : 0)) * discount),
      sold: false,
    };
  });

  const factionExclusiveRelic = factionPricing
    ? getFactionDef(factionPricing.factionId).exclusiveRelicId
    : undefined;
  const availableRelics = getCollectibleRelicIds().filter((id) => !run.relics.includes(id));
  const relicId =
    factionPricing &&
    (factionPricing.tier === 'favored' || factionPricing.tier === 'exalted') &&
    factionExclusiveRelic &&
    !run.relics.includes(factionExclusiveRelic)
      ? factionExclusiveRelic
      : availableRelics.length > 0
      ? rng.pick(availableRelics)
      : null;

  return {
    cards,
    relic: relicId
      ? {
          relicId,
          price: Math.round(rng.int(115, 145) * discount),
          sold: false,
        }
      : null,
    healPrice: Math.round(40 * discount),
    healUsed: false,
    removeCardPrice: Math.round(60 * discount),
    removeUsed: false,
    factionId: factionPricing?.factionId,
    factionDiscountLabel: factionPricing?.label,
  };
}

export function generateLocationState(
  run: RunState,
  nodeType: Extract<
    MapNodeType,
    'shrine' | 'library' | 'camp' | 'companion' | 'cursed_altar' | 'crossroads'
  > | 'rare_encounter',
  rareEncounterId?: RareEncounterId
): InteractiveLocationState {
  const rng = new SeededRNG(`${run.seed}:loc:${nodeType}:${run.nodesCleared}`);
  if (nodeType === 'rare_encounter' && rareEncounterId) {
    const rare = getRareEncounterDef(rareEncounterId);
    return {
      type: 'rare_encounter',
      rareEncounterId: rare.id,
      factionId: rare.factionId,
      title: rare.title,
      subtitle: rare.subtitle,
      description: rare.description,
    };
  }
  switch (nodeType) {
    case 'shrine':
      return {
        type: 'shrine',
        title: 'Ancient Shrine',
        subtitle: 'Blessings with Measured Sacrifice',
        description:
          'A weathered marble basin trembles with dormant oath-fire. Its inscription asks what you are willing to yield.',
      };
    case 'library': {
      const libPool = rng.shuffle(getLibraryCardIds(run.characterId));
      return {
        type: 'library',
        title: 'Forgotten Library',
        subtitle: 'Sealed Tomes of Tactics & Ritual',
        description:
          'Dust-cloaked lecterns hold intact treatises on Stances, Traps, Reactions, and Rituals waiting to be transcribed.',
        offeredCardIds: libPool.slice(0, 3),
      };
    }
    case 'camp':
      return {
        type: 'camp',
        title: 'Abandoned Camp',
        subtitle: 'Smoldering Bivouac',
        description:
          'Still-warm coals surround overturned supply crates. You can rest briefly, gather what lies open, or pry deeper into the packs.',
      };
    case 'companion': {
      const charSummonMap: Record<string, string> = {
        vaelen: 'summon_cinder_hound',
        morwen: 'summon_abyssal_wisp',
        kaelith: 'summon_veil_shade',
        sylvarin: 'hawk_whistle',
        vesperis: 'summon_astral_familiar',
        orin: 'summon_bastion_squire',
        nyx: 'summon_hollow_wraith',
      };
      const charSummon = charSummonMap[run.characterId] ?? 'ossuary_construct';
      const offered = rng.next() < 0.7 ? charSummon : 'ossuary_construct';
      return {
        type: 'companion',
        title: 'Companion Encounter',
        subtitle: 'A Bound Spirit Awaits',
        description:
          'From a circle of salt and ash, a stray Veilbound ally watches your lantern. Bind it to your deck or strengthen an existing pact.',
        offeredCompanionCardId: offered,
      };
    }
    case 'cursed_altar':
      return {
        type: 'cursed_altar',
        title: 'Cursed Altar',
        subtitle: 'Forbidden Bargain',
        description:
          'Dark obsidian veins pulse beneath a cracked crown seal. Great relics and rare power await those willing to carry a Curse.',
      };
    case 'crossroads':
    default: {
      const hiddenCount = Object.values(run.map.nodes).filter(
        (n) => n.isHiddenBranch && !n.revealed
      ).length;
      return {
        type: 'crossroads',
        title: 'Mist-Veiled Crossroads',
        subtitle: 'Survey Marker & Lookout',
        description:
          'A weathered waystone overlooks converging valleys. From this ridge, faint lantern-trails hidden from the main map become visible.',
        revealedHiddenCount: hiddenCount,
      };
    }
  }
}

export function resolveLocationChoice(
  run: RunState,
  choiceId: string
): {
  nextRun: RunState;
  summary: string;
  triggerAmbushIds?: string[];
  triggerEliteCombat?: boolean;
  discoveredSecretId?: string;
  reputationShift?: { factionId: FactionId; delta: number };
  sfxHint?: 'discover' | 'upgrade' | 'relic' | 'curse' | 'shrine' | 'companion' | 'heal';
} {
  const loc = run.activeLocation;
  const rng = new SeededRNG(`${run.seed}:locres:${loc?.type ?? 'none'}:${choiceId}:${run.nodesCleared}`);
  const next: RunState = {
    ...run,
    deck: run.deck.map((c) => ({ ...c })),
    relics: [...run.relics],
  };

  const grantRelic = (): string | null => {
    const avail = getCollectibleRelicIds().filter((id) => !next.relics.includes(id));
    if (avail.length === 0) return null;
    const id = rng.pick(avail);
    next.relics.push(id);
    if (id === 'cartographers_astrolabe') {
      next.map = revealHiddenMapNodes(next.map);
    }
    return id;
  };

  const upgradeRandom = (preferCategory?: string): string | null => {
    const candidates = next.deck.filter(
      (c) =>
        !c.upgraded &&
        CARDS[c.defId]?.upgraded &&
        (!preferCategory || getCardDef(c.defId).category === preferCategory)
    );
    if (candidates.length === 0) return null;
    const picked = rng.pick(candidates);
    picked.upgraded = true;
    return getCardDef(picked.defId).name;
  };

  const removeWeakOrCurse = (): string | null => {
    const curseIdx = next.deck.findIndex((c) => getCardDef(c.defId).category === 'curse');
    const weakIdx = next.deck.findIndex((c) => c.defId === 'strike' || c.defId === 'defend');
    const idx = curseIdx !== -1 ? curseIdx : weakIdx !== -1 ? weakIdx : 0;
    if (next.deck.length <= 5) return null;
    const [removed] = next.deck.splice(idx, 1);
    return getCardDef(removed.defId).name;
  };

  let summary = 'You continue along the expedition path.';
  let triggerAmbushIds: string[] | undefined;
  let triggerEliteCombat: boolean | undefined;
  let discoveredSecretId: string | undefined;
  let reputationShift: { factionId: FactionId; delta: number } | undefined;
  let sfxHint: 'discover' | 'upgrade' | 'relic' | 'curse' | 'shrine' | 'companion' | 'heal' = 'shrine';

  if (loc?.type === 'rare_encounter') {
    if (choiceId === 'broker_buy_relic') {
      next.gold = Math.max(0, next.gold - 55);
      const relicId = grantRelic();
      reputationShift = { factionId: 'veil_archivists', delta: 10 };
      summary = relicId
        ? 'Purchased a Sealed Relic (+10 Veil Archivists reputation).'
        : 'All relics collected; broker returned +20 Soul Shards (+10 Veil Archivists).';
      if (!relicId) next.earnedShards += 20;
      sfxHint = 'relic';
    } else if (choiceId === 'broker_trade_curse') {
      next.map = revealSecretBossNode(revealHiddenMapNodes(next.map));
      next.earnedShards += 25;
      next.deck.push(createCardInstance('ashen_curse', false));
      discoveredSecretId = 'secret_boss_meridian_unsealed';
      summary = 'Unsealed Secret Boss & Hidden paths (+25 Shards), bound Ashen Burden (Curse).';
      sfxHint = 'curse';
    } else if (choiceId === 'broker_part') {
      next.earnedShards += 12;
      reputationShift = { factionId: 'veil_archivists', delta: 6 };
      summary = 'Exchanged ciphers for +12 Soul Shards and +6 Veil Archivists reputation.';
      sfxHint = 'discover';
    } else if (choiceId === 'vanguard_aid') {
      next.hp = Math.max(1, next.hp - 8);
      const relicId = grantRelic();
      const up = upgradeRandom();
      reputationShift = { factionId: 'iron_bastion', delta: 16 };
      summary = `Aided the outrider (-8 HP): +16 Iron Bastion rep${relicId ? ', claimed a Relic' : ''}${up ? `, upgraded ${up}` : ''}.`;
      sfxHint = 'relic';
    } else if (choiceId === 'vanguard_escort') {
      next.gold = Math.max(0, next.gold - 35);
      next.map = revealHiddenMapNodes(next.map);
      discoveredSecretId = 'vanguard_dispatch_map';
      reputationShift = { factionId: 'iron_bastion', delta: 10 };
      summary = 'Purchased the dispatch map: revealed Hidden Branches & +10 Iron Bastion rep.';
      sfxHint = 'discover';
    } else if (choiceId === 'vanguard_scavenge') {
      next.hp = Math.min(next.maxHp, next.hp + 12);
      next.gold += 25;
      summary = 'Salvaged rations peacefully (+12 HP, +25 Gold).';
      sfxHint = 'heal';
    } else if (choiceId === 'scholar_decode') {
      const rares = getRewardableCardIds(next.characterId).filter((id) => getCardDef(id).rarity === 'rare');
      const cardId = rng.pick(rares.length > 0 ? rares : getRewardableCardIds(next.characterId));
      next.deck.push(createCardInstance(cardId, true));
      next.map = revealSecretBossNode(revealHiddenMapNodes(next.map));
      discoveredSecretId = 'secret_scholar_cipher';
      summary = `Decoded ${getCardDef(cardId).name}+ and revealed Hidden & Secret Sanctum routes.`;
      sfxHint = 'discover';
    } else if (choiceId === 'scholar_purify') {
      const removed = removeWeakOrCurse();
      next.earnedShards += 15;
      summary = removed
        ? `Exorcised ${removed} from your deck (+15 Soul Shards).`
        : 'Gained +15 Soul Shards from the Pale Scholar.';
      sfxHint = 'shrine';
    } else if (choiceId === 'scholar_converse') {
      next.map = revealSecretBossNode(revealHiddenMapNodes(next.map));
      discoveredSecretId = 'secret_scholar_cipher';
      reputationShift = { factionId: 'veil_archivists', delta: 10 };
      summary = 'Revealed Secret Boss & Hidden paths (+10 Veil Archivists reputation).';
      sfxHint = 'discover';
    } else if (choiceId === 'duelist_spar') {
      triggerAmbushIds = ['vanguard_duelist'];
      triggerEliteCombat = true;
      reputationShift = { factionId: 'eclipse_vanguard', delta: 6 };
      summary = 'You draw your weapon to honor the Duelist’s challenge!';
    } else if (choiceId === 'duelist_parley') {
      next.gold = Math.max(0, next.gold - 40);
      next.maxHp += 10;
      next.hp = Math.min(next.maxHp, next.hp + 10);
      reputationShift = { factionId: 'eclipse_vanguard', delta: 12 };
      summary = 'Paid 40 Gold in tribute: +12 Eclipse Vanguard rep and +10 Max HP.';
      sfxHint = 'heal';
    } else if (choiceId === 'duelist_bypass') {
      next.gold += 15;
      summary = 'Slipped past under cover of mist (+15 Gold).';
      sfxHint = 'discover';
    } else if (choiceId === 'mirror_unseal') {
      next.hp = Math.max(1, next.hp - 10);
      next.map = revealSecretBossNode(revealHiddenMapNodes(next.map));
      next.earnedShards += 20;
      const relicId = grantRelic();
      discoveredSecretId = 'hollow_mirror_unsealed';
      summary = `Unsealed Secret Boss & Hidden routes (-10 HP, +20 Shards${relicId ? ', +1 Relic' : ''}).`;
      sfxHint = 'discover';
    } else if (choiceId === 'mirror_duplicate') {
      const u1 = upgradeRandom();
      const u2 = upgradeRandom();
      const upgradedList = [u1, u2].filter(Boolean).join(', ');
      summary = upgradedList
        ? `Mirror resonance upgraded: ${upgradedList}.`
        : 'All cards already tempered; gained +15 Soul Shards.';
      if (!upgradedList) next.earnedShards += 15;
      sfxHint = 'upgrade';
    } else {
      next.gold += 50;
      next.earnedShards += 10;
      summary = 'Shattered the silver basin (+50 Gold, +10 Soul Shards).';
      sfxHint = 'discover';
    }
  } else if (loc?.type === 'shrine') {
    if (choiceId === 'blood_blessing') {
      next.hp = Math.max(1, next.hp - 8);
      const relicId = grantRelic();
      if (relicId) {
        summary = 'Offered 8 HP to the basin and claimed a Relic.';
        sfxHint = 'relic';
      } else {
        next.gold += 60;
        summary = 'Offered 8 HP; the shrine returned 60 Gold.';
      }
    } else if (choiceId === 'vital_oath') {
      next.gold = Math.max(0, next.gold - 35);
      next.maxHp += 10;
      next.hp = Math.min(next.maxHp, next.hp + 10);
      summary = 'Anointed your vow for 35 Gold: +10 Max HP and healed 10 HP.';
      sfxHint = 'heal';
    } else {
      const removed = removeWeakOrCurse();
      if (removed) {
        summary = `Purged ${removed} in silent meditation.`;
      } else {
        next.hp = Math.min(next.maxHp, next.hp + 10);
        summary = 'Your deck is already lean; rested quietly for +10 HP.';
        sfxHint = 'heal';
      }
    }
  } else if (loc?.type === 'library') {
    if (choiceId.startsWith('learn_')) {
      const cardId = choiceId.replace('learn_', '');
      const cardDef = getCardDef(cardId);
      next.deck.push(createCardInstance(cardId, false));
      summary = `Transcribed ${cardDef.name} into your deck.`;
      sfxHint = 'discover';
    } else if (choiceId === 'study_upgrade') {
      const up = upgradeRandom();
      next.earnedShards += 8;
      summary = up
        ? `Annotated old diagrams: upgraded ${up} and recovered +8 Soul Shards.`
        : 'Studied ancient diagrams and recovered +8 Soul Shards.';
      sfxHint = 'upgrade';
    } else {
      const removed = removeWeakOrCurse();
      summary = removed
        ? `Burned an outdated scroll (${removed}) from your deck.`
        : 'Recovered +12 Soul Shards from marginalia.';
      if (!removed) next.earnedShards += 12;
      sfxHint = 'discover';
    }
  } else if (loc?.type === 'camp') {
    if (choiceId === 'scavenge_carefully') {
      next.gold += 30;
      next.hp = Math.min(next.maxHp, next.hp + 10);
      summary = 'Gathered 30 Gold and tended wounds beside the embers (+10 HP).';
      sfxHint = 'heal';
    } else if (choiceId === 'ransack_supplies') {
      const ambushRoll = rng.next();
      if (ambushRoll < 0.45) {
        next.gold += 40;
        const region = getRegionDef(next.regionId);
        triggerAmbushIds = rng.pick(region.ordinaryEncounterGroups);
        summary = 'Pocketed 40 Gold—then scavengers sprang from the mist!';
      } else {
        next.gold += 65;
        const pool = getRewardableCardIds(next.characterId).filter(
          (id) => getCardDef(id).rarity !== 'common'
        );
        const bonusCard = rng.pick(pool.length > 0 ? pool : getRewardableCardIds(next.characterId));
        next.deck.push(createCardInstance(bonusCard, false));
        summary = `Uncovered a hidden supply pack: +65 Gold and ${getCardDef(bonusCard).name}!`;
        sfxHint = 'discover';
      }
    } else {
      next.hp = Math.min(next.maxHp, next.hp + 18);
      summary = 'Rested undisturbed by the dying campfire (+18 HP).';
      sfxHint = 'heal';
    }
  } else if (loc?.type === 'companion') {
    const offeredId = loc.offeredCompanionCardId ?? 'ossuary_construct';
    if (choiceId === 'bind_companion') {
      next.deck.push(createCardInstance(offeredId, false));
      summary = `Bound ${getCardDef(offeredId).name} to your deck.`;
      sfxHint = 'companion';
    } else if (choiceId === 'attune_bond') {
      const up = upgradeRandom('summoning') ?? upgradeRandom();
      if (up) {
        next.hp = Math.min(next.maxHp, next.hp + 6);
        summary = `Deepened your pact: upgraded ${up} and restored 6 HP.`;
        sfxHint = 'upgrade';
      } else {
        next.earnedShards += 12;
        next.hp = Math.min(next.maxHp, next.hp + 10);
        summary = 'Shared quiet resonance with the spirit: +12 Soul Shards & +10 HP.';
      }
    } else {
      next.gold += 25;
      next.earnedShards += 8;
      summary = 'Accepted a parting token: +25 Gold and +8 Soul Shards.';
    }
  } else if (loc?.type === 'cursed_altar') {
    if (choiceId === 'dark_pact') {
      const relicId = grantRelic();
      next.gold += 45;
      next.deck.push(createCardInstance('void_shackle', false));
      summary = relicId
        ? 'Claimed a Relic and 45 Gold—Pact of Embers (Curse) bound to your deck.'
        : 'Claimed 85 Gold—Pact of Embers (Curse) bound to your deck.';
      if (!relicId) next.gold += 40;
      sfxHint = 'curse';
    } else if (choiceId === 'forbidden_tome') {
      const rares = getRewardableCardIds(next.characterId).filter((id) => getCardDef(id).rarity === 'rare');
      const cardId = rng.pick(rares.length > 0 ? rares : getRewardableCardIds(next.characterId));
      next.deck.push(createCardInstance(cardId, true));
      next.deck.push(createCardInstance('eclipse_dread', false));
      next.earnedShards += 15;
      summary = `Learned ${getCardDef(cardId).name}+ and +15 Soul Shards, cursed with Eclipse Dread.`;
      sfxHint = 'curse';
    } else {
      next.hp = Math.max(1, next.hp - 6);
      const removed = removeWeakOrCurse();
      next.earnedShards += 12;
      summary = removed
        ? `Paid 6 HP to shatter ${removed} upon the obsidian slab (+12 Soul Shards).`
        : 'Paid 6 HP to consecrate the altar (+12 Soul Shards).';
      sfxHint = 'shrine';
    }
  } else if (loc?.type === 'crossroads') {
    next.map = revealHiddenMapNodes(next.map);
    discoveredSecretId = 'crossroads_hidden_trail';
    if (choiceId === 'survey_secrets') {
      next.gold += 25;
      next.earnedShards += 10;
      summary = 'Charted hidden branches onto your map and recovered +25 Gold & +10 Soul Shards.';
      sfxHint = 'discover';
    } else {
      next.hp = Math.min(next.maxHp, next.hp + 12);
      summary = 'Charted hidden branches onto your map and rested at the lookout (+12 HP).';
      sfxHint = 'discover';
    }
  }

  if (next.activeLocation) {
    next.activeLocation = {
      ...next.activeLocation,
      resolvedSummary: summary,
    };
  }

  return {
    nextRun: next,
    summary,
    triggerAmbushIds,
    triggerEliteCombat,
    discoveredSecretId,
    reputationShift,
    sfxHint,
  };
}

export function resolveEventChoice(
  run: RunState,
  eventId: string,
  choiceId: string
): { nextRun: RunState; summary: string; discoveredSecretId?: string } {
  const rng = new SeededRNG(`${run.seed}:event:${eventId}:${choiceId}:${run.nodesCleared}`);
  const next: RunState = {
    ...run,
    deck: run.deck.map((c) => ({ ...c })),
    relics: [...run.relics],
  };

  const upgradeRandomCards = (count: number): string[] => {
    const upgradable = next.deck.filter((c) => !c.upgraded && CARDS[c.defId]?.upgraded);
    const picked = rng.shuffle(upgradable).slice(0, count);
    picked.forEach((c) => {
      c.upgraded = true;
    });
    return picked.map((c) => getCardDef(c.defId).name);
  };

  const grantRandomRelic = (): string | null => {
    const avail = getCollectibleRelicIds().filter((id) => !next.relics.includes(id));
    if (avail.length === 0) return null;
    const picked = rng.pick(avail);
    next.relics.push(picked);
    if (picked === 'cartographers_astrolabe') {
      next.gold += 15;
      next.map = revealHiddenMapNodes(next.map);
    }
    return picked;
  };

  const removeOneWeakCard = (): string | null => {
    const curseIdx = next.deck.findIndex((c) => getCardDef(c.defId).category === 'curse');
    const starterIdx = next.deck.findIndex((c) => c.defId === 'strike' || c.defId === 'defend');
    const idx = curseIdx !== -1 ? curseIdx : starterIdx !== -1 ? starterIdx : 0;
    if (next.deck.length <= 5) return null;
    const [removed] = next.deck.splice(idx, 1);
    return getCardDef(removed.defId).name;
  };

  let summary = 'You step back onto the shadowed trail.';
  let discoveredSecretId: string | undefined;

  switch (`${eventId}:${choiceId}`) {
    case 'charred_forge:temper_blade': {
      const names = upgradeRandomCards(1);
      summary = names.length > 0 ? `Tempered ${names[0]} into its upgraded form.` : 'All cards were already tempered; gained 20 Gold instead.';
      if (names.length === 0) next.gold += 20;
      break;
    }
    case 'charred_forge:vaelen_kindling': {
      next.hp = Math.max(1, next.hp - 6);
      next.maxHp += 10;
      next.hp += 10;
      const names = upgradeRandomCards(2);
      summary = `Ember Oath roared through the hearth: +10 Max HP and upgraded ${names.join(', ') || 'your resolve'}.`;
      break;
    }
    case 'charred_forge:scavenge_ingots':
      next.gold += 45;
      summary = 'Claimed 45 Gold from salvaged brass fittings.';
      break;

    case 'wandering_cartographer:reveal_hidden':
      next.gold = Math.max(0, next.gold - 30);
      next.map = revealHiddenMapNodes(next.map);
      next.earnedShards += 10;
      discoveredSecretId = 'hidden_cartography';
      summary = 'The Cartographer inked secret trails onto your map (+10 Soul Shards).';
      break;
    case 'wandering_cartographer:kaelith_shadow_barter': {
      next.map = revealHiddenMapNodes(next.map);
      const rarePool = getRewardableCardIds(next.characterId).filter((id) => getCardDef(id).rarity === 'rare');
      const cardId = rng.pick(rarePool.length > 0 ? rarePool : getRewardableCardIds(next.characterId));
      next.deck.push(createCardInstance(cardId, false));
      discoveredSecretId = 'hidden_cartography';
      summary = `Revealed the Hidden Branches and learned ${getCardDef(cardId).name}.`;
      break;
    }
    case 'wandering_cartographer:decline_walk':
      next.hp = Math.min(next.maxHp, next.hp + 8);
      summary = 'Warm lantern light restored 8 HP.';
      break;

    case 'penitent_shrine:bleed_for_relic': {
      next.hp = Math.max(1, next.hp - 10);
      const relicId = grantRandomRelic();
      summary = relicId ? `Offered blood and claimed a Relic.` : 'The basin accepted your blood and returned 50 Gold.';
      if (!relicId) next.gold += 50;
      break;
    }
    case 'penitent_shrine:claim_tribute':
      next.gold += 55;
      next.deck.push(createCardInstance('ashen_curse', false));
      summary = 'Gained 55 Gold, but Ashen Burden (Curse) now weighs on your deck.';
      break;
    case 'penitent_shrine:pray_quietly': {
      const removed = removeOneWeakCard();
      summary = removed ? `Purged ${removed} from your deck.` : 'Your deck is already lean; healed 6 HP.';
      if (!removed) next.hp = Math.min(next.maxHp, next.hp + 6);
      break;
    }

    case 'cursed_mirror:transform_card': {
      const idx = next.deck.findIndex((c) => c.defId === 'strike' || c.defId === 'defend');
      const targetIdx = idx !== -1 ? idx : 0;
      const pool = getRewardableCardIds(next.characterId).filter((id) => getCardDef(id).rarity !== 'common');
      const newId = rng.pick(pool);
      const oldName = getCardDef(next.deck[targetIdx].defId).name;
      next.deck[targetIdx] = createCardInstance(newId, false);
      summary = `Transformed ${oldName} into ${getCardDef(newId).name}.`;
      break;
    }
    case 'cursed_mirror:cross_class_gift': {
      next.hp = Math.max(1, next.hp - 5);
      const crossPool = getCrossPoolCardIds(next.characterId);
      const picked = rng.pick(crossPool);
      next.deck.push(createCardInstance(picked, true));
      discoveredSecretId = 'cross_veil_echo';
      summary = `Claimed ${getCardDef(picked).name}+ from beyond your order.`;
      break;
    }
    case 'cursed_mirror:veil_reflection':
      next.earnedShards += 12;
      summary = 'Distilled 12 Soul Shards from the still glass.';
      break;

    case 'ember_cache:force_lock': {
      next.gold += 40;
      const picked = rng.pick(getRewardableCardIds(next.characterId));
      next.deck.push(createCardInstance(picked, false));
      summary = `Recovered 40 Gold and ${getCardDef(picked).name}.`;
      break;
    }
    case 'ember_cache:companion_sniff':
      next.gold += 70;
      next.earnedShards += 15;
      summary = 'Your companion uncovered the false bottom: +70 Gold and +15 Soul Shards!';
      break;

    case 'hollowwood_circle:commune_roots':
      next.maxHp += 7;
      next.hp = Math.min(next.maxHp, next.hp + 10);
      summary = 'Amber sap invigorated your veins: +7 Max HP and healed 10 HP.';
      break;
    case 'hollowwood_circle:morwen_harvest': {
      const names = upgradeRandomCards(1);
      const rares = getRewardableCardIds(next.characterId).filter((id) => getCardDef(id).rarity === 'rare');
      const picked = rng.pick(rares.length > 0 ? rares : getRewardableCardIds(next.characterId));
      next.deck.push(createCardInstance(picked, false));
      summary = `Distilled weeping spores: upgraded ${names[0] ?? 'a formula'} and gained ${getCardDef(picked).name}.`;
      break;
    }
    case 'hollowwood_circle:map_roots':
      next.map = revealHiddenMapNodes(next.map);
      next.gold += 15;
      discoveredSecretId = 'hidden_cartography';
      summary = 'Followed glowing rootways: revealed hidden map branches and gained +15 Gold.';
      break;

    case 'sunken_confession:confess_burden': {
      const removed = removeOneWeakCard();
      next.hp = Math.min(next.maxHp, next.hp + 6);
      summary = removed ? `Purged ${removed} and healed 6 HP.` : 'Healed 12 HP in the quiet water.';
      if (!removed) next.hp = Math.min(next.maxHp, next.hp + 6);
      break;
    }
    case 'sunken_confession:morwen_tincture': {
      next.maxHp += 8;
      next.hp += 8;
      const rares = getRewardableCardIds(next.characterId).filter((id) => getCardDef(id).rarity === 'rare');
      const picked = rng.pick(rares.length > 0 ? rares : getRewardableCardIds(next.characterId));
      next.deck.push(createCardInstance(picked, false));
      summary = `Brewed luminous mold: +8 Max HP and gained ${getCardDef(picked).name}.`;
      break;
    }
    case 'sunken_confession:salvage_censer':
      next.gold += 60;
      summary = 'Salvaged 60 Gold from the silver censer.';
      break;

    case 'alchemists_cauldron:drink_elixir':
      next.hp = Math.min(next.maxHp, next.hp + 18);
      summary = 'The cold distillate restored 18 HP.';
      break;
    case 'alchemists_cauldron:dip_cards': {
      const names = upgradeRandomCards(1);
      next.earnedShards += 10;
      summary = `Anointed ${names[0] ?? 'your deck'} and absorbed 10 Soul Shards.`;
      break;
    }

    case 'drowned_belfry:ring_bell':
      grantRandomRelic();
      next.earnedShards += 15;
      discoveredSecretId = 'drowned_belfry_secret';
      summary = 'The bronze chime revealed a forgotten Relic and +15 Soul Shards.';
      break;
    case 'drowned_belfry:rest_belfry':
      next.hp = Math.min(next.maxHp, next.hp + 22);
      summary = 'Recovered 22 HP in the dry belfry loft.';
      break;

    case 'drowned_throne:claim_crown_gold':
      next.gold += 75;
      next.deck.push(createCardInstance('ashen_curse', false));
      summary = 'Claimed 75 Gold, though Ashen Burden (Curse) clings to your satchel.';
      break;
    case 'drowned_throne:swear_tide_oath': {
      next.hp = Math.max(1, next.hp - 8);
      next.map = revealHiddenMapNodes(next.map);
      const relicId = grantRandomRelic();
      discoveredSecretId = 'drowned_belfry_secret';
      summary = relicId
        ? 'Knelt before the dais (-8 HP): gained a Relic and revealed hidden branches.'
        : 'Knelt before the dais (-8 HP): revealed hidden branches and gained +40 Gold.';
      if (!relicId) next.gold += 40;
      break;
    }
    case 'drowned_throne:collect_pearls':
      next.earnedShards += 18;
      summary = 'Collected 18 Soul Shards from the flooded steps.';
      break;

    case 'highland_beacon:ignite_beacon':
      next.hp = Math.min(next.maxHp, next.hp + 14);
      next.map = revealHiddenMapNodes(next.map);
      discoveredSecretId = 'hidden_cartography';
      summary = 'Lit the cliffside watchfire: healed 14 HP and revealed hidden map routes.';
      break;
    case 'highland_beacon:temper_at_wind': {
      const names = upgradeRandomCards(1);
      next.gold += 25;
      summary = `Honed ${names[0] ?? 'your steel'} on basalt stone and pocketed 25 Gold.`;
      break;
    }

    case 'catacomb_scriptorium:transcribe_ritual': {
      next.hp = Math.max(1, next.hp - 6);
      const pool = getLibraryCardIds(next.characterId);
      const picked = rng.pick(pool.length > 0 ? pool : getRewardableCardIds(next.characterId));
      next.deck.push(createCardInstance(picked, true));
      summary = `Copied ${getCardDef(picked).name}+ (-6 HP).`;
      break;
    }
    case 'catacomb_scriptorium:burn_curses': {
      const removed = removeOneWeakCard();
      next.earnedShards += 12;
      summary = removed
        ? `Consigned ${removed} to the consecrated brazier and claimed +12 Soul Shards.`
        : 'Claimed +12 Soul Shards from the consecrated brazier.';
      break;
    }

    case 'whispering_obelisk:carve_oath':
      next.hp = Math.max(1, next.hp - 10);
      next.deck.push(createCardInstance('crown_resonance', false));
      summary = 'Bound the mythic card Ashen Benediction to your deck.';
      break;
    case 'whispering_obelisk:study_runes': {
      const names = upgradeRandomCards(2);
      summary = `Transcribed ancient runes: upgraded ${names.join(', ') || 'your deck'}.`;
      break;
    }
    case 'whispering_obelisk:absorb_shards':
      next.earnedShards += 25;
      summary = 'Absorbed 25 Soul Shards from the obelisk.';
      break;

    case 'eclipse_crucible:reforge_deck': {
      const removed = removeOneWeakCard();
      next.gold += 40;
      summary = removed ? `Burned away ${removed} and gained 40 Gold.` : 'Gained 55 Gold from the crucible.';
      if (!removed) next.gold += 15;
      break;
    }
    case 'eclipse_crucible:claim_relic':
      next.hp = Math.max(1, next.hp - 8);
      grantRandomRelic();
      summary = 'Withstood the cold fire and claimed a Relic.';
      break;
  }

  return { nextRun: next, summary, discoveredSecretId };
}

export function finalizeRunOutcome(
  save: SaveDataV1,
  run: RunState,
  victory: boolean
): SaveDataV1 {
  const diffMult = DIFFICULTIES.find((d) => d.id === run.difficulty)?.shardMultiplier ?? 1;
  const completionBonus = victory ? Math.round(35 * diffMult) : Math.round(run.nodesCleared * 2 * diffMult);
  const bankedShards = run.earnedShards + completionBonus;

  const unlockedRegions = new Set(save.unlockedRegions);
  const nextChars = { ...save.characterProgress };
  const charProg = nextChars[run.characterId];

  if (victory) {
    // Unlock all regions whose prerequisite is the conquered region
    for (const nextRegionId of getUnlockedRegionsOnVictory(run.regionId)) {
      unlockedRegions.add(nextRegionId);
    }
    // Also unlock Kaelith on first victory if still locked
    if (nextChars.kaelith && !nextChars.kaelith.unlocked) {
      nextChars.kaelith = { ...nextChars.kaelith, unlocked: true };
    }
  }

  nextChars[run.characterId] = {
    ...charProg,
    runsWon: charProg.runsWon + (victory ? 1 : 0),
    xp: charProg.xp + (victory ? 120 : run.nodesCleared * 15),
    highestDifficultyWon: victory
      ? pickHigherDifficulty(charProg.highestDifficultyWon, run.difficulty)
      : charProg.highestDifficultyWon,
  };

  const baseUpdated: SaveDataV1 = {
    ...save,
    soulShards: save.soulShards + bankedShards,
    unlockedRegions: Array.from(unlockedRegions),
    characterProgress: nextChars,
    totalVictories: save.totalVictories + (victory ? 1 : 0),
    activeRun: null,
  };

  return advanceWorldStateAfterRun(baseUpdated, run, victory);
}

function pickHigherDifficulty(a: DifficultyId | null, b: DifficultyId): DifficultyId {
  const order: DifficultyId[] = ['standard', 'penance', 'eclipse'];
  if (!a) return b;
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}
