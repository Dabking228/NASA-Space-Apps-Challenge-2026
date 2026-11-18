# Implementation Plan: Frontend App

## Overview

This plan builds the UI on top of the finished engine (`src/domain/`), data (`src/data/`) and simulation (`src/simulation/`). It follows the build-order areas of `design.md` and puts the Mars path first so the app is demonstrable early:

- Area 0, foundations: additive pure helpers, content schemas, content data files, the tier presentation map, shared components and the shadcn additions.
- Area 1, shell and session: stores, persist config, session provider, hydration gate, app providers, layout, shell, error and not-found pages.
- Area 2, dashboard and body map.
- Area 3, check-in and trends.
- Area 4, alerts and escalation.
- Area 5, radiation and countermeasures.
- Area 6, director and demo.
- Area 7, about, polish and delivery.

The language is TypeScript in strict mode, with Zod 4 schemas at every boundary. Read `design.md` (FD-1 to FD-19, Architecture, Components, Data Models) and `requirements.md` (Requirements 1 to 49 and the Open Questions) before any task. Each task names the requirement numbers it satisfies. Tasks are run one at a time by separate agents, so each one lists its files, exports, checks and the sections to read.

The project has no test runner (`.kiro/steering/tech.md`, FD-18). No task adds a test, a test file, a test script or a test package, and no task changes `package.json` or `package-lock.json`. The shadcn CLI adds component files only. For that reason there are no optional (`*`) tasks and no property-test tasks. The 34 Correctness Properties of the design are kept true by these mechanisms, and each task names the one that supports its property:

- strict types, `satisfies`, `Record` tables over full unions and `never` checks in every `switch`;
- Zod schemas at boundaries (content files at module load, persisted store data when read, event payloads in the edit log, escalation summaries);
- pure, deterministic helpers in `src/domain/` and `src/simulation/`, with no clock and no unseeded random source;
- `npm run check` (lint, format check, typecheck) and `npm run build`;
- the documented Import_Search and Search_Check commands, written out as concrete commands in the final checkpoint (task 27);
- the Manual_Checklist of 14 checks, also written out in task 27.

Rules that apply to every task:

- **Layers (`structure.md`, FD-1 to FD-4).** Files under `src/store/` hold plain, serialisable data and setters and import nothing from `src/simulation`, `src/features` or `src/components`. Files under `src/components/` receive all text through props and import nothing from `src/store`, `src/features` or `src/data` (the existing `disclaimer-footer.tsx` is the only exception). Files under `src/features/` read engine data and content only through the context hooks of `src/features/session/` and never import `src/data`. Only `src/app/app-providers.tsx` imports engine data and content from `src/data/`, and `src/app/about/page.tsx` imports `DISCLAIMER_NOTICE` from `src/data/disclaimer.ts` and nothing else. New files in `src/domain/` and `src/simulation/` are pure and additive. No existing file in those two folders is edited, and no `eslint` file, `docs/PROJECT.md` or steering file is edited.
- **Feature layout.** Feature folders are flat: all files sit directly in `src/features/<name>/`, and a file imports its own siblings with `./name`. A feature imports another feature only through `@/features/<name>` (its `index.ts`), never through a sub-path and never with `../`. The only allowed edges are: `alerts`, `trends`, `escalation`, `countermeasures`, `director`, `about`, `check-in` and `radiation` may import `session`; `check-in` may also import `alerts`; `radiation` may also import `trends`; `body-map` may import `session`, `alerts` and `trends`; `dashboard` may import `session`, `body-map` and `alerts`; `shell` may import `session` and `director`. `session` imports no feature. These edges form no cycle. Every feature has an `index.ts` that exports its public parts.
- **Pages.** Every `page.tsx` is a thin server file that exports `metadata` (a distinct title) and renders one client view imported from the feature `index.ts`. No page reads a store or calls the engine.
- **Next.js.** `AGENTS.md` says this Next.js version differs from older ones. Before writing code that uses a Next.js API, read the matching guide under `node_modules/next/dist/docs/` (find it with `fileSearch`). Known differences from the design research: `error.tsx` gets `error` and `retry` (not `reset`) and is a Client Component; the globals `LayoutProps` and `PageProps` replace hand-written prop types; `cacheComponents` is on, so visited routes stay mounted and hidden and effects clean up when a route is hidden; `metadata` works only in Server Components; chart components load with `next/dynamic`. No `useSearchParams` anywhere (FD-5, Requirement 12.10).
- **Code rules.** No `any`. No `as` assertion to silence a type error. No `Math.random`, `Date.now`, `new Date(` or `toLocaleString` in render code or in any file under `src/features`, `src/components`, `src/store`, `src/app` or `src/lib`. No `localStorage` or `sessionStorage` outside `src/store/persist-config.ts`. No literal colour (hex, `rgb()`, `hsl()`, `oklch()`). No `style=` without the required comment on the line above. No Tailwind colour class that names a tier word with a shade (`bg-red-500`). No `fetch(`, `'use server'`, `route.ts`, manifest or service worker. Every `switch` over a union ends with a `never` check, and every table keyed by a union is a `Record` over the full union. Types and fields are `readonly` where the language allows.
- **Content.** Content files are typed with `satisfies` against the schema type and parsed with Zod at module load through the helper of task 3.3, so a bad file throws a message that names the file and field. Every `sources` array stays empty and no entry is added to `approvedSourceIds`. Text fields hold no clinical number, dose, drug name or threshold. A value with verification flag C is never written as fact and carries the Draft marker where it is shown. Proposed defaults are marked in a comment and in a field.
- **Housekeeping.** Delete the `.gitkeep` of a feature folder in the same task that adds its first real file. Prettier uses `endOfLine: auto` (already set), and every task ends with `npm run check` passing. `.kiro` is not format-checked. Do not start `npm run dev` or `npm run start` from a task; those are manual steps listed in task 27.
- **Stop and ask.** If a shadcn component needs a package that is not installed, or the CLI changes `package.json`, stop and ask the user before going on (FD-19). If a requirement is ambiguous, ask.

## Tasks

