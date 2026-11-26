/**
 * Living World, Faction Reputation, Contracts, World Events, and Character Quest Manager.
 * Pure, deterministic state transitions preserving SaveDataV1 backward compatibility.
 */

import { getCharacterDef } from '../data/characters';
import {
  CONTRACTS,
  FACTIONS,
  getContractDef,
  getFactionDef,
  getFactionStandingTier,
  getRegionPrimaryFaction,
  WORLD_EVENTS,
} from '../data/factions';
import { getRegionDef } from '../data/regions';
import type {
  ActiveContractState,
  ContractDef,
  FactionId,
  FactionStandingTier,
  RunState,
  SaveDataV1,
  WorldEventDef,
  WorldEventId,
} from '../types/game';
import { SeededRNG } from './rng';

export function shiftFactionReputation(
  reputation: Record<FactionId, number>,
  factionId: FactionId,
  delta: number,
  applyRipple = true
): {
  nextReputation: Record<FactionId, number>;
  tierChanged?: { factionId: FactionId; tier: FactionStandingTier };
} {
  const next = { ...reputation };
  const clamp = (v: number) => Math.max(-100, Math.min(100, Math.round(v)));
  const prevTier = getFactionStandingTier(next[factionId] ?? 0);
  next[factionId] = clamp((next[factionId] ?? 0) + delta);
  const newTier = getFactionStandingTier(next[factionId]);

  if (applyRipple && Math.abs(delta) >= 4) {
    const def = getFactionDef(factionId);
    const rivalDelta = -Math.round(delta * 0.45);
    const allyDelta = Math.round(delta * 0.35);
    next[def.rivalFactionId] = clamp((next[def.rivalFactionId] ?? 0) + rivalDelta);
    next[def.alliedFactionId] = clamp((next[def.alliedFactionId] ?? 0) + allyDelta);
  }

  return {
    nextReputation: next,
    tierChanged: prevTier !== newTier ? { factionId, tier: newTier } : undefined,
  };
}

export function getRegionWorldModifiers(
  save: SaveDataV1,
  regionId: string
): {
  activeEvents: WorldEventDef[];
  enemyHpMult: number;
  enemyStartBlock: number;
  shopPriceMult: number;
  goldBonusMult: number;
} {
  const activeEvents = (save.worldState?.activeEvents ?? [])
    .map((entry) => WORLD_EVENTS[entry.eventId])
    .filter((ev): ev is WorldEventDef => Boolean(ev) && (ev.regionId === 'all' || ev.regionId === regionId));

  let enemyHpMult = 1;
  let enemyStartBlock = 0;
  let shopPriceMult = 1;
  let goldBonusMult = 1;

  for (const ev of activeEvents) {
    if (ev.enemyHpMult) enemyHpMult *= ev.enemyHpMult;
    if (ev.enemyStartBlock) enemyStartBlock += ev.enemyStartBlock;
    if (ev.shopPriceMult) shopPriceMult *= ev.shopPriceMult;
    if (ev.goldBonusMult) goldBonusMult *= ev.goldBonusMult;
  }

  return {
    activeEvents,
    enemyHpMult,
    enemyStartBlock,
    shopPriceMult,
    goldBonusMult,
  };
}

export function getMerchantFactionPricing(
  save: SaveDataV1,
  regionId: string
): {
  factionId: FactionId;
  tier: FactionStandingTier;
  priceMult: number;
  label: string;
  bonusCardId?: string;
} {
  const factionId = getRegionPrimaryFaction(regionId);
  const faction = getFactionDef(factionId);
  const rep = save.factionReputation?.[factionId] ?? 0;
  const tier = getFactionStandingTier(rep);

  if (tier === 'exalted') {
    return {
      factionId,
      tier,
      priceMult: 0.78,
      label: `${faction.shortName} Exalted (-22% & Sigil Card)`,
      bonusCardId: faction.exclusiveCardId,
    };
  }
  if (tier === 'favored') {
    return {
      factionId,
      tier,
      priceMult: 0.88,
      label: `${faction.shortName} Favored (-12%)`,
      bonusCardId: faction.exclusiveCardId,
    };
  }
  if (tier === 'hostile') {
    return {
      factionId,
      tier,
      priceMult: 1.2,
      label: `${faction.shortName} Hostile (+20% surcharge)`,
    };
  }
  if (tier === 'wary') {
    return {
      factionId,
      tier,
      priceMult: 1.08,
      label: `${faction.shortName} Wary (+8%)`,
    };
  }
  return {
    factionId,
    tier,
    priceMult: 1.0,
    label: `${faction.shortName} Neutral`,
  };
}

