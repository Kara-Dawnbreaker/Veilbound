import type { HeroDefinition, HeroId } from './types';

export const HEROES: readonly HeroDefinition[] = [
  { id: 'vaelen', name: 'Vaelen', title: 'The Ashbound Knight', archetype: 'Melee Knight', summary: 'A durable frontline fighter who turns defence into burning retaliation.', strengths: ['Block and Burn synergy', 'Reliable durability'], weakness: 'Slower setup and limited reach.', startingHealth: 76, startingEnergy: 3 },
  { id: 'morwen', name: 'Morwen', title: 'The Blight Arcanist', archetype: 'Alchemist', summary: 'Builds poison and ritual effects, then controls the pace of a battle.', strengths: ['Poison pressure', 'Card cycling and Ward'], weakness: 'Damage often needs time to build.', startingHealth: 64, startingEnergy: 3 },
  { id: 'kaelith', name: 'Kaelith', title: 'The Veil Stalker', archetype: 'Shadow Assassin', summary: 'Chains quick actions into precise bursts against vulnerable targets.', strengths: ['Low-cost card chains', 'Bleed and Vulnerable'], weakness: 'Punished when combos are interrupted.', startingHealth: 62, startingEnergy: 3 },
  { id: 'sylvarin', name: 'Sylvarin', title: 'The Thornwind Marksman', archetype: 'Ranger', summary: 'Marks priority targets and attacks from a safer distance.', strengths: ['Ranged precision', 'Trap preparation'], weakness: 'Less comfortable when surrounded.', startingHealth: 66, startingEnergy: 3 },
  { id: 'vesperis', name: 'Vesperis', title: 'The Astral Pyromancer', archetype: 'Spellcaster', summary: 'Uses powerful spells, delayed rituals and copied magic.', strengths: ['Magic damage', 'Multi-target spells'], weakness: 'Relies on careful energy planning.', startingHealth: 60, startingEnergy: 3 },
  { id: 'orin', name: 'Orin', title: 'The Ironclad Bastion', archetype: 'Heavy Guardian', summary: 'Absorbs pressure and punishes enemies who commit to attacking.', strengths: ['High durability', 'Block and Thorns'], weakness: 'Lower mobility and slower damage.', startingHealth: 84, startingEnergy: 3 },
  { id: 'nyx', name: 'Nyx', title: 'The Hollow Weaver', archetype: 'Summoner', summary: 'Controls enemy formations through summons, curses and sacrifice.', strengths: ['Companion synergies', 'Formation control'], weakness: 'Needs setup before summons reach full value.', startingHealth: 63, startingEnergy: 3 }
] as const;

export function getHero(heroId: string): HeroDefinition | undefined {
  return HEROES.find((hero) => hero.id === heroId);
}

export function isHeroId(value: string): value is HeroId {
  return HEROES.some((hero) => hero.id === value);
}
