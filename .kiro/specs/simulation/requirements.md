# Requirements Document

## Introduction

The simulation layer is the deterministic synthetic-data source of the Astronaut Health Companion. It lives in `src/simulation/` and turns declarative data (a scenario, four crew profiles, three environment configs and a library of events) into the records that `evaluateAstronaut` already consumes: `Reading`, `SymptomReport`, `SafetyFlag`, `AlertReport`, pre-flight seeds, the career dose before the mission, and an `EnvironmentProfile`. It adds the data a later director panel needs (run to day N, inject an event, switch environment or crew) and the data of the simulated ground link (delay and blackout rules). It contains no UI.

This spec covers PROJECT.md R17 to R19 (section 5), the simulation design (section 11: groups, declarative scenario format, storylines, crew profiles, demo pack, director data needs, simulation rules), the environments (section 10, with the radiation background of section 6.6), and the architecture rules of section 13.2. It is spec 3 of section 15.2. The foundation spec and the domain-engine spec are implemented. This spec reads their code: the engine input shapes in `src/domain/evaluate-input.ts`, the Zod schemas in `src/domain/schemas/`, the `EnvironmentProfile` type in `src/domain/environments/environment-profile.ts`, the indicator ids and cadences in `src/data/indicators/`, and the lint rules in `eslint.rules.mjs`.

Delivery order, when scope is tight: the Mars scenario first, then the ISS scenario, then the lunar scenario. The three environment configs are cheap data and are all delivered. The requirements for the ISS and lunar scenarios (17 and 18) are the first to defer.

Out of scope: any UI, the director panel UI (demo-director spec), the escalation summary and scripted ground reply (alerts-escalation spec), countermeasure content, and any new health threshold or rule.

Hard rules for this spec:

- Randomness comes only from a seeded generator. `Math.random`, `Date.now` and any other clock are never used in `src/simulation/`. The same seed gives identical output.
- Scenarios, crew profiles, environment configs and the demo pack are declarative data, validated with Zod at the boundary.
- No `any`. No health logic: every tier, finding and cluster comes from `evaluateAstronaut`.
- No invented thresholds or sources. Environment numbers come from PROJECT.md sections 10 and 6.6 and carry flag C. Every `sources` array is empty.
- The simulation imports only from `src/domain`. The indicator catalog, engine config, cluster definitions and finding text are passed in as parameters (see `.kiro/steering/structure.md`: `src/simulation` may use `src/domain`).
- The project has no test runner. Correctness is supported by strict TypeScript, compile-time guards, Zod validation, plain validation functions that return problems as data, and `npm run check`. No requirement below needs a test runner, and no test runner, test script, test package or test file is added.

Where PROJECT.md is silent or ambiguous, the minimal reading is used and recorded under "Open Questions and Minimal Readings" at the end of this document.

## Glossary

- **Simulation_Layer**: The pure TypeScript modules under `src/simulation/`.
- **Domain_Layer**: The pure TypeScript modules under `src/domain/`, implemented by the domain-engine spec.
- **Indicator_Catalog**: The validated `Catalog` of indicator definitions that `buildCatalog` returns. The Simulation_Layer receives the catalog as a parameter.
- **Engine_Config**: The validated `EngineConfig` of the Domain_Layer, received as a parameter.
- **Mission_Day**: A whole number of days, 0 or more, from the start of the in-flight mission. Day 0 is the first in-flight day.
- **Scenario_Seed**: The integer in the `seed` field of a Scenario. The only source of variation in generated data.
- **Random_Key**: An ordered list of strings and whole numbers, such as an astronaut id, an indicator id and a Mission_Day, that identifies one random sample.
- **Seeded_Random**: The Simulation_Layer component in `src/simulation/engine/` that maps a Scenario_Seed and a Random_Key to a random number.
- **Noise_Clip**: The bound, in noise standard deviations, at which a normal noise sample is truncated.
- **Scenario**: A declarative record with id, label, environment id, Scenario_Seed, crew ids, duration in Mission_Days, a list of Scenario_Events and a list of Storyline_Expectations.
- **Scenario_Event**: A declarative record, dated by Mission_Day, that belongs to one Event_Kind and changes generated data.
- **Event_Kind**: One of `drift`, `moodDip`, `solarParticleEvent`, `co2Spike`, `eva`, `equipmentOutage`, `symptom`, `commsBlackout`.
- **Event_Library**: The Simulation_Layer module in `src/simulation/events/` that defines the Zod schema and the effect rule of every Event_Kind.
- **Environment_Config**: A declarative record in `src/simulation/environments/` that describes one habitat: ISS, lunar surface or Mars transit.
- **Environment_Profile**: The existing Domain_Layer type (`id`, `label`, `backgroundDoseRateMsvPerDay`, `hazardWeights`) that the engine consumes.
- **Ground_Link_Config**: The part of an Environment_Config that holds the one-way delay and the blackout rules of the simulated ground link.
- **Ground_Link_Status**: The result of asking whether the ground link is available on a Mission_Day, together with the one-way delay range.
- **Crew_Profile**: A declarative record in `src/simulation/crew/` that describes one virtual astronaut: id, label, career dose before the mission, number of pre-flight samples and a Signal_Spec per indicator.
- **Athlete_Profile**: The Crew_Profile whose resting heart rate baseline is 48 bpm.
- **Signal_Spec**: The generator parameters of one indicator in a Crew_Profile or Environment_Config: baseline, noise standard deviation, decimal places, period in days and optional bounds.
- **Astronaut_Indicator**: An indicator whose readings differ per astronaut and that a Crew_Profile defines.
- **Habitat_Indicator**: An indicator whose readings belong to the habitat and are shared by the whole crew: `cabin-co2` and `dose-rate`.
- **Signal_Generator**: The Simulation_Layer component in `src/simulation/engine/` that produces the value of one indicator on one Mission_Day from a Signal_Spec, a Random_Key and the effects of Scenario_Events (baseline + noise + drift).
- **Simulation_Library**: The plain object that holds the Crew_Profiles, the Environment_Configs and the Scenarios that a run may reference by id.
- **Scenario_Runner**: The Simulation_Layer component that turns a Scenario and a last Mission_Day into a Simulation_Run.
- **Simulation_Run**: The plain, JSON-serialisable result of the Scenario_Runner: for each astronaut the pre-flight seeds, the career dose before the mission, the readings, the symptom reports and the safety flags, plus the alerts, the Environment_Profile and the Ground_Link_Config.
- **Scenario_Editor**: The Simulation_Layer functions that return a changed copy of a Scenario: inject an event, switch the environment, switch the crew.
- **Engine_Input_Adapter**: The Simulation_Layer function that builds an `EvaluationInput` for one astronaut from a Simulation_Run.
- **Storyline_Expectation**: A declarative statement in a Scenario about the engine result the storyline must produce: a cluster finding, or an indicator tier, for one astronaut by a Mission_Day.
- **Storyline_Checker**: The Simulation_Layer function that runs a Scenario through `evaluateAstronaut` and reports unmet Storyline_Expectations as data.
- **Demo_Pack**: A declarative record in `src/simulation/demo-packs/` that lists the ordered Demo_Segments of the 3-minute judges' demo.
- **Demo_Segment**: One entry of a Demo_Pack: plan step, scenario id, first and last Mission_Day, focus astronaut, target seconds and caption.
- **Simulation_Schemas**: The Zod schemas that validate Simulation_Layer data at its boundaries.
- **Simulation_Problem**: A plain serialisable record describing one problem: a code, the entry kind, the id of the offending entry, the field path and a plain-language message.
- **Simulation_Validator**: The exported plain functions that check Scenarios, Crew_Profiles, Environment_Configs, Demo_Packs and the Simulation_Library and return a list of Simulation_Problems.
- **Synthetic_Value**: A generated or placeholder value. Synthetic_Values are not thresholds, not references and not sources.
- **Compile_Time_Guard**: A TypeScript construct (exhaustive `switch` with a `never` check, `Record<Union, ...>`, `satisfies`, or an `Equal<>` type assertion) that makes `npm run typecheck` fail when a type or data shape drifts.
- **Verification_Flag**: One of `A`, `B`, `C` as defined by PROJECT.md section 6.1.

