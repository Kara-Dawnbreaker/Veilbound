import { useCallback, useEffect, useRef, useState } from 'react';
import { BestiaryView } from './components/BestiaryView';
import { CharacterSelect } from './components/CharacterSelect';
import { DeckModal } from './components/DeckModal';
import {
  EventView,
  InteractiveLocationView,
  RestView,
  RewardView,
  RunEndView,
  ShopView,
  TreasureView,
} from './components/EncounterViews';
import { ExpeditionMapView } from './components/ExpeditionMapView';
import { MainMenu } from './components/MainMenu';
import { OfflineIndicator } from './components/OfflineIndicator';
import { RunHeader } from './components/RunHeader';
import { SanctuaryView } from './components/SanctuaryView';
import { SettingsModal } from './components/SettingsModal';
import { BattleView } from './components/BattleView';
import { CARDS } from './data/cards';
import { getCharacterDef } from './data/characters';
import { getEnemyDef } from './data/enemies';
import { getContractDef } from './data/factions';
import { getCollectibleRelicIds } from './data/relics';
import { DIFFICULTIES, getRegionDef } from './data/regions';
import { audioEngine, type AmbienceTheme, type MusicState } from './engine/audioEngine';
import {
  endPlayerTurn,
  initializeCombat,
  playCardFromHand,
  selectEnemyTarget,
  useHeroAbility,
} from './engine/combatEngine';
import { COMBAT_TIMING, getCombatSpeedMultiplier } from './engine/combatTiming';
import { getReachableNodeIds, revealHiddenMapNodes } from './engine/mapGenerator';
import { SeededRNG } from './engine/rng';
import {
  createCardInstance,
  finalizeRunOutcome,
  generateCombatRewards,
  generateLocationState,
  generateShopInventory,
  getHeroCombatOptions,
  resolveEventChoice,
  resolveLocationChoice,
  startNewRun,
} from './engine/runManager';
import { loadSaveData, resetAllSaveData, saveGameData } from './engine/saveManager';
import {
  evaluateCharacterQuestProgress,
  getRegionWorldModifiers,
  shiftFactionReputation,
  updateContractOnEvent,
} from './engine/worldManager';
import type {
  CardInstance,
  CombatModifierId,
  CombatState,
  DifficultyId,
  GameSettings,
  HeroAuraStyle,
  RunState,
  SaveDataV1,
  ScreenId,
} from './types/game';

function grantContractGoldIfCompleted(prevRun: RunState, nextRun: RunState): RunState {
  if (
    !prevRun.activeContract?.completed &&
    nextRun.activeContract?.completed &&
    !nextRun.activeContract.failed
  ) {
    const def = getContractDef(nextRun.activeContract.contractId);
    if (def && def.rewardGold > 0) {
      return { ...nextRun, gold: nextRun.gold + def.rewardGold };
    }
  }
  return nextRun;
}

function collectDiscoveredCardIdsFromSave(saveState: SaveDataV1): string[] {
  const existing = saveState.discoveredCards ?? [];
  const run = saveState.activeRun;
  const extra: string[] = [...(saveState.unlockedQuestCards ?? [])];
  if (run) {
    for (const c of run.deck) extra.push(c.defId);
    if (run.activeReward) {
      for (const c of run.activeReward.cardChoices) extra.push(c.defId);
    }
    if (run.activeShop) {
      for (const slot of run.activeShop.cards) extra.push(slot.cardId);
    }
    if (run.activeLocation?.offeredCardIds) {
      extra.push(...run.activeLocation.offeredCardIds);
    }
    if (run.activeLocation?.offeredCompanionCardId) {
      extra.push(run.activeLocation.offeredCompanionCardId);
    }
    if (run.activeTreasure?.bonusCard) {
      extra.push(run.activeTreasure.bonusCard.defId);
    }
  }
  const merged = Array.from(new Set([...existing, ...extra.filter((id) => Boolean(CARDS[id]))]));
  return merged;
}

