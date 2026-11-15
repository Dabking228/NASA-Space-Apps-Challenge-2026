# Implementation Plan: Domain Engine

## Overview

This plan builds the framework-free health-logic core in `src/domain/` and the rule data in `src/data/`, following the folder layout in `design.md`. It works from the bottom up: vocabulary and schemas, baseline and classification, catalog validation, clusters and findings, the evaluation replay, and finally the data files that carry every threshold.

The project has no test runner (`.kiro/steering/tech.md`). No task installs, configures or runs Vitest, fast-check or any other test tool, and no task creates a test file or a test script. Correctness comes from strict TypeScript, exhaustive `switch` with a `never` check, `Record` keyed by full unions, `satisfies` on data, `Equal<>` assertions in `src/domain/type-guards.ts`, Zod validation at boundaries, the `validateCatalog` function, `npm run check` (lint, format:check, typecheck) and `npm run build`. For that reason the plan has no property-test or unit-test sub-tasks. The design's "Correctness Properties" are documented invariants, and tasks cite them as "Invariants" so reviewers know what each piece must preserve.

Hard rules that apply to every task:

- Pure TypeScript in `src/domain/`: no import from `src/data/`, no React or Next imports, no `Math.random`, no `Date.now`, no `any`, no module-level mutable state, no mutation of arguments, no in-place sort. Functions return `Result` or collect errors and never throw on caller data.
- Every switch over a union ends with a `never` check. Every data file value ends with `satisfies <Type>`. No `as` casts to silence type errors.
- Values come from `docs/PROJECT.md` sections 6 to 9 as written, with their A/B/C flags. Operators are kept exactly as written. Every `sources` array is empty. No threshold or source is invented. Values the design proposes carry a `proposed-default` marker (TD-11 to TD-17, TD-22, TD-23).
- TD-27 stays flagged as a team decision: the Cognitive_Dip is a single reaction-time reading at least 25% above the baseline mean, and the CO₂ cluster member is a cabin CO₂ reading above the habitat baseline mean with no yellow gate. The data file comments must say so.
- Add no dependency and no script to `package.json`. Delete each `.gitkeep` in `src/domain/baseline`, `src/domain/environments`, `src/domain/indicators` and `src/domain/rules` in the task that first adds a real file to that folder.

## Tasks

