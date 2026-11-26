import {
  Compass,
  Crosshair,
  Flame,
  Shield,
  ShieldAlert,
  Skull,
  Sparkles,
  Swords,
  Users,
  Zap,
} from 'lucide-react';
import { getEffectiveCardDef, type CardPreviewInfo } from '../engine/combatEngine';
import type { AttackRangeType, CardCategory, CardInstance, CardRarity } from '../types/game';

interface CardViewProps {
  card: CardInstance;
  playable?: boolean;
  selected?: boolean;
  compact?: boolean;
  preview?: CardPreviewInfo;
  rampBonus?: number;
  onClick?: () => void;
}

const CATEGORY_META: Record<
  CardCategory,
  { label: string; accent: string; border: string; Icon: typeof Swords }
> = {
  attack: {
    label: 'Attack',
    accent: 'text-rose-400',
    border: 'border-rose-900/60 hover:border-rose-500/70',
    Icon: Swords,
  },
  defense: {
    label: 'Defense',
    accent: 'text-sky-400',
    border: 'border-sky-900/60 hover:border-sky-500/70',
    Icon: Shield,
  },
  skill: {
    label: 'Skill',
    accent: 'text-emerald-400',
    border: 'border-emerald-900/60 hover:border-emerald-500/70',
    Icon: Sparkles,
  },
  power: {
    label: 'Power',
    accent: 'text-violet-400',
    border: 'border-violet-900/60 hover:border-violet-500/70',
    Icon: Zap,
  },
  summoning: {
    label: 'Summon',
    accent: 'text-amber-400',
    border: 'border-amber-900/60 hover:border-amber-500/70',
    Icon: Users,
  },
  curse: {
    label: 'Curse',
    accent: 'text-zinc-400',
    border: 'border-zinc-700/80 hover:border-zinc-500',
    Icon: Skull,
  },
  ritual: {
    label: 'Ritual',
    accent: 'text-fuchsia-400',
    border: 'border-fuchsia-900/60 hover:border-fuchsia-500/70',
    Icon: Flame,
  },
  trap: {
    label: 'Trap',
    accent: 'text-orange-400',
    border: 'border-orange-900/60 hover:border-orange-500/70',
    Icon: Crosshair,
  },
  reaction: {
    label: 'Reaction',
    accent: 'text-cyan-400',
    border: 'border-cyan-900/60 hover:border-cyan-500/70',
    Icon: ShieldAlert,
  },
  stance: {
    label: 'Stance',
    accent: 'text-yellow-400',
    border: 'border-yellow-900/60 hover:border-yellow-500/70',
    Icon: Compass,
  },
};

const RANGE_LABELS: Record<AttackRangeType, string> = {
  melee: 'Melee',
  ranged: 'Ranged',
  magic: 'Magic',
  aoe: 'AoE',
};

function getRarityBorderOverride(rarity: CardRarity, fallback: string): string {
  switch (rarity) {
    case 'epic':
      return 'border-indigo-500/65 hover:border-indigo-400';
    case 'legendary':
      return 'border-amber-400/75 hover:border-amber-300';
    case 'mythic':
      return 'border-fuchsia-500/70 hover:border-fuchsia-400';
    case 'secret':
      return 'border-violet-400/75 hover:border-violet-300';
    default:
      return fallback;
  }
}