## Requirements

### Requirement 1: Layering, Purity and Time

**User Story:** As a developer, I want the simulation to be pure TypeScript with no clock and no framework, so that it runs on the client without contact with Earth and cannot cause hydration mismatches.

#### Acceptance Criteria

1. THE Simulation_Layer SHALL import only TypeScript standard features, Zod, modules of the Domain_Layer and other modules of the Simulation_Layer.
2. THE Simulation_Layer SHALL receive the Indicator_Catalog, the Engine_Config, the cluster definitions and the finding text as function parameters, so that no module in `src/simulation/` imports from `src/data/`.
3. THE Simulation_Layer SHALL receive every point in time as a Mission_Day parameter.
4. THE Simulation_Layer SHALL call no function that reads a clock or an unseeded random source, including `Math.random`, `Date.now` and the `Date` constructor.
5. WHEN a Simulation_Layer function is called twice with equal inputs, THE Simulation_Layer function SHALL return equal outputs.
6. THE Simulation_Layer SHALL return new values, SHALL leave function arguments unmodified, and SHALL declare input and output types with `readonly` fields and `readonly` arrays.
7. THE Simulation_Layer SHALL hold no module-level mutable state.
8. IF a Simulation_Layer function receives invalid caller data, THEN THE Simulation_Layer function SHALL return the problem as data and SHALL throw no exception.
9. THE Simulation_Layer SHALL use no `any` type.

### Requirement 2: Seeded Random (R17)

**User Story:** As a developer, I want a seeded random source keyed by astronaut, indicator and day, so that the same seed always gives the same data and editing a scenario does not reshuffle unrelated values.

#### Acceptance Criteria

1. THE Seeded_Random SHALL provide a function that maps a Scenario_Seed and a Random_Key to a number greater than or equal to 0 and less than 1.
2. WHEN the Seeded_Random function is called twice with an equal Scenario_Seed and an equal Random_Key, THE Seeded_Random function SHALL return the same number.
3. THE Seeded_Random SHALL compute every number with 32-bit integer operations and IEEE 754 arithmetic only, so that the same Scenario_Seed gives the same numbers on every JavaScript engine.
4. THE Seeded_Random SHALL provide a function that maps a Scenario_Seed, a Random_Key and a Noise_Clip to a finite standard normal sample truncated to the range from minus Noise_Clip to plus Noise_Clip.
5. THE Seeded_Random SHALL derive each number from the Scenario_Seed and the Random_Key alone and SHALL keep no sequence position, so that the number for one Random_Key does not depend on which other Random_Keys were sampled before.
6. THE Seeded_Random SHALL encode a Random_Key so that two Random_Keys that differ in any part, including a different split of the same characters, map to different inputs.
7. IF the Scenario_Seed is not a safe integer, THEN THE Seeded_Random SHALL return a Simulation_Problem that names the field `seed`.
8. IF the Noise_Clip is not a positive finite number, THEN THE Seeded_Random SHALL return a Simulation_Problem that names the field `noiseClip`.

### Requirement 3: Declarative Data and Zod Validation (R18)

**User Story:** As a developer, I want scenarios and their parts to be plain data checked by Zod, so that bad data fails loudly at the boundary and the director panel can store and edit scenarios.

#### Acceptance Criteria

1. THE Simulation_Schemas SHALL define a Zod schema for each of Scenario, Scenario_Event, Storyline_Expectation, Crew_Profile, Signal_Spec, Environment_Config, Ground_Link_Config and Demo_Pack, and THE Simulation_Layer SHALL define each exported type as the inferred output of its schema.
2. THE Simulation_Schemas SHALL reject unknown fields, non-finite numbers, unknown enum values and missing required fields.
3. THE Simulation_Schemas SHALL contain no `transform`, `preprocess` or `catch`, so that a parsed value equals the input value.
4. THE Scenario schema SHALL require an id, a label, an environment id, a Scenario_Seed that is a safe integer, a crew list of at least one unique astronaut id, a duration of at least 1 Mission_Day, a list of Scenario_Events and a list of Storyline_Expectations.
5. WHEN a Scenario, Crew_Profile, Environment_Config or Demo_Pack fails its schema, THE Simulation_Validator SHALL return a Simulation_Problem that names the field path of each failure.
6. FOR ALL valid Scenarios, Crew_Profiles, Environment_Configs and Demo_Packs, parsing the JSON serialisation of the value with its schema SHALL produce a value equal to the original, up to the sign of zero (round-trip property).
7. THE Simulation_Layer SHALL provide no parser for any format other than JSON data parsed by the Simulation_Schemas.

### Requirement 4: Environment Config Structure (Section 10)

**User Story:** As a developer, I want each environment to be one configuration object, so that ISS, lunar surface and Mars transit run through the same code.

#### Acceptance Criteria

