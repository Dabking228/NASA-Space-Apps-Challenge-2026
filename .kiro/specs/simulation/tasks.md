# Implementation Plan: Simulation

## Overview

This plan builds `src/simulation/` in the order the user chose: the engine first (random source, event library, environments, crew, schemas, generators, validators, runner, editor, adapter, checkers), then the Mars scenario end to end, then ISS, then lunar, then the demo pack. It follows the folder layout in `design.md`. The language is TypeScript in strict mode, with Zod 4 schemas as the source of every exported type.

The project has no test runner (`.kiro/steering/tech.md`). No task adds a test, a test file, a test script or a test package, and no task changes `package.json`. Correctness is supported by strict types, `satisfies`, `Equal<>` and `never` guards, Zod validation, the plain validator functions, `checkQuietRun`, `checkStorylines`, `npm run check` and `npm run build`. For that reason the design's Correctness Properties are not turned into property-test tasks. Each property names its supporting mechanism in the design, and the tasks below build those mechanisms.

Rules that apply to every task:

- Files under `src/simulation/` import only TypeScript, Zod, `@/domain/...` and other simulation files. They never import `src/data/`. The catalog, engine config, clusters and finding text arrive as parameters (`SimulationContext`).
- No `any`, no `as` assertion to silence a type error, no `Math.random`, `Date.now`, `new Date`, `Math.log`, `Math.cos`, `Math.pow` or `**` in generation code, no module-level mutable state, no in-place sort or mutation of an argument.
- Every data file ends with `satisfies <Type>`. Every `switch` over a closed union ends with a `never` check. Every type and field is `readonly`.
- No invented thresholds or sources. Environment numbers come from PROJECT.md sections 10 and 6.6, carry `verification: 'C'` and a comment citing the section, and have an empty `sources` array. Values the document does not give carry `valueSource: 'proposed-default'` or a "proposed default" comment.
- Delete the `.gitkeep` of a folder in the same task that adds its first real file (Requirement 22.7).
- Zod schemas use `z.strictObject` and contain no `transform`, `preprocess` or `catch`.

## Tasks

- [x] 1. Shared foundations: problems, signal spec and settings
  - [x] 1.1 Create `src/simulation/engine/problem.ts`
    - Define `SimulationProblemCodeSchema` (every code listed in the design), `SimulationProblemSchema` (all fields strings) and the inferred types.
    - Add a small helper that builds a problem and a display function over `code` that ends with a `never` check.
    - Delete `src/simulation/engine/.gitkeep`.
    - _Requirements: 1.8, 1.9, 20.2, 22.2_

  - [x] 1.2 Create the signal spec and settings schemas and shipped settings
    - Create `engine/signal-spec-schema.ts` with `SignalSpecSchema` (baseline, noiseSd, decimals, periodDays, optional bounds).
    - Create `engine/settings-schema.ts` with `NoiseSettingsSchema` (spread above 0 and at most 0.4), `EventSettingsSchema` (SPE multiple above 20, `valueSource: 'proposed-default'`, `verification: 'C'`, symptom default length) and `SimulationSettingsSchema`.
    - Create `engine/settings.ts` with `defaultSettings` (clip 1.5, spread 0.2, maxDraws 16, SPE multiple 25, SPE default length 1, symptom default length 1), typed with `satisfies`.
    - _Requirements: 3.1, 3.2, 3.3, 7.3, 8.3, 11.2, 11.3, 11.4, 12.2, 22.4_

