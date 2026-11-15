# Requirements Document

## Introduction

This spec covers build step 1 of the Astronaut Health Companion (docs/PROJECT.md, sections 14 and 15.2). It scaffolds the project so later specs (domain-engine, simulation, dashboard-body-map and others) can build on a working, consistent base. It delivers the Next.js and TypeScript project, styling and component tooling, quality tooling (lint, format and type check), runtime libraries, the folder structure from section 13.4, design tokens including the status-tier colours, and the persistent steering files.

This spec delivers no health logic, no simulation data, no thresholds, and no feature screens beyond a minimal placeholder page. Decisions D3 (no hand-written CSS), D4 (framework-free domain and simulation), D5 (no offline/PWA), and D7 (no ML) apply. The prototype has no backend.

Revision note: by user decision the Project is Next.js only and has no automated test runner. This spec was revised once by user request to remove Vite, Vitest and all automated tests. Requirement 7 (Testing with Vitest) was removed, and its number is intentionally left unused so that cross-references in design.md and tasks.md stay correct. Requirements that were verified only by an automated test are now verified by lint, type check, build, or the manual steps listed in the design.

## Glossary

- **Project**: The Astronaut Health Companion web application repository.
- **Scaffold**: The initial Next.js App Router and TypeScript codebase produced by this spec.
- **Global_Tokens_File**: The single generated global stylesheet that holds theme design tokens. It is the only stylesheet in the Project.
- **Design_Token**: A named theme value (colour, spacing, radius) defined in the Global_Tokens_File and exposed to Tailwind CSS.
- **Status_Token**: A Design_Token for a tier colour. The four names are `status-green`, `status-yellow`, `status-orange`, and `status-red`.
- **Framework_Free_Layer**: The `src/domain/` and `src/simulation/` directories, which hold pure TypeScript.
- **Steering_Files**: The persistent agent context files `product.md`, `tech.md`, and `structure.md` in `.kiro/steering/`.
- **Quality_Gate**: The set of commands `lint`, `format:check`, `typecheck`, and `build` defined in `package.json`.
- **Placeholder_Page**: The minimal home page at the root route that confirms the Scaffold renders.
- **Disclaimer_Notice**: The text stating the Project is decision support, not a diagnostic device, and uses synthetic data and draft thresholds.
- **Master_Document**: `docs/PROJECT.md`.

## Requirements

### Requirement 1: Next.js and TypeScript scaffold

**User Story:** As a developer, I want a working Next.js App Router project in strict TypeScript, so that all later specs build on the same base.

#### Acceptance Criteria

1. THE Scaffold SHALL use the Next.js App Router with all application source code under `src/`.
2. THE Scaffold SHALL use the latest stable (non-prerelease, non-canary) major versions of Next.js, React, and TypeScript published on the npm registry on the date the scaffold is created.
3. THE Scaffold SHALL set `strict` to `true` in `tsconfig.json`.
4. THE Scaffold SHALL define the path alias `@/*` mapping to `src/*` in `tsconfig.json`, so that an import of `@/<path>` resolves to `src/<path>` in both the TypeScript type check and the Next.js build.
5. WHEN the development server starts, THE Scaffold SHALL serve the Placeholder_Page at the root route `/` with an HTTP success response within 10 seconds of the server reporting it is ready, and with zero errors in the terminal output and the browser console.
6. WHEN the Placeholder_Page is loaded at the root route, THE Placeholder_Page SHALL display the exact text "Health Companion" as the Project working title and the full text of the Disclaimer_Notice, both visible without scrolling at a 1280×720 pixel viewport.
7. THE Scaffold SHALL record the exact installed version of each dependency and devDependency in `package.json` and in a committed lockfile, with the versions in the lockfile matching the installed versions.
8. WHEN the type check (`tsc --noEmit`) and the production build (`next build`) are run on the Scaffold, THE Scaffold SHALL complete both with exit code 0 and zero type errors.
9. IF a source file contains a TypeScript strict-mode violation, THEN THE Scaffold SHALL fail the type check with a non-zero exit code and report the file and line of the violation.

