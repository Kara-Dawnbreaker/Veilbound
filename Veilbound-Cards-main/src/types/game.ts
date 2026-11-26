/**
 * Core data-driven types for Veilbound: Ashen Crown.
 * Separates persistent save schemas, static data definitions, and runtime combat/run state.
 */

export type ScreenId =
  | 'MAIN_MENU'
  | 'CHARACTER_SELECT'
  | 'SANCTUARY'
  | 'BESTIARY'
  | 'EXPEDITION_MAP'
  | 'COMBAT'
  | 'REWARD'
  | 'SHOP'
  | 'REST'
  | 'EVENT'
  | 'TREASURE'
  | 'SHRINE'
  | 'LIBRARY'
  | 'CAMP'
  | 'COMPANION_ENCOUNTER'
  | 'CURSED_ALTAR'
  | 'CROSSROADS'
  | 'RARE_ENCOUNTER'
  | 'RUN_END';

export type DifficultyId = 'standard' | 'penance' | 'eclipse';

export type CardCategory =
  | 'attack'
  | 'defense'
  | 'skill'
  | 'power'
  | 'summoning'
  | 'curse'
  | 'ritual'
  | 'trap'
  | 'reaction'
  | 'stance';

export type CardRarity =
  | 'starter'
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'
  | 'secret'
  | 'curse';

export type AttackRangeType = 'melee' | 'ranged' | 'magic' | 'aoe';

export type CardAcquisitionSource =
  | 'standard'
  | 'shop_only'
  | 'boss_drop'
  | 'secret_event'
  | 'contract'
  | 'faction'
  | 'quest'
  | 'generated';

export type BattlePosition = 'frontline' | 'backline';

export type CardKeyword = 'exhaust' | 'retain' | 'ethereal' | 'innate' | 'echo';

export type StanceId = 'neutral' | 'bulwark' | 'wrath' | 'eclipse' | 'alchemical';

export type TrapTriggerCondition = 'enemy_attack' | 'enemy_defend_or_buff' | 'enemy_any_action';

export type ReactionTriggerCondition =
  | 'on_enemy_attack_before'
  | 'on_enemy_attack_after'
  | 'on_player_debuffed';

export type StatusId =
  | 'burn'
  | 'poison'
  | 'bleed'
  | 'weak'
  | 'vulnerable'
  | 'frail'
  | 'strength'
  | 'ward'
  | 'thorns'
  | 'cursed_mark'
  | 'ritual';

export type EffectTargetMode = 'selected' | 'all_enemies' | 'random_enemy' | 'self';

export type CardAnimationStyle =
  | 'slash'
  | 'heavy_cleave'
  | 'twin_slash'
  | 'pierce'
  | 'arrow_shot'
  | 'arcane_beam'
  | 'bastion_slam'
  | 'fire_spell'
  | 'poison_spell'
  | 'shadow_spell'
  | 'shield'
  | 'ward'
  | 'summon'
  | 'ritual'
  | 'trap'
  | 'reaction'
  | 'stance'
  | 'curse';

export type ConditionType =
  | 'if_target_has_status'
  | 'if_self_has_status'
  | 'if_player_hp_below_pct'
  | 'if_cards_played_this_turn_gte'
  | 'if_companion_active'
  | 'if_block_gte'
  | 'if_enemy_intending_attack'
  | 'if_last_card_category'
  | 'if_enemy_hp_below_pct'
  | 'if_attacks_played_this_turn_gte'
  | 'if_player_debuffed'
  | 'if_stance_is'
  | 'if_curses_in_deck_gte'
  | 'if_deck_size_lte'
  | 'if_trap_active'
  | 'if_enemy_position'
  | 'if_enemy_group_is'
  | 'if_enemy_is_elite_or_boss'
  | 'if_frontline_guarding';