1. THE Environment_Config SHALL contain an id, a label, gravity as a number of g (0 for microgravity), a dose rate range in mSv/day with a low and a high value, an evacuation class, a Ground_Link_Config, a list of emphasised Hazards, a hazard weight for each of the five Hazards, the habitat Signal_Specs, a Verification_Flag and a `sources` array.
2. THE Environment_Config SHALL set the evacuation class to one of `hours-to-days`, `days` or `not-possible`.
3. THE Environment_Config SHALL set the Verification_Flag to `C` and the `sources` array to an empty array.
4. THE Environment_Config SHALL give each emphasised Hazard a weight of 2 and each other Hazard a weight of 1, recorded as a proposed default.
5. THE Environment_Config SHALL define the habitat Signal_Specs for `cabin-co2` and `dose-rate`.
6. THE Simulation_Layer SHALL provide a function that converts an Environment_Config into an Environment_Profile that parses with the existing `EnvironmentProfileSchema`, where `backgroundDoseRateMsvPerDay` is the midpoint of the dose rate range and `hazardWeights` holds the five weights.
7. THE Simulation_Layer SHALL store each Environment_Config as data in its own file: `iss.ts`, `lunar-surface.ts` and `mars-transit.ts` under `src/simulation/environments/`.
8. THE Simulation_Layer SHALL type each Environment_Config with `satisfies` against the Environment_Config type.

### Requirement 5: Environment Values (Sections 10 and 6.6)

**User Story:** As a team member, I want the environment numbers to match PROJECT.md exactly and carry flag C, so that no unverified number is presented as fact.

#### Acceptance Criteria

1. THE ISS Environment_Config SHALL use the id `iss`, gravity 0, a dose rate range of 0.3 to 0.7 mSv/day, the evacuation class `hours-to-days`, and the emphasised Hazards `gravity-fields` and `hostile-closed-environment`.
2. THE lunar Environment_Config SHALL use the id `lunar-surface`, gravity 0.16, a dose rate range of 1.3 to 1.3 mSv/day, the evacuation class `days`, and the emphasised Hazards `hostile-closed-environment` and `radiation`.
3. THE Mars Environment_Config SHALL use the id `mars-transit`, gravity 0, a dose rate range of 1.8 to 1.8 mSv/day, the evacuation class `not-possible`, and the emphasised Hazards `isolation-confinement`, `radiation` and `distance-from-earth`.
4. THE Simulation_Layer SHALL keep the dose rate of ISS below the dose rate of the lunar surface and the dose rate of the lunar surface below the dose rate of Mars transit, so that the order matches the qualitative order in PROJECT.md section 10 (lowest, higher, highest).
5. THE Environment_Config SHALL set the baseline of the habitat Signal_Spec for `dose-rate` to the midpoint of the dose rate range of the same Environment_Config.
6. THE Environment_Config SHALL set the baseline of the habitat Signal_Spec for `cabin-co2` to a placeholder Synthetic_Value below the orange hard limit of `cabin-co2` in the Indicator_Catalog.
7. THE Simulation_Layer SHALL record every numeric value of an Environment_Config as an unverified draft in a comment that cites the PROJECT.md section.

### Requirement 6: Ground Link Data Model

**User Story:** As a developer of the later escalation feature, I want the delay and blackout rules of each environment as data, so that the simulated ground link can demonstrate the distance hazard without any networking.

#### Acceptance Criteria

1. THE Ground_Link_Config SHALL contain a one-way delay range in seconds with a minimum and a maximum, or the value `null` where PROJECT.md gives no figure, and a list of blackout rules.
2. THE Ground_Link_Config SHALL type each blackout rule as one of `signal-gaps` or `conjunction`.
3. THE ISS Ground_Link_Config SHALL set the one-way delay to `null` and the blackout rules to `signal-gaps`.
4. THE lunar Ground_Link_Config SHALL set the one-way delay to a minimum and a maximum of 1.3 seconds and the blackout rules to an empty list.
5. THE Mars Ground_Link_Config SHALL set the one-way delay to a minimum of 180 seconds and a maximum of 1320 seconds, and the blackout rules to `conjunction`.
6. THE Simulation_Layer SHALL provide a function that maps an Environment_Config, the Scenario_Events of a Scenario and a Mission_Day to a Ground_Link_Status.
7. WHEN a `commsBlackout` Scenario_Event covers the Mission_Day, THE function SHALL return a Ground_Link_Status with `available` set to false.
8. WHILE no `commsBlackout` Scenario_Event covers the Mission_Day, THE function SHALL return a Ground_Link_Status with `available` set to true and the one-way delay range of the Environment_Config.
9. THE Simulation_Layer SHALL leave message queuing, the scripted ground reply and the escalation summary to the alerts-escalation spec.

### Requirement 7: Crew Profiles (Section 11.4)

**User Story:** As a presenter, I want four virtual astronauts with different baselines, including an athlete, so that the personal-baseline idea is visible at a glance.

#### Acceptance Criteria

1. THE Simulation_Layer SHALL define exactly four Crew_Profiles as data in `src/simulation/crew/`, each with a unique id.
2. THE Crew_Profile SHALL contain an id, a label, the field `synthetic` set to true, a career dose before the mission in mSv that is 0 or more, a number of pre-flight samples, and a Signal_Spec for each Astronaut_Indicator listed in criterion 4.
3. THE Signal_Spec SHALL contain a baseline, a noise standard deviation that is 0 or more, a whole number of decimal places, a period in days of 1 or more, and optional bounds with a minimum and a maximum.
4. THE Crew_Profile SHALL define a Signal_Spec for `resting-hr`, `bp-systolic`, `bp-diastolic`, `body-temperature`, `spo2`, `sleep-hours`, `mood`, `who5`, `reaction-time`, `body-mass-change-30d`, `energy-intake` and `exercise-adherence`.
5. THE Crew_Profile SHALL leave `fasting-glucose` without a Signal_Spec, because PROJECT.md section 6.3 describes glucose as an optional on-demand indicator.
6. THE Athlete_Profile SHALL set the baseline of `resting-hr` to 48 bpm.
7. THE Simulation_Layer SHALL give each Crew_Profile a baseline of `resting-hr` that differs from the baseline of `resting-hr` of every other Crew_Profile.
8. WHERE the Indicator_Catalog defines a valid range for an indicator, THE Signal_Spec of that indicator SHALL set bounds equal to that valid range.
9. THE Crew_Profile SHALL give each Synthetic_Value baseline a placeholder status, and THE Simulation_Layer SHALL NOT present a Synthetic_Value as a reference range, a threshold or a source.
10. THE Simulation_Layer SHALL include Crew_Profiles with the ids `aria` and `kofi`, which are the astronaut names used in the PROJECT.md section 11.2 example.