### Requirement 2: Styling with Tailwind CSS and shadcn/ui

**User Story:** As a developer, I want Tailwind CSS and shadcn/ui configured, so that the UI is built from utilities and shared components without custom CSS.

#### Acceptance Criteria

1. WHEN the Scaffold production build is run, THE Scaffold SHALL generate CSS for every Tailwind utility class used in any file under `src/`, and the build SHALL complete with exit code 0.
2. THE Scaffold SHALL configure shadcn/ui so that generated component source files are written to `src/components/`.
3. THE Scaffold SHALL include the shadcn/ui components Button, Card, Badge, and Tooltip, each as a separate source file under `src/components/` that can be imported without a compile error.
4. THE Project SHALL contain exactly one stylesheet file (a file with a `.css` extension under `src/`), and that file SHALL be the Global_Tokens_File.
5. THE Global_Tokens_File SHALL contain only Tailwind directives and imports, Design_Token definitions, and base-layer rules generated by shadcn/ui, and SHALL contain no class selectors, ID selectors, or element selectors outside the base layer.
6. WHEN the Placeholder_Page is rendered, THE Placeholder_Page SHALL style every element using Tailwind utility classes and shadcn/ui components only, with no inline `style` attributes and no CSS imports other than the Global_Tokens_File.
7. THE Scaffold SHALL export a `cn` function from a file under `src/lib/` that accepts one or more class values (strings, arrays, objects, or falsy values) and returns a single string, merging conflicting Tailwind classes so that the last conflicting class wins (for example, `cn("p-2", "p-4")` returns `"p-4"`).
8. IF a Tailwind utility class or shadcn/ui component is referenced in `src/` but is not configured or generated, THEN THE Scaffold SHALL fail the production build with a non-zero exit code and an error message that identifies the missing item.

### Requirement 3: Design tokens and status colours

**User Story:** As a designer, I want status-tier colours defined as named tokens, so that tier colours are never hard-coded in components.

#### Acceptance Criteria

1. THE Global_Tokens_File SHALL define exactly four Status_Tokens named `status-green`, `status-yellow`, `status-orange`, and `status-red`, each with a non-empty colour value.
2. THE Scaffold SHALL expose each Status_Token as a Tailwind colour so that the utilities `bg-status-green`, `bg-status-yellow`, `bg-status-orange`, `bg-status-red`, `text-status-green`, `text-status-yellow`, `text-status-orange`, and `text-status-red` resolve to the value of the matching Status_Token.
3. THE Global_Tokens_File SHALL define one foreground colour token for each Status_Token (four in total) so that the contrast ratio between each foreground token and its Status_Token background is at least 4.5:1 under WCAG 2.1, in both the light and the dark value set.
4. THE Global_Tokens_File SHALL define a light value set and a dark value set, each containing a value for all four Status_Tokens and all four foreground tokens.
5. WHEN a `Tier` value is passed to the TierBadge, THE TierBadge SHALL render the Status_Token background and foreground colours for that tier, one icon, and one non-empty text label. The TierBadge SHALL be a shared component in `src/components/`.
6. THE TierBadge SHALL use a distinct icon and a distinct text label for each of the four tiers, so that no two tiers share an icon or a label.
7. THE Scaffold SHALL define a single exported `Tier` type in `src/domain/types.ts` whose only values are `green`, `yellow`, `orange`, and `red`, and no other file SHALL declare a separate tier type with those values.
8. IF a component source file under `src/` contains a literal colour value (hex, `rgb()`, `rgba()`, `hsl()`, `hsla()`, or `oklch()`), THEN THE lint check SHALL report an error that identifies the file and line and SHALL exit with a non-zero status.
9. IF the TierBadge receives a value that is not one of `green`, `yellow`, `orange`, or `red`, THEN THE Scaffold SHALL surface a type-check error at build time.