export type EffectAction =
  | {
      type: 'damage';
      amount: number;
      hits?: number;
      targetMode?: 'selected' | 'all_enemies' | 'random_enemy';
      pierceBlock?: boolean;
      scalingStatus?: StatusId;
      scalingSource?: 'target' | 'self' | 'curses_in_combat' | 'traps_active' | 'player_block';
      scalingMultiplier?: number;
      critIfTargetVulnerable?: boolean;
      enemyGroupBonus?: { group: EnemyGroup; bonusDamage: number };
      eliteBossBonus?: number;
      useRampBonus?: boolean;
      attackRange?: AttackRangeType;
    }
  | {
      type: 'block';
      amount: number;
      scalingStatus?: StatusId;
      scalingSource?: 'self' | 'curses_in_combat' | 'traps_active';
      scalingMultiplier?: number;
      useRampBonus?: boolean;
    }
  | {
      type: 'apply_status';
      target: EffectTargetMode;
      status: StatusId;
      amount: number;
    }
  | {
      type: 'draw';
      amount: number;
    }
  | {
      type: 'gain_energy';
      amount: number;
    }
  | {
      type: 'gain_energy_next_turn';
      amount: number;
    }
  | {
      type: 'heal';
      amount: number;
    }
  | {
      type: 'lose_hp';
      amount: number;
    }
  | {
      type: 'summon_companion';
      companionId: string;
      duration?: number;
    }
  | {
      type: 'trigger_companion_act';
    }
  | {
      type: 'add_card';
      destination: 'hand' | 'discard' | 'draw_pile';
      cardId: string;
      upgraded?: boolean;
      count?: number;
    }
  | {
      type: 'exhaust_random_hand';
      count: number;
    }
  | {
      type: 'upgrade_hand_cards';
      count: number; // -1 for all in hand
    }
  | {
      type: 'transform_random_hand';
      count: number;
    }
  | {
      type: 'transform_self';
      intoCardId: string;
      upgraded?: boolean;
    }
  | {
      type: 'purge_curses_in_hand';
      drawPerPurged?: number;
      blockPerPurged?: number;
      damagePerPurged?: number;
    }
  | {
      type: 'enter_stance';
      stance: StanceId;
    }
  | {
      type: 'add_trap';
      trapId: string;
      name: string;
      triggerOn: TrapTriggerCondition;
      damage?: number;
      block?: number;
      status?: StatusId;
      statusAmount?: number;
      targetMode?: 'attacker' | 'all_enemies';
      charges?: number;
    }
  | {
      type: 'add_reaction';
      reactionId: string;
      name: string;
      triggerOn: ReactionTriggerCondition;
      block?: number;
      counterDamage?: number;
      status?: StatusId;
      statusAmount?: number;
      ward?: number;
      draw?: number;
    }
  | {
      type: 'schedule_delayed';
      label: string;
      turns: number;
      effects: EffectAction[];
    }
  | {
      type: 'remove_status';
      target: 'self' | 'selected';
      status: StatusId | 'debuffs';
    }
  | {
      type: 'ramp_card_potency';
      amount: number;
    }
  | {
      type: 'move_enemy_position';
      target: 'selected' | 'all_enemies';
      position: BattlePosition;
    }
  | {
      type: 'empower_companions';
      bonusTurns?: number;
      triggerActs?: boolean;
    }
  | {
      type: 'sacrifice_companion';
      thenEffects: EffectAction[];
    }
  | {
      type: 'copy_last_card';
      freeThisTurn?: boolean;
    }
  | {
      type: 'add_temp_card';
      cardId: string;
      upgraded?: boolean;
      costZero?: boolean;
    }
  | {
      type: 'conditional';
      condition: ConditionType;
      value?: number;
      status?: StatusId;
      stance?: StanceId;
      cardCategory?: CardCategory;
      position?: BattlePosition;
      enemyGroup?: EnemyGroup;
      thenEffects: EffectAction[];
      elseEffects?: EffectAction[];
    };

export type TriggerEventType =
  | 'on_card_exhaust'
  | 'on_block_gained'
  | 'on_status_applied'
  | 'on_companion_summon'
  | 'on_turn_start'
  | 'on_turn_end'
  | 'on_damage_taken'
  | 'on_trap_triggered'
  | 'on_stance_changed';

export interface CardTrigger {
  event: TriggerEventType;
  statusFilter?: StatusId;
  effects: EffectAction[];
}

export interface CardDef {
  id: string;
  name: string;
  category: CardCategory;
  rarity: CardRarity;
  cost: number;
  characterPool: 'shared' | string;
  needsTarget: boolean;
  attackRange?: AttackRangeType;
  acquisitionSource?: CardAcquisitionSource;
  tags?: string[];
  animationStyle?: CardAnimationStyle;
  keywords?: CardKeyword[];
  effects: EffectAction[];
  triggers?: CardTrigger[];
  description: string;
  flavor?: string;
  upgraded?: {
    name?: string;
    cost?: number;
    attackRange?: AttackRangeType;
    keywords?: CardKeyword[];
    effects: EffectAction[];
    triggers?: CardTrigger[];
    description: string;
  };
}