- [x] 1. Pure domain helpers (additive files in `src/domain/`)
  - [x] 1.1 Create the trend helper in `src/domain/trends/`
    - Read `src/domain/evaluate-input.ts` (`EvaluationResult`, `DayState`), `src/domain/baseline/compute-baseline.ts` (`Baseline`: `mean`, `sd`, `source` of `seed` or `window`) and `src/domain/rules/classification-types.ts`.
    - Create `classification-for.ts` exporting `classificationFor(source, catalog, indicatorId)` where `source` is `{ classifications }` (an `EvaluationResult` or one `DayState`). It returns `Result<Classification, DomainError>` by the position of the id in the catalog indicators sorted by id (a `no-data` entry has no id, so its position is the key). An unknown id returns `{ code: 'unknown-indicator', indicatorId, message }`.
    - Create `trend-series.ts` exporting `buildTrendSeries({ result, readings, astronautId, catalog, config, indicatorId, fromDay, toDay })` returning `Result<TrendSeries, DomainError>`. One entry per Mission_Day in range with: `day`, optional `value` and `quality` (a missing reading gives an entry with no value), `tier` or `undefined` for `no-data`, `baselineMean`, `bandLower`, `bandUpper` (mean minus and plus `yellowSd` times `sd`, where `yellowSd` is `definition.deviation?.yellowSd ?? config.deviationDefaults.yellowSd`), `frozen` from `DayState.frozen`, `baselineSource` from `Baseline.source`, `floorPending` from `definition.deviation?.minAbsoluteChange === null`. A day with no baseline has no band edges and no mean. The series also returns `limits`: the orange and red hard limits of the definition as `{ tier, op, value }`, and the `unit`, `label` and `validRange` for display.
    - The Tier of each point is read from the classification. No number is compared with a threshold. The helper returns new arrays, never mutates its arguments, reads no clock and throws nothing.
    - Supports Properties 1, 2 and 13 by purity and by the `Result` type.
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.8, 1.9, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 1.2 Create the radiation helper in `src/domain/radiation/`
    - Create `radiation-figures.ts` exporting `computeRadiationFigures({ readings, astronautId, day, environment, catalog, careerDoseBeforeMissionMsv, alerts })`. It returns `doseRateMultiple` (the `dose-rate` reading of `day` divided by `environment.backgroundDoseRateMsvPerDay`), `projectedMissionDoseMsv` (the `career-effective-dose` reading of `day`), `allowanceShare` (projected dose divided by `careerLimitMsv` of the catalog minus `careerDoseBeforeMissionMsv`), `solarParticleEventActive` (an `AlertReport` of kind `solar-particle-event` with `startDay <= day <= endDay`) and a `problems` list of `DomainError`.
    - An absent reading gives an absent figure. A remaining allowance of zero or less gives no share and an `invalid-input` problem naming the field. The helper returns no Tier.
    - Supports Property 3 by purity and by types.
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 1.3 Create the check-in entry schemas and overlay in `src/domain/check-in/`
    - Create `entry-schema.ts` with Zod schemas and inferred types for `ReadingEntry` (`scenarioId`, `astronautId`, `day`, `indicatorId`, `value`, `quality`) and `SymptomEntry` (`scenarioId`, `astronautId`, `day`, `kind`), using `QualityFlagSchema`, `SymptomKindSchema` and `MissionDaySchema` from `src/domain/schemas/`. The Entries store reuses these schemas.
    - Create `apply-entries.ts` exporting `applyEntries({ readings, symptoms, astronautId, scenarioId, readingEntries, symptomEntries })`. It returns new `readings` and `symptoms` lists: a reading with equal astronaut, day and indicator is replaced by the entry value and quality; an entry with no matching reading is added; a symptom entry is added unless an equal report exists; entries of another scenario or another astronaut are ignored. The astronaut parameter is an API detail the requirement leaves open: the session calls the helper once per astronaut with that astronaut's records.
    - The input lists are never mutated. Applying the same entries twice gives the same result as once.
    - Supports Properties 4 and 5 by construction (replace by key, set semantics) and by types.
    - _Requirements: 1.1, 1.4, 1.9, 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

  - [x] 1.4 Create the evaluation comparison in `src/domain/check-in/`
    - Create `compare-evaluations.ts` exporting `compareEvaluations(before, after, catalog)` for two `EvaluationResult` values of the same day. It returns, per indicator, the Tier before and after (both may be `undefined` for `no-data`) and whether it changed, plus `newFindings` (in `after` only, by finding id) and `removedFindings` (in `before` only). Use `classificationFor` from task 1.1.
    - Comparing a result with itself gives no change, no new and no removed finding. The two finding lists are disjoint.
    - Supports Property 6 by construction.
    - _Requirements: 1.1, 1.4, 4.6, 4.7, 26.1_

  - [x] 1.5 Create the escalation summary schema and builder in `src/domain/escalation/`
    - Create `summary-schema.ts` with `EscalationSummarySchema` (`z.strictObject`, no `transform`, `preprocess` or `catch`) and the inferred type. Sections: `who` (astronaut id and label) and `when` (Mission_Day), `environment` (label and `durationDays`), `findings` (each with id, Tier, confidence, reason, actions), `trends` (for each contributing indicator: id, label, unit, baseline mean and latest reading, both optional), `context` (symptom kinds reported, recent event labels as plain text, ground link state as plain text) and `actionsTaken` (completed countermeasure titles and the number of check-ins already done).
    - Create `build-summary.ts` exporting `buildEscalationSummary(input)` returning `{ summary, problems }`. The input is the `EvaluationResult`, the catalog, the chosen finding ids and the context values listed above, all supplied by the caller. A chosen id that is not in the result is left out and reported as a problem that names it. The caller supplies the event labels and countermeasure titles as plain text. The builder reads no clock, adds no advice and returns a value that parses with the schema.
    - Supports Property 7 by the schema (a JSON round trip parses to an equal value) and by purity.
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 1.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 1.6 Create the engagement helper in `src/domain/engagement/`
    - Create `completion-schema.ts` with the Zod schema and type for `Completion` (`scenarioId`, `astronautId`, `day`, `taskId`). The Engagement store reuses it.
    - Create `engagement-figures.ts` exporting pure functions over a completion list, a list of daily task ids and the current day: `isDayComplete`, `currentStreak` (the run of complete days ending today, or yesterday when today is incomplete), `bestStreak` (longest run from day 0 to today), `crewGoalShare` (crew members with a complete current day divided by crew size, with the number of members), `weeklyStrip(n)` (completion of the last `n` days) and `targetMet(share, target)`. Nothing is stored. No clock.
    - Supports Property 8 by purity and by types.
    - _Requirements: 1.1, 1.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [x] 2. Pure simulation helpers (additive files in `src/simulation/`)
  - [x] 2.1 Create the link timing helper in `src/simulation/escalation/`
    - Read `src/simulation/engine/seeded-random.ts` (`createSeededRandom(seed, { clip, maxDraws })`, `uniform(key, stream)`), `engine/problem.ts` (`makeProblem`) and `engine/run-schema.ts`.
    - Create `link-timing.ts` exporting: `chooseOneWayDelaySeconds({ scenarioSeed, messageId, range, demoDelaySeconds, noise })` returning `Result<number, readonly SimulationProblem[]>` (a whole number of link-seconds from `min` to `max` using `uniform(['escalation-delay', messageId], 0)`, or `demoDelaySeconds` when `range` is `null`); `messageStage(message, linkClockSeconds)` over `{ startedAtLinkSeconds: number | null, oneWayDelaySeconds: number }` giving `queued`, `transmitting`, `delivered` or `reply-received` (queued while no start, transmitting from the start, delivered from start plus one delay, reply from start plus two delays, no processing time); `nextStageAtSeconds(message)`; and `replyIdForTier(tier)` as a `Record<Tier, ScriptedReplyId>`. Import the `MessageStage` and `ScriptedReplyId` types from `@/domain/content/escalation-schema` (task 3.2 defines them there, because the domain may not import the simulation). The stage type is a closed union and every `switch` over it ends with a `never` check.
    - No clock, no unseeded random, no state.
    - Supports Properties 9, 10, 11 and 25 by purity, by the `Record` and by the monotone threshold form of `messageStage`.
    - _Requirements: 1.2, 1.4, 1.5, 1.8, 1.9, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [x] 2.2 Create the teammate simulator in `src/simulation/teammates/`
    - Create `simulate-teammates.ts` exporting `simulateTeammates({ scenarioSeed, day, crewIds, selectedAstronautId, dailyTaskIds, completionProbability, noise })`. It returns completions (`astronautId`, `taskId`, `day`) for crew members other than the selected one, only for the passed task and crew ids. Each choice is `uniform([crewId, taskId, day], 0) < completionProbability` from `createSeededRandom`. Return `Result` with the problem list when the seed is invalid.
    - Supports Property 12 by purity and by construction.
    - _Requirements: 1.2, 1.4, 1.5, 1.8, 1.9, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 3. Content schemas and content data files
  - [x] 3.1 Create the first group of content schemas in `src/domain/content/`
    - Create schema files holding Zod schemas and inferred types only, with no logic (`z.strictObject`, no `transform`, `preprocess` or `catch`): `app-defaults-schema.ts` (start scenario id, start astronaut id, start day, `linkTimeScale`, `activeFindingsShown`, each with a `source` of `project-doc` or `proposed-default` where PROJECT.md gives no value), `navigation-schema.ts` (route, label, short description, icon name, `inNav`), `engagement-schema.ts` (`crewGoalTargetShare`, `weeklyStripLength`, `streakRuleText`, `teammateCompletionProbability`, each marked as proposed default), `body-regions-schema.ts` (a `Record` keyed by the full `BodySystem` union: label, function text, `leadIndicatorId`, `mapRegionId`, `verification`, `sources`) and `hazards-schema.ts` (a `Record` keyed by the full `Hazard` union: label, short description, `verification`, `sources`).
    - Every `sources` is an array of `SourceReferenceSchema` and the content files keep it empty. Reuse `VerificationFlagSchema`.
    - _Requirements: 1.1, 1.7, 9.2, 9.4, 9.5, 9.10, 9.12, 41.4_

  - [x] 3.2 Create the second group of content schemas and the aggregate type
    - Create `check-in-schema.ts` (step id, indicator ids, title, numbered instructions, field labels and units, per-step `verification` and empty `sources`, symptom labels as a `Record` over the full `SymptomKind` union, the fixed emergency note text; no safety-flag field), `countermeasures-schema.ts` (id, title, why, how steps, `system`, `daily`, `suggestedWhen`, optional `environments`, `verification`, `sources`; at least one task has `daily` set, checked by a `refine`), `escalation-schema.ts` (exports `ScriptedReplyIdSchema` = `reply-green`, `reply-yellow`, `reply-orange`, `reply-red` and `MessageStageSchema` = `queued`, `transmitting`, `delivered`, `reply-received` with their inferred types; ISS demo delay in link-seconds, scripted reply texts as a `Record` over `ScriptedReplyId`, stage labels as a `Record` over `MessageStage`, blackout wording as a `Record` over `conjunction` and `signal-gaps`, summary section titles, queue wording), `radiation-schema.ts` (shelter steps with no numbers, explanatory text for dose rate and career dose, draft wording), `director-presets-schema.ts` (id, label, `payload` as a plain record with a `type` string and no `day`, `origin` of `from-scenario` or `proposed-default`) and `about-schema.ts` (plain statements, flag explanations for A, B and C, how-it-works steps, reading list entries with title and URL).
    - Create `app-content.ts` exporting the `AppContent` type that gathers all eleven content shapes. The Session provider receives it as a prop.
    - _Requirements: 1.1, 1.7, 9.2, 9.5, 9.6, 9.7, 9.8, 9.10, 9.11, 9.12, 41.4_

  - [x] 3.3 Create the parse helper and the first three content files in `src/data/`
    - Create `src/data/content-parse.ts` exporting `parseContent(fileName, schema, value)`. It runs `schema.safeParse` and, on failure, throws an `Error` whose message names the file and each field path (the same style as `src/data/indicators/index.ts`). This is the one place a content file may throw, so the dev server and the build stop (Requirement 9.3, error scenario 7).
    - Create `app-defaults.ts` (scenario `mars-transit-30d`, astronaut `aria`, day 9, `linkTimeScale` 120, `activeFindingsShown` 3, each marked proposed default where PROJECT.md gives no value), `navigation.ts` (dashboard, check-in, trends, alerts, escalation, radiation, countermeasures with `inNav: true`; about with `inNav: true`; director with `inNav: false`) and `engagement.ts` (target share, strip length 7, streak rule text, teammate probability, all marked proposed default).
    - Each file is typed with `satisfies` against the schema type and exports the value returned by `parseContent`.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.10, 9.12, 13.15, 16.2, 18.6, 22.5, 41.4_

  - [x] 3.4 Create `body-regions.ts` and `hazards.ts` in `src/data/`
    - `body-regions.ts`: one entry for each of the six body systems with a plain-language function text, the lead indicator (first indicator of the system in the catalog: `resting-hr` for cardiovascular, `exercise-adherence` for musculoskeletal, none usable for vision so use the empty-lead form the schema allows, `reaction-time` for mental, `sleep-hours` for sleep; read `src/data/indicators/mapping.ts` for the real system of each indicator and use it), the map region id, `verification` `B` (or `C` where the text touches a space-specific claim) and `sources: []`.
    - `hazards.ts`: one entry for each of the five hazards with a short plain description, `verification` and `sources: []`. No number, dose or drug in any text.
    - _Requirements: 9.1, 9.5, 9.9, 9.10, 9.12, 21.2, 21.4, 41.1_

  - [x] 3.5 Create `check-in.ts` and `countermeasures.ts` in `src/data/`
    - `check-in.ts`: three measurement steps (resting heart rate; blood pressure with systolic and diastolic fields; mood on a 1 to 5 scale), each with numbered plain instructions, field labels and units; the optional symptom step; labels for every symptom kind; the emergency note for chest pain and fainting that tells the user to follow emergency procedures and tell the crew now. Steps that carry a flag C value show it through `verification`. No safety-flag input, no diagnosis, no drug, no dose, no clinical number.
    - `countermeasures.ts`: at least six tasks across the body systems (for example a daily exercise session, a sleep routine, hydration, a social check-in, a posture and stretch routine, a plain eye-comfort habit), each with why, how steps, `system`, `daily`, `suggestedWhen`, `verification` and `sources: []`. At least two are `daily`. No medication, dose or number.
    - _Requirements: 9.1, 9.6, 9.7, 9.9, 9.10, 9.11, 9.12, 23.2, 23.7, 25.2, 25.3, 25.6, 34.1, 34.6, 43.7, 43.8_

  - [x] 3.6 Create `escalation.ts` and `radiation.ts` in `src/data/`
    - `escalation.ts`: ISS demo delay in link-seconds (proposed default), one scripted reply per tier (each says it is a scripted demo reply, gives no medical advice and asks the crew to continue the steps shown and report changes), stage labels for queued, transmitting, delivered and reply received, blackout wording for `conjunction` and `signal-gaps`, the queue wording "Link unavailable. Messages wait in the queue.", and the summary section titles.
    - `radiation.ts`: shelter checklist steps with no numbers that point to the escalation page, plain explanations for dose rate and career dose that state no limit as a fact, and draft-marker wording.
    - _Requirements: 9.1, 9.9, 9.10, 9.12, 31.1, 32.2, 32.3, 32.7, 33.3, 33.6, 41.4, 43.4, 43.9_

  - [x] 3.7 Create `director-presets.ts` and `about.ts` in `src/data/`
    - `director-presets.ts`: presets for sleep drift, mood dip, solar particle event, EVA, treadmill outage and headache with payload values copied from the shipped scenarios (read `src/simulation/scenarios/mars/mars-transit-30d.ts`, `iss/iss-early-adaptation-30d.ts` and `lunar/lunar-dust-eva-14d.ts`, origin `from-scenario`); `co2Spike` and `commsBlackout` with origin `proposed-default`. Payloads hold the event `type` and parameters and no `day` (the day field adds it).
    - `about.ts`: plain statements (decision support, synthetic data, draft thresholds), explanations of flags A, B and C in the sense of PROJECT.md section 6.1, the six-step core loop and the personal baseline in plain language, and the Reading_List of the NASA Human Research Program pages named in PROJECT.md section 1 (title and URL; read `docs/PROJECT.md` for the exact names and URLs and invent none). The decision-support text is not copied here.
    - _Requirements: 9.1, 9.8, 9.9, 9.10, 9.12, 37.11, 37.15, 39.4, 39.5, 39.11, 39.13, 39.14, 41.2, 41.4, 43.4_

- [x] 4. Tier presentation map and shared components
  - [x] 4.1 Add the shadcn components
    - Run the shadcn CLI from the project root to add `sheet`, `tabs`, `select`, `checkbox`, `progress`, `slider`, `separator`, `skeleton`, `alert`, `scroll-area`, `dialog` and `toggle-group` to `src/components/ui/` (for example `npx shadcn add sheet tabs select checkbox progress slider separator skeleton alert scroll-area dialog toggle-group`). Do not overwrite the existing `button`, `card`, `badge` or `tooltip`: answer no to every overwrite prompt.
    - Afterwards run `git diff --stat -- package.json package-lock.json`. It must be empty. If the CLI changed either file or a generated component imports a package that is not installed (check against `package.json`), stop and ask the user before going on (FD-19). If lint rejects a generated file, change class names in that file minimally and add no `eslint-disable`.
    - Confirm every generated file compiles against `@base-ui/react` 1.9.0 with `npm run typecheck`.
    - _Requirements: 11.8, 11.9, 48.2, 48.3_

  - [x] 4.2 Create `src/components/tier-presentation.ts` and update `tier-badge.tsx`
    - Export `TIER_PRESENTATION` as a `Record` keyed by the full `Tier` union plus the string `'no-data'`: for each key a `status-*` token class pair (`bg-status-green text-status-green-foreground` and the other three; neutral `bg-muted text-muted-foreground` for `no-data`), a `lucide-react` icon (keep the current icons: `CircleCheck`, `Eye`, `TriangleAlert`, `OctagonAlert`; use a dashed-circle icon such as `CircleDashed` for `no-data`) and a plain label (keep `Normal for you`, `Drifting`, `Concerning`, `Act now`; `No data yet`). Also export, for each key, a `fill` class for the body map (`fill-status-*`) and a `cssVar` string for charts (`var(--status-green)` and so on, `var(--muted-foreground)` for `no-data`), so chart files never name a `status-*` token themselves. Export a helper `presentationFor(tierOrNoData)`.
    - Change `tier-badge.tsx` to read the map and accept `Tier | 'no-data'`. Keep its look. The status token classes now appear only in the map (plus the chart and dev chart files that use `var(--status-*)`).
    - Supports Requirements 10.2 by the `Record` type and Requirement 42.1 by the Search_Check of task 27.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6, 41.6, 42.1_

  - [x] 4.3 Create `confidence-badge.tsx` and `verification-marker.tsx` in `src/components/`
    - `ConfidenceBadge`: props `confidence`; shows an icon and the text "Confidence: medium" (a `Record` over the full `Confidence` union).
    - `VerificationMarker`: props `flags: readonly VerificationFlag[]`, `sourceCount: number`, optional `subject` text. Shows the "Unverified" badge when `process.env.NODE_ENV !== 'production'` and `sourceCount === 0`, the "Draft value" marker whenever `flags` includes `C` (every build), and a tooltip (existing `tooltip`) that says no source has been supplied when `sourceCount` is 0. Text arrives through props or constants in the file; no `src/data` import. `process.env.NODE_ENV` is inlined at build time, so server and client output are equal.
    - Supports Property 32 by construction (two boolean conditions) and by the build-time constant.
    - _Requirements: 11.1, 11.2, 11.7, 43.1, 43.2, 43.3, 43.5_

  - [x] 4.4 Create `page-header.tsx`, `notice-banner.tsx`, `empty-state.tsx` and `skeletons.tsx` in `src/components/`
    - `PageHeader`: props `title`, `purpose`, optional `actions` (children). Renders the one `h1` of the page and a one-line purpose.
    - `NoticeBanner`: props `tone` (`neutral`, `warning`, `error`), `message`, optional `action` (label and `onClick` or `href`), optional `onDismiss`. Uses the shadcn `alert`; each tone has an icon and text (a `Record` over the tone union). Plain text only, never a stack trace.
    - `EmptyState`: props `title`, optional `detail` and `tier` (renders the green tier style with icon and text when `tier` is `green`), fixed minimum height.
    - `skeletons.tsx`: `MainSkeleton` and `ContextBarSkeleton` with fixed sizes (shadcn `skeleton`), so the layout does not jump while stores hydrate.
    - _Requirements: 11.1, 11.3, 11.4, 11.5, 11.7, 22.9, 29.4, 46.11, 47.1_

  - [x] 4.5 Create `src/components/chart-error-boundary.tsx`
    - A class component (a shared version of the local one in `src/app/dev/chart-check/chart-check.tsx`, which stays unedited) with props `children` and optional `message`. On a render error it shows a `NoticeBanner` (tone `error`) in place of the chart and a "Try again" action that clears the error state.
    - _Requirements: 11.6, 28.11, 46.6_