export default function App() {
  const [save, setSave] = useState<SaveDataV1>(() => loadSaveData());
  const [screen, setScreen] = useState<ScreenId>('MAIN_MENU');
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [runEndSummary, setRunEndSummary] = useState<{
    victory: boolean;
    run: RunState;
    bankedShards: number;
  } | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [deckModalMode, setDeckModalMode] = useState<'view' | 'upgrade' | 'remove' | null>(null);
  const [isResolvingTurn, setIsResolvingTurn] = useState(false);
  const [turnStepLabel, setTurnStepLabel] = useState<string | null>(null);
  const combatTimersRef = useRef<number[]>([]);

  const clearCombatTimers = useCallback(() => {
    for (const id of combatTimersRef.current) {
      window.clearTimeout(id);
    }
    combatTimersRef.current = [];
  }, []);

  const scheduleCombatTimer = useCallback((fn: () => void, delayMs: number) => {
    const id = window.setTimeout(fn, Math.max(0, Math.round(delayMs)));
    combatTimersRef.current.push(id);
    return id;
  }, []);

  // Sync audio settings & unlock Web Audio on first user interaction
  useEffect(() => {
    audioEngine.updateSettings(save.settings);
  }, [save.settings]);

  useEffect(() => {
    return () => {
      clearCombatTimers();
    };
  }, [clearCombatTimers]);

  useEffect(() => {
    const unlock = () => {
      audioEngine.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Suspend Web Audio when browser/PWA enters background and resume on foreground
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        audioEngine.suspendForBackground();
      } else {
        audioEngine.resumeFromForeground();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Sync dynamic music state & regional environmental ambience
  useEffect(() => {
    const regionAmbience: AmbienceTheme = save.activeRun
      ? getRegionDef(save.activeRun.regionId).ambientTheme
      : 'none';

    let nextMusic: MusicState = 'menu';
    let nextAmbience: AmbienceTheme = 'none';

    if (screen === 'SANCTUARY') {
      nextMusic = 'sanctuary';
      nextAmbience = 'sanctuary';
    } else if (screen === 'RUN_END') {
      nextMusic = runEndSummary?.victory ? 'victory' : 'defeat';
      nextAmbience = 'none';
    } else if (screen === 'COMBAT') {
      nextMusic = combat?.isBoss ? 'boss' : combat?.isElite ? 'elite' : 'combat';
      nextAmbience = regionAmbience;
    } else if (screen === 'CURSED_ALTAR') {
      nextMusic = 'discovery';
      nextAmbience = 'cursed';
    } else if (
      screen === 'TREASURE' ||
      screen === 'LIBRARY' ||
      screen === 'SHRINE' ||
      screen === 'COMPANION_ENCOUNTER' ||
      screen === 'CROSSROADS' ||
      screen === 'RARE_ENCOUNTER'
    ) {
      nextMusic = 'discovery';
      nextAmbience = regionAmbience;
    } else if (
      screen === 'EXPEDITION_MAP' ||
      screen === 'SHOP' ||
      screen === 'REST' ||
      screen === 'EVENT' ||
      screen === 'CAMP' ||
      screen === 'REWARD'
    ) {
      nextMusic = 'map';
      nextAmbience = regionAmbience;
    } else {
      nextMusic = 'menu';
      nextAmbience = 'none';
    }

    audioEngine.setMusicState(nextMusic);
    audioEngine.setAmbience(nextAmbience);
  }, [screen, save.activeRun?.regionId, combat?.isBoss, combat?.isElite, runEndSummary]);

  const persistSave = useCallback((next: SaveDataV1) => {
    const enriched: SaveDataV1 = {
      ...next,
      discoveredCards: collectDiscoveredCardIdsFromSave(next),
    };
    setSave(enriched);
  }, []);

  // Persist committed React state, never from inside a state updater. React may
  // invoke updater functions more than once in development Strict Mode.
  useEffect(() => {
    saveGameData(save);
  }, [save]);

  const updateActiveRun = useCallback(
    (updater: (run: RunState) => RunState, extraSavePatch?: Partial<SaveDataV1>) => {
      setSave((prev) => {
        if (!prev.activeRun) return prev;
        const draftSave: SaveDataV1 = {
          ...prev,
          ...(extraSavePatch ?? {}),
          activeRun: updater(prev.activeRun),
        };
        return {
          ...draftSave,
          discoveredCards: collectDiscoveredCardIdsFromSave(draftSave),
        };
      });
    },
    []
  );

  // =========================================================================
  // SETTINGS & META PROGRESSION HANDLERS
  // =========================================================================
  const handleUpdateSettings = (nextSettings: GameSettings) => {
    persistSave({ ...save, settings: nextSettings });
  };

  const handleResetSave = () => {
    clearCombatTimers();
    setIsResolvingTurn(false);
    setTurnStepLabel(null);
    const fresh = resetAllSaveData();
    setSave(fresh);
    setCombat(null);
    setScreen('MAIN_MENU');
    setShowSettings(false);
  };

  const handleUnlockCharacter = (characterId: string, cost: number) => {
    if (save.soulShards < cost) return;
    audioEngine.play('spell');
    persistSave({
      ...save,
      soulShards: save.soulShards - cost,
      characterProgress: {
        ...save.characterProgress,
        [characterId]: {
          ...save.characterProgress[characterId],
          unlocked: true,
        },
      },
    });
  };

  const handleUnlockNode = (characterId: string, nodeId: string, cost: number) => {
    const prog = save.characterProgress[characterId];
    if (!prog || save.soulShards < cost || prog.unlockedNodeIds.includes(nodeId)) return;
    const charDef = getCharacterDef(characterId);
    const nodeDef = charDef.progressionNodes.find((n) => n.id === nodeId);
    if (
      nodeDef?.exclusiveWithNodeId &&
      prog.unlockedNodeIds.includes(nodeDef.exclusiveWithNodeId)
    ) {
      return;
    }
    if (nodeDef?.requiresNodeId && !prog.unlockedNodeIds.includes(nodeDef.requiresNodeId)) {
      return;
    }
    audioEngine.play('spell');
    persistSave({
      ...save,
      soulShards: save.soulShards - cost,
      characterProgress: {
        ...save.characterProgress,
        [characterId]: {
          ...prog,
          unlockedNodeIds: [...prog.unlockedNodeIds, nodeId],
        },
      },
    });
  };

  const handleSelectAuraStyle = (characterId: string, aura: HeroAuraStyle) => {
    const prog = save.characterProgress[characterId];
    if (!prog || !(prog.unlockedAuraStyles ?? ['default']).includes(aura)) return;
    audioEngine.play('click');
    persistSave({
      ...save,
      characterProgress: {
        ...save.characterProgress,
        [characterId]: {
          ...prog,
          selectedAuraStyle: aura,
        },
      },
    });
  };

  const handleToggleAlternateAbility = (characterId: string) => {
    const prog = save.characterProgress[characterId];
    if (!prog || !prog.questCompleted) return;
    audioEngine.play('spell');
    persistSave({
      ...save,
      characterProgress: {
        ...save.characterProgress,
        [characterId]: {
          ...prog,
          useAlternateAbility: !prog.useAlternateAbility,
        },
      },
    });
  };

  const handleUnlockRegion = (regionId: string, cost: number) => {
    if (save.soulShards < cost || save.unlockedRegions.includes(regionId)) return;
    audioEngine.play('spell');
    persistSave({
      ...save,
      soulShards: save.soulShards - cost,
      unlockedRegions: [...save.unlockedRegions, regionId],
    });
  };

  // =========================================================================
  // RUN LIFECYCLE HANDLERS
  // =========================================================================
  const handleLaunchRun = (
    characterId: string,
    regionId: string,
    difficulty: DifficultyId,
    seed?: string,
    contractId?: string
  ) => {
    audioEngine.play('click');
    const { nextSave } = startNewRun(save, characterId, regionId, difficulty, seed, contractId);
    persistSave(nextSave);
    setCombat(null);
    setScreen('EXPEDITION_MAP');
  };

  const handleContinueRun = () => {
    if (!save.activeRun) return;
    audioEngine.play('click');
    const run = save.activeRun;
    if (run.currentScreen === 'COMBAT' && run.activeCombatEncounterIds) {
      if (run.activeCombatState) {
        setCombat(run.activeCombatState);
        setIsResolvingTurn(false);
        setTurnStepLabel(null);
        setScreen(run.currentScreen);
        return;
      }
      const heroOpts = getHeroCombatOptions(save, run.characterId);
      const worldMods = getRegionWorldModifiers(save, run.regionId);
      const initial = initializeCombat(
        run,
        run.activeCombatEncounterIds,
        Boolean(run.activeIsBoss),
        Boolean(run.activeIsElite),
        run.activeCombatModifier ?? 'none',
        {
          isLegendary: Boolean(run.activeIsLegendary),
          isSecretBoss: Boolean(run.activeIsSecretBoss),
          ...heroOpts,
          worldEnemyHpMult: worldMods.enemyHpMult,
          worldEnemyStartBlock: worldMods.enemyStartBlock,
        }
      );
      setCombat(initial);
      // Backward compatibility for saves created before combat snapshots existed.
      persistSave({ ...save, activeRun: { ...run, activeCombatState: initial } });
    }
    setScreen(run.currentScreen);
  };

  const startCombatForNode = (
    run: RunState,
    encounterIds: string[],
    isBoss: boolean,
    isElite: boolean,
    combatModifier: CombatModifierId = 'none',
    baseSave: SaveDataV1 = save,
    extraFlags?: { isLegendary?: boolean; isSecretBoss?: boolean }
  ) => {
    clearCombatTimers();
    setIsResolvingTurn(false);
    setTurnStepLabel(null);
    const updatedEnemies = Array.from(new Set([...baseSave.discoveredEnemies, ...encounterIds]));
    const isLegendary = Boolean(extraFlags?.isLegendary || combatModifier === 'legendary_hunt');
    const isSecretBoss = Boolean(extraFlags?.isSecretBoss || combatModifier === 'secret_sanctum');

    const nextRun: RunState = {
      ...run,
      currentScreen: 'COMBAT',
      activeCombatEncounterIds: encounterIds,
      activeCombatState: undefined,
      activeCombatModifier: combatModifier,
      activeIsBoss: isBoss,
      activeIsElite: isElite,
      activeIsLegendary: isLegendary,
      activeIsSecretBoss: isSecretBoss,
      activeLocation: undefined,
    };
    const nextSave: SaveDataV1 = {
      ...baseSave,
      discoveredEnemies: updatedEnemies,
      activeRun: nextRun,
    };
    persistSave(nextSave);

    const heroOpts = getHeroCombatOptions(nextSave, nextRun.characterId);
    const worldMods = getRegionWorldModifiers(nextSave, nextRun.regionId);
    const baseCombat = initializeCombat(nextRun, encounterIds, isBoss, isElite, combatModifier, {
      isLegendary,
      isSecretBoss,
      ...heroOpts,
      worldEnemyHpMult: worldMods.enemyHpMult,
      worldEnemyStartBlock: worldMods.enemyStartBlock,
    });
    setCombat(baseCombat);
    setScreen('COMBAT');
  };

  const handleSelectMapNode = (nodeId: string) => {
    if (!save.activeRun) return;
    const run = save.activeRun;
    const node = run.map.nodes[nodeId];
    if (!node || !getReachableNodeIds(run.map).includes(nodeId)) return;

    audioEngine.play(node.isHiddenBranch ? 'discover' : 'map_select');

    const updatedNodes = {
      ...run.map.nodes,
      [nodeId]: { ...node, visited: true },
    };
    const updatedMap = {
      ...run.map,
      nodes: updatedNodes,
      currentNodeId: nodeId,
    };

    let workingSave = save;
    let baseRun: RunState = {
      ...run,
      map: updatedMap,
      nodesCleared: run.nodesCleared + 1,
    };

    if (node.isHiddenBranch || node.type === 'hidden') {
      baseRun = {
        ...baseRun,
        hiddenClearedCount: (baseRun.hiddenClearedCount ?? 0) + 1,
      };
      baseRun = grantContractGoldIfCompleted(
        baseRun,
        updateContractOnEvent(baseRun, { type: 'hidden_cleared' })
      );
      workingSave = evaluateCharacterQuestProgress(
        workingSave,
        baseRun.characterId,
        'shrine_or_hidden'
      ).nextSave;
    }

    if (node.type === 'shrine' || node.type === 'library') {
      baseRun = {
        ...baseRun,
        shrineVisitedCount: (baseRun.shrineVisitedCount ?? 0) + 1,
      };
      baseRun = grantContractGoldIfCompleted(
        baseRun,
        updateContractOnEvent(baseRun, { type: 'shrine_or_library_visited' })
      );
      const qTrigger =
        baseRun.characterId === 'morwen' &&
        (baseRun.regionId === 'hollowwood' || node.type === 'library')
          ? 'hollowwood_or_library'
          : 'shrine_or_hidden';
      workingSave = evaluateCharacterQuestProgress(
        workingSave,
        baseRun.characterId,
        qTrigger
      ).nextSave;
    } else if (node.type === 'crossroads') {
      workingSave = evaluateCharacterQuestProgress(
        workingSave,
        baseRun.characterId,
        'shrine_or_hidden'
      ).nextSave;
    }

    if (
      node.type === 'combat' ||
      node.type === 'elite' ||
      node.type === 'boss' ||
      node.type === 'monster_den' ||
      node.type === 'stronghold' ||
      node.type === 'challenge'
    ) {
      const encounterIds = node.encounterIds ?? ['ash_stalker'];
      const isBoss = node.type === 'boss';
      const isElite =
        node.type === 'elite' ||
        node.type === 'stronghold' ||
        node.type === 'challenge' ||
        Boolean(node.isLegendary || node.isSecretBoss);
      startCombatForNode(
        baseRun,
        encounterIds,
        isBoss,
        isElite,
        node.combatModifier ?? 'none',
        workingSave,
        {
          isLegendary: Boolean(node.isLegendary),
          isSecretBoss: Boolean(node.isSecretBoss),
        }
      );
      return;
    }

    if (node.type === 'event' && node.rareEncounterId) {
      const location = generateLocationState(baseRun, 'rare_encounter', node.rareEncounterId);
      const nextRun: RunState = {
        ...baseRun,
        currentScreen: 'RARE_ENCOUNTER',
        activeLocation: location,
      };
      persistSave({ ...workingSave, activeRun: nextRun });
      setScreen('RARE_ENCOUNTER');
      return;
    }

    if (
      node.type === 'shrine' ||
      node.type === 'library' ||
      node.type === 'camp' ||
      node.type === 'companion' ||
      node.type === 'cursed_altar' ||
      node.type === 'crossroads'
    ) {
      const locScreenMap: Record<typeof node.type, ScreenId> = {
        shrine: 'SHRINE',
        library: 'LIBRARY',
        camp: 'CAMP',
        companion: 'COMPANION_ENCOUNTER',
        cursed_altar: 'CURSED_ALTAR',
        crossroads: 'CROSSROADS',
      };
      const targetScreen = locScreenMap[node.type];
      const location = generateLocationState(baseRun, node.type);
      const nextRun: RunState = {
        ...baseRun,
        currentScreen: targetScreen,
        activeLocation: location,
      };
      persistSave({ ...workingSave, activeRun: nextRun });
      setScreen(targetScreen);
      return;
    }

    if (node.type === 'shop') {
      const shop = generateShopInventory(baseRun, workingSave);
      const nextRun: RunState = { ...baseRun, currentScreen: 'SHOP', activeShop: shop };
      persistSave({ ...workingSave, activeRun: nextRun });
      setScreen('SHOP');
      return;
    }

    if (node.type === 'rest') {
      const nextRun: RunState = { ...baseRun, currentScreen: 'REST' };
      persistSave({ ...workingSave, activeRun: nextRun });
      setScreen('REST');
      return;
    }

    if (node.type === 'event') {
      const nextRun: RunState = {
        ...baseRun,
        currentScreen: 'EVENT',
        activeEventId: node.eventId ?? 'charred_forge',
        activeEventResult: undefined,
      };
      persistSave({ ...workingSave, activeRun: nextRun });
      setScreen('EVENT');
      return;
    }

    if (node.type === 'treasure' || node.type === 'hidden') {
      const rng = new SeededRNG(`${baseRun.seed}:treasure:${nodeId}`);
      const isHidden = node.type === 'hidden';
      const gold = isHidden ? rng.int(65, 95) : rng.int(40, 60);
      const shards = isHidden ? 20 : 5;
      const availRelics = getCollectibleRelicIds().filter((id) => !baseRun.relics.includes(id));
      const relicId = availRelics.length > 0 ? rng.pick(availRelics) : undefined;

      const nextRelics = relicId ? [...baseRun.relics, relicId] : [...baseRun.relics];
      let nextMap = baseRun.map;
      let extraGold = 0;
      if (relicId === 'cartographers_astrolabe') {
        extraGold = 15;
        nextMap = revealHiddenMapNodes(nextMap);
      }

      const treasurePayload = { isHidden, gold: gold + extraGold, shards, relicId };
      const nextRun: RunState = {
        ...baseRun,
        gold: baseRun.gold + gold + extraGold,
        earnedShards: baseRun.earnedShards + shards,
        relics: nextRelics,
        map: nextMap,
        currentScreen: 'TREASURE',
        activeTreasure: treasurePayload,
      };
      persistSave({
        ...workingSave,
        discoveredSecrets: isHidden
          ? Array.from(new Set([...workingSave.discoveredSecrets, `vault_${baseRun.regionId}`]))
          : workingSave.discoveredSecrets,
        activeRun: nextRun,
      });
      audioEngine.play(isHidden ? 'discover' : 'relic');
      setScreen('TREASURE');
    }
  };

  // =========================================================================
  // COMBAT ACTION HANDLERS
  // =========================================================================
  const processCombatResult = (prevCombat: CombatState, nextCombat: CombatState, isEndTurn = false) => {
    setCombat(nextCombat);
    const speedMult = getCombatSpeedMultiplier(save.settings);

    if (isEndTurn || nextCombat.phase === 'VICTORY' || nextCombat.phase === 'DEFEAT') {
      clearCombatTimers();
    }

    let maxDelayMs = 0;
    for (const ev of nextCombat.pendingVisualEvents) {
      const scaledDelayMs = (ev.delayMs ?? 0) * speedMult;
      if (scaledDelayMs > maxDelayMs) maxDelayMs = scaledDelayMs;
      const delaySec = scaledDelayMs / 1000;

      if (ev.stepLabel && isEndTurn) {
        const label = ev.stepLabel;
        scheduleCombatTimer(() => {
          setTurnStepLabel(label);
        }, scaledDelayMs);
      }

      if (ev.type === 'PLAYER_ATTACK') {
        if (ev.isCrit) audioEngine.play('crit', delaySec);
        else if (ev.animStyle === 'heavy_cleave' || ev.animStyle === 'bastion_slam')
          audioEngine.play('heavy_slash', delaySec);
        else if (ev.animStyle === 'arrow_shot') audioEngine.play('arrow', delaySec);
        else if (ev.animStyle === 'arcane_beam') audioEngine.play('arcane', delaySec);
        else if (ev.animStyle === 'pierce') audioEngine.play('pierce', delaySec);
        else if (ev.animStyle === 'fire_spell') audioEngine.play('fire', delaySec);
        else if (ev.animStyle === 'poison_spell') audioEngine.play('poison', delaySec);
        else if (ev.animStyle === 'shadow_spell') audioEngine.play('shadow', delaySec);
        else audioEngine.play('slash', delaySec);
      } else if (ev.type === 'ENEMY_PREPARE') {
        audioEngine.play('click', delaySec);
      } else if (ev.type === 'ENEMY_ATTACK') {
        audioEngine.play(ev.isCrit ? 'heavy_slash' : 'slash', delaySec);
      } else if (ev.type === 'DAMAGE_TAKEN') {
        audioEngine.play(ev.isCrit ? 'crit' : 'hit', delaySec);
      } else if (ev.type === 'DEFENSE_CAST' || ev.type === 'BLOCK_GAIN') {
        audioEngine.play('block', delaySec);
      } else if (ev.type === 'SPELL_CAST') {
        if (ev.animStyle === 'fire_spell') audioEngine.play('fire', delaySec);
        else if (ev.animStyle === 'poison_spell') audioEngine.play('poison', delaySec);
        else if (ev.animStyle === 'shadow_spell') audioEngine.play('shadow', delaySec);
        else if (ev.animStyle === 'arcane_beam') audioEngine.play('arcane', delaySec);
        else if (ev.animStyle === 'arrow_shot') audioEngine.play('arrow', delaySec);
        else if (ev.animStyle === 'bastion_slam') audioEngine.play('heavy_slash', delaySec);
        else audioEngine.play('spell', delaySec);
      } else if (ev.type === 'COMPANION_SUMMON' || ev.type === 'COMPANION_ACT') {
        audioEngine.play('companion', delaySec);
      } else if (ev.type === 'ALLY_SUPPORT') {
        audioEngine.play('support', delaySec);
      } else if (ev.type === 'HEAL') {
        audioEngine.play('heal', delaySec);
      } else if (ev.type === 'BOSS_PHASE') {
        audioEngine.play('boss_phase', delaySec);
      } else if (ev.type === 'TRAP_SET' || ev.type === 'TRAP_TRIGGER') {
        audioEngine.play('trap', delaySec);
      } else if (ev.type === 'REACTION_ARMED' || ev.type === 'REACTION_TRIGGER') {
        audioEngine.play('reaction', delaySec);
      } else if (ev.type === 'STANCE_CHANGE') {
        audioEngine.play('stance', delaySec);
      } else if (ev.type === 'RITUAL_SCHEDULED' || ev.type === 'RITUAL_RESOLVE') {
        audioEngine.play('ritual', delaySec);
      } else if (ev.type === 'HERO_ABILITY') {
        audioEngine.play('hero_ability', delaySec);
      } else if (ev.type === 'ENTITY_DEATH') {
        audioEngine.play('enemy_defeat', delaySec);
      }
    }

    if (!save.activeRun) return;
    const run = save.activeRun;

    // Save every non-terminal combat action so refresh/close restores the same
    // hand, piles, enemy HP/intents, energy, statuses, and turn counters.
    if (nextCombat.phase !== 'VICTORY' && nextCombat.phase !== 'DEFEAT') {
      persistSave({
        ...save,
        activeRun: { ...run, hp: nextCombat.playerHp, activeCombatState: nextCombat },
      });
    }

    if (nextCombat.phase === 'VICTORY') {
      const finishDelay = Math.max(700, maxDelayMs + COMBAT_TIMING.VICTORY_PADDING_MS * speedMult);
      audioEngine.play('victory', maxDelayMs / 1000);
      setIsResolvingTurn(true);
      setTurnStepLabel('Victory!');
      const healOnWin =
        (run.relics.includes('ember_phylactery') ? 6 : 0) +
        (run.relics.includes('spore_seal') ? 4 : 0) +
        (run.relics.includes('gnarlmaw_heart') ? 6 : 0);
      const finalHp = Math.min(run.maxHp, Math.max(1, nextCombat.playerHp + healOnWin));
      const reward = generateCombatRewards(
        run,
        nextCombat.isElite,
        nextCombat.isBoss,
        nextCombat.combatModifier ?? run.activeCombatModifier ?? 'none',
        {
          isLegendary: nextCombat.isLegendaryEncounter,
          isSecretBoss: nextCombat.isSecretBossEncounter,
          save,
        }
      );
      const slainCount = nextCombat.enemies.length;
      const slainLegendaryIds = nextCombat.enemies
        .filter((e) => e.role === 'legendary')
        .map((e) => e.defId);
      const slainLeaderIds = nextCombat.enemies
        .filter((e) => e.role === 'leader' || e.role === 'boss')
        .map((e) => e.defId);
      const slainSecretIds = nextCombat.enemies
        .filter((e) => e.role === 'secret_boss')
        .map((e) => e.defId);

      scheduleCombatTimer(() => {
        setIsResolvingTurn(false);
        setTurnStepLabel(null);
        let nextRun: RunState = {
          ...run,
          hp: finalHp,
          gold: run.gold + reward.gold,
          earnedShards: run.earnedShards + reward.shards,
          turnsTakenTotal: run.turnsTakenTotal + nextCombat.turn,
          enemiesDefeated: run.enemiesDefeated + slainCount,
          elitesClearedCount:
            (run.elitesClearedCount ?? 0) + (nextCombat.isElite ? 1 : 0),
          legendariesDefeatedThisRun: Array.from(
            new Set([...(run.legendariesDefeatedThisRun ?? []), ...slainLegendaryIds])
          ),
          factionLeadersDefeatedThisRun: Array.from(
            new Set([...(run.factionLeadersDefeatedThisRun ?? []), ...slainLeaderIds])
          ),
          secretBossesDefeatedThisRun: Array.from(
            new Set([...(run.secretBossesDefeatedThisRun ?? []), ...slainSecretIds])
          ),
          currentScreen: 'REWARD',
          activeReward: reward,
          activeCombatEncounterIds: undefined,
          activeCombatState: undefined,
          activeCombatModifier: undefined,
          activeIsLegendary: undefined,
          activeIsSecretBoss: undefined,
        };

        if (slainLegendaryIds.length > 0 || nextCombat.isLegendaryEncounter) {
          nextRun = grantContractGoldIfCompleted(
            nextRun,
            updateContractOnEvent(nextRun, { type: 'legendary_defeated' })
          );
        }
        if (slainLeaderIds.length > 0 || nextCombat.isBoss) {
          nextRun = grantContractGoldIfCompleted(
            nextRun,
            updateContractOnEvent(nextRun, { type: 'leader_or_boss_defeated' })
          );
        }
        if (nextCombat.isElite) {
          nextRun = grantContractGoldIfCompleted(
            nextRun,
            updateContractOnEvent(nextRun, { type: 'elite_cleared' })
          );
        }
        if (nextCombat.isBoss) {
          nextRun = grantContractGoldIfCompleted(
            nextRun,
            updateContractOnEvent(nextRun, { type: 'boss_won' })
          );
        }

        let updatedSave = save;
        if (reward.reputationDelta) {
          updatedSave = {
            ...updatedSave,
            factionReputation: shiftFactionReputation(
              updatedSave.factionReputation,
              reward.reputationDelta.factionId,
              reward.reputationDelta.amount
            ).nextReputation,
          };
        }
        if (
          nextCombat.isElite ||
          slainLeaderIds.length > 0 ||
          slainLegendaryIds.length > 0 ||
          slainSecretIds.length > 0
        ) {
          updatedSave = evaluateCharacterQuestProgress(
            updatedSave,
            nextRun.characterId,
            'elite_or_leader'
          ).nextSave;
        }
        if (nextCombat.isBoss || nextCombat.isSecretBossEncounter) {
          updatedSave = evaluateCharacterQuestProgress(
            updatedSave,
            nextRun.characterId,
            'boss_victory'
          ).nextSave;
        }

        persistSave({ ...updatedSave, activeRun: nextRun });
        setCombat(null);
        setScreen('REWARD');
      }, finishDelay);
    } else if (nextCombat.phase === 'DEFEAT') {
      const finishDelay = Math.max(740, maxDelayMs + COMBAT_TIMING.DEFEAT_PADDING_MS * speedMult);
      audioEngine.play('defeat', maxDelayMs / 1000);
      setIsResolvingTurn(true);
      setTurnStepLabel('Fallen in Battle...');
      scheduleCombatTimer(() => {
        setIsResolvingTurn(false);
        setTurnStepLabel(null);
        const updatedRun: RunState = {
          ...run,
          hp: 0,
          turnsTakenTotal: run.turnsTakenTotal + nextCombat.turn,
        };
        const diffMult =
          DIFFICULTIES.find((d) => d.id === updatedRun.difficulty)?.shardMultiplier ?? 1;
        const bankedShards =
          updatedRun.earnedShards + Math.round(updatedRun.nodesCleared * 2 * diffMult);
        const finalized = finalizeRunOutcome(save, updatedRun, false);
        persistSave(finalized);
        setCombat(null);
        setRunEndSummary({ victory: false, run: updatedRun, bankedShards });
        setScreen('RUN_END');
      }, finishDelay);
    } else {
      if (isEndTurn) {
        const lockMs = Math.max(
          420,
          maxDelayMs + COMBAT_TIMING.TURN_TRANSITION_SETTLE_MS * speedMult
        );
        setIsResolvingTurn(true);
        setTurnStepLabel('Enemy turn commencing...');
        scheduleCombatTimer(() => {
          setIsResolvingTurn(false);
          setTurnStepLabel(null);
          audioEngine.play('turn_start');
        }, lockMs);
      }
      if (prevCombat.turn !== nextCombat.turn) {
        // Keep activeRun HP synced on turn advance in case of browser refresh
        updateActiveRun((r) => ({ ...r, hp: nextCombat.playerHp }));
      }
    }
  };

  const handlePlayCard = (cardUid: string, targetUid: string | null) => {
    if (!combat || !save.activeRun || isResolvingTurn) return;
    audioEngine.play('card');
    const next = playCardFromHand(combat, cardUid, targetUid, save.activeRun);
    processCombatResult(combat, next, false);
  };

  const handleUseHeroAbility = () => {
    if (!combat || !save.activeRun || isResolvingTurn) return;
    const next = useHeroAbility(combat, combat.selectedEnemyUid, save.activeRun);
    if (next === combat) return;
    processCombatResult(combat, next, false);
  };

  const handleEndTurn = () => {
    if (!combat || !save.activeRun || isResolvingTurn) return;
    const next = endPlayerTurn(combat, save.activeRun);
    processCombatResult(combat, next, true);
  };

  const handleSelectEnemy = useCallback((uid: string) => {
    if (!combat) return;
    const nextCombat = selectEnemyTarget(combat, uid);
    if (nextCombat === combat) return;
    setCombat(nextCombat);
    if (save.activeRun) {
      persistSave({
        ...save,
        activeRun: { ...save.activeRun, activeCombatState: nextCombat },
      });
    }
  }, [combat, save, persistSave]);

  // =========================================================================
  // REWARD, SHOP, REST & EVENT HANDLERS
  // =========================================================================
  const handlePickRewardCard = (card: CardInstance) => {
    audioEngine.play('card');
    updateActiveRun((run) => {
      if (!run.activeReward || run.activeReward.cardPicked) return run;
      return {
        ...run,
        deck: [...run.deck, card],
        activeReward: { ...run.activeReward, cardPicked: true },
      };
    });
  };

  const handleSkipRewardCard = () => {
    audioEngine.play('click');
    updateActiveRun((run) => {
      if (!run.activeReward || run.activeReward.cardPicked) return run;
      return {
        ...run,
        gold: run.gold + 15,
        activeReward: { ...run.activeReward, cardPicked: true },
      };
    });
  };

  const handleClaimRewardRelic = () => {
    audioEngine.play('spell');
    updateActiveRun((run) => {
      if (!run.activeReward || run.activeReward.relicPicked || !run.activeReward.relicId) {
        return run;
      }
      const relicId = run.activeReward.relicId;
      let nextMap = run.map;
      let bonusGold = 0;
      if (relicId === 'cartographers_astrolabe') {
        bonusGold = 15;
        nextMap = revealHiddenMapNodes(nextMap);
      }
      return {
        ...run,
        gold: run.gold + bonusGold,
        relics: [...run.relics, relicId],
        map: nextMap,
        activeReward: { ...run.activeReward, relicPicked: true },
      };
    });
  };

  const handleContinueAfterReward = () => {
    if (!save.activeRun) return;
    audioEngine.play('click');
    const run = save.activeRun;
    if (run.activeReward?.isBossReward) {
      const diffMult = DIFFICULTIES.find((d) => d.id === run.difficulty)?.shardMultiplier ?? 1;
      const bankedShards = run.earnedShards + Math.round(35 * diffMult);
      const finalized = finalizeRunOutcome(save, run, true);
      persistSave(finalized);
      setRunEndSummary({ victory: true, run, bankedShards });
      setScreen('RUN_END');
      return;
    }

    updateActiveRun((r) => ({ ...r, currentScreen: 'EXPEDITION_MAP', activeReward: undefined }));
    setScreen('EXPEDITION_MAP');
  };

  const handleBuyShopCard = (idx: number) => {
    audioEngine.play('card');
    updateActiveRun((run) => {
      const shop = run.activeShop;
      if (!shop) return run;
      const slot = shop.cards[idx];
      if (!slot || slot.sold || run.gold < slot.price) return run;
      const nextCards = shop.cards.map((s, i) => (i === idx ? { ...s, sold: true } : s));
      return {
        ...run,
        gold: run.gold - slot.price,
        deck: [...run.deck, createCardInstance(slot.cardId, slot.upgraded)],
        activeShop: { ...shop, cards: nextCards },
      };
    });
  };

  const handleBuyShopRelic = () => {
    audioEngine.play('spell');
    updateActiveRun((run) => {
      const shop = run.activeShop;
      if (!shop || !shop.relic || shop.relic.sold || run.gold < shop.relic.price) return run;
      const relicId = shop.relic.relicId;
      let nextMap = run.map;
      let extraGold = 0;
      if (relicId === 'cartographers_astrolabe') {
        extraGold = 15;
        nextMap = revealHiddenMapNodes(nextMap);
      }
      return {
        ...run,
        gold: run.gold - shop.relic.price + extraGold,
        relics: [...run.relics, relicId],
        map: nextMap,
        activeShop: { ...shop, relic: { ...shop.relic, sold: true } },
      };
    });
  };

  const handleBuyShopHeal = () => {
    audioEngine.play('heal');
    updateActiveRun((run) => {
      const shop = run.activeShop;
      if (!shop || shop.healUsed || run.gold < shop.healPrice) return run;
      return {
        ...run,
        gold: run.gold - shop.healPrice,
        hp: Math.min(run.maxHp, run.hp + 22),
        activeShop: { ...shop, healUsed: true },
      };
    });
  };

  const handleDeckCardAction = (cardUid: string) => {
    if (!save.activeRun) return;
    if (deckModalMode === 'upgrade') {
      audioEngine.play('spell');
      updateActiveRun((r) => {
        const nextRest = updateContractOnEvent(
          { ...r, restUsedCount: (r.restUsedCount ?? 0) + 1 },
          { type: 'rest_used' }
        );
        return {
          ...nextRest,
          deck: nextRest.deck.map((c) =>
            c.uid === cardUid && CARDS[c.defId]?.upgraded ? { ...c, upgraded: true } : c
          ),
          currentScreen: 'EXPEDITION_MAP',
        };
      });
      setDeckModalMode(null);
      setScreen('EXPEDITION_MAP');
    } else if (deckModalMode === 'remove') {
      audioEngine.play('click');
      updateActiveRun((r) => {
        const shop = r.activeShop;
        if (!shop || shop.removeUsed || r.gold < shop.removeCardPrice) return r;
        return {
          ...r,
          gold: r.gold - shop.removeCardPrice,
          deck: r.deck.filter((c) => c.uid !== cardUid),
          activeShop: { ...shop, removeUsed: true },
        };
      });
      setDeckModalMode(null);
    }
  };

  const handleRestHeal = () => {
    audioEngine.play('heal');
    updateActiveRun((r) => {
      const nextRest = updateContractOnEvent(
        { ...r, restUsedCount: (r.restUsedCount ?? 0) + 1 },
        { type: 'rest_used' }
      );
      return {
        ...nextRest,
        hp: Math.min(nextRest.maxHp, nextRest.hp + Math.max(12, Math.round(nextRest.maxHp * 0.3))),
        currentScreen: 'EXPEDITION_MAP',
      };
    });
    setScreen('EXPEDITION_MAP');
  };

  const handleRestMeditate = () => {
    audioEngine.play('spell');
    updateActiveRun((r) => {
      const nextRest = updateContractOnEvent(
        { ...r, restUsedCount: (r.restUsedCount ?? 0) + 1 },
        { type: 'rest_used' }
      );
      return {
        ...nextRest,
        earnedShards: nextRest.earnedShards + 12,
        currentScreen: 'EXPEDITION_MAP',
      };
    });
    setScreen('EXPEDITION_MAP');
  };

  const handleEventChoice = (choiceId: string) => {
    if (!save.activeRun || !save.activeRun.activeEventId) return;
    audioEngine.play('click');
    const { nextRun, summary, discoveredSecretId } = resolveEventChoice(
      save.activeRun,
      save.activeRun.activeEventId,
      choiceId
    );
    const updatedSecrets = discoveredSecretId
      ? Array.from(new Set([...save.discoveredSecrets, discoveredSecretId]))
      : save.discoveredSecrets;

    persistSave({
      ...save,
      discoveredSecrets: updatedSecrets,
      activeRun: { ...nextRun, activeEventResult: summary },
    });
  };

  const handleLocationChoice = (choiceId: string) => {
    if (!save.activeRun || !save.activeRun.activeLocation) return;
    const {
      nextRun,
      triggerAmbushIds,
      triggerEliteCombat,
      discoveredSecretId,
      reputationShift,
      sfxHint,
    } = resolveLocationChoice(save.activeRun, choiceId);
    const updatedSecrets = discoveredSecretId
      ? Array.from(new Set([...save.discoveredSecrets, discoveredSecretId]))
      : save.discoveredSecrets;
    const updatedReputation = reputationShift
      ? shiftFactionReputation(
          save.factionReputation,
          reputationShift.factionId,
          reputationShift.delta
        ).nextReputation
      : save.factionReputation;

    if (triggerAmbushIds && triggerAmbushIds.length > 0) {
      audioEngine.play('heavy_slash');
      const nextSave: SaveDataV1 = {
        ...save,
        discoveredSecrets: updatedSecrets,
        factionReputation: updatedReputation,
        activeRun: nextRun,
      };
      startCombatForNode(
        nextRun,
        triggerAmbushIds,
        false,
        Boolean(triggerEliteCombat),
        'none',
        nextSave
      );
      return;
    }

    audioEngine.play(sfxHint ?? 'click');
    persistSave({
      ...save,
      discoveredSecrets: updatedSecrets,
      factionReputation: updatedReputation,
      activeRun: nextRun,
    });
  };

  const returnToMapFromSubScreen = () => {
    audioEngine.play('click');
    updateActiveRun((r) => ({
      ...r,
      currentScreen: 'EXPEDITION_MAP',
      activeShop: undefined,
      activeEventId: undefined,
      activeEventResult: undefined,
      activeTreasure: undefined,
      activeLocation: undefined,
    }));
    setScreen('EXPEDITION_MAP');
  };

  // =========================================================================
  // RENDER SCREEN ROUTER
  // =========================================================================
  const activeRun = save.activeRun;
  const inRunScreen =
    activeRun &&
    (screen === 'EXPEDITION_MAP' ||
      screen === 'COMBAT' ||
      screen === 'REWARD' ||
      screen === 'SHOP' ||
      screen === 'REST' ||
      screen === 'EVENT' ||
      screen === 'TREASURE' ||
      screen === 'SHRINE' ||
      screen === 'LIBRARY' ||
      screen === 'CAMP' ||
      screen === 'COMPANION_ENCOUNTER' ||
      screen === 'CURSED_ALTAR' ||
      screen === 'CROSSROADS' ||
      screen === 'RARE_ENCOUNTER');

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0B0C10] text-[#E6E2D8]">
      <OfflineIndicator />
      {screen === 'MAIN_MENU' && (
        <MainMenu
          save={save}
          onContinueRun={handleContinueRun}
          onNewExpedition={() => {
            audioEngine.play('click');
            setScreen('CHARACTER_SELECT');
          }}
          onOpenSanctuary={() => {
            audioEngine.play('click');
            setScreen('SANCTUARY');
          }}
          onOpenBestiary={() => {
            audioEngine.play('click');
            setScreen('BESTIARY');
          }}
          onOpenSettings={() => {
            audioEngine.play('click');
            setShowSettings(true);
          }}
        />
      )}

      {screen === 'CHARACTER_SELECT' && (
        <CharacterSelect
          save={save}
          onBack={() => setScreen('MAIN_MENU')}
          onOpenSanctuary={() => setScreen('SANCTUARY')}
          onLaunchRun={handleLaunchRun}
        />
      )}

      {screen === 'SANCTUARY' && (
        <SanctuaryView
          save={save}
          onUnlockCharacter={handleUnlockCharacter}
          onUnlockNode={handleUnlockNode}
          onUnlockRegion={handleUnlockRegion}
          onSelectAuraStyle={handleSelectAuraStyle}
          onToggleAlternateAbility={handleToggleAlternateAbility}
          onBack={() => setScreen('MAIN_MENU')}
        />
      )}

      {screen === 'BESTIARY' && (
        <BestiaryView save={save} onBack={() => setScreen('MAIN_MENU')} />
      )}

      {screen === 'RUN_END' && runEndSummary && (
        <RunEndView
          victory={runEndSummary.victory}
          run={runEndSummary.run}
          bankedShards={runEndSummary.bankedShards}
          onReturnSanctuary={() => {
            setRunEndSummary(null);
            setScreen('SANCTUARY');
          }}
          onReturnMenu={() => {
            setRunEndSummary(null);
            setScreen('MAIN_MENU');
          }}
        />
      )}

      {inRunScreen && activeRun && (
        <div className="min-h-[100dvh] flex flex-col">
          <RunHeader
            run={activeRun}
            onOpenDeck={() => setDeckModalMode('view')}
            onOpenSettings={() => setShowSettings(true)}
            onSaveAndExit={() => {
              clearCombatTimers();
              setIsResolvingTurn(false);
              setTurnStepLabel(null);
              setCombat(null);
              setScreen('MAIN_MENU');
            }}
          />

          {screen === 'EXPEDITION_MAP' && (
            <ExpeditionMapView
              run={activeRun}
              reducedMotion={save.settings.reducedMotion}
              onSelectNode={handleSelectMapNode}
            />
          )}

          {screen === 'COMBAT' && combat && (
            <BattleView
              run={activeRun}
              combat={combat}
              settings={save.settings}
              isResolvingTurn={isResolvingTurn}
              turnStepLabel={turnStepLabel}
              onSelectEnemy={handleSelectEnemy}
              onPlayCard={handlePlayCard}
              onUseHeroAbility={handleUseHeroAbility}
              onEndTurn={handleEndTurn}
            />
          )}

          {screen === 'REWARD' && activeRun.activeReward && (
            <RewardView
              reward={activeRun.activeReward}
              onPickCard={handlePickRewardCard}
              onSkipCard={handleSkipRewardCard}
              onClaimRelic={handleClaimRewardRelic}
              onContinue={handleContinueAfterReward}
            />
          )}

          {screen === 'SHOP' && activeRun.activeShop && (
            <ShopView
              run={activeRun}
              shop={activeRun.activeShop}
              onBuyCard={handleBuyShopCard}
              onBuyRelic={handleBuyShopRelic}
              onBuyHeal={handleBuyShopHeal}
              onOpenRemoveModal={() => setDeckModalMode('remove')}
              onLeave={returnToMapFromSubScreen}
            />
          )}

          {screen === 'REST' && (
            <RestView
              run={activeRun}
              onHeal={handleRestHeal}
              onOpenUpgradeModal={() => setDeckModalMode('upgrade')}
              onMeditate={handleRestMeditate}
            />
          )}

          {screen === 'EVENT' && activeRun.activeEventId && (
            <EventView
              run={activeRun}
              eventId={activeRun.activeEventId}
              resultSummary={activeRun.activeEventResult}
              onSelectChoice={handleEventChoice}
              onContinue={returnToMapFromSubScreen}
            />
          )}

          {screen === 'TREASURE' && activeRun.activeTreasure && (
            <TreasureView
              isHiddenVault={activeRun.activeTreasure.isHidden}
              goldAmount={activeRun.activeTreasure.gold}
              shardAmount={activeRun.activeTreasure.shards}
              relicId={activeRun.activeTreasure.relicId}
              onContinue={returnToMapFromSubScreen}
            />
          )}

          {(screen === 'SHRINE' ||
            screen === 'LIBRARY' ||
            screen === 'CAMP' ||
            screen === 'COMPANION_ENCOUNTER' ||
            screen === 'CURSED_ALTAR' ||
            screen === 'CROSSROADS' ||
            screen === 'RARE_ENCOUNTER') &&
            activeRun.activeLocation && (
              <InteractiveLocationView
                run={activeRun}
                location={activeRun.activeLocation}
                onSelectChoice={handleLocationChoice}
                onContinue={returnToMapFromSubScreen}
              />
            )}
        </div>
      )}

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          settings={save.settings}
          onUpdate={handleUpdateSettings}
          onResetSave={handleResetSave}
          onClose={() => setShowSettings(false)}
        />
      )}

      {deckModalMode && activeRun && (
        <DeckModal
          title={
            deckModalMode === 'upgrade'
              ? 'Select a Card to Temper (+)'
              : deckModalMode === 'remove'
              ? 'Select a Card to Purge'
              : `Active Deck (${activeRun.deck.length} Cards)`
          }
          subtitle={
            deckModalMode === 'upgrade'
              ? 'Upgraded cards gain improved stats or reduced Energy cost.'
              : deckModalMode === 'remove'
              ? 'Purged cards are permanently removed for this expedition.'
              : 'Inspect all cards currently in your expedition deck.'
          }
          cards={activeRun.deck}
          mode={deckModalMode}
          onSelectCard={handleDeckCardAction}
          onClose={() => setDeckModalMode(null)}
        />
      )}
    </div>
  );
}