- [x] 1. Vocabulary, schemas and shared helpers
  - [x] 1.1 Create vocabulary, input schemas and the environment profile
    - Create `src/domain/schemas/vocabulary.ts` with Zod 4 schemas and inferred types for `VerificationFlag`, `Confidence`, `Hazard`, `BodySystem`, `QualityFlag`, `SymptomKind`, `MissionDay` and `RuleSource` (`project-doc` or `proposed-default`). Export `BODY_SYSTEM_ORDER` (`as const satisfies readonly BodySystem[]`) and `BODY_SYSTEM_LABELS` (`satisfies Record<BodySystem, string>`).
    - Create `src/domain/schemas/source.ts` (`SourceReferenceSchema`) and `src/domain/schemas/reading.ts` (`ReadingSchema`, `SymptomReportSchema`, `SafetyFlagSchema`, `AlertReportSchema` with the `endDay >= startDay` refinement). Use `z.strictObject`, no `.transform`, no `.catch`, no `.preprocess`. Infer every type with `z.infer` from the same schema.
    - Create `src/domain/environments/environment-profile.ts` with `EnvironmentProfileSchema` (`id`, `label`, `backgroundDoseRateMsvPerDay`, `hazardWeights` keyed by all five hazards) and its type. Include no ISS, lunar or Mars values. Delete `src/domain/environments/.gitkeep`.
    - Reuse the existing `TierSchema` from `src/domain/tier-schema.ts` and the `Tier` type from `src/domain/types.ts` without redefining them.
    - _Requirements: 1.1, 1.2, 9.1, 9.3, 9.4, 10.1, 10.2, 10.4, 10.6, 2.1, 2.5_

  - [x] 1.2 Create the indicator definition and engine config schemas
    - Create `src/domain/schemas/indicator.ts` with `ComparisonSchema`, `SequenceConditionSchema`, `SequenceRuleSchema`, `ConditionalRuleSchema`, `ContextRuleSchema`, `DeviationSettingsSchema` (`minAbsoluteChange` nullable, `direction` default `both`), `IndicatorDefinitionSchema`, and the `IndicatorDraft` type (the definition without `hazards`, `system` and `verification.mapping`). Keep `sources` as an array that may be empty, `verification.thresholds` and `verification.mapping` as arrays with at least one flag, and `earthReference` as informational data only.
    - Create `src/domain/schemas/config.ts` with `EngineConfigSchema` (`deviationDefaults`, `baseline`, `freeze`, `persistence`, `confidence`) as in the design.
    - Export the inferred types: `IndicatorDefinition`, `IndicatorDraft`, `Comparison`, `EngineConfig`, and the config sub-types needed by later tasks (`BaselineConfig`, `PersistenceConfig`, `ConfidenceConfig`, `ResolvedDeviation`).
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7, 3.9, 10.1, 10.2, 10.4, 29.4_

  - [x] 1.3 Create the cluster, finding and catalog-problem schemas
    - Create `src/domain/schemas/cluster.ts` with `ClusterMemberSchema` (kinds `indicator`, `baseline-relative`, `symptom`) and `ClusterDefinitionSchema` (`windowDays`, `windowSource`, `tier`, `system`, `members`, `supporting`, `tierRaises`, `verification`, `sources`).
    - Create `src/domain/schemas/finding.ts` with `FindingSchema` (`id`, `kind`, `clusterId?`, `day`, `tier`, `reason`, `confidence`, `action`, `sourceIds` that may be empty, `indicators`, `system`).
    - Create `src/domain/schemas/catalog-problem.ts` with `CatalogProblemCodeSchema` and `CatalogProblemSchema`. Every field is a string so the value survives a JSON round trip.
    - Export the inferred types `ClusterDefinition`, `ClusterMember`, `Finding`, `CatalogProblem` and `CatalogProblemCode`.
    - _Requirements: 10.1, 10.4, 18.1, 24.1, 24.9, 24.10, 29.4, 29.14_

  - [x] 1.4 Create tier helpers and the `Result` type
    - Create `src/domain/tiers.ts` with `TIER_ORDER` and `CONFIDENCE_ORDER` (`as const satisfies`), `compareTiers`, `maxTier`, and `worstTier(tiers: readonly [Tier, ...Tier[]])`. The order is green < yellow < orange < red and low < medium < high.
    - Create `src/domain/result.ts` with `Result<T, E>` and the `DomainError` union (`unknown-indicator`, `baseline-unavailable`, `duplicate-reading`, `value-out-of-range`, `invalid-input`), each with a `message` that names the offending id or field.
    - Invariants: Property 1 (worst tier).
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 10.3, 10.6, 2.3_

  - [x] 1.5 Re-export types and add compile-time type assertions
    - Update `src/domain/types.ts` to keep the existing `Tier` declaration and add `export type { ... } from './schemas/...'` for every other exported type (Verification_Flag, Confidence, Hazard, Body_System, Source_Reference, Reading, Symptom_Report, Indicator_Definition, Finding, Environment_Profile and the rest from tasks 1.1 to 1.3).
    - Create `src/domain/type-guards.ts` with `Equal<A, B>`, `Expect<T extends true>`, and one exported assertion alias per exported type against its `z.infer` type. Add `TierMatchesSchema`, `TierOrderIsComplete`, `ConfidenceOrderIsComplete` and `BodySystemOrderIsComplete`. The file contains types only and no runtime code.
    - _Requirements: 1.1, 1.2, 1.3, 10.4, 29.2, 29.3_

- [ ] 2. Checkpoint - Foundation compiles
  - Run `npm run check` (lint, format:check, typecheck) and fix every failure. Ensure all checks pass, ask the user if questions arise.