export function createActiveContract(contractId: string): ActiveContractState | undefined {
  const def = getContractDef(contractId);
  if (!def) return undefined;
  return {
    contractId: def.id,
    progress: 0,
    target: def.targetCount,
    completed: false,
    failed: false,
    claimed: false,
  };
}

export function getAvailableContractsForRegion(regionId: string): ContractDef[] {
  return CONTRACTS.filter((c) => !c.regionFilter || c.regionFilter.includes(regionId));
}

export function updateContractOnEvent(
  run: RunState,
  event:
    | { type: 'legendary_defeated' }
    | { type: 'leader_or_boss_defeated' }
    | { type: 'hidden_cleared' }
    | { type: 'elite_cleared' }
    | { type: 'shrine_or_library_visited' }
    | { type: 'rest_used' }
    | { type: 'boss_won' }
): RunState {
  const contract = run.activeContract;
  if (!contract || contract.failed || contract.completed) return run;
  const def = getContractDef(contract.contractId);
  if (!def) return run;

  if (def.type === 'no_rest_run' && event.type === 'rest_used') {
    return {
      ...run,
      activeContract: { ...contract, failed: true },
    };
  }

  let increment = 0;
  if (def.type === 'hunt_legendary' && event.type === 'legendary_defeated') increment = 1;
  if (def.type === 'defeat_faction_leader' && event.type === 'leader_or_boss_defeated') increment = 1;
  if (def.type === 'clear_hidden' && event.type === 'hidden_cleared') increment = 1;
  if (def.type === 'slay_elites' && event.type === 'elite_cleared') increment = 1;
  if (def.type === 'shrine_pilgrimage' && event.type === 'shrine_or_library_visited') increment = 1;
  if (def.type === 'win_expedition' && event.type === 'boss_won') increment = 1;
  if (def.type === 'no_rest_run' && event.type === 'boss_won' && !contract.failed) increment = 1;

  if (increment === 0) return run;
  const nextProgress = Math.min(contract.target, contract.progress + increment);
  return {
    ...run,
    activeContract: {
      ...contract,
      progress: nextProgress,
      completed: nextProgress >= contract.target,
    },
  };
}