### Requirement 4: Folder structure

**User Story:** As a developer, I want the agreed folder layout in place, so that each later spec knows where its code belongs.

#### Acceptance Criteria

1. THE Scaffold SHALL contain the directories `src/app/`, `src/domain/`, `src/simulation/`, `src/features/`, `src/components/`, `src/store/`, `src/data/`, and `src/lib/`, each at the path given relative to the repository root.
2. THE Scaffold SHALL contain under `src/domain/` the subdirectories `indicators/`, `baseline/`, `rules/`, and `environments/`, and the file `types.ts`, where the only declaration `types.ts` contains is the shared `Tier` type required by Requirement 3 criterion 7, with no other types, interfaces, or constants.
3. THE Scaffold SHALL contain under `src/simulation/` the subdirectories `engine/`, `crew/`, `environments/`, `events/`, `scenarios/`, and `demo-packs/`, and under `src/simulation/scenarios/` the subdirectories `iss/`, `lunar/`, and `mars/`.
4. THE Scaffold SHALL contain under `src/features/` the subdirectories `body-map/`, `check-in/`, `trends/`, `alerts/`, `escalation/`, `radiation/`, and `countermeasures/`.
5. THE Scaffold SHALL place exactly one placeholder file, either `.gitkeep` or `README.md`, in each directory required by criteria 1 to 4 that has no other files or subdirectories, so that Git tracks every such directory.
6. THE Scaffold SHALL contain zero indicator definitions, zero threshold values, zero scenario data entries, and zero source citations in any file it creates, where any `README.md` placeholder is limited to 500 characters describing only the purpose of its directory.

### Requirement 5: Framework-free domain and simulation

**User Story:** As a developer, I want the domain and simulation layers kept free of UI frameworks, so that health logic stays testable and runs without a server.

#### Acceptance Criteria

1. IF a TypeScript file under `src/domain/` or `src/simulation/` imports the module `react`, the module `next`, or any module path beginning with `react/`, `next/`, `@/components`, `@/features`, `@/app`, or `@/store`, THEN THE lint check SHALL exit with a non-zero status and report at least one error that names the file path, the line number of the import, and the violated rule.
2. IF a TypeScript file under `src/domain/` or `src/simulation/` calls `Math.random` or `Date.now`, THEN THE lint check SHALL exit with a non-zero status and report at least one error that names the file path, the line number of the call, and the violated rule.
3. IF a TypeScript file under `src/` outside `src/lib/` calls `Math.random`, THEN THE lint check SHALL exit with a non-zero status and report at least one error that names the file path, the line number of the call, and the violated rule.
4. IF a TypeScript file under `src/` uses the explicit type `any` in a type annotation, type argument, or type assertion, THEN THE lint check SHALL exit with a non-zero status and report at least one error that names the file path, the line number, and the violated rule.
5. WHEN the lint check runs on files under `src/` that contain none of the violations described in criteria 1 to 4, THE lint check SHALL report zero errors for those rules and exit with status 0.

### Requirement 6: Runtime libraries

**User Story:** As a developer, I want the agreed runtime libraries installed and verified, so that later specs can use them immediately.

#### Acceptance Criteria

1. WHEN the Scaffold is installed with a clean dependency install, THE Scaffold SHALL list Zod, Zustand, and Recharts under runtime dependencies (not development dependencies) at the latest stable release published on the package registry on the install date, and the install SHALL complete with exit code 0.
2. THE Scaffold SHALL provide one example Zustand store in `src/store/` that holds a single numeric counter with an initial value of 0 and increment and reset actions.
3. THE example Zustand store SHALL be imported only by files that begin with the `"use client"` directive.
4. THE Scaffold SHALL provide a Zod schema in `src/domain/` for the `Tier` values that accepts each of the four tier values defined in `docs/PROJECT.md` and rejects at least these inputs: an empty string, a string differing from a valid tier only by letter case, a string with leading or trailing whitespace, `null`, `undefined`, and a number.
5. WHEN a developer opens the development-only check route in the development server, THE Scaffold SHALL render exactly one Recharts chart containing exactly 5 hard-coded sample data points, with no network requests for chart data, and the page SHALL log zero console errors.
6. IF the Recharts chart on the check route fails to render, THEN THE Scaffold SHALL display a visible error message on the route in place of the chart.
7. WHEN a production build runs, THE Scaffold SHALL complete the build with exit code 0, and the development-only check route SHALL be absent from the build output and SHALL return a not-found response when requested from the production server.