- [ ] 3. Baseline and classification
  - [x] 3.1 Implement baseline statistics and `computeBaseline`
    - Create `src/domain/baseline/stats.ts` with `meanOf` and `sampleSd`. Both sum over a copy sorted ascending so reordering gives identical results. `sampleSd` uses n−1, returns 0 for a single value and clamps the variance at zero before the square root.
    - Create `src/domain/baseline/compute-baseline.ts` with the `Baseline` type, `BaselineInput` and `computeBaseline`. Use accepted readings with `asOfDay − windowDays < day ≤ asOfDay` when at least `minWindowReadings` remain, else the seed statistics, else a `baseline-unavailable` error that names the astronaut and the indicator. Read the window length and minimums from `config.baseline`.
    - Delete `src/domain/baseline/.gitkeep`.
    - Invariants: Properties 7, 8, 9, 10.
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 12.3, 2.3, 2.4_

  - [x] 3.2 Implement comparison, deviation and persistence rules
    - Create `src/domain/rules/classification-types.ts` with `RuleHit`, `DeviationEvidence`, `ClassificationContext`, `BaseClassification`, `Classification` and `ResolvedDeviation` as in the design. The `no-data` variant has no `tier` field.
    - Create `src/domain/rules/compare.ts` with `compare(value, comparison)` using an exhaustive `switch` over `gt`, `gte`, `lt`, `lte`.
    - Create `src/domain/rules/deviation.ts` with `classifyDeviation`: one floor gate that applies to both the yellow and the orange tier (TD-2), a `null` floor counted as 0 with `floorPending: true` in the evidence (TD-11), and the direction filter (`both`, `high`, `low`). Return the evidence (mean, SD, signed difference, floor, SD multiples, direction).
    - Create `src/domain/rules/persistence.ts` with `applyPersistence(tier, earlierBaseTiers, cfg)`. It reads base tiers only and a `no-data` entry breaks the chain.
    - Delete `src/domain/rules/.gitkeep`.
    - Invariants: Properties 14 (operators), 16, 17, 18.
    - _Requirements: 13.4, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10, 15.1, 15.2, 15.3, 15.4, 15.5, 17.2_

  - [ ] 3.3 Implement `classifyBase`
    - Create `src/domain/rules/classify-base.ts`. Evaluate in this order: hard limits (red, then orange), sequence rules, conditional rules, context rules, and the deviation rule only when none was satisfied. The base tier is the worst satisfied tier. Hard limits and sequence rules never read `earthReference`.
    - Sequence rules: periods `k = 0..N−1` cover `(day − (k+1)·periodDays, day − k·periodDays]`, the latest reading in each period counts, all N must exist and satisfy the condition, and missing period end days go in `missingPeriods`. Support the `absolute`, `baseline-relative` and `background-multiple` conditions with an exhaustive `switch`.
    - Conditional rules need a symptom of a listed kind (or any symptom) or a safety flag on the same Mission_Day. Context rules: `allowance-fraction` written without division against `careerLimitMsv − careerDoseBeforeMissionMsv`, and `external-alert` for a solar particle event covering the day.
    - Return `no-data` when there is no reading in `[day − periodDays + 1, day]` and no evaluable sequence rule. Return an `unknown-indicator` error for an unknown id. When the baseline is missing, skip deviation and baseline-relative rules and still run hard limits.
    - Invariants: Properties 6, 14, 15, 19, 20, 33, 34.
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.9, 6.4, 10.3, 13.1, 13.2, 13.3, 13.5, 13.6, 13.7, 14.4, 14.5, 16.1, 16.2, 16.3, 16.4, 17.1, 17.2_

