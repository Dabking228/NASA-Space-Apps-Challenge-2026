# Requirements Document

## Introduction

The domain engine is the framework-free health-logic core of the Astronaut Health Companion. It lives in `src/domain/` (types, indicators, baseline, rules, environment types) with indicator and threshold data in `src/data/`. It implements the loop **measure → compare to personal baseline → classify → explain** for one astronaut at a time: indicator definitions (PROJECT.md R1), personal baselines (R2, R3), tier classification (R4), cluster detection (R5), findings (R6), confidence (R7), and body-system aggregation.

This spec covers PROJECT.md section 5 (R1 to R7), section 6 (thresholds), section 7 (cluster rules), section 8 (tiers), section 9 (hazard and body-system mapping), and section 13.5 (domain types). It excludes UI, simulation, scenario data, ground link, countermeasures, and any I/O. The foundation spec already provides the `Tier` type, the Zod `TierSchema`, and ESLint rules that keep `src/domain` free of React/Next and ban `Math.random` and `Date.now`.

The project has no test runner (see `.kiro/steering/tech.md`): no Vitest, Vite, fast-check, or similar tool. Behavioural guarantees in this document are requirements on the functions' behaviour. Correctness is supported by strict TypeScript, compile-time guards, Zod validation of data, and a plain catalog consistency check, all verified by `npm run check` (lint, format:check, typecheck).

Hard rules for this spec:

- Threshold values are taken from PROJECT.md section 6 as written, each with its A/B/C verification flag.
- Every `sources` array is empty until the team supplies citations. No threshold or source is invented. Empty `sources` arrays never fail lint, format:check, typecheck, or build.
- The engine is rule-based and explainable. No machine learning.
- Time is always passed in as input.
- No test runner, test script, test package, or test file is added.

## Glossary

- **Domain_Layer**: The pure TypeScript modules under `src/domain/`.
- **Indicator_Catalog**: The data files under `src/data/` that hold Indicator_Definitions, thresholds, and Cluster_Definitions.
- **Engine_Config**: The data file under `src/data/` that holds engine-wide settings: Baseline_Window length, minimum Pre_Flight_Seed size, Persistence_Rule day count, career dose limit, and the dose thresholds of Requirement 7.
- **Indicator_Definition**: A catalog entry describing one indicator: id, label, unit, hard limits, deviation settings, verification flags, sources, hazards, and body system.
- **Reading**: One measurement of one indicator for one astronaut on one Mission_Day, with a value and a Quality_Flag.
- **Quality_Flag**: A Reading attribute with value `good` or `poor`.
- **Mission_Day**: An integer day index supplied by the caller. The Domain_Layer never reads a clock.
- **Symptom_Report**: A caller-supplied record, dated by Mission_Day, of one symptom. Symptom kinds are chest pain, fainting, headache, cough, sore throat, vision blurring, acuity change, sudden vision loss, and other symptom.
- **Safety_Flag**: A caller-supplied boolean, dated by Mission_Day, indicating a behavioural-health safety concern.
- **Tier**: One of `green`, `yellow`, `orange`, `red`, ordered from least to most severe.
- **Verification_Flag**: One of `A` (standard clinical reference), `B` (team heuristic), `C` (space-specific, written from memory).
- **Source_Reference**: A citation record with a stable id. An Indicator_Definition with an empty `sources` array is Unverified.
- **Confidence**: One of `high`, `medium`, `low`, ordered from highest to lowest.
- **Hazard**: One of `radiation`, `isolation-confinement`, `distance-from-earth`, `gravity-fields`, `hostile-closed-environment`.
- **Body_System**: One of `cardiovascular`, `musculoskeletal`, `vision`, `immune`, `mental`, `sleep`.
- **Baseline**: The mean and standard deviation (SD) of one astronaut's readings for one indicator.
- **Baseline_Window**: The most recent 14 Mission_Days of accepted in-flight readings used to adapt a Baseline.
- **Pre_Flight_Seed**: The caller-supplied pre-flight readings for one astronaut and indicator that initialise the Baseline.
- **Baseline_Engine**: The Domain_Layer component that computes and adapts Baselines.
- **Tier_Classifier**: The Domain_Layer component that assigns a Tier to an indicator for an astronaut as of a Mission_Day.
- **Hard_Limit**: An absolute threshold in an Indicator_Definition that ignores the Baseline.
- **Deviation_Rule**: The Baseline-relative rule: yellow at or above 2 SD, orange at or above 3 SD, in either direction from the Baseline mean, each subject to the minimum absolute change floor.
- **Minimum_Absolute_Change_Floor**: A per-indicator minimum absolute difference from the Baseline mean, in the indicator's unit, below which a Deviation_Rule tier does not apply.
- **Sequence_Rule**: A rule in an Indicator_Definition that assigns a Tier when a stated condition holds over a stated number of consecutive readings.
- **Persistence_Rule**: The engine-wide rule that an indicator at yellow or worse on 2 or more consecutive Mission_Days is orange.
- **Cluster_Definition**: A catalog entry describing one multi-signal pattern: member signals, window length in Mission_Days, resulting Tier, and body system.
- **Cluster_Detector**: The Domain_Layer component that evaluates Cluster_Definitions.
- **Elevated**: Describes a signal that is classified yellow or worse and whose Reading is above the Baseline mean.
- **Cognitive_Dip**: A reaction time Reading at least 25% above the astronaut's Baseline mean.
- **Finding**: A structured result with id, tier, reason, confidence, action, sourceIds, indicators, and system.
- **Finding_Builder**: The Domain_Layer component that produces Findings from classifications and detected clusters.
- **Confidence_Evaluator**: The Domain_Layer component that assigns Confidence to a Finding.
- **Body_System_Aggregator**: The Domain_Layer component that computes the Tier of each Body_System.
- **Verification_Checker**: The Domain_Layer component that identifies Unverified Indicator_Definitions.
- **Environment_Profile**: A type describing a habitat for the engine: id, label, background radiation dose rate in mSv/day, and hazard weights. Values live in the simulation spec.
- **Domain_Schemas**: The Zod schemas that validate Domain_Layer data at its boundaries.
- **Compile_Time_Guard**: A TypeScript construct (exhaustive `switch` with a `never` check, `Record<Union, ...>`, `satisfies`, or an `Equal<>` type assertion) that makes `npm run typecheck` fail when a type or data shape drifts.
- **Catalog_Problem**: A plain serialisable record describing one consistency problem: a code, the id of the offending entry, the field, and a plain-language message.
- **Catalog_Validator**: The exported function `validateCatalog` that checks the Indicator_Catalog and returns a list of Catalog_Problems.

