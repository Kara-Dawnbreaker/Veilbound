# Veilbound: Ashen Crown

A single-player dark-fantasy roguelike deck-building game built with React, TypeScript, Vite, and Phaser.

## Development

The application lives in this directory.

```bash
bun install
bun run dev
```

Vite serves the development app on port 3000.

## Quality checks

Run these before submitting changes:

```bash
bun run lint
bun run test
bun run build
```

- `lint` runs the TypeScript compiler without emitting files.
- `test` runs deterministic RNG and procedural map regression tests.
- `build` creates the production bundle in `dist/`.

GitHub Actions runs the same checks for pushes and pull requests targeting `main` or `maintenance/veilbound-stability`.

## Save data

Player progress is stored locally in the browser. The save manager keeps a backup copy and validates the active run before restoring it. In-progress combat snapshots are stored with the active run so a reload can resume the encounter rather than generate a fresh one.

## Notes

- No external backend is required for the core game loop.
- Browser storage is local to the browser profile and is not cloud synchronization.
- Phaser handles the animated battlefield; React handles the surrounding game interface.
