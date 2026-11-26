/**
 * Pure, modular turn-based Combat & Effect-Processing Engine.
 * Zero dependency on React or Phaser; emits structured CombatVisualEvents for rendering & audio.
 * Supports stances, traps, enemy-turn reactions, delayed rituals, card transformations,
 * and chained triggers with explicit recursion depth guard (MAX_TRIGGER_DEPTH).
 */

import { CARDS, getCardAttackRange, getCardDef, getRewardableCardIds } from '../data/cards';
import { getCharacterDef } from '../data/characters';
import { getCompanionDef } from '../data/companions';
import { doesEnemyGuardBackline, getEnemyDef, getEnemyDefaultPosition } from '../data/enemies';
import { getStanceDef } from '../data/stances';
import type {
  ActiveCompanion,
  AttackRangeType,
  BattlePosition,
  CardAnimationStyle,
  CardCategory,
  CardDef,
  CardInstance,
  CardKeyword,
  CardTrigger,
  CombatEnemy,
  CombatModifierId,
  CombatReaction,
  CombatState,
  CombatTrap,
  CombatVisualEvent,
  ConditionType,
  DifficultyId,
  EffectAction,
  EnemyGroup,
  EnemyIntent,
  EnemySelectIntentContext,
  ReactionTriggerCondition,
  RunState,
  StanceId,
  StatusId,
  TrapTriggerCondition,
  TriggerEventType,
} from '../types/game';
import { COMBAT_TIMING } from './combatTiming';
import { resolveIntelligentIntent } from './enemyAI';
import { SeededRNG } from './rng';

const MAX_HAND_SIZE = 10;
const MAX_TRIGGER_DEPTH = 6;
const MAX_COMPANIONS = 2;