## Requirements

### Requirement 1: Shared Domain Vocabulary

**User Story:** As a developer, I want one shared set of domain types, so that every module describes tiers, hazards, and body systems the same way.

#### Acceptance Criteria

1. THE Domain_Layer SHALL export the types Tier, Verification_Flag, Confidence, Hazard, Body_System, Source_Reference, Reading, Symptom_Report, Indicator_Definition, Finding, and Environment_Profile from `src/domain/types.ts` or modules that `types.ts` re-exports.
2. THE Domain_Layer SHALL reuse the existing `Tier` type and `TierSchema` without redefining them.
3. THE Domain_Layer SHALL define the Tier order as green < yellow < orange < red and the Confidence order as low < medium < high.
4. THE Domain_Layer SHALL provide a function that returns the worst Tier of a non-empty list of Tiers.
5. WHEN a non-empty list of Tiers is supplied, THE worst-Tier function SHALL return a member of the list that is greater than or equal to every member of the list.
6. WHEN the same non-empty list of Tiers is supplied in a different order, THE worst-Tier function SHALL return the same Tier.

### Requirement 2: Purity and Determinism

**User Story:** As a developer, I want the domain engine to be pure and deterministic, so that it is predictable and runs without any connection to Earth.

#### Acceptance Criteria

1. THE Domain_Layer SHALL import only TypeScript standard features, Zod, and other Domain_Layer or data modules.
2. THE Domain_Layer SHALL receive the current time as a Mission_Day input parameter on every function that depends on time.
3. THE Domain_Layer SHALL return new values and leave function arguments unmodified.
4. WHEN a Domain_Layer function is called twice with equal inputs, THE Domain_Layer function SHALL return equal outputs.
5. THE Domain_Layer SHALL call neither `Math.random` nor `Date.now`.

### Requirement 3: Indicator Definitions as Data (R1)

**User Story:** As a team member, I want each indicator defined in a data file with its limits, flags, and sources, so that thresholds are visible, reviewable, and not buried in code.

#### Acceptance Criteria

1. THE Indicator_Catalog SHALL define each indicator as an Indicator_Definition in `src/data/`, outside React components and outside rule logic.
2. THE Indicator_Definition SHALL contain id, label, unit, Hard_Limits, deviation settings, Verification_Flags, `sources`, hazards, and Body_System.
3. THE Indicator_Definition SHALL carry the deviation settings yellowSd, orangeSd, and Minimum_Absolute_Change_Floor as data, where the Indicator_Catalog supplies them.
4. WHERE section 6 of PROJECT.md lists more than one Verification_Flag for an indicator, THE Indicator_Definition SHALL retain every listed flag.
5. THE Indicator_Catalog SHALL set the `sources` array of every Indicator_Definition to an empty array.
6. THE Indicator_Catalog SHALL give each Indicator_Definition a unique id.
7. THE Indicator_Definition SHALL list at least one Hazard and exactly one Body_System.
8. WHERE an Indicator_Definition has both orange and red limits on the same side, THE Indicator_Catalog SHALL set the red limit at least as severe as the orange limit.
9. THE Indicator_Catalog SHALL record the section 6 earth-reference range of an indicator as informational data that the Tier_Classifier does not use.

