import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { CARDS } from '../data/cards';
import type { CardCategory, CardInstance, CardRarity } from '../types/game';
import { CardView } from './CardView';

interface DeckModalProps {
  title: string;
  subtitle?: string;
  cards: CardInstance[];
  mode: 'view' | 'upgrade' | 'remove';
  onSelectCard?: (cardUid: string) => void;
  onClose: () => void;
}

const FILTERS: { id: 'all' | CardCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'attack', label: 'Attack' },
  { id: 'defense', label: 'Defense' },
  { id: 'skill', label: 'Skill' },
  { id: 'power', label: 'Power' },
  { id: 'stance', label: 'Stance' },
  { id: 'trap', label: 'Trap' },
  { id: 'reaction', label: 'Reaction' },
  { id: 'ritual', label: 'Ritual' },
  { id: 'summoning', label: 'Summon' },
  { id: 'curse', label: 'Curse' },
];

export function DeckModal({
  title,
  subtitle,
  cards,
  mode,
  onSelectCard,
  onClose,
}: DeckModalProps) {
  const [filter, setFilter] = useState<'all' | CardCategory>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | CardRarity>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'cost' | 'name' | 'category'>('default');

  const visibleCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = cards.filter((c) => {
      const def = CARDS[c.defId];
      if (!def) return false;
      if (mode === 'upgrade' && (c.upgraded || !def.upgraded)) return false;
      if (filter !== 'all' && def.category !== filter) return false;
      if (rarityFilter !== 'all' && def.rarity !== rarityFilter) return false;
      if (q) {
        const name = c.upgraded && def.upgraded?.name ? def.upgraded.name : def.name;
        const desc = c.upgraded && def.upgraded ? def.upgraded.description : def.description;
        if (!`${name} ${desc}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'default') return list;
    return [...list].sort((a, b) => {
      const da = CARDS[a.defId];
      const db = CARDS[b.defId];
      if (!da || !db) return 0;
      if (sortBy === 'cost') {
        const ca = a.costOverride ?? (a.upgraded && da.upgraded?.cost !== undefined ? da.upgraded.cost : da.cost);
        const cb = b.costOverride ?? (b.upgraded && db.upgraded?.cost !== undefined ? db.upgraded.cost : db.cost);
        return ca !== cb ? ca - cb : da.name.localeCompare(db.name);
      }
      if (sortBy === 'category') {
        const cmp = da.category.localeCompare(db.category);
        return cmp !== 0 ? cmp : da.name.localeCompare(db.name);
      }
      return da.name.localeCompare(db.name);
    });
  }, [cards, mode, filter, rarityFilter, searchQuery, sortBy]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-5xl max-h-[90dvh] flex flex-col rounded-lg border border-[#2A2F3E] bg-[#10131B] shadow-2xl">
        <div className="flex flex-col gap-3 px-4 sm:px-6 py-4 border-b border-[#232734]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-semibold text-[#F3EFE6]">
                {title}
              </h2>
              {subtitle && <p className="text-xs text-[#9499A8] mt-0.5">{subtitle}</p>}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-[#9499A8] hover:text-white hover:bg-[#1E2230] cursor-pointer shrink-0"
              aria-label="Close deck view"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search, Rarity & Sort */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <label className="relative sm:col-span-6">
              <Search className="w-4 h-4 text-[#7D8394] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search deck cards..."
                className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-md border border-[#232734] bg-[#151923] text-xs text-[#F3EFE6] placeholder:text-[#6B7182] focus:outline-none focus:border-[#C89B3C]"
              />
            </label>

            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value as 'all' | CardRarity)}
              aria-label="Filter deck by rarity"
              className="sm:col-span-3 min-h-[44px] px-3 py-2 rounded-md border border-[#232734] bg-[#151923] text-xs text-[#E6E2D8] focus:outline-none focus:border-[#C89B3C]"
            >
              <option value="all">All Rarities</option>
              <option value="starter">Starter</option>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
              <option value="mythic">Mythic</option>
              <option value="secret">Secret</option>
              <option value="curse">Curse</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'default' | 'cost' | 'name' | 'category')
              }
              aria-label="Sort deck cards"
              className="sm:col-span-3 min-h-[44px] px-3 py-2 rounded-md border border-[#232734] bg-[#151923] text-xs text-[#E6E2D8] focus:outline-none focus:border-[#C89B3C]"
            >
              <option value="default">Sort: Draw Order</option>
              <option value="cost">Sort: Energy Cost</option>
              <option value="category">Sort: Category</option>
              <option value="name">Sort: Name</option>
            </select>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#171B26] rounded-md border border-[#232734] overflow-x-auto touch-scroll-x">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer touch-manipulation ${
                  filter === f.id
                    ? 'bg-[#252B3B] text-[#F3EFE6]'
                    : 'text-[#9499A8] hover:text-[#E6E2D8]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {visibleCards.length === 0 ? (
            <div className="py-16 text-center text-sm text-[#9499A8]">
              {mode === 'upgrade'
                ? 'No upgradable cards match this filter.'
                : 'No cards match this filter.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 justify-items-center">
              {visibleCards.map((card) => (
                <CardView
                  key={card.uid}
                  card={card}
                  compact
                  playable
                  onClick={
                    mode !== 'view' && onSelectCard ? () => onSelectCard(card.uid) : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
