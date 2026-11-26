# Veilbound: Ashen Crown — Phase 0 Design Preservation & Rebuild Brief

**Status:** Phase 0 — source analysis and design extraction  
**Rebuild branch:** `rebuild/veilbound-from-zero`  
**Reference branch:** `main` at `03c7756564eb597c4bd07c1acbc6d07fe91e48a8`  
**Scope:** Design analysis and planning only. No gameplay implementation is included in this phase.

---

## 1. Why this rebuild exists

The rebuild is a new implementation of the existing game, not a clone of its source code and not a replacement concept.

The old project is valuable because it contains a recognizable game identity, a large amount of designed content, and several interlocking systems. It is also a useful reference for understanding what the game was trying to achieve. The new implementation should be designed around those intentions, with a cleaner structure and clearer rules.

**The governing rule:** preserve the experience and the important design ideas; do not preserve old code, accidental complexity, bugs, or awkward implementation decisions merely for compatibility.

This document records what is confirmed by source inspection. Anything that still needs a real gameplay check is labelled accordingly rather than treated as proven.

## 2. The game's central identity

Veilbound is a dark-fantasy, single-player, turn-based roguelike deck-building adventure.

The player chooses a distinct hero, prepares for an expedition into a dangerous region, follows a branching route, fights tactical battles using a growing deck, makes risky or rewarding discoveries, defeats a regional boss, and brings persistent rewards and consequences back into a longer-term hub.

It is not just a sequence of card battles. The defining experience is the connection between:

1. **Hero identity** — different characters solve combat problems in different ways.
2. **Expedition decisions** — route choices trade safety, resources, discovery, and danger.
3. **Tactical combat** — card sequencing, enemy intent, status effects, positioning, and synergies matter.
4. **World identity** — regions, factions, events, and characters give expeditions context.
5. **Long-term progression** — unlocks, mastery, quests, discoveries, and world changes make later runs meaningfully different.

The rebuild should keep these five layers connected. If one layer becomes isolated or decorative, the game loses part of its identity.

## 3. Core gameplay loop

### Before an expedition
- Enter the main menu and access the Sanctuary or Bestiary.
- Choose a hero, region, difficulty, and optionally a custom seed or contract.
- Review the selected hero's strengths, weaknesses, starting deck, starting relic, and abilities.
- Start a new expedition with a generated route and a run-specific state.

### During an expedition
- View a branching map and choose from currently reachable locations.
- Encounter combat, elite threats, a boss, shops, rest sites, treasure, narrative events, shrines, libraries, camps, companion encounters, cursed altars, crossroads, and hidden routes.
- Fight when the selected node requires it; otherwise resolve its choice or reward.
- Gain or spend gold, acquire or remove cards, improve cards, collect relics, recruit or empower companions, and manage health.
- Carry deck changes, resources, discoveries, quest progress, and faction consequences forward through the run.
- Reach and defeat the region's boss to complete the expedition and potentially unlock further regions.

### After an expedition
- Resolve victory or defeat and bank the appropriate persistent rewards.
- Update hero records, quest progress, unlocks, world events, regional stability, and faction reputation.
- Spend Soul Shards on long-term character or region progression.
- Return to the Sanctuary and prepare another run.

**Design implication:** a run should feel like a journey with a beginning, a sequence of meaningful decisions, escalating danger, a climax, and consequences — not a disconnected set of random encounters.

## 4. Hero identity — seven distinct play styles

The inspected character definitions contain seven heroes. Each has a title, combat identity, preferred attack range, stats, advantages and disadvantages, passive ability, active ability, starting relic, starting deck, exclusive cards, personal quest, and a branching progression tree.

| Hero | Identity | Core play pattern to preserve |
|---|---|---|
| Vaelen — The Ashbound Knight | Melee Knight | Durable front-line fighter; Block and Burn reinforce each other; retaliation and Cinder Hound support |
| Morwen — The Blight Arcanist | Alchemist | Poison setup, rituals, card cycling, Ward, and summoned constructs |
| Kaelith — The Veil Stalker | Shadow Assassin | Fast card chains, low-cost/Echo plays, Bleed and Vulnerable burst |
| Sylvarin — The Thornwind Marksman | Ranger / Archer | Ranged precision, Marked targets, traps, and bypassing front-line protection |
| Vesperis — The Astral Pyromancer | Spellcaster | Magic damage, multi-target spells, delayed rituals, spell copying, and Energy generation |
| Orin — The Ironclad Bastion | Heavy Guardian | High durability, Block and Thorns, defensive scaling, and pulling protected enemies into reach |
| Nyx — The Hollow Weaver | Summoner / Controller | Companion manipulation, weakening formations, curses, and sacrificing summons for effects |