### Requirement 4: Vitals Thresholds (Section 6.3)

**User Story:** As a crew medical officer, I want resting vitals judged against stated limits, so that dangerous readings are flagged regardless of baseline.

#### Acceptance Criteria

1. THE Indicator_Catalog SHALL define resting heart rate in bpm with orange limits of above 110 and below 45, red limits of above 130 and below 40, and Verification_Flags A and B.
2. THE Indicator_Catalog SHALL define blood pressure in mmHg with an orange limit that applies WHEN systolic is at or above 140, OR diastolic is at or above 90, OR systolic is below 90, a red limit that applies WHEN systolic is at or above 180 OR diastolic is at or above 120, and Verification_Flags A and C.
3. THE Indicator_Catalog SHALL define body temperature in °C with orange limits of at or above 38.0 and below 35.5, red limits of at or above 39.0 and below 35.0, and Verification_Flags A and B.
4. THE Indicator_Catalog SHALL define SpO₂ in % with an orange limit of below 92, a red limit of below 90, and Verification_Flags A and C.
5. THE Indicator_Catalog SHALL define fasting glucose in mg/dL with orange limits of at or above 126 and below 70, red limits of below 54 and above 300, and Verification_Flags A and B.
6. THE Indicator_Catalog SHALL define resting heart rate with a Minimum_Absolute_Change_Floor of 5 bpm, yellowSd of 2, orangeSd of 3, and Verification_Flag B for the deviation settings.
7. THE Indicator_Catalog SHALL store blood pressure as two components, systolic and diastolic, each classifiable against its own limits.

### Requirement 5: Sleep and Behavioural Health Thresholds (Section 6.4)

**User Story:** As a crew member, I want sleep, mood, wellbeing, and reaction time judged against stated rules, so that behavioural decline is caught early.

#### Acceptance Criteria

1. THE Indicator_Catalog SHALL define sleep in hours per night with an orange Sequence_Rule of below 6 h on 3 consecutive nights, red Sequence_Rules of below 4 h on 1 night and below 5 h on 5 consecutive nights, and Verification_Flags B and C.
2. THE Indicator_Catalog SHALL define daily mood on a 1 to 5 scale with an orange Sequence_Rule of 2 or lower on 3 consecutive days, a red rule of a mood of 1 together with a Safety_Flag on the same Mission_Day, and Verification_Flag B.
3. THE Indicator_Catalog SHALL define weekly WHO-5 wellbeing on a 0 to 100 scale with an orange limit of below 50, a red limit of 28 or lower, and Verification_Flag A.
4. THE Indicator_Catalog SHALL define reaction time (PVT-B median) in ms with an orange Sequence_Rule of 25% or more above the astronaut's Baseline on 2 consecutive tests, no red rule, and Verification_Flags B and C.

### Requirement 6: Nutrition and Musculoskeletal Thresholds (Section 6.5)

**User Story:** As a crew member, I want weight, intake, and exercise tracked against stated rules, so that nutrition and deconditioning problems surface.

#### Acceptance Criteria

1. THE Indicator_Catalog SHALL define 30-day body mass change as a percentage loss with an orange limit of 5% or more, a red limit of 10% or more, and Verification_Flag A.
2. THE Indicator_Catalog SHALL define daily energy intake as a percentage of plan with an orange Sequence_Rule of below 70% on 3 consecutive days, no red rule, and Verification_Flags B and C.
3. THE Indicator_Catalog SHALL define weekly exercise adherence as a percentage of the mission-plan target with an orange Sequence_Rule of below 50% on 2 consecutive weeks, no red rule, and Verification_Flags B and C.
4. THE Tier_Classifier SHALL accept the 30-day body mass change percentage as a caller-supplied input value and SHALL leave its computation to the caller.

### Requirement 7: Radiation Thresholds (Section 6.6)

**User Story:** As a crew member, I want radiation exposure judged against career allowance and habitat background, so that I know when exposure becomes a concern.

#### Acceptance Criteria

1. THE Indicator_Catalog SHALL define the career effective dose limit as 600 mSv with Verification_Flag C.
2. WHEN the projected mission dose is at or above 80% of the remaining career allowance, THE Tier_Classifier SHALL classify career effective dose as at least orange.
3. WHEN the projected mission dose is above the remaining career allowance, THE Tier_Classifier SHALL classify career effective dose as red.
4. THE Tier_Classifier SHALL compute the remaining career allowance as the career effective dose limit minus the career dose accrued before the current mission.
5. WHEN the current dose rate is above 5 times the Environment_Profile background dose rate on a sustained basis, THE Tier_Classifier SHALL classify dose rate as at least orange.
6. WHEN the current dose rate is above 20 times the Environment_Profile background dose rate, THE Tier_Classifier SHALL classify dose rate as red.
7. WHEN a solar particle event alert is active, THE Tier_Classifier SHALL classify dose rate as red.
8. THE Indicator_Catalog SHALL assign Verification_Flags B and C to the dose-rate rules.
9. THE Tier_Classifier SHALL accept the projected mission dose as a caller-supplied input value and SHALL leave its computation to the caller.

