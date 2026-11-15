---
inclusion: always
---

# Tech

`docs/PROJECT.md` is the source of truth. If this file or a chat message conflicts with it, stop and ask the user which applies.

One user decision overrides `docs/PROJECT.md`: the project has no test runner. Sections on Vitest and unit tests in `docs/PROJECT.md` are superseded by it.

## Stack

| Concern    | Choice                                                                               |
| ---------- | ------------------------------------------------------------------------------------ |
| Framework  | Next.js (App Router) and TypeScript in strict mode. Next.js only, no Vite.           |
| Styling    | Tailwind CSS and shadcn/ui. No custom CSS files beyond the generated global tokens   |
| Charts     | Recharts                                                                             |
| State      | Zustand                                                                              |
| Validation | Zod, at data boundaries (scenarios, readings)                                        |
| Tests      | None. There is no Vitest, Vite or other test runner                                  |
| Quality    | ESLint and Prettier                                                                  |
| Hosting    | Vercel or any static-capable host                                                    |

Dependencies are pinned to exact versions. Use current stable versions and check compatibility notes when adding a package.

### Scripts

- `dev`: start the development server.
- `build`: lint, then create the production build.
- `start`: serve the production build.
- `lint`: run ESLint.
- `format`: rewrite files with Prettier.
- `format:check`: list files that differ from Prettier, change nothing.
- `typecheck`: strict TypeScript check with `tsc --noEmit`.
- `check`: run `lint`, `format:check` and `typecheck` in that order and stop at the first failure. Run it after every change.

## Architecture rules

1. `src/domain/` and `src/simulation/` are pure TypeScript with no React or Next.js imports. ESLint enforces this.
2. UI components are thin. They read state and call domain functions. No health logic inside components.
3. Thresholds, countermeasure content and instructional text live in data files, not components.
4. Simulation and persisted stores are used only in client components. No `Math.random()` during render, which avoids hydration mismatches.
5. No API routes or server actions. Keep the logic client-side.
6. Feature folders own their components, hooks and types.
7. The single `Tier` type lives in `src/domain/types.ts`. Do not declare another tier type.

## Styling rules

- Use Tailwind utility classes and shadcn/ui components only.
- Repeated class combinations become shared components in `src/components/`, not new CSS classes.
- Colours, spacing and radii come from theme tokens in `src/app/globals.css`, the only stylesheet. Status tier colours are named tokens: `status-green`, `status-yellow`, `status-orange`, `status-red`, each with a matching foreground token.
- No literal colour values (hex, `rgb()`, `hsl()`, `oklch()`) in components. ESLint enforces this.
- The body map is an SVG component. Style it with Tailwind classes driven by status, not inline style strings.
- No `style={{}}` attributes except for genuinely dynamic values (for example chart sizes). Put a comment on the line above that says why the value is dynamic.
- Always pair a tier colour with an icon and a text label. Use the shared `TierBadge`.

## Code conventions

- Strict TypeScript, no `any`.
- Pure functions in the domain layer, with explicit inputs and outputs.
- Small files with a single responsibility and descriptive names.
- Short comments only where the reasoning is not obvious. For health rules, cite the source ID.
- Plain-language UI text suitable for non-experts.
- The decision-support notice text lives in one constant in `src/data/disclaimer.ts`. Reference it, never copy it.

## Agent rules

- **No PWA.** Do not add a service worker, a manifest, Serwist or any offline tooling (decision D5).
- **No backend.** Do not add a database, authentication, API routes or server actions.
- **No ML.** The engine is rule-based and explainable (decision D7).
- **No custom CSS.** Use Tailwind and shadcn/ui only (decision D3).
- **No health logic in components.** Put it in `src/domain/` and call it from the UI.
- **No invented thresholds or sources.** Use the values in `docs/PROJECT.md` as they are, keep their flags, and leave `sources` empty until the team supplies citations.
- **No `Math.random()`.** Use the seeded RNG. Do not use `Date.now()` in `src/domain/` or `src/simulation/` either.
- **No test runner.** The project has no Vitest, Vite or other test runner. Keep domain functions pure and typed, and rely on `npm run check`.
- **Ask when a requirement is ambiguous.** Ask the user before implementing.
