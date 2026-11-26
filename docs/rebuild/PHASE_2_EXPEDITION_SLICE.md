# Veilbound: Ashen Crown — Phase 2 Expedition Slice

**Branch:** `rebuild/veilbound-from-zero`  
**Scope:** First complete expedition foundation: hero selection data, one region, seeded branching route, and reachable-node rules.

## Scope

Phase 2 follows the approved Phase 0 roadmap. It establishes:
- Seven selectable hero identities, preserving their original archetypes and core play patterns.
- The Ashen Marches as the first playable region.
- A deterministic seeded route with start, combat, elite, event, rest, treasure, and boss nodes.
- Explicit forward-only graph edges and direct reachable-node lookup.
- A validated expedition state that records the selected hero, region, difficulty, seed, current node, visited nodes, and run status.

## Architecture

All Phase 2 rules live in `src/domain/expedition/`. They are pure TypeScript and do not depend on React, browser APIs, persistence, or rendering. The UI will consume these contracts in the next Phase 2 slice.

## Acceptance gates

- [ ] Every hero and region ID is validated.
- [ ] The same seed always produces the same route.
- [ ] Every generated node is reachable from the start.
- [ ] The boss is reachable and is the terminal row.
- [ ] All graph edges move forward; no dangling links or duplicate node IDs.
- [ ] Invalid hero/region selections fail with explicit errors.
- [ ] Automated tests pass and the production build succeeds.
- [ ] Hero selection and route are exposed through a playable UI flow.

## Deliberate non-goals

Combat, card resolution, rewards, shops, event choices, persistent run recovery, all seven regions, and full content registries belong to later phases. This phase must not pretend that placeholder nodes are already playable encounters.