let uidCounter = 1;
function nextUid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${uidCounter}`;
}

export interface CardPreviewInfo {
  effectiveDamage: number | null;
  baseDamage: number | null;
  hits: number;
  effectiveBlock: number | null;
  baseBlock: number | null;
  activeConditionMet: boolean;
  willCrit: boolean;
  attackRange?: AttackRangeType;
  frontlineIntercepted: boolean;
}

interface EffectExecutionContext {
  animStyle?: CardAnimationStyle;
  delayMs?: number;
  transformedInto?: { cardId: string; upgraded: boolean };
  attackRange?: AttackRangeType;
  playedCardDefId?: string;
}

export function getEffectiveCardDef(card: CardInstance): {
  name: string;
  cost: number;
  keywords: CardKeyword[];
  effects: EffectAction[];
  triggers: CardTrigger[];
  description: string;
  needsTarget: boolean;
  category: CardDef['category'];
  rarity: CardDef['rarity'];
  attackRange?: AttackRangeType;
  animationStyle?: CardAnimationStyle;
} {
  const base = getCardDef(card.defId);
  const isTempCopy = card.uid.startsWith('echocopy_') || card.uid.startsWith('tempcard_');

  const rawKeywords =
    card.upgraded && base.upgraded
      ? base.upgraded.keywords ?? base.keywords ?? []
      : base.keywords ?? [];

  let keywords = [...rawKeywords];
  if (isTempCopy) {
    keywords = keywords.filter((k) => k !== 'echo');
    if (!keywords.includes('ethereal')) keywords.push('ethereal');
    if (!keywords.includes('exhaust')) keywords.push('exhaust');
  }

  if (card.upgraded && base.upgraded) {
    return {
      name: base.upgraded.name ?? `${base.name} +`,
      cost: card.costOverride ?? base.upgraded.cost ?? base.cost,
      keywords,
      effects: base.upgraded.effects,
      triggers: base.upgraded.triggers ?? base.triggers ?? [],
      description: base.upgraded.description,
      needsTarget: base.needsTarget,
      category: base.category,
      rarity: base.rarity,
      attackRange: getCardAttackRange(base, true),
      animationStyle: base.animationStyle,
    };
  }
  return {
    name: base.name,
    cost: card.costOverride ?? base.cost,
    keywords,
    effects: base.effects,
    triggers: base.triggers ?? [],
    description: base.description,
    needsTarget: base.needsTarget,
    category: base.category,
    rarity: base.rarity,
    attackRange: getCardAttackRange(base, false),
    animationStyle: base.animationStyle,
  };
}

export interface CombatInitOptions {
  isLegendary?: boolean;
  isSecretBoss?: boolean;
  heroAbilityUpgraded?: boolean;
  heroAbilityAlternate?: boolean;
  passiveAmplified?: boolean;
  bonusEnergyTurn1?: number;
  bonusDrawTurn1?: number;
  worldEnemyHpMult?: number;
  worldEnemyStartBlock?: number;
}

function createEnemyInstance(
  defId: string,
  difficulty: DifficultyId,
  turn: number,
  alliesCount: number,
  playerBlock: number,
  rng: SeededRNG,
  playerAttacksLastTurn = 0,
  playerStatuses: Partial<Record<StatusId, number>> = {},
  worldEnemyHpMult = 1,
  worldEnemyStartBlock = 0
): CombatEnemy {
  const def = getEnemyDef(defId);
  const hpMult = difficulty === 'eclipse' ? 1.18 : difficulty === 'penance' ? 1.08 : 1.0;
  const maxHp = Math.max(1, Math.round(def.maxHp * hpMult * worldEnemyHpMult));
  const statuses: Partial<Record<StatusId, number>> = { ...(def.startingStatuses ?? {}) };
  if (difficulty === 'eclipse' && (def.role === 'elite' || def.role === 'leader' || def.role === 'legendary')) {
    statuses.strength = (statuses.strength ?? 0) + 1;
  }

  const intentCtx: EnemySelectIntentContext = {
    turn,
    hp: maxHp,
    maxHp,
    phase: 1,
    alliesCount,
    alliesDeadCount: 0,
    woundedAllyExists: false,
    allyNeedsGuard: false,
    difficulty,
    playerBlock,
    playerAttacksLastTurn,
    playerSkillsLastTurn: 0,
    playerBlocksLastTurn: 0,
    playerActiveStance: 'neutral',
    playerStatuses,
    rngNext: () => rng.next(),
  };

  const baseIntent = def.selectIntent(intentCtx);
  const intent = resolveIntelligentIntent(def, intentCtx, baseIntent);

  return {
    uid: nextUid('enemy'),
    defId: def.id,
    name: def.name,
    role: def.role,
    group: def.group,
    archetype: def.tacticalArchetype,
    position: getEnemyDefaultPosition(def),
    guardsBackline: doesEnemyGuardBackline(def),
    hp: maxHp,
    maxHp,
    block: worldEnemyStartBlock,
    statuses,
    intent,
    phase: 1,
    actedThisTurn: false,
    mechanicState: 0,
    lastDamageTaken: 0,
  };
}

function pushEvent(state: CombatState, ev: Omit<CombatVisualEvent, 'id'>): void {
  state.pendingVisualEvents.push({ ...ev, id: nextUid('vev') });
}

function addLog(state: CombatState, msg: string): void {
  state.combatLog = [...state.combatLog.slice(-24), msg];
}

function countCursesInCombat(state: Pick<CombatState, 'drawPile' | 'hand' | 'discardPile'>): number {
  let count = 0;
  for (const c of state.drawPile) if (getCardDef(c.defId).category === 'curse') count++;
  for (const c of state.hand) if (getCardDef(c.defId).category === 'curse') count++;
  for (const c of state.discardPile) if (getCardDef(c.defId).category === 'curse') count++;
  return count;
}

export function initializeCombat(
  run: RunState,
  encounterIds: string[],
  isBoss: boolean,
  isElite: boolean,
  combatModifier: CombatModifierId = 'none',
  options: CombatInitOptions = {}
): CombatState {
  const rng = new SeededRNG(`${run.seed}:combat:${run.nodesCleared}:${encounterIds.join(',')}`);
  const charDef = getCharacterDef(run.characterId);

  const clonedDeck = run.deck.map((c) => ({ ...c, costOverride: undefined }));
  const innate = clonedDeck.filter((c) => getEffectiveCardDef(c).keywords.includes('innate'));
  const rest = rng.shuffle(clonedDeck.filter((c) => !getEffectiveCardDef(c).keywords.includes('innate')));
  const drawPile = [...innate, ...rest];

  const worldEnemyHpMult = options.worldEnemyHpMult ?? 1;
  const worldEnemyStartBlock = options.worldEnemyStartBlock ?? 0;

  const enemies: CombatEnemy[] = encounterIds.map((id, idx) =>
    createEnemyInstance(
      id,
      run.difficulty,
      1,
      encounterIds.length - idx,
      0,
      rng,
      0,
      {},
      worldEnemyHpMult,
      worldEnemyStartBlock
    )
  );

  const isLegendaryEncounter = Boolean(
    options.isLegendary ||
      combatModifier === 'legendary_hunt' ||
      enemies.some((e) => e.role === 'legendary')
  );
  const isSecretBossEncounter = Boolean(
    options.isSecretBoss ||
      combatModifier === 'secret_sanctum' ||
      enemies.some((e) => e.role === 'secret_boss')
  );

  const startEnergy = charDef.startingEnergy + (options.bonusEnergyTurn1 ?? 0);

  const state: CombatState = {
    turn: 1,
    phase: 'PLAYER_TURN',
    playerHp: run.hp,
    playerMaxHp: run.maxHp,
    playerBlock: 0,
    energy: startEnergy,
    maxEnergy: charDef.startingEnergy,
    nextTurnBonusEnergy: 0,
    activeStance: 'neutral',
    activeTraps: [],
    activeReactions: [],
    delayedEffects: [],
    playerStatuses: {},
    drawPile,
    hand: [],
    discardPile: [],
    exhaustPile: [],
    enemies,
    companions: [],
    cardsPlayedThisTurn: 0,
    attacksPlayedThisTurn: 0,
    playerAttacksLastTurn: 0,
    playerSkillsThisTurn: 0,
    playerSkillsLastTurn: 0,
    playerBlocksLastTurn: 0,
    blockGainedThisTurn: 0,
    lastCardCategoryPlayed: null,
    bloodChaliceUsedThisTurn: false,
    alliesSlainCount: 0,
    heroAbilityId: charDef.activeAbility.id,
    heroAbilityCooldown: 0,
    heroAbilityUsesLeft: charDef.activeAbility.maxUsesPerCombat,
    heroAbilityUpgraded: Boolean(options.heroAbilityUpgraded),
    heroAbilityAlternate: Boolean(options.heroAbilityAlternate),
    passiveAmplified: Boolean(options.passiveAmplified),
    selectedEnemyUid: enemies[0]?.uid ?? null,
    combatLog: ['Encounter started.'],
    pendingVisualEvents: [],
    activeTriggers: [],
    isBoss,
    isElite,
    isLegendaryEncounter,
    isSecretBossEncounter,
    combatModifier,
    cardRampBonuses: {},
    lastPlayedCardId: null,
    skillsPlayedCombat: 0,
    rangedAttackedThisTurn: false,
    deadeyeTriggeredThisTurn: false,
  };

  if (worldEnemyHpMult !== 1 || worldEnemyStartBlock > 0) {
    addLog(
      state,
      `Regional World Pressure: Foes begin with ${Math.round((worldEnemyHpMult - 1) * 100)}% HP shift and +${worldEnemyStartBlock} Block.`
    );
  }

  // Apply combat location modifiers
  if (combatModifier === 'stronghold') {
    state.enemies.forEach((e) => {
      e.block += 6;
      e.statuses.strength = (e.statuses.strength ?? 0) + 1;
    });
    addLog(state, 'Stronghold Barricades: Foes start with +6 Block and +1 Strength.');
  } else if (combatModifier === 'challenge_frenzy') {
    state.enemies.forEach((e) => {
      e.statuses.strength = (e.statuses.strength ?? 0) + 2;
    });
    state.energy += 1;
    addLog(state, 'Challenge Trial: Foes gain +2 Strength; you gain +1 Energy on Turn 1.');
  } else if (combatModifier === 'monster_den') {
    state.enemies.forEach((e) => {
      e.statuses.thorns = (e.statuses.thorns ?? 0) + 1;
    });
    addLog(state, 'Monster Den: Foes begin with +1 Thorns.');
  } else if (combatModifier === 'legendary_hunt') {
    addLog(state, 'Legendary Hunt: Apex creature stalks the trail with heightened ferocity.');
  } else if (combatModifier === 'secret_sanctum') {
    state.enemies.forEach((e) => {
      e.statuses.ward = (e.statuses.ward ?? 0) + 1;
    });
    addLog(state, 'Secret Sanctum: Ancient wards empower this hidden guardian (+1 Ward).');
  }

  // Apply starting relic effects
  if (run.relics.includes('ashen_signet')) {
    state.playerBlock += 5;
    state.blockGainedThisTurn += 5;
    state.enemies.forEach((e) => {
      e.statuses.burn = (e.statuses.burn ?? 0) + 2;
    });
    addLog(state, 'Ashen Signet: +5 Block and 2 Burn to all foes.');
  }
  if (run.relics.includes('iron_rosary')) {
    state.playerStatuses.strength = (state.playerStatuses.strength ?? 0) + 1;
    addLog(state, 'Iron Rosary: +1 Strength.');
  }
  if (run.relics.includes('thorn_halo')) {
    state.playerStatuses.thorns = (state.playerStatuses.thorns ?? 0) + 3;
    addLog(state, 'Crown of Briars: +3 Thorns.');
  }
  if (run.relics.includes('sunless_crown')) {
    state.energy += 1;
    addLog(state, 'Fragment of the Ashen Crown: +1 Energy.');
  }
  if (run.relics.includes('mirror_buckler')) {
    state.playerStatuses.ward = (state.playerStatuses.ward ?? 0) + 1;
    addLog(state, 'Mirror Buckler: +1 Ward at start of combat.');
  }
  if (run.relics.includes('curse_reliquary')) {
    const curseCount = countCursesInCombat(state);
    if (curseCount > 0) {
      state.playerStatuses.strength = (state.playerStatuses.strength ?? 0) + curseCount;
      addLog(state, `Obsidian Censer: +${curseCount} Strength from Curse cards.`);
    }
  }
  if (run.relics.includes('penitent_censer')) {
    state.enemies.forEach((e) => {
      e.statuses.burn = (e.statuses.burn ?? 0) + 2;
      e.statuses.vulnerable = (e.statuses.vulnerable ?? 0) + 1;
    });
    addLog(state, 'Penitent Censer: Applied 2 Burn and 1 Vulnerable to all foes.');
  }
  if (run.relics.includes('tidal_chime')) {
    state.playerStatuses.ward = (state.playerStatuses.ward ?? 0) + 1;
    state.playerBlock += 6;
    state.blockGainedThisTurn += 6;
    addLog(state, 'Chime of the Drowned: +1 Ward and +6 Block.');
  }
  if (run.relics.includes('spore_seal')) {
    state.enemies.forEach((e) => {
      e.statuses.poison = (e.statuses.poison ?? 0) + 3;
    });
    addLog(state, 'Mycelial Seal: Applied 3 Poison to all foes.');
  }
  if (run.relics.includes('abyssal_signet')) {
    state.playerStatuses.thorns = (state.playerStatuses.thorns ?? 0) + 2;
    state.playerBlock += 5;
    state.blockGainedThisTurn += 5;
    addLog(state, 'Sunken Crown Signet: +2 Thorns and +5 Block.');
  }
  if (run.relics.includes('bastion_buckler')) {
    state.playerBlock += 8;
    state.blockGainedThisTurn += 8;
    state.playerStatuses.strength = (state.playerStatuses.strength ?? 0) + 1;
    addLog(state, 'Highland Bastion Crest: +8 Block and +1 Strength.');
  }
  if (run.relics.includes('eclipse_brand')) {
    state.playerStatuses.strength = (state.playerStatuses.strength ?? 0) + 2;
    state.enemies.forEach((e) => {
      e.statuses.burn = (e.statuses.burn ?? 0) + 1;
    });
    addLog(state, 'Brand of the Eclipse: +2 Strength and 1 Burn to all foes.');
  }
  if (run.relics.includes('gnarlmaw_heart')) {
    state.playerStatuses.thorns = (state.playerStatuses.thorns ?? 0) + 3;
    addLog(state, 'Heart of Gnarlmaw: +3 Thorns.');
  }
  if (run.relics.includes('pale_compass')) {
    state.energy += 1;
    addLog(state, 'Pale Cartographer Compass: +1 Energy and +1 Draw on Turn 1.');
  }
  if (run.relics.includes('seraph_feather')) {
    state.playerStatuses.ward = (state.playerStatuses.ward ?? 0) + 2;
    state.playerStatuses.strength = (state.playerStatuses.strength ?? 0) + 1;
    addLog(state, 'Hollowed Seraph Pinion: +2 Ward and +1 Strength.');
  }
  if (run.relics.includes('ironclad_aegis')) {
    state.playerBlock += 7;
    state.blockGainedThisTurn += 7;
    state.playerStatuses.thorns = (state.playerStatuses.thorns ?? 0) + 2;
    addLog(state, 'Ironclad Aegis: +7 Block and +2 Thorns.');
  }
  if (run.relics.includes('hollow_censer')) {
    const wraithDef = getCompanionDef('hollow_wraith');
    state.companions.push({
      uid: nextUid('comp'),
      defId: wraithDef.id,
      remainingTurns: 2,
    });
    state.enemies.forEach((e) => {
      e.statuses.weak = (e.statuses.weak ?? 0) + 1;
    });
    addLog(state, 'Hollow Censer: Summoned Hollow Wraith (2t) and applied 1 Weak to all foes.');
  }
  if (run.relics.includes('phantom_bell')) {
    state.enemies.forEach((e) => {
      e.statuses.vulnerable = (e.statuses.vulnerable ?? 0) + 2;
      e.statuses.bleed = (e.statuses.bleed ?? 0) + 2;
    });
    addLog(state, 'Phantom Tolling Bell: Applied 2 Vulnerable and 2 Bleed to all foes.');
  }

  // Draw initial hand
  const bonusT1Draw =
    (options.bonusDrawTurn1 ?? 0) +
    (run.relics.includes('archivist_monocle') ? 1 : 0) +
    (run.relics.includes('pale_compass') ? 1 : 0);
  drawCardsInternal(state, charDef.handSize + bonusT1Draw, rng);

  // Veil Lantern: first card played on Turn 1 costs 0 Energy
  if (run.relics.includes('veil_lantern') && state.hand.length > 0) {
    state.hand = state.hand.map((c) => ({ ...c, costOverride: 0 }));
  }

  return state;
}

export function applyTurnOneDrawBonus(state: CombatState, bonusDraw: number, seed: string): CombatState {
  if (bonusDraw <= 0) return state;
  const next = cloneCombatState(state);
  const rng = new SeededRNG(`${seed}:t1bonus`);
  const prevLen = next.hand.length;
  drawCardsInternal(next, bonusDraw, rng);
  if (next.hand.length > prevLen && next.hand[0]?.costOverride === 0) {
    next.hand = next.hand.map((c) => ({ ...c, costOverride: 0 }));
  }
  return next;
}

function cloneCombatState(state: CombatState): CombatState {
  return {
    ...state,
    playerStatuses: { ...state.playerStatuses },
    activeTraps: state.activeTraps.map((t) => ({ ...t })),
    activeReactions: state.activeReactions.map((r) => ({ ...r })),
    delayedEffects: state.delayedEffects.map((d) => ({ ...d, effects: [...d.effects] })),
    drawPile: state.drawPile.map((c) => ({ ...c })),
    hand: state.hand.map((c) => ({ ...c })),
    discardPile: state.discardPile.map((c) => ({ ...c })),
    exhaustPile: state.exhaustPile.map((c) => ({ ...c })),
    enemies: state.enemies.map((e) => ({
      ...e,
      statuses: { ...e.statuses },
      intent: { ...e.intent },
    })),
    companions: state.companions.map((cp) => ({ ...cp })),
    combatLog: [...state.combatLog],
    pendingVisualEvents: [],
    activeTriggers: [...state.activeTriggers],
    cardRampBonuses: { ...(state.cardRampBonuses ?? {}) },
  };
}

function drawCardsInternal(state: CombatState, count: number, rng: SeededRNG): void {
  for (let i = 0; i < count; i++) {
    if (state.hand.length >= MAX_HAND_SIZE) {
      addLog(state, 'Hand is full (max 10 cards).');
      break;
    }
    if (state.drawPile.length === 0) {
      if (state.discardPile.length === 0) break;
      state.drawPile = rng.shuffle(state.discardPile.map((c) => ({ ...c, costOverride: undefined })));
      state.discardPile = [];
      addLog(state, 'Discard pile reshuffled into draw pile.');
    }
    const card = state.drawPile.shift();
    if (card) {
      state.hand.push(card);
    }
  }
}

function livingEnemies(state: CombatState): CombatEnemy[] {
  return state.enemies.filter((e) => e.hp > 0);
}

export function isFrontlineGuardingBackline(state: CombatState, target: CombatEnemy | undefined): boolean {
  if (!target || target.hp <= 0) return false;
  if (target.position !== 'backline') return false;
  if ((target.statuses.cursed_mark ?? 0) > 0) return false;
  return livingEnemies(state).some(
    (e) => e.uid !== target.uid && e.position === 'frontline' && Boolean(e.guardsBackline)
  );
}

function checkCondition(
  state: CombatState,
  condition: ConditionType,
  selectedEnemy: CombatEnemy | undefined,
  value = 0,
  status?: StatusId,
  cardCategory?: CardCategory,
  stance?: StanceId,
  position?: BattlePosition,
  enemyGroup?: EnemyGroup
): boolean {
  switch (condition) {
    case 'if_target_has_status':
      return Boolean(selectedEnemy && status && (selectedEnemy.statuses[status] ?? 0) > 0);
    case 'if_self_has_status':
      return Boolean(status && (state.playerStatuses[status] ?? 0) > 0);
    case 'if_player_hp_below_pct':
      return (state.playerHp / state.playerMaxHp) * 100 < value;
    case 'if_cards_played_this_turn_gte':
      return state.cardsPlayedThisTurn >= value;
    case 'if_companion_active':
      return state.companions.length > 0;
    case 'if_block_gte':
      return state.playerBlock >= value;
    case 'if_enemy_intending_attack':
      return Boolean(
        selectedEnemy &&
          (selectedEnemy.intent.type === 'attack' ||
            selectedEnemy.intent.type === 'multi_attack' ||
            selectedEnemy.intent.type === 'attack_defend' ||
            selectedEnemy.intent.type === 'attack_debuff' ||
            selectedEnemy.intent.type === 'curse')
      );
    case 'if_last_card_category':
      return Boolean(cardCategory && state.lastCardCategoryPlayed === cardCategory);
    case 'if_enemy_hp_below_pct':
      return Boolean(selectedEnemy && (selectedEnemy.hp / selectedEnemy.maxHp) * 100 < value);
    case 'if_attacks_played_this_turn_gte':
      return state.attacksPlayedThisTurn >= value;
    case 'if_player_debuffed':
      return (['weak', 'vulnerable', 'frail', 'burn', 'poison', 'bleed'] as StatusId[]).some(
        (s) => (state.playerStatuses[s] ?? 0) > 0
      );
    case 'if_stance_is':
      return Boolean(stance && state.activeStance === stance);
    case 'if_curses_in_deck_gte':
      return countCursesInCombat(state) >= value;
    case 'if_deck_size_lte':
      return state.drawPile.length + state.hand.length + state.discardPile.length <= value;
    case 'if_trap_active':
      return state.activeTraps.length >= Math.max(1, value || 1);
    case 'if_enemy_position':
      return Boolean(selectedEnemy && position && selectedEnemy.position === position);
    case 'if_enemy_group_is':
      return Boolean(selectedEnemy && enemyGroup && selectedEnemy.group === enemyGroup);
    case 'if_enemy_is_elite_or_boss':
      return Boolean(
        selectedEnemy &&
          (selectedEnemy.role === 'elite' ||
            selectedEnemy.role === 'leader' ||
            selectedEnemy.role === 'boss' ||
            selectedEnemy.role === 'legendary' ||
            selectedEnemy.role === 'secret_boss')
      );
    case 'if_frontline_guarding':
      return livingEnemies(state).some((e) => e.position === 'frontline' && Boolean(e.guardsBackline));
  }
}

export function previewCardCombatState(
  card: CardInstance,
  combat: CombatState,
  selectedEnemy: CombatEnemy | undefined,
  relics: string[] = []
): CardPreviewInfo {
  const eff = getEffectiveCardDef(card);
  let activeConditionMet = false;
  let willCrit = false;
  let frontlineIntercepted = false;
  const rampBonus = combat.cardRampBonuses?.[card.defId] ?? 0;

  const inspectEffects = (actions: EffectAction[]): { dmg: number | null; baseDmg: number | null; hits: number; blk: number | null; baseBlk: number | null } => {
    let dmg: number | null = null;
    let baseDmg: number | null = null;
    let hits = 1;
    let blk: number | null = null;
    let baseBlk: number | null = null;

    for (const action of actions) {
      if (action.type === 'damage') {
        const target = selectedEnemy;
        let raw = action.amount;
        if (action.useRampBonus) raw += rampBonus;
        if (action.scalingSource === 'curses_in_combat') {
          raw += countCursesInCombat(combat) * (action.scalingMultiplier ?? 1);
        } else if (action.scalingSource === 'traps_active') {
          raw += combat.activeTraps.length * (action.scalingMultiplier ?? 1);
        } else if (action.scalingSource === 'player_block') {
          raw += Math.floor(combat.playerBlock * (action.scalingMultiplier ?? 1));
        } else if (action.scalingStatus) {
          const sourceMap = action.scalingSource === 'self' ? combat.playerStatuses : target?.statuses;
          raw += (sourceMap?.[action.scalingStatus] ?? 0) * (action.scalingMultiplier ?? 1);
        }
        if (action.enemyGroupBonus && target && target.group === action.enemyGroupBonus.group) {
          raw += action.enemyGroupBonus.bonusDamage;
        }
        if (
          action.eliteBossBonus &&
          target &&
          ['elite', 'leader', 'boss', 'legendary', 'secret_boss'].includes(target.role)
        ) {
          raw += action.eliteBossBonus;
        }
        const effectiveRange = action.attackRange ?? eff.attackRange;
        if (effectiveRange === 'ranged' && relics.includes('fletchers_sight')) {
          raw += 2;
        }
        if (
          (effectiveRange === 'ranged' || effectiveRange === 'aoe') &&
          !combat.rangedAttackedThisTurn &&
          relics.includes('thornwind_quiver')
        ) {
          raw += 3;
        }
        const isCrit = Boolean(action.critIfTargetVulnerable && (target?.statuses.vulnerable ?? 0) > 0);
        if (isCrit) {
          willCrit = true;
          raw = Math.floor(raw * 1.5);
        }

        let finalDmg = raw + (combat.playerStatuses.strength ?? 0);
        if (combat.activeStance === 'bulwark') {
          finalDmg = Math.floor(finalDmg * 0.8);
        } else if (combat.activeStance === 'wrath') {
          finalDmg = Math.floor(finalDmg * 1.35);
        }
        if ((combat.playerStatuses.weak ?? 0) > 0) {
          finalDmg = Math.floor(finalDmg * 0.75);
        }
        if ((target?.statuses.vulnerable ?? 0) > 0) {
          finalDmg = Math.floor(finalDmg * 1.5);
        }
        if (
          effectiveRange === 'melee' &&
          action.targetMode !== 'all_enemies' &&
          !action.pierceBlock &&
          isFrontlineGuardingBackline(combat, target)
        ) {
          finalDmg = Math.floor(finalDmg * 0.5);
          frontlineIntercepted = true;
        }
        finalDmg = Math.max(0, finalDmg);

        if (dmg === null) {
          dmg = finalDmg;
          baseDmg = action.amount;
          hits = action.hits ?? 1;
        }
      } else if (action.type === 'block') {
        let val = action.amount;
        if (action.useRampBonus) val += rampBonus;
        if (action.scalingSource === 'curses_in_combat') {
          val += countCursesInCombat(combat) * (action.scalingMultiplier ?? 1);
        } else if (action.scalingSource === 'traps_active') {
          val += combat.activeTraps.length * (action.scalingMultiplier ?? 1);
        } else if (action.scalingStatus) {
          val += (combat.playerStatuses[action.scalingStatus] ?? 0) * (action.scalingMultiplier ?? 1);
        }
        if (combat.activeStance === 'bulwark') {
          val += 3;
        } else if (combat.activeStance === 'eclipse') {
          val = Math.floor(val * 0.75);
        }
        if ((combat.playerStatuses.frail ?? 0) > 0) {
          val = Math.floor(val * 0.75);
        }
        val = Math.max(0, val);
        if (blk === null) {
          blk = val;
          baseBlk = action.amount;
        }
      } else if (action.type === 'conditional') {
        const passed = checkCondition(
          combat,
          action.condition,
          selectedEnemy,
          action.value,
          action.status,
          action.cardCategory,
          action.stance,
          action.position,
          action.enemyGroup
        );
        if (passed) {
          activeConditionMet = true;
        }
        const branch = passed ? action.thenEffects : action.elseEffects ?? [];
        const sub = inspectEffects(branch);
        if (sub.dmg !== null && dmg === null) {
          dmg = sub.dmg;
          baseDmg = sub.baseDmg;
          hits = sub.hits;
        }
        if (sub.blk !== null && blk === null) {
          blk = sub.blk;
          baseBlk = sub.baseBlk;
        }
      }
    }
    return { dmg, baseDmg, hits, blk, baseBlk };
  };

  const res = inspectEffects(eff.effects);
  return {
    effectiveDamage: res.dmg,
    baseDamage: res.baseDmg,
    hits: res.hits,
    effectiveBlock: res.blk,
    baseBlock: res.baseBlk,
    activeConditionMet,
    willCrit,
    attackRange: eff.attackRange,
    frontlineIntercepted,
  };
}

function fireTriggers(
  state: CombatState,
  event: TriggerEventType,
  run: RunState,
  rng: SeededRNG,
  depth: number,
  statusApplied?: StatusId,
  delayMs = 0
): void {
  if (depth >= MAX_TRIGGER_DEPTH) return;
  for (const trig of state.activeTriggers) {
    if (trig.event !== event) continue;
    if (trig.statusFilter && trig.statusFilter !== statusApplied) continue;
    processEffects(state, trig.effects, undefined, run, rng, depth + 1, { delayMs });
  }
}

function checkBossPhases(
  state: CombatState,
  enemy: CombatEnemy,
  run: RunState,
  rng: SeededRNG,
  delayMs = 0
): void {
  if (enemy.hp <= 0) return;
  const def = getEnemyDef(enemy.defId);
  if (!def.phases || def.phases.length === 0) return;

  const hpPct = (enemy.hp / enemy.maxHp) * 100;
  for (const p of def.phases) {
    if (enemy.phase < p.phaseNumber && hpPct <= p.hpThresholdPct) {
      enemy.phase = p.phaseNumber;
      addLog(state, `${enemy.name} enters ${p.name}: "${p.dialogue}"`);
      pushEvent(state, {
        type: 'BOSS_PHASE',
        targetId: enemy.uid,
        label: p.name,
        color: '#F59E0B',
        delayMs,
      });
      p.onEnterSelfStatus?.forEach((s) => {
        enemy.statuses[s.status] = (enemy.statuses[s.status] ?? 0) + s.amount;
      });
      p.onEnterPlayerStatus?.forEach((s) => {
        state.playerStatuses[s.status] = (state.playerStatuses[s.status] ?? 0) + s.amount;
      });
      if (p.onEnterBlock && p.onEnterBlock > 0) {
        enemy.block += p.onEnterBlock;
        pushEvent(state, {
          type: 'BLOCK_GAIN',
          targetId: enemy.uid,
          value: p.onEnterBlock,
          color: '#38BDF8',
          delayMs,
        });
      }
      if (p.onEnterSummonId && livingEnemies(state).length < 3) {
        const summoned = createEnemyInstance(
          p.onEnterSummonId,
          run.difficulty,
          state.turn,
          livingEnemies(state).length,
          state.playerBlock,
          rng,
          state.playerAttacksLastTurn,
          state.playerStatuses
        );
        state.enemies.push(summoned);
        addLog(state, `${enemy.name} summons ${summoned.name}!`);
      }
      const phaseCtx: EnemySelectIntentContext = {
        turn: state.turn,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        phase: enemy.phase,
        alliesCount: livingEnemies(state).length,
        alliesDeadCount: state.alliesSlainCount,
        woundedAllyExists: livingEnemies(state).some((e) => e.hp < e.maxHp * 0.85),
        allyNeedsGuard: livingEnemies(state).some((e) => e.hp < e.maxHp * 0.5 && e.block < 5),
        difficulty: run.difficulty,
        playerBlock: state.playerBlock,
        playerAttacksLastTurn: state.playerAttacksLastTurn,
        playerSkillsLastTurn: state.playerSkillsLastTurn,
        playerBlocksLastTurn: state.playerBlocksLastTurn,
        playerActiveStance: state.activeStance,
        playerStatuses: state.playerStatuses,
        lastIntentType: enemy.lastIntentType,
        cursesInPlayerDeck: countCursesInCombat(state),
        rngNext: () => rng.next(),
      };
      enemy.intent = resolveIntelligentIntent(def, phaseCtx, def.selectIntent(phaseCtx));
    }
  }
}

function applyDamageToEnemy(
  state: CombatState,
  enemy: CombatEnemy,
  rawDamage: number,
  pierceBlock: boolean,
  run: RunState,
  rng: SeededRNG,
  isAttackSource = true,
  isCrit = false,
  delayMs = 0,
  attackRange?: AttackRangeType
): void {
  if (enemy.hp <= 0) return;
  let dmg = rawDamage;
  if (isAttackSource) {
    dmg += state.playerStatuses.strength ?? 0;
    if (state.activeStance === 'bulwark') {
      dmg = Math.floor(dmg * 0.8);
    } else if (state.activeStance === 'wrath') {
      dmg = Math.floor(dmg * 1.35);
    }
    if ((state.playerStatuses.weak ?? 0) > 0) {
      dmg = Math.floor(dmg * 0.75);
    }
  }
  if ((enemy.statuses.vulnerable ?? 0) > 0) {
    dmg = Math.floor(dmg * 1.5);
  }
  if (
    isAttackSource &&
    attackRange === 'melee' &&
    !pierceBlock &&
    isFrontlineGuardingBackline(state, enemy)
  ) {
    dmg = Math.floor(dmg * 0.5);
    addLog(state, `Frontline Guard intercepted partial melee blow on ${enemy.name} (-50%).`);
  }
  dmg = Math.max(0, dmg);

  let hpLoss = dmg;
  if (!pierceBlock && enemy.block > 0) {
    const maxAbsorb =
      isAttackSource && attackRange === 'ranged' && run.relics.includes('fletchers_sight')
        ? Math.floor(enemy.block * 0.5)
        : enemy.block;
    const absorbed = Math.min(maxAbsorb, dmg);
    enemy.block -= absorbed;
    hpLoss -= absorbed;
  }

  if (hpLoss > 0) {
    enemy.hp = Math.max(0, enemy.hp - hpLoss);
    enemy.lastDamageTaken = (enemy.lastDamageTaken ?? 0) + hpLoss;
    pushEvent(state, {
      type: 'DAMAGE_TAKEN',
      targetId: enemy.uid,
      value: hpLoss,
      color: isCrit ? '#FBBF24' : '#EF4444',
      isCrit,
      delayMs,
    });
    if (enemy.hp === 0) {
      state.alliesSlainCount += 1;
      addLog(state, `${enemy.name} is slain!`);
      pushEvent(state, { type: 'ENTITY_DEATH', targetId: enemy.uid, delayMs: delayMs + 80 });
      if (state.selectedEnemyUid === enemy.uid) {
        const nextAlive = livingEnemies(state)[0];
        state.selectedEnemyUid = nextAlive?.uid ?? null;
      }
    } else {
      checkBossPhases(state, enemy, run, rng, delayMs + 40);
    }
  } else {
    pushEvent(state, {
      type: 'BLOCK_GAIN',
      targetId: enemy.uid,
      label: 'BLOCKED',
      color: '#94A3B8',
      delayMs,
    });
  }

  // Stance on-attack bonus status effects
  if (isAttackSource && enemy.hp > 0) {
    if (state.activeStance === 'wrath') {
      enemy.statuses.burn = (enemy.statuses.burn ?? 0) + 1;
      pushEvent(state, {
        type: 'STATUS_APPLIED',
        targetId: enemy.uid,
        statusId: 'burn',
        label: '+1 BURN',
        delayMs: delayMs + 30,
      });
    } else if (state.activeStance === 'eclipse') {
      enemy.statuses.bleed = (enemy.statuses.bleed ?? 0) + 1;
      pushEvent(state, {
        type: 'STATUS_APPLIED',
        targetId: enemy.uid,
        statusId: 'bleed',
        label: '+1 BLEED',
        delayMs: delayMs + 30,
      });
    }
  }

  // Enemy Thorns retaliation on attacks
  if (isAttackSource && (enemy.statuses.thorns ?? 0) > 0 && enemy.hp > 0) {
    applyDamageToPlayer(state, enemy.statuses.thorns ?? 0, false, run, rng, delayMs + 60);
  }
}

function applyDamageToPlayer(
  state: CombatState,
  rawDamage: number,
  fromAttack = true,
  run?: RunState,
  rng?: SeededRNG,
  delayMs = 0
): void {
  let dmg = Math.max(0, rawDamage);
  if (fromAttack && state.activeStance === 'wrath') {
    dmg = Math.floor(dmg * 1.25);
  }
  if (fromAttack && (state.playerStatuses.vulnerable ?? 0) > 0) {
    dmg = Math.floor(dmg * 1.5);
  }
  if (state.playerBlock > 0) {
    const absorbed = Math.min(state.playerBlock, dmg);
    state.playerBlock -= absorbed;
    dmg -= absorbed;
  }
  if (dmg > 0) {
    if ((state.playerStatuses.ward ?? 0) > 0) {
      state.playerStatuses.ward = (state.playerStatuses.ward ?? 1) - 1;
      addLog(state, 'Ward absorbed a lethal strike!');
      pushEvent(state, {
        type: 'BLOCK_GAIN',
        targetId: 'player',
        label: 'WARD',
        color: '#60A5FA',
        delayMs,
      });
      return;
    }
    state.playerHp = Math.max(0, state.playerHp - dmg);
    pushEvent(state, {
      type: 'DAMAGE_TAKEN',
      targetId: 'player',
      value: dmg,
      color: '#EF4444',
      delayMs,
    });
    if (run && rng) {
      fireTriggers(state, 'on_damage_taken', run, rng, 1, undefined, delayMs + 60);
    }
    if (state.playerHp <= 0) {
      state.phase = 'DEFEAT';
      pushEvent(state, { type: 'DEFEAT', delayMs: delayMs + 120 });
    }
  } else {
    pushEvent(state, {
      type: 'BLOCK_GAIN',
      targetId: 'player',
      label: 'BLOCKED',
      color: '#38BDF8',
      delayMs,
    });
  }
}

function grantPlayerBlock(
  state: CombatState,
  rawBlock: number,
  run: RunState,
  rng: SeededRNG,
  depth: number,
  delayMs: number,
  animStyle?: CardAnimationStyle
): void {
  let blockVal = rawBlock;
  if (state.activeStance === 'bulwark') {
    blockVal += 3;
  } else if (state.activeStance === 'eclipse') {
    blockVal = Math.floor(blockVal * 0.75);
  }
  if ((state.playerStatuses.frail ?? 0) > 0) {
    blockVal = Math.floor(blockVal * 0.75);
  }
  blockVal = Math.max(0, blockVal);
  const prevTenBucket = Math.floor(state.blockGainedThisTurn / 10);
  state.playerBlock += blockVal;
  state.blockGainedThisTurn += blockVal;
  pushEvent(state, {
    type: 'BLOCK_GAIN',
    targetId: 'player',
    value: blockVal,
    color: '#38BDF8',
    animStyle,
    delayMs,
  });
  fireTriggers(state, 'on_block_gained', run, rng, depth + 1, undefined, baseOr(delayMs, 40));

  // Vaelen Passive: Ember Oath (or amplified)
  if (
    run.characterId === 'vaelen' &&
    Math.floor(state.blockGainedThisTurn / 10) > prevTenBucket &&
    livingEnemies(state).length > 0
  ) {
    const randTarget = rng.pick(livingEnemies(state));
    const emberDmg = state.passiveAmplified ? 7 : 4;
    addLog(
      state,
      `Ember Oath deals ${emberDmg} damage${state.passiveAmplified ? ' and 2 Burn' : ''} to ${randTarget.name}.`
    );
    pushEvent(state, {
      type: 'SPELL_CAST',
      sourceId: 'player',
      targetId: randTarget.uid,
      animStyle: 'fire_spell',
      label: 'Ember Oath',
      delayMs: delayMs + 60,
    });
    if (state.passiveAmplified) {
      randTarget.statuses.burn = (randTarget.statuses.burn ?? 0) + 2;
      pushEvent(state, {
        type: 'STATUS_APPLIED',
        targetId: randTarget.uid,
        statusId: 'burn',
        label: '+2 BURN',
        delayMs: delayMs + 85,
      });
    }
    applyDamageToEnemy(state, randTarget, emberDmg, false, run, rng, false, false, delayMs + 120);
  }
}

function baseOr(delayMs: number, add: number): number {
  return delayMs + add;
}

function resolveTargets(
  state: CombatState,
  mode: 'selected' | 'all_enemies' | 'random_enemy' | 'self',
  selectedEnemy: CombatEnemy | undefined,
  rng: SeededRNG
): CombatEnemy[] {
  const alive = livingEnemies(state);
  if (alive.length === 0 || mode === 'self') return [];
  if (mode === 'all_enemies') return alive;
  if (mode === 'random_enemy') return [rng.pick(alive)];
  if (selectedEnemy && selectedEnemy.hp > 0) return [selectedEnemy];
  return [alive[0]];
}

function processEffects(
  state: CombatState,
  effects: EffectAction[],
  selectedEnemyUid: string | undefined,
  run: RunState,
  rng: SeededRNG,
  depth: number,
  execCtx: EffectExecutionContext = {}
): void {
  if (depth >= MAX_TRIGGER_DEPTH) return;
  if (state.phase === 'DEFEAT' || state.phase === 'VICTORY') return;

  const baseDelay = execCtx.delayMs ?? 0;

  for (const eff of effects) {
    const selectedEnemy = state.enemies.find((e) => e.uid === selectedEnemyUid && e.hp > 0) ?? livingEnemies(state)[0];

    switch (eff.type) {
      case 'damage': {
        const targets = resolveTargets(state, eff.targetMode ?? 'selected', selectedEnemy, rng);
        const hits = eff.hits ?? 1;
        const effectiveRange =
          eff.attackRange ??
          (eff.targetMode === 'all_enemies' ? 'aoe' : execCtx.attackRange) ??
          'melee';
        const isFirstRangedWithQuiver =
          (effectiveRange === 'ranged' || effectiveRange === 'aoe') &&
          !state.rangedAttackedThisTurn &&
          run.relics.includes('thornwind_quiver');

        for (const t of targets) {
          let amount = eff.amount;
          if (eff.useRampBonus && execCtx.playedCardDefId) {
            amount += state.cardRampBonuses?.[execCtx.playedCardDefId] ?? 0;
          }
          if (eff.scalingSource === 'curses_in_combat') {
            amount += countCursesInCombat(state) * (eff.scalingMultiplier ?? 1);
          } else if (eff.scalingSource === 'traps_active') {
            amount += state.activeTraps.length * (eff.scalingMultiplier ?? 1);
          } else if (eff.scalingSource === 'player_block') {
            amount += Math.floor(state.playerBlock * (eff.scalingMultiplier ?? 1));
          } else if (eff.scalingStatus) {
            const sourceMap = eff.scalingSource === 'self' ? state.playerStatuses : t.statuses;
            const stacks = sourceMap[eff.scalingStatus] ?? 0;
            amount += stacks * (eff.scalingMultiplier ?? 1);
          }
          if (eff.enemyGroupBonus && t.group === eff.enemyGroupBonus.group) {
            amount += eff.enemyGroupBonus.bonusDamage;
          }
          if (
            eff.eliteBossBonus &&
            ['elite', 'leader', 'boss', 'legendary', 'secret_boss'].includes(t.role)
          ) {
            amount += eff.eliteBossBonus;
          }
          if (effectiveRange === 'ranged' && run.relics.includes('fletchers_sight')) {
            amount += 2;
          }
          if (isFirstRangedWithQuiver) {
            amount += 3;
          }
          const isCrit = Boolean(eff.critIfTargetVulnerable && (t.statuses.vulnerable ?? 0) > 0);
          if (isCrit) {
            amount = Math.floor(amount * 1.5);
          }
          for (let h = 0; h < hits; h++) {
            if (t.hp <= 0) break;
            const hitDelay = baseDelay + h * COMBAT_TIMING.PLAYER_MULTI_HIT_INTERVAL_MS;
            pushEvent(state, {
              type: 'PLAYER_ATTACK',
              sourceId: 'player',
              targetId: t.uid,
              value: amount,
              animStyle: execCtx.animStyle,
              isCrit,
              delayMs: hitDelay,
            });
            applyDamageToEnemy(
              state,
              t,
              amount,
              Boolean(eff.pierceBlock),
              run,
              rng,
              true,
              isCrit,
              hitDelay + 35,
              effectiveRange
            );
          }
          if (isFirstRangedWithQuiver && t.hp > 0) {
            t.statuses.cursed_mark = (t.statuses.cursed_mark ?? 0) + 1;
            pushEvent(state, {
              type: 'STATUS_APPLIED',
              targetId: t.uid,
              statusId: 'cursed_mark',
              label: '+1 MARKED',
              delayMs: baseDelay + 40,
            });
          }
        }
        if (effectiveRange === 'ranged' || effectiveRange === 'aoe') {
          if (
            run.characterId === 'sylvarin' &&
            state.rangedAttackedThisTurn &&
            !state.deadeyeTriggeredThisTurn
          ) {
            triggerDeadeyeSight(state, rng, baseDelay + 60);
          }
          state.rangedAttackedThisTurn = true;
        }
        break;
      }

      case 'block': {
        let blockVal = eff.amount;
        if (eff.useRampBonus && execCtx.playedCardDefId) {
          blockVal += state.cardRampBonuses?.[execCtx.playedCardDefId] ?? 0;
        }
        if (eff.scalingSource === 'curses_in_combat') {
          blockVal += countCursesInCombat(state) * (eff.scalingMultiplier ?? 1);
        } else if (eff.scalingSource === 'traps_active') {
          blockVal += state.activeTraps.length * (eff.scalingMultiplier ?? 1);
        } else if (eff.scalingStatus) {
          blockVal += (state.playerStatuses[eff.scalingStatus] ?? 0) * (eff.scalingMultiplier ?? 1);
        }
        grantPlayerBlock(state, blockVal, run, rng, depth, baseDelay, execCtx.animStyle);
        break;
      }

      case 'apply_status': {
        let amount = eff.amount;
        if (eff.status === 'poison' && run.relics.includes('blight_alembic')) {
          amount += 1;
        }
        if (
          state.activeStance === 'alchemical' &&
          eff.target !== 'self' &&
          (eff.status === 'poison' || eff.status === 'burn')
        ) {
          amount += 1;
        }
        if (eff.target === 'self') {
          state.playerStatuses[eff.status] = (state.playerStatuses[eff.status] ?? 0) + amount;
          pushEvent(state, {
            type: 'STATUS_APPLIED',
            targetId: 'player',
            statusId: eff.status,
            label: `+${amount} ${eff.status.toUpperCase()}`,
            delayMs: baseDelay,
          });
        } else {
          const targets = resolveTargets(state, eff.target, selectedEnemy, rng);
          for (const t of targets) {
            t.statuses[eff.status] = (t.statuses[eff.status] ?? 0) + amount;
            pushEvent(state, {
              type: 'STATUS_APPLIED',
              targetId: t.uid,
              statusId: eff.status,
              label: `+${amount} ${eff.status.toUpperCase()}`,
              delayMs: baseDelay,
            });
          }
          if (
            eff.status === 'cursed_mark' &&
            run.characterId === 'sylvarin' &&
            !state.deadeyeTriggeredThisTurn
          ) {
            triggerDeadeyeSight(state, rng, baseDelay + 50);
          }
          fireTriggers(state, 'on_status_applied', run, rng, depth + 1, eff.status, baseDelay + 40);
        }
        break;
      }

      case 'draw':
        drawCardsInternal(state, eff.amount, rng);
        break;

      case 'gain_energy':
        state.energy += eff.amount;
        break;

      case 'gain_energy_next_turn':
        state.nextTurnBonusEnergy += eff.amount;
        addLog(state, `Stored +${eff.amount} Energy for next turn.`);
        break;

      case 'heal': {
        const healed = Math.min(eff.amount, state.playerMaxHp - state.playerHp);
        state.playerHp += healed;
        if (healed > 0) {
          pushEvent(state, {
            type: 'HEAL',
            targetId: 'player',
            value: healed,
            color: '#10B981',
            delayMs: baseDelay,
          });
        }
        break;
      }

      case 'lose_hp': {
        state.playerHp = Math.max(0, state.playerHp - eff.amount);
        pushEvent(state, {
          type: 'DAMAGE_TAKEN',
          targetId: 'player',
          value: eff.amount,
          color: '#DC2626',
          delayMs: baseDelay,
        });
        fireTriggers(state, 'on_damage_taken', run, rng, depth + 1, undefined, baseDelay + 40);
        if (state.playerHp <= 0) {
          state.phase = 'DEFEAT';
          pushEvent(state, { type: 'DEFEAT', delayMs: baseDelay + 120 });
        }
        break;
      }

      case 'summon_companion': {
        const compDef = getCompanionDef(eff.companionId);
        const duration =
          (eff.duration ?? compDef.maxDuration) + (run.relics.includes('bastion_standard') ? 1 : 0);
        if (state.companions.length >= MAX_COMPANIONS) {
          state.companions.shift();
        }
        const comp: ActiveCompanion = {
          uid: nextUid('comp'),
          defId: compDef.id,
          remainingTurns: duration,
        };
        state.companions.push(comp);
        addLog(state, `Summoned ${compDef.name} (${duration} turns).`);
        pushEvent(state, {
          type: 'COMPANION_SUMMON',
          targetId: comp.uid,
          label: compDef.name,
          color: compDef.accentColor,
          animStyle: 'summon',
          delayMs: baseDelay,
        });
        if (run.relics.includes('bastion_standard')) {
          grantPlayerBlock(state, 3, run, rng, depth + 1, baseDelay + 30, 'shield');
        }
        if (run.characterId === 'nyx') {
          triggerHollowChorus(state, run, rng, baseDelay + 60);
        }
        fireTriggers(state, 'on_companion_summon', run, rng, depth + 1, undefined, baseDelay + 80);
        if (run.relics.includes('bone_flute')) {
          processEffects(state, compDef.actEffects, selectedEnemyUid, run, rng, depth + 1, {
            delayMs: baseDelay + 120,
          });
        }
        break;
      }

      case 'trigger_companion_act': {
        for (const cp of state.companions) {
          const cpDef = getCompanionDef(cp.defId);
          pushEvent(state, {
            type: 'COMPANION_ACT',
            sourceId: cp.uid,
            label: cpDef.name,
            color: cpDef.accentColor,
            delayMs: baseDelay,
          });
          processEffects(state, cpDef.actEffects, selectedEnemyUid, run, rng, depth + 1, {
            delayMs: baseDelay + 90,
          });
        }
        break;
      }

      case 'add_card': {
        const count = eff.count ?? 1;
        for (let i = 0; i < count; i++) {
          const inst: CardInstance = {
            uid: nextUid('card'),
            defId: eff.cardId,
            upgraded: Boolean(eff.upgraded),
          };
          if (eff.destination === 'hand') {
            if (state.hand.length < MAX_HAND_SIZE) state.hand.push(inst);
            else state.discardPile.push(inst);
          } else if (eff.destination === 'discard') {
            state.discardPile.push(inst);
          } else {
            state.drawPile.unshift(inst);
          }
        }
        break;
      }

      case 'exhaust_random_hand': {
        for (let i = 0; i < eff.count; i++) {
          if (state.hand.length === 0) break;
          const idx = rng.int(0, state.hand.length - 1);
          const [removed] = state.hand.splice(idx, 1);
          state.exhaustPile.push(removed);
          pushEvent(state, {
            type: 'CARD_EXHAUST',
            label: getEffectiveCardDef(removed).name,
            delayMs: baseDelay,
          });
          fireTriggers(state, 'on_card_exhaust', run, rng, depth + 1, undefined, baseDelay + 40);
          if (run.relics.includes('blood_chalice') && !state.bloodChaliceUsedThisTurn) {
            state.bloodChaliceUsedThisTurn = true;
            state.playerBlock += 3;
            state.energy += 1;
            addLog(state, 'Blood Chalice: +3 Block and +1 Energy (once per turn).');
          }
        }
        break;
      }

      case 'upgrade_hand_cards': {
        const upgradable = state.hand.filter((c) => !c.upgraded && CARDS[c.defId]?.upgraded);
        if (eff.count === -1) {
          upgradable.forEach((c) => {
            c.upgraded = true;
          });
        } else {
          const picked = rng.shuffle(upgradable).slice(0, eff.count);
          picked.forEach((c) => {
            c.upgraded = true;
          });
        }
        break;
      }

      case 'transform_random_hand': {
        const pool = getRewardableCardIds(run.characterId);
        for (let i = 0; i < eff.count; i++) {
          if (state.hand.length === 0) break;
          const idx = rng.int(0, state.hand.length - 1);
          const newId = rng.pick(pool);
          state.hand[idx] = {
            uid: nextUid('card'),
            defId: newId,
            upgraded: state.hand[idx].upgraded,
          };
          addLog(state, `Transformed card into ${getCardDef(newId).name}.`);
        }
        break;
      }

      case 'transform_self': {
        execCtx.transformedInto = {
          cardId: eff.intoCardId,
          upgraded: Boolean(eff.upgraded),
        };
        break;
      }

      case 'purge_curses_in_hand': {
        const remaining: CardInstance[] = [];
        const purged: CardInstance[] = [];
        for (const c of state.hand) {
          if (getEffectiveCardDef(c).category === 'curse') {
            purged.push(c);
          } else {
            remaining.push(c);
          }
        }
        state.hand = remaining;
        const purgedCount = purged.length;
        for (const c of purged) {
          state.exhaustPile.push({ ...c, costOverride: undefined });
          pushEvent(state, {
            type: 'CARD_EXHAUST',
            label: getEffectiveCardDef(c).name,
            delayMs: baseDelay,
          });
          fireTriggers(state, 'on_card_exhaust', run, rng, depth + 1, undefined, baseDelay + 40);
        }
        if (purgedCount > 0) {
          addLog(state, `Purged ${purgedCount} Curse card${purgedCount > 1 ? 's' : ''} from hand.`);
          if (eff.blockPerPurged) {
            grantPlayerBlock(state, purgedCount * eff.blockPerPurged, run, rng, depth + 1, baseDelay + 40, 'ward');
          }
          if (eff.drawPerPurged) {
            drawCardsInternal(state, purgedCount * eff.drawPerPurged, rng);
          }
          if (eff.damagePerPurged) {
            const totalDmg = purgedCount * eff.damagePerPurged;
            for (const t of livingEnemies(state)) {
              pushEvent(state, {
                type: 'SPELL_CAST',
                sourceId: 'player',
                targetId: t.uid,
                animStyle: 'shadow_spell',
                label: 'Absolution',
                delayMs: baseDelay + 50,
              });
              applyDamageToEnemy(state, t, totalDmg, false, run, rng, false, false, baseDelay + 100);
            }
          }
        }
        break;
      }

      case 'enter_stance': {
        const prevStance = state.activeStance;
        state.activeStance = eff.stance;
        const stanceDef = getStanceDef(eff.stance);
        addLog(state, `Entered Stance: ${stanceDef.name}.`);
        pushEvent(state, {
          type: 'STANCE_CHANGE',
          targetId: 'player',
          label: stanceDef.name,
          color: stanceDef.accentColor,
          animStyle: 'stance',
          delayMs: baseDelay,
        });
        if (prevStance !== eff.stance) {
          if (run.relics.includes('stance_medallion') && eff.stance !== 'neutral') {
            grantPlayerBlock(state, 4, run, rng, depth + 1, baseDelay + 40, 'stance');
            drawCardsInternal(state, 1, rng);
            addLog(state, 'Pendulum Medallion: +4 Block and drew 1 card.');
          }
          fireTriggers(state, 'on_stance_changed', run, rng, depth + 1, undefined, baseDelay + 50);
        }
        break;
      }

      case 'add_trap': {
        const trap: CombatTrap = {
          uid: nextUid('trap'),
          trapId: eff.trapId,
          name: eff.name,
          triggerOn: eff.triggerOn,
          damage: eff.damage,
          block: eff.block,
          status: eff.status,
          statusAmount: eff.statusAmount,
          targetMode: eff.targetMode ?? 'attacker',
          charges: eff.charges ?? 1,
        };
        state.activeTraps.push(trap);
        addLog(state, `Set Trap: ${eff.name}.`);
        pushEvent(state, {
          type: 'TRAP_SET',
          targetId: 'player',
          label: eff.name,
          color: '#F59E0B',
          animStyle: 'trap',
          delayMs: baseDelay,
        });
        break;
      }

      case 'add_reaction': {
        const reaction: CombatReaction = {
          uid: nextUid('react'),
          reactionId: eff.reactionId,
          name: eff.name,
          triggerOn: eff.triggerOn,
          block: eff.block,
          counterDamage: eff.counterDamage,
          status: eff.status,
          statusAmount: eff.statusAmount,
          ward: eff.ward,
          draw: eff.draw,
        };
        state.activeReactions.push(reaction);
        addLog(state, `Armed Reaction: ${eff.name}.`);
        pushEvent(state, {
          type: 'REACTION_ARMED',
          targetId: 'player',
          label: eff.name,
          color: '#38BDF8',
          animStyle: 'reaction',
          delayMs: baseDelay,
        });
        break;
      }

      case 'schedule_delayed': {
        state.delayedEffects.push({
          uid: nextUid('ritual'),
          label: eff.label,
          turnsRemaining: eff.turns,
          effects: [...eff.effects],
        });
        addLog(state, `Ritual Scheduled: ${eff.label} (${eff.turns} turn${eff.turns > 1 ? 's' : ''}).`);
        pushEvent(state, {
          type: 'RITUAL_SCHEDULED',
          targetId: 'player',
          label: `${eff.label} (${eff.turns}T)`,
          color: '#C084FC',
          animStyle: 'ritual',
          delayMs: baseDelay,
        });
        if (run.relics.includes('chronicle_quill')) {
          grantPlayerBlock(state, 4, run, rng, depth + 1, baseDelay + 30, 'ward');
          drawCardsInternal(state, 1, rng);
          addLog(state, 'Chronicle Quill: +4 Block and drew 1 card.');
        }
        break;
      }

      case 'remove_status': {
        if (eff.target === 'self') {
          if (eff.status === 'debuffs') {
            delete state.playerStatuses.weak;
            delete state.playerStatuses.vulnerable;
            delete state.playerStatuses.frail;
            delete state.playerStatuses.burn;
            delete state.playerStatuses.poison;
            delete state.playerStatuses.bleed;
          } else {
            delete state.playerStatuses[eff.status];
          }
        } else if (selectedEnemy) {
          if (eff.status === 'debuffs') {
            delete selectedEnemy.statuses.weak;
            delete selectedEnemy.statuses.vulnerable;
            delete selectedEnemy.statuses.frail;
          } else {
            delete selectedEnemy.statuses[eff.status];
          }
        }
        break;
      }

      case 'ramp_card_potency': {
        if (execCtx.playedCardDefId) {
          state.cardRampBonuses = state.cardRampBonuses ?? {};
          state.cardRampBonuses[execCtx.playedCardDefId] =
            (state.cardRampBonuses[execCtx.playedCardDefId] ?? 0) + eff.amount;
          addLog(
            state,
            `${getCardDef(execCtx.playedCardDefId).name} permanently gained +${eff.amount} potency this combat.`
          );
        }
        break;
      }

      case 'move_enemy_position': {
        const targets =
          eff.target === 'all_enemies'
            ? livingEnemies(state)
            : selectedEnemy
            ? [selectedEnemy]
            : [];
        for (const t of targets) {
          if (t.position !== eff.position) {
            t.position = eff.position;
            addLog(state, `${t.name} shifted to ${eff.position === 'frontline' ? 'Frontline' : 'Backline'}.`);
            pushEvent(state, {
              type: 'ALLY_SUPPORT',
              targetId: t.uid,
              label: eff.position === 'frontline' ? 'PULLED FRONT' : 'PUSHED BACK',
              color: '#F59E0B',
              delayMs: baseDelay + 30,
            });
          }
        }
        break;
      }

      case 'empower_companions': {
        if (state.companions.length > 0) {
          if (eff.bonusTurns && eff.bonusTurns > 0) {
            for (const cp of state.companions) {
              cp.remainingTurns += eff.bonusTurns;
            }
            addLog(state, `Companions empowered (+${eff.bonusTurns} turn${eff.bonusTurns > 1 ? 's' : ''}).`);
          }
          if (run.characterId === 'nyx') {
            triggerHollowChorus(state, run, rng, baseDelay + 40);
          }
          if (eff.triggerActs) {
            for (const cp of state.companions) {
              const cpDef = getCompanionDef(cp.defId);
              pushEvent(state, {
                type: 'COMPANION_ACT',
                sourceId: cp.uid,
                label: cpDef.name,
                color: cpDef.accentColor,
                delayMs: baseDelay + 50,
              });
              processEffects(state, cpDef.actEffects, selectedEnemyUid, run, rng, depth + 1, {
                delayMs: baseDelay + 110,
              });
            }
          }
        }
        break;
      }

      case 'sacrifice_companion': {
        const sacrificed = state.companions.shift();
        if (sacrificed) {
          const cpDef = getCompanionDef(sacrificed.defId);
          addLog(state, `Sacrificed ${cpDef.name} to unleash Veil energy!`);
          pushEvent(state, {
            type: 'CARD_EXHAUST',
            targetId: sacrificed.uid,
            label: `${cpDef.name} Sacrificed`,
            color: '#C084FC',
            delayMs: baseDelay,
          });
          processEffects(state, eff.thenEffects, selectedEnemyUid, run, rng, depth + 1, {
            ...execCtx,
            delayMs: baseDelay + 70,
          });
        }
        break;
      }

      case 'copy_last_card': {
        const sourceId = state.lastPlayedCardId;
        if (sourceId && CARDS[sourceId]) {
          const copy: CardInstance = {
            uid: nextUid('tempcard'),
            defId: sourceId,
            upgraded: false,
            costOverride: eff.freeThisTurn ? 0 : undefined,
          };
          if (state.hand.length < MAX_HAND_SIZE) state.hand.push(copy);
          else state.discardPile.push(copy);
          addLog(state, `Copied ${getCardDef(sourceId).name} into hand.`);
        } else {
          drawCardsInternal(state, 1, rng);
        }
        break;
      }

      case 'add_temp_card': {
        const tempInst: CardInstance = {
          uid: nextUid('tempcard'),
          defId: eff.cardId,
          upgraded: Boolean(eff.upgraded),
          costOverride: eff.costZero ? 0 : undefined,
        };
        if (state.hand.length < MAX_HAND_SIZE) state.hand.push(tempInst);
        else state.discardPile.push(tempInst);
        break;
      }

      case 'conditional': {
        const passed = checkCondition(
          state,
          eff.condition,
          selectedEnemy,
          eff.value,
          eff.status,
          eff.cardCategory,
          eff.stance,
          eff.position,
          eff.enemyGroup
        );
        if (passed) {
          processEffects(state, eff.thenEffects, selectedEnemyUid, run, rng, depth + 1, execCtx);
        } else if (eff.elseEffects) {
          processEffects(state, eff.elseEffects, selectedEnemyUid, run, rng, depth + 1, execCtx);
        }
        break;
      }
    }
  }

  if (livingEnemies(state).length === 0 && state.phase !== 'DEFEAT') {
    state.phase = 'VICTORY';
    pushEvent(state, { type: 'VICTORY', delayMs: baseDelay + 180 });
  }
}

export function playCardFromHand(
  prevState: CombatState,
  cardUid: string,
  targetEnemyUid: string | null,
  run: RunState
): CombatState {
  if (prevState.phase !== 'PLAYER_TURN') return prevState;
  const idx = prevState.hand.findIndex((c) => c.uid === cardUid);
  if (idx === -1) return prevState;

  const card = prevState.hand[idx];
  const effCard = getEffectiveCardDef(card);
  if (prevState.energy < effCard.cost) return prevState;

  const state = cloneCombatState(prevState);
  const rng = new SeededRNG(`${run.seed}:play:${state.turn}:${state.cardsPlayedThisTurn}:${card.uid}`);

  const wasFirstCardTurnOne = state.turn === 1 && state.cardsPlayedThisTurn === 0;
  state.hand.splice(idx, 1);
  if (wasFirstCardTurnOne && run.relics.includes('veil_lantern')) {
    state.hand = state.hand.map((c) => ({ ...c, costOverride: undefined }));
    drawCardsInternal(state, 1, rng);
    addLog(state, 'Veil Lantern: First card free & drew 1 card.');
  }

  state.energy -= effCard.cost;
  state.cardsPlayedThisTurn += 1;
  if (effCard.category === 'attack') state.attacksPlayedThisTurn += 1;
  if (
    effCard.category === 'skill' ||
    effCard.category === 'power' ||
    effCard.category === 'ritual' ||
    effCard.category === 'stance' ||
    effCard.category === 'trap'
  ) {
    state.playerSkillsThisTurn += 1;
  }

  // Astral Astrolabe relic: every 3rd Skill or Ritual played in combat grants +1 Energy
  if (effCard.category === 'skill' || effCard.category === 'ritual') {
    state.skillsPlayedCombat = (state.skillsPlayedCombat ?? 0) + 1;
    if (run.relics.includes('astral_astrolabe') && state.skillsPlayedCombat % 3 === 0) {
      state.energy += 1;
      addLog(state, 'Astral Astrolabe: 3rd Skill/Ritual granted +1 Energy.');
    }
  }

  // Kaelith Passive: Shadow Cadence (every 4th card, or every 3rd + draw 1 when amplified)
  const cadenceThreshold = state.passiveAmplified ? 3 : 4;
  if (run.characterId === 'kaelith' && state.cardsPlayedThisTurn % cadenceThreshold === 0) {
    state.energy += 1;
    if (state.passiveAmplified) {
      drawCardsInternal(state, 1, rng);
      addLog(state, 'Shadow Cadence+: +1 Energy & drew 1 card.');
    } else {
      addLog(state, 'Shadow Cadence: +1 Energy.');
    }
  }

  // Eclipse Stance bonus: every 3rd card played draws 1 card
  if (state.activeStance === 'eclipse' && state.cardsPlayedThisTurn % 3 === 0) {
    drawCardsInternal(state, 1, rng);
    addLog(state, 'Veil Step Stance: Every 3rd card draws 1.');
  }

  // Register any power triggers carried by this card
  if (effCard.triggers.length > 0) {
    state.activeTriggers.push(...effCard.triggers);
  }

  const chosenTarget = targetEnemyUid ?? state.selectedEnemyUid ?? livingEnemies(state)[0]?.uid;
  const fallbackAnimByCat: Record<CardCategory, CardAnimationStyle> = {
    attack: 'slash',
    defense: 'shield',
    skill: 'shadow_spell',
    power: 'ward',
    summoning: 'summon',
    curse: 'curse',
    ritual: 'ritual',
    trap: 'trap',
    reaction: 'reaction',
    stance: 'stance',
  };
  const animStyle: CardAnimationStyle = effCard.animationStyle ?? fallbackAnimByCat[effCard.category] ?? 'slash';

  addLog(state, `Played ${effCard.name}.`);

  if (effCard.category === 'skill' || effCard.category === 'power' || effCard.category === 'curse') {
    pushEvent(state, {
      type: 'SPELL_CAST',
      sourceId: 'player',
      targetId: effCard.needsTarget ? chosenTarget ?? 'player' : 'player',
      label: effCard.name,
      animStyle,
    });
  } else if (effCard.category === 'defense') {
    pushEvent(state, {
      type: 'DEFENSE_CAST',
      sourceId: 'player',
      targetId: 'player',
      label: effCard.name,
      animStyle,
    });
  }

  const execCtx: EffectExecutionContext = {
    animStyle,
    delayMs: 0,
    attackRange: effCard.attackRange,
    playedCardDefId: card.defId,
  };
  processEffects(state, effCard.effects, chosenTarget, run, rng, 0, execCtx);

  state.lastCardCategoryPlayed = effCard.category;
  if (card.defId !== 'echo_script') {
    state.lastPlayedCardId = card.defId;
  }

  // Echo keyword: spawns a temporary Ethereal copy in hand (does not re-trigger Echo)
  if (
    effCard.keywords.includes('echo') &&
    !card.uid.startsWith('echocopy_') &&
    !card.uid.startsWith('tempcard_') &&
    state.phase !== 'VICTORY'
  ) {
    const echoCopy: CardInstance = {
      uid: nextUid('echocopy'),
      defId: card.defId,
      upgraded: card.upgraded,
    };
    if (state.hand.length < MAX_HAND_SIZE) {
      state.hand.push(echoCopy);
      addLog(state, `Echo: Added an Ethereal copy of ${effCard.name} to hand.`);
    } else {
      state.discardPile.push(echoCopy);
    }
  }

  // Handle in-combat card self-transformation before discarding
  let finalCard: CardInstance = { ...card, costOverride: undefined };
  if (execCtx.transformedInto) {
    finalCard = {
      ...finalCard,
      defId: execCtx.transformedInto.cardId,
      upgraded: execCtx.transformedInto.upgraded,
    };
    addLog(state, `${effCard.name} transformed into ${getCardDef(finalCard.defId).name}${finalCard.upgraded ? '+' : ''}!`);
  }

  // Move played card to Exhaust or Discard
  if (effCard.keywords.includes('exhaust')) {
    if (!card.uid.startsWith('echocopy_') && !card.uid.startsWith('tempcard_')) {
      state.exhaustPile.push(finalCard);
    }
    pushEvent(state, { type: 'CARD_EXHAUST', label: effCard.name });
    fireTriggers(state, 'on_card_exhaust', run, rng, 1);
    if (run.relics.includes('blood_chalice') && !state.bloodChaliceUsedThisTurn) {
      state.bloodChaliceUsedThisTurn = true;
      state.playerBlock += 3;
      state.energy += 1;
      addLog(state, 'Blood Chalice: +3 Block and +1 Energy (once per turn).');
    }
  } else {
    state.discardPile.push(finalCard);
  }

  return state;
}

function triggerDeadeyeSight(state: CombatState, rng: SeededRNG, delayMs: number): void {
  if (state.deadeyeTriggeredThisTurn) return;
  state.deadeyeTriggeredThisTurn = true;
  drawCardsInternal(state, 1, rng);
  if (state.passiveAmplified) {
    state.energy += 1;
    addLog(state, 'Deadeye Sight+: Drew 1 card and gained +1 Energy.');
  } else {
    addLog(state, 'Deadeye Sight: Drew 1 card.');
  }
  pushEvent(state, {
    type: 'ALLY_SUPPORT',
    targetId: 'player',
    label: state.passiveAmplified ? 'Deadeye+' : 'Deadeye',
    color: '#22C55E',
    delayMs,
  });
}

function triggerHollowChorus(
  state: CombatState,
  run: RunState,
  rng: SeededRNG,
  delayMs: number
): void {
  const dmg = state.passiveAmplified ? 5 : 3;
  for (const e of livingEnemies(state)) {
    applyDamageToEnemy(state, e, dmg, true, run, rng, false, false, delayMs);
    if (state.passiveAmplified && e.hp > 0) {
      e.statuses.bleed = (e.statuses.bleed ?? 0) + 1;
    }
  }
  addLog(
    state,
    `Hollow Chorus dealt ${dmg} piercing AoE damage${state.passiveAmplified ? ' & 1 Bleed' : ''}.`
  );
}

export function useHeroAbility(
  prevState: CombatState,
  targetEnemyUid: string | null,
  run: RunState
): CombatState {
  if (prevState.phase !== 'PLAYER_TURN') return prevState;
  const charDef = getCharacterDef(run.characterId);
  const ab = charDef.activeAbility;
  if (
    prevState.heroAbilityCooldown > 0 ||
    prevState.heroAbilityUsesLeft <= 0 ||
    prevState.energy < ab.energyCost
  ) {
    return prevState;
  }

  const state = cloneCombatState(prevState);
  const rng = new SeededRNG(`${run.seed}:ability:${state.turn}:${state.heroAbilityUsesLeft}`);
  state.energy -= ab.energyCost;
  state.heroAbilityCooldown = ab.cooldownTurns;
  state.heroAbilityUsesLeft -= 1;

  const chosenTargetUid = targetEnemyUid ?? state.selectedEnemyUid ?? livingEnemies(state)[0]?.uid;
  const target = state.enemies.find((e) => e.uid === chosenTargetUid && e.hp > 0) ?? livingEnemies(state)[0];
  const label = state.heroAbilityAlternate
    ? ab.alternateName
    : state.heroAbilityUpgraded
    ? ab.upgradedName
    : ab.name;

  addLog(state, `Hero Ability activated: ${label}.`);
  pushEvent(state, {
    type: 'HERO_ABILITY',
    sourceId: 'player',
    targetId: target?.uid ?? 'player',
    label,
    color: ab.accentColor,
    animStyle:
      run.characterId === 'vaelen'
        ? 'fire_spell'
        : run.characterId === 'morwen'
        ? 'poison_spell'
        : run.characterId === 'sylvarin'
        ? 'arrow_shot'
        : run.characterId === 'vesperis'
        ? 'arcane_beam'
        : run.characterId === 'orin'
        ? 'bastion_slam'
        : 'shadow_spell',
  });

  if (run.characterId === 'vaelen') {
    if (state.heroAbilityAlternate) {
      if (target) {
        const bonus = target.statuses.burn ?? 0;
        applyDamageToEnemy(state, target, 14 + bonus, false, run, rng, true, false, 60, 'melee');
      }
      grantPlayerBlock(state, 6, run, rng, 0, 40, 'shield');
    } else if (state.heroAbilityUpgraded) {
      grantPlayerBlock(state, 12, run, rng, 0, 40, 'shield');
      state.playerStatuses.ward = (state.playerStatuses.ward ?? 0) + 1;
      pushEvent(state, { type: 'STATUS_APPLIED', targetId: 'player', statusId: 'ward', label: '+1 WARD', delayMs: 60 });
      for (const e of livingEnemies(state)) {
        e.statuses.burn = (e.statuses.burn ?? 0) + 4;
        pushEvent(state, { type: 'STATUS_APPLIED', targetId: e.uid, statusId: 'burn', label: '+4 BURN', delayMs: 70 });
      }
    } else {
      grantPlayerBlock(state, 9, run, rng, 0, 40, 'shield');
      for (const e of livingEnemies(state)) {
        e.statuses.burn = (e.statuses.burn ?? 0) + 3;
        pushEvent(state, { type: 'STATUS_APPLIED', targetId: e.uid, statusId: 'burn', label: '+3 BURN', delayMs: 70 });
      }
    }
  } else if (run.characterId === 'morwen') {
    if (state.heroAbilityAlternate) {
      if (target) {
        const curPoison = target.statuses.poison ?? 0;
        const added = curPoison > 0 ? Math.min(10, curPoison) : 4;
        target.statuses.poison = curPoison + added;
        pushEvent(state, {
          type: 'STATUS_APPLIED',
          targetId: target.uid,
          statusId: 'poison',
          label: `+${added} POISON`,
          delayMs: 60,
        });
      }
      const healed = Math.min(5, state.playerMaxHp - state.playerHp);
      state.playerHp += healed;
      if (healed > 0) {
        pushEvent(state, { type: 'HEAL', targetId: 'player', value: healed, color: '#10B981', delayMs: 80 });
      }
    } else if (state.heroAbilityUpgraded) {
      if (target) {
        const add = 6 + (run.relics.includes('blight_alembic') ? 1 : 0);
        target.statuses.poison = (target.statuses.poison ?? 0) + add;
        pushEvent(state, { type: 'STATUS_APPLIED', targetId: target.uid, statusId: 'poison', label: `+${add} POISON`, delayMs: 60 });
      }
      state.playerStatuses.ward = (state.playerStatuses.ward ?? 0) + 1;
      pushEvent(state, { type: 'STATUS_APPLIED', targetId: 'player', statusId: 'ward', label: '+1 WARD', delayMs: 75 });
      drawCardsInternal(state, 1, rng);
    } else {
      if (target) {
        const add = 4 + (run.relics.includes('blight_alembic') ? 1 : 0);
        target.statuses.poison = (target.statuses.poison ?? 0) + add;
        pushEvent(state, { type: 'STATUS_APPLIED', targetId: target.uid, statusId: 'poison', label: `+${add} POISON`, delayMs: 60 });
      }
      drawCardsInternal(state, 1, rng);
    }
  } else if (run.characterId === 'sylvarin') {
    if (state.heroAbilityAlternate) {
      if (target) {
        const dmg = target.position === 'backline' ? 26 : 18;
        applyDamageToEnemy(state, target, dmg, true, run, rng, true, true, 60, 'ranged');
      }
    } else if (target) {
      const perArrow = state.heroAbilityUpgraded ? 7 : 5;
      const markAmt = state.heroAbilityUpgraded ? 3 : 2;
      for (let h = 0; h < 2; h++) {
        if (target.hp <= 0) break;
        applyDamageToEnemy(
          state,
          target,
          perArrow,
          true,
          run,
          rng,
          true,
          false,
          40 + h * COMBAT_TIMING.PLAYER_MULTI_HIT_INTERVAL_MS,
          'ranged'
        );
      }
      if (target.hp > 0) {
        target.statuses.cursed_mark = (target.statuses.cursed_mark ?? 0) + markAmt;
        pushEvent(state, { type: 'STATUS_APPLIED', targetId: target.uid, statusId: 'cursed_mark', label: `+${markAmt} MARKED`, delayMs: 120 });
        if (state.heroAbilityUpgraded) {
          target.statuses.vulnerable = (target.statuses.vulnerable ?? 0) + 2;
          pushEvent(state, { type: 'STATUS_APPLIED', targetId: target.uid, statusId: 'vulnerable', label: '+2 VULN', delayMs: 150 });
        }
        if (!state.deadeyeTriggeredThisTurn) triggerDeadeyeSight(state, rng, 170);
      }
    }
  } else if (run.characterId === 'vesperis') {
    if (state.heroAbilityAlternate) {
      state.energy += 2;
      drawCardsInternal(state, 1, rng);
      for (const e of livingEnemies(state)) {
        e.statuses.burn = (e.statuses.burn ?? 0) + 2;
        pushEvent(state, { type: 'STATUS_APPLIED', targetId: e.uid, statusId: 'burn', label: '+2 BURN', delayMs: 60 });
      }
    } else {
      const dmg = state.heroAbilityUpgraded ? 12 : 8;
      const burnAmt = state.heroAbilityUpgraded ? 3 : 2;
      for (const e of livingEnemies(state)) {
        applyDamageToEnemy(state, e, dmg, false, run, rng, true, false, 60, 'aoe');
        if (e.hp > 0) {
          e.statuses.burn = (e.statuses.burn ?? 0) + burnAmt;
          pushEvent(state, { type: 'STATUS_APPLIED', targetId: e.uid, statusId: 'burn', label: `+${burnAmt} BURN`, delayMs: 90 });
        }
      }
      if (state.heroAbilityUpgraded) {
        state.playerStatuses.ward = (state.playerStatuses.ward ?? 0) + 1;
        pushEvent(state, { type: 'STATUS_APPLIED', targetId: 'player', statusId: 'ward', label: '+1 WARD', delayMs: 110 });
      }
    }
  } else if (run.characterId === 'orin') {
    if (state.heroAbilityAlternate) {
      const dmg = 6 + Math.floor(state.playerBlock * 0.7);
      for (const e of livingEnemies(state)) {
        applyDamageToEnemy(state, e, dmg, false, run, rng, true, false, 60, 'aoe');
      }
      grantPlayerBlock(state, 5, run, rng, 0, 90, 'shield');
    } else {
      const blk = state.heroAbilityUpgraded ? 15 : 10;
      grantPlayerBlock(state, blk, run, rng, 0, 40, 'shield');
      if (state.heroAbilityUpgraded) {
        state.playerStatuses.thorns = (state.playerStatuses.thorns ?? 0) + 2;
        pushEvent(state, { type: 'STATUS_APPLIED', targetId: 'player', statusId: 'thorns', label: '+2 THORNS', delayMs: 60 });
      }
      if (target && target.position !== 'frontline') {
        target.position = 'frontline';
        addLog(state, `Bastion Charge pulled ${target.name} into the Frontline!`);
        pushEvent(state, { type: 'ALLY_SUPPORT', targetId: target.uid, label: 'PULLED FRONT', color: '#F59E0B', delayMs: 80 });
      }
    }
  } else if (run.characterId === 'nyx') {
    if (state.heroAbilityAlternate) {
      processEffects(
        state,
        [
          { type: 'summon_companion', companionId: 'hollow_wraith', duration: 2 },
          { type: 'apply_status', target: 'selected', status: 'weak', amount: 2 },
          { type: 'apply_status', target: 'selected', status: 'bleed', amount: 2 },
        ],
        target?.uid,
        run,
        rng,
        0,
        { delayMs: 50 }
      );
    } else {
      const blk = state.heroAbilityUpgraded ? 8 : 5;
      grantPlayerBlock(state, blk, run, rng, 0, 40, 'ward');
      processEffects(
        state,
        [{ type: 'empower_companions', bonusTurns: state.heroAbilityUpgraded ? 1 : 0, triggerActs: true }],
        target?.uid,
        run,
        rng,
        0,
        { delayMs: 60 }
      );
    }
  } else {
    // Kaelith
    if (state.heroAbilityAlternate) {
      if (target) {
        for (let h = 0; h < 2; h++) {
          if (target.hp <= 0) break;
          applyDamageToEnemy(state, target, 11, false, run, rng, true, false, 50 + h * COMBAT_TIMING.PLAYER_MULTI_HIT_INTERVAL_MS, 'melee');
        }
        if (target.hp > 0) {
          target.statuses.bleed = (target.statuses.bleed ?? 0) + 3;
          pushEvent(state, { type: 'STATUS_APPLIED', targetId: target.uid, statusId: 'bleed', label: '+3 BLEED', delayMs: 140 });
        }
      }
    } else {
      state.energy += 1;
      drawCardsInternal(state, 2, rng);
      if (state.heroAbilityUpgraded) {
        grantPlayerBlock(state, 5, run, rng, 0, 50, 'shield');
      }
      const shiv: CardInstance = {
        uid: nextUid('card'),
        defId: 'echo_shiv',
        upgraded: state.heroAbilityUpgraded,
      };
      if (state.hand.length < MAX_HAND_SIZE) state.hand.push(shiv);
      else state.discardPile.push(shiv);
    }
  }

  if (livingEnemies(state).length === 0 && state.phase !== 'DEFEAT') {
    state.phase = 'VICTORY';
    pushEvent(state, { type: 'VICTORY', delayMs: 220 });
  }

  return state;
}

export function selectEnemyTarget(state: CombatState, enemyUid: string): CombatState {
  const exists = state.enemies.some((e) => e.uid === enemyUid && e.hp > 0);
  if (!exists) return state;
  return { ...state, selectedEnemyUid: enemyUid };
}

function triggerMatchingTraps(
  state: CombatState,
  enemy: CombatEnemy,
  condition: TrapTriggerCondition,
  run: RunState,
  rng: SeededRNG,
  delayMs: number
): void {
  if (state.activeTraps.length === 0 || enemy.hp <= 0) return;

  const remainingTraps: CombatTrap[] = [];
  for (const trap of state.activeTraps) {
    const matches = trap.triggerOn === condition || trap.triggerOn === 'enemy_any_action';
    if (!matches || enemy.hp <= 0) {
      remainingTraps.push(trap);
      continue;
    }

    const bonusDmg = run.relics.includes('snare_toolkit') ? 3 : 0;
    const bonusBlk = run.relics.includes('snare_toolkit') ? 4 : 0;

    addLog(state, `Trap sprung: ${trap.name} against ${enemy.name}!`);
    pushEvent(state, {
      type: 'TRAP_TRIGGER',
      sourceId: 'player',
      targetId: enemy.uid,
      label: trap.name,
      color: '#F59E0B',
      animStyle: 'trap',
      delayMs,
    });

    const targets = trap.targetMode === 'all_enemies' ? livingEnemies(state) : [enemy];
    const dmg = (trap.damage ?? 0) + bonusDmg;
    for (const t of targets) {
      if (t.hp <= 0) continue;
      if (dmg > 0) {
        applyDamageToEnemy(state, t, dmg, false, run, rng, false, false, delayMs + 45);
      }
      if (trap.status && trap.statusAmount && t.hp > 0) {
        t.statuses[trap.status] = (t.statuses[trap.status] ?? 0) + trap.statusAmount;
        pushEvent(state, {
          type: 'STATUS_APPLIED',
          targetId: t.uid,
          statusId: trap.status,
          label: `+${trap.statusAmount} ${trap.status.toUpperCase()}`,
          delayMs: delayMs + 60,
        });
      }
    }

    const totalBlk = (trap.block ?? 0) + bonusBlk;
    if (totalBlk > 0) {
      grantPlayerBlock(state, totalBlk, run, rng, 1, delayMs + 40, 'trap');
    }

    fireTriggers(state, 'on_trap_triggered', run, rng, 1, undefined, delayMs + 70);

    if (trap.charges > 1) {
      remainingTraps.push({ ...trap, charges: trap.charges - 1 });
    }
  }
  state.activeTraps = remainingTraps;
}

function triggerMatchingReactions(
  state: CombatState,
  enemy: CombatEnemy,
  condition: ReactionTriggerCondition,
  run: RunState,
  rng: SeededRNG,
  delayMs: number
): void {
  if (state.activeReactions.length === 0 || state.playerHp <= 0) return;

  const remaining: CombatReaction[] = [];
  for (const r of state.activeReactions) {
    if (r.triggerOn !== condition) {
      remaining.push(r);
      continue;
    }

    addLog(state, `Reaction triggered: ${r.name}!`);
    pushEvent(state, {
      type: 'REACTION_TRIGGER',
      sourceId: 'player',
      targetId: enemy.hp > 0 ? enemy.uid : 'player',
      label: r.name,
      color: '#38BDF8',
      animStyle: 'reaction',
      delayMs,
    });

    if (r.block && r.block > 0) {
      grantPlayerBlock(state, r.block, run, rng, 1, delayMs + 25, 'reaction');
    }
    if (r.ward && r.ward > 0) {
      state.playerStatuses.ward = (state.playerStatuses.ward ?? 0) + r.ward;
      pushEvent(state, {
        type: 'STATUS_APPLIED',
        targetId: 'player',
        statusId: 'ward',
        label: `+${r.ward} WARD`,
        delayMs: delayMs + 30,
      });
    }
    if (r.draw && r.draw > 0) {
      drawCardsInternal(state, r.draw, rng);
    }
    const counterBonus = run.relics.includes('mirror_buckler') ? 3 : 0;
    const counterDmg = (r.counterDamage ?? 0) + (r.counterDamage ? counterBonus : 0);
    if (counterDmg > 0 && enemy.hp > 0) {
      applyDamageToEnemy(state, enemy, counterDmg, false, run, rng, false, false, delayMs + 50);
    }
    if (r.status && r.statusAmount && enemy.hp > 0) {
      enemy.statuses[r.status] = (enemy.statuses[r.status] ?? 0) + r.statusAmount;
      pushEvent(state, {
        type: 'STATUS_APPLIED',
        targetId: enemy.uid,
        statusId: r.status,
        label: `+${r.statusAmount} ${r.status.toUpperCase()}`,
        delayMs: delayMs + 60,
      });
    }
  }
  state.activeReactions = remaining;
}

function tickStatusesOnEnemy(
  state: CombatState,
  enemy: CombatEnemy,
  run: RunState,
  rng: SeededRNG,
  delayMs: number
): void {
  if (enemy.hp <= 0) return;

  // Burn deals direct damage and decays by 1
  if ((enemy.statuses.burn ?? 0) > 0) {
    const burnDmg = enemy.statuses.burn ?? 0;
    addLog(state, `${enemy.name} takes ${burnDmg} Burn damage.`);
    applyDamageToEnemy(state, enemy, burnDmg, false, run, rng, false, false, delayMs);
    if (enemy.hp > 0) enemy.statuses.burn = Math.max(0, burnDmg - 1);
  }

  // Poison pierces block and decays by 1 (unless Blight Focus stance stops decay)
  if (enemy.hp > 0 && (enemy.statuses.poison ?? 0) > 0) {
    const poisonDmg = enemy.statuses.poison ?? 0;
    addLog(state, `${enemy.name} takes ${poisonDmg} Poison damage.`);
    applyDamageToEnemy(
      state,
      enemy,
      poisonDmg,
      true,
      run,
      rng,
      false,
      false,
      delayMs + COMBAT_TIMING.STATUS_TICK_STEP_MS
    );
    if (enemy.hp > 0 && state.activeStance !== 'alchemical') {
      enemy.statuses.poison = Math.max(0, poisonDmg - 1);
    }
  }

  // Bleed pierces block and halves (floor) each turn
  if (enemy.hp > 0 && (enemy.statuses.bleed ?? 0) > 0) {
    const bleedDmg = enemy.statuses.bleed ?? 0;
    addLog(state, `${enemy.name} suffers ${bleedDmg} Bleed damage.`);
    applyDamageToEnemy(
      state,
      enemy,
      bleedDmg,
      true,
      run,
      rng,
      false,
      false,
      delayMs + COMBAT_TIMING.STATUS_TICK_STEP_MS * 2
    );
    if (enemy.hp > 0) enemy.statuses.bleed = Math.floor(bleedDmg / 2);
  }

  // Ritual grants Strength at end of turn
  if (enemy.hp > 0 && (enemy.statuses.ritual ?? 0) > 0) {
    enemy.statuses.strength = (enemy.statuses.strength ?? 0) + (enemy.statuses.ritual ?? 0);
  }

  // Decay Weak & Vulnerable
  if ((enemy.statuses.weak ?? 0) > 0) enemy.statuses.weak = (enemy.statuses.weak ?? 1) - 1;
  if ((enemy.statuses.vulnerable ?? 0) > 0) enemy.statuses.vulnerable = (enemy.statuses.vulnerable ?? 1) - 1;
}

function tickPlayerEndOfTurnStatuses(state: CombatState, run: RunState, rng: SeededRNG, delayMs: number): void {
  // Blight Focus stance trade-off: lose 2 HP at end of player turn
  if (state.activeStance === 'alchemical' && state.playerHp > 0) {
    state.playerHp = Math.max(0, state.playerHp - 2);
    pushEvent(state, {
      type: 'DAMAGE_TAKEN',
      targetId: 'player',
      value: 2,
      color: '#10B981',
      delayMs,
    });
    addLog(state, 'Blight Focus Stance: Lost 2 HP.');
    if (state.playerHp <= 0) {
      state.phase = 'DEFEAT';
      pushEvent(state, { type: 'DEFEAT', delayMs: delayMs + 140 });
      return;
    }
  }

  if ((state.playerStatuses.burn ?? 0) > 0) {
    const dmg = state.playerStatuses.burn ?? 0;
    applyDamageToPlayer(state, dmg, false, run, rng, delayMs);
    state.playerStatuses.burn = Math.max(0, dmg - 1);
  }
  if (state.phase === 'DEFEAT') return;

  if ((state.playerStatuses.poison ?? 0) > 0) {
    const dmg = state.playerStatuses.poison ?? 0;
    state.playerHp = Math.max(0, state.playerHp - dmg);
    pushEvent(state, {
      type: 'DAMAGE_TAKEN',
      targetId: 'player',
      value: dmg,
      color: '#10B981',
      delayMs: delayMs + COMBAT_TIMING.STATUS_TICK_STEP_MS,
    });
    state.playerStatuses.poison = Math.max(0, dmg - 1);
    if (state.playerHp <= 0) {
      state.phase = 'DEFEAT';
      pushEvent(state, { type: 'DEFEAT', delayMs: delayMs + COMBAT_TIMING.STATUS_TICK_STEP_MS + 140 });
    }
  }
  if (state.phase === 'DEFEAT') return;

  if ((state.playerStatuses.bleed ?? 0) > 0) {
    const dmg = state.playerStatuses.bleed ?? 0;
    state.playerHp = Math.max(0, state.playerHp - dmg);
    pushEvent(state, {
      type: 'DAMAGE_TAKEN',
      targetId: 'player',
      value: dmg,
      color: '#DC2626',
      delayMs: delayMs + COMBAT_TIMING.STATUS_TICK_STEP_MS * 2,
    });
    state.playerStatuses.bleed = Math.floor(dmg / 2);
    if (state.playerHp <= 0) {
      state.phase = 'DEFEAT';
      pushEvent(state, {
        type: 'DEFEAT',
        delayMs: delayMs + COMBAT_TIMING.STATUS_TICK_STEP_MS * 2 + 140,
      });
    }
  }

  if ((state.playerStatuses.weak ?? 0) > 0) state.playerStatuses.weak = (state.playerStatuses.weak ?? 1) - 1;
  if ((state.playerStatuses.vulnerable ?? 0) > 0) state.playerStatuses.vulnerable = (state.playerStatuses.vulnerable ?? 1) - 1;
  if ((state.playerStatuses.frail ?? 0) > 0) state.playerStatuses.frail = (state.playerStatuses.frail ?? 1) - 1;
}

function executeEnemyAction(
  state: CombatState,
  enemy: CombatEnemy,
  intent: EnemyIntent,
  run: RunState,
  rng: SeededRNG,
  delayMs: number
): number {
  if (enemy.hp <= 0 || state.playerHp <= 0) return 0;

  let baseDmg = intent.damage ?? 0;
  baseDmg += enemy.statuses.strength ?? 0;
  if ((enemy.statuses.weak ?? 0) > 0) baseDmg = Math.floor(baseDmg * 0.75);
  baseDmg = Math.max(0, baseDmg);

  const hits = intent.hits ?? (intent.damage ? 1 : 0);
  const isAttack = hits > 0 && baseDmg > 0;
  const isDefendOrBuff = Boolean(
    intent.block || intent.blockAllies || intent.selfStatus || intent.buffAlliesStatus || intent.healAllies
  );

  // Trigger traps & pre-attack reactions right as the enemy begins its action
  if (isAttack) {
    triggerMatchingTraps(state, enemy, 'enemy_attack', run, rng, delayMs);
    triggerMatchingReactions(state, enemy, 'on_enemy_attack_before', run, rng, delayMs + 20);
    if (enemy.hp <= 0) {
      return COMBAT_TIMING.ENEMY_ACTION_DURATION_MS;
    }
  } else if (isDefendOrBuff) {
    triggerMatchingTraps(state, enemy, 'enemy_defend_or_buff', run, rng, delayMs);
    if (enemy.hp <= 0) {
      return COMBAT_TIMING.ENEMY_ACTION_DURATION_MS;
    }
  } else {
    triggerMatchingTraps(state, enemy, 'enemy_any_action', run, rng, delayMs);
    if (enemy.hp <= 0) {
      return COMBAT_TIMING.ENEMY_ACTION_DURATION_MS;
    }
  }

  if (isAttack) {
    for (let h = 0; h < hits; h++) {
      if (state.playerHp <= 0) break;
      const hitDelay = delayMs + h * COMBAT_TIMING.ENEMY_MULTI_HIT_INTERVAL_MS;
      pushEvent(state, {
        type: 'ENEMY_ATTACK',
        sourceId: enemy.uid,
        targetId: 'player',
        value: baseDmg,
        label: intent.label,
        stepLabel: `${enemy.name}: ${intent.label}`,
        isCrit: intent.isCharged,
        delayMs: hitDelay,
      });
      applyDamageToPlayer(state, baseDmg, true, run, rng, hitDelay + 70);
      if ((state.playerStatuses.thorns ?? 0) > 0 && enemy.hp > 0) {
        applyDamageToEnemy(
          state,
          enemy,
          state.playerStatuses.thorns ?? 0,
          false,
          run,
          rng,
          false,
          false,
          hitDelay + 125
        );
      }
    }
    addLog(state, `${enemy.name} used ${intent.label} (${baseDmg}${hits > 1 ? `×${hits}` : ''} dmg).`);
    if (state.playerHp > 0 && enemy.hp > 0) {
      triggerMatchingReactions(
        state,
        enemy,
        'on_enemy_attack_after',
        run,
        rng,
        delayMs + hits * COMBAT_TIMING.ENEMY_MULTI_HIT_INTERVAL_MS + 90
      );
    }
  }

  if (intent.block && enemy.hp > 0) {
    enemy.block += intent.block;
    pushEvent(state, {
      type: 'BLOCK_GAIN',
      targetId: enemy.uid,
      value: intent.block,
      color: '#94A3B8',
      delayMs,
    });
    addLog(state, `${enemy.name} gained ${intent.block} Block.`);
  }

  const aliveAllies = livingEnemies(state);
  if (intent.blockAllies && enemy.hp > 0) {
    for (const ally of aliveAllies) {
      ally.block += intent.blockAllies;
      pushEvent(state, {
        type: 'BLOCK_GAIN',
        targetId: ally.uid,
        value: intent.blockAllies,
        color: '#38BDF8',
        delayMs,
      });
    }
    pushEvent(state, {
      type: 'ALLY_SUPPORT',
      sourceId: enemy.uid,
      label: intent.label,
      color: '#38BDF8',
      delayMs,
    });
    addLog(state, `${enemy.name} shielded all allies (+${intent.blockAllies} Block).`);
  }

  if (intent.healAllies && enemy.hp > 0) {
    for (const ally of aliveAllies) {
      const healed = Math.min(intent.healAllies, ally.maxHp - ally.hp);
      ally.hp += healed;
      if (healed > 0) {
        pushEvent(state, {
          type: 'HEAL',
          targetId: ally.uid,
          value: healed,
          color: '#10B981',
          delayMs,
        });
      }
    }
    pushEvent(state, {
      type: 'ALLY_SUPPORT',
      sourceId: enemy.uid,
      label: intent.label,
      color: '#10B981',
      delayMs,
    });
    addLog(state, `${enemy.name} mended allies for ${intent.healAllies} HP.`);
  }

  if (intent.buffAlliesStatus && intent.buffAlliesAmount && enemy.hp > 0) {
    for (const ally of aliveAllies) {
      ally.statuses[intent.buffAlliesStatus] =
        (ally.statuses[intent.buffAlliesStatus] ?? 0) + intent.buffAlliesAmount;
      pushEvent(state, {
        type: 'STATUS_APPLIED',
        targetId: ally.uid,
        statusId: intent.buffAlliesStatus,
        label: `+${intent.buffAlliesAmount} ${intent.buffAlliesStatus.toUpperCase()}`,
        delayMs,
      });
    }
    pushEvent(state, {
      type: 'ALLY_SUPPORT',
      sourceId: enemy.uid,
      label: intent.label,
      color: '#F59E0B',
      delayMs,
    });
    addLog(
      state,
      `${enemy.name} empowered allies (+${intent.buffAlliesAmount} ${intent.buffAlliesStatus}).`
    );
  }

  if (intent.status && intent.statusAmount && state.playerHp > 0) {
    state.playerStatuses[intent.status] = (state.playerStatuses[intent.status] ?? 0) + intent.statusAmount;
    pushEvent(state, {
      type: 'STATUS_APPLIED',
      targetId: 'player',
      statusId: intent.status,
      label: `+${intent.statusAmount} ${intent.status.toUpperCase()}`,
      delayMs: delayMs + 40,
    });
    addLog(state, `${enemy.name} inflicted ${intent.statusAmount} ${intent.status}.`);
    triggerMatchingReactions(state, enemy, 'on_player_debuffed', run, rng, delayMs + 70);
  }

  if (intent.selfStatus && intent.selfStatusAmount && enemy.hp > 0) {
    enemy.statuses[intent.selfStatus] = (enemy.statuses[intent.selfStatus] ?? 0) + intent.selfStatusAmount;
    pushEvent(state, {
      type: 'STATUS_APPLIED',
      targetId: enemy.uid,
      statusId: intent.selfStatus,
      label: `+${intent.selfStatusAmount} ${intent.selfStatus.toUpperCase()}`,
      delayMs,
    });
  }

  if (intent.curseCardId && state.playerHp > 0) {
    state.discardPile.push({
      uid: nextUid('curse'),
      defId: intent.curseCardId,
      upgraded: false,
    });
    addLog(state, `${enemy.name} added a Curse (${getCardDef(intent.curseCardId).name}) to your discard!`);
  }

  if (intent.summonEnemyId && livingEnemies(state).length < 3 && enemy.hp > 0) {
    const summoned = createEnemyInstance(
      intent.summonEnemyId,
      run.difficulty,
      state.turn + 1,
      livingEnemies(state).length,
      state.playerBlock,
      rng,
      state.playerAttacksLastTurn,
      state.playerStatuses
    );
    state.enemies.push(summoned);
    addLog(state, `${enemy.name} summoned ${summoned.name}!`);
  }

  enemy.lastIntentType = intent.type;

  const isMajorAction =
    enemy.role === 'boss' ||
    enemy.role === 'secret_boss' ||
    enemy.role === 'legendary' ||
    enemy.role === 'leader' ||
    Boolean(intent.isCharged || intent.curseCardId || intent.summonEnemyId);

  return (
    COMBAT_TIMING.ENEMY_ACTION_DURATION_MS +
    (hits > 1 ? (hits - 1) * COMBAT_TIMING.ENEMY_MULTI_HIT_INTERVAL_MS : 0) +
    (isMajorAction ? COMBAT_TIMING.ENEMY_MAJOR_EXTRA_MS : 0)
  );
}

export function endPlayerTurn(prevState: CombatState, run: RunState): CombatState {
  if (prevState.phase !== 'PLAYER_TURN') return prevState;
  const state = cloneCombatState(prevState);
  const rng = new SeededRNG(`${run.seed}:eot:${state.turn}`);
  const charDef = getCharacterDef(run.characterId);
  let cursorMs = 0;

  // 0. Fire end-of-turn power triggers + Vesperis Astral Overflow passive
  fireTriggers(state, 'on_turn_end', run, rng, 0, undefined, cursorMs);

  if (run.characterId === 'vesperis' && state.energy > 0) {
    const maxCarry = state.passiveAmplified ? 2 : 1;
    const carried = Math.min(maxCarry, state.energy);
    const blkBonus = state.passiveAmplified ? 7 : 4;
    state.nextTurnBonusEnergy += carried;
    grantPlayerBlock(state, blkBonus, run, rng, 0, cursorMs, 'ward');
    addLog(state, `Astral Overflow: Carried +${carried} Energy & gained ${blkBonus} Block.`);
  }

  // 1. Handle Retain & Ethereal cards in hand; discard remainder
  const retained: CardInstance[] = [];
  for (const card of state.hand) {
    const eff = getEffectiveCardDef(card);
    if (eff.keywords.includes('retain')) {
      retained.push({ ...card, costOverride: undefined });
    } else if (eff.keywords.includes('ethereal')) {
      if (!card.uid.startsWith('echocopy_') && !card.uid.startsWith('tempcard_')) {
        state.exhaustPile.push({ ...card, costOverride: undefined });
      }
      pushEvent(state, { type: 'CARD_EXHAUST', label: eff.name, delayMs: cursorMs });
      fireTriggers(state, 'on_card_exhaust', run, rng, 1, undefined, cursorMs);
    } else {
      state.discardPile.push({ ...card, costOverride: undefined });
    }
  }
  state.hand = retained;

  // 2. Companions act deliberately at end of player turn
  if (state.companions.length > 0) {
    cursorMs += COMBAT_TIMING.COMPANION_PRE_DELAY_MS;
    for (let i = state.companions.length - 1; i >= 0; i--) {
      const cp = state.companions[i];
      const cpDef = getCompanionDef(cp.defId);
      pushEvent(state, {
        type: 'COMPANION_ACT',
        sourceId: cp.uid,
        label: cpDef.name,
        stepLabel: `${cpDef.name} acts`,
        color: cpDef.accentColor,
        delayMs: cursorMs,
      });
      processEffects(state, cpDef.actEffects, state.selectedEnemyUid ?? undefined, run, rng, 0, {
        delayMs: cursorMs + COMBAT_TIMING.COMPANION_EFFECT_DELAY_MS,
      });
      cursorMs += COMBAT_TIMING.COMPANION_STEP_MS;
      cp.remainingTurns -= 1;
      if (cp.remainingTurns <= 0) {
        state.companions.splice(i, 1);
        addLog(state, `${cpDef.name} faded back into the Veil.`);
      }
    }
  }

  if (livingEnemies(state).length === 0) {
    state.phase = 'VICTORY';
    pushEvent(state, { type: 'VICTORY', delayMs: cursorMs + 180 });
    return state;
  }

  // 3. Structured Enemy Turn
  cursorMs += COMBAT_TIMING.ENEMY_TURN_INTRO_MS;
  const actingEnemies = livingEnemies(state);
  for (const enemy of actingEnemies) {
    if (enemy.hp <= 0) continue;
    enemy.block = 0;

    const intent = enemy.intent;
    const isMajor =
      enemy.role === 'boss' ||
      enemy.role === 'leader' ||
      Boolean(intent.isCharged || intent.curseCardId || intent.summonEnemyId);
    const prepareMs =
      COMBAT_TIMING.ENEMY_PREPARE_MS + (isMajor ? COMBAT_TIMING.ENEMY_MAJOR_EXTRA_MS : 0);
    const prepareColor = intent.isCharged
      ? '#F59E0B'
      : intent.healAllies || intent.blockAllies || intent.buffAlliesStatus
      ? '#10B981'
      : intent.damage
      ? '#EF4444'
      : '#38BDF8';

    pushEvent(state, {
      type: 'ENEMY_PREPARE',
      sourceId: enemy.uid,
      label: intent.label,
      stepLabel: `${enemy.name} preparing ${intent.label}`,
      color: prepareColor,
      isCrit: isMajor,
      delayMs: cursorMs,
    });

    const actionStartMs = cursorMs + prepareMs;
    const stepMs = executeEnemyAction(state, enemy, intent, run, rng, actionStartMs);
    if (state.phase === 'DEFEAT') return state;

    const statusTickDelay = actionStartMs + Math.max(220, stepMs - 100);
    tickStatusesOnEnemy(state, enemy, run, rng, statusTickDelay);
    cursorMs = actionStartMs + stepMs + COMBAT_TIMING.ENEMY_RECOVERY_MS;
  }

  if (livingEnemies(state).length === 0) {
    state.phase = 'VICTORY';
    pushEvent(state, { type: 'VICTORY', delayMs: cursorMs + 180 });
    return state;
  }

  // 4. Player end-of-turn statuses settle cleanly before turn advances
  tickPlayerEndOfTurnStatuses(state, run, rng, cursorMs);
  if (state.phase === 'DEFEAT') return state;
  cursorMs += COMBAT_TIMING.PLAYER_STATUS_SETTLE_MS;

  // 5. Advance turn
  state.playerAttacksLastTurn = state.attacksPlayedThisTurn;
  state.playerSkillsLastTurn = state.playerSkillsThisTurn;
  state.playerBlocksLastTurn = state.blockGainedThisTurn >= 10 ? 2 : state.blockGainedThisTurn > 0 ? 1 : 0;
  state.turn += 1;
  state.cardsPlayedThisTurn = 0;
  state.attacksPlayedThisTurn = 0;
  state.playerSkillsThisTurn = 0;
  state.blockGainedThisTurn = 0;
  state.lastCardCategoryPlayed = null;
  state.bloodChaliceUsedThisTurn = false;
  state.rangedAttackedThisTurn = false;
  state.deadeyeTriggeredThisTurn = false;
  state.activeReactions = [];
  if (state.heroAbilityCooldown > 0) {
    state.heroAbilityCooldown -= 1;
  }

  // Orin Living Rampart passive + Block decay (Warden's Plate retains up to 10)
  const prevPlayerBlock = state.playerBlock;
  if (run.characterId === 'orin' && prevPlayerBlock >= 12) {
    const thornsGain = state.passiveAmplified ? 2 : 1;
    state.playerStatuses.thorns = (state.playerStatuses.thorns ?? 0) + thornsGain;
    if (state.passiveAmplified) {
      state.playerStatuses.strength = (state.playerStatuses.strength ?? 0) + 1;
    }
    addLog(
      state,
      `Living Rampart: +${thornsGain} Thorns${state.passiveAmplified ? ' & +1 Strength' : ''} from Block >= 12.`
    );
  }
  const orinRetainCap = run.characterId === 'orin' ? (state.passiveAmplified ? 12 : 6) : 0;
  const wardenCap = run.relics.includes('warden_plate') ? 10 : 0;
  const retainCap = Math.max(orinRetainCap, wardenCap);
  state.playerBlock = retainCap > 0 ? Math.min(retainCap, prevPlayerBlock) : 0;

  // Bulwark Stance turn-start bonus
  if (state.activeStance === 'bulwark') {
    state.playerStatuses.thorns = (state.playerStatuses.thorns ?? 0) + 2;
    addLog(state, 'Iron Bulwark Stance: +2 Thorns.');
  }

  // Phantom Tolling Bell Turn 3 proc
  if (state.turn === 3 && run.relics.includes('phantom_bell')) {
    for (const e of livingEnemies(state)) {
      e.statuses.vulnerable = (e.statuses.vulnerable ?? 0) + 2;
      e.statuses.bleed = (e.statuses.bleed ?? 0) + 2;
    }
    addLog(state, 'Phantom Tolling Bell (Turn 3): Applied 2 Vulnerable and 2 Bleed to all foes.');
  }

  // Energy refresh + stored bonus energy
  let nextEnergy = charDef.startingEnergy + state.nextTurnBonusEnergy;
  state.nextTurnBonusEnergy = 0;
  if (run.relics.includes('sunless_crown') && state.turn <= 2) {
    nextEnergy += 1;
  }
  state.energy = nextEnergy;
  state.maxEnergy = Math.max(charDef.startingEnergy, nextEnergy);

  // Resolve delayed Rituals at start of player turn
  if (state.delayedEffects.length > 0) {
    const stillWaiting = [];
    for (const delayed of state.delayedEffects) {
      const nextRemaining = delayed.turnsRemaining - 1;
      if (nextRemaining <= 0) {
        addLog(state, `Ritual Fulfilled: ${delayed.label}!`);
        pushEvent(state, {
          type: 'RITUAL_RESOLVE',
          targetId: 'player',
          label: delayed.label,
          color: '#C084FC',
          animStyle: 'ritual',
          delayMs: cursorMs + 40,
        });
        processEffects(state, delayed.effects, state.selectedEnemyUid ?? undefined, run, rng, 0, {
          animStyle: 'ritual',
          delayMs: cursorMs + 90,
        });
      } else {
        stillWaiting.push({ ...delayed, turnsRemaining: nextRemaining });
      }
    }
    state.delayedEffects = stillWaiting;
    if (livingEnemies(state).length === 0) {
      state.phase = 'VICTORY';
      pushEvent(state, { type: 'VICTORY', delayMs: cursorMs + 220 });
      return state;
    }
  }

  // Compute next intents for living enemies using intelligent tactical AI
  const aliveList = livingEnemies(state);
  const aliveCount = aliveList.length;
  const woundedAllyExists = aliveList.some((e) => e.hp < e.maxHp * 0.85);
  const allyNeedsGuard = aliveList.some((e) => e.hp < e.maxHp * 0.5 && e.block < 5);
  const mostWoundedAllyPct = aliveList.reduce(
    (min, e) => Math.min(min, (e.hp / e.maxHp) * 100),
    100
  );
  const cursesInPlayerDeck = countCursesInCombat(state);

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    const def = getEnemyDef(enemy.defId);
    const intentCtx: EnemySelectIntentContext = {
      turn: state.turn,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      phase: enemy.phase,
      alliesCount: aliveCount,
      alliesDeadCount: state.alliesSlainCount,
      woundedAllyExists,
      allyNeedsGuard,
      mostWoundedAllyPct,
      difficulty: run.difficulty,
      playerBlock: state.playerBlock,
      playerAttacksLastTurn: state.playerAttacksLastTurn,
      playerSkillsLastTurn: state.playerSkillsLastTurn,
      playerBlocksLastTurn: state.playerBlocksLastTurn,
      playerActiveStance: state.activeStance,
      playerStatuses: state.playerStatuses,
      lastIntentType: enemy.lastIntentType,
      lastDamageTaken: enemy.lastDamageTaken ?? 0,
      cursesInPlayerDeck,
      rngNext: () => rng.next(),
    };
    enemy.lastDamageTaken = 0;
    const baseIntent = def.selectIntent(intentCtx);
    enemy.intent = resolveIntelligentIntent(def, intentCtx, baseIntent);
  }

  // Draw next hand + Morwen passive check
  let drawAmount = charDef.handSize;
  const poisonThreshold = state.passiveAmplified ? 5 : 6;
  if (
    run.characterId === 'morwen' &&
    livingEnemies(state).some((e) => (e.statuses.poison ?? 0) >= poisonThreshold)
  ) {
    drawAmount += 1;
    if (state.passiveAmplified) {
      state.energy += 1;
      addLog(state, 'Blight Resonance+: +1 card drawn & +1 Energy.');
    } else {
      addLog(state, 'Blight Resonance: +1 card drawn.');
    }
  }

  drawCardsInternal(state, drawAmount, rng);

  // Fire start-of-turn power triggers
  fireTriggers(state, 'on_turn_start', run, rng, 0, undefined, cursorMs + 100);

  return state;
}