### Requirement 8: Habitat Environment Thresholds (Section 6.7)

**User Story:** As a crew member, I want cabin CO₂ judged against habitat limits and the habitat baseline, so that air-quality problems are detected.

#### Acceptance Criteria

1. THE Indicator_Catalog SHALL define cabin CO₂ in mmHg with an orange limit of 5, a red limit of 10, and Verification_Flag C.
2. THE Indicator_Catalog SHALL carry a Deviation_Rule for cabin CO₂ so that readings are also judged against the habitat Baseline.

### Requirement 9: Environment Profile Type

**User Story:** As a developer, I want a typed environment profile in the domain, so that the engine can use habitat context without depending on simulation code.

#### Acceptance Criteria

1. THE Domain_Layer SHALL define the Environment_Profile type with id, label, background dose rate in mSv/day, and hazard weights keyed by Hazard.
2. THE Domain_Layer SHALL accept an Environment_Profile as a function parameter wherever environment context is needed.
3. THE Domain_Layer SHALL contain no concrete Environment_Profile values for ISS, lunar surface, or Mars transit.
4. THE Environment_Profile type SHALL contain only the fields id, label, background dose rate, and hazard weights.

### Requirement 10: Input Validation and Serialisation

**User Story:** As a developer, I want data validated at the domain boundary, so that malformed readings and definitions are rejected with clear errors.

#### Acceptance Criteria

1. THE Domain_Schemas SHALL validate Reading, Symptom_Report, Indicator_Definition, Cluster_Definition, Engine_Config, Source_Reference, Environment_Profile, and Finding.
2. IF a numeric field is NaN or infinite, THEN THE Domain_Schemas SHALL reject the value with an error that names the field.
3. IF a Reading refers to an indicator id that is absent from the Indicator_Catalog, THEN THE Tier_Classifier SHALL return an error result that names the unknown id.
4. THE Domain_Schemas SHALL infer their TypeScript types from one definition so that each schema and its type describe the same shape.
5. WHEN a valid Reading, Indicator_Definition, or Finding is serialised to JSON and parsed with the matching Domain_Schema, THE Domain_Schema SHALL produce a value equal to the original.
6. IF an input contains a non-finite number, a wrong enum value, or a missing required field, THEN THE Domain_Schemas SHALL return a failure result and SHALL leave the failure as a returned value rather than a thrown exception.

### Requirement 11: Personal Baseline Computation (R2)

**User Story:** As a crew member, I want each indicator judged against my own baseline, so that normal-for-me is not mistaken for abnormal.

#### Acceptance Criteria

1. THE Baseline_Engine SHALL compute a Baseline mean and SD per astronaut per indicator.
2. WHEN a Pre_Flight_Seed with at least two readings is supplied and no accepted in-flight readings exist, THE Baseline_Engine SHALL return the mean and SD of the Pre_Flight_Seed.
3. THE Baseline_Engine SHALL adapt the Baseline using accepted in-flight readings within the Baseline_Window ending at the evaluation Mission_Day.
4. IF a Pre_Flight_Seed has fewer than two readings, THEN THE Baseline_Engine SHALL return an error result that names the astronaut and indicator.
5. WHEN a non-empty reading set is supplied, THE Baseline_Engine SHALL return a mean that lies between the minimum and maximum reading.
6. WHEN a reading set is supplied, THE Baseline_Engine SHALL return an SD that is greater than or equal to zero.
7. WHEN every reading in a set is shifted by the same constant, THE Baseline_Engine SHALL shift the mean by that constant and return the same SD.
8. WHEN the same readings are supplied in a different order, THE Baseline_Engine SHALL return the same mean and SD.
9. WHEN an accepted in-flight reading dated more than 14 Mission_Days before the evaluation Mission_Day exists, THE Baseline_Engine SHALL exclude that reading from the Baseline.

### Requirement 12: Baseline Freeze (R3)

**User Story:** As a flight surgeon, I want baselines to stop adapting while an astronaut is in trouble, so that a decline cannot become the new normal.

#### Acceptance Criteria

1. WHILE any indicator of an astronaut is classified orange or red, THE Baseline_Engine SHALL hold every Baseline of that astronaut at the value it had before the freeze began.
2. WHEN no indicator of an astronaut is classified orange or red, THE Baseline_Engine SHALL resume adapting the Baselines of that astronaut.
3. THE Baseline_Engine SHALL classify a reading against the Baseline computed before that reading is added.
4. WHILE one astronaut is frozen, THE Baseline_Engine SHALL leave the Baselines of every other astronaut unchanged.

