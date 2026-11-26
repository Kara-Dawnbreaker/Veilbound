import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAVE_KEY,
  decodeSave,
  loadSave,
  writeSave,
  type StorageLike
} from './saveRepository';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../../domain/state';

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test('save data survives a write/read round trip', () => {
  const storage = new MemoryStorage();
  const profile = { ...DEFAULT_PROFILE, soulShards: 42 };
  assert.equal(writeSave(storage, DEFAULT_SETTINGS, profile, new Date('2026-01-01T00:00:00.000Z')), true);
  const loaded = loadSave(storage);
  assert.equal(loaded?.profile.soulShards, 42);
  assert.equal(loaded?.savedAt, '2026-01-01T00:00:00.000Z');
});

test('invalid JSON is rejected safely', () => {
  assert.equal(decodeSave('{broken'), null);
});

test('version zero saves are migrated to the current schema', () => {
  const migrated = decodeSave(JSON.stringify({
    schemaVersion: 0,
    settings: { musicVolume: 2, effectsVolume: 0.4 },
    profile: { soulShards: 9, unlockedHeroIds: ['vaelen'], discoveredEntries: [] }
  }));
  assert.equal(migrated?.schemaVersion, 1);
  assert.equal(migrated?.settings.musicVolume, 1);
  assert.equal(migrated?.profile.soulShards, 9);
});

test('save storage uses a namespaced key', () => {
  const storage = new MemoryStorage();
  writeSave(storage, DEFAULT_SETTINGS, DEFAULT_PROFILE);
  assert.ok(storage.getItem(SAVE_KEY));
});

test('unknown schema versions are rejected', () => {
  assert.equal(decodeSave(JSON.stringify({ schemaVersion: 999 })), null);
});