export function CardView({
  card,
  playable = true,
  selected = false,
  compact = false,
  preview,
  rampBonus = 0,
  onClick,
}: CardViewProps) {
  const eff = getEffectiveCardDef(card);
  const meta = CATEGORY_META[eff.category] ?? CATEGORY_META.skill;
  const Icon = meta.Icon;
  const cardBorderClass = getRarityBorderOverride(eff.rarity, meta.border);
  const effectiveRange = preview?.attackRange ?? eff.attackRange;
  const rangeText =
    eff.category === 'attack' && effectiveRange ? RANGE_LABELS[effectiveRange] : null;

  const hasLiveMod =
    preview &&
    ((preview.effectiveDamage !== null &&
      preview.baseDamage !== null &&
      preview.effectiveDamage !== preview.baseDamage) ||
      (preview.effectiveBlock !== null &&
        preview.baseBlock !== null &&
        preview.effectiveBlock !== preview.baseBlock) ||
      preview.willCrit ||
      preview.frontlineIntercepted);

  const highlightActive = Boolean(playable && (preview?.activeConditionMet || preview?.willCrit));

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick || !playable}
      className={`group relative flex flex-col justify-between text-left rounded-lg border transition-transform duration-150 touch-manipulation select-none focus-visible:outline-2 focus-visible:outline-[#C89B3C] ${
        compact ? 'w-36 sm:w-40 min-h-[172px] p-3' : 'w-40 sm:w-44 min-h-[198px] p-3.5'
      } ${
        selected
          ? 'bg-[#1B1F2A] border-[#C89B3C] -translate-y-2 shadow-lg shadow-black/60'
          : playable
          ? highlightActive
            ? 'bg-[#171A24] border-amber-500/80 hover:-translate-y-1.5 cursor-pointer shadow-md shadow-amber-950/30'
            : `bg-[#13161F] ${cardBorderClass} hover:-translate-y-1 cursor-pointer`
          : 'bg-[#101218] border-[#1F2330] opacity-50 cursor-not-allowed'
      }`}
    >
      {/* Top row: Cost + Title */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div
              className={`font-display text-xs sm:text-sm font-semibold leading-tight truncate ${
                card.upgraded ? 'text-[#EAB308]' : 'text-[#F3EFE6]'
              }`}
              title={eff.name}
            >
              {eff.name}
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-[#9499A8] truncate">
              <Icon className={`w-3 h-3 shrink-0 ${meta.accent}`} />
              <span>{meta.label}</span>
              {rangeText && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#CFCBC0]">{rangeText}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="capitalize">{eff.rarity}</span>
            </div>
          </div>

          <span
            className={`font-mono-tabular w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-sm font-semibold border ${
              playable
                ? 'bg-[#1E2330] border-[#C89B3C]/60 text-[#F5E6C4]'
                : 'bg-[#151821] border-[#262B3A] text-[#6E7485]'
            }`}
          >
            {eff.cost}
          </span>
        </div>

        {/* Hairline divider */}
        <div className="h-px bg-[#232734] mb-2" />

        {/* Rules prose */}
        <p className="text-xs text-[#CFCBC0] leading-relaxed">{eff.description}</p>
      </div>

      {/* Footer: Live Tactical Preview + Keywords */}
      <div className="pt-2 mt-2 border-t border-[#1E222E] space-y-1">
        {(hasLiveMod || preview?.activeConditionMet || rampBonus > 0) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono-tabular">
            {preview?.willCrit && preview.effectiveDamage !== null && (
              <span className="text-amber-300 font-semibold">
                Crit: {preview.effectiveDamage}
                {preview.hits > 1 ? `×${preview.hits}` : ''} dmg
              </span>
            )}
            {!preview?.willCrit &&
              preview?.effectiveDamage != null &&
              preview?.baseDamage != null &&
              preview.effectiveDamage !== preview.baseDamage && (
                <span
                  className={
                    preview.effectiveDamage > preview.baseDamage
                      ? 'text-emerald-300 font-semibold'
                      : 'text-rose-300 font-semibold'
                  }
                >
                  Net: {preview.effectiveDamage}
                  {preview.hits > 1 ? `×${preview.hits}` : ''} dmg
                </span>
              )}
            {preview?.effectiveBlock != null &&
              preview?.baseBlock != null &&
              preview.effectiveBlock !== preview.baseBlock && (
                <span
                  className={
                    preview.effectiveBlock > preview.baseBlock
                      ? 'text-sky-300 font-semibold'
                      : 'text-rose-300 font-semibold'
                  }
                >
                  Net: {preview.effectiveBlock} Blk
                </span>
              )}
            {preview?.frontlineIntercepted && (
              <span className="text-amber-300 font-medium">Guarded (-50% Melee)</span>
            )}
            {preview?.activeConditionMet && !preview.willCrit && !preview.frontlineIntercepted && (
              <span className="text-amber-300 font-medium">Bonus Ready</span>
            )}
            {rampBonus > 0 && <span className="text-emerald-300 font-medium">Ramp +{rampBonus}</span>}
          </div>
        )}

        {eff.keywords.length > 0 && (
          <div className="text-[10px] tracking-wide text-[#9A9484] capitalize">
            {eff.keywords.join(' · ')}
          </div>
        )}
      </div>
    </button>
  );
}