export function evaluateCharacterQuestProgress(
  save: SaveDataV1,
  characterId: string,
  trigger:
    | 'elite_or_leader'
    | 'shrine_or_hidden'
    | 'hollowwood_or_library'
    | 'boss_victory'
): { nextSave: SaveDataV1; message?: string } {
  const charDef = getCharacterDef(characterId);
  const prog = save.characterProgress[characterId];
  if (!prog || prog.questCompleted) return { nextSave: save };

  const step = prog.questStep ?? 0;
  let nextStep = step;
  let completed = false;
  let message: string | undefined;

  if (characterId === 'vaelen') {
    if (step === 0 && trigger === 'elite_or_leader') {
      nextStep = 1;
      message = `Quest Advanced (${charDef.quest.title}): Stage I Complete`;
    } else if (step === 1 && trigger === 'shrine_or_hidden') {
      nextStep = 2;
      message = `Quest Advanced (${charDef.quest.title}): Stage II Complete`;
    } else if (step === 2 && trigger === 'boss_victory') {
      nextStep = 3;
      completed = true;
    }
  } else if (characterId === 'morwen') {
    if (step === 0 && (trigger === 'hollowwood_or_library' || trigger === 'shrine_or_hidden')) {
      nextStep = 1;
      message = `Quest Advanced (${charDef.quest.title}): Stage I Complete`;
    } else if (step === 1 && trigger === 'elite_or_leader') {
      nextStep = 2;
      message = `Quest Advanced (${charDef.quest.title}): Stage II Complete`;
    } else if (step === 2 && trigger === 'boss_victory') {
      nextStep = 3;
      completed = true;
    }
  } else if (characterId === 'kaelith') {
    if (step === 0 && trigger === 'shrine_or_hidden') {
      nextStep = 1;
      message = `Quest Advanced (${charDef.quest.title}): Stage I Complete`;
    } else if (step === 1 && trigger === 'elite_or_leader') {
      nextStep = 2;
      message = `Quest Advanced (${charDef.quest.title}): Stage II Complete`;
    } else if (step === 2 && trigger === 'boss_victory') {
      nextStep = 3;
      completed = true;
    }
  } else if (characterId === 'sylvarin') {
    if (step === 0 && (trigger === 'hollowwood_or_library' || trigger === 'shrine_or_hidden')) {
      nextStep = 1;
      message = `Quest Advanced (${charDef.quest.title}): Stage I Complete`;
    } else if (step === 1 && trigger === 'elite_or_leader') {
      nextStep = 2;
      message = `Quest Advanced (${charDef.quest.title}): Stage II Complete`;
    } else if (step === 2 && trigger === 'boss_victory') {
      nextStep = 3;
      completed = true;
    }
  } else if (characterId === 'vesperis') {
    if (step === 0 && (trigger === 'hollowwood_or_library' || trigger === 'shrine_or_hidden')) {
      nextStep = 1;
      message = `Quest Advanced (${charDef.quest.title}): Stage I Complete`;
    } else if (step === 1 && trigger === 'elite_or_leader') {
      nextStep = 2;
      message = `Quest Advanced (${charDef.quest.title}): Stage II Complete`;
    } else if (step === 2 && trigger === 'boss_victory') {
      nextStep = 3;
      completed = true;
    }
  } else if (characterId === 'orin') {
    if (step === 0 && trigger === 'elite_or_leader') {
      nextStep = 1;
      message = `Quest Advanced (${charDef.quest.title}): Stage I Complete`;
    } else if (step === 1 && trigger === 'shrine_or_hidden') {
      nextStep = 2;
      message = `Quest Advanced (${charDef.quest.title}): Stage II Complete`;
    } else if (step === 2 && trigger === 'boss_victory') {
      nextStep = 3;
      completed = true;
    }
  } else if (characterId === 'nyx') {
    if (step === 0 && (trigger === 'shrine_or_hidden' || trigger === 'hollowwood_or_library')) {
      nextStep = 1;
      message = `Quest Advanced (${charDef.quest.title}): Stage I Complete`;
    } else if (step === 1 && trigger === 'elite_or_leader') {
      nextStep = 2;
      message = `Quest Advanced (${charDef.quest.title}): Stage II Complete`;
    } else if (step === 2 && trigger === 'boss_victory') {
      nextStep = 3;
      completed = true;
    }
  }

  if (nextStep === step && !completed) return { nextSave: save };

  const unlockedAuras = new Set(prog.unlockedAuraStyles ?? ['default']);
  const unlockedQuestCards = new Set(save.unlockedQuestCards ?? []);

  if (completed) {
    unlockedAuras.add(charDef.quest.unlockedCosmeticId);
    unlockedQuestCards.add(charDef.quest.unlockedCardId);
    message = `Hero Quest Complete: Unlocked ${charDef.quest.cosmeticName} & signature Oath card!`;
  }

  return {
    nextSave: {
      ...save,
      unlockedQuestCards: Array.from(unlockedQuestCards),
      characterProgress: {
        ...save.characterProgress,
        [characterId]: {
          ...prog,
          questStep: nextStep,
          questCompleted: completed,
          unlockedAuraStyles: Array.from(unlockedAuras),
          selectedAuraStyle: completed ? charDef.quest.unlockedCosmeticId : prog.selectedAuraStyle,
        },
      },
    },
    message,
  };
}

