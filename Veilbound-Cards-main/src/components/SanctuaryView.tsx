import { ArrowLeft, Award, Check, Compass, Globe, Lock, Sparkles } from 'lucide-react';
import { CARDS } from '../data/cards';
import { CHARACTERS } from '../data/characters';
import {
  FACTION_LIST,
  getFactionDef,
  getFactionStandingTier,
  getStandingLabel,
  WORLD_EVENTS,
} from '../data/factions';
import { REGIONS } from '../data/regions';
import type { HeroAuraStyle, SaveDataV1 } from '../types/game';

interface SanctuaryViewProps {
  save: SaveDataV1;
  onUnlockCharacter: (characterId: string, cost: number) => void;
  onUnlockNode: (characterId: string, nodeId: string, cost: number) => void;
  onUnlockRegion: (regionId: string, cost: number) => void;
  onSelectAuraStyle: (characterId: string, aura: HeroAuraStyle) => void;
  onToggleAlternateAbility: (characterId: string) => void;
  onBack: () => void;
}

const BRANCH_LABELS: Record<string, string> = {
  core: 'Core',
  offense: 'Offense',
  defense: 'Defense',
  utility: 'Utility',
};

const AURA_LABELS: Record<HeroAuraStyle, string> = {
  default: 'Ashen Standard',
  ascended: 'Ascended Verdant',
  eclipse: 'Eclipse Halo',
};