- [~] 5. Checkpoint - Area 0 foundations
  - Run `npm run check` and fix every failure. Ensure all checks pass, ask the user if questions arise.
  - Confirm `git status --porcelain -- src/domain src/simulation` lists only new files (`??`), none modified.

- [x] 6. Stores and persist config (Area 1)
  - [x] 6.1 Create `src/store/persist-config.ts`
    - Read `node_modules/zustand/middleware/persist.d.mts` (Zustand 5.1.0: `skipHydration`, `rehydrate`, `hasHydrated`, `onFinishHydration`, `partialize`, `version`, `migrate`, `merge`, `onRehydrateStorage`, `createJSONStorage` can return `undefined`).
    - This is the only file that mentions `localStorage` or `sessionStorage`. Export `STORE_KEY_PREFIX = 'health-companion'`, `storeKey(name, version)` returning `health-companion.<name>.v<version>`, `safeStorage()` (returns a Zustand `StateStorage` built in a `try` that touches `window.localStorage`, and returns `undefined` or a memory fallback when storage is missing, blocked or full; a failed write is reported through a callback, not thrown), and `basePersistOptions` (`skipHydration: true`).
    - Export a `StorageProblem` type (`'none' | 'unreadable' | 'write-failed'`) and a helper `parseStored(schema, persisted, current)` that returns `{ ...current, ...parsed }` on success and `{ ...current, storageProblem: 'unreadable' }` on a Zod failure or a non-object value. A version other than the current one must reach `merge` as an invalid value (give `migrate` a function that returns `undefined`-like data), so it is discarded and flagged, never half-used.
    - Nothing is written before the store's own rehydration finishes (Requirement 45.10): add the guard here (for example `setItem` is a no-op until the store's `hasHydrated()` is true) and document how a store uses it.
    - Supports Property 33 by Zod parsing and the sentinel migrate.
    - _Requirements: 14.1, 14.10, 15.2, 44.1, 44.2, 45.1, 45.2, 45.3, 45.7, 45.10, 45.13_

  - [x] 6.2 Create `src/store/session-store.ts`
    - State: `baseScenarioId: string`, `editLog: readonly Edit[]`, `astronautId: string`, `day: number`, `hydrated: boolean` (not saved), `storageProblem`. `Edit` is a union with a stable `id: string`: `{ kind: 'inject-event'; payload: Readonly<Record<string, unknown>> }` (an unvalidated plain object), `{ kind: 'switch-environment'; environmentId: string }` and `{ kind: 'switch-crew'; astronautIds: readonly string[] }`. A `switch` over `kind` ends with a `never` check.
    - Setters: `setBaseScenario(scenarioId, astronautId, day)` (clears the edit log), `setAstronaut`, `setDay`, `appendEdit`, `removeEdit(id)`, `resetToStart(defaults)`, `markHydrated`. Defaults for server and client are fixed placeholder values (`baseScenarioId` from a constant passed in is not available here: use the neutral initial value `''` and let the provider apply the start state after hydration, Requirement 13.15).
    - Persist with `persist`, key `health-companion.session.v1`, `version: 1`, `partialize` saving only the four listed fields, a Zod schema (`z.strictObject`) validated in `merge` through `parseStored`. No import from `src/simulation`, `src/features` or `src/components`.
    - Supports Properties 15 (the setter keeps `day` a whole number), 18 and 33.
    - _Requirements: 14.2, 14.3, 14.4, 14.5, 14.10, 45.1, 45.2, 45.3, 45.4, 45.5_

  - [x] 6.3 Create `src/store/entries-store.ts` and `src/store/engagement-store.ts`
    - `entries-store.ts`: holds `readings: readonly ReadingEntry[]` and `symptoms: readonly SymptomEntry[]` (schemas from `@/domain/check-in/entry-schema`). `saveReading(entry)` replaces any entry with the same `scenarioId`, `astronautId`, `day` and `indicatorId`, else appends; `saveSymptoms` replaces the symptom set of one scenario, astronaut and day; `clear()`. Persist as `health-companion.entries.v1`. Entries of other scenarios are kept (dormant).
    - `engagement-store.ts`: holds `completions: readonly Completion[]` (schema from `@/domain/engagement/completion-schema`). `markDone(c)` adds if absent, `markNotDone(c)` removes it, `addMany(cs)`, `clear()`. Persist as `health-companion.engagement.v1`. No streak or goal value is stored.
    - Both: `storageProblem` and `hydrated` state not saved; `parseStored` in `merge`.
    - Supports Properties 18 (one entry per key) and 26 (mark done then not done restores the list).
    - _Requirements: 14.6, 14.7, 14.10, 40.11, 45.1, 45.4, 45.5, 45.12_

  - [x] 6.4 Create `src/store/escalation-store.ts`
    - State: `linkClockSeconds: number` (whole link-seconds) and `messages: readonly StoredMessage[]`. `StoredMessage` holds `id`, `snapshotKey` (a string made from the summary JSON so a second send of the same snapshot is rejected), `summary` (typed through `EscalationSummarySchema` from `@/domain/escalation/summary-schema`), `createdDay`, `createdLinkSeconds`, `oneWayDelaySeconds`, `replyId` (the `ScriptedReplyId` type from `@/domain/content/escalation-schema`) and `startedAtLinkSeconds: number | null`. No stage is stored.
    - Setters: `advanceClock(seconds)`, `setClock(seconds)`, `addMessage(message)` (a no-op that returns `false` when a message with the same `snapshotKey` exists), `startMessage(id, linkSeconds)` (sets the start only when it is `null`), `clear()`.
    - Persist as `health-companion.escalation.v1`, same pattern as the other stores.
    - Supports Properties 10 and 24 by storing only the inputs of the derived stage.
    - _Requirements: 14.8, 14.10, 31.5, 31.6, 40.11, 45.1, 45.4, 45.5_

  - [x] 6.5 Create `src/store/ui-store.ts`
    - Not persisted. State: `selectedRegion: BodySystem | null`, `trendIndicatorId: string | null`, `trendRange: 'last-7' | 'last-14' | 'whole'`, `alertTierFilter: Tier | 'all'`, `alertSystemFilter: BodySystem | 'all'`, `preselectedFindingIds: readonly string[]`, `directorOpen: boolean`, `demoSegmentIndex: number | null`, `dismissedNoticeIds: readonly string[]`, and setters for each. Add `resetUi()` for "Reset session". Types come from `@/domain/types` (`Tier`) and `@/domain/schemas/vocabulary` (`BodySystem`).
    - _Requirements: 14.2, 14.9, 20.8, 27.4, 29.3, 36.2, 38.3, 19.2_

- [x] 7. Session feature: provider, replay, hooks (Area 1)
  - [x] 7.1 Create the session context types and content hooks in `src/features/session/`
    - Create `session-types.ts` with `SessionView` (fields `scenario`, `environment`, `durationDays`, `day`, `astronautId`, `run`, `result`, `crewStatus`, `groundLink`, `notices`, `status`), `CrewStatus` (`astronautId`, `label`, `overallTier: Tier | 'no-data'`, `findingCount`, `strongestFindingId`), `Notice` (`id`, `tone`, `message`, optional `action` identifier), `SessionStatus` (`'loading' | 'ready' | 'blocked'`) and `SessionData` (the props of the provider: `catalog`, `clusters`, `config`, `text` and `content: AppContent`).
    - Create `session-context.tsx` (`'use client'`) with `SessionContext`, `SessionDataContext` and `useSessionData()` returning the content and engine data; each hook throws a plain `Error` only for use outside the provider (a programming error, not user data).
    - Create `use-content.ts` with small hooks that return one content value each (`useAppDefaults`, `useNavigation`, `useBodyRegions`, `useHazards`, `useCheckInContent`, `useCountermeasures`, `useEngagementSettings`, `useEscalationContent`, `useRadiationContent`, `useDirectorPresets`, `useAboutContent`), all reading `useSessionData()`.
    - Design note: the real `classificationFor` signature takes the catalog (task 1.1), so hooks pass `useSessionData().catalog`.
    - _Requirements: 12.4, 13.1, 13.2, 15.5, 40.3_

  - [x] 7.2 Create the replay in `src/features/session/replay.ts`
    - Read `src/simulation/scenarios/editor.ts` (`injectEvent(scenario, event, library, context)`, `switchEnvironment(scenario, environmentId, library, context)`, `switchCrew(scenario, ids, library, context)`, each returning `Result<Scenario, readonly SimulationProblem[]>`), `src/simulation/events/event-schemas.ts` (`ScenarioEventSchema`) and `src/simulation/library.ts` (`defaultLibrary`, `SimulationContext`).
    - Export `replayEdits(base, editLog, library, context)` returning `{ scenario, notices }`. For each edit in order: parse an inject payload with `ScenarioEventSchema.safeParse`; on a parse failure or any `SimulationProblem`, leave that edit out of effect, add a notice with each problem `message`, and continue. The log is never rewritten. A `switch` over `edit.kind` ends with a `never` check.
    - Pure function: no React import, no clock. Keep it free of store imports (takes plain arguments).
    - Supports Property 16 by construction.
    - _Requirements: 13.3, 13.4, 37.17, 37.18, 46.2_

  - [x] 7.3 Create the session view computation in `src/features/session/compute-session-view.ts`
    - Export `computeSessionView(args)` as a pure function (no React) over `baseScenario`, `editLog`, `astronautId`, `day`, the entries and the session data. Steps: replay (7.2); resolve the environment from `library.environments`; `runScenario(scenario, library, context, day)` (through the current day only, so no later reading is in memory); on `ok: false` return a `blocked` view with a notice listing the problems and keep the shell usable; apply `applyEntries` (task 1.3) for each astronaut; `buildEvaluationInput(run, id, day, context)` then `evaluateAstronaut` once per crew member; build `crewStatus` (overall Tier is the worst `bodySystems` tier by `worstTier` from `@/domain/tiers`, or `'no-data'` when every system has `status: 'no-data'`; strongest finding by `compareTiers` then confidence by `CONFIDENCE_ORDER`); `groundLinkStatus(env, scenario.events, day)` from `@/simulation/engine/ground-link`; clamp `day` to `0..durationDays - 1` and fall back to the first crew member when the astronaut is not in the crew. Add notices for each `EvaluationResult.errors` entry (as plain text, no raw error objects) and for a failed `buildEvaluationInput`.
    - Also export `dedupeNotices(notices)` (unique by message, first occurrence kept, order kept), `sortFindings(findings)` (by `compareTiers` descending then `CONFIDENCE_ORDER` descending, then id; returns a new array) and `overallTier(bodySystems)`. Views reuse these; they are the only place that orders findings.
    - Supports Properties 14, 17, 19 and 20 by construction and types.
    - _Requirements: 13.5, 13.6, 13.7, 13.8, 13.9, 13.12, 13.13, 17.7, 19.1, 22.3, 22.4, 29.2_

  - [x] 7.4 Create the hydration gate in `src/features/session/stores-hydrator.tsx`
    - Client component. In one `useEffect` after mount, call `rehydrate()` on the four persisted stores, wait with `onFinishHydration` or the returned promise, then set the `hydrated` flag of the session store. The effect cleans up its subscriptions. Nothing reads storage during render.
    - After hydration: if the stored `baseScenarioId` is empty or not in `defaultLibrary.scenarios`, apply the start state from the app defaults (scenario, astronaut, day) and raise the notice "Saved data could not be read, starting fresh." only for an unknown non-empty id (Requirement 45.11); a first run with no stored data raises no notice.
    - Expose `useHydrated()` (reads the session store flag). Expose `useStorageNotices()` that turns each store's `storageProblem` into one notice per problem: "Saved data could not be read, starting fresh." (with a "Reset session" action id) and one notice for a failed write.
    - Supports Properties 33 and 34 together with tasks 6 and 7.6.
    - _Requirements: 13.14, 13.15, 15.1, 15.2, 44.1, 44.5, 45.5, 45.6, 45.9, 45.11_

  - [x] 7.5 Create the provider and selector hooks in `src/features/session/`
    - `session-provider.tsx` (`'use client'`): props `SessionData` and `children`. Reads the stores, passes `day` through `useDeferredValue`, calls `computeSessionView` inside `useMemo` keyed by base scenario, edit log, deferred day, astronaut and entries, merges the storage notices from 7.4, deduplicates, filters the dismissed ids from the UI store, and provides both contexts. `status` is `loading` until hydrated. It renders `StoresHydrator` once.
    - `use-session.ts`: selector hooks that return `{ status: 'loading' }` before hydration and a ready value after: `useSessionStatus`, `useCurrentResult`, `useCrewStatus`, `useFindings` (sorted, with an optional system filter), `useBodySystems`, `useTrendSeries(indicatorId, range)`, `useRadiationFigures`, `useGroundLink`, `useNotices`, `useScenarioInfo` (scenario, environment, duration, day, astronaut label), `useRun`.
    - `use-session-actions.ts`: `useSessionActions()` returning `selectAstronaut`, `nextDay`, `previousDay`, `setDay`, `switchEnvironmentScenario(environmentId)` (loads the library scenario whose `environmentId` matches, clears the log, clamps the day, selects the first crew member when needed; the lunar scenario clamps to day 13) and `resetSession()` (removes the four stored keys through the stores, applies the app defaults, resets the UI store, sets the clock to 0, no reload).
    - Supports Properties 15, 34 and 17.
    - _Requirements: 13.1, 13.10, 13.11, 13.14, 15.5, 15.6, 17.1, 17.3, 17.4, 17.6, 17.7, 19.2, 45.8_

  - [x] 7.6 Create `src/features/session/index.ts`
    - Export `SessionProvider`, `useHydrated` and every hook and type that other features use (`use-session`, `use-session-actions`, `use-content`, `SessionView`, `Notice`, `CrewStatus`) and the pure helpers `sortFindings` and `overallTier`. Do not export internals such as `replay` or `compute-session-view`.
    - Delete no `.gitkeep` here (the `session` folder is new and has none).
    - _Requirements: 12.8, 40.6_