- [x] 2. Seeded random and noise
  - [x] 2.1 Create `src/simulation/engine/hash.ts`
    - Implement `fmix32`, the length-prefixed injective `encodeKey`, the FNV-1a fold over UTF-16 code units and `hashKey(seed, key)` using only 32-bit integer operations and exact division by 2^32.
    - Export the `RandomKey` type.
    - _Requirements: 2.3, 2.5, 2.6_

  - [x] 2.2 Create `src/simulation/engine/seeded-random.ts`
    - Implement `createSeededRandom(seed, noise)` returning `Result<SeededRandom, readonly SimulationProblem[]>`. Reject a seed that is not a safe integer (field `seed`) and a clip that is not a positive finite number (field `noiseClip`).
    - `uniform(key, stream)` returns `hashKey(seed, [...key, 'u', stream]) / 4294967296`. `truncatedNormal(key)` sums 12 uniforms minus 6, redraws up to `maxDraws` times, then clamps to plus or minus clip.
    - Use no transcendental `Math` function and no `**`. Keep no sequence position or other state.
    - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8_

  - [x] 2.3 Create `src/simulation/engine/noise.ts`
    - Implement `pairedNoiseSample(random, key, index, noise)` as designed in SD-1: pairs `2j` and `2j+1` share one keyed amplitude `1 + spread * z / clip` and have opposite signs in a keyed order.
    - Document the four key layouts (in-flight astronaut, pre-flight astronaut, in-flight habitat, pre-flight habitat) in a short comment, and export the reserved habitat id constant `habitat`.
    - _Requirements: 2.5, 8.3, 8.4, 8.6, 8.7_

- [x] 3. Event library
  - [x] 3.1 Create `src/simulation/events/event-schemas.ts`
    - Define `ScenarioEventSchema` as a discriminated union on `type` for the eight Event_Kinds with the parameters in the design, plus `EVENT_KINDS` and the `EventKind` union.
    - Reuse `SymptomKindSchema` and `MissionDaySchema` from the Domain_Layer.
    - Delete `src/simulation/events/.gitkeep`.
    - _Requirements: 3.1, 3.2, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12_

  - [x] 3.2 Create `src/simulation/events/canonical-order.ts`
    - Return a sorted copy of an event list ordered by day, then type, then a canonical string (JSON with sorted keys). Do not sort the input in place.
    - _Requirements: 1.6, 10.7_

  - [x] 3.3 Create `src/simulation/events/effects.ts`
    - Define `EffectTarget`, `EffectRule` and `EFFECT_RULES` as a `Record` keyed by the full `EventKind` union, with `satisfies`. Implement the formulas of the design for drift (ramp, resets after its window), moodDip, solarParticleEvent (multiple and default length from settings), co2Spike, eva, equipmentOutage (treadmill), symptom (default length from settings) and commsBlackout.
    - Add a dispatch function over `event.type` that ends with a `never` check, and helpers that sum additive effects and multiply multiplicative effects in the canonical order.
    - Apply an effect only where the astronaut has a Signal_Spec for the indicator, or to habitat indicators. A drift on a habitat indicator applies to the shared series.
    - _Requirements: 9.10, 9.12, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 11.2, 11.4, 12.1, 12.2, 22.2, 22.3_

- [x] 4. Environments and ground link
  - [x] 4.1 Create `src/simulation/environments/environment-schema.ts`
    - Define `EnvironmentConfigSchema` (gravity, dose rate range, evacuation class, ground link config with nullable delay range and blackout rules, emphasised hazards, all five hazard weights through `z.record(HazardSchema, ...)`, `hazardWeightSource: 'proposed-default'`, habitat Signal_Specs for `cabin-co2` and `dose-rate`, `verification: 'C'`, `status: 'unverified-draft'`, `sources` of length 0).
    - Export the inferred types and the ground link config schema.
    - Delete `src/simulation/environments/.gitkeep`.
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2_

  - [x] 4.2 Create `src/simulation/environments/profile.ts`
    - Implement `toEnvironmentProfile(env)` returning an object that parses with `EnvironmentProfileSchema`: `backgroundDoseRateMsvPerDay` is the midpoint of the dose rate range and `hazardWeights` holds the five weights.
    - _Requirements: 4.6_

  - [x] 4.3 Create the three environment data files and `index.ts`
    - Create `iss.ts`, `lunar-surface.ts` and `mars-transit.ts` with the exact values of the design tables (ids, gravity, dose rate ranges, evacuation classes, delay ranges, blackout rules, emphasised hazards, hazard weights 2 and 1, habitat `dose-rate` baseline at the midpoint, habitat `cabin-co2` baselines 2.5, 1.5 and 2.0). Each ends with `satisfies EnvironmentConfig`.
    - Comment every numeric value with its PROJECT.md section (10 or 6.6) or "proposed default", and mark it as an unverified draft. Use `verification: 'C'` and `sources: []`.
    - Create `environments/index.ts` that exports the three configs as a list.
    - _Requirements: 4.3, 4.4, 4.7, 4.8, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.3, 6.4, 6.5_

  - [x] 4.4 Create `src/simulation/engine/ground-link.ts`
    - Implement `groundLinkStatus(env, events, day)`. `available` is false exactly when some `commsBlackout` event covers the day. Otherwise return the environment's one-way delay range, or `null`.
    - Leave message queuing, the scripted reply and the escalation summary out.
    - _Requirements: 6.6, 6.7, 6.8, 6.9_

