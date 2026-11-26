/**
 * Centralized combat pacing & animation timing configuration.
 * All combat calculation remains deterministic and independent of visual speed settings.
 */

import type { CombatSpeedMode, GameSettings } from '../types/game';

export const COMBAT_TIMING = {
  // Player card actions
  PLAYER_MULTI_HIT_INTERVAL_MS: 185,
  PLAYER_LUNGE_MS: 170,
  PLAYER_CAST_MS: 220,

  // End-of-turn transition & companion sequence
  COMPANION_PRE_DELAY_MS: 200,
  COMPANION_EFFECT_DELAY_MS: 180,
  COMPANION_STEP_MS: 520,

  // Structured enemy turn sequence:
  // Intent presentation -> Preparation telegraph -> Execution -> Recovery & status settle -> Next enemy
  ENEMY_TURN_INTRO_MS: 380,
  ENEMY_PREPARE_MS: 540,
  ENEMY_ACTION_DURATION_MS: 480,
  ENEMY_MULTI_HIT_INTERVAL_MS: 270,
  ENEMY_MAJOR_EXTRA_MS: 240,
  ENEMY_RECOVERY_MS: 340,
  STATUS_TICK_STEP_MS: 150,

  // Player status & turn handoff settle
  PLAYER_STATUS_SETTLE_MS: 340,
  TURN_TRANSITION_SETTLE_MS: 440,

  // Readability & outcome padding
  FLOATING_TEXT_DURATION_MS: 1100,
  VICTORY_PADDING_MS: 680,
  DEFEAT_PADDING_MS: 720,
} as const;

export const COMBAT_SPEED_OPTIONS: {
  id: CombatSpeedMode;
  label: string;
  multiplier: number;
  hint: string;
}[] = [
  {
    id: 'deliberate',
    label: 'Deliberate',
    multiplier: 1.35,
    hint: 'Un-rushed enemy telegraphs and extended hit readability.',
  },
  {
    id: 'normal',
    label: 'Normal',
    multiplier: 1.0,
    hint: 'Measured tactical pacing with clear enemy preparation.',
  },
  {
    id: 'fast',
    label: 'Fast',
    multiplier: 0.58,
    hint: 'Snappier animations while keeping every action readable.',
  },
];

export function resolveCombatSpeedMode(settings: GameSettings): CombatSpeedMode {
  if (settings.combatSpeed) return settings.combatSpeed;
  return settings.fastAnimations ? 'fast' : 'normal';
}

export function getCombatSpeedMultiplier(settings: GameSettings): number {
  if (settings.reducedMotion) return 0.45;
  const mode = resolveCombatSpeedMode(settings);
  const option = COMBAT_SPEED_OPTIONS.find((o) => o.id === mode);
  return option?.multiplier ?? 1.0;
}