- [ ] 4. Catalog validation and lookups
  - [ ] 4.1 Implement `validateCatalog`
    - Create `src/domain/indicators/validate-catalog.ts` with `CatalogInput` and `validateCatalog(input): readonly CatalogProblem[]`. It never throws, returns every problem in one list, and returns an empty list when there are none.
    - Steps: schema pass with `safeParse` (every Zod issue becomes one problem with entry id and dotted field path, using `indicators[n]` when the id is missing and `engine-config` for the config); `invalid_value` on `system` or `hazards[i]` becomes `unknown-body-system` or `unknown-hazard` and quotes the value; `too_small` on `verification.thresholds` or `verification.mapping` becomes `missing-verification-flags`; one problem per duplicate indicator or cluster id; `limit-order` (field `hardLimits.red`); `sd-order` (field `deviation.orangeSd`, falling back to `deviationDefaults`); `unknown-indicator-ref` for cluster members, supporting members and `tierRaises.memberId`; `unapproved-source` for any source id not in `approvedSourceIds`.
    - An empty `sources` array is valid and never produces a problem. Use an exhaustive `switch` over `CatalogProblemCode` wherever a display or mapping function branches on it.
    - Delete `src/domain/indicators/.gitkeep`.
    - Invariants: Properties 3, 35.
    - _Requirements: 3.6, 3.7, 3.8, 27.1, 29.4, 29.6, 29.7, 29.8, 29.9, 29.10, 29.11, 29.12, 29.13, 29.14_

  - [ ] 4.2 Implement `buildCatalog`, hazard and system lookups, and the verification checker
    - Create `src/domain/indicators/build-catalog.ts` with `Catalog`, `IndicatorMapping`, `buildCatalog` and the lookups `indicatorsForHazard` and `indicatorsForSystem`. `buildCatalog` merges each draft with its mapping entry, reports `missing-mapping` for a draft without one, calls `validateCatalog`, and returns `ok: false` with every problem or the parsed values. It is the only way to obtain a `Catalog`.
    - Create `src/domain/indicators/verification.ts` with `findUnverifiedIndicators` (`sources.length === 0`), `unverifiedForFinding` and `findPendingFloors` (`minAbsoluteChange === null`). None of them throws or signals failure (TD-10).
    - Invariants: Properties 31, 32.
    - _Requirements: 27.1, 27.3, 27.4, 28.1, 28.2, 28.3, 28.4, 28.5, 29.13_

- [ ] 5. Clusters, confidence, findings and body systems
  - [ ] 5.1 Implement the cluster detector
    - Create `src/domain/rules/clusters.ts` with `DayClassifications`, `ClusterDetection` and `detectClusters(clusters, days, symptoms, asOfDay)`.
    - A member is satisfied by kind: `indicator` (classification at least `minTier` plus the direction filter `any`, `above-baseline` or `below-baseline`, TD-4 and TD-22), `baseline-relative` (a reading that day, a baseline in force, and `compare(value, {op, mean·(1+fraction)})`, with no tier gate, TD-27), and `symptom` (a listed kind on that day). Use exhaustive `switch` statements over the member kinds and directions.
    - Detect a cluster when every required member is satisfied on some day in `[asOfDay − windowDays + 1, asOfDay]`. Return at most one detection per cluster id, with the evidence of every member, the definition's window and tier, and the maximum tier over matching `tierRaises` entries. A detection never lowers a tier. Supporting members are reported separately.
    - Invariants: Properties 21, 22, 23, 24.
    - _Requirements: 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 19.1, 19.2, 19.4, 20.1, 20.2, 20.3, 21.1, 21.2, 21.3, 22.1, 22.3, 22.4, 23.1, 23.2, 23.3_

  - [ ] 5.2 Implement the confidence evaluator
    - Create `src/domain/rules/confidence.ts` with `ConfidenceFactors` and `evaluateConfidence(factors, cfg)`. Compute `score = start − Σ(step of each true reduction factor) + (supportingSignal ? supportBonusSteps : 0)`, clamped between low and high using `CONFIDENCE_ORDER`. Each factor counts once. A configured step of 0 is allowed.
    - Invariants: Properties 28, 29.
    - _Requirements: 17.4, 19.3, 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7, 25.8, 25.9_

  - [ ] 5.3 Implement finding text rendering and the finding builder
    - Create `src/domain/rules/text.ts` with the `FindingText` interface (`indicatorReason`, `clusterReason`, `opWords`, `ruleSentences`, `tierSteps`, `clusterSteps`) and `renderTemplate`, which returns an `invalid-input` error for an unknown placeholder. Use an exhaustive `switch` over the comparison operators when choosing a word.
    - Create `src/domain/rules/findings.ts` with `buildFindings`. Produce one indicator finding per classification at yellow, orange or red and one cluster finding per detection. Use deterministic ids (`indicator:<id>:<day>`, `cluster:<id>:<day>`). The reason names every contributing indicator label, its value with unit, and a sentence per rule hit. The action is numbered steps, cluster steps first (the possible-CO₂-exposure cluster starts with the environment check), then the tier steps from PROJECT.md section 8. `sourceIds` is the sorted, de-duplicated union of the contributors' source ids and is empty when all are empty (TD-6). `indicators` is the sorted list of contributing ids. Derive the confidence factors here (missing data, poor quality, single signal, supporting signal). If a template fails to render, fall back to a plain reason that lists indicator, value and rule, and report the error.
    - Invariants: Properties 26, 27.
    - _Requirements: 22.2, 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8, 24.9, 24.10, 25.1_

  - [ ] 5.4 Implement body-system aggregation
    - Create `src/domain/rules/body-systems.ts` with the `SystemStatus` discriminated union (`no-data` and `classified`) and `aggregateBodySystems(catalog, classifications, findings)`. For each system in `BODY_SYSTEM_ORDER`, take the worst tier of its indicators that have data, raise it to the tier of a cluster finding that names the system (never lower, TD-5), and report `no-data` when there is neither indicator data nor a cluster finding. List contributing indicator ids and the ids of findings above green. Ignore `no-data` indicators.
    - Invariants: Property 30.
    - _Requirements: 17.3, 26.1, 26.2, 26.3, 26.4, 26.5_