- [ ] 8. App shell and root (Area 1)
  - [~] 8.1 Create `src/app/app-providers.tsx`
    - Client component. The only file that imports engine data and content from `src/data/`: `defaultCatalog`, `defaultClusters`, `defaultConfig` from `@/data/indicators`, `findingText` from `@/data/finding-text`, and each content file from tasks 3.3 to 3.7. It builds the `AppContent` value and renders `SessionProvider` from `@/features/session` with these as props. Module-level constants only; nothing is read from the browser.
    - _Requirements: 12.3, 12.4, 40.4_

  - [~] 8.2 Create the shell header and navigation in `src/features/shell/`
    - Create `app-header.tsx` (client): the app title, a skip link as the first focusable element that moves focus to `#main-content`, and `main-nav.tsx` rendering the links from `useNavigation()` that have `inNav: true`, marking the active page with `aria-current="page"` using `usePathname` and a named `nav` landmark (`aria-label="Main"`). On narrow screens collapse to a menu using the shadcn `sheet` with a visible menu button (44 px target). The director page is not linked. Decorative icons are `aria-hidden`. Read the `next/link` and `usePathname` guides in `node_modules/next/dist/docs/` first.
    - The header, title and navigation must not depend on stored state, so they render the same on the server.
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 44.5, 47.3, 47.4, 47.12_

  - [~] 8.3 Create the context bar, environment switcher, crew selector and day control in `src/features/shell/`
    - `context-bar.tsx` shows the environment name, "Day N of M" (N as the engine numbers it, M the duration), the selected astronaut and a ground link badge with icon and text ("Link available" / "Link unavailable"). While not hydrated it shows `ContextBarSkeleton`.
    - `environment-switcher.tsx` (shadcn `select`): ISS, lunar surface, Mars transit from the library scenarios; calls `switchEnvironmentScenario`.
    - `crew-selector.tsx`: lists the crew of the scenario and shows each member's overall Tier through `TierBadge` (the shared presentation map).
    - `day-control.tsx`: "Previous day" and "Next day" buttons, disabled at the ends, no timer.
    - All controls at least 44 px high at touch width. Everything reads session hooks only.
    - _Requirements: 15.3, 16.7, 16.8, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 42.3, 42.5, 47.12_

  - [~] 8.4 Create the link clock driver, live region and notices list in `src/features/shell/`
    - `link-clock-driver.tsx`: after hydration, an effect sets an interval of 1000 ms that calls `advanceClock(linkTimeScale)` on the escalation store, paused while `document.visibilityState === 'hidden'` (listen to `visibilitychange`), cleared in the effect clean-up. The time scale comes from `useAppDefaults()`. It lives in the shell, so it keeps running when a route is hidden.
    - `live-region.tsx`: one visually hidden `aria-live="polite"` element. A small announcer hook compares the previous and next values of the day, the environment, the finding count, the notice count, the stage of the newest message and the demo caption, and announces each change once. No clock read.
    - `notices-list.tsx`: dismissible `NoticeBanner` list from `useNotices()`, with the engine error count, and a "Reset session" action (confirmation dialog using the shadcn `dialog`, then `resetSession()`).
    - _Requirements: 15.3, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 19.2, 19.3, 44.7, 45.9, 47.10_

  - [~] 8.5 Create `src/features/shell/app-shell.tsx`, `index.ts` and update the root layout
    - `app-shell.tsx` (client): renders `AppHeader`, `ContextBar`, `EnvironmentSwitcher`, `CrewSelector`, `DayControl`, `NoticesList`, `LinkClockDriver` and `LiveRegion`, then children inside `<main id="main-content" tabIndex={-1}>`. While not hydrated, children are replaced by `MainSkeleton`; title, nav and footer still render. Export `AppShell` from `index.ts`.
    - Edit `src/app/layout.tsx` (server): keep `metadata`, `LayoutProps<'/'>`, `<html lang="en">`; wrap `{children}` in `AppProviders` then `AppShell`, and keep `DisclaimerFooter` after the shell, outside any hidden area. Remove the inline `<main>` (the shell now owns the one `main`).
    - A `NEXT_PUBLIC` or other env read is not needed. Read the Cache Components guide for `layout.tsx` and a client provider in a server layout before editing.
    - _Requirements: 12.3, 12.11, 15.3, 15.4, 16.6, 44.5, 47.3, 47.4, 47.18_

  - [~] 8.6 Create `src/app/error.tsx` and `src/app/not-found.tsx`
    - `error.tsx`: a client component taking `error` and `retry` (read `node_modules/next/dist/docs/` `error.md` first; this version uses `retry`, not `reset`). It shows `PageHeader`, a `NoticeBanner` with plain text (no stack, no raw error text) and a "Try again" button that calls `retry`.
    - `not-found.tsx`: explains the page does not exist and links to `/` with `next/link`, with `PageHeader`.
    - Both render inside the root layout, so the shell and the footer stay. One `h1` each.
    - _Requirements: 19.4, 19.5, 46.5, 46.7, 47.1_

- [~] 9. Checkpoint - Area 1 shell and session
  - Run `npm run check` and `npm run build` and fix every failure. The build prerenders `/` and the foundation placeholder page still renders inside the new shell.
  - Run the Import_Search commands for `src/store` and `src/components` from task 27 and confirm an empty result.
  - Ensure all checks pass, ask the user if questions arise.