export interface CardInstance {
  uid: string;
  defId: string;
  upgraded: boolean;
  costOverride?: number;
}

export interface CompanionDef {
  id: string;
  name: string;
  description: string;
  maxDuration: number;
  color: string;
  accentColor: string;
  spriteShape: 'hound' | 'wisp' | 'construct' | 'sentinel' | 'hawk' | 'familiar' | 'squire';
  actEffects: EffectAction[];
}

export interface ActiveCompanion {
  uid: string;
  defId: string;
  remainingTurns: number;
}

export interface CombatTrap {
  uid: string;
  trapId: string;
  name: string;
  triggerOn: TrapTriggerCondition;
  damage?: number;
  block?: number;
  status?: StatusId;
  statusAmount?: number;
  targetMode?: 'attacker' | 'all_enemies';
  charges: number;
}

export interface CombatReaction {
  uid: string;
  reactionId: string;
  name: string;
  triggerOn: ReactionTriggerCondition;
  block?: number;
  counterDamage?: number;
  status?: StatusId;
  statusAmount?: number;
  ward?: number;
  draw?: number;
}

export interface DelayedCombatEffect {
  uid: string;
  label: string;
  turnsRemaining: number;
  effects: EffectAction[];
}

export type FactionId =
  | 'iron_penitent'
  | 'drowned_choir'
  | 'blighted_circle'
  | 'sunken_court'
  | 'iron_bastion'
  | 'veil_archivists'
  | 'eclipse_vanguard';

export type FactionStandingTier = 'hostile' | 'wary' | 'neutral' | 'favored' | 'exalted';

export interface FactionDef {
  id: FactionId;
  name: string;
  shortName: string;
  leaderName: string;
  leaderEnemyId: string;
  philosophy: string;
  description: string;
  homeRegionIds: string[];
  rivalFactionId: FactionId;
  alliedFactionId: FactionId;
  exclusiveRelicId: string;
  exclusiveCardId: string;
  accentColor: string;
}

export type WorldEventId =
  | 'iron_convoy_embargo'
  | 'blight_bloom_surge'
  | 'choir_ritual_tide'
  | 'veil_archive_unsealed'
  | 'highland_siege'
  | 'eclipse_convergence'
  | 'merchant_caravan_boom';

export interface WorldEventDef {
  id: WorldEventId;
  name: string;
  regionId: string | 'all';
  factionId: FactionId;
  description: string;
  tacticalEffect: string;
  enemyHpMult?: number;
  enemyStartBlock?: number;
  shopPriceMult?: number;
  goldBonusMult?: number;
  durationRuns: number;
}

export interface WorldState {
  expeditionCount: number;
  activeEvents: { eventId: WorldEventId; remainingRuns: number }[];
  regionStability: Record<string, number>;
  recentChronicle: string[];
}

export type ContractType =
  | 'hunt_legendary'
  | 'defeat_faction_leader'
  | 'clear_hidden'
  | 'slay_elites'
  | 'win_expedition'
  | 'no_rest_run'
  | 'shrine_pilgrimage';

export interface ContractDef {
  id: string;
  title: string;
  issuerFactionId?: FactionId;
  type: ContractType;
  description: string;
  regionFilter?: string[];
  targetCount: number;
  rewardShards: number;
  rewardGold: number;
  rewardReputation: number;
  rewardRelicId?: string;
}

export interface ActiveContractState {
  contractId: string;
  progress: number;
  target: number;
  completed: boolean;
  failed: boolean;
  claimed: boolean;
}

export type RareEncounterId =
  | 'veiled_reliquary_broker'
  | 'stranded_vanguard'
  | 'archivist_scholar'
  | 'roaming_duelist'
  | 'hollow_mirror_pact';

export interface RareEncounterDef {
  id: RareEncounterId;
  title: string;
  subtitle: string;
  factionId?: FactionId;
  description: string;
  choices: {
    id: string;
    label: string;
    outcomeHint: string;
    requiresMinGold?: number;
    requiresMinHp?: number;
  }[];
}

