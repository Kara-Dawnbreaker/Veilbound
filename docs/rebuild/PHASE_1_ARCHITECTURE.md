# Veilbound: Ashen Crown — Phase 1 Architecture

**Branch:** `rebuild/veilbound-from-zero`  
**Workspace:** `rebuild-app/`  
**Status:** Foundation implementation

## 1. Technology decisions

- **React + TypeScript:** responsive, accessible, component-driven interface for menus, maps, cards, inventory, and progression screens.
- **Vite:** small and fast development/build pipeline.
- **Framework-independent domain layer:** gameplay state and rules do not depend on React components.
- **Browser local storage adapter:** versioned profile/settings persistence behind a small storage interface.
- **Node test runner through tsx:** foundation logic can be tested without a browser.
- **No Phaser/canvas engine in Phase 1:** the intended experience is UI- and information-heavy. A second rendering engine is not justified until a later playable combat prototype demonstrates a concrete need.

Versions are pinned in `rebuild-app/package.json` so the initial toolchain is reproducible.

## 2. Layer boundaries

- `domain/`: game-facing types, state and pure logic.
- `app/`: React shell, screen composition and UI event wiring.
- `platform/input/`: browser input adapters.
- `platform/persistence/`: save decoding, validation, migration and storage.
- `styles/`: visual presentation only.

The domain layer must not import React, browser storage, DOM APIs, or presentation modules.

## 3. State ownership

The application has one authoritative `AppState`, updated through a typed reducer. UI components dispatch intent-based actions; they do not directly mutate profile or settings data.

The profile and settings are persistent. The currently selected screen is transient and is not written into the save. Expedition and combat state will be added as separate run-scoped state in later phases.

## 4. Save contract

- Current schema: version 1.
- Save key: `veilbound:profile`.
- Invalid JSON, unavailable storage, and unknown schema versions fail safely.
- Version 0 pre-release data is normalized into version 1.
- Volume values are clamped to the 0–1 range.
- Soul Shards cannot load as a negative or fractional value.
- Duplicate string IDs are removed.
- The storage adapter is injectable, so tests do not require a real browser.

Old production saves are not assumed to be compatible. A deliberate import/migration will be designed only if required.

## 5. Input foundation

- Standard browser focus and keyboard navigation remain available.
- Escape returns to the main menu.
- Touch and pointer input use native accessible buttons.
- Reduced-motion preference is respected by CSS; the setting is part of the persistent settings model.

## 6. Acceptance checks

- [ ] Strict TypeScript check passes.
- [ ] Foundation tests pass.
- [ ] Production build succeeds.
- [ ] Save round-trip and migration tests pass.
- [ ] Main menu, Sanctuary placeholder and Bestiary placeholder render at desktop and narrow mobile widths.
- [ ] Original `main` and maintenance branches remain unchanged.

## 7. Deliberate non-goals

No hero selection, map generation, card effects, combat engine, enemy AI, shops, events, progression systems, final art, or audio are implemented in this phase.
