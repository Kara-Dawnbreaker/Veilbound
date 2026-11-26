/**
 * Versioned local persistence manager for Veilbound: Ashen Crown.
 * Cleanly separates permanent meta-progression, user settings, and temporary active run state.
 */

import { CHARACTERS } from '../data/characters';
import { REGIONS } from '../data/regions';
import type {
  CharacterMetaProgress,
  FactionId,
  GameSettings,
  SaveDataV1,
  RunState,
  CombatState,
  WorldState,
} from '../types/game';

const STORAGE_KEY = 'veilbound_ashen_crown_save';
const BACKUP_STORAGE_KEY = `${STORAGE_KEY}_backup`;
export const CURRENT_SAVE_VERSION = 1;

const ALL_FACTIONS: FactionId[] = [
  'iron_penitent',
  'drowned_choir',
  'blighted_circle',
  'sunken_court',
  'iron_bastion',
  'veil_archivists',
  'eclipse_vanguard',
];

export function createDefaultFactionReputation(): Record<FactionId, number> {
  return {
    iron_penitent: 0,
    drowned_choir: 0,
    blighted_circle: 0,
    sunken_court: 0,
    iron_bastion: 0,
    veil_archivists: 0,
    eclipse_vanguard: -10,
  };
}

export function createDefaultWorldState(): WorldState {
  const regionStability: Record<string, number> = {};
  for (const reg of REGIONS) {
    regionStability[reg.id] = 60;
  }
  return {
    expeditionCount: 0,
    activeEvents: [
      { eventId: 'merchant_caravan_boom', remainingRuns: 2 },
    ],
    regionStability,
    recentChronicle: [
      'Wayfarer caravans currently bolster supply roads across the Ashen Marches.',
    ],
  };
}

function clampVolume(val: unknown, fallback: number): number {
  if (typeof val !== 'number' || Number.isNaN(val)) return fallback;
  return Math.max(0, Math.min(1, val));
}

export function createDefaultSettings(): GameSettings {
  return {
    masterVolume: 0.75,
    sfxVolume: 0.85,
    musicVolume: 0.45,
    ambientVolume: 0.45,
    muted: false,
    combatSpeed: 'normal',
    fastAnimations: false,
    reducedMotion: false,
    confirmEndTurn: false,
    graphicsQuality: 'balanced',
  };
}

export function createDefaultCharacterProgress(unlockedByDefault: boolean): CharacterMetaProgress {
  return {
    unlocked: unlockedByDefault,
    runsAttempted: 0,
    runsWon: 0,
    highestDifficultyWon: null,
    unlockedNodeIds: [],
    xp: 0,
    questStep: 0,
    questCompleted: false,
    selectedAuraStyle: 'default',
    unlockedAuraStyles: ['default'],
    useAlternateAbility: false,
  };
}