export type EnemyGroup = 'creature' | 'faction';
export type EnemyRole = 'ordinary' | 'elite' | 'leader' | 'boss' | 'legendary' | 'secret_boss';
export type EnemyArchetype =
  | 'aggressor'
  | 'guardian'
  | 'support'
  | 'controller'
  | 'assassin'
  | 'summoner'
  | 'tactician'
  | 'boss';

export type IntentType =
  | 'attack'
  | 'multi_attack'
  | 'defend'
  | 'buff'
  | 'debuff'
  | 'attack_defend'
  | 'attack_debuff'
  | 'summon'
  | 'curse'
  | 'phase_shift';

export interface EnemyIntent {
  type: IntentType;
  label: string;
  telegraphNote?: string;
  damage?: number;
  hits?: number;
  block?: number;
  blockAllies?: number;
  healAllies?: number;
  buffAlliesStatus?: StatusId;
  buffAlliesAmount?: number;
  status?: StatusId;
  statusAmount?: number;
  selfStatus?: StatusId;
  selfStatusAmount?: number;
  summonEnemyId?: string;
  curseCardId?: string;
  isCharged?: boolean;
}

export interface BossPhase {
  phaseNumber: number;
  name: string;
  hpThresholdPct: number; // Triggers when HP <= pct
  dialogue: string;
  onEnterSelfStatus?: { status: StatusId; amount: number }[];
  onEnterPlayerStatus?: { status: StatusId; amount: number }[];
  onEnterBlock?: number;
  onEnterSummonId?: string;
}

export type EnemySpriteStyle =
  | 'ash_stalker'
  | 'cinder_husk'
  | 'hollow_hound'
  | 'crossbowman'
  | 'flagellant'
  | 'oathbreaker'
  | 'cinder_warden'
  | 'mire_leech'
  | 'drowned_acolyte'
  | 'crypt_gorger'
  | 'choir_cantor'
  | 'prelate_vespera'
  | 'ossuary_leviathan'
  | 'basalt_sentinel'
  | 'void_harpy'
  | 'eclipse_zealot'
  | 'vanguard_duelist'
  | 'archon_kael'
  | 'sovereign_eclipse'
  | 'thorn_dryad'
  | 'spore_stalker'
  | 'hollow_archdruid'
  | 'abyssal_knight'
  | 'sunken_sovereign'
  | 'crag_wyvern'
  | 'storm_warden'
  | 'sepulcher_wraith'
  | 'crypt_lord'
  | 'gnarlmaw_behemoth'
  | 'sanctum_automaton'
  | 'highland_colossus'
  | 'vespera_houndmaster'
  | 'pale_cartographer'
  | 'sunken_oracle'
  | 'hollowed_seraph';

export interface EnemySelectIntentContext {
  turn: number;
  hp: number;
  maxHp: number;
  phase: number;
  alliesCount: number;
  alliesDeadCount?: number;
  woundedAllyExists?: boolean;
  allyNeedsGuard?: boolean;
  mostWoundedAllyPct?: number;
  difficulty: DifficultyId;
  playerBlock: number;
  playerAttacksLastTurn?: number;
  playerSkillsLastTurn?: number;
  playerBlocksLastTurn?: number;
  playerActiveStance?: StanceId;
  playerStatuses?: Partial<Record<StatusId, number>>;
  lastIntentType?: IntentType;
  lastDamageTaken?: number;
  cursesInPlayerDeck?: number;
  rngNext: () => number;
}

export interface EnemyDef {
  id: string;
  name: string;
  title?: string;
  group: EnemyGroup;
  factionId?: FactionId;
  factionName?: string;
  role: EnemyRole;
  tacticalArchetype?: EnemyArchetype;
  mechanicHint?: string;
  regionId: string;
  maxHp: number;
  lore: string;
  spriteStyle: EnemySpriteStyle;
  scale?: number;
  defaultPosition?: BattlePosition;
  guardsBackline?: boolean;
  startingStatuses?: Partial<Record<StatusId, number>>;
  phases?: BossPhase[];
  selectIntent: (ctx: EnemySelectIntentContext) => EnemyIntent;
}

export interface CombatEnemy {
  uid: string;
  defId: string;
  name: string;
  role: EnemyRole;
  group: EnemyGroup;
  archetype?: EnemyArchetype;
  position: BattlePosition;
  guardsBackline?: boolean;
  hp: number;
  maxHp: number;
  block: number;
  statuses: Partial<Record<StatusId, number>>;
  intent: EnemyIntent;
  phase: number;
  actedThisTurn: boolean;
  mechanicState?: number;
  lastIntentType?: IntentType;
  lastDamageTaken?: number;
}