### Requirement 8: Linting and formatting

**User Story:** As a developer, I want ESLint and Prettier configured, so that code style is consistent across the team.

#### Acceptance Criteria

1. THE Scaffold SHALL configure ESLint with the Next.js rule set and the TypeScript rule set, so that ESLint parses and lints `.ts` and `.tsx` files without parser errors.
2. THE Scaffold SHALL include a committed Prettier configuration file at the repository root that Prettier loads without errors.
3. THE Scaffold SHALL configure ESLint so that running `lint` on the Scaffold reports zero rule violations that conflict with Prettier formatting output.
4. THE Scaffold SHALL define `lint`, `format`, and `format:check` scripts in `package.json`, where `lint` runs ESLint, `format` writes Prettier formatting changes to files, and `format:check` reports files that differ from Prettier formatting without modifying them.
5. WHEN the `lint` script runs on the Scaffold, THE Scaffold SHALL report zero errors and exit with code 0.
6. WHEN the `format:check` script runs on the Scaffold, THE Scaffold SHALL report zero formatting differences and exit with code 0.
7. IF the `lint` script finds one or more errors, THEN THE Scaffold SHALL exit with a non-zero code and list each error with its file path and line number.
8. IF the `format:check` script finds one or more files that differ from Prettier formatting, THEN THE Scaffold SHALL exit with a non-zero code, list each differing file path, and leave all files unmodified.
9. WHEN the `format` script runs on the Scaffold, THE Scaffold SHALL rewrite every differing file to Prettier formatting, so that a subsequent `format:check` run reports zero formatting differences.

### Requirement 9: Quality gate and scripts

**User Story:** As a developer, I want one set of commands that verifies the project, so that every spec can confirm nothing is broken.

#### Acceptance Criteria

1. THE Scaffold SHALL define `dev`, `build`, `start`, `lint`, `format`, `format:check`, `typecheck`, and `check` scripts in `package.json`, each of which is a non-empty command string.
2. WHEN the `typecheck` script runs on the Scaffold, THE Scaffold SHALL report zero TypeScript errors and exit with code 0.
3. WHEN the `build` script runs on the Scaffold, THE Scaffold SHALL complete a production build with zero errors and exit with code 0.
4. WHEN the `lint` script runs on the Scaffold, THE Scaffold SHALL report zero lint errors and exit with code 0.
5. WHEN the `format:check` script runs on the Scaffold, THE Scaffold SHALL report zero files that do not conform to the configured formatting rules and exit with code 0.
6. WHEN the `check` script runs, THE Scaffold SHALL run `lint`, `format:check`, and `typecheck` in that order, one at a time.
7. IF any script run by `check` exits with a non-zero code, THEN THE Scaffold SHALL skip the remaining scripts, and `check` SHALL exit with a non-zero code.
8. THE Scaffold SHALL document each script defined in criterion 1 in the repository `README.md`, with one entry per script that states the script name and a purpose description of 1 to 200 characters.

### Requirement 10: Excluded technology

**User Story:** As a team lead, I want out-of-scope technology kept out of the project, so that scope stays inside the decisions in the Master_Document.

#### Acceptance Criteria