- [ ] 6. Checkpoint - Engine pieces compile
  - Run `npm run check` and fix every failure. Ensure all checks pass, ask the user if questions arise.

- [ ] 7. Evaluation orchestrator
  - [ ] 7.1 Implement input preparation for the replay
    - Create `src/domain/evaluate-input.ts` as a helper for `evaluate.ts`. Define `EvaluationInput`, `DayState` and `EvaluationResult` exactly as in the design, with `readonly` fields and arrays.
    - Add a function that prepares input: drops records of other astronauts and records after `asOfDay`; validates records with `safeParse` and reports `invalid-input`; reports `unknown-indicator` and `value-out-of-range` (against `validRange`) and ignores those readings; reports `duplicate-reading` and keeps one reading by the fixed order good quality first, then lower value (TD-24); and returns copies sorted by a total order (readings by day, indicator id, quality, value; symptoms by day, kind; safety flags by day; alerts by start day, end day). Sort copies only, never in place.
    - Invariants: Properties 2, 13, 25.
    - _Requirements: 2.3, 2.4, 10.2, 10.3, 10.6, 12.4, 18.7_

  - [ ] 7.2 Implement `evaluateAstronaut`
    - Create `src/domain/evaluate.ts` with the day-by-day replay from `startDay` (default: earliest reading day, else `asOfDay`) to `asOfDay`. On each day: hold the previous baselines if the previous day was frozen, else compute baselines as of `day − 1` from accepted readings (quality `good` on a non-frozen day), with the seed on the first day (a reading never shapes its own baseline); run `classifyBase` per indicator; apply persistence using base tiers one `periodDays` apart (TD-20); set `frozen` when any final tier is at or above `config.freeze.atOrAbove`.
    - After the loop: run `detectClusters` over the window ending at `asOfDay`, `buildFindings`, and `aggregateBodySystems`. Return classifications ordered by indicator id, findings ordered by id, body systems in `BODY_SYSTEM_ORDER`, the per-day `history`, and the collected `errors`. A `baseline-unavailable` error does not stop hard-limit and sequence evaluation.
    - Never mutate input, read a clock, or throw. Do not import from `src/data/`: receive catalog, clusters, config and text as parameters.
    - Invariants: Properties 2, 11, 12, 13, 25 (review these first when this file changes).
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 12.1, 12.2, 12.3, 12.4, 15.1, 15.3, 17.1, 18.2, 19.1, 24.7, 26.1_

