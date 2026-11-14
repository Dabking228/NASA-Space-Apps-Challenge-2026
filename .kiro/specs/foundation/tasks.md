# Implementation Plan: Foundation

## Overview

This plan builds the empty-but-working base of the Astronaut Health Companion (build step 1 in `docs/PROJECT.md`, section 14). The implementation language is TypeScript, as stated in the design. The plan follows the design in this order: scaffold and tooling, Vitest, tier type and design tokens, folder layout and disclaimer footer, sample store and chart route, lint rules that enforce the architecture, excluded-technology checks, steering files, and README. Each task builds on the earlier ones and ends with everything wired into the quality gate (`npm run check`).

Constraints that apply to every task:

- No health logic, indicator definitions, threshold values, scenario data or source citations are created (Requirement 4.6; do not invent thresholds or sources).
- No PWA, service worker, manifest, backend, API route, server action, database, authentication or ML package (D5, D7; Requirement 10).
- No hand-written CSS beyond `src/app/globals.css` (D3). Tailwind utilities and shadcn/ui only.
- `src/domain/` and `src/simulation/` stay pure TypeScript with no React or Next.js imports (D4).
- No `Math.random()` outside `src/lib/`, and no `Date.now()` in `domain/` or `simulation/`.
- Do not modify `requirements.md` or `design.md`.

## Tasks

- [ ] 1. Scaffold the project and base tooling
  - [x] 1.1 Generate the Next.js scaffold and merge it into the repository
    - Run `npx create-next-app@latest` in a temporary directory (TypeScript, Tailwind, ESLint, App Router, `src/` directory, alias `@/*`, npm), then copy the output into the repository root
    - Merge `.gitignore` (union of both files), set the package name to `health-companion`, and set `"strict": true` and the `@/*` to `src/*` alias in `tsconfig.json`
    - Add `.npmrc` with `save-exact=true`, rewrite every caret range in `package.json` to the exact installed version, and keep `package-lock.json` committed
    - Confirm Next.js, React and TypeScript are the latest stable releases (no prerelease or canary). Pin ESLint to the major that `eslint-config-next` supports
    - Remove demo content (logos, default page text, `next/font/google`) and use the system font stack. Keep `src/app/layout.tsx`, `src/app/page.tsx` and `src/app/globals.css` only
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 1.8, 10.1, 10.2_

  - [ ] 1.2 Configure Prettier and the package scripts
    - Add `.prettierrc.json` (Prettier defaults plus `"singleQuote": true`) and `.prettierignore` (`.next`, `node_modules`, `coverage`, `package-lock.json`, `next-env.d.ts`, `.kiro`, `docs`)
    - Add `eslint-config-prettier` and `prettier` as devDependencies at exact versions
    - Define the scripts `dev`, `build` (`npm run lint && next build`), `start`, `lint` (`eslint .`), `format`, `format:check`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:watch` (`vitest`) and `check` (`npm run lint && npm run format:check && npm run typecheck && npm run test`)
    - Run `npm run format` once so the scaffold passes `format:check`
    - _Requirements: 8.2, 8.3, 8.4, 8.8, 8.9, 9.1, 9.7, 9.8_

  - [ ] 1.3 Initialise shadcn/ui and add the base components
    - Run `npx shadcn@latest init` with `components.json` set per the design (`tailwind.css` is `src/app/globals.css`, empty `tailwind.config`, `cssVariables` true, `rsc` true, aliases to `@/components`, `@/components/ui`, `@/lib/utils`, `@/lib`)
    - Add `button`, `card`, `badge` and `tooltip` so each exists as its own file under `src/components/ui/`
    - Confirm `src/lib/utils.ts` exports `cn(...inputs: ClassValue[]): string` as `twMerge(clsx(inputs))`
    - Confirm `src/app/globals.css` is the only `.css` file under `src/` and contains only Tailwind imports, `@custom-variant`, `:root` and `.dark` variable blocks, `@theme inline` and `@layer base` rules
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_

  - [ ] 1.4 Install runtime libraries and test dependencies
    - Add `zod`, `zustand` and `recharts` under `dependencies` at the latest stable versions, exact-pinned
    - Add `vitest`, `@vitejs/plugin-react`, `fast-check`, `culori`, `eslint-plugin-better-tailwindcss` and the needed `@types/*` packages under `devDependencies`, exact-pinned. `fast-check` must not appear under `dependencies`
    - Confirm `package.json` versions match `package-lock.json`
    - _Requirements: 1.7, 6.1, 7.5_

- [ ] 2. Set up Vitest
  - [ ] 2.1 Configure Vitest
    - Create `vitest.config.mts` with `environment: 'node'`, `include` of `src/**/*.test.{ts,tsx}` and `tests/**/*.test.ts`, the `@vitejs/plugin-react` plugin, and `resolve.alias` mapping `@` to `<root>/src`
    - Ensure a failing test prints its name and reason and gives a non-zero exit code (Vitest default)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.8_

  - [ ]* 2.2 Write property test for `cn`
    - Create `src/lib/utils.test.ts` with the named example `cn("p-2", "p-4")` returning `"p-4"`
    - **Property 2: `cn` merges conflicts in favour of the last class and ignores falsy values**
    - Use `fast-check` with `numRuns: 100` or more and the tag comment `// Feature: foundation, Property 2: ...`
    - **Validates: Requirements 2.7**