1. THE Scaffold SHALL contain zero service worker files, zero web app manifest files, and zero PWA tooling packages (including Serwist and next-pwa) in the source tree and in the dependency list of `package.json`.
2. THE Scaffold SHALL contain zero database client packages, zero authentication library packages, zero API route files, and zero server action definitions in the source tree and in the dependency list of `package.json`.
3. THE Scaffold SHALL contain zero machine-learning library packages in the dependency list of `package.json` and zero imports of such libraries in the source tree.
4. THE Scaffold SHALL contain zero stylesheet files other than the Global_Tokens_File and zero CSS-in-JS library packages in the dependency list of `package.json`.
5. THE Scaffold SHALL contain zero `style` attributes in component source files, except a `style` attribute whose value is computed at runtime and that has a code comment on the line immediately above it stating why the value is dynamic.

### Requirement 11: Steering files

**User Story:** As a team member, I want persistent steering files derived from the Master_Document, so that the coding agent follows the same decisions in every session.

#### Acceptance Criteria

1. THE Project SHALL contain `.kiro/steering/product.md` with the purpose, product concept, scope, and decision-support positioning, copied or condensed from sections 1, 2, and 4 of the Master_Document, such that each of those three sections has at least one corresponding heading or paragraph in the file.
2. THE Project SHALL contain `.kiro/steering/tech.md` with the stack, architecture rules, styling rules, and code conventions, copied or condensed from sections 13.1, 13.2, 13.3, and 13.7 of the Master_Document, such that each of those four sections has at least one corresponding heading or paragraph in the file.
3. THE Project SHALL contain `.kiro/steering/structure.md` with the folder layout from section 13.4 and the simulation groups from section 11.1 of the Master_Document, such that every folder and every simulation group listed in those sections appears in the file.
4. THE Steering_Files SHALL include each of the following seven agent instructions from section 15.3 of the Master_Document as a separate, individually identifiable statement: (a) no PWA, (b) no backend, (c) no ML, (d) no custom CSS, (e) no health logic in components, (f) no invented thresholds or sources, (g) no `Math.random()`. THE Steering_Files SHALL also include the instructions that tests are placed alongside domain functions and that the agent asks the user when a requirement is ambiguous.
5. THE Steering_Files SHALL state that `docs/PROJECT.md` is the source of truth. IF a chat message conflicts with `docs/PROJECT.md`, THEN THE Steering_Files SHALL instruct the coding agent to stop and ask the user which one applies before making any change based on either.
6. THE Steering_Files SHALL state that all thresholds are draft values carrying verification flags. IF a value carries the verification flag C, THEN THE Steering_Files SHALL instruct the coding agent not to present that value as fact in any user-facing text or code comment.
7. THE Steering_Files SHALL each declare always-included inclusion in their front matter, so that the three files (`product.md`, `tech.md`, `structure.md`) are loaded in every agent session without manual selection.

### Requirement 12: Disclaimer and content integrity

**User Story:** As a team lead, I want the decision-support notice present from the first screen, so that the product positioning is never missing.

#### Acceptance Criteria

1. THE Scaffold SHALL provide a shared footer component in `src/components/` that displays the Disclaimer_Notice.
2. WHEN any route is rendered, THE root layout SHALL render the footer component exactly once in the initial HTML response, without requiring user interaction, scrolling, or dismissal.
3. THE Disclaimer_Notice SHALL contain text stating all three of the following: that the application is decision support, that it is not a diagnostic device, and that it uses synthetic data and draft thresholds.
4. THE Disclaimer_Notice text SHALL be defined as a single string constant in `src/data/` and referenced by every component that displays it, with zero duplicate copies of the text elsewhere in `src/`.
5. IF the Disclaimer_Notice text is missing or an empty string at build time, THEN THE Scaffold SHALL fail the build with an error identifying the missing Disclaimer_Notice, and SHALL NOT produce a build output without the notice.
6. WHERE the viewport width is between 320 px and 3840 px, THE footer component SHALL display the full Disclaimer_Notice text without truncation, clipping, or hiding it behind a control.
