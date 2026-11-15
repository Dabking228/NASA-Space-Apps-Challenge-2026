---
inclusion: always
---

# Structure

`docs/PROJECT.md` is the source of truth for the folder layout. If a chat message conflicts with it, stop and ask the user which applies.

## Project layout

```
src/
├── app/                  # Next.js routes, layout, providers
├── domain/               # Pure TypeScript, no React
│   ├── indicators/       # Definitions, units, ranges, sources
│   ├── baseline/         # Baseline and deviation calculation
│   ├── rules/            # Hard limits, clusters, tier classification, confidence
│   ├── environments/     # Environment profile types and shared logic
│   └── types.ts          # The shared Tier type
├── simulation/           # Pure TypeScript, see the simulation groups below
├── features/
│   ├── body-map/
│   ├── check-in/
│   ├── trends/
│   ├── alerts/
│   ├── escalation/
│   ├── radiation/
│   └── countermeasures/
├── components/           # Shared UI built on shadcn/ui
├── store/                # Zustand stores
├── data/                 # Cited thresholds, countermeasure and instruction content
└── lib/                  # Utilities
```

Other top-level items:

- `docs/PROJECT.md`: the master document.
- `.kiro/steering/`: these always-included steering files.
- `.kiro/specs/`: one spec per feature.
- `eslint-rules/`: local ESLint rules that enforce the architecture.

## Simulation groups

```
src/simulation/
├── engine/        # seeded RNG, signal generators (baseline + noise + drift), runner
├── crew/          # virtual astronaut profiles
├── environments/  # iss.ts, lunar-surface.ts, mars-transit.ts
├── events/        # reusable event library (SPE, CO2 spike, EVA, equipment outage...)
├── scenarios/     # compose crew + environment + events
│   ├── iss/
│   ├── lunar/
│   └── mars/
└── demo-packs/    # curated playlists for the judges' demo
```

## Layer rules

- `src/app` may use `src/features`, `src/components` and `src/data`.
- `src/features` may use `src/components`, `src/store`, `src/domain` and `src/simulation`.
- `src/components` may use `src/domain` and `src/lib`.
- `src/store` may use `src/domain`.
- `src/simulation` may use `src/domain`.
- `src/domain` and `src/simulation` never import from `react`, `next`, `src/components`, `src/features`, `src/app` or `src/store`.
- Empty folders hold a single `.gitkeep`. Delete it when real files are added.