### Requirement 8: Signal Generation (Baseline, Noise and Drift)

**User Story:** As a developer, I want each reading to be baseline plus noise plus event effects, so that the engine receives realistic series that are reproducible from the seed.

#### Acceptance Criteria

1. WHEN a Mission_Day is a multiple of the period of a Signal_Spec and is less than the duration of the Scenario, THE Signal_Generator SHALL produce one reading of that indicator for that Mission_Day.
2. THE Signal_Generator SHALL compute the value of a reading as the baseline, plus the sum of the additive effects of the Scenario_Events on that indicator, astronaut and Mission_Day, plus a noise sample multiplied by the noise standard deviation, then multiplied by the product of the multiplicative effects, then limited to the bounds, then rounded to the decimal places of the Signal_Spec.
3. THE Signal_Generator SHALL take each noise sample from the Seeded_Random using the Random_Key of the Scenario_Seed, the astronaut id, the indicator id and the Mission_Day, with the Noise_Clip set in one data constant of the Simulation_Layer.
4. THE Signal_Generator SHALL take the noise sample of a Habitat_Indicator from a Random_Key that holds the habitat marker, the indicator id and the Mission_Day, so that every astronaut of the crew receives the same Habitat_Indicator value on the same Mission_Day.
5. THE Signal_Generator SHALL set the Quality_Flag of every generated reading to `good`.
6. THE Signal_Generator SHALL produce, for each Crew_Profile, pre-flight seeds for each indicator of the profile, where each seed sample is the baseline plus a noise sample multiplied by the noise standard deviation, taken from the Random_Key of the Scenario_Seed, the astronaut id, the indicator id, the marker `pre-flight` and the sample index.
7. THE Signal_Generator SHALL produce pre-flight seeds for `cabin-co2` and `dose-rate` from the habitat Signal_Specs of the Environment_Config, and SHALL include them in the seeds of every astronaut.
8. WHEN a Scenario has no Scenario_Event, THE Signal_Generator SHALL produce readings that equal the baseline plus noise only.
9. THE Signal_Generator SHALL produce a finite number for every reading, and every generated reading SHALL parse with the existing `ReadingSchema`.
10. THE Signal_Generator SHALL produce no reading for `fasting-glucose`.

### Requirement 9: Event Library (Section 11.1 and 11.2)

**User Story:** As a scenario author, I want a reusable library of typed events, so that storylines are composed from data and a presenter can inject events live.

#### Acceptance Criteria

1. THE Event_Library SHALL define each Scenario_Event as a record with a `type` that names its Event_Kind, a `day` that is a Mission_Day, and the parameters listed in criteria 2 to 9.
2. THE `drift` Scenario_Event SHALL carry an indicator id, a finite `perDay` change, and an optional `lengthDays` of 1 or more.
3. THE `moodDip` Scenario_Event SHALL carry a `depth` greater than 0 in points of the mood scale and a `lengthDays` of 1 or more.
4. THE `solarParticleEvent` Scenario_Event SHALL carry a `severity` and an optional `lengthDays` of 1 or more, where `moderate` is the only severity.
5. THE `co2Spike` Scenario_Event SHALL carry a `deltaMmHg` greater than 0 and a `lengthDays` of 1 or more.
6. THE `eva` Scenario_Event SHALL carry a `heartRateDeltaBpm` greater than 0, a `lengthDays` of 1 or more, and a list of at least one astronaut id.
7. THE `equipmentOutage` Scenario_Event SHALL carry an `equipment` value, where `treadmill` is the only equipment, a `reductionFraction` greater than 0 and at most 1, and a `lengthDays` of 1 or more.
8. THE `symptom` Scenario_Event SHALL carry a symptom kind from the existing `SymptomKindSchema` and an optional `lengthDays` of 1 or more.
9. THE `commsBlackout` Scenario_Event SHALL carry a `lengthDays` of 1 or more.
10. WHERE a Scenario_Event of the kinds `drift`, `moodDip`, `equipmentOutage` or `symptom` carries an optional list of astronaut ids, THE Event_Library SHALL apply the Scenario_Event to the listed astronauts, and WHERE the list is omitted, THE Event_Library SHALL apply the Scenario_Event to the whole crew.
11. THE Event_Library SHALL name indicators with the ids of the Indicator_Catalog, such as `sleep-hours`.
12. THE Event_Library SHALL provide the Event_Kinds as a closed union, so that adding an Event_Kind makes every exhaustive `switch` over Event_Kinds fail `npm run typecheck` until handled.

### Requirement 10: Event Effects

**User Story:** As a scenario author, I want each event to change the generated data in a stated way, so that storylines produce the findings the demo needs.

#### Acceptance Criteria

1. WHEN a `drift` Scenario_Event with day D and a Mission_Day M satisfy M at least D, and M is less than D plus `lengthDays` where `lengthDays` is present, THE Signal_Generator SHALL add `perDay` multiplied by (M minus D plus 1) to the indicator value on Mission_Day M.
2. WHEN the Mission_Day M is after the end of the `lengthDays` window of a `drift` Scenario_Event, THE Signal_Generator SHALL add no drift effect from that Scenario_Event.
3. WHEN a Mission_Day lies in the window from D to D plus `lengthDays` minus 1 of a `moodDip` Scenario_Event, THE Signal_Generator SHALL subtract `depth` from the `mood` value of each affected astronaut.
4. WHEN a Mission_Day lies in the window of a `co2Spike` Scenario_Event, THE Signal_Generator SHALL add `deltaMmHg` to the `cabin-co2` value of the whole crew.
5. WHEN a Mission_Day lies in the window of an `eva` Scenario_Event, THE Signal_Generator SHALL add `heartRateDeltaBpm` to the `resting-hr` value of each listed astronaut.
6. WHEN a Mission_Day on which an `exercise-adherence` reading is produced lies in the window of an `equipmentOutage` Scenario_Event with `equipment` set to `treadmill`, THE Signal_Generator SHALL multiply that reading by one minus `reductionFraction`.
7. THE Event_Library SHALL combine the effects of several Scenario_Events by summing additive effects in a canonical order and multiplying multiplicative effects in a canonical order, so that the order of the events in the Scenario list does not change any generated value.
8. IF a `drift` Scenario_Event names a Habitat_Indicator, THEN THE Event_Library SHALL apply the effect to the shared habitat series of the whole crew.
9. THE Signal_Generator SHALL apply a Scenario_Event only to indicators for which the affected astronaut has a Signal_Spec, or to Habitat_Indicators.