- [ ] 10. Dashboard, body map and region panel (Area 2)
  - [~] 10.1 Create the shared finding card in `src/features/alerts/`
    - Create `finding-card.tsx` (client) with props `finding: Finding`, `indicatorLabels`, `showEscalate: boolean` and optional `compact`. It shows `TierBadge`, the kind ("Single indicator" or "Pattern from several signals", from `finding.kind`), the reason, `ConfidenceBadge`, the numbered actions (the `action` text already holds the numbered steps from `FindingText`; render it as given, do not re-split it by number), the sources line ("No source supplied yet" when `sourceIds` is empty, else the ids), a `VerificationMarker` (flags from the contributing indicators' `verification.thresholds`, `sourceCount` from `sourceIds.length`) and a "Show details" area (shadcn `tabs` or a native disclosure) that lists the contributing indicators with links to `/trends` and, where the finding comes from a deviation, the mean, spread and distance (read `mean`, `sd` and `difference` from the classification's `deviation` evidence through a hook, never recompute, and never name `yellowSd` or `orangeSd` in a feature file).
    - The escalate action "Prepare message for ground" is a link to `/escalation` that first writes `[finding.id]` to the UI store (`preselectedFindingIds`). Show it exactly when `finding.tier` is `orange` or `red`, using a `switch` over the tier ending in a `never` check (Property 23).
    - Add `src/features/alerts/use-finding-details.ts` that returns, for a finding, its indicator labels and units and the deviation evidence from `useCurrentResult()` using `classificationFor` (task 1.1). Create `src/features/alerts/index.ts` exporting `FindingCard` and `useFindingDetails` for now. Delete `src/features/alerts/.gitkeep`.
    - Supports Properties 20 and 23 by types and the `never` check.
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5, 30.10, 30.11, 41.7, 43.4, 43.6_

  - [~] 10.2 Create the body map in `src/features/body-map/`
    - Create `body-map-geometry.ts`: `REGION_GEOMETRY` as a `Record<BodySystem, { path: string; labelX: number; labelY: number }>` (SVG path data and label anchor points for a stylised silhouette, in a fixed `viewBox`). A comment says the positions of immune, mental and sleep are conventional because those systems have no precise anatomical place (FD-15, Requirement 20.12).
    - Create `body-map.tsx` (client): an `<svg role="group" aria-label="Body map">` with six `<g>` regions. Each region is rendered as a focusable button element (an SVG `<g role="button" tabIndex={0}>` with `onClick` and `onKeyDown` for Enter and Space) or an HTML overlay button, with the accessible name "`<label>, <tier label>. Open details`" (the label from `useBodyRegions()`, the tier label from `TIER_PRESENTATION`). The fill is the `fill-*` class from the presentation map. Next to each region draw the tier icon and a text label. No `style` attribute. The status comes from `useBodySystems()` (`SystemStatus`), never computed here. A region with `status: 'no-data'` uses the `no-data` presentation and the text "No data yet". Selecting a region calls `setSelectedRegion` on the UI store.
    - Create `region-list.tsx`: the same six regions as `<button>` elements with the same names, tier icon and text, plus `legend.tsx` listing the four tiers and "No data yet" from `TIER_PRESENTATION`.
    - Create `src/features/body-map/index.ts` exporting `BodyMap`, `RegionList`, `BodyMapLegend`. Delete `src/features/body-map/.gitkeep`.
    - Supports Requirement 20.2 by the `Record` type and Properties 14 and 22 by reading engine statuses only.
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 20.9, 20.10, 20.11, 20.12, 42.3, 47.7_

  - [~] 10.3 Create the region panel in `src/features/body-map/`
    - Create `region-panel.tsx` (client) that reads the selected region from the UI store and shows, in this order: name and function (from `useBodyRegions()`), status (`TierBadge` plus one sentence saying whether a cluster finding raised the tier, from the findings of kind `cluster` for that system), threatening hazards (the hazards of the system's indicators through `indicatorsForSystem` from `@/domain/indicators/build-catalog` on the session catalog, each with its description from `useHazards()` and the text "emphasised here" or "less emphasised here" from the environment profile hazard weights compared against the other hazards: a hazard is emphasised when its weight is above the lowest weight; read `EnvironmentProfile.hazardWeights`), with a `VerificationMarker` for the flag C mapping; a placeholder slot for the compact trend (filled in task 12.3); the findings of that system (`useFindings` filtered by system, rendered with the shared `FindingCard` imported from `@/features/alerts`); and recommended countermeasures tagged for that system from `useCountermeasures()` with a "Mark done" / "Mark not done" button that writes to the engagement store for the selected astronaut, base scenario and day.
    - Layout: a side column at `lg` and above and stacked below the figure at narrower widths, with Tailwind responsive classes only. A close button resets the selected region. A layout-effect clean-up resets the selected region when the route is hidden (Requirement 21.11).
    - Export `RegionPanel` from `index.ts`.
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.8, 21.9, 21.10, 21.11, 43.4_

  - [~] 10.4 Create the dashboard feature in `src/features/dashboard/`
    - Create `daily-summary.tsx` (overall Tier through `TierBadge`, count of findings per Tier using `TIER_ORDER`, one sentence naming the strongest finding from `crewStatus`; `no-data` when every system has no data), `active-findings.tsx` (the first `activeFindingsShown` findings from `useFindings()` sorted by `sortFindings`, each as a compact `FindingCard` with a link to `/alerts`; the empty state "Nothing needs attention today" with `EmptyState` tier `green`), `next-tasks.tsx` (a check-in link when no reading entry exists for the astronaut and day in the entries store, plus the daily countermeasures not yet done, from `useCountermeasures()` and the engagement store), `crew-strip.tsx` (one chip per crew member with overall Tier, icon and text; a click selects the astronaut) and `dashboard-view.tsx` that arranges `PageHeader`, `DailySummary`, `BodyMap` with `RegionList` and `BodyMapLegend`, `RegionPanel`, `ActiveFindings`, `NextTasks` and `CrewStrip` in one column at narrow widths and two or three columns wider (the figure and the list swap places by responsive classes). Import the body map and finding card only through `@/features/body-map` and `@/features/alerts`.
    - Create `src/features/dashboard/index.ts` exporting `DashboardView`. Delete no `.gitkeep` (the folder is new).
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 22.9, 42.3, 47.1, 47.13_

  - [~] 10.5 Replace `src/app/page.tsx` with the dashboard page
    - A server file: `export const metadata: Metadata = { title: 'Dashboard', description: '...' }` and `export default function Page() { return <DashboardView />; }`, importing `DashboardView` from `@/features/dashboard`. Remove the foundation placeholder content.
    - Read the Next.js `metadata` guide before writing it if unsure; a page that exports `metadata` must not be a client component.
    - _Requirements: 12.1, 12.6, 12.7, 47.18, 49.14_

- [~] 11. Checkpoint - Area 2 dashboard and body map
  - Run `npm run check` and `npm run build` and fix every failure.
  - Run the Import_Search commands for `src/features` and `src/components` from task 27 and confirm an empty result. Delete no `.gitkeep` that still holds an empty folder.
  - Ensure all checks pass, ask the user if questions arise.

- [ ] 12. Trends (Area 3)
  - [~] 12.1 Create the chart components in `src/features/trends/`
    - Read `node_modules/recharts/types/index.d.ts` exports (`ResponsiveContainer`, `ComposedChart`, `Area`, `Line`, `ReferenceLine`, `Tooltip`, `XAxis`, `YAxis`, `CartesianGrid`). Recharts is imported only in files of this folder named `*-chart.tsx` (and `tier-marker.tsx`).
    - Create `trend-chart.tsx` (client) taking a `TrendSeries` (task 1.1) and drawing: a `Line` for readings (gaps where a day has no value, `connectNulls={false}`), a range `Area` for the Baseline_Band (data key as a `[lower, upper]` pair), a dashed `ReferenceLine` for the baseline mean series (a second `Line` with `strokeDasharray`), labelled `ReferenceLine`s for the hard limits where present, a custom dot per point (`tier-marker.tsx`) whose shape differs per tier (circle, diamond, triangle, square from a `Record<Tier, ...>`), coloured with the `cssVar` strings of `TIER_PRESENTATION`, hollow for `quality: 'poor'`. The tooltip states the tier label in text. `isAnimationActive={false}`, `ResponsiveContainer` for size, no literal colour, no `style=`. A reading inside the Earth reference range but outside the band is drawn at its true value (nothing clamps).
    - Create `chart-legend.tsx` (reads `TIER_PRESENTATION`), `chart-data-table.tsx` (a visually hidden `<table>` with day, value, quality, tier label, band edges) and `chart-summary.tsx` (one text sentence, built from the series values only).
    - Create `trend-chart-loader.tsx`: `next/dynamic(() => import('./trend-chart'), { ssr: false, loading: ... })` wrapped in `ChartErrorBoundary`. Read the `next/dynamic` guide for this Next.js version first (with `cacheComponents` a client-only dynamic import from a client file is the supported form).
    - Supports Requirements 28 by construction: the chart draws values from `TrendSeries` and compares nothing.
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 28.6, 28.7, 28.8, 28.9, 28.10, 28.11, 28.12, 28.13, 42.4, 47.9_

  - [~] 12.2 Create the trends page view in `src/features/trends/`
    - Create `indicator-picker.tsx` (lists catalog indicators that have at least one reading in the run, grouped by body system with `BODY_SYSTEM_LABELS`, showing the unit and a `VerificationMarker`), `range-filter.tsx` (shadcn `toggle-group`: "Last 7 days", "Last 14 days", "Whole mission so far", kept in the UI store), `baseline-note.tsx` (one sentence from the series: seed or 14-day window, freeze in force, and "Minimum change not yet set" when `floorPending`), and `trends-view.tsx` with `PageHeader`, the picker, the filter, the chart loader, the legend, the summary and the note. Default indicator is the lead indicator of the first body system that has data.
    - Add `use-trend-series.ts` (a session selector hook may already provide it from task 7.5; reuse that, do not duplicate). Create `src/features/trends/index.ts` exporting `TrendsView`, `TrendChartLoader` (used by the body map, radiation and region panel) and `ChartLegend`. Delete `src/features/trends/.gitkeep`.
    - Create `src/app/trends/page.tsx` (server, `metadata`, renders `TrendsView` from `@/features/trends`).
    - _Requirements: 12.1, 12.6, 15.5, 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 43.4, 47.12, 47.18_

  - [~] 12.3 Add the compact trend to the region panel
    - Edit `src/features/body-map/region-panel.tsx` to fill the slot left by task 10.3: a compact `TrendChartLoader` (from `@/features/trends`) of the region's lead indicator (from `useBodyRegions()`; when the lead indicator has no readings show an `EmptyState` "No data yet") and a link to `/trends`. No other change.
    - _Requirements: 21.1, 21.7, 28.10_

- [ ] 13. Check-in (Area 3)
  - [x] 13.1 Create the validation helper in `src/domain/check-in/validate-value.ts`
    - Export `validateCheckInValue(text, definition)` returning `Result<number, { field: string; message: string }>`. It accepts the text only when it parses to a finite number inside `definition.validRange` (min and max inclusive). When the definition has no `validRange` it accepts any finite number and says so in a comment. The message names the field (label) and the allowed range, for example "Daily mood must be a number from 1 to 5.". Empty text, `NaN` and out-of-range values fail. No range is hard-coded; it reads the catalog value passed in.
    - Note for later tasks: only `mood` (1 to 5) and `who5` carry a `validRange` in the shipped catalog, so a `resting-hr` or blood pressure entry is guarded by the engine's own range check as well, which the wizard shows as a notice (Requirement 24.5).
    - Supports Property 21 by purity and types.
    - _Requirements: 1.1, 24.1, 24.2, 24.6_

  - [~] 13.2 Create the wizard steps in `src/features/check-in/`
    - Create `check-in-step.tsx` (one measurement step: numbered instruction list, one or two value fields with units, a quality choice good or poor with shadcn `toggle-group`, inline error text tied to the field with `aria-describedby`, a `VerificationMarker` when the step carries flag C), `symptom-step.tsx` (a shadcn `checkbox` list of all symptom kinds with the labels from `useCheckInContent()`, the fixed emergency note shown when `chest-pain` or `fainting` is selected, continuing with none selected allowed, no diagnosis, no drug, no dose) and `check-in-wizard.tsx` with step number, a shadcn `progress` bar with text "Step N of M", "Back" and "Next" always available, and the final "Save check-in" button.
    - State is local (`useState`): the open step, field text and quality for each indicator, chosen symptoms. Each field is prefilled from the run's reading of the selected astronaut on the current day (from `useRun()`), left empty when there is none. A layout-effect clean-up resets the open step when the route is hidden. On save, validate every field with `validateCheckInValue` (task 13.1) against the indicator from the session catalog; on any failure show the inline messages and block saving; on success write one `ReadingEntry` per indicator and a `SymptomEntry` per selected symptom to the entries store (the base scenario id, astronaut id and day come from `useScenarioInfo()`), a second save for the same key replaces the first.
    - Before writing, capture `useCurrentResult()` into component state as the "before" evaluation (used by task 13.3).
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7, 23.8, 23.9, 23.10, 23.11, 24.1, 24.2, 24.3, 24.4, 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 43.4, 47.11_

  - [~] 13.3 Create the result summary, check-in view, `index.ts` and page
    - Create `check-in-result.tsx`: after a save, compare the captured "before" result with the recomputed `useCurrentResult()` using `compareEvaluations` (task 1.4). Show each saved reading with `TierBadge`, each new finding with the shared `FindingCard` imported from `@/features/alerts`, the Tier change of each indicator that changed, links to `/alerts` and `/trends`, and the text "No change in tier and no new finding" when nothing changed. Show engine errors that follow the save as notices through the session view.
    - Create `check-in-view.tsx` (`PageHeader` plus wizard or result), `src/features/check-in/index.ts` exporting `CheckInView` and delete `src/features/check-in/.gitkeep`. Create `src/app/check-in/page.tsx` (server, `metadata`, renders `CheckInView`).
    - _Requirements: 12.1, 12.6, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7_

- [~] 14. Checkpoint - Area 3 check-in and trends
  - Run `npm run check` and `npm run build` and fix every failure. The build route list now includes `/check-in` and `/trends`.
  - Run the Import_Search and Search_Check commands from task 27 for `src/features`, `src/components` and `src/store` and confirm the expected results.
  - Ensure all checks pass, ask the user if questions arise.

- [ ] 15. Alerts page (Area 4)
  - [~] 15.1 Create the findings list and filters in `src/features/alerts/`
    - Create `alert-filters.tsx` (shadcn `select` for Tier and for body system, kept in the UI store, with a "Clear filters" button), `findings-list.tsx` (all findings of the selected astronaut on the current day from `useFindings()`, sorted by `sortFindings`, filtered with a pure `matchesFilters(finding, tier, system)` exported from `filter-findings.ts`, rendered as `FindingCard`; the empty state "Nothing needs attention today" in the green style; and "No finding matches the filters" with a clear-filters action when a filter hides all findings). Show the escalate action through `FindingCard`.
    - Supports Property 22 by the single pure predicate.
    - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5_

  - [~] 15.2 Create the tier history and data problems, view, `index.ts` and page
    - Create `tier-history.tsx`: for each catalog indicator that has readings, a strip of daily cells over the mission so far built from `useCurrentResult().history` and `classificationFor` (task 1.1). Each cell shows the tier icon from `TIER_PRESENTATION` and a text alternative "Day N: <tier label>"; a frozen day (`DayState.frozen`) is marked with the text "baseline frozen" and a missing day with "no data". Compute no tier.
    - Create `data-problems.tsx`: a collapsed list titled "Data problems" of `EvaluationResult.errors` (each as plain text from `message`), shown only when the list is non-empty.
    - Create `alerts-view.tsx` (`PageHeader`, filters, findings list, tier history, data problems), update `index.ts` to also export `AlertsView` (keep the exports from task 10.1). Create `src/app/alerts/page.tsx` (server, `metadata`).
    - _Requirements: 12.1, 12.6, 29.6, 29.7, 30.6, 30.7, 30.8, 30.9, 42.7, 46.4_

- [ ] 16. Escalation and ground link timing (Area 4)
  - [~] 16.1 Wire message start and stage hooks in `src/features/session/`
    - Create `use-message-stages.ts`: `useMessageStages()` returns, for each stored escalation message, its derived stage from `messageStage(message, linkClockSeconds)` (task 2.1) and the seconds to the next stage. Create `use-message-starter.ts` (mounted once inside `SessionProvider`): an effect that, after hydration and whenever the day, the ground link status or the message list changes, calls `startMessage(id, linkClockSeconds)` for each message with `startedAtLinkSeconds === null` while `groundLink.available` is true on the current day. A blackout that begins later never touches a message that has started. Export both hooks from `src/features/session/index.ts`.
    - Edit `src/features/shell/live-region.tsx` (task 8.4) to announce a change of the newest message's stage using `useMessageStages()`.
    - Supports Properties 10 and 24 by deriving the stage from stored inputs and starting only when the link is available.
    - _Requirements: 31.7, 31.8, 31.9, 32.5, 32.10, 32.11, 47.10_

  - [~] 16.2 Create the summary builder view and send control in `src/features/escalation/`
    - Create `use-escalation-summary.ts` (calls `buildEscalationSummary` from task 1.5 with the chosen finding ids, the symptom kinds from the run, recent event labels as plain text built from the scenario events and edit log, the ground link state text, the completed countermeasure titles from the engagement store and the number of check-in entries), `summary-view.tsx` (the six sections with titles from `useEscalationContent()`, finding checkboxes initialised from `preselectedFindingIds` in the UI store, and a note when none is chosen) and `send-control.tsx` (disabled with the text "Choose at least one finding" when none is chosen; on send it picks the delay with `chooseOneWayDelaySeconds` using the scenario seed, a new message id and the environment delay range (`groundLink.oneWayDelaySeconds`) or the ISS demo delay, the reply id with `replyIdForTier` for the highest tier, creates the `StoredMessage` with `addMessage`, and says "This snapshot was already sent" when `addMessage` returns false). The message id comes from a counter derived from the number of stored messages and the scenario id, not from the clock or a random source.
    - The send control must not add medical advice. The queue text appears while the link is unavailable.
    - Supports Property 24 by the `snapshotKey` check in the store.
    - _Requirements: 31.1, 31.2, 31.3, 31.4, 31.5, 31.6, 31.7, 31.10_

  - [~] 16.3 Create the link status, timeline, reply card and history, view, `index.ts` and page
    - Create `link-status-panel.tsx` (the one-way delay range converted to minutes by a small display formatter in `src/lib/format-duration.ts` added in this task, labelled with a `VerificationMarker` (flag C draft), the ISS demo delay labelled "Demo value" when the range is `null`, availability with icon and text, a countdown to the next stage of the oldest unfinished message, and the blackout wording by rule from `useEscalationContent()` with "Link unavailable. Messages wait in the queue."), `message-timeline.tsx` (four stages each with icon and text from a `Record<MessageStage, ...>`; the stage comes from `useMessageStages()`, never stored), `reply-card.tsx` (label "Scripted demo reply", text from content by `replyId`, shown only at the `reply-received` stage), a "Skip to next stage" button (`setClock(nextStageAtSeconds(oldestUnfinished))`) and `message-history.tsx` (all stored messages, read-only).
    - Create `escalation-view.tsx` (`PageHeader`, link status, summary view, send control, timeline, reply card, history), `src/features/escalation/index.ts` exporting `EscalationView` and delete `src/features/escalation/.gitkeep`. Create `src/app/escalation/page.tsx` (server, `metadata`).
    - `src/lib/format-duration.ts` is pure: whole seconds in, plain text out ("12 minutes"), with no `Intl`, no `toLocaleString` and no clock.
    - Supports Property 25 by the `nextStageAtSeconds` helper.
    - _Requirements: 12.1, 12.6, 32.1, 32.2, 32.3, 32.4, 32.5, 32.6, 32.7, 32.8, 32.9, 32.10, 32.11, 42.5, 43.4, 43.9_

- [~] 17. Checkpoint - Area 4 alerts and escalation
  - Run `npm run check` and `npm run build` and fix every failure. The build route list now includes `/alerts` and `/escalation`.
  - Run the Import_Search and Search_Check commands from task 27 and confirm the expected results.
  - Ensure all checks pass, ask the user if questions arise.

- [ ] 18. Radiation (Area 5)
  - [~] 18.1 Create the radiation cards and shelter flow in `src/features/radiation/`
    - Create `use-radiation.ts` (reads `useRadiationFigures()` from the session feature, which calls `computeRadiationFigures` from task 1.2 and returns the `dose-rate` and `career-effective-dose` classifications through `classificationFor`; add the selector hook to `src/features/session/use-session.ts` in this task if task 7.5 did not already provide it, and export it from the session `index.ts`).
    - Create `dose-rate-card.tsx` (the multiple of background such as "3.2 times background", `TierBadge` from the `dose-rate` classification, a `VerificationMarker` with flag `C` so "Draft value" shows in every build, explanation text from `useRadiationContent()`; the `no-data` presentation when there is no reading) and `career-dose-card.tsx` (projected mission dose with its unit from the catalog, the share of the remaining allowance as text, `TierBadge` from the `career-effective-dose` classification, `VerificationMarker`, text that states no limit as fact).
    - Create `dose-chart.tsx` (a `TrendChartLoader` from `@/features/trends` for `dose-rate`, with the environment background as an extra reference line passed as a prop, and a `VerificationMarker`; if the shared chart does not accept an extra reference line, add an optional `extraReferenceLines` prop to `TrendChartLoader` and `trend-chart.tsx` in this task).
    - Create `spe-banner.tsx` (a `NoticeBanner` shown while `solarParticleEventActive` is true) and `shelter-checklist.tsx` (shadcn `checkbox` list of the steps from `useRadiationContent()`, a link to `/escalation`, ticks held in local state and reset in a layout-effect clean-up when the route is hidden).
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 33.6, 33.7, 33.8, 33.9, 43.3, 43.4_

  - [~] 18.2 Create the radiation view, `index.ts` and page
    - Create `radiation-view.tsx` (`PageHeader`, SPE banner and shelter checklist when active, the two cards, the dose chart) and `src/features/radiation/index.ts` exporting `RadiationView`; delete `src/features/radiation/.gitkeep`. Create `src/app/radiation/page.tsx` (server, `metadata`).
    - _Requirements: 12.1, 12.6, 33.1, 33.2, 33.5, 47.1_

- [ ] 19. Countermeasures (Area 5)
  - [~] 19.1 Create the task list and suggestions in `src/features/countermeasures/`
    - Create `use-countermeasures.ts` (combines `useCountermeasures()` content, the engagement store completions, the selected scenario, astronaut and day, and the body-system statuses; exposes `isDone(taskId)`, `toggle(taskId)` (marks done or not done for the current day only), `dailyTaskIds`, `suggestedTasks` and `isEditable` (true for the current Mission_Day only)). `suggestedTasks` is a pure function `suggestTasks(tasks, bodySystems)` exported from `suggest-tasks.ts`: a task is suggested exactly when one of its `suggestedWhen` systems has a `SystemStatus` with `status: 'classified'` and `compareTiers(tier, 'yellow') >= 0` (`compareTiers` from `@/domain/tiers`).
    - Create `task-list.tsx` (each task: title, why it matters, how steps, body system label from `BODY_SYSTEM_LABELS`, a `VerificationMarker`, a "Mark done" / "Mark not done" button; past days are read-only with the buttons disabled and a text note) and `suggested-tasks.tsx` (the "Suggested for you" list, or an empty-state text while no body system is yellow or worse).
    - Supports Properties 26 and 27 by the pure predicate and the store setters.
    - _Requirements: 34.1, 34.2, 34.3, 34.4, 34.5, 34.7, 34.8, 43.4_

  - [~] 19.2 Create the streak card, crew goal and weekly strip in `src/features/countermeasures/`
    - Create `streak-card.tsx` (current and best streak from `currentStreak` and `bestStreak` of task 1.6; "No streak yet" with an inviting line at 0, no punishing wording), `crew-goal.tsx` (shadcn `progress` plus the text "2 of 3 crew members", the target share from `useEngagementSettings()` and the text "Target met" or "Target not met yet"; the progress value is derived with `crewGoalShare`), `weekly-strip.tsx` (the last `weeklyStripLength` days from `weeklyStrip`, each cell an icon plus the text "Day N: done" or "Day N: not done"). The "Simulate teammates" action belongs to the director panel (task 21.5), not to this page.
    - Everything is derived from the engagement store on each render. Nothing is stored.
    - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5, 35.7, 35.8, 42.5, 42.6_

  - [~] 19.3 Create the countermeasures view, `index.ts` and page
    - Create `countermeasures-view.tsx` (`PageHeader`, streak card, crew goal, weekly strip, suggested tasks, task list) and `src/features/countermeasures/index.ts` exporting `CountermeasuresView`; delete `src/features/countermeasures/.gitkeep`. Create `src/app/countermeasures/page.tsx` (server, `metadata`).
    - _Requirements: 12.1, 12.6, 35.4, 47.1_

- [~] 20. Checkpoint - Area 5 radiation and countermeasures
  - Run `npm run check` and `npm run build` and fix every failure. The build route list now includes `/radiation` and `/countermeasures`.
  - Run the Import_Search and Search_Check commands from task 27 and confirm the expected results. Confirm `src/features/radiation` and `src/features/countermeasures` hold no `.gitkeep`.
  - Ensure all checks pass, ask the user if questions arise.

- [ ] 21. Director panel and demo (Area 6)
  - [~] 21.1 Create the director and demo actions in `src/features/session/`
    - Create `use-director-actions.ts` exporting `useDirectorActions()` (a client hook; the only place the UI calls the simulation editor). It returns: `applyInject(presetPayload, day)` (builds the event from the payload and day, validates it with `ScenarioEventSchema.safeParse`, applies `injectEvent` to the *replayed current scenario* first, appends an `inject-event` edit to the log only when the simulation returns no problem, else returns the problem `message` list); `applyEnvironment(environmentId)` (`switchEnvironment`, same append-only-on-success rule); `applyCrew(ids)` (`switchCrew`); `removeEdit(id)` (drops the log entry; a replay problem afterwards shows as a notice and the log stays as the user changed it); `simulateTeammates()` (calls `simulateTeammates` from task 2.2 with the scenario seed, day, crew, selected astronaut, daily task ids and the probability from the engagement content, writes the result with `addMany` and returns the count); `runChecks()` (calls `verifySimulation(defaultLibrary, context)` from `@/simulation/engine/verify` and returns the `VerificationReport`; it changes no store); `goToSegment(index)`, `nextSegment`, `previousSegment`, `restartDemo` and `leaveDemo` (the demo pack is `defaultLibrary.demoPacks[0]`; `goToSegment` validates that the scenario id is in the library, the focus astronaut is in that scenario's crew and the first day is inside its duration, else raises a notice with the problem text and changes nothing; on success it sets the base scenario, clears the edit log, selects the focus astronaut, sets the first day and writes the segment index to the UI store). Return types use `Result` or plain objects and the hook throws nothing on user data.
    - Export `useDemoPack()` (segments, total target seconds as the sum of `targetSeconds`) and `useDemoState()` (current segment or `null`) from the same file group, and export all of it from `src/features/session/index.ts`.
    - Supports Properties 29 and 30 by the append-only-on-success rule and the validation before the session change.
    - _Requirements: 35.6, 36.10, 37.5, 37.7, 37.9, 37.10, 37.14, 37.17, 37.18, 38.3, 38.5, 38.7, 38.9, 38.12, 38.14, 38.16, 38.19_

  - [~] 21.2 Create the hotkey predicate and listener in `src/features/shell/`
    - Create `director-hotkey.ts` exporting the pure predicate `isDirectorShortcut(event)` taking `{ code, altKey, shiftKey, ctrlKey, metaKey, target }` as plain values (the target as `{ tagName: string; isContentEditable: boolean } | null`). It is true exactly when `code === 'KeyD'`, Alt and Shift are held, Ctrl and Meta are not, and the target is not an `input`, `textarea`, `select` or content-editable element (compare `tagName` in upper case through a `Record`-free helper, no `as`).
    - Create `director-hotkey-listener.tsx` (client): one `useEffect` registers a `keydown` listener on `window`, calls `isDirectorShortcut` and toggles `directorOpen` in the UI store, and removes the listener in the clean-up.
    - Supports Property 28 by the pure predicate.
    - _Requirements: 36.2, 36.3, 36.4, 44.7_

  - [~] 21.3 Create the director time and scenario sections in `src/features/director/`
    - Create `time-section.tsx` (shadcn `slider` with accessible name "Mission day", min 0, max duration minus 1, step 1, value text "Day N of M"; arrow keys, Home and End work through the component; the slider shows the new day at once and writes to the session store, the views follow the deferred day; "Previous day" and "Next day" with the limits of the day control; jump buttons for the first day, the last day and each day on which the current scenario holds an event, labelled with the day number, taken from `useScenarioInfo()`).
    - Create `scenario-section.tsx` (environment choices ISS, lunar surface, Mars transit that call `applyEnvironment`; text saying this keeps the events of the current scenario and that the header switcher loads the scenario of the chosen environment instead; a crew checklist of the library crew profiles with an apply button that calls `applyCrew`, disabled with the text "At least one crew member is needed" when none is selected; the problem `message` of a rejected edit shown next to the control that caused it).
    - _Requirements: 36.9, 37.1, 37.2, 37.3, 37.4, 37.5, 37.6, 37.7, 37.8, 37.10, 47.12_

  - [~] 21.4 Create the director events section in `src/features/director/`
    - Create `events-section.tsx`: one button per preset from `useDirectorPresets()` (sleep drift, mood dip, solar particle event, EVA, treadmill outage, headache, CO₂ spike, comms blackout) with a whole-number day field that defaults to the current day (inline message naming the field when it is empty or not a whole number, injection blocked; the message is tied to the field with `aria-describedby`); a `VerificationMarker` flag `C` and the text "proposed default" next to presets with origin `proposed-default`; a list of the injected events in the edit log in order (label or event type, day, "Remove" button) and no event of the base scenario; rejected-edit messages next to the control.
    - Keep the day field and selected preset in local state; reset them in a layout-effect clean-up when the `/director` route is hidden.
    - _Requirements: 36.13, 37.11, 37.12, 37.13, 37.14, 37.15, 37.16, 37.17, 37.18, 43.4_

  - [~] 21.5 Create the director demo pack and session sections in `src/features/director/`
    - Create `demo-pack-section.tsx` (lists the segments of `useDemoPack()` in order with plan step, scenario label, first and last day, focus astronaut, target seconds and caption, a "Go to segment" button for each, "Previous segment" and "Next segment", and the total target time as the sum of `targetSeconds` ("Total: 170 seconds" for the shipped pack)).
    - Create `session-section.tsx` ("Simulate teammates" with text saying how many completions were written; "Reset session" opening a shadcn `dialog` confirmation, then `resetSession()`; "Run simulation checks" calling `runChecks()` only on click and showing "No problems found" when `ok` is true, else a list of each problem with `describeProblemCode(problem.code)` from `@/simulation/engine/problem`, its entry kind, entry id, field path and message). The result is held in local state and changes no store. This section and the scenario section stay usable while `status` is `blocked`.
    - _Requirements: 35.6, 36.9, 36.12, 38.1, 38.2, 38.13, 38.14, 38.15, 38.16, 38.17, 38.18, 38.19_

  - [~] 21.6 Create the director panel, overlay, `index.ts` and route
    - Create `director-panel.tsx` (five sections in order with headings: time, scenario, events, demo pack, session; a skeleton while `status` is `loading`; no `h1`, so it never adds a second `h1`), `director-overlay.tsx` (a shadcn `dialog` titled "Director panel", opened by `directorOpen` in the UI store, focus moves in and stays inside, closes with Escape and a visible "Close" button, returns focus to the element focused before opening; the dialog primitive provides this, confirm in the component docs) and `director-page-view.tsx` (`PageHeader` plus `DirectorPanel`, the `/director` fallback). Create `src/features/director/index.ts` exporting `DirectorOverlay`, `DirectorPageView`.
    - Mount `DirectorHotkeyListener` and `DirectorOverlay` in `src/features/shell/app-shell.tsx` (edit the file from task 8.5; the shell may import `@/features/director`). Create `src/app/director/page.tsx` (server, `metadata`, not linked anywhere).
    - _Requirements: 12.1, 12.6, 36.1, 36.5, 36.6, 36.7, 36.8, 36.9, 36.11, 47.1_

  - [~] 21.7 Create the demo caption bar in `src/features/shell/`
    - Create `caption-bar.tsx` (client): while `useDemoState()` is not `null`, shows on every page the plan step, "Segment N of M", the caption (plain text read from the pack, no copy), the target seconds and the buttons "Previous segment", "Next segment" (disabled at the ends), "Restart" and "Leave demo" (clears the position in the UI store and changes nothing else). Mount it in `app-shell.tsx`. Edit `live-region.tsx` so a change of segment announces the caption once. No timer plays the pack.
    - _Requirements: 38.4, 38.5, 38.6, 38.7, 38.8, 38.9, 38.10, 38.11, 47.10_

- [~] 22. Checkpoint - Area 6 director and demo
  - Run `npm run check` and `npm run build` and fix every failure. The build route list now includes `/director`.
  - Run the Import_Search and Search_Check commands from task 27 and confirm the expected results.
  - Ensure all checks pass, ask the user if questions arise.

- [ ] 23. About page (Area 7)
  - [x] 23.1 Create `src/domain/indicators/cluster-verification.ts`
    - A new pure file that mirrors `findUnverifiedIndicators` in `src/domain/indicators/verification.ts` (do not edit that file): export `findUnverifiedClusters(clusters: readonly ClusterDefinition[]): readonly string[]` returning the ids of clusters with an empty `sources` array, in the original order. Import `ClusterDefinition` from `../schemas/cluster`. Never throws.
    - Supports Property 31 by construction.
    - _Requirements: 1.1, 1.3, 39.7_

  - [~] 23.2 Create the about view in `src/features/about/`
    - Add `useAboutFacts()` to `src/features/session/` (in a new file `use-about-facts.ts`, exported from the session `index.ts`): returns the number of indicators with no source and the total (`findUnverifiedIndicators(catalog)`), the number of clusters with no source and the total (`findUnverifiedClusters(clusters)`), and the distinct source references listed once each (id, citation, URL when present) from indicator and cluster `sources`.
    - Create `about-view.tsx` with props `{ notice: string }` (a client component): `PageHeader`, then four sections in this order with headings: notice (renders the `notice` prop unchanged, plus the statements from `useAboutContent()`), draft data (explains flags A, B and C from the content, states every threshold and space-specific value is a draft, shows the counts, and "No threshold has a source yet" while the unsourced count equals the total), sources ("No sources have been supplied yet" while every `sources` array is empty, otherwise each distinct reference once; the Reading_List labelled "Reading list, not citations" with ordinary `<a href rel="noopener noreferrer">` links) and how it works (the six steps and the personal baseline from the content). Create `src/features/about/index.ts` exporting `AboutView`.
    - _Requirements: 39.1, 39.2, 39.4, 39.5, 39.6, 39.7, 39.8, 39.9, 39.10, 39.11, 39.12, 39.13, 39.14, 43.10_

  - [~] 23.3 Create `src/app/about/page.tsx`
    - A server file: `export const metadata` with the title "About", imports `DISCLAIMER_NOTICE` from `@/data/disclaimer` (the only `src/data` import allowed in a page) and renders `<AboutView notice={DISCLAIMER_NOTICE} />` from `@/features/about`. The text is passed down and never copied.
    - _Requirements: 12.1, 12.5, 12.6, 39.2, 39.3, 41.3, 47.18_

- [ ] 24. Polish: accessibility, responsive, empty and error states (Area 7)
  - [~] 24.1 Review and fix accessibility and layout across all pages
    - Read each file under `src/features/*` and `src/components/*` added by this spec and fix gaps, using Tailwind classes only: one `h1` per page (error, not-found and director included), no skipped heading levels, one `header`, `nav`, `main` and `footer` landmark each, named `nav`, visible focus rings (no `outline-none` without a replacement `focus-visible` style), icon-only controls named and decorative icons `aria-hidden="true"`, 44 px minimum touch targets at widths below `md` for buttons, nav links, body map regions, region list items, range controls and form controls, single-column layout at narrow widths and two or three columns wider, no horizontal scroll at 320 px (use `min-w-0`, `flex-wrap`, `overflow-x-auto` on tables), and text and tier colours only from theme tokens.
    - Check that every tier, stage and progress display shows an icon and text next to its colour, and that every empty state and error state renders text with an icon.
    - Do not add new components unless two files would copy the same class combination; in that case add one shared component in `src/components/`.
    - _Requirements: 42.3, 42.5, 42.6, 42.7, 42.8, 47.1, 47.2, 47.3, 47.4, 47.5, 47.6, 47.7, 47.8, 47.9, 47.12, 47.13, 47.14, 47.15, 47.16, 47.17_

  - [~] 24.2 Confirm content is data and the demo path is complete
    - Search the views for hard-coded text that belongs in a content file (check-in instructions, countermeasure text, region and hazard descriptions, shelter steps, scripted replies, demo captions, about text) and move any into the matching `src/data/` file through its schema.
    - Confirm no placeholder text, "TODO" or lorem ipsum in a rendered page, and that the Mars path (dashboard, check-in, trends, alerts, escalation, radiation, countermeasures, director) works with the start state of the app defaults.
    - _Requirements: 41.1, 41.5, 41.7, 49.7, 49.11, 49.14_

- [ ] 25. README run notes
  - [~] 25.1 Update `README.md`
    - Keep the existing scripts list and the line "The project has no test runner.". Add a "Running the app" section: install (`npm install`), start the dev server (`npm run dev`), run `npm run check`, `npm run build`, `npm run start`, open `http://localhost:3000`; the start state (Mars transit, Aria, day 9); how to open the director panel (`Alt+Shift+D` on any page, or the `/director` route); where the demo pack is (the demo pack section of the director panel); how to use "Reset session". The README must pass `npm run format:check`.
    - _Requirements: 49.1, 49.2_

- [~] 26. Checkpoint - Area 7 about and polish
  - Run `npm run check` and `npm run build` and fix every failure. The build route list contains the nine routes and not `/dev/chart-check`.
  - Ensure all checks pass, ask the user if questions arise.

- [ ] 27. Final delivery checkpoint (Requirements 48 and 49)
  - [~] 27.1 Run the repository checks
    - Run `npm run check` (lint, format check, typecheck) and `npm run build`. Both must finish with no error and no unaccepted warning. Read the route list in the build output: it must hold `/`, `/check-in`, `/trends`, `/alerts`, `/escalation`, `/radiation`, `/countermeasures`, `/director` and `/about`, and must not hold `/dev/chart-check`. Fix every failure in the file that causes it; do not change a rule, a script or `package.json`.
    - _Requirements: 48.4, 48.10, 49.3, 49.4, 49.5_

  - [~] 27.2 Run the Import_Search and Search_Check commands
    - All commands run in PowerShell at the project root and need no added package. ripgrep is not on the PATH of this project's shell, so the forms below use `Select-String`. Where `rg` is installed, `rg -n "<pattern>" <paths>` gives the same hits. Run each command and compare with the expected result. Fix the offending file when a result differs; never weaken a command.
    - Import_Search (Requirement 40):
      1. Stores import nothing from the other layers. Expected: no output.
         `Get-ChildItem src/store -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from '(@/(simulation|features|components)|(\.\./)+(simulation|features|components))"`
      2. Components import nothing from store, features or data. Expected: exactly one hit, in `src/components/disclaimer-footer.tsx` (`@/data/disclaimer`).
         `Get-ChildItem src/components -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from '(@/(store|features|data)|(\.\./)+(store|features|data))"`
      3. Features never import `src/data`. Expected: no output.
         `Get-ChildItem src/features -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from '(@/data|(\.\./)+data)"`
      4. In `src/app`, only `app-providers.tsx` and `about/page.tsx` import `src/data`. Expected: hits only in `src/app/app-providers.tsx` and one hit in `src/app/about/page.tsx` (`@/data/disclaimer`).
         `Get-ChildItem src/app -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from '@/data"`
      5. No feature reaches into another feature's internals, and `src/app` imports features only through `index.ts`. Expected: no output.
         `Get-ChildItem src/features,src/app -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from '@/features/[a-z-]+/"`
         `Get-ChildItem src/features -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from '\.\./"`
      6. Feature-to-feature edges follow the allowed list in the Overview and form no cycle. List the edges and compare by eye (a feature must not import its own `@/features/<name>`). Expected: every line is an allowed edge.
         `Get-ChildItem src/features -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from '@/features/[a-z-]+'" | ForEach-Object { "$($_.Path | Split-Path -Parent | Split-Path -Leaf) -> $($_.Matches[0].Value)" } | Sort-Object -Unique`
      7. No view imports a classification module. Expected: no output.
         `Get-ChildItem src/components,src/features,src/store,src/app -Recurse -Include *.ts,*.tsx | Select-String -Pattern "domain/rules/(classify-base|deviation|persistence|confidence|clusters|compare|findings)'"`
      8. No view names a threshold field. Expected: no output.
         `Get-ChildItem src/components,src/features,src/store,src/app -Recurse -Include *.ts,*.tsx | Select-String -Pattern "\b(hardLimits|yellowSd|orangeSd|minAbsoluteChange|careerLimitMsv)\b"`
      9. The new pure files import no framework or UI layer, and use no clock or unseeded random. Expected: no output for both.
         `Get-ChildItem src/domain,src/simulation -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from '(react|react-dom|next)(/[^']*)?'"`
         `Get-ChildItem src/domain,src/simulation -Recurse -Include *.ts,*.tsx | Select-String -Pattern "Math\.random|Date\.now|new Date\("`
    - Search_Check (Requirements 40, 41, 42, 44, 48):
      10. No clock, random or locale call in render-side folders. Expected: no output.
          `Get-ChildItem src/features,src/components,src/store,src/app,src/lib -Recurse -Include *.ts,*.tsx | Select-String -Pattern "Math\.random|Date\.now|new Date\(|toLocaleString"`
      11. Storage only in `persist-config.ts`. Expected: hits only in `src/store/persist-config.ts`.
          `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "localStorage|sessionStorage"`
      12. No `style=` attribute (none is planned). Expected: no output. If a hit exists it must carry the required comment on the line above.
          `Get-ChildItem src -Recurse -Include *.tsx | Select-String -Pattern "style="`
      13. No tier-word Tailwind colour class with a shade. Expected: no output.
          `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "(bg|text|border|fill|stroke|ring|from|to)-(red|green|yellow|orange)-[0-9]{2,3}"`
      14. `status-*` tokens only in the tier map, the stylesheet and the dev chart page. Expected: hits only in `src/components/tier-presentation.ts`, `src/app/globals.css` and `src/app/dev/chart-check/chart-check.tsx`.
          `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "status-(green|yellow|orange|red)"`
      15. No network, server action, service worker, search params, raw HTML or silenced lint. Expected: no output.
          `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "fetch\(|'use server'|serviceWorker|useSearchParams|dangerouslySetInnerHTML|eslint-disable"`
      16. No `route.ts`, manifest or service worker file. Expected: no output.
          `Get-ChildItem src,public -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^(route\.(ts|js)|manifest\..*|sw\.js|service-worker\..*)$' }`
      17. No `any` type. Expected: no output.
          `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern ":\s*any\b|\bas any\b|<any>"`
      18. The decision-support text exists once. Expected: exactly one hit, in `src/data/disclaimer.ts`.
          `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "Decision support only"`
      19. No test file, test folder, test script or runner config. Expected: no output.
          `Get-ChildItem . -Recurse -Force -ErrorAction SilentlyContinue -Include *.test.*,*.spec.*,vitest.config.*,jest.config.*,playwright.config.* | Where-Object { $_.FullName -notmatch 'node_modules|\\.next\\' }`
          `Get-ChildItem . -Recurse -Directory -Filter __tests__ -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch 'node_modules' }`
      20. No placeholder text in source. Expected: no output.
          `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "TODO|FIXME|lorem ipsum" -CaseSensitive:$false`
    - _Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.7, 40.8, 40.9, 41.2, 42.1, 42.2, 44.2, 44.3, 44.9, 48.1, 48.8, 48.11, 48.12, 49.14_

  - [~] 27.3 Run the git checks
    - Only new files under `src/domain` and `src/simulation`. Expected: no output from either command (the planning baseline commit is `5a7c052`; if work is already committed, use the second form with the commit before the first frontend-app task).
      `git status --porcelain -- src/domain src/simulation | Where-Object { $_ -notmatch '^\?\?' }`
      `git diff --name-status 5a7c052 -- src/domain src/simulation | Where-Object { $_ -notmatch '^A' }`
    - `package.json` and `package-lock.json` unchanged, and no edit to the lint rules, `docs/PROJECT.md` or the steering files. Expected: no output.
      `git status --porcelain -- package.json package-lock.json eslint.config.mjs eslint.rules.mjs eslint-rules docs .kiro/steering`
      `git diff --stat 5a7c052 -- package.json package-lock.json eslint.config.mjs eslint.rules.mjs eslint-rules docs .kiro/steering`
    - No `.gitkeep` left. Every feature folder holds real files, so the 12 feature folders hold none. Expected: no output.
      `Get-ChildItem src -Recurse -Force -Filter .gitkeep`
    - `src/app/dev/chart-check/` and `src/store/counter-store.ts` unedited. Expected: no output.
      `git status --porcelain -- src/app/dev src/store/counter-store.ts`
    - _Requirements: 1.3, 11.8, 12.2, 12.9, 40.10, 48.2, 48.3, 48.13, 48.14, 49.10_

  - [~] 27.4 Confirm the README
    - Open `README.md` and confirm the run notes of task 25.1 are present, the scripts list and "The project has no test runner." are kept, and `npm run format:check` passes.
    - _Requirements: 49.1, 49.2_

  - [ ] 27.5 Manual_Checklist (performed by the developer, not by an agent)
    - Perform the 14 checks once in `npm run dev` for the Mars path (checks 1 to 11), then the ISS path, then the lunar path, and once on the final `npm run build` and `npm run start`. Mark a check failed and fix its cause in code if it does not hold.
      1. Start state. A fresh browser profile opens the dashboard on Mars transit, day 9, Aria. No console error, no hydration warning. The footer notice shows on every page.
      2. Hydration. Reload each route with stored data present: skeleton, then state, no hydration warning. Corrupt a stored key by hand and reload: the notice "Saved data could not be read, starting fresh." appears.
      3. Body map. Every region shows colour, icon and text. Tab and Enter open the region panel with function, status, hazards, trend and actions. A cluster finding raises its region.
      4. Check-in. Complete the three steps, change a value, mark one reading poor, save. The summary shows before and after, and the trends and alerts pages reflect the change. An out-of-range value shows the inline message.
      5. Personal baseline. Select Mei on Mars around days 16 to 21. The resting heart rate chart shows a reading inside the Earth reference range but above her band, and the alert says so with the numbers.
      6. Fatigue cluster. Scrub Aria on Mars to day 17. A "Fatigue and stress" pattern finding appears with reason, confidence, numbered actions and "No source supplied yet".
      7. Escalation. Send a summary on Mars: queue, transmitting, then the scripted reply after the compressed delay. "Skip to next stage" works. On ISS the demo delay applies. Inject a blackout in the director panel: a new message waits.
      8. Environment switch. Switch ISS, lunar and Mars. The day clamps on lunar. Hazard emphasis in the region panel and the link badge change.
      9. Radiation. On Mars at day 21 the solar particle event banner and shelter checklist show and the dose-rate tier is red. Draft markers are visible.
      10. Countermeasures. Mark tasks done, see the streak and crew goal update, reload and confirm they persist.
      11. Director. `Alt+Shift+D` opens the overlay on every page. Scrub, inject a solar particle event and switch crew. Play the demo pack through all six segments with captions and confirm the total target time reads 170 seconds. Run "Run simulation checks" and expect "No problems found" (a report with problems is a data task for the team, not a code fix).
      12. About. Notice, draft explanation, source status and reading list are present, and the notice text equals the footer text exactly.
      13. Accessibility. Keyboard-only run through every page. Screen-reader names on map regions and status badges. Zoom to 200 percent and check 320 px width. View the app in grayscale and confirm no status depends on colour alone.
      14. Production run. `npm run check`, `npm run build` and `npm run start` succeed. `/dev/chart-check` is absent from the production build (the not-found page shows). The network panel shows no request to any domain other than the app's own origin, except Reading_List links after a click.
    - Requirement 49.11: finish checks 1 to 11 on the Mars path before the ISS path, and the ISS path before the lunar path. Requirement 49.13: play the demo with "Next segment" and confirm checks 5, 6, 7 and 9 on the segments for plan steps 4, 5, 6 and 7.
    - Ask the user if questions arise.
    - _Requirements: 48.9, 49.4, 49.5, 49.6, 49.7, 49.8, 49.9, 49.11, 49.12, 49.13, 49.15_

## Notes

- There are no optional (`*`) tasks, because this plan has no test tasks. The project has no test runner and this spec adds none (FD-18). The 34 Correctness Properties are kept true by the mechanisms listed in the Overview and named in each task. Task 27 holds the concrete search commands and the Manual_Checklist.
- Differences from `design.md` found while reading the real code, and how the tasks handle them:
  - `classificationFor` needs the catalog as well as the result, because a `no-data` classification has no id and is located by its position over the id-sorted catalog. Task 1.1 defines the signature `classificationFor(source, catalog, indicatorId)` and returns a `Result`.
  - `EvaluationResult` carries `findings`, `bodySystems` (type `SystemStatus`, with `status: 'no-data'` or `'classified'`), `history` (`DayState[]`) and `errors`. The overall tier of a crew member is the worst tier of the classified `bodySystems`, using `worstTier` from `@/domain/tiers`.
  - `Finding.action` is one string that already holds the numbered steps. The finding card renders it as given.
  - `validRange` exists only on `mood` and `who5` in the shipped catalog. The check-in range check uses it where present; the engine's own range check and the notice path cover the other indicators (Requirement 24.5).
  - `EnvironmentProfile` has `hazardWeights` for the five hazards, with no "emphasised" flag. The region panel treats a hazard as emphasised when its weight is above the lowest weight of that environment profile.
  - `GroundLinkStatus` has `available` and `oneWayDelaySeconds` (a min and max range or `null`). The blackout rule list comes from `run.groundLink.blackoutRules`.
  - `verifySimulation(library, context)` returns `{ libraryProblems, scenarios, problems, ok }`. The director session section shows `problems` with `describeProblemCode`.
  - The `src/features/shell` folder is flat, so the files named in the tasks sit directly in it. `index.ts` files are the only cross-feature entry.
  - Task 16.1 also mounts the message starter inside `SessionProvider` (an edit to `session-provider.tsx` from task 7.5). Task 21.6 and task 21.7 edit `app-shell.tsx` from task 8.5. These are edits to files created earlier in this same spec, which is allowed.
  - The starting `baseScenarioId` in the session store is an empty string on server and client. The provider applies the start state from `src/data/app-defaults.ts` after hydration (Requirement 13.15), so the first render stays equal on both sides.
- The text of `src/data/about.ts` and any other content file must not contain the phrase "Decision support only", so the Search_Check of task 27.2 (command 18) finds it once, in `src/data/disclaimer.ts`.
- Every task ends with `npm run check`. Checkpoints after each area also run `npm run build` where routes were added. Do not start `npm run dev` or `npm run start` from a task; the developer runs those for the Manual_Checklist.
- Each task references requirement clauses for traceability.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.6", "2.2", "3.1", "4.1", "4.2", "6.1", "6.5", "13.1", "23.1"] },
    { "id": 1, "tasks": ["1.4", "1.5", "3.2", "3.3", "4.3", "4.4", "6.2", "6.3"] },
    { "id": 2, "tasks": ["2.1", "3.4", "3.5", "3.6", "3.7", "4.5", "6.4", "7.1"] },
    { "id": 3, "tasks": ["7.2", "7.4"] },
    { "id": 4, "tasks": ["7.3"] },
    { "id": 5, "tasks": ["7.5"] },
    { "id": 6, "tasks": ["7.6"] },
    { "id": 7, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.6", "10.1", "10.2", "12.1", "13.2", "19.1", "21.1", "23.2"] },
    { "id": 8, "tasks": ["8.5", "10.3", "12.2", "13.3", "15.1", "16.1", "19.2", "21.3", "21.4", "21.5", "23.3", "25.1"] },
    { "id": 9, "tasks": ["10.4", "12.3", "15.2", "16.2", "18.1", "19.3", "21.2"] },
    { "id": 10, "tasks": ["10.5", "16.3", "18.2", "21.6"] },
    { "id": 11, "tasks": ["21.7"] },
    { "id": 12, "tasks": ["24.1"] },
    { "id": 13, "tasks": ["24.2"] },
    { "id": 14, "tasks": ["27.1", "27.2", "27.3", "27.4"] },
    { "id": 15, "tasks": ["27.5"] }
  ]
}
```
