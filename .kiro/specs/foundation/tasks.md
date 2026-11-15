# Implementation Plan: Foundation

## Overview

This plan builds the empty-but-working base of the Astronaut Health Companion (build step 1 in `docs/PROJECT.md`, section 14). The implementation language is TypeScript, as stated in the design. The project is Next.js only: by user decision there is no Vite, Vitest or other test runner, and the plan has no automated test tasks. The plan follows the design in this order: scaffold and tooling, tier type and design tokens, folder layout and disclaimer footer, sample store and chart route, lint rules that enforce the architecture, steering files, and README. Each task builds on the earlier ones. Correctness is verified by `npm run check` (lint, format check and type check), `npm run build`, and the manual steps in the design's "Integration and manual verification" section.

Constraints that apply to every task:

- No health logic, indicator definitions, threshold values, scenario data or source citations are created (Requirement 4.6; do not invent thresholds or sources).
- No PWA, service worker, manifest, backend, API route, server action, database, authentication or ML package (D5, D7; Requirement 10).
- No hand-written CSS beyond `src/app/globals.css` (D3). Tailwind utilities and shadcn/ui only.
- `src/domain/` and `src/simulation/` stay pure TypeScript with no React or Next.js imports (D4).
- No `Math.random()` outside `src/lib/`, and no `Date.now()` in `domain/` or `simulation/`.
- No test runner and no test files are added.
- `requirements.md` and `design.md` were revised once, by user request, to remove Vite, Vitest and all automated tests. Do not modify them further without a new user request.

## Tasks

- [x] 1. Scaffold the project and base tooling
  - [x] 1.1 Generate the Next.js scaffold and merge it into the repository
    - Run `npx create-next-app@latest` in a temporary directory (TypeScript, Tailwind, ESLint, App Router, `src/` directory, alias `@/*`, npm), then copy the output into the repository root
    - Merge `.gitignore` (union of both files), set the package name to `health-companion`, and set `"strict": true` and the `@/*` to `src/*` alias in `tsconfig.json`
    - Add `.npmrc` with `save-exact=true`, rewrite every caret range in `package.json` to the exact installed version, and keep `package-lock.json` committed
    - Confirm Next.js, React and TypeScript are the latest stable releases (no prerelease or canary). Pin ESLint to the major that `eslint-config-next` supports
    - Remove demo content (logos, default page text, `next/font/google`) and use the system font stack. Keep `src/app/layout.tsx`, `src/app/page.tsx` and `src/app/globals.css` only
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 1.8, 10.1, 10.2_

  - [x] 1.2 Configure Prettier and the package scripts
    - Add `.prettierrc.json` (Prettier defaults plus `"singleQuote": true`) and `.prettierignore` (`.next`, `node_modules`, `coverage`, `package-lock.json`, `next-env.d.ts`, `.kiro`, `docs`)
    - Add `eslint-config-prettier` and `prettier` as devDependencies at exact versions
    - Define the scripts `dev`, `build` (`npm run lint && next build`), `start`, `lint` (`eslint .`), `format`, `format:check`, `typecheck` (`tsc --noEmit`) and `check` (`npm run lint && npm run format:check && npm run typecheck`). Do not define `test` or `test:watch`
    - Run `npm run format` once so the scaffold passes `format:check`
    - _Requirements: 8.2, 8.3, 8.4, 8.8, 8.9, 9.1, 9.6, 9.7_

  - [x] 1.3 Initialise shadcn/ui and add the base components
    - Run `npx shadcn@latest init` with `components.json` set per the design (`tailwind.css` is `src/app/globals.css`, empty `tailwind.config`, `cssVariables` true, `rsc` true, aliases to `@/components`, `@/components/ui`, `@/lib/utils`, `@/lib`)
    - Add `button`, `card`, `badge` and `tooltip` so each exists as its own file under `src/components/ui/`
    - Confirm `src/lib/utils.ts` exports `cn(...inputs: ClassValue[]): string` as `twMerge(clsx(inputs))`
    - Confirm `src/app/globals.css` is the only `.css` file under `src/` and contains only Tailwind imports, `@custom-variant`, `:root` and `.dark` variable blocks, `@theme inline` and `@layer base` rules
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_

  - [x] 1.4 Install the lint plugin and confirm runtime libraries
    - `zod`, `zustand` and `recharts` are already installed. Confirm they are under `dependencies` at the latest stable versions, exact-pinned
    - Add `eslint-plugin-better-tailwindcss` as the only new `devDependency`, exact-pinned. Do not add `vite`, `vitest`, `@vitejs/plugin-react`, `fast-check`, `culori` or any `@types/*` package that only they needed
    - Confirm `package.json` versions are exact (no `^` or `~`) and match `package-lock.json`
    - _Requirements: 1.7, 6.1_