### Requirement 11: Radiation Outputs and Solar Particle Events

**User Story:** As a crew medical officer, I want radiation readings and a solar particle event alert that match the environment, so that the engine can show dose rate, career dose and the shelter condition.

#### Acceptance Criteria

1. THE Signal_Generator SHALL produce `dose-rate` readings in mSv/day with a baseline equal to the background dose rate of the Environment_Profile.
2. WHEN a Mission_Day lies in the window of a `solarParticleEvent` Scenario_Event, THE Signal_Generator SHALL multiply the `dose-rate` baseline by a severity multiple that is greater than 20, so that the dose rate exceeds 20 times the background and agrees with the red rule of the Indicator_Catalog.
3. THE Event_Library SHALL store the severity multiple as a data value marked as a proposed default with Verification_Flag `C`.
4. WHEN a `solarParticleEvent` Scenario_Event has no `lengthDays`, THE Event_Library SHALL treat the event as lasting 1 Mission_Day.
5. WHEN the Scenario_Runner builds a Simulation_Run that includes the first day of a `solarParticleEvent` Scenario_Event, THE Scenario_Runner SHALL add one `AlertReport` of kind `solar-particle-event` with `startDay` equal to the event day and `endDay` equal to the last day of the event window, limited to the last Mission_Day of the run.
6. THE Signal_Generator SHALL produce `career-effective-dose` readings in mSv, where the value on Mission_Day M is the sum of the `dose-rate` values of Mission_Days 0 through M plus the background dose rate multiplied by the number of Mission_Days after M until the end of the Scenario duration.
7. THE Signal_Generator SHALL produce the `career-effective-dose` value as a projected mission dose that excludes the career dose before the mission, because the engine subtracts the career dose before the mission from the career limit.
8. THE Simulation_Run SHALL carry the career dose before the mission of each Crew_Profile as `careerDoseBeforeMissionMsv`.

### Requirement 12: Symptom Reports and Safety Flags

**User Story:** As a developer, I want symptom events to become the symptom reports the engine reads, so that the cluster rules for infection, CO₂ exposure and vision can be demonstrated.

#### Acceptance Criteria

1. WHEN a Mission_Day lies in the window of a `symptom` Scenario_Event, THE Scenario_Runner SHALL add one `SymptomReport` of the event's symptom kind for each affected astronaut on that Mission_Day.
2. WHERE a `symptom` Scenario_Event has no `lengthDays`, THE Scenario_Runner SHALL treat the event as lasting 1 Mission_Day.
3. THE Scenario_Runner SHALL return a `safetyFlags` list for each astronaut and SHALL leave that list empty, because the self-harm screening flow needs a deliberate team ethics discussion before it enters the simulation (PROJECT.md sections 4 and 18).
4. THE Scenario_Runner SHALL produce no more than one `SymptomReport` for the same astronaut, symptom kind and Mission_Day.

### Requirement 13: Scenario Runner and Time Scrubbing (R19, data side)

**User Story:** As the director panel, I want to run a scenario up to any day, so that I can scrub time without keeping any simulation state.

#### Acceptance Criteria

1. THE Scenario_Runner SHALL provide a function that takes a Scenario, the Simulation_Library, the Indicator_Catalog, and a last Mission_Day, and returns either a Simulation_Run or a list of Simulation_Problems.
2. THE Scenario_Runner SHALL produce a Simulation_Run that covers the Mission_Days from 0 through the smaller of the last Mission_Day and the duration of the Scenario minus 1.
3. THE Simulation_Run SHALL hold, for each astronaut of the crew, the pre-flight seeds as a record of indicator id to a list of numbers, the readings, the symptom reports, the safety flags and the career dose before the mission, and SHALL hold the alerts, the Environment_Profile and the Ground_Link_Config.
4. THE Simulation_Run SHALL consist of plain objects and arrays, so that the run serialises to JSON and parses back to an equal value.
5. THE Scenario_Runner SHALL list readings sorted by Mission_Day, then astronaut id, then indicator id, and SHALL list symptom reports sorted by Mission_Day, then astronaut id, then symptom kind.
6. WHEN the last Mission_Day N is less than or equal to the last Mission_Day M, THE Scenario_Runner SHALL return for N exactly the readings and symptom reports of the run for M that are dated on or before N, and the alerts of the run for M that start on or before N with the `endDay` limited to N (prefix property).
7. IF the Scenario fails validation, THEN THE Scenario_Runner SHALL return every Simulation_Problem found and no Simulation_Run.
8. IF the last Mission_Day is not a whole number of 0 or more, THEN THE Scenario_Runner SHALL return a Simulation_Problem that names the field `throughDay`.
9. THE Scenario_Runner SHALL keep no state between calls, so that scrubbing time is a new call with a new last Mission_Day.

### Requirement 14: Scenario Edits for the Director Panel (R19, data side)

**User Story:** As the director panel, I want pure functions that inject an event and switch environment or crew, so that live changes are new scenarios that re-run deterministically.

#### Acceptance Criteria

1. THE Scenario_Editor SHALL provide a function that takes a Scenario and a Scenario_Event and returns a new Scenario with the Scenario_Event appended to its events, or a list of Simulation_Problems.
2. THE Scenario_Editor SHALL provide a function that takes a Scenario and an Environment_Config id and returns a new Scenario with that environment id, or a list of Simulation_Problems.
3. THE Scenario_Editor SHALL provide a function that takes a Scenario and a list of astronaut ids and returns a new Scenario with that crew, or a list of Simulation_Problems.
4. THE Scenario_Editor SHALL leave the original Scenario unmodified and SHALL return a value that passes the Scenario validation of the Simulation_Validator.
5. IF an edit would produce a Scenario that fails validation, THEN THE Scenario_Editor SHALL return every Simulation_Problem found and no Scenario. This covers an event dated at or after the duration, an unknown astronaut id, an unknown environment id and an unknown indicator id.
6. WHEN a Scenario_Event is injected, THE Scenario_Runner SHALL return, for every indicator, astronaut and Mission_Day that the Scenario_Event does not affect, a reading equal to the reading before the injection.
7. WHEN the crew of a Scenario changes, THE Scenario_Runner SHALL return for each astronaut that stays in the crew readings equal to the readings before the change.
8. WHEN the environment of a Scenario changes, THE Scenario_Runner SHALL return for every indicator other than `cabin-co2`, `dose-rate` and `career-effective-dose` readings equal to the readings before the change.

