import { useMemo, useState } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { CARDS, getCardAttackRange } from '../data/cards';
import { CHARACTERS } from '../data/characters';
import { ENEMIES } from '../data/enemies';
import {
  FACTION_LIST,
  getFactionDef,
  getFactionStandingTier,
  getStandingLabel,
  WORLD_EVENTS,
} from '../data/factions';
import { RELICS } from '../data/relics';
import type { CardCategory, CardDef, CardRarity, SaveDataV1 } from '../types/game';
import { CardView } from './CardView';

interface BestiaryViewProps {
  save: SaveDataV1;
  onBack: () => void;
}

const RARITY_ORDER: Record<CardRarity, number> = {
  starter: 0,
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6,
  secret: 7,
  curse: 8,
};

const SOURCE_LABELS: Record<string, string> = {
  standard: 'Standard Reward Pool',
  shop_only: 'Merchant Exclusive',
  boss_drop: 'Boss / Apex Trophy',
  secret_event: 'Secret Encounter / Vault',
  contract: 'Expedition Contract',
  faction: 'Faction Tribute',
  quest: 'Hero Quest Oath',
  generated: 'Conjured in Combat',
};

const CATEGORY_OPTIONS: { id: 'all' | CardCategory; label: string }[] = [
  { id: 'all', label: 'All Categories' },
  { id: 'attack', label: 'Attack' },
  { id: 'defense', label: 'Defense' },
  { id: 'skill', label: 'Skill' },
  { id: 'power', label: 'Power' },
  { id: 'stance', label: 'Stance' },
  { id: 'trap', label: 'Trap' },
  { id: 'reaction', label: 'Reaction' },
  { id: 'ritual', label: 'Ritual' },
  { id: 'summoning', label: 'Summoning' },
  { id: 'curse', label: 'Curse' },
];

const RARITY_OPTIONS: { id: 'all' | CardRarity; label: string }[] = [
  { id: 'all', label: 'All Rarities' },
  { id: 'starter', label: 'Starter' },
  { id: 'common', label: 'Common' },
  { id: 'uncommon', label: 'Uncommon' },
  { id: 'rare', label: 'Rare' },
  { id: 'epic', label: 'Epic' },
  { id: 'legendary', label: 'Legendary' },
  { id: 'mythic', label: 'Mythic' },
  { id: 'secret', label: 'Secret' },
  { id: 'curse', label: 'Curse' },
];

