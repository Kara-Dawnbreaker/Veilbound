/**
 * Structured, archetype-driven Enemy AI Engine.
 * Evaluates battlefield state, ally survival, player defensive/offensive habits,
 * active stances, and encounter-level memory to produce intelligent yet fair intents
 * with transparent tactical telegraph notes.
 */

import type {
  EnemyArchetype,
  EnemyDef,
  EnemyIntent,
  EnemySelectIntentContext,
} from '../types/game';

export function getDifficultyBoost(difficulty: EnemySelectIntentContext['difficulty'], scale = 1): number {
  if (difficulty === 'eclipse') return Math.round(2 * scale);
  if (difficulty === 'penance') return Math.round(1 * scale);
  return 0;
}

/**
 * Shared intelligent tactical post-processor / archetype advisor.
 * Allows any enemy definition to layer cooperative ally defense, stance punishment,
 * assassin exploit checks, and anti-repetition fairness onto its core kit.
 */
export function resolveIntelligentIntent(
  def: EnemyDef,
  ctx: EnemySelectIntentContext,
  baseIntent: EnemyIntent
): EnemyIntent {
  const archetype: EnemyArchetype = def.tacticalArchetype ?? 'aggressor';
  const boost = getDifficultyBoost(ctx.difficulty);

  // Bosses & multi-phase encounters retain their signature phase logic, with clear telegraphs
  if (archetype === 'boss' || def.role === 'boss' || def.role === 'secret_boss') {
    if (ctx.phase >= 2 && !baseIntent.telegraphNote) {
      return {
        ...baseIntent,
        telegraphNote:
          ctx.playerBlock >= 15 && baseIntent.damage
            ? 'Unleashing apex assault against your defense'
            : 'Phase escalated — heightened threat',
      };
    }
    return baseIntent;
  }

  // 1. Guardian: prioritizes shielding endangered allies if they aren't guarding back-to-back
  if (
    archetype === 'guardian' &&
    ctx.alliesCount > 1 &&
    (ctx.allyNeedsGuard || ctx.woundedAllyExists) &&
    ctx.lastIntentType !== 'defend' &&
    baseIntent.type !== 'defend'
  ) {
    return {
      type: 'defend',
      label: 'Bastion Interpose',
      telegraphNote: 'Shielding wounded ally',
      block: 6 + boost,
      blockAllies: 8 + boost * 2,
    };
  }

  // 2. Support: prioritizes healing/buffing battered teammates rather than solo swinging blindly
  if (
    archetype === 'support' &&
    ctx.alliesCount > 1 &&
    ctx.woundedAllyExists &&
    ctx.lastIntentType !== 'buff' &&
    !baseIntent.healAllies &&
    !baseIntent.blockAllies
  ) {
    return {
      type: 'buff',
      label: 'Triage Hymn',
      telegraphNote: 'Mending & bracing battered allies',
      healAllies: 6 + boost * 2,
      blockAllies: 5 + boost,
    };
  }

  // 3. Assassin: exploits Vulnerable, Bleed, or exposed low-Block windows
  if (archetype === 'assassin') {
    const playerExposed =
      ctx.playerBlock <= 3 &&
      ((ctx.playerStatuses?.vulnerable ?? 0) > 0 || (ctx.playerStatuses?.bleed ?? 0) >= 2);
    if (
      playerExposed &&
      ctx.lastIntentType !== 'multi_attack' &&
      ctx.turn > 1
    ) {
      return {
        type: 'multi_attack',
        label: 'Exploit Opening',
        telegraphNote: 'Punishing exposed low-Block opening',
        damage: 5 + Math.floor(boost * 0.7),
        hits: 2,
        status: 'bleed',
        statusAmount: 2,
      };
    }
    // Against massive Block walls, switch to applying Vulnerable / piercing Bleed pressure
    if (ctx.playerBlock >= 16 && baseIntent.type === 'attack') {
      return {
        type: 'attack_debuff',
        label: 'Hamstring Cut',
        telegraphNote: 'Probing heavy Block with Vulnerable',
        damage: Math.max(4, Math.round((baseIntent.damage ?? 8) * 0.65)),
        status: 'vulnerable',
        statusAmount: 2,
      };
    }
  }

  // 4. Controller: punishes stance-camping, high skill spam, or heavy Block turtles
  if (archetype === 'controller') {
    if (
      (ctx.playerActiveStance === 'wrath' || (ctx.playerBlocksLastTurn ?? 0) >= 2) &&
      ctx.lastIntentType !== 'debuff' &&
      baseIntent.type === 'attack'
    ) {
      return {
        type: 'debuff',
        label: 'Binding Hex',
        telegraphNote:
          ctx.playerActiveStance === 'wrath'
            ? 'Exploiting Wrath Stance'
            : 'Disrupting fortified guard',
        status: 'frail',
        statusAmount: 2,
        block: 5 + boost,
      };
    }
  }

  // 5. Tactician: adapts directly to player's last-turn aggression vs skill spam
  if (archetype === 'tactician') {
    if (
      (ctx.playerAttacksLastTurn ?? 0) >= 3 &&
      ctx.lastIntentType !== 'defend' &&
      baseIntent.type !== 'summon'
    ) {
      return {
        type: 'defend',
        label: 'Counter-Brace',
        telegraphNote: 'Bracing after heavy multi-attack turn',
        block: 10 + boost * 2,
        selfStatus: 'thorns',
        selfStatusAmount: 2,
      };
    }
    if (
      (ctx.playerSkillsLastTurn ?? 0) >= 3 &&
      ctx.lastIntentType !== 'attack_debuff' &&
      baseIntent.type !== 'summon'
    ) {
      return {
        type: 'attack_debuff',
        label: 'Disrupting Thrust',
        telegraphNote: 'Pressuring skill-heavy setup',
        damage: 8 + boost,
        status: 'weak',
        statusAmount: 2,
      };
    }
  }

  // 6. Aggressor: escalates when allies fall ("Enraged by fallen pack")
  if (
    archetype === 'aggressor' &&
    (ctx.alliesDeadCount ?? 0) > 0 &&
    ctx.alliesCount === 1 &&
    baseIntent.type === 'defend'
  ) {
    return {
      type: 'attack',
      label: 'Last-Stand Savagery',
      telegraphNote: 'Enraged after allies fell',
      damage: 10 + boost * 2,
      isCharged: true,
    };
  }

  // 7. Summoner: avoids useless summon spam if squad is full (>= 3) or summoned last turn
  if (baseIntent.type === 'summon' && (ctx.alliesCount >= 3 || ctx.lastIntentType === 'summon')) {
    return {
      type: 'buff',
      label: 'Rite of Cohesion',
      telegraphNote: 'Empowering existing allies instead of summoning',
      buffAlliesStatus: 'strength',
      buffAlliesAmount: 2,
      blockAllies: 6,
    };
  }

  // Never spam Curse intents two turns in a row
  if (baseIntent.type === 'curse' && ctx.lastIntentType === 'curse') {
    return {
      type: 'attack_debuff',
      label: 'Shadow Strike',
      telegraphNote: 'Following curse with direct pressure',
      damage: Math.max(6, baseIntent.damage ?? 8),
      status: 'weak',
      statusAmount: 1,
    };
  }

  return baseIntent;
}

export function getArchetypeLabel(archetype?: EnemyArchetype): string {
  switch (archetype) {
    case 'aggressor':
      return 'Aggressor';
    case 'guardian':
      return 'Guardian';
    case 'support':
      return 'Support';
    case 'controller':
      return 'Controller';
    case 'assassin':
      return 'Assassin';
    case 'summoner':
      return 'Summoner';
    case 'tactician':
      return 'Tactician';
    case 'boss':
      return 'Boss';
    default:
      return 'Adversary';
  }
}