### Requirement 15: Engine Input Adapter

**User Story:** As a developer of the dashboard, I want one function that turns a run into the exact input of `evaluateAstronaut`, so that the simulation output matches what the engine consumes.

#### Acceptance Criteria

1. THE Engine_Input_Adapter SHALL provide a function that takes a Simulation_Run, an astronaut id, an `asOfDay` and a context of the Indicator_Catalog, the cluster definitions, the Engine_Config and the finding text, and returns an `EvaluationInput` of the Domain_Layer, or a Simulation_Problem.
2. THE Engine_Input_Adapter SHALL fill the fields `astronautId`, `asOfDay`, `seeds`, `readings`, `symptoms`, `safetyFlags`, `alerts`, `careerDoseBeforeMissionMsv` and `environment` from the Simulation_Run, using only the records of the named astronaut.
3. IF the astronaut id is not in the Simulation_Run, THEN THE Engine_Input_Adapter SHALL return a Simulation_Problem that names the field `astronautId`.
4. IF the `asOfDay` is later than the last Mission_Day of the Simulation_Run, THEN THE Engine_Input_Adapter SHALL return a Simulation_Problem that names the field `asOfDay`.
5. THE Simulation_Layer SHALL use only indicator ids that exist in the Indicator_Catalog, SHALL produce at most one reading per astronaut, indicator and Mission_Day, and SHALL keep every reading value inside the valid range of its indicator, so that `evaluateAstronaut` reports none of the errors `unknown-indicator`, `duplicate-reading`, `value-out-of-range` and `invalid-input` for a generated run.
6. THE Engine_Input_Adapter SHALL contain no tier, threshold, cluster or confidence logic.

### Requirement 16: Mars Scenario (Section 11.3, First Priority)

**User Story:** As a presenter, I want the Mars long-haul storyline, so that the demo shows sleep and mood decline, a solar particle event, the fatigue cluster, and the personal-baseline athlete.

#### Acceptance Criteria

1. THE Mars Scenario SHALL use the id `mars-transit-30d`, the environment id `mars-transit`, the Scenario_Seed 2026 and a duration of 30 Mission_Days, in `src/simulation/scenarios/mars/`.
2. THE Mars Scenario SHALL list the crew `aria`, `kofi` and the Athlete_Profile, with no duplicate.
3. THE Mars Scenario SHALL contain a `drift` event on `sleep-hours` from day 6 with `perDay` of -0.12, a `moodDip` event on day 14 with `depth` 1.5 and `lengthDays` 5, and a `solarParticleEvent` event on day 21 with severity `moderate`, as given in PROJECT.md section 11.2.
4. THE Mars Scenario SHALL contain no Scenario_Event beyond those of criterion 3 other than events that criteria 5 and 6 need.
5. THE Mars Scenario SHALL declare a Storyline_Expectation that the `fatigue-stress` cluster finding appears for at least one astronaut by Mission_Day 29.
6. THE Mars Scenario SHALL declare a Storyline_Expectation that the Athlete_Profile reaches yellow or worse on `resting-hr` on a Mission_Day on which the reading lies inside the Earth reference range of `resting-hr` in the Indicator_Catalog, by Mission_Day 29.
7. THE Mars Scenario SHALL declare a Storyline_Expectation that `dose-rate` is red for each astronaut on Mission_Day 21.
8. WHEN the Mars Scenario runs, THE Scenario_Runner SHALL return a Ground_Link_Config with the one-way delay range of 180 to 1320 seconds.

### Requirement 17: ISS Scenario (Section 11.3, Second Priority)

**User Story:** As a presenter, I want the ISS early adaptation storyline, so that the demo shows environment-adjusted baselines, a countermeasure gap and the CO₂ cluster.

#### Acceptance Criteria

1. THE ISS Scenario SHALL use an id that starts with `iss-`, the environment id `iss`, a Scenario_Seed that is a safe integer, and a duration of 30 Mission_Days, in `src/simulation/scenarios/iss/`.
2. THE ISS Scenario SHALL contain events that change `resting-hr`, `bp-systolic` and `bp-diastolic` and `symptom` events of kind `headache` within Mission_Days 0 to 6, for the week 1 fluid shift.
3. THE ISS Scenario SHALL contain an `equipmentOutage` event with `equipment` `treadmill` that lowers `exercise-adherence` of the crew.
4. THE ISS Scenario SHALL contain a `drift` event on `cabin-co2` starting on Mission_Day 20, together with the `symptom` and `drift` events that the `possible-co2-exposure` cluster of the Domain_Layer needs.
5. THE ISS Scenario SHALL declare a Storyline_Expectation that the `possible-co2-exposure` cluster finding appears for at least one astronaut by Mission_Day 29.
6. THE ISS Scenario SHALL declare a Storyline_Expectation that `exercise-adherence` reaches orange or worse for at least one astronaut by Mission_Day 29.

### Requirement 18: Lunar Scenario (Section 11.3, Third Priority)

**User Story:** As a presenter, I want the lunar dust and EVA storyline, so that the demo shows EVA heart rate spikes, dust irritation and the solar particle event shelter condition with a short comms delay.

#### Acceptance Criteria

1. THE lunar Scenario SHALL use the id `lunar-dust-eva-14d`, the environment id `lunar-surface`, a Scenario_Seed that is a safe integer, and a duration of 14 Mission_Days, in `src/simulation/scenarios/lunar/`.
2. THE lunar Scenario SHALL contain `eva` events on at least 2 distinct Mission_Days.
3. THE lunar Scenario SHALL contain `symptom` events of kind `sore-throat` and `other` for the dust-related throat and eye irritation.
4. THE lunar Scenario SHALL contain a `solarParticleEvent` event on Mission_Day 9 with severity `moderate`.
5. THE lunar Scenario SHALL declare a Storyline_Expectation that `dose-rate` is red for each astronaut on Mission_Day 9.

### Requirement 19: Demo Pack (Section 11.5 and 16)

**User Story:** As a presenter, I want a curated playlist of scenario segments for the 3-minute judges' demo, so that the demo is repeatable without improvising data.

#### Acceptance Criteria