export function createDefaultSaveData(): SaveDataV1 {
  const characterProgress: Record<string, CharacterMetaProgress> = {};
  for (const char of CHARACTERS) {
    characterProgress[char.id] = createDefaultCharacterProgress(char.unlockedByDefault);
  }

  return {
    version: CURRENT_SAVE_VERSION,
    lastUpdated: Date.now(),
    soulShards: 20, // Small starter grant so players can explore Sanctuary unlocks early
    settings: createDefaultSettings(),
    characterProgress,
    unlockedRegions: REGIONS.filter((r) => r.unlockedByDefault).map((r) => r.id),
    discoveredEnemies: [],
    discoveredSecrets: [],
    discoveredCards: [],
    factionReputation: createDefaultFactionReputation(),
    worldState: createDefaultWorldState(),
    completedContractIds: [],
    defeatedLegendaries: [],
    defeatedSecretBosses: [],
    unlockedQuestCards: [],
    activeRun: null,
    totalVictories: 0,
    totalRuns: 0,
  };
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const VALID_SCREENS = new Set([
  'MAIN_MENU', 'CHARACTER_SELECT', 'SANCTUARY', 'BESTIARY', 'EXPEDITION_MAP',
  'COMBAT', 'REWARD', 'SHOP', 'REST', 'EVENT', 'TREASURE', 'SHRINE', 'LIBRARY',
  'CAMP', 'COMPANION_ENCOUNTER', 'CURSED_ALTAR', 'CROSSROADS', 'RARE_ENCOUNTER', 'RUN_END',
]);

function isCardInstanceList(value: unknown): boolean {
  return Array.isArray(value) && value.every((card) =>
    isRecord(card) && typeof card.uid === 'string' && typeof card.defId === 'string' &&
    typeof card.upgraded === 'boolean' &&
    (card.costOverride === undefined || (typeof card.costOverride === 'number' && Number.isFinite(card.costOverride)))
  );
}

function isCombatSnapshot(value: unknown): value is CombatState {
  if (!isRecord(value)) return false;
  const numericFields = [
    'turn', 'playerHp', 'playerMaxHp', 'playerBlock', 'energy', 'maxEnergy',
    'nextTurnBonusEnergy', 'cardsPlayedThisTurn', 'attacksPlayedThisTurn',
    'playerAttacksLastTurn', 'playerSkillsThisTurn', 'playerSkillsLastTurn',
    'playerBlocksLastTurn', 'blockGainedThisTurn', 'alliesSlainCount',
    'heroAbilityCooldown', 'heroAbilityUsesLeft',
  ];
  if (!numericFields.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]))) return false;
  if (!['PLAYER_TURN', 'RESOLVING', 'ENEMY_TURN', 'VICTORY', 'DEFEAT'].includes(value.phase)) return false;
  if (!['neutral', 'bulwark', 'wrath', 'eclipse', 'alchemical'].includes(value.activeStance)) return false;
  if (!['drawPile', 'hand', 'discardPile', 'exhaustPile', 'enemies', 'companions', 'activeTraps', 'activeReactions', 'delayedEffects', 'combatLog', 'pendingVisualEvents', 'activeTriggers'].every((key) => Array.isArray(value[key]))) return false;
  if (!['playerStatuses'].every((key) => isRecord(value[key]))) return false;
  if (!['isBoss', 'isElite', 'heroAbilityUpgraded', 'heroAbilityAlternate', 'passiveAmplified'].every((key) => typeof value[key] === 'boolean')) return false;
  return ['drawPile', 'hand', 'discardPile', 'exhaustPile'].every((key) => isCardInstanceList(value[key]));
}

function isValidRunState(value: unknown): value is RunState {
  if (!isRecord(value)) return false;
  if (typeof value.runId !== 'string' || typeof value.seed !== 'string') return false;
  if (!CHARACTERS.some((character) => character.id === value.characterId)) return false;
  if (!REGIONS.some((region) => region.id === value.regionId)) return false;
  if (!['standard', 'penance', 'eclipse'].includes(value.difficulty)) return false;
  if (!VALID_SCREENS.has(value.currentScreen)) return false;
  for (const key of ['hp', 'maxHp', 'gold', 'earnedShards', 'turnsTakenTotal', 'enemiesDefeated', 'nodesCleared']) {
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] < 0) return false;
  }
  if (value.maxHp < 1 || value.hp > value.maxHp || !isCardInstanceList(value.deck)) return false;
  if (!Array.isArray(value.relics) || !value.relics.every((id: unknown) => typeof id === 'string')) return false;
  if (!isRecord(value.map) || value.map.regionId !== value.regionId || typeof value.map.seed !== 'string') return false;
  if (!isRecord(value.map.nodes) || !Array.isArray(value.map.startNodeIds) || typeof value.map.bossNodeId !== 'string') return false;
  if (!(value.map.currentNodeId === null || typeof value.map.currentNodeId === 'string')) return false;
  if (!Object.values(value.map.nodes).every((node) =>
    isRecord(node) && typeof node.id === 'string' && Array.isArray(node.connections) &&
    node.connections.every((id: unknown) => typeof id === 'string' && Boolean(value.map.nodes[id]))
  )) return false;
  if (!value.map.nodes[value.map.bossNodeId]) return false;
  if (!value.map.startNodeIds.length || !value.map.startNodeIds.every((id: unknown) => typeof id === 'string' && Boolean(value.map.nodes[id]))) return false;
  if (typeof value.map.currentNodeId === 'string' && !value.map.nodes[value.map.currentNodeId]) return false;
  if (value.currentScreen === 'COMBAT' && (!Array.isArray(value.activeCombatEncounterIds) || value.activeCombatEncounterIds.length === 0)) return false;
  if (value.activeCombatEncounterIds !== undefined && (!Array.isArray(value.activeCombatEncounterIds) || !value.activeCombatEncounterIds.every((id: unknown) => typeof id === 'string'))) return false;
  return true;
}