### Hero design rules for the rebuild
- A hero must change the player's decisions, not merely change statistics and artwork.
- Each hero needs a recognizable combat loop, a meaningful weakness, and a distinct set of card synergies.
- Passive and active abilities should reinforce the same identity without making the hero's deck choices irrelevant.
- Starting decks and relics should teach the hero's core mechanics.
- Personal quests should reveal character/world story while rewarding actual play.
- Progression should offer meaningful choices, including trade-offs or alternate paths, rather than only a long list of flat stat increases.

The seven identities are confirmed in source. Their precise balance and how satisfying they feel in live play still require gameplay testing.

## 5. Expedition and map identity

The existing map generator describes itself as a seeded, controlled procedural branching map. It builds a directed route structure, tracks reachability, supports hidden branches and secret-boss discovery, and uses region-specific encounter pools and weighted location selection.

The source defines **17 location types**:

1. Combat
2. Elite
3. Boss
4. Shop
5. Rest
6. Treasure
7. Event
8. Hidden Vault
9. Shrine
10. Library
11. Camp
12. Monster Den
13. Enemy Stronghold
14. Companion Encounter
15. Cursed Altar
16. Challenge
17. Crossroads

### What makes the map valuable
- The route is a strategic choice: players decide which risks and opportunities to accept.
- Different node types create varied pacing between battles.
- Region-specific pools make the same node type feel different in different places.
- Hidden branches reward exploration and map knowledge.
- Crossroads and discovery mechanics give players ways to reveal more of the route.
- The boss provides a clear expedition destination and climax.
- Seeded generation makes a run reproducible for debugging, sharing, and testing.

### Rebuild direction
Keep a branching route with readable paths, meaningful node previews, reachable-node rules, regional identity, secrets, and a boss destination. Rebuild the generator around explicit map constraints and testable rules. Do not copy the old generation algorithm line by line.

The map must avoid false choices: every displayed reachable route should be valid, the boss must be reachable, and hidden routes must obey clear reveal rules. Randomness should create variety within a designed structure, not produce arbitrary or impossible layouts.

## 6. Combat identity

The source contains a large, data-driven, turn-based combat engine. Its design goes beyond a simple Attack / Defend card loop.

### Confirmed combat concepts
- Energy-based card play, hand, draw pile, discard pile, and card exhaustion.
- Card categories including attacks, defense, skills, powers, summoning, curses, rituals, traps, and reactions.
- Card rarity, upgrades, keywords, conditional effects, triggers, and temporary transformations.
- Hero passive and active abilities with cooldowns and limited uses.
- Status effects including Burn, Poison, Bleed, Weak, Vulnerable, Frail, Strength, Ward, Thorns, Marked, and Ritual.
- Enemy intents that are shown to the player before they act.
- Enemy roles and tactical archetypes such as aggressor, guardian, support, controller, assassin, summoner, tactician, and boss.
- Multi-enemy encounters with ally support and enemy-specific mechanics.
- Frontline/backline positioning and protection, with melee, ranged, and magic attack ranges interacting differently with enemy formations.
- Stances that change the player's advantages and disadvantages.
- Traps, reactions, delayed rituals, companion actions, and event-driven effects.
- Boss phases and encounter modifiers.
- Structured combat visual events, allowing simulation logic to be separated from presentation.

### The strategic promise
A strong combat turn should involve decisions such as:
- Which enemy is the priority?
- Should the player build defense, attack immediately, or prepare a future turn?
- Which card sequence creates a synergy?
- Is a status effect worth applying now?
- Does the enemy's visible intent demand a response?
- Should a companion be summoned, triggered, or used as part of a combo?
- Does the player's range allow them to bypass or overcome enemy protection?
- Is it worth spending a limited hero ability now or saving it?

### Rebuild direction
Make combat rules explicit, deterministic where possible, and independently testable. Keep the separation between combat simulation and visual/audio presentation. Build a small but complete combat slice first, including player turn, enemy intent, enemy turn, status resolution, victory/defeat, and reward handoff. Expand the effect vocabulary only after that foundation is stable.

Do not start by implementing every old card effect at once. First define a coherent effect system and prove that it handles representative effects, interactions, and edge cases correctly.

## 7. Content inventory from the inspected source

The following counts are source-definition counts, not a claim that every entry has been individually play-tested or is perfectly balanced.

| Content | Inspected count | Notes |
|---|---:|---|
| Heroes | 7 | Distinct combat identities and progression |
| Regions | 7 | Three broad acts/tiers with branch regions and an apex region |
| Card definitions | 158 | Combined from the base, expanded shared, and newer-hero card modules; verify final registry composition during content audit |
| Enemy definitions | 33 | Includes ordinary enemies, elites/leaders, bosses, legendary and secret-boss roles |
| Relic definitions | 34 | Includes starter, common/uncommon/rare, faction and boss/secret rewards |
| Companion definitions | 8 | Summoned allies with timed actions/effects |
| Factions | 7 | Regional groups with rival/allied relationships |
| Expedition node types | 17 | See the full list above |
| Difficulty levels | 3 | Standard, Penance, Eclipse |