1. THE Demo_Pack SHALL be data in `src/simulation/demo-packs/` with an id, a label and an ordered list of Demo_Segments.
2. THE Demo_Segment SHALL contain an id, a plan step number, a scenario id, a first Mission_Day, a last Mission_Day, a focus astronaut id, a target duration in whole seconds, and a plain-language caption.
3. THE Demo_Pack SHALL contain one Demo_Segment for each of the in-app steps 2 to 7 of the PROJECT.md section 16 demo plan, in step order, with target durations of 30, 30, 40, 20, 30 and 20 seconds.
4. THE Demo_Pack SHALL take the segments for steps 2, 3, 4 and 5 from the Mars Scenario, and SHALL use the Athlete_Profile as the focus astronaut of step 5.
5. THE Demo_Pack SHALL take the segment for step 7 from the ISS Scenario or the lunar Scenario.
6. THE Demo_Pack SHALL leave steps 1 and 8, which are not in-app segments, outside the segment list.
7. WHERE the Simulation_Validator checks a Demo_Pack, THE Simulation_Validator SHALL report a Simulation_Problem when the target durations sum to more than 180 seconds, when a scenario id is unknown, when a Mission_Day lies outside the duration of the scenario, when the first Mission_Day is after the last, when the focus astronaut is not in the crew of the scenario, or when the plan steps are not in ascending order.

### Requirement 20: Simulation Validation Without a Test Runner

**User Story:** As a developer, I want plain validation functions that return every problem as data, so that data mistakes are found on a dev page or at load time with a clear message and no test runner.

#### Acceptance Criteria

1. THE Simulation_Validator SHALL export plain functions that check a Scenario, a Crew_Profile, an Environment_Config, a Demo_Pack and a whole Simulation_Library, each against the Indicator_Catalog and the Engine_Config passed as parameters.
2. THE Simulation_Problem SHALL contain a code, an entry kind, an entry id, a field path and a message, all as strings, so that a list of Simulation_Problems serialises to JSON and parses back to an equal value.
3. THE Simulation_Validator SHALL return all problems found in one list, and SHALL return an empty list when no problem exists.
4. WHEN the Simulation_Validator checks a Scenario, THE Simulation_Validator SHALL report a Simulation_Problem for each of: a schema failure, a duplicate scenario id, an unknown environment id, an unknown or duplicate crew id, an event dated at or after the duration, an unknown indicator id in an event, an astronaut id that is not in the crew, an astronaut list on an event that targets a Habitat_Indicator, an event on an indicator for which an affected astronaut has no Signal_Spec, and a Storyline_Expectation that names an unknown astronaut, cluster or indicator.
5. WHEN the Simulation_Validator checks a Crew_Profile, THE Simulation_Validator SHALL report a Simulation_Problem for each of: an indicator id that is not in the Indicator_Catalog, a period that differs from the `periodDays` of the indicator, bounds that differ from the valid range of the indicator, a number of pre-flight samples below `minSeedReadings` of the Engine_Config, and a baseline range, from baseline minus Noise_Clip times noise standard deviation to baseline plus Noise_Clip times noise standard deviation, that satisfies a hard limit of the indicator.
6. WHEN the Simulation_Validator checks an Environment_Config, THE Simulation_Validator SHALL report a Simulation_Problem for each of: a dose rate low value above the high value, a delay minimum above the delay maximum, a missing hazard weight, an emphasised Hazard whose weight is not above the weight of every other Hazard, a `dose-rate` baseline that differs from the midpoint of the dose rate range, and a `cabin-co2` baseline that satisfies a hard limit of `cabin-co2`.
7. WHEN the Simulation_Validator checks a Simulation_Library, THE Simulation_Validator SHALL report a Simulation_Problem for each of: a Crew_Profile count other than four, a duplicate Crew_Profile id, a duplicate `resting-hr` baseline and the absence of a Crew_Profile with a `resting-hr` baseline of 48.
8. THE Simulation_Validator SHALL report no Simulation_Problem for an empty `sources` array, because unverified values are shown to the user and do not fail validation.
9. THE Simulation_Validator SHALL return Simulation_Problems and SHALL throw no exception for any input.

### Requirement 21: Storyline Check

**User Story:** As a developer, I want to confirm that each storyline really produces the findings the demo depends on, so that a demo scenario is not discovered to be broken on stage.

#### Acceptance Criteria

1. THE Storyline_Expectation SHALL take one of two forms: a cluster form with an astronaut id, a cluster id and a last Mission_Day, and an indicator form with an astronaut id, an indicator id, a minimum tier, an optional flag `withinEarthReference` and a last Mission_Day.
2. THE Storyline_Checker SHALL provide a function that takes a Scenario, the Simulation_Library and a context of the Indicator_Catalog, the cluster definitions, the Engine_Config and the finding text, and returns a list of Simulation_Problems.
3. WHEN the Storyline_Checker checks a cluster form expectation, THE Storyline_Checker SHALL evaluate the astronaut with `evaluateAstronaut` as of each Mission_Day from 0 to the last Mission_Day, and SHALL report no problem when at least one evaluation holds a finding of kind `cluster` with the stated cluster id.
4. WHEN the Storyline_Checker checks an indicator form expectation, THE Storyline_Checker SHALL evaluate the astronaut as of each Mission_Day from 0 to the last Mission_Day, and SHALL report no problem when at least one evaluation classifies the indicator at the minimum tier or worse.
5. WHERE an indicator form expectation sets `withinEarthReference`, THE Storyline_Checker SHALL count an evaluation only when the reading of that Mission_Day lies inside the `earthReference` range of the indicator in the Indicator_Catalog.
6. IF no evaluation satisfies an expectation, THEN THE Storyline_Checker SHALL return a Simulation_Problem with the code `expectation-unmet` that names the scenario, the astronaut and the expectation.
7. IF `evaluateAstronaut` returns any `errors` entry for a generated run, THEN THE Storyline_Checker SHALL return a Simulation_Problem that quotes the engine error.
8. THE Storyline_Checker SHALL call only `evaluateAstronaut` and the Engine_Input_Adapter for classification, and SHALL contain no tier, threshold or cluster logic of its own.
9. THE Simulation_Layer SHALL provide the Storyline_Checker as a plain function that a dev page or a load-time check can call, and SHALL add no test file.

### Requirement 22: Correctness Support Without a Test Runner

**User Story:** As a developer, I want the compiler, schemas and validation functions to catch drift in the simulation data, so that `npm run check` and the validators stand in for a test runner.

#### Acceptance Criteria