- [x] 5. Crew profiles
  - [x] 5.1 Create `src/simulation/crew/crew-schema.ts` and `signal-shapes.ts`
    - Define `AstronautIndicatorIdSchema` (twelve ids, no `fasting-glucose`) and `CrewProfileSchema` (`synthetic: true`, `baselineStatus: 'placeholder'`, career dose, `preflightSamples` of at least 2, `signals` as a record with all twelve keys).
    - In `signal-shapes.ts` define the shared noise, decimals, period and bounds table of the design and a `withShapes(baselines)` helper. Bounds equal the catalog valid range for `mood` (1 to 5) and `who5` (0 to 100); `spo2` has a maximum of 100.
    - Delete `src/simulation/crew/.gitkeep`.
    - _Requirements: 3.1, 3.2, 7.2, 7.3, 7.4, 7.5, 7.8, 7.9_

  - [x] 5.2 Create the four crew profile files and `crew/index.ts`
    - Create `aria.ts`, `kofi.ts`, `mei.ts` (athlete, `resting-hr` 48) and `tomas.ts` with the baselines and career doses of the design table, 10 pre-flight samples each, ending with `satisfies CrewProfile`. Mark every baseline as a placeholder in a comment.
    - Create `crew/index.ts` exporting the four profiles. Do not use the id `habitat`.
    - _Requirements: 7.1, 7.2, 7.4, 7.6, 7.7, 7.9, 7.10, 22.4_

- [x] 6. Scenario, demo pack and run schemas
  - [x] 6.1 Create `src/simulation/scenarios/scenario-schema.ts`
    - Define `ExpectationScopeSchema`, `StorylineExpectationSchema` (cluster form and indicator form, each with `scope` and `byDay`, using `FindingTierSchema` from the Domain_Layer) and `ScenarioSchema` (safe-integer seed, crew of at least one id, duration of at least 1).
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 21.1_

  - [x] 6.2 Create `src/simulation/demo-packs/demo-pack-schema.ts`
    - Define `DemoSegmentSchema` (plan step 2 to 7, scenario id, first and last day, focus astronaut, target seconds, caption) and `DemoPackSchema`.
    - Delete `src/simulation/demo-packs/.gitkeep`.
    - _Requirements: 3.1, 3.2, 19.1, 19.2_

  - [x] 6.3 Create `src/simulation/engine/run-schema.ts`
    - Define `AstronautRunSchema`, `GroundLinkConfigSchema` (from the environment schema shape) and `SimulationRunSchema` using the existing domain schemas for readings, symptoms, safety flags, alerts and the environment profile. Define the `GroundLinkStatus` type.
    - _Requirements: 1.6, 3.1, 13.3, 13.4_

  - [x] 6.4 Create `src/simulation/types.ts` and `src/simulation/type-guards.ts`
    - In `types.ts` re-export every exported simulation type as the `z.infer` output of its schema (`readonly` where the schema allows).
    - In `type-guards.ts` assert with `Equal` and `Expect` from `@/domain/type-guards` that each exported type equals its schema output and that `EVENT_KINDS` lists every `EventKind` once. The file holds types only.
    - _Requirements: 3.1, 9.12, 22.5_

