import {
  ArrowRight,
  BookOpen,
  Coins,
  Compass,
  Flame,
  Gem,
  Hammer,
  Heart,
  Landmark,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Tent,
  Trash2,
  Users,
} from 'lucide-react';
import { CARDS } from '../data/cards';
import { getEventDef } from '../data/events';
import { getContractDef, getFactionDef, getRareEncounterDef } from '../data/factions';
import { RELICS } from '../data/relics';
import type {
  CardInstance,
  InteractiveLocationState,
  RewardState,
  RunState,
  ShopInventory,
} from '../types/game';
import { CardView } from './CardView';

// ============================================================================
// COMBAT REWARD VIEW
// ============================================================================
export function RewardView({
  reward,
  onPickCard,
  onSkipCard,
  onClaimRelic,
  onContinue,
}: {
  reward: RewardState;
  onPickCard: (card: CardInstance) => void;
  onSkipCard: () => void;
  onClaimRelic: () => void;
  onContinue: () => void;
}) {
  const relic = reward.relicId ? RELICS[reward.relicId] : null;

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-lg border border-[#232734] bg-[#11141C] p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#232734] pb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#F3EFE6]">
              {reward.isBossReward
                ? 'Guardian Vanquished'
                : reward.sourceLabel ?? 'Spoils of Battle'}
            </h1>
            <p className="text-xs text-[#9499A8] mt-1">
              Claim your rewards before advancing along the route.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm font-mono-tabular">
            <span className="text-amber-300 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-[#C89B3C]" />+{reward.gold} Gold
            </span>
            <span className="text-sky-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-sky-400" />+{reward.shards} Shards
            </span>
            {reward.reputationDelta && (
              <span
                className={
                  reward.reputationDelta.amount >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }
              >
                {reward.reputationDelta.amount >= 0 ? '+' : ''}
                {reward.reputationDelta.amount}{' '}
                {getFactionDef(reward.reputationDelta.factionId).shortName} Standing
              </span>
            )}
          </div>
        </div>

        {/* Relic drop */}
        {relic && (
          <div className="p-4 rounded-lg border border-[#2B3142] bg-[#161A25] flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-[#C89B3C] font-medium">Relic Discovered</div>
              <div className="font-display text-base font-semibold text-[#F3EFE6]">
                {relic.name}
              </div>
              <div className="text-xs text-[#B5B9C4] mt-0.5">{relic.description}</div>
            </div>
            {reward.relicPicked ? (
              <span className="text-xs text-emerald-400 font-medium">Claimed</span>
            ) : (
              <button
                type="button"
                onClick={onClaimRelic}
                className="min-h-[40px] px-4 py-2 rounded-md bg-[#C89B3C] hover:bg-[#D8AD4E] text-[#0B0C10] text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                Claim Relic
              </button>
            )}
          </div>
        )}

        {/* Card Choice */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#E6E2D8]">
              {reward.cardPicked ? 'Card Added to Deck' : 'Add 1 Card to Your Deck'}
            </h2>
            {!reward.cardPicked && (
              <button
                type="button"
                onClick={onSkipCard}
                className="text-xs text-[#9499A8] hover:text-[#E6E2D8] underline cursor-pointer"
              >
                Skip Card (+15 Gold)
              </button>
            )}
          </div>

          {!reward.cardPicked && (
            <div className="flex flex-wrap justify-center gap-4 pt-1">
              {reward.cardChoices.map((card) => (
                <CardView
                  key={card.uid}
                  card={card}
                  playable
                  onClick={() => onPickCard(card)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-[#232734] flex justify-end">
          <button
            type="button"
            onClick={onContinue}
            className="min-h-[44px] px-6 py-2.5 rounded-md bg-[#C89B3C] hover:bg-[#D8AD4E] text-[#0B0C10] text-sm font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <span>{reward.isBossReward ? 'Complete Expedition' : 'Return to Map'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MERCHANT SHOP VIEW
// ============================================================================
export function ShopView({
  run,
  shop,
  onBuyCard,
  onBuyRelic,
  onBuyHeal,
  onOpenRemoveModal,
  onLeave,
}: {
  run: RunState;
  shop: ShopInventory;
  onBuyCard: (index: number) => void;
  onBuyRelic: () => void;
  onBuyHeal: () => void;
  onOpenRemoveModal: () => void;
  onLeave: () => void;
}) {
  const relicDef = shop.relic ? RELICS[shop.relic.relicId] : null;

  return (
    <div className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#232734] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#C89B3C]">
            <ShoppingBag className="w-4 h-4" />
            <span>
              Wayfarer Merchant
              {shop.factionDiscountLabel ? ` · ${shop.factionDiscountLabel}` : ''}
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#F3EFE6] mt-0.5">
            Veilbound Curios &amp; Supplies
          </h1>
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="min-h-[42px] px-5 py-2 rounded-md bg-[#C89B3C] hover:bg-[#D8AD4E] text-[#0B0C10] text-sm font-semibold cursor-pointer whitespace-nowrap"
        >
          Leave Shop
        </button>
      </div>

      {/* Cards for Sale */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[#E6E2D8]">Tomes &amp; Techniques</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 justify-items-center">
          {shop.cards.map((slot, idx) => {
            const canAfford = run.gold >= slot.price && !slot.sold;
            return (
              <div key={`${slot.cardId}_${idx}`} className="flex flex-col items-center gap-2">
                <CardView
                  card={{ uid: `shop_${idx}`, defId: slot.cardId, upgraded: slot.upgraded }}
                  playable={!slot.sold}
                />
                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => onBuyCard(idx)}
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-md bg-[#191E2B] hover:bg-[#232A3C] border border-[#2F364A] disabled:opacity-45 text-xs font-mono-tabular font-semibold text-[#F5E6C4] cursor-pointer disabled:cursor-not-allowed"
                >
                  {slot.sold ? 'Sold' : `${slot.price} Gold`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Relic & Services */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#232734]">
        {shop.relic && relicDef && (
          <div className="rounded-lg border border-[#232734] bg-[#11141C] p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs text-[#C89B3C]">Relic</div>
              <div className="font-display text-base font-semibold text-[#F3EFE6]">
                {relicDef.name}
              </div>
              <p className="text-xs text-[#9499A8] mt-1">{relicDef.description}</p>
            </div>
            <button
              type="button"
              disabled={shop.relic.sold || run.gold < shop.relic.price}
              onClick={onBuyRelic}
              className="min-h-[40px] px-4 py-2 rounded-md bg-[#C89B3C] disabled:bg-[#232734] disabled:text-[#6E7485] text-[#0B0C10] text-xs font-semibold font-mono-tabular cursor-pointer disabled:cursor-not-allowed"
            >
              {shop.relic.sold ? 'Purchased' : `Buy (${shop.relic.price} Gold)`}
            </button>
          </div>
        )}

        <div className="rounded-lg border border-[#232734] bg-[#11141C] p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="text-xs text-emerald-400 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5" />
              <span>Apothecary Draught</span>
            </div>
            <div className="font-display text-base font-semibold text-[#F3EFE6] mt-0.5">
              Restore 22 HP
            </div>
            <p className="text-xs text-[#9499A8] mt-1">
              Mend wounds before the next encounter.
            </p>
          </div>
          <button
            type="button"
            disabled={shop.healUsed || run.gold < shop.healPrice || run.hp >= run.maxHp}
            onClick={onBuyHeal}
            className="min-h-[40px] px-4 py-2 rounded-md border border-[#2F364A] bg-[#191E2B] hover:bg-[#232A3C] disabled:opacity-45 text-xs font-semibold font-mono-tabular cursor-pointer disabled:cursor-not-allowed"
          >
            {shop.healUsed ? 'Used' : `Heal (${shop.healPrice} Gold)`}
          </button>
        </div>

        <div className="rounded-lg border border-[#232734] bg-[#11141C] p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="text-xs text-rose-400 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Card Purge</span>
            </div>
            <div className="font-display text-base font-semibold text-[#F3EFE6] mt-0.5">
              Remove 1 Card
            </div>
            <p className="text-xs text-[#9499A8] mt-1">
              Permanently purge a weak card or Curse from your deck.
            </p>
          </div>
          <button
            type="button"
            disabled={shop.removeUsed || run.gold < shop.removeCardPrice || run.deck.length <= 5}
            onClick={onOpenRemoveModal}
            className="min-h-[40px] px-4 py-2 rounded-md border border-[#2F364A] bg-[#191E2B] hover:bg-[#232A3C] disabled:opacity-45 text-xs font-semibold font-mono-tabular cursor-pointer disabled:cursor-not-allowed"
          >
            {shop.removeUsed ? 'Purged' : `Purge (${shop.removeCardPrice} Gold)`}
          </button>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// REST SITE VIEW
// ============================================================================
export function RestView({
  run,
  onHeal,
  onOpenUpgradeModal,
  onMeditate,
}: {
  run: RunState;
  onHeal: () => void;
  onOpenUpgradeModal: () => void;
  onMeditate: () => void;
}) {
  const healAmt = Math.max(12, Math.round(run.maxHp * 0.3));
  const hasUpgradable = run.deck.some((c) => !c.upgraded && CARDS[c.defId]?.upgraded);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-lg border border-[#232734] bg-[#11141C] p-6 sm:p-8 space-y-6">
        <div>
          <div className="text-xs text-[#C89B3C] font-medium">Sanctum Campfire</div>
          <h1 className="font-display text-2xl font-bold text-[#F3EFE6] mt-0.5">
            Moment of Respite
          </h1>
          <p className="text-sm text-[#9499A8] mt-1">
            A sheltered brazier burns quietly amidst the stone ruins. Choose one preparation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={onHeal}
            className="p-5 rounded-lg border border-[#282E3E] bg-[#161A25] hover:border-[#C89B3C] text-left space-y-2 cursor-pointer transition-colors"
          >
            <Flame className="w-6 h-6 text-rose-400" />
            <div className="font-display text-base font-semibold text-[#F3EFE6]">Rest</div>
            <p className="text-xs text-[#9499A8] leading-relaxed">
              Restore <span className="text-emerald-400 font-semibold">{healAmt} HP</span> (30% Max HP).
            </p>
          </button>

          <button
            type="button"
            disabled={!hasUpgradable}
            onClick={onOpenUpgradeModal}
            className="p-5 rounded-lg border border-[#282E3E] bg-[#161A25] hover:border-[#C89B3C] disabled:opacity-45 text-left space-y-2 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            <Hammer className="w-6 h-6 text-[#C89B3C]" />
            <div className="font-display text-base font-semibold text-[#F3EFE6]">Temper Card</div>
            <p className="text-xs text-[#9499A8] leading-relaxed">
              Upgrade any card in your deck for increased potency or lower cost.
            </p>
          </button>

          <button
            type="button"
            onClick={onMeditate}
            className="p-5 rounded-lg border border-[#282E3E] bg-[#161A25] hover:border-[#C89B3C] text-left space-y-2 cursor-pointer transition-colors"
          >
            <Sparkles className="w-6 h-6 text-sky-400" />
            <div className="font-display text-base font-semibold text-[#F3EFE6]">Attune Shards</div>
            <p className="text-xs text-[#9499A8] leading-relaxed">
              Gather <span className="text-sky-300 font-semibold">+12 Soul Shards</span> for permanent Sanctuary unlocks.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EVENT VIEW
// ============================================================================
export function EventView({
  run,
  eventId,
  resultSummary,
  onSelectChoice,
  onContinue,
}: {
  run: RunState;
  eventId: string;
  resultSummary?: string;
  onSelectChoice: (choiceId: string) => void;
  onContinue: () => void;
}) {
  const ev = getEventDef(eventId);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-lg border border-[#232734] bg-[#11141C] p-6 sm:p-8 space-y-6">
        <div>
          <div className="text-xs text-[#C89B3C] font-medium">
            {ev.isSecret ? 'Secret Discovery' : ev.isRare ? 'Rare Encounter' : 'Expedition Event'}
          </div>
          <h1 className="font-display text-2xl font-bold text-[#F3EFE6] mt-1">{ev.title}</h1>
          <p className="text-sm text-[#CFCBC0] mt-3 leading-relaxed">{ev.description}</p>
        </div>

        {resultSummary ? (
          <div className="space-y-5 pt-3 border-t border-[#232734]">
            <p className="text-sm text-emerald-300 leading-relaxed">{resultSummary}</p>
            <button
              type="button"
              onClick={onContinue}
              className="min-h-[44px] px-6 py-2.5 rounded-md bg-[#C89B3C] hover:bg-[#D8AD4E] text-[#0B0C10] text-sm font-semibold cursor-pointer"
            >
              Continue Expedition
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 pt-2">
            {ev.choices.map((ch) => {
              const wrongChar =
                ch.requiresCharacterId && ch.requiresCharacterId !== run.characterId;
              const missingCat =
                ch.requiresCardCategory &&
                !run.deck.some((c) => CARDS[c.defId]?.category === ch.requiresCardCategory);
              const lowGold = ch.requiresMinGold && run.gold < ch.requiresMinGold;
              const lowHp = ch.requiresMinHp && run.hp < ch.requiresMinHp;
              const disabled = Boolean(wrongChar || missingCat || lowGold || lowHp);

              return (
                <button
                  key={ch.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectChoice(ch.id)}
                  className="w-full p-4 rounded-lg border border-[#2A3040] bg-[#161A25] hover:border-[#C89B3C] disabled:opacity-45 text-left transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <div className="text-sm font-semibold text-[#F3EFE6]">{ch.label}</div>
                  <div className="text-xs text-[#9499A8] mt-1">{ch.outcomeHint}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TREASURE / HIDDEN VAULT VIEW
// ============================================================================
export function TreasureView({
  isHiddenVault,
  goldAmount,
  shardAmount,
  relicId,
  onContinue,
}: {
  isHiddenVault: boolean;
  goldAmount: number;
  shardAmount: number;
  relicId?: string;
  onContinue: () => void;
}) {
  const relic = relicId ? RELICS[relicId] : null;
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-lg border border-[#2A3040] bg-[#11141C] p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2 text-xs text-[#C89B3C]">
          <Gem className="w-4 h-4" />
          <span>{isHiddenVault ? 'Hidden Vault Discovered' : 'Treasure Cache'}</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-[#F3EFE6]">
          {isHiddenVault ? 'Secret Reliquary Stash' : 'Ironbound Chest'}
        </h1>
        <p className="text-sm text-[#B5B9C4] leading-relaxed">
          {isHiddenVault
            ? 'Your hidden trail leads to an untouched chamber brimming with ancient shards.'
            : 'Inside the rusted coffer rest coins and a preserved artifact.'}
        </p>

        <div className="p-4 rounded-md border border-[#232734] bg-[#161A25] space-y-2 text-sm">
          <div className="font-mono-tabular text-amber-300">+{goldAmount} Gold</div>
          {shardAmount > 0 && (
            <div className="font-mono-tabular text-sky-300">+{shardAmount} Soul Shards</div>
          )}
          {relic && (
            <div className="pt-2 border-t border-[#232734]">
              <div className="font-display font-semibold text-[#F3EFE6]">{relic.name}</div>
              <div className="text-xs text-[#9499A8]">{relic.description}</div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="min-h-[44px] px-6 py-2.5 rounded-md bg-[#C89B3C] hover:bg-[#D8AD4E] text-[#0B0C10] text-sm font-semibold cursor-pointer"
        >
          Collect &amp; Continue
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// RUN END SUMMARY VIEW
// ============================================================================
export function RunEndView({
  victory,
  run,
  bankedShards,
  onReturnSanctuary,
  onReturnMenu,
}: {
  victory: boolean;
  run: RunState;
  bankedShards: number;
  onReturnSanctuary: () => void;
  onReturnMenu: () => void;
}) {
  return (
    <div className="min-h-[100dvh] bg-[#0B0C10] flex items-center justify-center p-6 pb-safe">
      <div className="w-full max-w-xl rounded-lg border border-[#2A2F3E] bg-[#11141C] p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[#C89B3C]">
            {victory ? <Sparkles className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4 text-rose-400" />}
            <span>{victory ? 'Expedition Conquered' : 'Expedition Fallen'}</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-[#F3EFE6]">
            {victory ? 'Victory at the Apex' : 'Claimed by the Veil'}
          </h1>
          <p className="text-sm text-[#B5B9C4] leading-relaxed">
            {victory
              ? 'You vanquished the Region Boss and carried your relics back to the Sanctuary.'
              : 'Your run deck and gold have dissolved, yet every Soul Shard and discovery remains yours forever.'}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#232734] text-center">
          <div className="p-3 rounded bg-[#161A25]">
            <div className="text-[11px] text-[#9499A8]">Soul Shards</div>
            <div className="font-mono-tabular text-lg font-bold text-sky-300">+{bankedShards}</div>
          </div>
          <div className="p-3 rounded bg-[#161A25]">
            <div className="text-[11px] text-[#9499A8]">Nodes</div>
            <div className="font-mono-tabular text-lg font-bold text-[#F3EFE6]">{run.nodesCleared}</div>
          </div>
          <div className="p-3 rounded bg-[#161A25]">
            <div className="text-[11px] text-[#9499A8]">Foes Slain</div>
            <div className="font-mono-tabular text-lg font-bold text-[#F3EFE6]">{run.enemiesDefeated}</div>
          </div>
          <div className="p-3 rounded bg-[#161A25]">
            <div className="text-[11px] text-[#9499A8]">Turns</div>
            <div className="font-mono-tabular text-lg font-bold text-[#F3EFE6]">{run.turnsTakenTotal}</div>
          </div>
        </div>

        {(run.activeContract ||
          (run.legendariesDefeatedThisRun?.length ?? 0) > 0 ||
          (run.secretBossesDefeatedThisRun?.length ?? 0) > 0) && (
          <div className="rounded-md border border-[#232734] bg-[#161A25] p-3.5 space-y-1.5 text-xs">
            {run.activeContract && (() => {
              const cDef = getContractDef(run.activeContract.contractId);
              if (!cDef) return null;
              return (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#CFCBC0]">Contract: {cDef.title}</span>
                  <span
                    className={
                      run.activeContract.completed
                        ? 'text-emerald-400 font-semibold'
                        : 'text-rose-400 font-semibold'
                    }
                  >
                    {run.activeContract.completed
                      ? `Fulfilled (+${cDef.rewardShards}S)`
                      : run.activeContract.failed
                      ? 'Failed'
                      : 'Unfinished'}
                  </span>
                </div>
              );
            })()}
            {(run.legendariesDefeatedThisRun?.length ?? 0) > 0 && (
              <div className="text-amber-300 font-mono-tabular">
                Legendary Creatures Vanquished: {run.legendariesDefeatedThisRun?.length}
              </div>
            )}
            {(run.secretBossesDefeatedThisRun?.length ?? 0) > 0 && (
              <div className="text-violet-300 font-mono-tabular">
                Secret Bosses Vanquished: {run.secretBossesDefeatedThisRun?.length}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={onReturnSanctuary}
            className="min-h-[44px] px-5 py-2.5 rounded-md bg-[#C89B3C] hover:bg-[#D8AD4E] text-[#0B0C10] text-sm font-semibold cursor-pointer"
          >
            Visit Sanctuary
          </button>
          <button
            type="button"
            onClick={onReturnMenu}
            className="min-h-[44px] px-5 py-2.5 rounded-md border border-[#2F364A] bg-[#161A25] hover:bg-[#1E2433] text-[#E6E2D8] text-sm font-medium cursor-pointer"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INTERACTIVE SPECIAL LOCATIONS (Shrine, Library, Camp, Companion, Altar, Crossroads, Rare)
// ============================================================================
export function InteractiveLocationView({
  run,
  location,
  onSelectChoice,
  onContinue,
}: {
  run: RunState;
  location: InteractiveLocationState;
  onSelectChoice: (choiceId: string) => void;
  onContinue: () => void;
}) {
  const iconMap = {
    shrine: Sparkles,
    library: BookOpen,
    camp: Tent,
    companion: Users,
    cursed_altar: Landmark,
    crossroads: Compass,
    rare_encounter: Compass,
  } as const;
  const Icon = iconMap[location.type];

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-lg border border-[#232734] bg-[#11141C] p-6 sm:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#C89B3C] font-medium">
            <Icon className="w-4 h-4" />
            <span>{location.subtitle}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F3EFE6] mt-1">
            {location.title}
          </h1>
          <p className="text-sm text-[#CFCBC0] mt-2 leading-relaxed">{location.description}</p>
        </div>

        {location.resolvedSummary ? (
          <div className="space-y-5 pt-4 border-t border-[#232734]">
            <p className="text-sm text-emerald-300 leading-relaxed">{location.resolvedSummary}</p>
            <button
              type="button"
              onClick={onContinue}
              className="min-h-[44px] px-6 py-2.5 rounded-md bg-[#C89B3C] hover:bg-[#D8AD4E] text-[#0B0C10] text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <span>Continue Expedition</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-5 pt-2 border-t border-[#232734]">
            {/* Library: Card Tome Picks */}
            {location.type === 'library' && (
              <>
                {location.offeredCardIds && location.offeredCardIds.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="text-xs font-semibold text-[#E6E2D8]">
                      Transcribe One Treatise Into Your Deck
                    </div>
                    <div className="flex flex-wrap justify-center gap-4">
                      {location.offeredCardIds.map((cardId) => (
                        <CardView
                          key={cardId}
                          card={{ uid: `lib_${cardId}`, defId: cardId, upgraded: false }}
                          playable
                          onClick={() => onSelectChoice(`learn_${cardId}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onSelectChoice('study_upgrade')}
                    className="p-4 rounded-lg border border-[#2A3040] bg-[#161A25] hover:border-[#C89B3C] text-left cursor-pointer transition-colors"
                  >
                    <div className="text-sm font-semibold text-[#F3EFE6]">Annotate Diagrams</div>
                    <div className="text-xs text-[#9499A8] mt-1">
                      Upgrade a random card and recover +8 Soul Shards.
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectChoice('purge_scroll')}
                    className="p-4 rounded-lg border border-[#2A3040] bg-[#161A25] hover:border-[#C89B3C] text-left cursor-pointer transition-colors"
                  >
                    <div className="text-sm font-semibold text-[#F3EFE6]">Burn Outdated Scroll</div>
                    <div className="text-xs text-[#9499A8] mt-1">
                      Remove a Curse or starter Strike/Defend from your deck.
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* Shrine */}
            {location.type === 'shrine' && (
              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={run.hp <= 8}
                  onClick={() => onSelectChoice('blood_blessing')}
                  className="w-full p-4 rounded-lg border border-[#2A3040] bg-[#161A25] hover:border-[#C89B3C] disabled:opacity-45 text-left cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  <div className="text-sm font-semibold text-[#F3EFE6]">Offer Blood to the Basin</div>
                  <div className="text-xs text-[#9499A8] mt-1">
                    Pay 8 HP to claim a random Relic (or 60 Gold if none remain).
                  </div>
                </button>
                <button
                  type="button"
                  disabled={run.gold < 35}
                  onClick={() => onSelectChoice('vital_oath')}
                  className="w-full p-4 rounded-lg border border-[#2A3040] bg-[#161A25] hover:border-[#C89B3C] disabled:opacity-45 text-left cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  <div className="text-sm font-semibold text-[#F3EFE6]">Anoint Vital Oath</div>
                  <div className="text-xs text-[#9499A8] mt-1">
                    Spend 35 Gold to gain +10 Max HP and heal 10 HP.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectChoice('silent_purge')}
                  className="w-full p-4 rounded-lg border border-[#2A3040] bg-[#161A25] hover:border-[#C89B3C] text-left cursor-pointer transition-colors"
                >
                  <div className="text-sm font-semibold text-[#F3EFE6]">Purify in Silence</div>
                  <div className="text-xs text-[#9499A8] mt-1">
                    Remove a Curse or weak card from your deck (or heal 10 HP if lean).
                  </div>
                </button>
              </div>
            )}

            {/* Abandoned Camp */}
            {location.type === 'camp' && (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => onSelectChoice('scavenge_carefully')}
                  className="w-full p-4 rounded-lg border border-[#2A3040] bg-[#161A25] hover:border-[#C89B3C] text-left cursor-pointer transition-colors"
                >
                  <div className="text-sm font-semibold text-[#F3EFE6]">Careful Scavenge</div>
                  <div className="text-xs text-[#9499A8] mt-1">
                    Safely gather +30 Gold and restore +10 HP beside the warm coals.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectChoice('ransack_supplies')}
                  className="w-full p-4 rounded-lg border border-amber-700/50 bg-[#181622] hover:border-[#C89B3C] text-left cursor-pointer transition-colors"
                >
                  <div className="text-sm font-semibold text-amber-200">
                    Ransack Locked Packs (Risky)
                  </div>
                  <div className="text-xs text-[#9499A8] mt-1">
                    Gain +65 Gold and an uncommon/rare card — 45% chance scavengers ambush you
                    (40 Gold kept).
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectChoice('rest_embers')}
                  className="w-full p-4 rounded-lg border border-[#2A3040] bg-[#161A25] hover:border-[#C89B3C] text-left cursor-pointer transition-colors"
                >
                  <div className="text-sm font-semibold text-[#F3EFE6]">Rest by the Embers</div>
                  <div className="text-xs text-[#9499A8] mt-1">
                    Recover +18 HP without disturbing the crates.
                  </div>
                </button>
              </div>
            )}

            {/* Companion Encounter */}
            {location.type === 'companion' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                {location.offeredCompanionCardId && (
                  <div className="md:col-span-5 flex justify-center">
                    <CardView
                      card={{
                        uid: 'loc_companion',
                        defId: location.offeredCompanionCardId,
                        upgraded: false,
                      }}
                      playable
                      onClick={() => onSelectChoice('bind_companion')}
                    />
                  </div>
                )}
                <div className="md:col-span-7 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => onSelectChoice('bind_companion')}
                    className="w-full p-4 rounded-lg border border-[#2A3040] bg-[#161A25] hover:border-[#C89B3C] text-left cursor-pointer transition-colors"
                  >
                    <div className="text-sm font-semibold text-[#F3EFE6]">Bind Companion Pact</div>
                    <div className="text-xs text-[#9499A8] mt-1">
                      Add{' '}
                      {CARDS[location.offeredCompanionCardId ?? 'ossuary_construct']?.name ??
                        'Summon'}{' '}
                      to your deck.
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectChoice('attune_bond')}
                    className="w-full p-4 rounded-lg border border-[#2A3040] bg-[#161A25] hover:border-[#C89B3C] text-left cursor-pointer transition-colors"
                  >
                    <div className="text-sm font-semibold text-[#F3EFE6]">Attune Existing Bond</div>
                    <div className="text-xs text-[#9499A8] mt-1">
                      Upgrade a Summoning card &amp; +6 HP (or +12 Soul Shards &amp; +10 HP).
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectChoice('parting_token')}
                    className="w-full p-4 rounded-lg border border-[#2A3040] bg-[#161A25] hover:border-[#C89B3C] text-left cursor-pointer transition-colors"
                  >
                    <div className="text-sm font-semibold text-[#F3EFE6]">Accept Parting Token</div>
                    <div className="text-xs text-[#9499A8] mt-1">
                      Receive +25 Gold and +8 Soul Shards before parting ways.
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Cursed Altar */}
            {location.type === 'cursed_altar' && (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => onSelectChoice('dark_pact')}
                  className="w-full p-4 rounded-lg border border-fuchsia-900/60 bg-[#181320] hover:border-fuchsia-500 text-left cursor-pointer transition-colors"
                >
                  <div className="text-sm font-semibold text-fuchsia-200">Swear the Dark Pact</div>
                  <div className="text-xs text-[#9499A8] mt-1">
                    Claim a Relic and +45 Gold, but bind a Void Shackle (Curse) to your deck.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectChoice('forbidden_tome')}
                  className="w-full p-4 rounded-lg border border-fuchsia-900/60 bg-[#181320] hover:border-fuchsia-500 text-left cursor-pointer transition-colors"
                >
                  <div className="text-sm font-semibold text-fuchsia-200">
                    Read the Forbidden Tome
                  </div>
                  <div className="text-xs text-[#9499A8] mt-1">
                    Gain an upgraded Rare card and +15 Soul Shards, cursed with Eclipse Dread.
                  </div>
                </button>
                <button
                  type="button"
                  disabled={run.hp <= 6}
                  onClick={() => onSelectChoice('cleanse_altar')}
                  className="w-full p-4 rounded-lg border border-[#2A3040] bg-[#161A25] hover:border-[#C89B3C] disabled:opacity-45 text-left cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  <div className="text-sm font-semibold text-[#F3EFE6]">
                    Shatter the Obsidian Seal
                  </div>
                  <div className="text-xs text-[#9499A8] mt-1">
                    Pay 6 HP to purge a Curse or weak card from your deck (+12 Soul Shards).
                  </div>
                </button>
              </div>
            )}

            {/* Crossroads */}
            {location.type === 'crossroads' && (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => onSelectChoice('survey_secrets')}
                  className="w-full p-4 rounded-lg border border-[#C89B3C]/50 bg-[#161A25] hover:border-[#C89B3C] text-left cursor-pointer transition-colors"
                >
                  <div className="text-sm font-semibold text-[#F5E6C4]">
                    Chart Secret Branches ({location.revealedHiddenCount ?? 0} unrevealed)
                  </div>
                  <div className="text-xs text-[#9499A8] mt-1">
                    Reveal all Hidden Branches on your map, plus +25 Gold and +10 Soul Shards.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectChoice('forage_lookout')}
                  className="w-full p-4 rounded-lg border border-[#2A3040] bg-[#161A25] hover:border-[#C89B3C] text-left cursor-pointer transition-colors"
                >
                  <div className="text-sm font-semibold text-[#F3EFE6]">
                    Survey Horizon &amp; Rest
                  </div>
                  <div className="text-xs text-[#9499A8] mt-1">
                    Reveal all Hidden Branches on your map and restore +12 HP.
                  </div>
                </button>
              </div>
            )}

            {/* Rare Encounters */}
            {location.type === 'rare_encounter' && location.rareEncounterId && (
              <div className="space-y-2.5">
                {getRareEncounterDef(location.rareEncounterId).choices.map((ch) => {
                  const lowGold = Boolean(ch.requiresMinGold && run.gold < ch.requiresMinGold);
                  const lowHp = Boolean(ch.requiresMinHp && run.hp < ch.requiresMinHp);
                  const disabled = lowGold || lowHp;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelectChoice(ch.id)}
                      className="w-full p-4 rounded-lg border border-[#2A3040] bg-[#161A25] hover:border-[#C89B3C] disabled:opacity-45 text-left transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <div className="text-sm font-semibold text-[#F3EFE6]">{ch.label}</div>
                      <div className="text-xs text-[#9499A8] mt-1">{ch.outcomeHint}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