1. THE Simulation_Layer SHALL pass `npm run check` (lint, format:check, typecheck, in that order) after every change.
2. THE Simulation_Layer SHALL end every `switch` over an Event_Kind, a Scenario_Event type, a blackout rule kind, an evacuation class, a Storyline_Expectation form or a Simulation_Problem code with a `never` check.
3. THE Simulation_Layer SHALL define every per-Event_Kind table, such as the effect rule table, as a `Record` keyed by the full Event_Kind union and typed with `satisfies`.
4. THE Simulation_Layer SHALL type every data file (Crew_Profiles, Environment_Configs, Scenarios, the Demo_Pack and the severity multiple table) with `satisfies` against its inferred schema type, without an `as` assertion.
5. THE Simulation_Layer SHALL assert with the existing `Equal<>` and `Expect<>` types of the Domain_Layer that each exported simulation type equals the inferred output of its schema, and SHALL put these assertions in a types-only file.
6. THE Simulation_Layer SHALL add no test runner, no test script, no test package and no test file, and SHALL add no dependency to `package.json`.
7. THE Simulation_Layer SHALL delete the `.gitkeep` file of a folder when the first real file is added to that folder.

## Open Questions and Minimal Readings

PROJECT.md is silent or ambiguous on the points below. Each row states the minimal reading used in the requirements above. The design phase and the team can change a reading without changing the rest of the spec.

| # | Question | Minimal reading used |
| - | -------- | -------------------- |
| 1 | ISS one-way delay is "seconds, with signal gaps" and has no number. Mars blackouts ("conjunction") and ISS signal gaps have no start day or length. | ISS delay is `null`. No default blackout window exists. Blackout windows come only from `commsBlackout` events, an Event_Kind added by this spec for the ground link (Requirement 6). |
| 2 | Section 6.6 gives the ISS dose rate as a range (0.3 to 0.7) and the lunar and Mars rates as "about" values. `EnvironmentProfile` needs one number. | The Environment_Config stores a low and a high value. The profile uses the midpoint (ISS 0.5, lunar 1.3, Mars 1.8). |
| 3 | Section 10 gives no hazard weight numbers. The domain `EnvironmentProfile` needs all five. | Weight 2 for each emphasised Hazard, 1 for the others, marked as a proposed default. |
| 4 | The section 10 row "Emphasised hazards" uses words that are not Hazard ids (vision, CO₂, dust, EVA, autonomy). | ISS: `gravity-fields`, `hostile-closed-environment` (CO₂). Lunar: `hostile-closed-environment` (dust), `radiation`. Mars: `isolation-confinement`, `radiation`, `distance-from-earth` (autonomy). Vision is a body system and EVA is not a Hazard, so neither maps. |
| 5 | Section 10 says an environment config also controls "which checks are emphasised and which countermeasures are available". PROJECT.md gives no data for either. | Not modelled. The check-in and countermeasures specs own them. |
| 6 | The habitat baseline for `cabin-co2` per environment is not given (Earth about 0.3, ISS "a few mmHg", nothing for lunar or Mars). | A placeholder per environment, flag C, below the catalog orange limit. The values are chosen in the design and need team review. |
| 7 | The PROJECT.md event example uses `indicator: 'sleep'`. The catalog id is `sleep-hours`. | Events use catalog ids. |
| 8 | The only solar particle event severity shown is `moderate`. The event length and the dose rate during the event are not given. | `moderate` is the only severity. A missing `lengthDays` means 1 day. The dose rate multiple is a data value above 20 (proposed default, flag C). |
| 9 | Drift and mood dip shapes are not defined (when the effect starts, whether it ends). | Drift adds `perDay` × (day − start + 1) inside its window and nothing after it. A mood dip subtracts a constant `depth` inside its window. |
| 10 | Which of the four crew is the athlete, and who the other two are, is not given. The Mars example crew has two names. | `aria` and `kofi` exist. The Athlete_Profile is a profile with `resting-hr` 48. The Mars crew is `aria`, `kofi` and the Athlete_Profile. The design names the two profiles that are not `aria` or `kofi`. |
| 11 | The ISS duration is not given. The storyline says "fatigue cluster" follows the solar particle event on Mars, but the three given Mars events (sleep from day 6, mood day 14 to 18) can raise the cluster before day 21. | ISS lasts 30 days (it must reach past day 20). The Mars expectation is that the cluster appears by day 29, not that it follows day 21. |
| 12 | The three PROJECT.md Mars events do not raise `resting-hr`, which the `fatigue-stress` cluster needs. The ISS CO₂ cluster needs headache and reaction-time events that PROJECT.md does not list. | Extra events are limited to those needed to meet the Storyline_Expectations (Requirements 16.4, 16.6, 17.4). They are listed in the design for review. |
| 13 | The sampling day of weekly indicators (`who5`, `exercise-adherence`) is not given. Glucose is "on-demand". | Weekly readings fall on Mission_Days that are multiples of 7 (0, 7, 14, ...). No glucose reading is generated. |
| 14 | The number of pre-flight samples and the noise standard deviations are not given. Eleven of the sixteen catalog indicators have no minimum absolute change floor yet (domain TD-11), so noise can produce incidental yellow tiers. | The design chooses the sample count, the noise values and the Noise_Clip. The team may need to supply floors or tune noise so a baseline-only series stays green. |
| 15 | Safety flags, poor-quality readings and missing readings are not part of any storyline. | The run emits no safety flag, every reading has quality `good`, and no event removes readings. These can be added by a later change. |
| 16 | The ISS storyline title says "vision", but its listed features have no vision event. The lunar eye irritation has no matching symptom kind. | No vision symptom is generated. Dust irritation uses `sore-throat` and `other`. |
| 17 | The library lists both "equipment outage" and "treadmill outage". | One Event_Kind `equipmentOutage` with `equipment` set to `treadmill`, the only equipment. |
| 18 | The demo plan steps 2 to 7 take 170 seconds, and the full plan (with steps 1 and 8) takes 200 seconds. Step 7 is a live environment switch on the director panel. | The pack holds steps 2 to 7 and caps the sum at 180 seconds. Step 7 is a segment from another scenario that the presenter can start from. |
| 19 | The seeded random source is placed in `src/simulation/engine/` by PROJECT.md, while the lint message mentions `src/lib`. | The generator lives in `src/simulation/engine/`, as PROJECT.md section 11.1 states. |
| 20 | `eslint.rules.mjs` does not forbid `src/data` imports from `src/simulation`, but `.kiro/steering/structure.md` allows `src/simulation` to use `src/domain` only. | The simulation imports `src/domain` only. The catalog, config, clusters and text are parameters. |
| 21 | The workflow supplied the same `specId` that `.kiro/specs/domain-engine/.config.kiro` uses. | The `.config.kiro` file of this spec uses the supplied value. The team may want a unique id. |