- [ ] 3. Tier type, design tokens and TierBadge
  - [ ] 3.1 Create the `Tier` type and its Zod schema
    - Create `src/domain/types.ts` containing only `export type Tier = 'green' | 'yellow' | 'orange' | 'red';`
    - Create `src/domain/tier-schema.ts` with `TierSchema = z.enum([...])` and the compile-time `Equal<SchemaTier, Tier>` guard
    - No other file may declare a separate tier type with these values
    - _Requirements: 3.7, 4.2, 6.4_

  - [ ] 3.2 Write property test for the tier schema
    - Create `src/domain/tier-schema.test.ts` using `fast-check` with `numRuns: 100` or more and the tag comment `// Feature: foundation, Property 1: ...`
    - Assert acceptance of each of the four tiers and rejection of every generated string that is not one of them, plus named examples: empty string, letter-case variants, padded strings, `null`, `undefined`, a number
    - This test is not optional because Requirements 7.6 and 7.7 require a sample property-based test in the scaffold
    - **Property 1: Tier schema accepts exactly the four tiers**
    - **Validates: Requirements 6.4, 7.6, 7.7**

  - [ ] 3.3 Write the node-environment sample test for `Tier`
    - Create `src/domain/types.test.ts` that imports `Tier` from `src/domain/types.ts` and asserts `window` and `document` are `undefined`
    - This test is not optional because Requirement 5.6 requires it
    - _Requirements: 5.6, 7.4_

  - [ ] 3.4 Define the status design tokens in `globals.css`
    - Add `--status-{green,yellow,orange,red}` and `--status-{green,yellow,orange,red}-foreground` to both `:root` and `.dark`, using the OKLCH starting values from the design
    - Add the eight `--color-status-*` mappings in `@theme inline` so `bg-status-*`, `text-status-*` and `text-status-*-foreground` resolve
    - Adjust any value whose foreground contrast against its background is below 4.5:1 (WCAG 2.1) in either value set
    - Do not add a theme toggle
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 2.5_

  - [ ]* 3.5 Write token tests for `globals.css`
    - Create `tests/scaffold/tokens.test.ts` that parses `globals.css` with `postcss`
    - Check the allowed structure, four status tokens plus four foregrounds in both scopes, the `@theme inline` mappings, and the WCAG 2.1 contrast of all eight pairs using `culori`
    - _Requirements: 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_

  - [ ] 3.6 Implement the `TierBadge` component
    - Create `src/components/tier-badge.tsx` on top of the shadcn `Badge` with `Record<Tier, { label; Icon; className }>`
    - Labels: "Normal for you", "Drifting", "Concerning", "Act now". Icons: `CircleCheck`, `Eye`, `TriangleAlert`, `OctagonAlert` (all distinct). Mark icons `aria-hidden`
    - Write the class names as full literal strings using `bg-status-<tier>` and `text-status-<tier>-foreground`
    - Prop type is `Tier`, so any other value is a type error
    - _Requirements: 3.5, 3.6, 3.9_

  - [ ]* 3.7 Write unit tests for `TierBadge`
    - Create `src/components/tier-badge.test.tsx` using `renderToStaticMarkup`, for all four tiers
    - Check token classes, one `svg`, a non-empty label, and four distinct labels and four distinct icons
    - Add a `// @ts-expect-error` line for an invalid tier value
    - _Requirements: 3.5, 3.6, 3.9_