export type SkillBranchId = 'core' | 'offense' | 'defense' | 'utility';

export interface CharacterProgressionNode {
  id: string;
  name: string;
  branch: SkillBranchId;
  tier: 1 | 2 | 3;
  description: string;
  costShards: number;
  requiresNodeId?: string;
  exclusiveWithNodeId?: string;
  bonus:
    | { type: 'max_hp'; amount: number }
    | { type: 'starting_gold'; amount: number }
    | { type: 'starting_draw_turn_1'; amount: number }
    | { type: 'starting_relic'; relicId: string }
    | { type: 'upgrade_starter_card'; cardId: string }
    | { type: 'starting_card_add'; cardId: string; upgraded?: boolean }
    | { type: 'active_ability_upgrade' }
    | { type: 'passive_amplify' }
    | { type: 'bonus_energy_t1'; amount: number };
}

export interface HeroActiveAbility {
  id: string;
  name: string;
  upgradedName: string;
  alternateName: string;
  description: string;
  upgradedDescription: string;
  alternateDescription: string;
  energyCost: number;
  cooldownTurns: number;
  maxUsesPerCombat: number;
  accentColor: string;
}

export type HeroAuraStyle = 'default' | 'ascended' | 'eclipse';

export interface CharacterQuestDef {
  id: string;
  characterId: string;
  title: string;
  summary: string;
  stages: {
    step: number;
    title: string;
    objective: string;
    loreText: string;
  }[];
  unlockedCardId: string;
  unlockedCosmeticId: HeroAuraStyle;
  cosmeticName: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  combatClass?: string;
  preferredRange?: 'melee' | 'ranged' | 'magic' | 'tactical';
  description: string;
  maxHp: number;
  startingEnergy: number;
  handSize: number;
  startingGold: number;
  advantages: string[];
  disadvantages: string[];
  passiveAbility: {
    id: string;
    name: string;
    description: string;
    amplifiedDescription?: string;
  };
  activeAbility: HeroActiveAbility;
  quest: CharacterQuestDef;
  startingRelicId: string;
  startingDeck: string[];
  exclusiveCardIds: string[];
  unlockedByDefault: boolean;
  unlockCostShards?: number;
  unlockHint?: string;
  accentColor: string;
  spriteTheme:
    | 'ash_knight'
    | 'blight_alchemist'
    | 'veil_stalker'
    | 'thornwind_ranger'
    | 'astral_arcanist'
    | 'ironclad_guardian'
    | 'veil_conjurer';
  progressionNodes: CharacterProgressionNode[];
}

export interface RelicDef {
  id: string;
  name: string;
  rarity: 'starter' | 'common' | 'uncommon' | 'rare' | 'boss';
  description: string;
  characterId?: string;
}

export type RegionAmbienceTheme =
  | 'embers'
  | 'spores'
  | 'wind'
  | 'drowned'
  | 'catacombs'
  | 'obsidian';

export interface RegionDef {
  id: string;
  name: string;
  subtitle: string;
  tier: number;
  description: string;
  backdropPath: string;
  ambientTheme: RegionAmbienceTheme;
  accentColor: string;
  unlockedByDefault: boolean;
  unlockCostShards?: number;
  prerequisiteRegionId?: string;
  ordinaryEncounterGroups: string[][];
  eliteEncounterGroups: string[][];
  denEncounterGroups?: string[][];
  strongholdEncounterGroups?: string[][];
  challengeEncounterGroups?: string[][];
  bossEncounterGroup: string[];
  eventPoolIds: string[];
  nodeWeights?: Partial<Record<MapNodeType, number>>;
  mapRows: number;
}

export type MapNodeType =
  | 'combat'
  | 'elite'
  | 'treasure'
  | 'shop'
  | 'rest'
  | 'event'
  | 'hidden'
  | 'shrine'
  | 'library'
  | 'camp'
  | 'monster_den'
  | 'stronghold'
  | 'companion'
  | 'cursed_altar'
  | 'challenge'
  | 'crossroads'
  | 'boss';

export type CombatModifierId =
  | 'none'
  | 'monster_den'
  | 'stronghold'
  | 'challenge_frenzy'
  | 'legendary_hunt'
  | 'secret_sanctum';