- [x] 7. Signal generation and library
  - [x] 7.1 Create `engine/generate-reading.ts` and `engine/pre-flight.ts`
    - Implement `composeReading(spec, effects, noiseSample)` in the order baseline, additive effects, noise times `noiseSd`, multiplicative effects, bounds, rounding. Round with `Math.round(v * f) / f`, with `f` read from the constant table `[1, 10, 100, 1000, 10000, 100000, 1000000]` indexed by `decimals`.
    - Implement a day-selection helper (a reading exists when `day % periodDays === 0` and the day is at most the last day) and quality `good`.
    - Implement pre-flight seed generation for a Signal_Spec with the pre-flight key layout, for astronaut indicators and for the habitat indicators.
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [x] 7.2 Create `src/simulation/library.ts`
    - Define the `SimulationContext` and `SimulationLibrary` types (`SimulationContext` is a `Pick` of the domain `EvaluationInput`).
    - Export `defaultLibrary` assembled from `defaultSettings`, the four crew profiles and the three environment configs, with empty `scenarios` and `demoPacks` lists for now. Later tasks register each scenario and the demo pack.
    - _Requirements: 1.2, 7.1, 13.1, 22.4_

- [x] 8. Validators
  - [x] 8.1 Create `engine/validate-environment.ts`
    - Implement `validateEnvironmentConfig(env, catalog, config)` that starts with `safeParse` (field = dotted issue path) and reports dose range order, delay range order, missing hazard weight, emphasis weight not above the others, `dose-rate` baseline not at the midpoint, and a `cabin-co2` baseline that satisfies a hard limit of the catalog.
    - Never report an empty `sources` array. Never throw.
    - _Requirements: 1.8, 3.5, 20.1, 20.3, 20.6, 20.8, 20.9_

  - [x] 8.2 Create `engine/validate-crew.ts`
    - Implement `validateCrewProfile(profile, catalog, config, settings)` reporting unknown indicator id, period differing from the catalog `periodDays`, bounds differing from the catalog valid range, pre-flight samples below `minSeedReadings`, a baseline range (baseline plus or minus clip times `noiseSd`) that satisfies a hard limit, `noise-resolution` (SD-10), `preflight-count-odd` and `reserved-id`.
    - _Requirements: 1.8, 3.5, 20.1, 20.3, 20.5, 20.8, 20.9_

  - [x] 8.3 Create `engine/validate-demo-pack.ts`
    - Implement `validateDemoPack(pack, library, catalog, config)` reporting target durations above 180 seconds, unknown scenario id, day outside the scenario duration, first day after last day, focus astronaut not in the scenario crew, and plan steps not ascending.
    - _Requirements: 3.5, 19.7, 20.1, 20.3, 20.9_

  - [x] 8.4 Create `engine/validate-scenario.ts`
    - Implement `validateScenario(scenario, library, catalog, config, clusters)` reporting schema failures, duplicate scenario id, unknown environment id, unknown or duplicate crew id, event dated at or after the duration, unknown indicator id in an event, astronaut id not in the crew, astronaut list on an event that targets a habitat indicator, event on an indicator for which an affected astronaut has no Signal_Spec, and an expectation naming an unknown astronaut, cluster (checked against the cluster ids passed in) or indicator.
    - Return every problem in one list. Never throw.
    - _Requirements: 1.8, 3.4, 3.5, 14.5, 20.1, 20.3, 20.4, 20.9_

  - [x] 8.5 Create `engine/validate-library.ts`
    - Implement `validateLibrary(library, catalog, config, clusters)` that runs the four validators above for every entry and adds: crew count other than four, duplicate crew id, duplicate `resting-hr` baseline, no profile with `resting-hr` 48, `environment-dose-order` (ISS below lunar below Mars, compared for the environments present), and `career-dose-headroom` as specified in the design.
    - _Requirements: 5.4, 7.7, 20.1, 20.3, 20.7, 20.9_

- [x] 9. Checkpoint - Engine foundations compile
  - Run `npm run check` (lint, format:check, typecheck, in that order) and fix every failure. Ensure all checks pass, ask the user if questions arise.