- [ ] 8. Data files in `src/data/`
  - [x] 8.1 Create the engine config and approved source list
    - Create `src/data/engine-config.ts` with the shipped values: `deviationDefaults { yellowSd: 2, orangeSd: 3 }` (PROJECT.md 6.2, flag B), `baseline { windowDays: 14, minSeedReadings: 2, minWindowReadings: 2 }`, `freeze.atOrAbove: 'orange'`, `persistence { minTier: 'yellow', consecutivePeriods: 2, raisesTo: 'orange' }`, `confidence { start: 'high', steps { missingData: 1, poorQuality: 1, singleSignal: 1 }, supportBonusSteps: 1 }`. Type it with `satisfies z.input<typeof EngineConfigSchema>`.
    - Create `src/data/indicators/approved-sources.ts` exporting an empty `approvedSourceIds` array.
    - _Requirements: 11.3, 11.9, 12.1, 15.1, 25.1, 3.5, 29.3_

  - [x] 8.2 Create the vitals indicator drafts
    - Create `src/data/indicators/vitals.ts` with drafts `resting-hr`, `bp-systolic`, `bp-diastolic`, `body-temperature`, `spo2` and `fasting-glucose`, each `satisfies IndicatorDraft`, with `sources: []`.
    - Take limits and operators from PROJECT.md section 6.3 exactly as written (for example resting HR orange `>110` and `<45`, red `>130` and `<40`, with the conditional red for chest pain or fainting; systolic orange `≥140` and `<90`, red `≥180`, conditional red `<80` with any symptom; diastolic orange `≥90`, red `≥120`; temperature orange `≥38.0` and `<35.5`, red `≥39.0` and `<35.0`; SpO₂ orange `<92`, red `<90`; glucose orange `≥126` and `<70`, red `<54` and `>300`). Keep every listed flag (A, B or A, C). Resting HR deviation has floor 5 and flag B. Systolic, diastolic and temperature have deviation settings with `minAbsoluteChange: null` (TD-11, TD-12). Set `periodDays` per TD-17 and store `earthReference` ranges as information only.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 3.2, 3.3, 3.4, 3.5, 3.8, 3.9, 16.1, 16.2_

  - [x] 8.3 Create the sleep and behavioural-health indicator drafts
    - Create `src/data/indicators/sleep-behaviour.ts` with drafts `sleep-hours`, `mood`, `who5` and `reaction-time`, each `satisfies IndicatorDraft`, with `sources: []`.
    - Sleep: orange `<6` h for 3 periods, red `<4` h for 1 period and `<5` h for 5 periods, flags B and C. Mood: orange `≤2` for 3 periods, conditional red `≤1` with a safety flag, flag B, `validRange` 1 to 5. WHO-5: orange `<50`, red `≤28`, flag A, `periodDays: 7`, `validRange` 0 to 100. Reaction time: orange baseline-relative `≥ +25%` for 2 periods, no red rule, flags B and C, deviation direction `high`, floor `null`, `periodDays: 1` marked `proposed-default` (TD-17). Sleep and mood have deviation settings with a `null` floor (TD-11, TD-12).
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 3.2, 3.4, 3.5, 16.3_

  - [-] 8.4 Create the nutrition and musculoskeletal indicator drafts
    - Create `src/data/indicators/nutrition-msk.ts` with drafts `body-mass-change-30d`, `energy-intake` and `exercise-adherence`, each `satisfies IndicatorDraft`, with `sources: []`.
    - Body mass change: percentage loss, orange `≥5`, red `≥10`, flag A, supplied by the caller. Energy intake: orange `<70` for 3 periods, flags B and C. Exercise adherence: orange `<50` for 2 periods, flags B and C, `periodDays: 7`. Body mass change and energy intake have deviation settings with a `null` floor (TD-11, TD-12).
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 3.2, 3.4, 3.5_

  - [-] 8.5 Create the radiation and habitat indicator drafts
    - Create `src/data/indicators/radiation.ts` with drafts `career-effective-dose` and `dose-rate`, and `src/data/indicators/habitat.ts` with draft `cabin-co2`, each `satisfies IndicatorDraft`, with `sources: []`.
    - Career dose: `careerLimitMsv: 600`, flag C, context rules orange at `0.8` of the remaining allowance and red above it; the projected dose is the reading value. Dose rate: orange `> 5×` background for 2 periods (`proposed-default`, TD-14), red `> 20×` background for 1 period, context red for a solar particle event, flags B and C. Cabin CO₂: orange `≥5`, red `≥10` marked as proposed operators (TD-16), flag C, with deviation settings and a `null` floor (TD-11, TD-12).
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 7.7, 7.8, 8.1, 8.2, 3.2, 3.5_

  - [-] 8.6 Create the indicator mapping
    - Create `src/data/indicators/mapping.ts` with the proposed hazard and body-system table from the design (TD-15), typed `satisfies Record<string, { hazards: readonly Hazard[]; system: BodySystem }>` and with `verification.mapping` set to `['C']` for every entry. Every indicator id from tasks 8.2 to 8.5 has an entry.
    - _Requirements: 27.1, 27.2, 3.7_

  - [-] 8.7 Create the cluster definitions
    - Create `src/data/clusters.ts` with `fatigue-stress` (5 days, `project-doc`, supporting `reaction-time`), `possible-infection`, `under-fuelling`, `possible-co2-exposure` and `vision-change`, each `satisfies ClusterDefinition` with `sources: []`. Use windows of 5 days marked `proposed-default` where PROJECT.md is silent (TD-13), flag B on the first four and C on vision change (TD-23). Under-fuelling uses the directions in TD-22. Vision change has `tierRaises` for `sudden-vision-loss` to red.
    - The CO₂ cluster uses a `baseline-relative` member for cabin CO₂ (`gt`, fraction 0) and one for reaction time (`gte`, fraction 0.25). Add a comment on both marking them as team decision TD-27, accepted by the user, so the team can revisit them.
    - _Requirements: 18.1, 18.5, 19.1, 20.1, 21.1, 22.1, 22.4, 23.1, 23.2, 23.4, 3.5_

  - [ ] 8.8 Create the finding text
    - Create `src/data/finding-text.ts` typed `satisfies FindingText`. Provide the reason templates, `opWords`, one rule sentence per rule kind, `tierSteps` for yellow, orange and red (self-management and watch the trend; guided assessment and prepare a message to ground; immediate steps and urgent escalation, from PROJECT.md section 8), and `clusterSteps` by cluster id. The CO₂ cluster's first step is to check the environment. Include no medication, dosing or treatment advice. Use plain language suitable for non-experts.
    - _Requirements: 22.2, 24.2, 24.6, 24.8_

  - [ ] 8.9 Wire the default catalog
    - Create `src/data/indicators/index.ts` that collects the drafts from tasks 8.2 to 8.5, calls `buildCatalog` once at module load with the mapping, clusters, engine config and `approvedSourceIds`, and exports `defaultCatalog`. On `ok: false`, throw an error whose message lists every problem with entry id and field path, so invalid shipped data stops the dev server and the build. Do not add an unverified-indicator check that fails the build (TD-10).
    - _Requirements: 3.1, 3.6, 28.5, 29.4, 29.13_