- [ ] 4. Folder layout, disclaimer and layout
  - [ ] 4.1 Create the folder layout with placeholders
    - Create the directories listed in the design under `src/domain/`, `src/simulation/` (including `scenarios/iss`, `scenarios/lunar`, `scenarios/mars`), `src/features/` (`body-map`, `check-in`, `trends`, `alerts`, `escalation`, `radiation`, `countermeasures`), `src/store/`, `src/data/`
    - Put exactly one `.gitkeep` in each directory that would otherwise be empty. Add no indicator, threshold, scenario or source content
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ] 4.2 Implement the disclaimer constant and footer
    - Create `src/data/disclaimer.ts` exporting `DISCLAIMER_NOTICE` (decision support, not a diagnostic device, synthetic data and draft thresholds) and `assertDisclaimerPresent(text)` that throws on empty text, then call it at module load
    - Create `src/components/disclaimer-footer.tsx` as a server component using wrapping utilities and none of `truncate`, `line-clamp-*`, `overflow-hidden`, `hidden` or `sr-only`
    - The notice text must exist only in `src/data/disclaimer.ts`
    - _Requirements: 12.1, 12.3, 12.4, 12.5, 12.6_

  - [ ] 4.3 Build the root layout and placeholder page
    - Update `src/app/layout.tsx` to import `./globals.css`, render `children` inside `<main>` in a `min-h-svh` flex column and render `<DisclaimerFooter />` exactly once
    - Update `src/app/page.tsx` to show the heading "Health Companion" and the four `TierBadge` variants, using Tailwind utilities and shadcn/ui only, with no inline `style` attributes
    - Verify the title and the full notice are visible without scrolling at 1280×720
    - _Requirements: 1.5, 1.6, 2.6, 12.2_

  - [ ]* 4.4 Write tests for the footer and layout
    - Create `src/components/disclaimer-footer.test.tsx` and `src/app/layout.test.tsx` using `renderToStaticMarkup`
    - Check that the footer shows the notice, the layout output contains it exactly once, the footer has none of the truncating classes, `assertDisclaimerPresent("")` throws, and the notice contains the three required phrases
    - _Requirements: 1.6, 12.1, 12.2, 12.3, 12.5, 12.6_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Sample store and development chart route
  - [ ] 6.1 Create the sample Zustand store
    - Create `src/store/counter-store.ts` with `count` (initial 0), `increment` and `reset`, as in the design
    - Import the store only from files that start with `"use client"`
    - _Requirements: 6.2, 6.3_

  - [ ]* 6.2 Write property test for the counter store
    - Create `src/store/counter-store.test.ts` using `fast-check` with `numRuns: 100` or more
    - **Property 3: Counter store matches a counting model**
    - **Validates: Requirements 6.2**

  - [ ] 6.3 Add the development-only chart check route
    - Create `src/app/dev/chart-check/page.dev.tsx` and a `"use client"` component `chart-check.tsx` rendering one Recharts `LineChart` with five hard-coded points and no network requests, wrapped in a class-based error boundary that shows "Chart failed to render" on error. The component also reads `useCounterStore`
    - Update `next.config.ts` so `pageExtensions` includes `dev.tsx` only when `NODE_ENV === 'development'`
    - Confirm that a production build omits `/dev/chart-check` and that `next start` returns 404 for it. If `pageExtensions` does not behave as designed, stop and raise it with the user rather than changing the requirement
    - _Requirements: 6.3, 6.5, 6.6, 6.7_