### Seven regions identified
- The Ashen Marches
- The Hollowwood
- The Sunken Reliquary
- The Drowned Kingdom
- The Shattered Highlands
- The Veiled Catacombs
- The Obsidian Spire

The region definitions include descriptions, encounter groups, boss groups, event pools, node weights, ambience themes, unlock relationships, and other region-specific settings.

### Content preservation policy
These definitions are an inventory and reference, not an automatic import list. Each card, enemy, relic, event, and other content entry should be reviewed for:
- whether it expresses a distinct and useful idea;
- whether its rules are understandable to the player;
- whether it creates interesting combinations or choices;
- whether it overlaps too much with another entry;
- whether its power level and acquisition timing are sensible;
- whether it fits its hero, region, faction, or world fiction.

The rebuild may redesign, combine, rename, rebalance, or remove weak/redundant entries when there is a clear design reason. Important hero identities, signature mechanics, and world concepts must not disappear silently.

## 8. Persistent world and long-term progression

The old game connects individual runs to a persistent world layer.

### Confirmed systems
- **Sanctuary:** a hub for character mastery, quests, unlocks, and world progression.
- **Soul Shards:** a persistent currency used for longer-term unlocks and upgrades.
- **Character progression trees:** hero-specific nodes with prerequisites, exclusive branches, and gameplay bonuses.
- **Personal quests:** multi-stage objectives tied to each hero, with lore and unlock rewards.
- **Faction reputation:** reputation changes can influence allied and rival factions.
- **Faction standing:** reputation is translated into standing tiers.
- **Contracts:** optional run objectives with conditions and rewards.
- **World events:** events can alter region conditions, enemy strength, shop pricing, or rewards for a limited number of expeditions.
- **Regional stability and chronicle:** run outcomes can affect the state and recorded history of the world.
- **Bestiary and discoveries:** persistent records and secrets give exploration a longer-term purpose.
- **Region and character unlocks:** successful expeditions can open additional content.

### Rebuild direction
Keep the sense that the world remembers the player's actions. Persistent systems should have visible consequences, be understandable, and avoid becoming a collection of disconnected counters. A faction change should matter in a way the player can see; a world event should affect the next relevant expedition; a hero quest should progress through natural play.

Persistence needs a versioned schema, safe migrations, backup/recovery behaviour, and explicit separation between permanent profile state and temporary run/combat state. Old save compatibility is not assumed unless separately requested; the new save format should be designed deliberately.

## 9. Presentation and player experience

The inspected UI and audio modules show several presentation intentions:
- Dark, atmospheric fantasy visual language with region-specific backdrops and colour identities.
- A dedicated character/region/difficulty/contract selection flow.
- A route map that communicates node type, danger, reward preview, reachability, and hidden routes.
- Card-focused tactical combat with enemy intent and status information.
- Dedicated views for shops, rests, events, rewards, treasure, and other locations.
- A Sanctuary for progression and a Bestiary for discoveries.
- Procedural Web Audio for sound effects, music states, and regional ambience.
- Settings for volume, combat speed, animation speed, reduced motion, confirmation, and graphics quality.
- Responsive layout considerations and touch-friendly controls.

### Rebuild direction
Retain the dark-fantasy atmosphere and information-rich tactical readability, but design the interface around player priorities. Important information must be easy to scan: card cost and effect, enemy intent, target selection, status meanings, route risk, and reward consequences.

PC and mobile browsers are target platforms. Mobile support must be designed into layout, touch targets, orientation handling, performance, and save behaviour rather than added at the end. Actual device testing will still be required.

## 10. What should be rebuilt differently

The new project should not inherit the old source structure just because it exists. The following are architectural goals, not claims that the old game necessarily fails in every area.

1. **Clear system boundaries:** separate domain rules, content data, run orchestration, persistence, and rendering.
2. **One authoritative game state:** avoid duplicated or conflicting state between UI components and simulation.
3. **Pure simulation rules:** combat, map generation, rewards, and world transitions should be testable without rendering.
4. **Explicit effect resolution:** card/enemy effects should use a consistent rule model with validation and safe limits for chains/triggers.
5. **Content validation:** check references, prerequisites, reward pools, enemy groups, card effects, and unlock paths automatically.
6. **Deterministic randomness:** all gameplay randomness should be seeded and controllable in tests.
7. **Save safety:** validate loaded data, migrate versions, preserve recoverable backups, and handle interrupted runs.
8. **Presentation independence:** visual effects, animation timing, audio, and canvas rendering must not decide gameplay outcomes.
9. **Responsive input:** mouse, keyboard, touch, and small-screen layouts should be planned as first-class inputs.
10. **Incremental scope:** build and verify complete slices instead of creating a huge amount of unfinished content at once.

