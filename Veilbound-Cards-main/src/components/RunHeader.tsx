import { BookOpen, Coins, Heart, Home, Settings, Sparkles } from 'lucide-react';
import { getCharacterDef } from '../data/characters';
import { RELICS } from '../data/relics';
import { getRegionDef } from '../data/regions';
import type { RunState } from '../types/game';

interface RunHeaderProps {
  run: RunState;
  onOpenDeck: () => void;
  onOpenSettings: () => void;
  onSaveAndExit: () => void;
}

export function RunHeader({
  run,
  onOpenDeck,
  onOpenSettings,
  onSaveAndExit,
}: RunHeaderProps) {
  const charDef = getCharacterDef(run.characterId);
  const regionDef = getRegionDef(run.regionId);

  return (
    <header className="w-full border-b border-[#232734] bg-[#0F1219] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm">
        <span className="font-display font-semibold text-[#F3EFE6] whitespace-nowrap">
          {charDef.name}
        </span>
        <span className="text-[#9499A8] hidden sm:inline">·</span>
        <span className="text-xs text-[#C89B3C] hidden sm:inline whitespace-nowrap">
          {regionDef.name}
        </span>

        <div className="flex items-center gap-1.5 text-rose-300 font-mono-tabular">
          <Heart className="w-4 h-4 text-rose-400" />
          <span>
            {run.hp}/{run.maxHp}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-amber-300 font-mono-tabular">
          <Coins className="w-4 h-4 text-[#C89B3C]" />
          <span>{run.gold}</span>
        </div>

        <div className="flex items-center gap-1.5 text-sky-300 font-mono-tabular">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span>+{run.earnedShards}</span>
        </div>

        <span className="text-[11px] text-[#7D8394] font-mono-tabular hidden md:inline">
          Seed {run.seed}
        </span>
      </div>

      {/* Relics + Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden lg:flex items-center gap-2 mr-2 text-xs text-[#A3A8B8]">
          {run.relics.map((id) => {
            const rel = RELICS[id];
            if (!rel) return null;
            return (
              <span
                key={id}
                title={`${rel.name}: ${rel.description}`}
                className="px-2 py-1 rounded border border-[#282D3C] bg-[#151923] text-[11px] text-[#E6E2D8] cursor-help"
              >
                {rel.name}
              </span>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onOpenDeck}
          className="min-h-[44px] px-3 py-1.5 rounded-md border border-[#2A2F3E] bg-[#161A25] hover:bg-[#1E2433] text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer touch-manipulation"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#C89B3C]" />
          <span className="tabular-nums">Deck ({run.deck.length})</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md border border-[#2A2F3E] bg-[#161A25] hover:bg-[#1E2433] text-[#B5B9C4] cursor-pointer touch-manipulation"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onSaveAndExit}
          className="min-h-[44px] px-3 py-1.5 rounded-md border border-[#2A2F3E] bg-[#161A25] hover:bg-[#1E2433] text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer touch-manipulation"
          title="Save & Return to Menu"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Menu</span>
        </button>
      </div>
    </header>
  );
}
