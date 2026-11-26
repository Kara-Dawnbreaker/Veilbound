import { useRef, useState } from 'react';
import {
  AlertTriangle,
  Compass,
  Crosshair,
  Flame,
  Shield,
  ShieldAlert,
  Skull,
  Sparkles,
  Swords,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { getCharacterDef } from '../data/characters';
import { getCompanionDef } from '../data/companions';
import { getEnemyDef } from '../data/enemies';
import { getStanceDef } from '../data/stances';
import { getEffectiveCardDef, previewCardCombatState } from '../engine/combatEngine';
import { getArchetypeLabel } from '../engine/enemyAI';
import type { CombatEnemy, CombatState, GameSettings, RunState, StatusId } from '../types/game';
import { BattleCanvas } from './BattleCanvas';
import { CardView } from './CardView';

interface BattleViewProps {
  run: RunState;
  combat: CombatState;
  settings: GameSettings;
  isResolvingTurn?: boolean;
  turnStepLabel?: string | null;
  onSelectEnemy: (uid: string) => void;
  onPlayCard: (cardUid: string, targetUid: string | null) => void;
  onUseHeroAbility?: () => void;
  onEndTurn: () => void;
}

const STATUS_META: Record<StatusId, { label: string; hint: string }> = {
  burn: { label: 'Burn', hint: 'Takes Burn damage at end of turn, then decays by 1.' },
  poison: { label: 'Poison', hint: 'Pierces Block at end of turn, then decays by 1.' },
  bleed: { label: 'Bleed', hint: 'Pierces Block at end of turn, then halves.' },
  weak: { label: 'Weak', hint: 'Deals 25% less attack damage.' },
  vulnerable: { label: 'Vuln', hint: 'Takes 50% more damage from attacks.' },
  frail: { label: 'Frail', hint: 'Gains 25% less Block from cards.' },
  strength: { label: 'Str', hint: 'Increases attack damage by stack count.' },
  ward: { label: 'Ward', hint: 'Prevents the next unblocked HP hit.' },
  thorns: { label: 'Thorns', hint: 'Deals damage back when struck by attacks.' },
  cursed_mark: { label: 'Mark', hint: 'Marked by Veil magic — bypasses frontline guard.' },
  ritual: { label: 'Ritual', hint: 'Gains Strength at the end of each turn.' },
};

function formatStatuses(statuses: Partial<Record<StatusId, number>>): string {
  const parts = Object.entries(statuses)
    .filter(([, val]) => (val ?? 0) > 0)
    .map(([key, val]) => `${STATUS_META[key as StatusId]?.label ?? key} ${val}`);
  return parts.join(' · ');
}

function buildStatusTooltip(statuses: Partial<Record<StatusId, number>>): string {
  return Object.entries(statuses)
    .filter(([, val]) => (val ?? 0) > 0)
    .map(([key, val]) => {
      const meta = STATUS_META[key as StatusId];
      return meta ? `${meta.label} (${val}): ${meta.hint}` : `${key} (${val})`;
    })
    .join('\n');
}

function formatIntentSummary(enemy: CombatEnemy): string {
  const { intent } = enemy;
  const dmg = intent.damage
    ? Math.max(
        0,
        Math.floor(
          (intent.damage + (enemy.statuses.strength ?? 0)) *
            ((enemy.statuses.weak ?? 0) > 0 ? 0.75 : 1)
        )
      )
    : 0;
  const hits = intent.hits ?? (dmg > 0 ? 1 : 0);

  const chunks: string[] = [intent.label];
  if (hits > 0 && dmg > 0) {
    chunks.push(`${dmg}${hits > 1 ? `×${hits}` : ''} dmg`);
  }
  if (intent.block) chunks.push(`+${intent.block} Block`);
  if (intent.blockAllies) chunks.push(`+${intent.blockAllies} Allies Blk`);
  if (intent.healAllies) chunks.push(`Heal Allies ${intent.healAllies}`);
  if (intent.buffAlliesStatus && intent.buffAlliesAmount) {
    chunks.push(`Allies +${intent.buffAlliesAmount} ${intent.buffAlliesStatus}`);
  }
  if (intent.status && intent.statusAmount) chunks.push(`${intent.statusAmount} ${intent.status}`);
  if (intent.selfStatus && intent.selfStatusAmount) {
    chunks.push(`+${intent.selfStatusAmount} ${intent.selfStatus}`);
  }
  if (intent.curseCardId) chunks.push('Curse');
  if (intent.summonEnemyId) chunks.push('Summon');
  return chunks.join(' · ');
}

export function BattleView({
  run,
  combat,
  settings,
  isResolvingTurn = false,
  turnStepLabel = null,
  onSelectEnemy,
  onPlayCard,
  onUseHeroAbility,
  onEndTurn,
}: BattleViewProps) {
  const [selectedCardUid, setSelectedCardUid] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [confirmEndPrompt, setConfirmEndPrompt] = useState(false);
  const [dismissOrientationTip, setDismissOrientationTip] = useState(false);
  const lastActionAtRef = useRef<number>(0);

  const canAct = combat.phase === 'PLAYER_TURN' && !isResolvingTurn;
  const selectedCard = combat.hand.find((c) => c.uid === selectedCardUid) ?? null;
  const selectedCardEff = selectedCard ? getEffectiveCardDef(selectedCard) : null;
  const selectedEnemy =
    combat.enemies.find((e) => e.uid === combat.selectedEnemyUid && e.hp > 0) ??
    combat.enemies.find((e) => e.hp > 0);

  const hasLivingFrontlineGuard = combat.enemies.some(
    (e) => e.hp > 0 && e.position === 'frontline' && Boolean(e.guardsBackline)
  );

  const handleCardClick = (cardUid: string) => {
    if (!canAct) return;
    const now = performance.now();
    if (now - lastActionAtRef.current < 150) return;
    lastActionAtRef.current = now;

    const card = combat.hand.find((c) => c.uid === cardUid);
    if (!card) return;
    const eff = getEffectiveCardDef(card);
    if (combat.energy < eff.cost) return;

    const aliveCount = combat.enemies.filter((e) => e.hp > 0).length;
    if (!eff.needsTarget || aliveCount <= 1 || selectedCardUid === cardUid) {
      setSelectedCardUid(null);
      onPlayCard(cardUid, combat.selectedEnemyUid);
    } else {
      setSelectedCardUid(cardUid);
    }
  };

  const handleEnemyClick = (enemyUid: string) => {
    onSelectEnemy(enemyUid);
    if (selectedCard && canAct) {
      const now = performance.now();
      if (now - lastActionAtRef.current < 120) return;
      lastActionAtRef.current = now;
      const eff = getEffectiveCardDef(selectedCard);
      if (combat.energy >= eff.cost) {
        setSelectedCardUid(null);
        onPlayCard(selectedCard.uid, enemyUid);
      }
    }
  };

  const handleEndTurnPress = () => {
    if (!canAct) return;
    if (settings.confirmEndTurn && combat.energy > 0 && !confirmEndPrompt) {
      setConfirmEndPrompt(true);
      return;
    }
    setConfirmEndPrompt(false);
    setSelectedCardUid(null);
    onEndTurn();
  };

  const playerStatusText = formatStatuses(combat.playerStatuses);
  const playerStatusTip = buildStatusTooltip(combat.playerStatuses);
  const selectedEnemyDef = selectedEnemy ? getEnemyDef(selectedEnemy.defId) : null;
  const activeStance = getStanceDef(combat.activeStance);
  const heroDef = getCharacterDef(run.characterId);
  const activeAbility = heroDef.activeAbility;
  const heroAbilityLabel = combat.heroAbilityAlternate
    ? activeAbility.alternateName
    : combat.heroAbilityUpgraded
    ? activeAbility.upgradedName
    : activeAbility.name;
  const heroAbilityDesc = combat.heroAbilityAlternate
    ? activeAbility.alternateDescription
    : combat.heroAbilityUpgraded
    ? activeAbility.upgradedDescription
    : activeAbility.description;
  const canUseHeroAbility =
    Boolean(onUseHeroAbility) &&
    canAct &&
    combat.heroAbilityCooldown <= 0 &&
    combat.heroAbilityUsesLeft > 0 &&
    combat.energy >= activeAbility.energyCost;

  const modifierHint =
    combat.combatModifier === 'monster_den'
      ? 'Monster Den · Foes start with Thorns'
      : combat.combatModifier === 'stronghold'
      ? 'Enemy Stronghold · Foes start with +6 Block & +1 Strength'
      : combat.combatModifier === 'challenge_frenzy'
      ? 'Challenge Trial · Foes +2 Strength · Hero +1 Energy Turn 1'
      : combat.combatModifier === 'legendary_hunt'
      ? 'Legendary Hunt · Apex creature stalks this trail'
      : combat.combatModifier === 'secret_sanctum'
      ? 'Secret Sanctum · Ancient wards empower the guardian'
      : null;

  return (
    <div className="flex-1 flex flex-col bg-[#0B0C10] px-2.5 sm:px-6 py-2.5 sm:py-3 gap-2.5 sm:gap-3 max-w-7xl w-full mx-auto pb-safe">
      {!dismissOrientationTip && (
        <div className="sm:hidden flex items-center justify-between gap-2 rounded-md border border-[#232734] bg-[#11141C] px-3 py-1.5 text-[11px] text-[#9499A8]">
          <span>Landscape mode widens the battlefield; swipe cards horizontally below.</span>
          <button
            type="button"
            onClick={() => setDismissOrientationTip(true)}
            aria-label="Dismiss tip"
            className="min-w-[32px] min-h-[32px] flex items-center justify-center text-[#9499A8] hover:text-white shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {modifierHint && (
        <div className="rounded-md border border-amber-500/35 bg-[#16131A] px-3.5 py-1.5 text-xs text-amber-200 flex items-center justify-between gap-2">
          <span>{modifierHint}</span>
          <span className="text-[11px] text-[#9499A8] hidden sm:inline">Special Encounter</span>
        </div>
      )}

      {/* Top Tactical HUD Strip: Player Vitals & Enemy Intents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 items-stretch">
        {/* Player Status Summary */}
        <div className="lg:col-span-4 rounded-lg border border-[#232734] bg-[#11141C] px-3.5 sm:px-4 py-2.5 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="font-mono-tabular text-sm font-semibold text-rose-300">
                HP {combat.playerHp}/{combat.playerMaxHp}
              </div>
              <div className="flex items-center gap-1 font-mono-tabular text-sm font-semibold text-sky-300">
                <Shield className="w-4 h-4 text-sky-400" />
                <span>{combat.playerBlock}</span>
              </div>
            </div>

            <div className="text-xs text-[#9499A8] font-mono-tabular">
              Turn {combat.turn}
              {combat.lastCardCategoryPlayed ? (
                <span className="text-[#C89B3C] capitalize"> · {combat.lastCardCategoryPlayed}</span>
              ) : null}
            </div>
          </div>

          {combat.activeStance !== 'neutral' && (
            <div
              className="flex items-center gap-1.5 mt-1 text-[11px] font-medium cursor-help"
              style={{ color: activeStance.accentColor }}
              title={`${activeStance.name}\n+ ${activeStance.advantage}\n− ${activeStance.disadvantage}`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Stance: {activeStance.name}</span>
              <span className="text-[#8E94A6] font-normal truncate">
                · {activeStance.advantage}
              </span>
            </div>
          )}

          {playerStatusText && (
            <div
              className="text-[11px] text-amber-300 mt-1 cursor-help"
              title={playerStatusTip}
            >
              {playerStatusText}
            </div>
          )}

          {(combat.companions.length > 0 ||
            combat.activeTraps.length > 0 ||
            combat.activeReactions.length > 0 ||
            combat.delayedEffects.length > 0) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 pt-1.5 border-t border-[#1E2330] text-[11px] text-[#CFCBC0]">
              {combat.companions.map((cp) => {
                const def = getCompanionDef(cp.defId);
                return (
                  <span
                    key={cp.uid}
                    title={def.description}
                    className="flex items-center gap-1 cursor-help"
                  >
                    <Users className="w-3 h-3 text-[#C89B3C]" />
                    <span>
                      {def.name} ({cp.remainingTurns}t)
                    </span>
                  </span>
                );
              })}

              {combat.activeTraps.map((trap) => (
                <span
                  key={trap.uid}
                  title={`Trap (${trap.triggerOn.replaceAll('_', ' ')}) · ${trap.charges} charge(s)`}
                  className="flex items-center gap-1 text-orange-300 cursor-help"
                >
                  <Crosshair className="w-3 h-3 text-orange-400" />
                  <span>
                    {trap.name} ({trap.charges})
                  </span>
                </span>
              ))}

              {combat.activeReactions.map((react) => (
                <span
                  key={react.uid}
                  title={`Reaction armed (${react.triggerOn.replaceAll('_', ' ')})`}
                  className="flex items-center gap-1 text-cyan-300 cursor-help"
                >
                  <ShieldAlert className="w-3 h-3 text-cyan-400" />
                  <span>{react.name}</span>
                </span>
              ))}

              {combat.delayedEffects.map((ritual) => (
                <span
                  key={ritual.uid}
                  title={`Ritual resolves in ${ritual.turnsRemaining} turn(s)`}
                  className="flex items-center gap-1 text-fuchsia-300 cursor-help"
                >
                  <Flame className="w-3 h-3 text-fuchsia-400" />
                  <span>
                    {ritual.label} ({ritual.turnsRemaining}t)
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Enemy Target Cards + Intents */}
        <div className="lg:col-span-8 flex flex-wrap gap-2">
          {combat.enemies.map((enemy) => {
            const dead = enemy.hp <= 0;
            const isSelected = enemy.uid === combat.selectedEnemyUid && !dead;
            const statusStr = formatStatuses(enemy.statuses);
            const statusTip = buildStatusTooltip(enemy.statuses);
            const intentStr = formatIntentSummary(enemy);
            const def = getEnemyDef(enemy.defId);
            const isSupport = Boolean(
              enemy.intent.healAllies || enemy.intent.blockAllies || enemy.intent.buffAlliesStatus
            );
            const isGuardedBackline =
              !dead &&
              enemy.position === 'backline' &&
              hasLivingFrontlineGuard &&
              (enemy.statuses.cursed_mark ?? 0) <= 0;
            const positionLabel =
              enemy.position === 'frontline'
                ? enemy.guardsBackline
                  ? 'Frontline · Guard'
                  : 'Frontline'
                : isGuardedBackline
                ? 'Backline · Guarded (-50% Melee)'
                : 'Backline · Exposed';

            return (
              <button
                key={enemy.uid}
                type="button"
                disabled={dead}
                onClick={() => handleEnemyClick(enemy.uid)}
                title={def.mechanicHint ?? def.lore}
                className={`flex-1 min-w-[165px] sm:min-w-[205px] min-h-[44px] rounded-lg border px-3 sm:px-3.5 py-2 text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default touch-manipulation ${
                  isSelected
                    ? 'bg-[#191E2B] border-[#C89B3C]'
                    : 'bg-[#11141C] border-[#232734] hover:border-[#3A4154]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-xs sm:text-sm font-semibold text-[#F3EFE6] truncate">
                    {enemy.name}
                    {enemy.role === 'legendary'
                      ? ' · Legendary'
                      : enemy.role === 'secret_boss'
                      ? ' · Secret Boss'
                      : ''}
                    {enemy.phase > 1 ? ` · Phase ${enemy.phase}` : ''}
                  </span>
                  <span className="font-mono-tabular text-xs text-rose-300 shrink-0">
                    {dead ? 'Slain' : `${enemy.hp}/${enemy.maxHp}`}
                    {enemy.block > 0 && !dead ? ` · ${enemy.block} Blk` : ''}
                  </span>
                </div>

                {!dead && (
                  <div
                    className={`text-[10px] font-medium mt-0.5 ${
                      enemy.position === 'frontline'
                        ? enemy.guardsBackline
                          ? 'text-sky-300'
                          : 'text-[#9499A8]'
                        : isGuardedBackline
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                    }`}
                  >
                    {positionLabel}
                  </div>
                )}

                {!dead && (
                  <div
                    className={`flex items-center gap-1.5 mt-1 text-xs ${
                      enemy.intent.isCharged
                        ? 'text-amber-300 font-semibold'
                        : isSupport
                        ? 'text-emerald-300'
                        : 'text-amber-200'
                    }`}
                  >
                    {enemy.intent.isCharged ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : isSupport ? (
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : enemy.intent.damage ? (
                      <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <Skull className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="truncate">{intentStr}</span>
                  </div>
                )}

                {!dead && enemy.intent.telegraphNote && (
                  <div className="text-[11px] text-[#C89B3C] mt-0.5 truncate">
                    {enemy.intent.telegraphNote}
                  </div>
                )}

                {statusStr && !dead && (
                  <div
                    className="text-[11px] text-[#9499A8] mt-0.5 truncate"
                    title={statusTip}
                  >
                    {statusStr}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Turn Resolution Banner OR Selected Enemy Tactical Hint Strip */}
      {isResolvingTurn ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-[#171316] px-3 py-1.5 text-xs text-amber-200"
        >
          <span className="font-medium truncate">
            {turnStepLabel ?? 'Resolving enemy turn...'}
          </span>
          <span className="text-[11px] text-amber-300/80 shrink-0 font-mono-tabular">
            Enemy Phase
          </span>
        </div>
      ) : (
        selectedEnemy &&
        selectedEnemyDef?.mechanicHint && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#1E2330] bg-[#10131B] px-3 py-1.5 text-xs text-[#A3A8B8]">
            <span>
              <strong className="text-[#E6E2D8] font-medium">{selectedEnemy.name}</strong>
              <span className="text-[#9499A8]">
                {' · '}
                {getArchetypeLabel(selectedEnemy.archetype ?? selectedEnemyDef.tacticalArchetype)}
              </span>
              <span aria-hidden="true"> · </span>
              <span>{selectedEnemyDef.mechanicHint}</span>
            </span>
            {selectedEnemyDef.factionName && (
              <span className="text-[11px] text-[#8E94A6]">{selectedEnemyDef.factionName}</span>
            )}
          </div>
        )
      )}

      {/* Phaser 2D Animated Battlefield */}
      <BattleCanvas
        regionId={run.regionId}
        characterId={run.characterId}
        auraStyle={run.selectedAuraStyle}
        combatState={combat}
        settings={settings}
        onSelectEnemy={handleEnemyClick}
      />

      {/* Action Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 px-1">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 min-h-[44px] px-3 sm:px-3.5 py-2 rounded-lg border border-[#C89B3C]/60 bg-[#151822]">
            <Zap className="w-4 h-4 text-[#C89B3C]" />
            <span className="font-mono-tabular text-sm sm:text-base font-bold text-[#F5E6C4]">
              {combat.energy} / {combat.maxEnergy} Energy
            </span>
          </div>

          {onUseHeroAbility && (
            <button
              type="button"
              disabled={!canUseHeroAbility}
              onClick={() => {
                setSelectedCardUid(null);
                onUseHeroAbility();
              }}
              title={`${heroAbilityLabel}: ${heroAbilityDesc}`}
              className="min-h-[44px] px-3 sm:px-3.5 py-2 rounded-md border bg-[#161926] hover:bg-[#1E2335] disabled:bg-[#12151E] disabled:border-[#232734] disabled:text-[#6E7485] text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed transition-colors touch-manipulation"
              style={{
                borderColor: canUseHeroAbility ? activeAbility.accentColor : undefined,
                color: canUseHeroAbility ? '#F3EFE6' : undefined,
              }}
            >
              <Sparkles
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: canUseHeroAbility ? activeAbility.accentColor : '#6E7485' }}
              />
              <span>
                {heroAbilityLabel} ({activeAbility.energyCost}E)
              </span>
              <span className="font-mono-tabular text-[11px] text-[#9499A8]">
                {combat.heroAbilityUsesLeft <= 0
                  ? 'Spent'
                  : combat.heroAbilityCooldown > 0
                  ? `${combat.heroAbilityCooldown}t CD`
                  : `${combat.heroAbilityUsesLeft}/${activeAbility.maxUsesPerCombat}`}
              </span>
            </button>
          )}

          <div className="text-[11px] sm:text-xs text-[#9499A8] font-mono-tabular flex items-center gap-2 sm:gap-3">
            <span>Draw {combat.drawPile.length}</span>
            <span>·</span>
            <span>Disc {combat.discardPile.length}</span>
            <span>·</span>
            <span>Exh {combat.exhaustPile.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
          <button
            type="button"
            onClick={() => setShowLog((v) => !v)}
            className="min-h-[44px] px-3.5 py-2 rounded-md border border-[#2A2F3E] bg-[#13161F] hover:bg-[#1B202D] text-xs font-medium text-[#B5B9C4] whitespace-nowrap cursor-pointer touch-manipulation"
          >
            {showLog ? 'Hide Log' : 'Combat Log'}
          </button>

          {confirmEndPrompt ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmEndPrompt(false)}
                className="min-h-[44px] px-3 py-2 rounded-md border border-[#2A2F3E] text-xs text-[#B5B9C4] cursor-pointer touch-manipulation"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canAct}
                onClick={handleEndTurnPress}
                className="min-h-[44px] px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer whitespace-nowrap touch-manipulation"
              >
                Confirm End Turn
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!canAct}
              onClick={handleEndTurnPress}
              className="min-h-[44px] px-5 py-2 rounded-md bg-[#C89B3C] hover:bg-[#D8AD4E] disabled:bg-[#232734] disabled:text-[#6E7485] text-[#0B0C10] text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer touch-manipulation"
            >
              {isResolvingTurn ? 'Enemy Turn...' : 'End Turn'}
            </button>
          )}
        </div>
      </div>

      {/* Selected Card Targeting Banner (Touch & Desktop clarity) */}
      {selectedCard && selectedCardEff && canAct && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#C89B3C]/60 bg-[#171B26] px-3.5 py-2 text-xs">
          <span className="text-[#F5E6C4]">
            Targeting <strong className="text-[#C89B3C]">{selectedCardEff.name}</strong> — Tap a
            target enemy or tap card again to cast.
          </span>
          <button
            type="button"
            onClick={() => setSelectedCardUid(null)}
            className="min-h-[36px] px-3 py-1 rounded border border-[#2E3446] bg-[#11141C] text-[#CFCBC0] hover:text-white cursor-pointer touch-manipulation"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Optional Combat Log Drawer */}
      {showLog && (
        <div className="rounded-lg border border-[#232734] bg-[#0F121A] px-4 py-3 max-h-32 overflow-y-auto text-xs text-[#A3A8B8] space-y-1">
          {combat.combatLog.map((line, i) => (
            <div key={i}>· {line}</div>
          ))}
        </div>
      )}

      {/* Player Card Hand */}
      <div className="w-full overflow-x-auto snap-x snap-mandatory touch-scroll-x pb-2 pt-1">
        <div className="flex items-stretch justify-start sm:justify-center gap-2.5 sm:gap-3 min-w-max px-1">
          {combat.hand.map((card) => {
            const eff = getEffectiveCardDef(card);
            const playable = canAct && combat.energy >= eff.cost;
            const preview = previewCardCombatState(card, combat, selectedEnemy, run.relics);
            const rampBonus = combat.cardRampBonuses?.[card.defId] ?? 0;
            return (
              <div key={card.uid} className="snap-start">
                <CardView
                  card={card}
                  playable={playable}
                  selected={card.uid === selectedCardUid}
                  preview={preview}
                  rampBonus={rampBonus}
                  onClick={() => handleCardClick(card.uid)}
                />
              </div>
            );
          })}
          {combat.hand.length === 0 && (
            <div className="py-10 text-xs text-[#7D8394]">
              No cards remaining in hand. End turn to draw a new hand.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