### Requirement 13: Hard Limit and Sequence Classification (R4)

**User Story:** As a crew member, I want absolute limits and stated sequence rules applied first, so that clearly dangerous values are never hidden by my baseline.

#### Acceptance Criteria

1. WHEN a Reading is evaluated, THE Tier_Classifier SHALL evaluate the Hard_Limits and Sequence_Rules of the Indicator_Definition before the Deviation_Rule.
2. WHEN a Reading satisfies a red Hard_Limit or red Sequence_Rule, THE Tier_Classifier SHALL classify the indicator as red regardless of the Baseline.
3. WHEN a Reading satisfies an orange Hard_Limit or orange Sequence_Rule and no red rule, THE Tier_Classifier SHALL classify the indicator as at least orange regardless of the Baseline.
4. THE Tier_Classifier SHALL apply each Hard_Limit comparison operator exactly as stated in the Indicator_Catalog, with inclusive and exclusive bounds preserved.
5. WHEN a Sequence_Rule requires N consecutive readings, THE Tier_Classifier SHALL evaluate that rule over the N most recent consecutive reading periods ending at the evaluation Mission_Day.
6. IF a reading period required by a Sequence_Rule has no Reading, THEN THE Tier_Classifier SHALL treat the Sequence_Rule as not satisfied and report the missing period in the classification result.
7. WHEN a Hard_Limit is satisfied, THE Tier_Classifier SHALL produce a Tier that does not depend on the Baseline mean or SD.

### Requirement 14: Baseline Deviation Classification (R4)

**User Story:** As a crew member, I want drift from my own baseline flagged even when the value looks normal by Earth norms, so that an athlete at 62 bpm is not told they are fine.

#### Acceptance Criteria

1. WHERE an Indicator_Definition has deviation settings and no Hard_Limit or Sequence_Rule is satisfied, THE Tier_Classifier SHALL classify a Reading as yellow when the absolute difference from the Baseline mean, above or below, is at least yellowSd times the Baseline SD and at least the Minimum_Absolute_Change_Floor.
2. WHERE an Indicator_Definition has deviation settings and no Hard_Limit or Sequence_Rule is satisfied, THE Tier_Classifier SHALL classify a Reading as orange when the absolute difference from the Baseline mean, above or below, is at least orangeSd times the Baseline SD and at least the Minimum_Absolute_Change_Floor.
3. WHEN the absolute difference from the Baseline mean is below the Minimum_Absolute_Change_Floor, THE Tier_Classifier SHALL classify the Deviation_Rule result as green regardless of the SD, for both the yellow and the orange tier.
4. WHERE an Indicator_Definition has no deviation settings, THE Tier_Classifier SHALL classify using Hard_Limits and Sequence_Rules only.
5. WHEN a Reading matches no Hard_Limit, Sequence_Rule, or Deviation_Rule tier, THE Tier_Classifier SHALL classify the indicator as green.
6. THE Tier_Classifier SHALL include the Baseline mean, Baseline SD, difference, and the rule that produced the Tier in the classification result.
7. WHILE the Baseline SD and the Minimum_Absolute_Change_Floor are held fixed, THE Tier_Classifier SHALL assign a Deviation_Rule Tier that does not decrease as the absolute difference from the Baseline mean increases.
8. WHEN a resting heart rate Reading of 62 bpm is evaluated against a Baseline mean of 72 bpm and SD of 6 bpm, THE Tier_Classifier SHALL classify resting heart rate as green.
9. WHEN a resting heart rate Reading of 62 bpm is evaluated against a Baseline mean of 48 bpm and SD of 2 bpm, THE Tier_Classifier SHALL classify resting heart rate as yellow or worse.
10. WHEN the same Reading is evaluated against two different Baselines, THE Tier_Classifier SHALL base each Deviation_Rule Tier on the Baseline supplied for that evaluation.

### Requirement 15: Persistence Rule (R4)

**User Story:** As a crew member, I want a lingering yellow treated as orange, so that slow problems are not ignored.

#### Acceptance Criteria

1. WHEN an indicator is classified yellow or worse on 2 or more consecutive Mission_Days ending at the evaluation Mission_Day, THE Tier_Classifier SHALL classify the indicator as at least orange.
2. WHEN an indicator is classified yellow on only 1 Mission_Day, THE Tier_Classifier SHALL leave the Tier at yellow.
3. THE Tier_Classifier SHALL compute the Persistence_Rule from the Hard_Limit, Sequence_Rule, and Deviation_Rule Tier of each Mission_Day, not from earlier Persistence_Rule output.
4. THE Tier_Classifier SHALL return a Tier that is greater than or equal to the Tier produced by the Hard_Limit, Sequence_Rule, and Deviation_Rule alone.
5. WHEN the Persistence_Rule is applied again to a Tier that the Persistence_Rule has already raised, THE Persistence_Rule SHALL return that same Tier.