- [ ] 9. Final checkpoint - Run `npm run check` and `npm run build`
  - Run `npm run check` (lint, format:check, typecheck), then `npm run build`, and fix every failure. Confirm that `package.json` gained no dependency or script, that no test file or test runner exists, that `src/domain/` contains no import from `src/data/`, no `any`, no `Math.random` and no `Date.now`, and that every `sources` array is empty. Ensure all checks pass, ask the user if questions arise.

## Notes

- This plan has no test tasks because the project has no test runner. Do not add Vitest, fast-check or test files. The `Invariants` lines refer to the design's Correctness Properties, which are checked by types, schemas, `validateCatalog` and review.
- `npm run check` does not run engine code. Shipped data is checked by `validateCatalog` when `defaultCatalog` is first imported (for example by a page in a later UI spec or during `next build` if a page imports it). Until a page imports it, a data mistake that the compiler cannot see (a duplicate id, a limit-order error, an unknown cluster reference) is not caught. The reviewer should read the data files against `docs/PROJECT.md` section 6 and the design tables.
- `src/domain/evaluate-input.ts` is a helper file added to keep `evaluate.ts` small. It is not in the design's folder layout.
- Values marked `proposed-default` (TD-11 to TD-17, TD-22, TD-23) and the TD-27 members are team decisions to review. They are data, so changing them never needs a logic change.
- Out of scope: UI, simulation, scenario and environment values, ground link, countermeasure content, any I/O, and a dev page that shows `CatalogProblem` lists.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "3.1", "3.2", "8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7"] },
    { "id": 3, "tasks": ["3.3", "4.1", "5.1", "5.2"] },
    { "id": 4, "tasks": ["4.2"] },
    { "id": 5, "tasks": ["5.3", "5.4"] },
    { "id": 6, "tasks": ["7.1", "8.8"] },
    { "id": 7, "tasks": ["7.2", "8.9"] }
  ]
}
```