export function BestiaryView({ save, onBack }: BestiaryViewProps) {
  const [tab, setTab] = useState<'enemies' | 'cards' | 'world'>('enemies');

  // Card Archive Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | CardCategory>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | CardRarity>('all');
  const [poolFilter, setPoolFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'discovered' | 'undiscovered'>('all');
  const [sortBy, setSortBy] = useState<'cost' | 'name' | 'rarity' | 'category'>('rarity');
  const [showUpgraded, setShowUpgraded] = useState(false);
  const [inspectedCard, setInspectedCard] = useState<CardDef | null>(null);

  const enemies = Object.values(ENEMIES);
  const allCards = useMemo(() => Object.values(CARDS), []);
  const discoveredSet = useMemo(() => new Set(save.discoveredCards ?? []), [save.discoveredCards]);

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCards
      .filter((c) => {
        if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
        if (rarityFilter !== 'all' && c.rarity !== rarityFilter) return false;
        if (poolFilter !== 'all' && c.characterPool !== poolFilter) return false;
        const isDisc = discoveredSet.has(c.id);
        if (statusFilter === 'discovered' && !isDisc) return false;
        if (statusFilter === 'undiscovered' && isDisc) return false;
        if (q) {
          const hay = `${c.name} ${c.description} ${c.upgraded?.description ?? ''} ${(c.tags ?? []).join(' ')} ${c.id}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'cost') {
          if (a.cost !== b.cost) return a.cost - b.cost;
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'category') {
          const catCmp = a.category.localeCompare(b.category);
          return catCmp !== 0 ? catCmp : a.name.localeCompare(b.name);
        }
        if (sortBy === 'rarity') {
          const rCmp = (RARITY_ORDER[a.rarity] ?? 0) - (RARITY_ORDER[b.rarity] ?? 0);
          return rCmp !== 0 ? rCmp : a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      });
  }, [allCards, categoryFilter, rarityFilter, poolFilter, statusFilter, searchQuery, sortBy, discoveredSet]);

  const discoveredCardCount = useMemo(
    () => allCards.filter((c) => discoveredSet.has(c.id)).length,
    [allCards, discoveredSet]
  );

  return (
    <div className="min-h-[100dvh] bg-[#0B0C10] text-[#E6E2D8] flex flex-col">
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
          <h1 className="font-display text-lg sm:text-xl font-bold text-[#F3EFE6]">
            Bestiary &amp; Codex
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#141822] rounded-md border border-[#232734] overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setTab('enemies')}
            className={`min-h-[40px] px-3.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer touch-manipulation ${
              tab === 'enemies' ? 'bg-[#242A3A] text-[#F3EFE6]' : 'text-[#9499A8]'
            }`}
          >
            Adversaries ({save.discoveredEnemies.length}/{enemies.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('cards')}
            className={`min-h-[40px] px-3.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer touch-manipulation ${
              tab === 'cards' ? 'bg-[#242A3A] text-[#F3EFE6]' : 'text-[#9499A8]'
            }`}
          >
            Card Archive ({allCards.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('world')}
            className={`min-h-[40px] px-3.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer touch-manipulation ${
              tab === 'world' ? 'bg-[#242A3A] text-[#F3EFE6]' : 'text-[#9499A8]'
            }`}
          >
            Factions &amp; World ({FACTION_LIST.length})
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {tab === 'enemies' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enemies.map((enemy) => {
              const seen = save.discoveredEnemies.includes(enemy.id);
              const isLegendary = enemy.role === 'legendary';
              const isSecretBoss = enemy.role === 'secret_boss';
              return (
                <div
                  key={enemy.id}
                  className="rounded-lg border border-[#232734] bg-[#11141C] p-5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-base font-semibold text-[#F3EFE6]">
                      {seen ? enemy.name : 'Unrecorded Adversary'}
                    </h2>
                    <span className="text-xs font-mono-tabular text-[#9499A8]">
                      {seen ? `HP ${enemy.maxHp}` : 'HP ???'}
                    </span>
                  </div>
                  <div className="text-xs text-[#C89B3C] capitalize">
                    {enemy.group === 'faction' ? enemy.factionName : 'Regional Creature'} ·{' '}
                    {isSecretBoss
                      ? 'Secret Boss'
                      : isLegendary
                      ? 'Legendary Creature'
                      : enemy.role.replace('_', ' ')}
                    {seen && enemy.tacticalArchetype ? ` · ${enemy.tacticalArchetype}` : ''}
                  </div>
                  <p className="text-xs text-[#9499A8] leading-relaxed">
                    {seen
                      ? enemy.lore
                      : isSecretBoss || isLegendary
                      ? 'Rumor speaks of this mythic entity lurking off hidden routes.'
                      : 'Encounter this foe during an expedition to record its tactics.'}
                  </p>
                  {seen && enemy.mechanicHint && (
                    <p className="text-xs text-[#CFCBC0] pt-1 border-t border-[#1D212E]">
                      Tactics: {enemy.mechanicHint}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'cards' && (
          <div className="space-y-5">
            {/* Filter & Search Toolbar */}
            <div className="rounded-lg border border-[#232734] bg-[#11141C] p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                <label className="relative sm:col-span-2">
                  <Search className="w-4 h-4 text-[#7D8394] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search card name, effect, or tag..."
                    className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-md border border-[#2A2F3E] bg-[#0E1118] text-xs text-[#F3EFE6] placeholder:text-[#6B7182] focus:outline-none focus:border-[#C89B3C]"
                  />
                </label>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as 'all' | CardCategory)}
                  aria-label="Filter by category"
                  className="min-h-[44px] px-3 py-2 rounded-md border border-[#2A2F3E] bg-[#0E1118] text-xs text-[#E6E2D8] focus:outline-none focus:border-[#C89B3C]"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <select
                  value={rarityFilter}
                  onChange={(e) => setRarityFilter(e.target.value as 'all' | CardRarity)}
                  aria-label="Filter by rarity"
                  className="min-h-[44px] px-3 py-2 rounded-md border border-[#2A2F3E] bg-[#0E1118] text-xs text-[#E6E2D8] focus:outline-none focus:border-[#C89B3C]"
                >
                  {RARITY_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <select
                  value={poolFilter}
                  onChange={(e) => setPoolFilter(e.target.value)}
                  aria-label="Filter by hero pool"
                  className="min-h-[44px] px-3 py-2 rounded-md border border-[#2A2F3E] bg-[#0E1118] text-xs text-[#E6E2D8] focus:outline-none focus:border-[#C89B3C]"
                >
                  <option value="all">All Hero Pools</option>
                  <option value="shared">Shared Pool</option>
                  {CHARACTERS.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | 'discovered' | 'undiscovered')
                  }
                  aria-label="Filter by discovery status"
                  className="min-h-[44px] px-3 py-2 rounded-md border border-[#2A2F3E] bg-[#0E1118] text-xs text-[#E6E2D8] focus:outline-none focus:border-[#C89B3C]"
                >
                  <option value="all">All Status</option>
                  <option value="discovered">Discovered Only</option>
                  <option value="undiscovered">Undiscovered Only</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                <div className="text-[#9499A8] tabular-nums">
                  Showing <strong className="text-[#F3EFE6]">{filteredCards.length}</strong> of{' '}
                  {allCards.length} cards · Discovered{' '}
                  <strong className="text-[#C89B3C]">
                    {discoveredCardCount}/{allCards.length}
                  </strong>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <label className="flex items-center gap-2 text-[#B5B9C4]">
                    <span>Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(e.target.value as 'cost' | 'name' | 'rarity' | 'category')
                      }
                      className="min-h-[40px] px-2.5 py-1.5 rounded border border-[#2A2F3E] bg-[#0E1118] text-xs text-[#E6E2D8] focus:outline-none focus:border-[#C89B3C]"
                    >
                      <option value="rarity">Rarity</option>
                      <option value="cost">Energy Cost</option>
                      <option value="category">Category</option>
                      <option value="name">Name (A–Z)</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowUpgraded((v) => !v)}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded border text-xs font-medium cursor-pointer touch-manipulation ${
                      showUpgraded
                        ? 'bg-[#252B3B] border-[#C89B3C] text-[#EAB308]'
                        : 'bg-[#0E1118] border-[#2A2F3E] text-[#B5B9C4] hover:text-[#F3EFE6]'
                    }`}
                  >
                    {showUpgraded ? 'Viewing Tempered (+)' : 'Show Upgraded (+)'}
                  </button>
                </div>
              </div>
            </div>

            {filteredCards.length === 0 ? (
              <div className="py-16 text-center text-sm text-[#9499A8] border border-[#232734] rounded-lg bg-[#11141C]">
                No cards match the selected filters.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 justify-items-center">
                {filteredCards.map((card) => {
                  const isDiscovered = discoveredSet.has(card.id);
                  const canUpgrade = showUpgraded && Boolean(card.upgraded);
                  return (
                    <div key={card.id} className="flex flex-col items-center gap-1">
                      <CardView
                        card={{ uid: card.id, defId: card.id, upgraded: canUpgrade }}
                        compact
                        playable
                        onClick={() => setInspectedCard(card)}
                      />
                      <span
                        className={`text-[10px] tracking-wide ${
                          isDiscovered ? 'text-emerald-400/90' : 'text-[#6E7485]'
                        }`}
                      >
                        {isDiscovered ? 'Discovered' : 'Undiscovered'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'world' && (
          <div className="space-y-8">
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-[#F3EFE6]">
                Active World Events
              </h2>
              {(save.worldState?.activeEvents ?? []).length === 0 ? (
                <p className="text-xs text-[#9499A8]">
                  No active world events this cycle. Completing or failing runs triggers dynamic
                  shifts across regions.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {save.worldState.activeEvents.map((entry) => {
                    const ev = WORLD_EVENTS[entry.eventId];
                    if (!ev) return null;
                    return (
                      <div
                        key={entry.eventId}
                        className="rounded-lg border border-[#232734] bg-[#11141C] p-4 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-base font-semibold text-[#F3EFE6]">
                            {ev.name}
                          </span>
                          <span className="text-xs font-mono-tabular text-[#C89B3C]">
                            {entry.remainingRuns} run(s) left
                          </span>
                        </div>
                        <p className="text-xs text-[#9499A8] leading-relaxed">{ev.description}</p>
                        <div className="text-xs text-amber-200 pt-1">{ev.tacticalEffect}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-[#F3EFE6]">
                Factions of the Veil
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {FACTION_LIST.map((faction) => {
                  const rep = save.factionReputation?.[faction.id] ?? 0;
                  const tier = getFactionStandingTier(rep);
                  const ally = getFactionDef(faction.alliedFactionId);
                  const rival = getFactionDef(faction.rivalFactionId);
                  const sigCard = CARDS[faction.exclusiveCardId];
                  const sigRelic = RELICS[faction.exclusiveRelicId];
                  return (
                    <div
                      key={faction.id}
                      className="rounded-lg border border-[#232734] bg-[#11141C] p-5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-base font-semibold text-[#F3EFE6]">
                          {faction.name}
                        </h3>
                        <span className="font-mono-tabular text-xs font-semibold text-[#C89B3C]">
                          {getStandingLabel(tier)} ({rep >= 0 ? `+${rep}` : rep})
                        </span>
                      </div>
                      <div className="text-xs text-[#C89B3C]">
                        Commander: {faction.leaderName} · Allied: {ally.shortName} · Rival:{' '}
                        {rival.shortName}
                      </div>
                      <p className="text-xs text-[#9499A8] leading-relaxed">{faction.description}</p>
                      <div className="text-[11px] text-[#CFCBC0] pt-2 border-t border-[#1E222E]">
                        Favored Merchant Rewards: {sigCard?.name ?? faction.exclusiveCardId} &amp;{' '}
                        {sigRelic?.name ?? faction.exclusiveRelicId}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Card Detail Inspection Modal */}
      {inspectedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={inspectedCard.name}
        >
          <div className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-lg border border-[#C89B3C]/50 bg-[#11141C] p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-[#232734] pb-3">
              <div>
                <div className="text-xs text-[#C89B3C] capitalize">
                  {inspectedCard.characterPool === 'shared'
                    ? 'Shared Card Pool'
                    : `${CHARACTERS.find((c) => c.id === inspectedCard.characterPool)?.name ?? inspectedCard.characterPool} Exclusive`}{' '}
                  · {inspectedCard.rarity} {inspectedCard.category}
                  {getCardAttackRange(inspectedCard)
                    ? ` · ${getCardAttackRange(inspectedCard)} Range`
                    : ''}
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#F3EFE6] mt-0.5">
                  {inspectedCard.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectedCard(null)}
                aria-label="Close card detail"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md border border-[#2A2F3E] text-[#9499A8] hover:text-white hover:bg-[#1E2230] cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-start justify-center gap-5">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-[#9499A8]">Base Form</span>
                <CardView
                  card={{ uid: `inspect_base_${inspectedCard.id}`, defId: inspectedCard.id, upgraded: false }}
                  playable
                />
              </div>
              {inspectedCard.upgraded && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-[#EAB308]">Tempered (+)</span>
                  <CardView
                    card={{ uid: `inspect_up_${inspectedCard.id}`, defId: inspectedCard.id, upgraded: true }}
                    playable
                  />
                </div>
              )}
            </div>

            <div className="rounded-md border border-[#232734] bg-[#161A25] p-4 space-y-1.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[#9499A8]">
                  Acquisition:{' '}
                  <strong className="text-[#E6E2D8]">
                    {SOURCE_LABELS[inspectedCard.acquisitionSource ?? 'standard'] ??
                      'Standard Reward Pool'}
                  </strong>
                </span>
                <span
                  className={
                    discoveredSet.has(inspectedCard.id)
                      ? 'text-emerald-400 font-semibold'
                      : 'text-[#8E94A6]'
                  }
                >
                  {discoveredSet.has(inspectedCard.id) ? 'Discovered in Run' : 'Not Yet Acquired'}
                </span>
              </div>
              {inspectedCard.flavor && (
                <p className="text-[#9499A8] italic pt-1 border-t border-[#222736]">
                  “{inspectedCard.flavor}”
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
