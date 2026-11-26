import {
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  type GameSettings,
  type PlayerProfile
} from '../../domain/state';

export const SAVE_KEY = 'veilbound:profile';
export const SAVE_SCHEMA_VERSION = 1;

export interface PersistedSave {
  schemaVersion: 1;
  savedAt: string;
  settings: GameSettings;
  profile: PlayerProfile;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

function validStringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? [...new Set(value)]
    : [...fallback];
}

function normalizeSettings(value: unknown): GameSettings {
  const settings = isRecord(value) ? value : {};
  return {
    musicVolume: validVolume(settings.musicVolume, DEFAULT_SETTINGS.musicVolume),
    effectsVolume: validVolume(settings.effectsVolume, DEFAULT_SETTINGS.effectsVolume),
    reducedMotion: typeof settings.reducedMotion === 'boolean'
      ? settings.reducedMotion
      : DEFAULT_SETTINGS.reducedMotion
  };
}

function normalizeProfile(value: unknown): PlayerProfile {
  const profile = isRecord(value) ? value : {};
  const shards = profile.soulShards;
  return {
    soulShards: typeof shards === 'number' && Number.isFinite(shards)
      ? Math.max(0, Math.floor(shards))
      : DEFAULT_PROFILE.soulShards,
    unlockedHeroIds: validStringArray(profile.unlockedHeroIds, DEFAULT_PROFILE.unlockedHeroIds),
    discoveredEntries: validStringArray(profile.discoveredEntries, DEFAULT_PROFILE.discoveredEntries)
  };
}

export function createSaveData(
  settings: GameSettings,
  profile: PlayerProfile,
  now = new Date()
): PersistedSave {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt: now.toISOString(),
    settings: normalizeSettings(settings),
    profile: normalizeProfile(profile)
  };
}

/** Validates current saves and migrates the small pre-release v0 shape. */
export function decodeSave(raw: string): PersistedSave | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;

  if (parsed.schemaVersion === 1) {
    if (typeof parsed.savedAt !== 'string') return null;
    return {
      schemaVersion: 1,
      savedAt: parsed.savedAt,
      settings: normalizeSettings(parsed.settings),
      profile: normalizeProfile(parsed.profile)
    };
  }

  if (parsed.schemaVersion === 0) {
    return createSaveData(
      parsed.settings,
      parsed.profile,
      new Date()
    );
  }

  return null;
}

export function loadSave(storage: StorageLike): PersistedSave | null {
  try {
    const raw = storage.getItem(SAVE_KEY);
    return raw ? decodeSave(raw) : null;
  } catch {
    return null;
  }
}

export function writeSave(
  storage: StorageLike,
  settings: GameSettings,
  profile: PlayerProfile,
  now = new Date()
): boolean {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(createSaveData(settings, profile, now)));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(storage: StorageLike): boolean {
  try {
    storage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}