export interface MapNode {
  id: string;
  row: number;
  col: number;
  xPct: number;
  yPct: number;
  type: MapNodeType;
  label: string;
  description?: string;
  dangerRating?: 'Safe' | 'Low' | 'Moderate' | 'High' | 'Extreme';
  rewardPreview?: string;
  secretConditionHint?: string;
  connections: string[];
  visited: boolean;
  revealed: boolean;
  isHiddenBranch?: boolean;
  isLegendary?: boolean;
  isSecretBoss?: boolean;
  rareEncounterId?: RareEncounterId;
  factionId?: FactionId;
  encounterIds?: string[];
  combatModifier?: CombatModifierId;
  eventId?: string;
}

export interface ExpeditionMap {
  regionId: string;
  seed: string;
  nodes: Record<string, MapNode>;
  startNodeIds: string[];
  bossNodeId: string;
  currentNodeId: string | null;
}

export interface EventChoice {
  id: string;
  label: string;
  outcomeHint: string;
  requiresCharacterId?: string;
  requiresCardCategory?: CardCategory;
  requiresCardId?: string;
  requiresMinGold?: number;
  requiresMinHp?: number;
}

export interface EventDef {
  id: string;
  title: string;
  regionIds: string[] | 'all';
  isRare?: boolean;
  isSecret?: boolean;
  factionId?: FactionId;
  description: string;
  choices: EventChoice[];
}

export interface ShopInventory {
  cards: { cardId: string; upgraded: boolean; price: number; sold: boolean }[];
  relic: { relicId: string; price: number; sold: boolean } | null;
  healPrice: number;
  healUsed: boolean;
  removeCardPrice: number;
  removeUsed: boolean;
  factionId?: FactionId;
  factionDiscountLabel?: string;
}

export interface RewardState {
  gold: number;
  shards: number;
  cardChoices: CardInstance[];
  relicId?: string;
  cardPicked: boolean;
  relicPicked: boolean;
  isBossReward?: boolean;
  isSecretBossReward?: boolean;
  isLegendaryReward?: boolean;
  sourceLabel?: string;
  reputationDelta?: { factionId: FactionId; amount: number };
}

export interface InteractiveLocationState {
  type:
    | 'shrine'
    | 'library'
    | 'camp'
    | 'companion'
    | 'cursed_altar'
    | 'crossroads'
    | 'rare_encounter';
  title: string;
  subtitle: string;
  description: string;
  rareEncounterId?: RareEncounterId;
  factionId?: FactionId;
  offeredCardIds?: string[];
  offeredCompanionCardId?: string;
  resolvedSummary?: string;
  revealedHiddenCount?: number;
}

export interface RunState {
  runId: string;
  seed: string;
  characterId: string;
  regionId: string;
  difficulty: DifficultyId;
  hp: number;
  maxHp: number;
  gold: number;
  earnedShards: number;
  deck: CardInstance[];
  relics: string[];
  map: ExpeditionMap;
  currentScreen: ScreenId;
  activeCombatEncounterIds?: string[];
  activeCombatModifier?: CombatModifierId;
  activeIsBoss?: boolean;
  activeIsElite?: boolean;
  activeIsLegendary?: boolean;
  activeIsSecretBoss?: boolean;
  activeShop?: ShopInventory;
  activeReward?: RewardState;
  activeEventId?: string;
  activeEventResult?: string;
  activeTreasure?: {
    isHidden: boolean;
    gold: number;
    shards: number;
    relicId?: string;
    bonusCard?: CardInstance;
  };
  activeLocation?: InteractiveLocationState;
  activeContract?: ActiveContractState;
  selectedAuraStyle?: HeroAuraStyle;
  turnsTakenTotal: number;
  enemiesDefeated: number;
  nodesCleared: number;
  restUsedCount?: number;
  shrineVisitedCount?: number;
  hiddenClearedCount?: number;
  elitesClearedCount?: number;
  legendariesDefeatedThisRun?: string[];
  factionLeadersDefeatedThisRun?: string[];
  secretBossesDefeatedThisRun?: string[];
}

export interface CharacterMetaProgress {
  unlocked: boolean;
  runsAttempted: number;
  runsWon: number;
  highestDifficultyWon: DifficultyId | null;
  unlockedNodeIds: string[];
  xp: number;
  questStep: number;
  questCompleted: boolean;
  selectedAuraStyle: HeroAuraStyle;
  unlockedAuraStyles: HeroAuraStyle[];
  useAlternateAbility: boolean;
}