export function advanceWorldStateAfterRun(
  save: SaveDataV1,
  run: RunState,
  victory: boolean
): SaveDataV1 {
  const rng = new SeededRNG(`${run.seed}:world:${save.totalRuns}:${victory}`);
  const prevWorld = save.worldState;
  const nextCount = (prevWorld?.expeditionCount ?? 0) + 1;
  const stability = { ...(prevWorld?.regionStability ?? {}) };
  const region = getRegionDef(run.regionId);
  const currentStab = stability[run.regionId] ?? 60;
  stability[run.regionId] = Math.max(
    15,
    Math.min(100, currentStab + (victory ? 16 : -8))
  );

  // Decay existing world events and roll a new event if fewer than 2 active
  const nextEvents = (prevWorld?.activeEvents ?? [])
    .map((e) => ({ ...e, remainingRuns: e.remainingRuns - 1 }))
    .filter((e) => e.remainingRuns > 0);

  const chronicle = [...(prevWorld?.recentChronicle ?? [])];
  if (victory) {
    chronicle.push(
      `Victory in ${region.name} bolstered regional stability to ${stability[run.regionId]}%.`
    );
  } else {
    chronicle.push(
      `Unchecked Veil pressure in ${region.name} pushed stability down to ${stability[run.regionId]}%.`
    );
  }

  const allEventIds = Object.keys(WORLD_EVENTS) as WorldEventId[];
  const activeSet = new Set(nextEvents.map((e) => e.eventId));
  const candidates = allEventIds.filter((id) => !activeSet.has(id));
  if (nextEvents.length < 2 && candidates.length > 0) {
    const pickedId = rng.pick(candidates);
    const ev = WORLD_EVENTS[pickedId];
    nextEvents.push({ eventId: pickedId, remainingRuns: ev.durationRuns });
    chronicle.push(`World Event: ${ev.name} — ${ev.tacticalEffect}`);
  }

  // Reputation & Contract resolution
  let nextRep = { ...(save.factionReputation ?? {}) } as Record<FactionId, number>;
  const completedContracts = new Set(save.completedContractIds ?? []);
  let contractShards = 0;

  // Regional faction responds gently to conquering their stronghold
  const primaryFaction = getRegionPrimaryFaction(run.regionId);
  if ((run.factionLeadersDefeatedThisRun?.length ?? 0) > 0) {
    nextRep = shiftFactionReputation(nextRep, primaryFaction, -8, true).nextReputation;
  } else if (victory) {
    nextRep = shiftFactionReputation(nextRep, primaryFaction, -4, false).nextReputation;
  }

  if (run.activeContract && run.activeContract.completed && !run.activeContract.claimed) {
    const cDef = getContractDef(run.activeContract.contractId);
    if (cDef) {
      completedContracts.add(cDef.id);
      contractShards += cDef.rewardShards;
      if (cDef.issuerFactionId) {
        nextRep = shiftFactionReputation(
          nextRep,
          cDef.issuerFactionId,
          cDef.rewardReputation,
          true
        ).nextReputation;
      }
      chronicle.push(`Contract Fulfilled: ${cDef.title} (+${cDef.rewardShards} Shards).`);
    }
  }

  const defeatedLegendaries = Array.from(
    new Set([...(save.defeatedLegendaries ?? []), ...(run.legendariesDefeatedThisRun ?? [])])
  );
  const defeatedSecretBosses = Array.from(
    new Set([...(save.defeatedSecretBosses ?? []), ...(run.secretBossesDefeatedThisRun ?? [])])
  );

  // Ensure every faction key exists
  for (const fId of Object.keys(FACTIONS) as FactionId[]) {
    if (typeof nextRep[fId] !== 'number') nextRep[fId] = 0;
  }

  return {
    ...save,
    soulShards: save.soulShards + contractShards,
    factionReputation: nextRep,
    completedContractIds: Array.from(completedContracts),
    defeatedLegendaries,
    defeatedSecretBosses,
    worldState: {
      expeditionCount: nextCount,
      activeEvents: nextEvents,
      regionStability: stability,
      recentChronicle: chronicle.slice(-5),
    },
  };
}