The rebuild should choose its technical stack and module layout in Phase 1. This document intentionally does not lock the project into a specific rendering framework before that decision is justified.

## 11. What we should not preserve automatically

- Old source code, component structure, state-management patterns, or engine implementation.
- Bugs, accidental balance problems, confusing descriptions, duplicate effects, and unused content.
- Features that exist in code but do not improve the player's experience.
- Complexity that cannot be explained to a player or maintained by the project.
- Assumptions that a successful TypeScript build means the game is fun or fully functional.

The old implementation is a reference. It is not the specification when its actual behaviour conflicts with the intended design.

## 12. Rebuild roadmap after Phase 0

| Phase | Goal | Completion evidence |
|---|---|---|
| 0 — Design preservation | Understand the original game and establish what must survive | This document reviewed; unresolved questions and content audit recorded |
| 1 — New foundation | Choose stack and create a clean project architecture, app shell, state model, input, and save foundation | Clean build, architecture tests, responsive shell, save round-trip and migration tests |
| 2 — Expedition slice | Implement hero selection, one region, a deterministic branching map, and a small set of node types | Complete start-to-boss route using valid/reachable nodes |
| 3 — Combat slice | Implement a small set of representative cards, statuses, enemy intents, positioning, and one boss | Complete, repeatable combat encounter with automated rule tests |
| 4 — Run loop | Connect map, encounters, rewards, shops/rest/events, deck changes, and run completion | A full playable expedition from launch to result |
| 5 — Hero and content expansion | Add all hero identities, their signature systems, and reviewed card/enemy/relic/companion content | Content validation and hero-specific playtest checklist |
| 6 — World progression | Add Sanctuary, Soul Shards, quests, factions, contracts, events, region unlocks, and Bestiary | Persistent progression survives reloads and has visible effects |
| 7 — Presentation and release hardening | Art direction, animation, audio, mobile UX, performance, accessibility, and release checks | Browser/device test matrix and release checklist |

Phases may be split into smaller sub-phases. Do not advance merely because files have been created; advance when the acceptance evidence is met.

## 13. Open questions and verification still required

The following cannot be settled from static source inspection alone:
- Which combat interactions are fun, frustrating, too slow, or too easy?
- Are all seven heroes sufficiently distinct in actual play?
- Are all map node types valuable and properly paced?
- Are all card/enemy/relic entries used, balanced, and reachable through valid pools?
- Are all boss phases, hidden routes, secret encounters, and quest conditions achievable?
- How does the game perform and feel on real mobile browsers and lower-powered devices?
- Are all current art/audio assets still available, licensed/appropriate, and suitable for reuse?
- Which features are essential to the intended game and which are optional expansions?

These questions should be answered through targeted source audits and later playable prototypes. We should not guess.

## 14. Source areas inspected

Initial static review of the original `main` branch included:
- `Veilbound-Cards-main/src/App.tsx`
- `src/types/game.ts`
- `src/data/characters.ts`
- `src/data/cards.ts`
- `src/data/cardsExpandedShared.ts`
- `src/data/cardsNewHeroes.ts`
- `src/data/enemies.ts`
- `src/data/regions.ts`
- `src/data/relics.ts`
- `src/data/companions.ts`
- `src/data/factions.ts`
- `src/data/stances.ts`
- `src/engine/combatEngine.ts`
- `src/engine/enemyAI.ts`
- `src/engine/mapGenerator.ts`
- `src/engine/runManager.ts`
- `src/engine/worldManager.ts`
- `src/engine/saveManager.ts`
- `src/engine/audioEngine.ts`
- `src/components/CharacterSelect.tsx`
- `src/components/ExpeditionMapView.tsx`
- `src/components/BattleView.tsx`
- `src/components/SanctuaryView.tsx`

This is an initial design extraction, not yet a line-by-line audit of every content entry, asset, and runtime interaction.

---

## Phase 0 exit criteria

Phase 0 is ready for review when:
- [x] A separate rebuild branch exists.
- [x] The central game identity and core loop are documented.
- [x] The major gameplay systems and content families are inventoried.
- [x] The seven hero identities and seven regions are recorded.
- [x] Rebuild principles distinguish design preservation from code preservation.
- [x] A phased roadmap and evidence-based completion criteria are defined.
- [ ] The user reviews and approves the design-preservation brief.
- [ ] Any corrections or must-preserve features from the user are incorporated before Phase 1.

**No gameplay code should be written until the Phase 0 brief is reviewed.**