### Requirement 16: Symptom-Conditioned Red Rules (Section 6.3, 6.4)

**User Story:** As a crew member, I want dangerous symptom combinations to trigger red, so that vitals plus symptoms get immediate attention.

#### Acceptance Criteria

1. WHEN a resting heart rate Reading and a chest pain or fainting Symptom_Report share the same Mission_Day, THE Tier_Classifier SHALL classify resting heart rate as red regardless of the Baseline.
2. WHEN a systolic blood pressure Reading below 80 and a Symptom_Report of any kind share the same Mission_Day, THE Tier_Classifier SHALL classify blood pressure as red.
3. WHEN a mood Reading of 1 and a Safety_Flag share the same Mission_Day, THE Tier_Classifier SHALL classify mood as red.
4. IF no Symptom_Report or Safety_Flag is present on the Mission_Day, THEN THE Tier_Classifier SHALL evaluate the symptom-conditioned rules as not satisfied.

### Requirement 17: Missing Data Handling

**User Story:** As a crew member, I want the tool to say when it lacks data, so that missing readings are not mistaken for normal.

#### Acceptance Criteria

1. IF no Reading exists for an indicator on the evaluation Mission_Day and no Sequence_Rule can be evaluated, THEN THE Tier_Classifier SHALL return a classification marked as no data.
2. THE Tier_Classifier SHALL represent no data distinctly from green.
3. THE Tier_Classifier SHALL exclude no-data indicators from the worst-Tier computation of a Body_System.
4. WHEN a classification, Finding input, or cluster member is marked no data, THE Confidence_Evaluator SHALL apply the missing-data reduction defined in Requirement 25.

### Requirement 18: Cluster Detection Framework (R5)

**User Story:** As a flight surgeon, I want several mild changes combined into one finding, so that patterns are not lost among single-indicator alerts.

#### Acceptance Criteria

1. THE Indicator_Catalog SHALL define each cluster as a Cluster_Definition with id, member signals, window length in Mission_Days, resulting Tier, and Body_System.
2. WHEN all member signals of a Cluster_Definition are present within the cluster window ending at the evaluation Mission_Day, THE Cluster_Detector SHALL raise exactly one Finding for that cluster.
3. THE Cluster_Detector SHALL include the evidence of every member signal in the Finding of that cluster.
4. WHEN a member signal is absent from the cluster window, THE Cluster_Detector SHALL raise no Finding for that cluster.
5. THE Cluster_Detector SHALL read the window length of each cluster from the Cluster_Definition.
6. THE Cluster_Detector SHALL raise at most one Finding per cluster id per evaluation.
7. WHEN the same Readings are supplied in a different order, THE Cluster_Detector SHALL return the same result.

### Requirement 19: Fatigue and Stress Cluster

**User Story:** As a crew medical officer, I want the sleep, mood, and heart-rate decline pattern recognised as one finding, so that fatigue and stress get a coordinated response.

#### Acceptance Criteria

1. WHEN sleep, mood, and resting heart rate are each classified yellow or worse within 5 Mission_Days ending at the evaluation Mission_Day, THE Cluster_Detector SHALL raise a fatigue-and-stress Finding at orange.
2. THE Cluster_Detector SHALL set the Body_System of the fatigue-and-stress Finding from the Cluster_Definition.
3. WHERE reaction time is also worsening within the same window, THE Confidence_Evaluator SHALL assign a Confidence to the fatigue-and-stress Finding that is greater than or equal to the Confidence of the same Finding without reaction time.
4. WHEN sleep, mood, or resting heart rate is green throughout the window, THE Cluster_Detector SHALL raise no fatigue-and-stress Finding.

### Requirement 20: Possible Infection Cluster

**User Story:** As a crew medical officer, I want fever, heart-rate rise, and symptoms combined, so that a possible infection is surfaced early.

#### Acceptance Criteria

1. WHEN body temperature is Elevated, resting heart rate is Elevated, and a cough or sore throat Symptom_Report exists within the cluster window, THE Cluster_Detector SHALL raise a possible-infection Finding at orange.
2. THE Cluster_Detector SHALL treat a signal as Elevated WHEN the signal is classified yellow or worse and the Reading is above the Baseline mean.
3. WHEN no cough or sore throat Symptom_Report exists within the cluster window, THE Cluster_Detector SHALL raise no possible-infection Finding.

### Requirement 21: Under-Fuelling or Dehydration Cluster

**User Story:** As a crew medical officer, I want weight loss, low intake, and heart-rate rise combined, so that under-fuelling is surfaced early.

#### Acceptance Criteria

1. WHEN body mass loss, low energy intake, and Elevated resting heart rate are each present within the cluster window, THE Cluster_Detector SHALL raise an under-fuelling-or-dehydration Finding at orange.
2. THE Cluster_Detector SHALL treat each of these signals as present WHEN the signal is classified yellow or worse.
3. WHEN any of the three signals is green throughout the window, THE Cluster_Detector SHALL raise no under-fuelling-or-dehydration Finding.