- [x] 10. Runner, editor and engine-input adapter
  - [x] 10.1 Create `engine/run-scenario.ts`
    - Implement `runScenario(scenario, library, catalog, throughDay)`: validate the scenario and return all problems if any; reject a `throughDay` that is not a whole number of 0 or more (field `throughDay`); set `last = min(throughDay, durationDays - 1)`; create the seeded random; build the shared habitat series (`cabin-co2`, `dose-rate`) for days 0 to last; for each astronaut build readings, pre-flight seeds (including habitat seeds), symptom reports (de-duplicated per astronaut, kind and day) and an empty `safetyFlags` list; add the `career-effective-dose` series and the `solar-particle-event` alerts with `endDay` limited to `last`.
    - Include `careerDoseBeforeMissionMsv`, the Environment_Profile and the Ground_Link_Config. Sort astronauts by id, readings by day then indicator id, symptoms by day then kind, alerts by start day then end day. Keep no state. No value may read `throughDay` other than to choose the produced days and clamp alert end days.
    - _Requirements: 1.3, 1.5, 1.6, 1.7, 8.1, 8.4, 8.5, 8.7, 8.9, 8.10, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 11.1, 11.2, 11.5, 11.6, 11.7, 11.8, 12.1, 12.2, 12.3, 12.4, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9_

  - [x] 10.2 Create `engine/engine-input.ts`
    - Implement `buildEvaluationInput(run, astronautId, asOfDay, context)` returning `Result<EvaluationInput, SimulationProblem>`. Copy the fields `astronautId`, `asOfDay`, `seeds`, `readings`, `symptoms`, `safetyFlags`, `alerts`, `careerDoseBeforeMissionMsv` and `environment` from the named astronaut and the shared run fields, and spread the context. Omit `startDay`.
    - Return a problem with field `astronautId` for an unknown astronaut and field `asOfDay` when it is after the last day of the run. Add no tier, threshold, cluster or confidence logic.
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [x] 10.3 Create `scenarios/editor.ts`
    - Implement `injectEvent`, `switchEnvironment` and `switchCrew`. Each builds a new scenario with spread syntax, passes it through `validateScenario`, and returns the scenario only if no problem is found. Otherwise return every problem and no scenario. Leave the input scenario unmodified.
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_

- [x] 11. Storyline and quiet-run checkers
  - [x] 11.1 Create `engine/check-storylines.ts`
    - Implement `checkStorylines(scenario, library, context)`. Run the scenario once through the largest `byDay`, then for each expectation and each astronaut in its scope evaluate with `evaluateAstronaut` as of each day 0 to `byDay`. A cluster expectation holds when some evaluation has a finding of kind `cluster` with the stated id. An indicator expectation holds when some evaluation classifies the indicator at the minimum tier or worse, finding the indicator by position in the classification list.
    - With `withinEarthReference`, count only evaluations whose reading on that day lies inside the catalog `earthReference` range (inclusive, a missing bound is unbounded). Support scopes `astronaut`, `any-crew-member` and `every-crew-member` with a `never` check.
    - Return `expectation-unmet` naming the scenario, scope and expectation, and `engine-error` quoting any engine error. Call only `runScenario`, `buildEvaluationInput` and `evaluateAstronaut`. Contain no tier, threshold or cluster logic.
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.9, 22.2_

  - [x] 11.2 Create `engine/check-quiet-run.ts`
    - Implement `checkQuietRun(scenario, library, context)`. Copy the scenario with no events and no expectations, run it through its last day, evaluate each astronaut as of each replayed day, and report `quiet-run-tier` (naming indicator, astronaut and day) for any non-green tier and `engine-error` for any engine error.
    - _Requirements: 8.8, 15.5_

- [x] 12. Checkpoint - Engine complete
  - Run `npm run check` and fix every failure. Ensure all checks pass, ask the user if questions arise.

- [x] 13. Mars scenario end to end (first priority)
  - [x] 13.1 Create `src/simulation/scenarios/mars/mars-transit-30d.ts`
    - Define the scenario with id `mars-transit-30d`, environment `mars-transit`, seed 2026, 30 days and crew `aria`, `kofi`, `mei`. Events: `drift` `sleep-hours` day 6 at -0.12 per day; `moodDip` day 14, depth 1.5, 5 days; `solarParticleEvent` day 21, `moderate`; and the extra crew-wide `drift` on `resting-hr` from day 14 at +2 per day for 8 days (SD-6).
    - Expectations: `fatigue-stress` cluster for any crew member by day 29; `resting-hr` at yellow or worse within the Earth reference for `mei` by day 29; `dose-rate` red for every crew member by day 21. End with `satisfies Scenario`. Delete `scenarios/mars/.gitkeep`.
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 22.4, 22.7_

  - [x] 13.2 Register the Mars scenario in `src/simulation/library.ts`
    - Add the scenario to `defaultLibrary.scenarios`.
    - _Requirements: 13.1, 16.1_