export function SanctuaryView({
  save,
  onUnlockCharacter,
  onUnlockNode,
  onUnlockRegion,
  onSelectAuraStyle,
  onToggleAlternateAbility,
  onBack,
}: SanctuaryViewProps) {
  return (
    <div className="min-h-[100dvh] bg-[#0B0C10] text-[#E6E2D8] flex flex-col pb-safe">
      <header className="px-4 sm:px-6 py-4 border-b border-[#232734] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] px-3.5 py-2 rounded-md border border-[#2A2F3E] hover:bg-[#171B26] text-xs font-medium flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer touch-manipulation"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-[#F3EFE6]">
              Sanctuary Progression
            </h1>
            <p className="text-xs text-[#9499A8]">
              Branching hero masteries, personal quests, and living realm standings.
            </p>
          </div>
        </div>

        <div className="font-mono-tabular text-sm font-semibold text-[#C89B3C] whitespace-nowrap">
          {save.soulShards} Soul Shards
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-10">
        {/* 01. Independent Branching Hero Mastery Trees & Quests */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-[#F3EFE6]">
              01. Hero Mastery Trees &amp; Quests ({CHARACTERS.length} Heroes)
            </h2>
            <span className="text-xs text-[#9499A8] tabular-nums">
              Contracts Completed: {save.completedContractIds?.length ?? 0} · Legendaries Slain:{' '}
              {save.defeatedLegendaries?.length ?? 0} · Secret Bosses:{' '}
              {save.defeatedSecretBosses?.length ?? 0}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {CHARACTERS.map((char) => {
              const prog = save.characterProgress[char.id];
              const unlocked = char.unlockedByDefault || Boolean(prog?.unlocked);
              const unlockedNodes = new Set(prog?.unlockedNodeIds ?? []);
              const questStep = prog?.questStep ?? 0;
              const questCompleted = Boolean(prog?.questCompleted);
              const currentStage = char.quest.stages[Math.min(questStep, char.quest.stages.length - 1)];
              const unlockedAuras = prog?.unlockedAuraStyles ?? ['default'];
              const selectedAura = prog?.selectedAuraStyle ?? 'default';
              const oathCard = CARDS[char.quest.unlockedCardId];

              return (
                <div
                  key={char.id}
                  className="rounded-lg border border-[#232734] bg-[#11141C] p-5 flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-lg font-semibold text-[#F3EFE6]">
                          {char.name}
                        </h3>
                        <span className="text-xs text-[#9499A8] tabular-nums">
                          {prog?.runsWon ?? 0}W / {prog?.runsAttempted ?? 0}R
                        </span>
                      </div>
                      <div className="text-xs text-[#C89B3C]">
                        {char.title}
                        {char.combatClass ? ` · ${char.combatClass}` : ''}
                      </div>
                    </div>

                    {!unlocked ? (
                      <div className="p-4 rounded-md border border-[#262B3A] bg-[#151923] space-y-3">
                        <div className="flex items-center gap-2 text-xs text-[#B5B9C4]">
                          <Lock className="w-4 h-4 text-[#9499A8] shrink-0" />
                          <span>{char.unlockHint}</span>
                        </div>
                        <button
                          type="button"
                          disabled={save.soulShards < (char.unlockCostShards ?? 30)}
                          onClick={() =>
                            onUnlockCharacter(char.id, char.unlockCostShards ?? 30)
                          }
                          className="w-full min-h-[44px] px-4 py-2 rounded-md bg-[#C89B3C] disabled:bg-[#232734] disabled:text-[#6E7485] text-[#0B0C10] text-xs font-semibold cursor-pointer disabled:cursor-not-allowed whitespace-nowrap touch-manipulation"
                        >
                          Unlock for {char.unlockCostShards ?? 30} Soul Shards
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Hero Active Ability & Aura Loadout */}
                        <div className="pt-3 border-t border-[#202430] space-y-2.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-[#E6E2D8] flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#C89B3C]" />
                              <span>
                                Active Art:{' '}
                                {prog?.useAlternateAbility
                                  ? char.activeAbility.alternateName
                                  : char.activeAbility.name}
                              </span>
                            </span>
                            <span className="font-mono-tabular text-[#9499A8]">
                              {char.activeAbility.energyCost}E · {char.activeAbility.cooldownTurns}T CD
                            </span>
                          </div>
                          <p className="text-[11px] text-[#9499A8] leading-relaxed">
                            {prog?.useAlternateAbility
                              ? char.activeAbility.alternateDescription
                              : char.activeAbility.description}
                          </p>

                          {questCompleted && (
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => onToggleAlternateAbility(char.id)}
                                className="min-h-[36px] px-3 py-1.5 rounded border border-[#2F364A] bg-[#161B26] hover:border-[#C89B3C] text-[11px] font-medium text-[#F5E6C4] cursor-pointer whitespace-nowrap"
                              >
                                {prog?.useAlternateAbility
                                  ? 'Use Standard Art'
                                  : `Switch to ${char.activeAbility.alternateName}`}
                              </button>

                              {unlockedAuras.length > 1 && (
                                <div className="flex items-center gap-1">
                                  {unlockedAuras.map((aura) => (
                                    <button
                                      key={aura}
                                      type="button"
                                      onClick={() => onSelectAuraStyle(char.id, aura)}
                                      className={`min-h-[36px] px-2.5 py-1 rounded text-[11px] font-medium border cursor-pointer whitespace-nowrap ${
                                        selectedAura === aura
                                          ? 'border-[#C89B3C] bg-[#1E2331] text-[#F5E6C4]'
                                          : 'border-[#252B3B] bg-[#141822] text-[#9499A8]'
                                      }`}
                                    >
                                      {AURA_LABELS[aura]}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Hero 3-Stage Quest */}
                        <div className="pt-3 border-t border-[#202430] space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-amber-200 flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-[#C89B3C]" />
                              <span>Quest: {char.quest.title}</span>
                            </span>
                            <span className="font-mono-tabular text-[11px] text-[#9499A8]">
                              {questCompleted ? 'Completed' : `Stage ${questStep + 1}/3`}
                            </span>
                          </div>
                          {questCompleted ? (
                            <p className="text-[11px] text-emerald-400 leading-relaxed">
                              Unlocked Mythic Card: {oathCard?.name ?? char.quest.unlockedCardId} &amp;{' '}
                              {char.quest.cosmeticName}.
                            </p>
                          ) : (
                            <p className="text-[11px] text-[#B5B9C4] leading-relaxed">
                              {currentStage.title}: {currentStage.objective}
                            </p>
                          )}
                        </div>

                        {/* Branching Mastery Nodes */}
                        <div className="space-y-2 pt-2 border-t border-[#202430]">
                          {char.progressionNodes.map((node) => {
                            const owned = unlockedNodes.has(node.id);
                            const prereqMet =
                              !node.requiresNodeId || unlockedNodes.has(node.requiresNodeId);
                            const rivalOwned =
                              Boolean(node.exclusiveWithNodeId) &&
                              unlockedNodes.has(node.exclusiveWithNodeId!);
                            const canAfford = save.soulShards >= node.costShards;

                            return (
                              <div
                                key={node.id}
                                className={`p-3 rounded-md border ${
                                  owned
                                    ? 'border-emerald-800/70 bg-emerald-950/20'
                                    : rivalOwned
                                    ? 'border-[#232734] bg-[#11131A] opacity-60'
                                    : 'border-[#232734] bg-[#141822]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="text-[11px] text-[#C89B3C] font-medium">
                                      Tier {node.tier} · {BRANCH_LABELS[node.branch] ?? node.branch}
                                    </span>
                                    <div className="text-xs font-semibold text-[#F3EFE6] truncate">
                                      {node.name}
                                    </div>
                                  </div>
                                  {owned ? (
                                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 shrink-0">
                                      <Check className="w-3.5 h-3.5" />
                                      Unlocked
                                    </span>
                                  ) : rivalOwned ? (
                                    <span className="text-[11px] text-[#7D8394] shrink-0">
                                      Rival Path Taken
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={!prereqMet || !canAfford}
                                      onClick={() =>
                                        onUnlockNode(char.id, node.id, node.costShards)
                                      }
                                      className="min-h-[36px] px-3 py-1 rounded bg-[#C89B3C] disabled:bg-[#232734] disabled:text-[#6E7485] text-[#0B0C10] text-[11px] font-semibold tabular-nums cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                                    >
                                      {node.costShards} Shards
                                    </button>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#9499A8] mt-1 leading-relaxed">
                                  {node.description}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 02. Region Unlocks */}
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#F3EFE6]">
            02. Realm Waypoints
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REGIONS.map((reg) => {
              const unlocked = reg.unlockedByDefault || save.unlockedRegions.includes(reg.id);
              const cost = reg.unlockCostShards ?? 25;
              const stability = save.worldState?.regionStability?.[reg.id] ?? 60;
              const prereq = reg.prerequisiteRegionId
                ? REGIONS.find((r) => r.id === reg.prerequisiteRegionId)
                : null;
              return (
                <div
                  key={reg.id}
                  className="rounded-lg border border-[#232734] bg-[#11141C] p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-display text-base font-semibold text-[#F3EFE6]">
                        {reg.name}
                      </div>
                      <span className="text-[11px] text-[#9499A8] tabular-nums">
                        Act {reg.tier} · Stability {stability}%
                      </span>
                    </div>
                    <div className="text-xs text-[#C89B3C] mt-0.5">{reg.subtitle}</div>
                    <p className="text-xs text-[#9499A8] mt-2 leading-relaxed">{reg.description}</p>
                    {!unlocked && prereq && (
                      <p className="text-[11px] text-[#7D8394] mt-2">
                        Conquer {prereq.name} or attune early with Shards.
                      </p>
                    )}
                  </div>
                  {unlocked ? (
                    <div className="text-xs text-emerald-400 font-medium">Waystone Attuned</div>
                  ) : (
                    <button
                      type="button"
                      disabled={save.soulShards < cost}
                      onClick={() => onUnlockRegion(reg.id, cost)}
                      className="min-h-[40px] px-4 py-2 rounded-md bg-[#C89B3C] disabled:bg-[#232734] disabled:text-[#6E7485] text-[#0B0C10] text-xs font-semibold cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Attune Waystone ({cost} Shards)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 03. Living World Events & Faction Standings */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-[#F3EFE6] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#C89B3C]" />
              <span>03. Factions &amp; World Chronicle</span>
            </h2>
            <span className="text-xs text-[#9499A8] tabular-nums">
              Expedition Cycle {save.worldState?.expeditionCount ?? 1}
            </span>
          </div>

          {(save.worldState?.activeEvents?.length || save.worldState?.recentChronicle?.length) && (
            <div className="rounded-lg border border-[#232734] bg-[#11141C] p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#C89B3C]">Active World Events</div>
                {(save.worldState?.activeEvents ?? []).length === 0 ? (
                  <p className="text-xs text-[#9499A8]">No active regional anomalies.</p>
                ) : (
                  <ul className="space-y-2 text-xs text-[#CFCBC0]">
                    {save.worldState.activeEvents.map((entry) => {
                      const ev = WORLD_EVENTS[entry.eventId];
                      if (!ev) return null;
                      return (
                        <li key={entry.eventId} className="pb-2 border-b border-[#1E222E] last:border-b-0">
                          <div className="font-semibold text-[#F3EFE6]">
                            {ev.name} ·{' '}
                            <span className="text-[#9499A8] font-normal tabular-nums">
                              {entry.remainingRuns} run(s) left
                            </span>
                          </div>
                          <div className="text-[#9499A8] mt-0.5">{ev.tacticalEffect}</div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#E6E2D8] flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#C89B3C]" />
                  <span>Recent Realm Chronicle</span>
                </div>
                {(save.worldState?.recentChronicle ?? []).length === 0 ? (
                  <p className="text-xs text-[#9499A8]">
                    Embark on expeditions to shape the realm chronicle.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-[#9499A8]">
                    {save.worldState.recentChronicle.map((entry, idx) => (
                      <li key={idx}>· {entry}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FACTION_LIST.map((faction) => {
              const rep = save.factionReputation?.[faction.id] ?? 0;
              const tier = getFactionStandingTier(rep);
              const rival = getFactionDef(faction.rivalFactionId);
              const ally = getFactionDef(faction.alliedFactionId);

              return (
                <div
                  key={faction.id}
                  className="rounded-lg border border-[#232734] bg-[#11141C] p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-display text-sm font-semibold text-[#F3EFE6]">
                      {faction.name}
                    </div>
                    <span className="font-mono-tabular text-xs font-semibold text-[#C89B3C]">
                      {getStandingLabel(tier)} ({rep >= 0 ? `+${rep}` : rep})
                    </span>
                  </div>
                  <div className="text-[11px] text-[#9499A8]">
                    Leader: {faction.leaderName} · Allied: {ally.shortName} · Rival: {rival.shortName}
                  </div>
                  <p className="text-xs text-[#B5B9C4] leading-relaxed">{faction.philosophy}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