- [ ] 7. Lint rules that enforce the architecture
  - [ ] 7.1 Implement the local ESLint rules
    - Create `eslint-rules/no-literal-colors.mjs`: report string literals and template elements containing hex colours (3, 4, 6 or 8 digits) or `rgb(`, `rgba(`, `hsl(`, `hsla(`, `oklch(`, including inside Tailwind arbitrary values. Allow `var(--token)`
    - Create `eslint-rules/no-unjustified-style.mjs`: report a JSX `style` attribute unless its value is a runtime expression and a comment ends on the line directly above
    - _Requirements: 3.8, 10.5_

  - [ ] 7.2 Compose the ESLint flat config
    - Create `eslint.rules.mjs` exporting `projectRules` and update `eslint.config.mjs` using the block order in the design: ignores, `eslint-config-next` core-web-vitals and typescript, `no-explicit-any`, `Math.random` outside `src/lib/`, the framework-free layer rules (restricted properties `Math.random` and `Date.now`, restricted imports and destructuring ban) for `src/domain/**` and `src/simulation/**`, local colour and style rules, `better-tailwindcss/no-unregistered-classes` with `entryPoint` set to `src/app/globals.css`, then `eslint-config-prettier`
    - Give every restricted-import message the rule and the reason (D4)
    - Fix any violations in files created so far so that `npm run lint` and `npm run build` exit 0
    - _Requirements: 2.8, 3.8, 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.3, 8.5, 8.7, 10.5_

  - [ ]* 7.3 Write property test for forbidden imports
    - Create `tests/lint/boundaries.test.ts` using a shared ESLint `Linter` instance with `projectRules` and the TypeScript parser, calling `linter.verify(code, config, { filename })`
    - **Property 4: Framework imports are rejected in domain and simulation, and only there**
    - **Validates: Requirements 5.1, 5.5**

  - [ ]* 7.4 Write property test for non-deterministic calls
    - Create `tests/lint/nondeterminism.test.ts`, using the same shared `Linter` setup as task 7.3
    - **Property 5: Non-deterministic calls are rejected exactly where the scope says**
    - **Validates: Requirements 5.2, 5.3, 5.5**

  - [ ]* 7.5 Write property test for explicit `any`
    - Create `tests/lint/no-any.test.ts` covering type annotation, type argument and type assertion, with `unknown` as the clean counterpart
    - **Property 6: Explicit `any` is rejected in every position**
    - **Validates: Requirements 5.4, 5.5**

  - [ ]* 7.6 Write property test for literal colours
    - Create `tests/lint/no-literal-colors.test.ts` with generated hex and function-style colours embedded at arbitrary positions in strings, including Tailwind arbitrary classes
    - **Property 7: Literal colours are rejected wherever they appear in a string**
    - **Validates: Requirements 3.8**

  - [ ]* 7.7 Write unit tests for the `style` attribute rule
    - Create `tests/lint/no-unjustified-style.test.ts`: static style is flagged, dynamic value with a comment above passes, dynamic value without a comment is flagged
    - _Requirements: 10.5_

- [ ] 8. Excluded-technology verification
  - [ ] 8.1 Implement the detection helpers and the repository check
    - Create `tests/scaffold/rules.ts` with pure `findProhibitedPackages(deps)` and `findProhibitedFiles(paths)` covering the denylists in the design (PWA, database, auth, API route and `"use server"`, ML, extra stylesheets, CSS-in-JS)
    - Create `tests/scaffold/excluded-tech.test.ts` that runs the helpers on the real `package.json` and file tree, scans `src/` for `"use server"` and ML imports, and fails with a non-zero exit and a list of each violating path or package
    - This test is not optional because Requirement 10.6 requires the verification check
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6_

  - [ ]* 8.2 Write property test for prohibited-technology detection
    - Add to `tests/scaffold/excluded-tech.test.ts`
    - **Property 8: Prohibited technology is always detected and clean sets are not flagged**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.6**