- [x] 2. Tier type, design tokens and TierBadge
  - [x] 2.1 Create the `Tier` type and its Zod schema
    - Create `src/domain/types.ts` containing only `export type Tier = 'green' | 'yellow' | 'orange' | 'red';`
    - Create `src/domain/tier-schema.ts` with `TierSchema = z.enum([...])` and the compile-time `Equal<SchemaTier, Tier>` guard, which `npm run typecheck` checks
    - No other file may declare a separate tier type with these values
    - _Requirements: 3.7, 4.2, 6.4_

  - [x] 2.2 Define the status design tokens in `globals.css`
    - Add `--status-{green,yellow,orange,red}` and `--status-{green,yellow,orange,red}-foreground` to both `:root` and `.dark`, using the OKLCH starting values from the design
    - Add the eight `--color-status-*` mappings in `@theme inline` so `bg-status-*`, `text-status-*` and `text-status-*-foreground` resolve
    - Check the contrast of all eight pairs manually, as described in the design (section 2, "Contrast check"), and adjust any value whose WCAG 2.1 contrast is below 4.5:1 in either value set
    - Do not add a theme toggle
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 2.5_

  - [x] 2.3 Implement the `TierBadge` component
    - Create `src/components/tier-badge.tsx` on top of the shadcn `Badge` with `Record<Tier, { label; Icon; className }>`
    - Labels: "Normal for you", "Drifting", "Concerning", "Act now". Icons: `CircleCheck`, `Eye`, `TriangleAlert`, `OctagonAlert` (all distinct). Mark icons `aria-hidden`
    - Write the class names as full literal strings using `bg-status-<tier>` and `text-status-<tier>-foreground`
    - Prop type is `Tier`, so any other value is a type error
    - _Requirements: 3.5, 3.6, 3.9_

- [x] 3. Folder layout, disclaimer and layout
  - [x] 3.1 Create the folder layout with placeholders
    - Create the directories listed in the design under `src/domain/`, `src/simulation/` (including `scenarios/iss`, `scenarios/lunar`, `scenarios/mars`), `src/features/` (`body-map`, `check-in`, `trends`, `alerts`, `escalation`, `radiation`, `countermeasures`), `src/store/`, `src/data/`
    - Put exactly one `.gitkeep` in each directory that would otherwise be empty. Add no indicator, threshold, scenario or source content
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 3.2 Implement the disclaimer constant and footer
    - Create `src/data/disclaimer.ts` exporting `DISCLAIMER_NOTICE` (decision support, not a diagnostic device, synthetic data and draft thresholds) and `assertDisclaimerPresent(text)` that throws on empty text, then call it at module load
    - Create `src/components/disclaimer-footer.tsx` as a server component using wrapping utilities and none of `truncate`, `line-clamp-*`, `overflow-hidden`, `hidden` or `sr-only`
    - The notice text must exist only in `src/data/disclaimer.ts`
    - _Requirements: 12.1, 12.3, 12.4, 12.5, 12.6_

  - [x] 3.3 Build the root layout and placeholder page
    - Update `src/app/layout.tsx` to import `./globals.css`, render `children` inside `<main>` in a `min-h-svh` flex column and render `<DisclaimerFooter />` exactly once
    - Update `src/app/page.tsx` to show the heading "Health Companion" and the four `TierBadge` variants, using Tailwind utilities and shadcn/ui only, with no inline `style` attributes
    - Verify the title and the full notice are visible without scrolling at 1280×720
    - _Requirements: 1.5, 1.6, 2.6, 12.2_

- [ ] 4. Checkpoint - Ensure the quality gate passes
  - Run `npm run check` and `npm run build`. Ensure both exit 0, ask the user if questions arise.

- [ ] 5. Sample store and development chart route
  - [ ] 5.1 Create the sample Zustand store
    - Create `src/store/counter-store.ts` with `count` (initial 0), `increment` and `reset`, as in the design
    - Import the store only from files that start with `"use client"`
    - _Requirements: 6.2, 6.3_

  - [ ] 5.2 Add the development-only chart check route
    - Create `src/app/dev/chart-check/page.dev.tsx` and a `"use client"` component `chart-check.tsx` rendering one Recharts `LineChart` with five hard-coded points and no network requests, wrapped in a class-based error boundary that shows "Chart failed to render" on error. The component also reads `useCounterStore`
    - Update `next.config.ts` so `pageExtensions` includes `dev.tsx` only when `NODE_ENV === 'development'`
    - Confirm that a production build omits `/dev/chart-check` and that `next start` returns 404 for it. If `pageExtensions` does not behave as designed, stop and raise it with the user rather than changing the requirement
    - _Requirements: 6.3, 6.5, 6.6, 6.7_