function sanitizeRunState(value: unknown): RunState | null {
  if (!isValidRunState(value)) return null;
  if (value.activeCombatState !== undefined && !isCombatSnapshot(value.activeCombatState)) {
    // Keep the valid expedition if only its combat snapshot is damaged. Continue
    // can safely rebuild that encounter from its stored encounter definition.
    const { activeCombatState: _discardedSnapshot, ...safeRun } = value;
    return safeRun;
  }
  return value;
}

function migrateAndSanitize(raw: unknown): SaveDataV1 {
  const fallback = createDefaultSaveData();
  if (!raw || typeof raw !== 'object') return fallback;

  const data = raw as Partial<SaveDataV1>;
  // Future version migrations would branch here on data.version
  const rawSettings: Partial<GameSettings> = data.settings ?? {};
  const derivedCombatSpeed =
    rawSettings.combatSpeed === 'deliberate' ||
    rawSettings.combatSpeed === 'normal' ||
    rawSettings.combatSpeed === 'fast'
      ? rawSettings.combatSpeed
      : rawSettings.fastAnimations
      ? 'fast'
      : 'normal';

  const mergedSettings: GameSettings = {
    ...fallback.settings,
    ...rawSettings,
    masterVolume: clampVolume(rawSettings.masterVolume, fallback.settings.masterVolume),
    sfxVolume: clampVolume(rawSettings.sfxVolume, fallback.settings.sfxVolume),
    musicVolume: clampVolume(rawSettings.musicVolume, fallback.settings.musicVolume),
    ambientVolume: clampVolume(rawSettings.ambientVolume, fallback.settings.ambientVolume),
    combatSpeed: derivedCombatSpeed,
    fastAnimations: derivedCombatSpeed === 'fast',
    graphicsQuality:
      rawSettings.graphicsQuality === 'high' ||
      rawSettings.graphicsQuality === 'balanced' ||
      rawSettings.graphicsQuality === 'lite'
        ? rawSettings.graphicsQuality
        : 'balanced',
  };

  const mergedCharacters: Record<string, CharacterMetaProgress> = { ...fallback.characterProgress };
  if (data.characterProgress && typeof data.characterProgress === 'object') {
    for (const char of CHARACTERS) {
      const existing = data.characterProgress[char.id];
      if (existing) {
        const base = createDefaultCharacterProgress(char.unlockedByDefault);
        mergedCharacters[char.id] = {
          ...base,
          ...existing,
          unlocked: char.unlockedByDefault || Boolean(existing.unlocked),
          unlockedNodeIds: Array.isArray(existing.unlockedNodeIds) ? existing.unlockedNodeIds : [],
          questStep: typeof existing.questStep === 'number' ? existing.questStep : 0,
          questCompleted: Boolean(existing.questCompleted),
          selectedAuraStyle: existing.selectedAuraStyle ?? 'default',
          unlockedAuraStyles: Array.isArray(existing.unlockedAuraStyles) && existing.unlockedAuraStyles.length > 0
            ? existing.unlockedAuraStyles
            : ['default'],
          useAlternateAbility: Boolean(existing.useAlternateAbility),
        };
      }
    }
  }

  const unlockedRegions = new Set<string>(fallback.unlockedRegions);
  if (Array.isArray(data.unlockedRegions)) {
    for (const r of data.unlockedRegions) {
      if (typeof r === 'string') unlockedRegions.add(r);
    }
  }

  const mergedFactionRep: Record<FactionId, number> = { ...fallback.factionReputation };
  if (data.factionReputation && typeof data.factionReputation === 'object') {
    for (const fId of ALL_FACTIONS) {
      const val = data.factionReputation[fId];
      if (typeof val === 'number' && !Number.isNaN(val)) {
        mergedFactionRep[fId] = Math.max(-100, Math.min(100, Math.round(val)));
      }
    }
  }

  const mergedWorldState: WorldState = {
    expeditionCount:
      typeof data.worldState?.expeditionCount === 'number' ? data.worldState.expeditionCount : 0,
    activeEvents: Array.isArray(data.worldState?.activeEvents)
      ? data.worldState.activeEvents.filter((e) => e && typeof e.eventId === 'string')
      : fallback.worldState.activeEvents,
    regionStability: {
      ...fallback.worldState.regionStability,
      ...(data.worldState?.regionStability ?? {}),
    },
    recentChronicle: Array.isArray(data.worldState?.recentChronicle)
      ? data.worldState.recentChronicle.slice(-6)
      : fallback.worldState.recentChronicle,
  };

  return {
    version: CURRENT_SAVE_VERSION,
    lastUpdated: typeof data.lastUpdated === 'number' ? data.lastUpdated : Date.now(),
    soulShards: typeof data.soulShards === 'number' && data.soulShards >= 0 ? data.soulShards : fallback.soulShards,
    settings: mergedSettings,
    characterProgress: mergedCharacters,
    unlockedRegions: Array.from(unlockedRegions),
    discoveredEnemies: Array.isArray(data.discoveredEnemies) ? data.discoveredEnemies : [],
    discoveredSecrets: Array.isArray(data.discoveredSecrets) ? data.discoveredSecrets : [],
    discoveredCards: Array.isArray(data.discoveredCards) ? data.discoveredCards : [],
    factionReputation: mergedFactionRep,
    worldState: mergedWorldState,
    completedContractIds: Array.isArray(data.completedContractIds) ? data.completedContractIds : [],
    defeatedLegendaries: Array.isArray(data.defeatedLegendaries) ? data.defeatedLegendaries : [],
    defeatedSecretBosses: Array.isArray(data.defeatedSecretBosses) ? data.defeatedSecretBosses : [],
    unlockedQuestCards: Array.isArray(data.unlockedQuestCards) ? data.unlockedQuestCards : [],
    activeRun: sanitizeRunState(data.activeRun),
    totalVictories: typeof data.totalVictories === 'number' ? data.totalVictories : 0,
    totalRuns: typeof data.totalRuns === 'number' ? data.totalRuns : 0,
  };
}