- [ ] 9. Steering files
  - [ ] 9.1 Create the three steering files
    - Create `.kiro/steering/product.md`, `tech.md` and `structure.md`, each starting with front matter `inclusion: always`
    - `product.md`: purpose, concept and core loop, scope, decision-support positioning, and a "Source of truth and honesty" block (`docs/PROJECT.md` is the source of truth, stop and ask on conflict, thresholds are drafts with flags, never present a flag C value as fact)
    - `tech.md`: stack, architecture rules, styling rules, code conventions, and an "Agent rules" list with one bold line each: No PWA, No backend, No ML, No custom CSS, No health logic in components, No invented thresholds or sources, No `Math.random()`, Tests alongside domain functions, Ask when a requirement is ambiguous
    - `structure.md`: every folder from section 13.4 and every simulation group from section 11.1 of `docs/PROJECT.md`
    - Include no threshold numbers
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [ ]* 9.2 Write tests for the steering files
    - Create `tests/scaffold/steering.test.ts`: front matter `inclusion: always` in all three files, required headings and phrases, the nine agent rule lines, source-of-truth and flag C statements, and every folder name present in `structure.md`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [ ] 10. Documentation and scaffold smoke tests
  - [ ] 10.1 Write the README script documentation
    - Create or update `README.md` with one entry per script in the form ``- `name`: description`` (1 to 200 characters) for `dev`, `build`, `start`, `lint`, `format`, `format:check`, `typecheck`, `test`, `test:watch` and `check`
    - _Requirements: 9.1, 9.9_

  - [ ]* 10.2 Write scaffold smoke tests
    - Create `tests/scaffold/config.test.ts`: strict mode, alias, exact versions equal to the lockfile, no prerelease tags, scripts present and the `check` string, `fast-check` placement, `zod`, `zustand` and `recharts` placement, README script entries, Prettier config resolves, the `@` alias resolves to the same module as in the application
    - Create `tests/scaffold/structure.test.ts`: required directories, one `.gitkeep` per otherwise empty directory, no indicator or threshold keywords, `types.ts` has one export and no second `Tier` union exists, the store is imported only by `"use client"` files, the notice is defined once, the sample chart data has five points
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 2.2, 2.3, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.1, 6.3, 7.1, 7.2, 7.3, 7.5, 8.2, 8.4, 9.1, 9.9, 12.4_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Run `npm run check` and `npm run build`, confirm `/dev/chart-check` is absent from the production build output, and ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. Tasks 3.2, 3.3 and 8.1 are test tasks that stay required because Requirements 5.6, 7.6, 7.7 and 10.6 demand them.
- Each task references specific requirements for traceability.
- Property tests validate the universal correctness properties (Properties 1 to 8). Unit and smoke tests validate examples, structure and configuration.
- Items that need a running server, a browser or deliberate negative examples (the 10 second dev-server response, console errors, 404 for the route in production, responsive footer widths at 320 px and 3840 px, intentional type or lint failures) are manual verification steps listed in the design's "Integration and manual verification" section and are not coding tasks.
- If a design assumption fails during implementation (the `pageExtensions` approach in task 6.3, or an ESLint major mismatch in task 1.1), stop and ask the user before changing requirements or design.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4"] },
    { "id": 4, "tasks": ["2.1", "3.1", "4.1", "7.1", "9.1"] },
    { "id": 5, "tasks": ["2.2", "3.2", "3.3", "3.4", "4.2", "6.1", "7.2", "9.2", "10.1"] },
    { "id": 6, "tasks": ["3.5", "3.6", "6.2", "6.3", "7.3", "7.4", "7.5", "7.6", "7.7", "8.1"] },
    { "id": 7, "tasks": ["3.7", "4.3", "8.2"] },
    { "id": 8, "tasks": ["4.4", "10.2"] }
  ]
}
```