### Requirement 22: Possible CO₂ Exposure Cluster

**User Story:** As a crew member, I want a headache, high CO₂, and a thinking dip combined, so that I check the environment before assuming I am ill.

#### Acceptance Criteria

1. WHEN a headache Symptom_Report, a cabin CO₂ Reading above the habitat Baseline mean, and a Cognitive_Dip exist within the cluster window, THE Cluster_Detector SHALL raise a possible-CO₂-exposure Finding at orange.
2. THE Finding_Builder SHALL place the instruction to check the environment first as the first step of the action of the possible-CO₂-exposure Finding.
3. WHEN no headache Symptom_Report exists within the cluster window, THE Cluster_Detector SHALL raise no possible-CO₂-exposure Finding.
4. THE Cluster_Detector SHALL detect a Cognitive_Dip from reaction time Readings only.

### Requirement 23: Vision Change Cluster

**User Story:** As a crew member, I want any new vision change raised promptly, so that signs of spaceflight-associated vision problems are not delayed.

#### Acceptance Criteria

1. WHEN a vision blurring or acuity change Symptom_Report is received, THE Cluster_Detector SHALL raise a vision-change Finding at orange.
2. WHEN a sudden vision loss Symptom_Report is received, THE Cluster_Detector SHALL raise a vision-change Finding at red.
3. WHEN both a vision blurring or acuity change report and a sudden vision loss report exist on the same Mission_Day, THE Cluster_Detector SHALL raise one vision-change Finding at red.
4. THE Indicator_Catalog SHALL mark the vision-change rules with Verification_Flag C.

### Requirement 24: Finding Structure (R6)

**User Story:** As a crew member, I want every finding to say what was found, why, how sure the tool is, and what to do, so that I can act without live help.

#### Acceptance Criteria

1. THE Finding_Builder SHALL produce each Finding with an id, tier, reason, confidence, action, sourceIds, indicators, and system.
2. THE Finding_Builder SHALL write the reason in plain language that names each contributing indicator, its value, and the rule that triggered the Tier.
3. THE Finding_Builder SHALL set sourceIds to the union of the Source_Reference ids of every contributing Indicator_Definition.
4. WHEN every contributing Indicator_Definition has an empty `sources` array, THE Finding_Builder SHALL set sourceIds to an empty array.
5. THE Finding_Builder SHALL set `indicators` to the ids of every contributing indicator.
6. THE Finding_Builder SHALL read action text and reason templates from data files in `src/data/`.
7. WHEN an indicator is classified yellow, orange, or red, THE Finding_Builder SHALL produce a Finding for that indicator.
8. THE Finding_Builder SHALL derive the Tier-level action from the section 8 behaviour: yellow gives self-management guidance and a watch on the trend, orange gives a guided assessment and preparation of a message to ground, and red gives immediate steps and urgent escalation.
9. THE Finding_Builder SHALL populate every required field of a Finding with a non-empty value, except `sourceIds`, which MAY be empty.
10. THE Finding_Builder SHALL set the system field of a Finding to a valid Body_System and the tier field to a valid Tier.

### Requirement 25: Confidence (R7)

**User Story:** As a flight surgeon, I want the tool to show how sure it is, so that thin evidence is not over-interpreted.

#### Acceptance Criteria

1. THE Confidence_Evaluator SHALL assign each Finding a Confidence of high, medium, or low.
2. WHEN a Finding has no missing data, no poor-quality Reading, and more than one supporting signal, THE Confidence_Evaluator SHALL assign high.
3. WHEN data required by a rule is missing for a Finding, THE Confidence_Evaluator SHALL assign a Confidence no higher than it would assign without the missing data.
4. WHEN a contributing Reading has a Quality_Flag of poor, THE Confidence_Evaluator SHALL assign a Confidence no higher than it would assign with a good Reading.
5. WHEN only one signal supports a Finding, THE Confidence_Evaluator SHALL assign a Confidence no higher than it would assign with more than one supporting signal.
6. THE Confidence_Evaluator SHALL return low as the lowest Confidence regardless of how many reduction factors apply.
7. WHEN a reduction factor (missing data, poor quality, or single signal) is added to a Finding, THE Confidence_Evaluator SHALL return a Confidence no higher than before.
8. WHEN a reduction factor is removed from a Finding, THE Confidence_Evaluator SHALL return a Confidence no lower than before.
9. WHEN the same contributing Readings are supplied in a different order, THE Confidence_Evaluator SHALL return the same Confidence.

### Requirement 26: Body-System Tier Aggregation

**User Story:** As a crew member, I want each body system coloured by its worst contributing signal, so that the body map shows what matters.

#### Acceptance Criteria

