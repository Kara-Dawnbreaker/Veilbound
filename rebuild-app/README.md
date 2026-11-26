# Veilbound: Ashen Crown — Rebuild App

This is the clean implementation workspace for the Veilbound rebuild. The original project remains in `Veilbound-Cards-main/` as a reference and is not imported into this application.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Commands

Run these commands from this directory:

- `npm install` — install dependencies
- `npm run dev` — start the local development server
- `npm run typecheck` — run strict TypeScript checks
- `npm test` — run foundation tests
- `npm run build` — type-check and create the production build

## Architecture

- `src/domain/` — framework-independent game state and rules
- `src/app/` — React application shell and screen composition
- `src/platform/input/` — keyboard and future input adapters
- `src/platform/persistence/` — versioned save storage and migrations
- `src/styles/` — presentation layer

React is used for the information-rich interface. Core game rules will remain independent of React. A separate canvas engine is intentionally not included in this foundation: the current game is primarily menus, maps, cards, and tactical information, so a second rendering engine would add complexity before a concrete need exists. Reconsider a canvas layer only if later combat presentation requires it.

## Scope note

The current screens are structural placeholders. Hero selection, expedition generation, combat, content, and world progression are not implemented in Phase 1.
