import { BookOpen, Compass, Play, RotateCcw, Settings, Shield } from 'lucide-react';
import { TITLE_KEY_ART_URL } from '../assets/imageUrls';
import { getCharacterDef } from '../data/characters';
import { getRegionDef } from '../data/regions';
import type { SaveDataV1 } from '../types/game';
import { PWAInstallButton } from './PWAInstallButton';

interface MainMenuProps {
  save: SaveDataV1;
  onContinueRun: () => void;
  onNewExpedition: () => void;
  onOpenSanctuary: () => void;
  onOpenBestiary: () => void;
  onOpenSettings: () => void;
}

export function MainMenu({
  save,
  onContinueRun,
  onNewExpedition,
  onOpenSanctuary,
  onOpenBestiary,
  onOpenSettings,
}: MainMenuProps) {
  const activeRun = save.activeRun;
  const activeChar = activeRun ? getCharacterDef(activeRun.characterId) : null;
  const activeRegion = activeRun ? getRegionDef(activeRun.regionId) : null;

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col bg-[#0B0C10] overflow-hidden pb-safe">
      {/* Background Key Art with graceful CSS fallback */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B0C10] via-[#151821] to-[#0B0C10]">
        <img
          src={TITLE_KEY_ART_URL}
          alt="Ashen Crown Citadel"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-55"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0C10]/95 via-[#0B0C10]/70 to-[#0B0C10]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-transparent to-[#0B0C10]/70" />
      </div>

      {/* Top Navigation Bar (3-zone contract) */}
      <header className="relative z-10 flex items-center justify-between gap-8 px-6 sm:px-10 py-5 border-b border-white/10">
        <span className="font-display text-lg font-bold tracking-wide text-[#F3EFE6] whitespace-nowrap shrink-0">
          Veilbound
        </span>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#B5B9C4]">
          <button
            type="button"
            onClick={onNewExpedition}
            className="hover:text-[#F3EFE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Expeditions
          </button>
          <button
            type="button"
            onClick={onOpenSanctuary}
            className="hover:text-[#F3EFE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Sanctuary
          </button>
          <button
            type="button"
            onClick={onOpenBestiary}
            className="hover:text-[#F3EFE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Codex
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="hover:text-[#F3EFE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Settings
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={activeRun ? onContinueRun : onNewExpedition}
            className="min-h-[44px] px-4 py-2 rounded-md bg-[#C89B3C] hover:bg-[#D8AD4E] text-[#0B0C10] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer touch-manipulation"
          >
            {activeRun ? 'Resume Run' : 'Start Expedition'}
          </button>
        </div>
      </header>

      {/* Main Focal Hero */}
      <main className="relative z-10 flex-1 flex items-center px-6 sm:px-10 py-10 max-w-7xl w-full mx-auto">
        <div className="w-full max-w-xl space-y-7">
          <div className="space-y-3">
            <div className="text-xs font-medium tracking-wider text-[#C89B3C]">
              Dark Fantasy Roguelike Deck-Builder
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-[#F5F2EB] leading-[1.08] text-wrap-balance">
              Veilbound: Ashen Crown
            </h1>
            <p className="text-sm sm:text-base text-[#C4C7D0] leading-relaxed max-w-prose">
              Forge synergistic decks, summon bound companions, and traverse branching ruined realms
              in turn-based tactical combat. Permanent Soul Shards endure beyond every fallen expedition.
            </p>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {activeRun && activeChar && activeRegion && (
              <button
                type="button"
                onClick={onContinueRun}
                className="min-h-[48px] px-6 py-3 rounded-md bg-[#C89B3C] hover:bg-[#D8AD4E] text-[#0B0C10] text-sm font-semibold flex items-center justify-center gap-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer touch-manipulation"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Continue Run ({activeChar.name})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNewExpedition}
              className={`min-h-[48px] px-6 py-3 rounded-md text-sm font-semibold flex items-center justify-center gap-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer touch-manipulation ${
                activeRun
                  ? 'border border-[#343A4D] bg-[#13161F]/90 hover:bg-[#1B202D] text-[#F3EFE6]'
                  : 'bg-[#C89B3C] hover:bg-[#D8AD4E] text-[#0B0C10]'
              }`}
            >
              {activeRun ? <RotateCcw className="w-4 h-4" /> : <Compass className="w-4 h-4" />}
              <span>{activeRun ? 'New Expedition' : 'Begin Expedition'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenSanctuary}
              className="min-h-[48px] px-5 py-3 rounded-md border border-[#343A4D] bg-[#13161F]/85 hover:bg-[#1B202D] text-[#E6E2D8] text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer touch-manipulation"
            >
              <Shield className="w-4 h-4 text-[#C89B3C]" />
              <span>Sanctuary</span>
            </button>

            <button
              type="button"
              onClick={onOpenBestiary}
              className="min-h-[48px] px-5 py-3 rounded-md border border-[#343A4D] bg-[#13161F]/85 hover:bg-[#1B202D] text-[#E6E2D8] text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer touch-manipulation"
            >
              <BookOpen className="w-4 h-4 text-[#9499A8]" />
              <span>Bestiary &amp; Codex</span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="min-h-[48px] px-5 py-3 rounded-md border border-[#343A4D] bg-[#13161F]/85 hover:bg-[#1B202D] text-[#E6E2D8] text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer md:hidden touch-manipulation"
            >
              <Settings className="w-4 h-4 text-[#9499A8]" />
              <span>Settings</span>
            </button>

            <PWAInstallButton className="rounded-md min-h-[48px]" />
          </div>

          {/* Saved Progress Overview (clean unboxed metadata) */}
          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#A3A8B8] tabular-nums">
            <span>Soul Shards: {save.soulShards}</span>
            <span aria-hidden="true">·</span>
            <span>Expeditions: {save.totalRuns}</span>
            <span aria-hidden="true">·</span>
            <span>Victories: {save.totalVictories}</span>
            {activeRun && activeChar && activeRegion && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#EAB308]">
                  Active: {activeRegion.name} ({activeRun.hp}/{activeRun.maxHp} HP)
                </span>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
