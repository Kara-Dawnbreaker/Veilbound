import type { StanceId } from '../types/game';

export interface StanceDef {
  id: StanceId;
  name: string;
  advantage: string;
  disadvantage: string;
  accentColor: string;
  badgeClass: string;
}

export const STANCES: Record<StanceId, StanceDef> = {
  neutral: {
    id: 'neutral',
    name: 'Balanced',
    advantage: 'No active stance modifiers.',
    disadvantage: 'None.',
    accentColor: '#9499A8',
    badgeClass: 'border-[#2E3446] bg-[#151923] text-[#9499A8]',
  },
  bulwark: {
    id: 'bulwark',
    name: 'Iron Bulwark',
    advantage: '+3 bonus Block on Block gains and +2 Thorns each turn start.',
    disadvantage: 'Attack cards deal 20% less damage.',
    accentColor: '#38BDF8',
    badgeClass: 'border-sky-500/60 bg-sky-950/40 text-sky-300',
  },
  wrath: {
    id: 'wrath',
    name: 'Ashen Wrath',
    advantage: 'Attack cards deal +35% damage and inflict +1 Burn on hit.',
    disadvantage: 'You take +25% damage from enemy attacks.',
    accentColor: '#F97316',
    badgeClass: 'border-orange-500/60 bg-orange-950/40 text-orange-300',
  },
  eclipse: {
    id: 'eclipse',
    name: 'Veil Step',
    advantage: 'Attacks apply +1 Bleed; every 3rd card played draws 1 card.',
    disadvantage: 'Block gained from cards is reduced by 25%.',
    accentColor: '#A855F7',
    badgeClass: 'border-violet-500/60 bg-violet-950/40 text-violet-300',
  },
  alchemical: {
    id: 'alchemical',
    name: 'Blight Focus',
    advantage: 'Poison & Burn applied +1 stack; enemy Poison does not decay.',
    disadvantage: 'Lose 2 HP at the end of each player turn.',
    accentColor: '#10B981',
    badgeClass: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300',
  },
};

export function getStanceDef(id: StanceId): StanceDef {
  return STANCES[id] ?? STANCES.neutral;
}