- [x] 14. Checkpoint - Mars compiles
  - Run `npm run check` and fix every failure. Ensure all checks pass, ask the user if questions arise.

- [x] 15. ISS scenario (second priority)
  - [x] 15.1 Create `src/simulation/scenarios/iss/iss-early-adaptation-30d.ts`
    - Define the scenario with id `iss-early-adaptation-30d`, environment `iss`, seed 7001, 30 days and crew `aria`, `kofi`, `mei`, `tomas`. Use the eight events of the design table: the three week-1 drifts (`resting-hr` +0.6, `bp-systolic` -0.8, `bp-diastolic` -0.6 per day for 5 days), the day-1 `headache` for `aria` and `kofi`, the treadmill `equipmentOutage` (day 12, fraction 0.6, 12 days), the `cabin-co2` drift from day 20 at 0.15 per day, the day-24 `headache` for `aria`, and the one-day `reaction-time` pulse of +100 on day 25 for `aria`.
    - Expectations: `possible-co2-exposure` cluster for any crew member by day 29; `exercise-adherence` at orange for any crew member by day 29. End with `satisfies Scenario`. Delete `scenarios/iss/.gitkeep`.
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 22.4, 22.7_

  - [x] 15.2 Register the ISS scenario in `src/simulation/library.ts`
    - Add the scenario to `defaultLibrary.scenarios`.
    - _Requirements: 13.1, 17.1_

- [x] 16. Lunar scenario (third priority)
  - [x] 16.1 Create `src/simulation/scenarios/lunar/lunar-dust-eva-14d.ts`
    - Define the scenario with id `lunar-dust-eva-14d`, environment `lunar-surface`, seed 4004, 14 days and all four crew. Events: `eva` on days 3 and 7 (+20 bpm, 1 day, `aria` and `kofi`); `symptom` `sore-throat` and `other` from day 5 for 4 days for `aria` and `kofi`; `solarParticleEvent` day 9, `moderate`.
    - Expectation: `dose-rate` red for every crew member by day 9. End with `satisfies Scenario`. Delete `scenarios/lunar/.gitkeep`.
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 22.4, 22.7_

  - [x] 16.2 Register the lunar scenario in `src/simulation/library.ts`
    - Add the scenario to `defaultLibrary.scenarios`.
    - _Requirements: 13.1, 18.1_

- [x] 17. Demo pack (last priority)
  - [x] 17.1 Create `src/simulation/demo-packs/judges-demo.ts`
    - Define the pack `judges-3min` with six segments for plan steps 2 to 7 in order, using the scenario ids, day ranges, focus astronauts, target seconds (30, 30, 40, 20, 30, 20) and plain-language captions of the design table. Steps 2 to 5 use the Mars scenario with `mei` as focus of step 5, and step 7 uses the ISS scenario. Steps 1 and 8 are not segments. End with `satisfies DemoPack`.
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 22.4_

  - [x] 17.2 Register the demo pack in `src/simulation/library.ts`
    - Add the pack to `defaultLibrary.demoPacks`.
    - _Requirements: 19.1, 20.1_

- [x] 18. Aggregate verification function (addition beyond design.md)
  - [x] 18.1 Create `src/simulation/engine/verify.ts`
    - **Addition beyond `design.md`, approved by the user.** `engine/verify.ts` is not in the design's folder layout. `design.md` and `requirements.md` are not edited. The file only calls functions the design already defines.
    - Implement a plain function `verifySimulation(library, context)`. `context` is the `SimulationContext` (catalog, config, clusters, text), so the function reads no file and imports nothing from `src/data/`. It takes the catalog, config, clusters and text as parameters, like the rest of the simulation.
    - Run `validateLibrary(library, context.catalog, context.config, context.clusters)` first. Then, for every scenario in `library.scenarios` (Mars, ISS and lunar once registered), run `checkQuietRun` and `checkStorylines`. The library validation also covers the registered demo pack.
    - Return one aggregate report as plain data: the library problems, and for each scenario its id with its quiet-run problems and storyline problems, plus a flat list of all problems and a boolean that is true when that list is empty. Every field is a string, number, boolean, array or plain object, so the report serialises to JSON. Reuse `SimulationProblem` from `engine/problem.ts`. If the report needs a schema, define it with `z.strictObject` in this file, with no `transform`, `preprocess` or `catch`.
    - Never throw. Mutate no argument. Hold no module-level state. Add no tier, threshold or cluster logic, and use no `any`, no `Math.random`, no `Date.now` and no `new Date`. Follow all rules listed under Overview.
    - Add no test, test file, test runner, package or script. Do not change `package.json`. Add no runner script and no dev page.
    - **Manual team step, not a coding task.** Nothing in the repository calls `verifySimulation`, because the project has no runner script. Running it with the shipped catalog, config, clusters and text, for example from a dev page or a one-off local call, belongs to the team. If it reports problems, the team fixes data values (a seed, a baseline, a noise value or an event size) and runs it again. Functions are not changed to make a check pass.
    - _Requirements: 8.8, 20.1, 20.3, 20.9, 21.1_