export type CombatSpeedMode = 'deliberate' | 'normal' | 'fast';
export type GraphicsQualityMode = 'high' | 'balanced' | 'lite';

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  ambientVolume: number;
  muted: boolean;
  combatSpeed?: CombatSpeedMode;
  graphicsQuality?: GraphicsQualityMode;
  fastAnimations: boolean;
  reducedMotion: boolean;
  confirmEndTurn: boolean;
}

export interface SaveDataV1 {
  version: 1;
  lastUpdated: number;
  soulShards: number;
  settings: GameSettings;
  characterProgress: Record<string, CharacterMetaProgress>;
  unlockedRegions: string[];
  discoveredEnemies: string[];
  discoveredSecrets: string[];
  discoveredCards: string[];
  factionReputation: Record<FactionId, number>;
  worldState: WorldState;
  completedContractIds: string[];
  defeatedLegendaries: string[];
  defeatedSecretBosses: string[];
  unlockedQuestCards: string[];
  activeRun: RunState | null;
  totalVictories: number;
  totalRuns: number;
}

export interface CombatVisualEvent {
  id: string;
  type:
    | 'PLAYER_ATTACK'
    | 'HERO_ABILITY'
    | 'ENEMY_PREPARE'
    | 'ENEMY_ATTACK'
    | 'SPELL_CAST'
    | 'DEFENSE_CAST'
    | 'BLOCK_GAIN'
    | 'DAMAGE_TAKEN'
    | 'HEAL'
    | 'STATUS_APPLIED'
    | 'COMPANION_SUMMON'
    | 'COMPANION_ACT'
    | 'CARD_EXHAUST'
    | 'BOSS_PHASE'
    | 'ALLY_SUPPORT'
    | 'TRAP_SET'
    | 'TRAP_TRIGGER'
    | 'REACTION_ARMED'
    | 'REACTION_TRIGGER'
    | 'STANCE_CHANGE'
    | 'RITUAL_SCHEDULED'
    | 'RITUAL_RESOLVE'
    | 'ENTITY_DEATH'
    | 'VICTORY'
    | 'DEFEAT';
  sourceId?: string;
  targetId?: string;
  value?: number;
  label?: string;
  stepLabel?: string;
  color?: string;
  animStyle?: CardAnimationStyle;
  isCrit?: boolean;
  statusId?: StatusId;
  delayMs?: number;
}

export interface CombatState {
  turn: number;
  phase: 'PLAYER_TURN' | 'RESOLVING' | 'ENEMY_TURN' | 'VICTORY' | 'DEFEAT';
  playerHp: number;
  playerMaxHp: number;
  playerBlock: number;
  energy: number;
  maxEnergy: number;
  nextTurnBonusEnergy: number;
  activeStance: StanceId;
  activeTraps: CombatTrap[];
  activeReactions: CombatReaction[];
  delayedEffects: DelayedCombatEffect[];
  playerStatuses: Partial<Record<StatusId, number>>;
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
  enemies: CombatEnemy[];
  companions: ActiveCompanion[];
  cardsPlayedThisTurn: number;
  attacksPlayedThisTurn: number;
  playerAttacksLastTurn: number;
  playerSkillsThisTurn: number;
  playerSkillsLastTurn: number;
  playerBlocksLastTurn: number;
  blockGainedThisTurn: number;
  lastCardCategoryPlayed: CardCategory | null;
  bloodChaliceUsedThisTurn: boolean;
  alliesSlainCount: number;
  heroAbilityId: string;
  heroAbilityCooldown: number;
  heroAbilityUsesLeft: number;
  heroAbilityUpgraded: boolean;
  heroAbilityAlternate: boolean;
  passiveAmplified: boolean;
  selectedEnemyUid: string | null;
  combatLog: string[];
  pendingVisualEvents: CombatVisualEvent[];
  activeTriggers: CardTrigger[];
  isBoss: boolean;
  isElite: boolean;
  isLegendaryEncounter?: boolean;
  isSecretBossEncounter?: boolean;
  combatModifier?: CombatModifierId;
  cardRampBonuses?: Record<string, number>;
  lastPlayedCardId?: string | null;
  skillsPlayedCombat?: number;
  rangedAttackedThisTurn?: boolean;
  deadeyeTriggeredThisTurn?: boolean;
}
