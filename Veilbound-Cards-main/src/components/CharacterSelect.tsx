import { useState } from 'react';
import { ArrowLeft, Compass, Lock, ScrollText, Shield, Sparkles, Swords } from 'lucide-react';
import { getRegionBackdropUrl } from '../assets/imageUrls';
import { CARDS } from '../data/cards';
import { CHARACTERS } from '../data/characters';
import {
  getFactionDef,
  getFactionStandingTier,
  getRegionPrimaryFaction,
  getStandingLabel,
} from '../data/factions';
import { RELICS } from '../data/relics';
import { DIFFICULTIES, REGIONS } from '../data/regions';
import { getAvailableContractsForRegion, getRegionWorldModifiers } from '../engine/worldManager';
import type { DifficultyId, SaveDataV1 } from '../types/game';

interface CharacterSelectProps {
  save: SaveDataV1;
  onBack: () => void;
  onOpenSanctuary: () => void;
  onLaunchRun: (
    characterId: string,
    regionId: string,
    difficulty: DifficultyId,
    seed?: string,
    contractId?: string
  ) => void;
}

export function CharacterSelect({
  save,
  onBack,
  onOpenSanctuary,
  onLaunchRun,
}: CharacterSelectProps) {
  const [selectedCharId, setSelectedCharId] = useState<string>(CHARACTERS[0].id);
  const [selectedRegionId, setSelectedRegionId] = useState<string>(REGIONS[0].id);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyId>('standard');
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [customSeed, setCustomSeed] = useState('');

  const selectedChar = CHARACTERS.find((c) => c.id === selectedCharId) ?? CHARACTERS[0];
  const charMeta = save.characterProgress[selectedChar.id];
  const isCharUnlocked = selectedChar.unlockedByDefault || Boolean(charMeta?.unlocked);

  const selectedRegion = REGIONS.find((r) => r.id === selectedRegionId) ?? REGIONS[0];
  const isRegionUnlocked =
    selectedRegion.unlockedByDefault || save.unlockedRegions.includes(selectedRegion.id);

  const regionFactionId = getRegionPrimaryFaction(selectedRegion.id);
  const regionFaction = getFactionDef(regionFactionId);
  const factionRep = save.factionReputation?.[regionFactionId] ?? 0;
  const factionTier = getFactionStandingTier(factionRep);
  const regionStability = save.worldState?.regionStability?.[selectedRegion.id] ?? 60;
  const worldMods = getRegionWorldModifiers(save, selectedRegion.id);
  const availableContracts = getAvailableContractsForRegion(selectedRegion.id);

  const canStart = isCharUnlocked && isRegionUnlocked;

  const deckCounts = selectedChar.startingDeck.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});

  const questStep = charMeta?.questStep ?? 0;
  const questCompleted = Boolean(charMeta?.questCompleted);
  const questStage =
    selectedChar.quest.stages[Math.min(questStep, selectedChar.quest.stages.length - 1)];

  return (
    <div className="min-h-[100dvh] bg-[#0B0C10] text-[#E6E2D8] flex flex-col pb-safe">
      {/* Header */}
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
          <h1 className="font-display text-lg sm:text-2xl font-bold text-[#F3EFE6]">
            Prepare Expedition
          </h1>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-xs text-[#A3A8B8] tabular-nums">
          <span>Soul Shards: {save.soulShards}</span>
          <button
            type="button"
            onClick={onOpenSanctuary}
            className="min-h-[44px] px-4 py-2 rounded-md border border-[#C89B3C]/50 bg-[#171A24] hover:bg-[#1F2433] text-[#F5E6C4] font-medium whitespace-nowrap shrink-0 cursor-pointer touch-manipulation"
          >
            Open Sanctuary
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left: Character Selection & Detail */}
        <section className="lg:col-span-7 space-y-6">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#F3EFE6] mb-3">
              01. Choose Character ({CHARACTERS.length} Heroes)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
              {CHARACTERS.map((char) => {
                const unlocked =
                  char.unlockedByDefault || Boolean(save.characterProgress[char.id]?.unlocked);
                const active = char.id === selectedCharId;
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => setSelectedCharId(char.id)}
                    className={`min-h-[96px] p-3.5 rounded-lg border text-left transition-colors cursor-pointer touch-manipulation flex flex-col justify-between ${
                      active
                        ? 'bg-[#171B26] border-[#C89B3C]'
                        : 'bg-[#11141C] border-[#232734] hover:border-[#3A4154]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm sm:text-base font-semibold text-[#F3EFE6] truncate">
                          {char.name}
                        </span>
                        {!unlocked && <Lock className="w-3.5 h-3.5 text-[#9499A8] shrink-0" />}
                      </div>
                      <div className="text-[11px] text-[#9499A8] mt-0.5 truncate">{char.title}</div>
                      {char.combatClass && (
                        <div className="text-[10px] text-[#C89B3C] mt-0.5 truncate">
                          {char.combatClass}
                        </div>
                      )}
                    </div>
                    <div className="mt-2.5 text-[11px] text-[#B5B9C4] tabular-nums">
                      HP {char.maxHp} · {char.startingEnergy}E
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Character Dossier */}
          <div className="rounded-lg border border-[#232734] bg-[#11141C] p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#F3EFE6]">
                  {selectedChar.name}, {selectedChar.title}
                </h3>
                {(selectedChar.combatClass || selectedChar.preferredRange) && (
                  <div className="text-xs text-[#C89B3C] mt-0.5 capitalize">
                    {selectedChar.combatClass ?? 'Adventurer'}
                    {selectedChar.preferredRange
                      ? ` · Preferred Range: ${selectedChar.preferredRange}`
                      : ''}
                  </div>
                )}
                <p className="text-sm text-[#B5B9C4] mt-1.5 leading-relaxed max-w-2xl">
                  {selectedChar.description}
                </p>
              </div>
              {!isCharUnlocked && (
                <div className="text-xs text-amber-300 max-w-xs">
                  Locked: {selectedChar.unlockHint}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-[#202430]">
              <div>
                <div className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5" />
                  <span>Advantages</span>
                </div>
                <ul className="space-y-1.5 text-xs text-[#CFCBC0]">
                  {selectedChar.advantages.map((adv) => (
                    <li key={adv}>· {adv}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-rose-400 mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Disadvantages</span>
                </div>
                <ul className="space-y-1.5 text-xs text-[#CFCBC0]">
                  {selectedChar.disadvantages.map((dis) => (
                    <li key={dis}>· {dis}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 border-t border-[#202430]">
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-[#C89B3C] mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Passive: {selectedChar.passiveAbility.name}</span>
                  </div>
                  <p className="text-xs text-[#B5B9C4] leading-relaxed">
                    {selectedChar.passiveAbility.description}
                  </p>
                </div>

                <div>
                  <div className="text-xs font-semibold text-sky-300 mb-1">
                    Active Art:{' '}
                    {charMeta?.useAlternateAbility
                      ? selectedChar.activeAbility.alternateName
                      : selectedChar.activeAbility.name}{' '}
                    ({selectedChar.activeAbility.energyCost}E ·{' '}
                    {selectedChar.activeAbility.maxUsesPerCombat}/fight)
                  </div>
                  <p className="text-xs text-[#B5B9C4] leading-relaxed">
                    {charMeta?.useAlternateAbility
                      ? selectedChar.activeAbility.alternateDescription
                      : selectedChar.activeAbility.description}
                  </p>
                </div>

                <div className="text-xs text-[#9499A8]">
                  Starter Relic: {RELICS[selectedChar.startingRelicId]?.name}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-[#E6E2D8] mb-1.5">
                    Starting Deck ({selectedChar.startingDeck.length} Cards)
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#B5B9C4] tabular-nums">
                    {Object.entries(deckCounts).map(([cardId, count]) => (
                      <span key={cardId}>
                        {count}× {CARDS[cardId]?.name ?? cardId}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1E222E]">
                  <div className="text-xs font-semibold text-amber-200">
                    Quest: {selectedChar.quest.title} ·{' '}
                    <span className="font-normal text-[#9499A8]">
                      {questCompleted ? 'Completed' : `Stage ${questStep + 1}/3`}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9499A8] mt-0.5 leading-relaxed">
                    {questCompleted
                      ? `Mythic Oath (${CARDS[selectedChar.quest.unlockedCardId]?.name ?? 'Oath'}) added to starting deck.`
                      : questStage.objective}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Region, Faction Briefing, Contract, Difficulty, Seed & Launch */}
        <section className="lg:col-span-5 space-y-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#F3EFE6] mb-3">
              02. Destination Region
            </h2>
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {REGIONS.map((reg) => {
                const unlocked = reg.unlockedByDefault || save.unlockedRegions.includes(reg.id);
                const active = reg.id === selectedRegionId;
                return (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => {
                      setSelectedRegionId(reg.id);
                      setSelectedContractId('');
                    }}
                    className={`w-full rounded-lg border overflow-hidden text-left transition-colors cursor-pointer flex items-stretch ${
                      active
                        ? 'bg-[#171B26] border-[#C89B3C]'
                        : 'bg-[#11141C] border-[#232734] hover:border-[#3A4154]'
                    }`}
                  >
                    <div className="w-24 sm:w-28 shrink-0 bg-[#181C26] relative">
                      <img
                        src={getRegionBackdropUrl(reg.id)}
                        alt={reg.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="p-3 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-semibold text-[#F3EFE6] truncate">
                          {reg.name}
                        </span>
                        {!unlocked && <Lock className="w-4 h-4 text-[#9499A8] shrink-0" />}
                      </div>
                      <div className="text-[11px] text-[#C89B3C] mt-0.5">
                        Act {reg.tier} · {reg.subtitle}
                      </div>
                      <p className="text-xs text-[#9499A8] mt-1 line-clamp-2">{reg.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Regional Faction & Active World Events Summary */}
            <div className="mt-3 rounded-lg border border-[#232734] bg-[#11141C] p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[#E6E2D8]">
                  Dominant Faction: {regionFaction.shortName}
                </span>
                <span className="font-mono-tabular text-[#C89B3C]">
                  {getStandingLabel(factionTier)} ({factionRep >= 0 ? `+${factionRep}` : factionRep}) ·{' '}
                  Stability {regionStability}%
                </span>
              </div>
              {worldMods.activeEvents.length > 0 ? (
                worldMods.activeEvents.map((ev) => (
                  <div key={ev.id} className="text-[11px] text-amber-200">
                    World Event — {ev.name}: {ev.tacticalEffect}
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-[#9499A8]">
                  Region conditions normal · No active anomaly modifiers.
                </div>
              )}
            </div>
          </div>

          {/* Optional Expedition Contract */}
          <div>
            <h2 className="font-display text-base font-semibold text-[#F3EFE6] mb-2 flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-[#C89B3C]" />
              <span>03. Expedition Contract (Optional)</span>
            </h2>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedContractId('')}
                className={`w-full px-3.5 py-2 rounded-md border text-left text-xs cursor-pointer transition-colors ${
                  selectedContractId === ''
                    ? 'bg-[#171B26] border-[#C89B3C] text-[#F3EFE6]'
                    : 'bg-[#11141C] border-[#232734] text-[#9499A8]'
                }`}
              >
                No Active Contract — Standard Expedition
              </button>
              {availableContracts.map((c) => {
                const active = selectedContractId === c.id;
                const alreadyDone = save.completedContractIds?.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedContractId(c.id)}
                    className={`w-full px-3.5 py-2.5 rounded-md border text-left cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#171B26] border-[#C89B3C]'
                        : 'bg-[#11141C] border-[#232734] hover:border-[#3A4154]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#F3EFE6]">
                        {c.title}
                        {alreadyDone ? ' · Completed' : ''}
                      </span>
                      <span className="font-mono-tabular text-[#C89B3C] shrink-0">
                        +{c.rewardGold}G · +{c.rewardShards}S
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9499A8] mt-0.5">{c.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="font-display text-base font-semibold text-[#F3EFE6] mb-2.5">
              04. Difficulty &amp; Seed
            </h2>
            <div className="grid grid-cols-3 gap-2 mb-2.5">
              {DIFFICULTIES.map((diff) => {
                const active = diff.id === selectedDifficulty;
                return (
                  <button
                    key={diff.id}
                    type="button"
                    onClick={() => setSelectedDifficulty(diff.id)}
                    className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#1A1F2B] border-[#C89B3C]'
                        : 'bg-[#11141C] border-[#232734] hover:border-[#3A4154]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-[#F3EFE6]">{diff.name}</div>
                    <div className="text-[11px] text-[#9499A8]">{diff.subtitle}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[#9499A8] mb-3">
              {DIFFICULTIES.find((d) => d.id === selectedDifficulty)?.description}
            </p>

            <label className="block">
              <span className="text-xs text-[#B5B9C4]">
                Expedition Seed (optional, for reproducible routes)
              </span>
              <input
                type="text"
                value={customSeed}
                onChange={(e) => setCustomSeed(e.target.value.toUpperCase())}
                placeholder="Random Seed"
                maxLength={16}
                className="mt-1 w-full px-3.5 py-2 rounded-md border border-[#2A2F3E] bg-[#11141C] text-sm font-mono-tabular text-[#F3EFE6] placeholder:text-[#5B6070] focus:outline-none focus:border-[#C89B3C]"
              />
            </label>
          </div>

          <div className="pt-1">
            {!canStart && (
              <p className="text-xs text-amber-300 mb-3">
                {!isCharUnlocked
                  ? 'Unlock this character in the Sanctuary before embarking.'
                  : 'Unlock this region in the Sanctuary or conquer the previous Act first.'}
              </p>
            )}
            <button
              type="button"
              disabled={!canStart}
              onClick={() =>
                onLaunchRun(
                  selectedCharId,
                  selectedRegionId,
                  selectedDifficulty,
                  customSeed,
                  selectedContractId || undefined
                )
              }
              className={`w-full min-h-[48px] px-6 py-3 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                canStart
                  ? 'bg-[#C89B3C] hover:bg-[#D8AD4E] text-[#0B0C10] cursor-pointer'
                  : 'bg-[#1E222E] text-[#6E7485] cursor-not-allowed'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Embark on Expedition</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