- [ ] 6. Lint rules that enforce the architecture
  - [ ] 6.1 Implement the local ESLint rules
    - Create `eslint-rules/no-literal-colors.mjs`: report string literals and template elements containing hex colours (3, 4, 6 or 8 digits) or `rgb(`, `rgba(`, `hsl(`, `hsla(`, `oklch(`, including inside Tailwind arbitrary values. Allow `var(--token)`
    - Create `eslint-rules/no-unjustified-style.mjs`: report a JSX `style` attribute unless its value is a runtime expression and a comment ends on the line directly above
    - _Requirements: 3.8, 10.5_

  - [ ] 6.2 Compose the ESLint flat config
    - Create `eslint.rules.mjs` exporting `projectRules` and update `eslint.config.mjs` using the block order in the design: ignores, `eslint-config-next` core-web-vitals and typescript, `no-explicit-any`, `Math.random` outside `src/lib/`, the framework-free layer rules (restricted properties `Math.random` and `Date.now`, restricted imports and destructuring ban) for `src/domain/**` and `src/simulation/**`, local colour and style rules, `better-tailwindcss/no-unregistered-classes` with `entryPoint` set to `src/app/globals.css`, then `eslint-config-prettier`
    - Give every restricted-import message the rule and the reason (D4)
    - Fix any violations in files created so far so that `npm run lint` and `npm run build` exit 0
    - _Requirements: 2.8, 3.8, 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.3, 8.5, 8.7, 10.5_

- [ ] 7. Steering files
  - [ ] 7.1 Create the three steering files
    - Create `.kiro/steering/product.md`, `tech.md` and `structure.md`, each starting with front matter `inclusion: always`
    - `product.md`: purpose, concept and core loop, scope, decision-support positioning, and a "Source of truth and honesty" block (`docs/PROJECT.md` is the source of truth, stop and ask on conflict, thresholds are drafts with flags, never present a flag C value as fact)
    - `tech.md`: stack, architecture rules, styling rules, code conventions, and an "Agent rules" list with one bold line each: No PWA, No backend, No ML, No custom CSS, No health logic in components, No invented thresholds or sources, No `Math.random()`, Tests alongside domain functions, Ask when a requirement is ambiguous
    - `structure.md`: every folder from section 13.4 and every simulation group from section 11.1 of `docs/PROJECT.md`
    - Include no threshold numbers
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [ ] 8. Documentation
  - [ ] 8.1 Write the README script documentation
    - Create or update `README.md` with one entry per script in the form ``- `name`: description`` (1 to 200 characters) for `dev`, `build`, `start`, `lint`, `format`, `format:check`, `typecheck` and `check`. Do not list `test` or `test:watch`
    - _Requirements: 9.1, 9.8_

- [ ] 9. Final checkpoint - Ensure the quality gate and build pass
  - Run `npm run check` and `npm run build`, and confirm `/dev/chart-check` is absent from the production build output. Then work through the manual verification steps in the design's "Integration and manual verification" section. Ask the user if questions arise.

## Notes

- This plan has no optional tasks and no automated test tasks. By user decision the project is Next.js only, with no test runner.
- Each task references specific requirements for traceability. Requirement 7 was removed, so its number is unused.
- Items that need a running server, a browser, deliberate negative examples or a one-off scratch check (the 10 second dev-server response, console errors, 404 for the route in production, responsive footer widths at 320 px and 3840 px, intentional type or lint failures, token contrast, the excluded-technology review) are manual verification steps listed in the design's "Integration and manual verification" section and are not coding tasks.
- If a design assumption fails during implementation (the `pageExtensions` approach in task 5.2, or an ESLint major mismatch in task 1.1), stop and ask the user before changing requirements or design.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4"] },
    { "id": 4, "tasks": ["2.1", "3.1", "6.1", "7.1"] },
    { "id": 5, "tasks": ["2.2", "3.2", "5.1", "6.2", "8.1"] },
    { "id": 6, "tasks": ["2.3", "5.2"] },
    { "id": 7, "tasks": ["3.3"] }
  ]
}
```