1. THE Body_System_Aggregator SHALL compute the Tier of each Body_System as the worst Tier of the classifications of the indicators assigned to that Body_System.
2. WHEN a cluster Finding names a Body_System, THE Body_System_Aggregator SHALL set the Tier of that Body_System to the worse of the indicator-derived Tier and the cluster Finding Tier, so that a cluster Finding raises the Tier and never lowers it.
3. WHEN a Body_System has no indicator with data and no cluster Finding, THE Body_System_Aggregator SHALL report the Body_System as no data.
4. THE Body_System_Aggregator SHALL include in its result the contributing indicator ids and the contributing Finding ids for each Body_System.
5. WHEN the same classifications are supplied in a different order, THE Body_System_Aggregator SHALL return the same result.

### Requirement 27: Hazard and Body-System Mapping

**User Story:** As a crew member, I want each indicator linked to the hazards that affect it and the body system it belongs to, so that the body map can explain why a region is at risk.

#### Acceptance Criteria

1. THE Indicator_Catalog SHALL assign every Indicator_Definition at least one Hazard and exactly one Body_System following the section 9 mapping.
2. THE Indicator_Catalog SHALL mark the hazard and Body_System assignments as Verification_Flag C.
3. THE Domain_Layer SHALL provide a function that returns exactly the indicators whose definition lists a given Hazard.
4. THE Domain_Layer SHALL provide a function that returns exactly the indicators assigned to a given Body_System.

### Requirement 28: Unverified Indicator Check (R14 domain support)

**User Story:** As a team member, I want unsourced indicators identified automatically, so that unverified values cannot slip into the demo unnoticed.

#### Acceptance Criteria

1. THE Verification_Checker SHALL report an Indicator_Definition as Unverified if and only if the `sources` array of that Indicator_Definition has length zero.
2. THE Verification_Checker SHALL provide a function that returns the ids of all Unverified Indicator_Definitions in a given catalog.
3. THE Verification_Checker SHALL provide a function that returns, for a given Finding, the contributing indicators that are Unverified.
4. WHEN a Source_Reference is added to an Unverified Indicator_Definition, THE Verification_Checker SHALL remove that definition from the Unverified list and leave the other entries unchanged.
5. THE Verification_Checker SHALL return Unverified indicators as data for display and SHALL leave lint, format:check, typecheck, and build results unaffected by empty `sources` arrays.

### Requirement 29: Correctness Support Without a Test Runner

**User Story:** As a developer, I want correctness checked by the compiler, schemas, and a catalog consistency function, so that the engine is trustworthy in a project that has no test runner.

#### Acceptance Criteria

1. THE Domain_Layer SHALL compile under strict TypeScript with no use of `any`.
2. WHERE the Domain_Layer branches on a Tier, Confidence, Hazard, Body_System, Verification_Flag, or Symptom_Report kind, THE Domain_Layer SHALL use a Compile_Time_Guard of exhaustive `switch` with a `never` check or a `Record` keyed by the full union, so that adding a union member without handling it fails `npm run typecheck`.
3. THE Domain_Layer SHALL use `satisfies` on catalog data and `Equal<>` type assertions between each Zod-inferred type and the matching exported type, so that a mismatch fails `npm run typecheck`.
4. WHEN the Indicator_Catalog, the Cluster_Definitions, or the Engine_Config is loaded, THE Domain_Schemas SHALL validate each entry and report every failure with the entry id and the field path.
5. THE Domain_Layer SHALL expose each health-logic function as a pure function with explicit typed inputs and outputs and no module-level mutable state.
6. THE Domain_Layer SHALL export the Catalog_Validator as a plain function that takes the catalog and returns a list of Catalog_Problems.
7. WHEN the Catalog_Validator finds duplicate indicator ids or duplicate cluster ids, THE Catalog_Validator SHALL return one Catalog_Problem per duplicate id.
8. WHEN an Indicator_Definition lacks Verification_Flags, THE Catalog_Validator SHALL return a Catalog_Problem that names the indicator id.
9. WHEN an Indicator_Definition has a red limit less severe than the orange limit on the same side, or orangeSd below yellowSd, THE Catalog_Validator SHALL return a Catalog_Problem that names the indicator id and the field.
10. WHEN an Indicator_Definition or Cluster_Definition names a Body_System or Hazard outside the defined unions, or a Cluster_Definition names an unknown indicator id, THE Catalog_Validator SHALL return a Catalog_Problem that names the entry id and the unknown value.
11. WHEN the Catalog_Validator finds more than one problem, THE Catalog_Validator SHALL return all problems rather than only the first.
12. WHEN the catalog has no problems, THE Catalog_Validator SHALL return an empty list.
13. THE Catalog_Validator SHALL treat an empty `sources` array as valid and SHALL return no Catalog_Problem for it.
14. THE Catalog_Validator SHALL return Catalog_Problems as plain serialisable data, so that a UI or a dev page can display them.
15. THE project SHALL be verified by `npm run check` (lint, format:check, typecheck) and SHALL add no test runner, test script, test package, or test file.