- [x] 19. Final checkpoint - Repository checks
  - Run `npm run check` and `npm run build` and fix every failure.
  - Confirm `package.json` and `package-lock.json` gained no dependency and no script compared with the start of this spec.
  - Confirm no test file exists in the repository (no `*.test.*`, `*.spec.*` or `__tests__` entry) and no test runner config exists.
  - Search `src/simulation/` and confirm no file imports `@/data` or a relative path into `src/data`, and none uses `Math.random`, `Date.now`, `new Date`, `Math.log`, `Math.cos`, `Math.pow`, `**`, `any` or an `as` assertion used to silence a type error.
  - Confirm the same for the new `src/simulation/engine/verify.ts`: it takes the catalog, config, clusters and text as parameters, imports nothing from `src/data/`, uses none of the banned calls or `any`, and `package.json` gained no dependency, script or test runner because of it.
  - Confirm no `.gitkeep` remains in a `src/simulation/` folder that holds a real file.
  - Ask the user if questions arise.

## Notes

- There are no optional (`*`) tasks, because this plan has no test tasks. The project has no test runner and this spec adds none.
- The design specifies no combined runner or dev page. It states that `validateLibrary`, `checkQuietRun` and `checkStorylines` are plain functions that a later dev page or load-time check calls, and that building that page is outside this spec. This plan adds one task beyond the design (task 18, `engine/verify.ts`, approved by the user): a plain `verifySimulation` function that runs the design's recipe and returns an aggregate report. It adds no runner script and no dev page. `npm run check` and `npm run build` do not execute simulation code, so the shipped scenarios are confirmed to compile but are not confirmed to produce their storylines until the team runs `verifySimulation` (or the recipe) and gets an empty problem list.
- Seeds, noise values and event sizes come from the design and were tuned in the design's throwaway run. If a later run of the recipe fails, change the data value and run it again. Do not change a function.
- Each task references requirement clauses for traceability. The design's Correctness Properties are supported by the mechanisms named in the design (types, schemas, validators, the two checkers, construction), not by tests.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "3.1"] },
    { "id": 1, "tasks": ["2.2", "3.2", "4.1", "5.1", "6.1", "6.2"] },
    { "id": 2, "tasks": ["2.3", "3.3", "4.2", "4.3", "4.4", "5.2", "6.3"] },
    { "id": 3, "tasks": ["6.4", "7.1"] },
    { "id": 4, "tasks": ["7.2", "8.1", "8.2"] },
    { "id": 5, "tasks": ["8.3", "8.4"] },
    { "id": 6, "tasks": ["8.5", "10.1", "10.2", "10.3"] },
    { "id": 7, "tasks": ["11.1", "11.2"] },
    { "id": 8, "tasks": ["13.1"] },
    { "id": 9, "tasks": ["13.2"] },
    { "id": 10, "tasks": ["15.1"] },
    { "id": 11, "tasks": ["15.2"] },
    { "id": 12, "tasks": ["16.1"] },
    { "id": 13, "tasks": ["16.2"] },
    { "id": 14, "tasks": ["17.1"] },
    { "id": 15, "tasks": ["17.2"] },
    { "id": 16, "tasks": ["18.1"] }
  ]
}
```