function getStoredSaveVersion(raw: string | null): number | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.version !== 'number' || !Number.isFinite(parsed.version)) return null;
    return parsed.version;
  } catch {
    return null;
  }
}

function parseStoredSave(raw: string | null): SaveDataV1 | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof (parsed as Partial<SaveDataV1>).version !== 'number'
    ) {
      return null;
    }
    if ((parsed as Partial<SaveDataV1>).version! > CURRENT_SAVE_VERSION) return null;
    return migrateAndSanitize(parsed);
  } catch {
    return null;
  }
}

export function loadSaveData(): SaveDataV1 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const currentSave = parseStoredSave(raw);
    if (currentSave) return currentSave;

    // Never replace a save written by a newer game version with an older schema.
    // A compatible backup may be used for this session, but the newer primary
    // remains untouched until this build understands its version.
    if ((getStoredSaveVersion(raw) ?? 0) > CURRENT_SAVE_VERSION) {
      const futureVersionBackup = parseStoredSave(localStorage.getItem(BACKUP_STORAGE_KEY));
      return futureVersionBackup ?? createDefaultSaveData();
    }

    const backupRaw = localStorage.getItem(BACKUP_STORAGE_KEY);
    const backupSave = parseStoredSave(backupRaw);
    if (backupSave && backupRaw) {
      try {
        localStorage.setItem(STORAGE_KEY, backupRaw);
      } catch {
        // Keep using the recovered backup even if restoration cannot be written.
      }
      return backupSave;
    }

    // If neither stored copy can be recovered, persist a fresh save so the
    // next launch does not repeat recovery against the same broken data.
    const fresh = createDefaultSaveData();
    saveGameData(fresh);
    return fresh;
  } catch {
    return createDefaultSaveData();
  }
}

export function saveGameData(data: SaveDataV1): void {
  try {
    const payload: SaveDataV1 = {
      ...data,
      version: CURRENT_SAVE_VERSION,
      lastUpdated: Date.now(),
    };
    const serialized = JSON.stringify(payload);
    const previousRaw = localStorage.getItem(STORAGE_KEY);
    if ((getStoredSaveVersion(previousRaw) ?? 0) > CURRENT_SAVE_VERSION) return;
    localStorage.setItem(STORAGE_KEY, serialized);

    // Keep the previous valid save as a recovery point, but never replace a
    // known-good backup with damaged data.
    if (parseStoredSave(previousRaw)) {
      try {
        localStorage.setItem(BACKUP_STORAGE_KEY, previousRaw as string);
      } catch {
        // The primary save is already safe; backup storage is best-effort.
      }
    }
  } catch {
    // Ignore storage quota errors gracefully.
  }
}

export function resetAllSaveData(): SaveDataV1 {
  const fresh = createDefaultSaveData();
  saveGameData(fresh);
  return fresh;
}
