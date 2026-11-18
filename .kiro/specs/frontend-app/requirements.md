# Requirements Document

## Introduction

The frontend turns the finished engine (`src/domain/`), data (`src/data/`) and simulation (`src/simulation/`) into the app that judges and crew use. This spec adds the app shell, ten routes, five Zustand stores (four persisted, one not), a clickable body map, a guided check-in, trend charts with a baseline band, an alerts page, an escalation flow with a simulated ground delay, a radiation view, countermeasures with light gamification, a hidden director panel and an about page. It adds no health logic, no backend and no new threshold.

This spec covers PROJECT.md R6, R8 to R16, R19 and R20 on the UI side, the screens table of section 12, the UI rules of sections 8 and 13.3, the demo plan of section 16 and build steps 5 to 10 of section 14. It merges the PROJECT.md section 15.2 specs 4 to 8 (dashboard-body-map, check-in-trends, alerts-escalation, countermeasures-radiation, demo-director) and the about page into one spec, as the approved design does. The foundation, domain-engine and simulation specs are implemented. This spec reads their code. The requirements are derived from the approved `design.md`, including the layer-rule decisions FD-1 to FD-4 and the defaults FD-5 to FD-19.

The requirements follow the build-order areas of the design:

- Area 0, foundations for the UI (Requirements 1 to 11).
- Area 1, app shell and session (Requirements 12 to 19).
- Area 2, dashboard and body map (Requirements 20 to 22).
- Area 3, check-in and trends (Requirements 23 to 28).
- Area 4, alerts and escalation (Requirements 29 to 32).
- Area 5, radiation and countermeasures (Requirements 33 to 35).
- Area 6, director and demo (Requirements 36 to 38).
- Area 7, about, polish and delivery (Requirement 39, with the polish and delivery checks in Requirements 47 to 49).
- Cross-cutting requirements (Requirements 40 to 49): layering and purity, content as data, never colour alone, honest about drafts, hydration safety, persistence, error handling, accessibility and responsiveness, no test runner and verification, delivery readiness.

If time is short, the PROJECT.md risk note applies: finish the Mars path completely first, then ISS, then lunar. The environment switcher and the data work for all three environments from Area 1, because the scenarios already exist.

Out of scope: any change to engine behaviour, new thresholds or sources, a backend, API routes, server actions, PWA or offline tooling, ML, camera or voice input, PDF export, a self-harm screening flow, a dark-mode toggle, translations, autoplay of the demo, per-environment countermeasure availability, a test runner and test files. `package.json` gains no dependency. The shadcn CLI adds component files only.

Hard rules for this spec:

- Every tier, confidence, finding, body-system rollup, baseline and band edge comes from `src/domain/`. Components format and arrange these values and never classify.
- Instructions, countermeasures, region descriptions, hazard descriptions, shelter steps, scripted ground replies and demo routing are data in `src/data/`. The decision-support notice stays in the one constant in `src/data/disclaimer.ts`.
- Status never relies on colour alone. Every tier display goes through one shared presentation map.
- A value with verification flag C is never stated as fact. It always carries a visible draft marker.
- No `Math.random`, no clock read and no browser-only value during render. Stores start with the same defaults on the server and the client. Persisted state loads after mount.
- Failures are visible values. Simulation problems, engine errors and unreadable stored state show a message and a way to recover.
- The project has no test runner. Correctness rests on strict TypeScript, Zod schemas at boundaries, ESLint, Prettier, `npm run check`, `npm run build`, documented search commands and a manual checklist. No requirement below needs a test runner, and no test runner, test script, test package or test file is added.
- No `any`. No invented threshold, indicator value or source. Every `sources` array that this spec adds stays empty until the team supplies citations.

Where PROJECT.md and the design are silent or ambiguous, the minimal reading is used and recorded under "Open Questions and Minimal Readings" at the end of this document.

## Glossary

- **App**: The Next.js application in `src/app/` with its features, components, stores and data.
- **Domain_Layer**: The pure TypeScript modules under `src/domain/`.
- **Simulation_Layer**: The pure TypeScript modules under `src/simulation/`.
- **Data_Layer**: The data files under `src/data/`.
- **Engine**: The existing `evaluateAstronaut` function and the rules it calls in the Domain_Layer.
- **Evaluation_Result**: The existing `EvaluationResult` of the Engine: classifications, findings, body-system statuses, history and errors.
- **Tier**: The single `Tier` type of `src/domain/types.ts`: green, yellow, orange or red.
- **No_Data_State**: The status of an indicator or body system that has no classification. It has its own presentation.
- **Mission_Day**: A whole number of days, 0 or more, as the Engine numbers them. A scenario of N days has Mission_Days 0 to N − 1.
- **Frontend_Domain_Helpers**: The new pure modules in `src/domain/` named in Requirement 1: `trends/`, `radiation/`, `escalation/`, `check-in/`, `engagement/` and `content/`.
- **Frontend_Simulation_Helpers**: The new pure modules in `src/simulation/` named in Requirement 1: `escalation/` and `teammates/`.
- **Trend_Helper**: The helper in `src/domain/trends/` that builds a trend series and resolves a classification for an indicator.
- **Trend_Series**: The per-day list of readings, tiers, baseline values and band edges for one astronaut and one indicator.
- **Baseline_Band**: The range from the baseline mean minus to the baseline mean plus the yellow deviation distance, drawn behind the readings of a chart.
- **Radiation_Helper**: The helper in `src/domain/radiation/` that computes dose figures and the solar particle event flag.
- **Check_In_Overlay**: The helper in `src/domain/check-in/` that applies saved Entries to the readings and symptom reports of a run and compares two evaluations.
- **Summary_Builder**: The helper in `src/domain/escalation/` that builds an Escalation_Summary.
- **Escalation_Summary**: The structured object for flight surgeons, with the sections listed in Requirement 5, validated by a Zod schema.
- **Engagement_Helper**: The helper in `src/domain/engagement/` that computes streaks, daily completion and the crew-goal share.
- **Link_Timing_Helper**: The helpers in `src/simulation/escalation/` that choose a one-way delay, derive the stage of a message and choose a scripted reply.
- **Teammate_Simulator**: The helper in `src/simulation/teammates/` that produces seeded teammate completions for the demo.
- **Content_File**: A data file in `src/data/` that holds text or settings for the UI, as listed in Requirement 9.
- **Content_Schemas**: The Zod schemas and inferred types in `src/domain/content/` that validate Content_Files. They hold no logic.
- **Composition_Root**: The client component `src/app/app-providers.tsx`. It is the only place that imports engine data and content from `src/data/` and hands them to the features.
- **Store**: A Zustand store in `src/store/`. It holds plain, serialisable data and setter functions.
- **Session_Store**, **Entries_Store**, **Engagement_Store**, **Escalation_Store**, **UI_Store**: The five Stores. The first four are persisted. The UI_Store is not.
- **Base_Scenario**: The library scenario that the Session_Store names by id.
- **Edit_Log**: The ordered list in the Session_Store of edits: inject event, switch environment and switch crew. Event payloads are stored as unvalidated plain objects.
- **Replay**: The step of the Session_Provider that applies the Edit_Log to the Base_Scenario with `injectEvent`, `switchEnvironment` and `switchCrew`.
- **Entry**: A saved check-in reading (value and quality) or symptom report, keyed by Base_Scenario id, astronaut id, Mission_Day and, for readings, indicator id.
- **Session_Provider**: The client provider in `src/features/session/` that computes the Session_View and shares it through context.
- **Session_View**: The derived, unstored snapshot of the fields listed in Requirement 13.
- **Selector_Hook**: A hook in `src/features/session/` that gives a view a narrow slice of the Session_View.
- **Hydration_Gate**: The mechanism that rehydrates persisted Stores in an effect after mount and sets one `hydrated` flag when all have finished.
- **Notice**: A deduplicated message about a problem from Replay, the simulation, the Engine or storage.
- **App_Shell**: The feature in `src/features/shell/`: header, navigation, context bar, controls, link clock driver, director hotkey, demo caption bar and footer.
- **Context_Bar**: The part of the App_Shell that shows the environment name, the mission day, the selected astronaut and the ground link status.
- **Link_Clock**: The whole-number count of link-seconds in the Escalation_Store, advanced by a timer in the App_Shell.
- **Link_Time_Scale**: The number of link-seconds that the Link_Clock advances per real second, taken from `src/data/app-defaults.ts`.
- **Escalation_Message**: A queued message in the Escalation_Store: id, Escalation_Summary snapshot, creation day and link time, chosen one-way delay, chosen reply id and, once transmission starts, the link time of the start.
- **Message_Stage**: One of queued, transmitting, delivered or reply-received. It is derived from the Escalation_Message and the Link_Clock and never stored.
- **Scripted_Reply**: A fixed reply text from `src/data/escalation.ts`, chosen by the highest Tier in the summary. It gives no medical advice.
- **Tier_Presentation_Map**: The one constant in `src/components/tier-presentation.ts` that maps each Tier and the No_Data_State to a token class, an icon and a text label.
- **TierBadge**: The shared badge component that renders the Tier_Presentation_Map.
- **Verification_Marker**: The shared component that shows the "Unverified" badge in non-production builds and the "Draft value" marker for flag C.
- **Draft_Marker**: The "Draft value" text marker that the Verification_Marker shows for a value that rests on flag C.
- **Body_Map**: The clickable SVG figure with one region for each of the six body systems.
- **Body_System**: One of cardiovascular, musculoskeletal, vision, immune, mental and sleep.
- **Region_Panel**: The panel that opens when a body region is selected.
- **Check_In_Wizard**: The guided check-in flow in `src/features/check-in/`.
- **Director_Panel**: The hidden panel in `src/features/director/` with the sections time, scenario, events, demo pack and session.
- **Director_Overlay**: The Director_Panel opened with `Alt+Shift+D` on any page.
- **Demo_Pack**: The existing judges' demo pack with six segments whose target times sum to 170 seconds.
- **Demo_Segment**: One entry of the Demo_Pack: id, plan step, scenario id, first and last Mission_Day, focus astronaut id, target seconds and caption.
- **Caption_Bar**: The part of the App_Shell that shows the caption of the current Demo_Segment and the controls to step through the Demo_Pack.
- **Director_Preset**: One entry of `src/data/director-presets.ts`: a label, an event payload with a day placeholder and an origin (`from-scenario` or `proposed-default`).
- **Simulation_Problem**: The existing plain record (code, entry kind, entry id, field path and message) that the Simulation_Layer returns for invalid data.
- **Live_Region**: The visually hidden element with `aria-live="polite"` in the App_Shell that announces status changes.
- **Touch_Width**: A viewport width below the Tailwind `md` breakpoint.
- **Reading_List**: The list on the About page of the NASA Human Research Program pages that PROJECT.md section 1 names as background reading.
- **Verification_Flag**: One of `A`, `B`, `C` as defined by PROJECT.md section 6.1.
- **Typecheck**: `npm run typecheck`, the strict TypeScript check with `tsc --noEmit`.
- **Lint**: `npm run lint`, ESLint with the rules in `eslint.config.mjs`, `eslint.rules.mjs` and `eslint-rules/`.
- **Format_Check**: `npm run format:check`, Prettier in check mode.
- **Check_Script**: `npm run check`, which runs Lint, Format_Check and Typecheck in that order and stops at the first failure.
- **Build**: `npm run build`, which runs Lint, then the type check and the production build and prerenders every static route.
- **Zod_Check**: Validation with a Zod schema at module load or when stored data is read.
- **Import_Search**: The documented search command that lists import statements that break the layer rules of `structure.md`.
- **Search_Check**: A documented search command that lists forbidden constructs, such as `Math.random`, `Date.now`, `new Date(`, `toLocaleString`, `style=` without a comment, tier-word colour classes outside the tier map, `fetch(`, `'use server'`, `route.ts` and `serviceWorker`.
- **Manual_Checklist**: The 14 manual checks of the design under "Manual checks", performed once per stage in `npm run dev` and once on the final `npm run build` and `npm run start`.

## Requirements

## Area 0: Foundations for the UI

### Requirement 1: Additive Pure Modules (Area 0, FD-4)

**User Story:** As a developer, I want the chart band, radiation figures, escalation summary, check-in overlay, streak maths and message timing in pure modules of the owning layer, so that components contain no health, engagement or simulation logic.

#### Acceptance Criteria

1. THE Frontend_Domain_Helpers SHALL be new modules in `src/domain/` under the folders `trends/`, `radiation/`, `escalation/`, `check-in/`, `engagement/` and `content/`, plus the single new file `src/domain/indicators/cluster-verification.ts` of Requirement 39.7.
2. THE Frontend_Simulation_Helpers SHALL be new modules in `src/simulation/` under the folders `escalation/` and `teammates/`.
3. THE Frontend_Domain_Helpers and THE Frontend_Simulation_Helpers SHALL add new files only, and SHALL leave every file that existed in `src/domain/` and `src/simulation/` before this spec unedited, so that the diff of those two folders lists added files only.
4. THE Frontend_Domain_Helpers and THE Frontend_Simulation_Helpers SHALL take every input as an argument, SHALL read no clock, SHALL call no `Math.random`, SHALL return new values, SHALL leave their arguments unmodified, and SHALL declare input and output types with `readonly` fields and `readonly` arrays.
5. IF a helper receives invalid caller data, THEN THE helper SHALL return the problem as data and SHALL throw no exception.
6. THE Frontend_Domain_Helpers SHALL read tiers, baselines and findings from an Evaluation_Result and SHALL read limits and ranges from the indicator catalog, and SHALL re-derive no tier, baseline, threshold or cluster.
7. THE Content_Schemas SHALL hold Zod schemas and inferred types only and SHALL contain no logic.
8. THE Frontend_Domain_Helpers and THE Frontend_Simulation_Helpers SHALL import only TypeScript standard features, Zod, the Domain_Layer and, for the Frontend_Simulation_Helpers, the Simulation_Layer, so that the existing lint rules for `src/domain` and `src/simulation` pass.
9. THE Frontend_Domain_Helpers and THE Frontend_Simulation_Helpers SHALL use no `any` type.

### Requirement 2: Trend Series and Classification Lookup (Area 0)

**User Story:** As a developer, I want a pure helper that builds the chart series with the personal baseline band, so that the chart only draws values and never computes them.

#### Acceptance Criteria

1. WHEN the Trend_Helper receives an Evaluation_Result, the indicator catalog, the engine config, an indicator id and a day range, THE Trend_Helper SHALL return, for each Mission_Day in the range, the reading value and quality, the Tier, the baseline mean, the Baseline_Band lower and upper edges, whether the baseline was frozen, the baseline source (`seed` or `window`) and the pending-floor flag.
2. THE Trend_Helper SHALL compute the Baseline_Band edges as the baseline mean minus and plus the yellow deviation multiple times the baseline standard deviation, where the multiple is the `yellowSd` of the indicator or, where absent, the default `yellowSd` of the engine config.
3. THE Trend_Helper SHALL read the baseline of each day from `DayState.baselines` and the frozen flag of each day from `DayState.frozen`.
4. THE Trend_Helper SHALL return the hard-limit reference lines of the indicator (orange and red, high and low) from the indicator catalog, each with its label.
5. WHEN a Mission_Day in the range has no reading, THE Trend_Helper SHALL return an entry for that day with no value, so that the chart shows a gap.
6. WHEN the baseline of a Mission_Day is unavailable, THE Trend_Helper SHALL return that day with no band edges and no baseline mean.
7. THE Trend_Helper SHALL provide a function `classificationFor(source, indicatorId)` that resolves the id-ordered classification list of an Evaluation_Result, or of one `DayState` of its history, to the classification of the named indicator by position over the catalog indicators sorted by id.
8. IF the indicator id is not in the catalog, THEN THE Trend_Helper SHALL return a problem that names the indicator id.
9. THE Trend_Helper SHALL take the Tier of each point from the classification and SHALL compare no number with a threshold.
10. WHEN the Trend_Helper is called twice with equal inputs, THE Trend_Helper SHALL return equal outputs.

### Requirement 3: Radiation Figures (Area 0)

**User Story:** As a developer, I want the dose figures in a pure helper that reuses the engine inputs, so that the radiation page shows numbers without re-deriving a tier.

#### Acceptance Criteria

1. THE Radiation_Helper SHALL return the dose-rate multiple of background, calculated as the latest `dose-rate` reading of the day divided by the `backgroundDoseRateMsvPerDay` of the environment profile.
2. THE Radiation_Helper SHALL return the projected mission dose, taken from the `career-effective-dose` reading of the day, and the share of the remaining allowance, calculated as the projected mission dose divided by the `careerLimitMsv` of the catalog minus the career dose before the mission of the astronaut.
3. THE Radiation_Helper SHALL return whether a solar particle event covers the Mission_Day, true when an `AlertReport` of kind `solar-particle-event` has `startDay` at or before and `endDay` at or after the Mission_Day.
4. IF the remaining allowance is zero or negative, THEN THE Radiation_Helper SHALL return no share and a problem that names the field.
5. WHERE a `dose-rate` or `career-effective-dose` reading is absent for the day, THE Radiation_Helper SHALL return the matching figure as absent.
6. THE Radiation_Helper SHALL return no Tier, and THE radiation page SHALL take each Tier from the classification of `dose-rate` and `career-effective-dose` in the Evaluation_Result.
7. WHEN the Radiation_Helper is called twice with equal inputs, THE Radiation_Helper SHALL return equal outputs.

### Requirement 4: Check-In Overlay and Comparison (Area 0, FD-6)

**User Story:** As a developer, I want saved check-in entries applied to a run by a pure helper, so that a saved value replaces the simulated value without the UI editing engine inputs.

#### Acceptance Criteria

1. WHEN the Check_In_Overlay receives a run's readings and symptom reports, the Base_Scenario id and the Entries, THE Check_In_Overlay SHALL replace the reading with an equal astronaut id, Mission_Day and indicator id by the Entry value and quality, for each Entry whose Base_Scenario id equals the given id.
2. WHEN an Entry is a symptom report, THE Check_In_Overlay SHALL add the report to the symptom reports of that astronaut and Mission_Day, and SHALL add no report that equals an existing report.
3. IF an Entry names no reading of the run for its key, THEN THE Check_In_Overlay SHALL add the Entry as a new reading.
4. THE Check_In_Overlay SHALL ignore every Entry whose Base_Scenario id differs from the given id.
5. WHEN the Check_In_Overlay is applied twice with the same Entries, THE Check_In_Overlay SHALL return the same result as when applied once (idempotence).
6. THE Check_In_Overlay SHALL provide a comparison function that takes two Evaluation_Results of the same Mission_Day and returns, for each indicator, the Tier before and after, the findings that appear only after, and the findings that appear only before.
7. THE Check_In_Overlay SHALL leave the run passed in unmodified and return new lists.

### Requirement 5: Escalation Summary (Area 0, R15)

**User Story:** As a crew medical officer, I want a structured summary built from the evaluation, so that flight surgeons receive findings, trends, context and actions in a fixed shape.

#### Acceptance Criteria

1. WHEN the Summary_Builder receives an Evaluation_Result, the chosen finding ids, the context and the list of actions taken, THE Summary_Builder SHALL return an Escalation_Summary with the sections who and when, environment and mission day, findings, trends, context and actions taken.
2. THE Escalation_Summary SHALL list for each chosen finding its Tier, confidence, reason and actions, and SHALL list for each contributing indicator the baseline mean and the latest reading.
3. THE Escalation_Summary context section SHALL hold the symptoms reported, recent events as plain-text labels supplied by the caller, and the ground link state.
4. THE Escalation_Summary actions section SHALL hold the completed countermeasures and the check-ins already done.
5. THE Escalation_Summary SHALL have a Zod schema in `src/domain/escalation/`, and THE Summary_Builder SHALL return a value that parses with that schema.
6. FOR ALL Escalation_Summaries produced by the Summary_Builder, parsing the JSON serialisation of the value with the schema SHALL produce a value equal to the original (round-trip property).
7. IF a chosen finding id is not in the Evaluation_Result, THEN THE Summary_Builder SHALL leave that finding out and return a problem that names the finding id.
8. WHEN the Summary_Builder is called twice with equal inputs, THE Summary_Builder SHALL return equal outputs, and THE Summary_Builder SHALL read no clock.

### Requirement 6: Engagement Maths (Area 0, FD-12, R20)

**User Story:** As a developer, I want streaks and the crew goal computed by a pure helper, so that gamification logic is not in components.

#### Acceptance Criteria

1. THE Engagement_Helper SHALL count a Mission_Day for an astronaut as complete when every countermeasure task with the daily flag in the content data has a completion for that astronaut and Mission_Day.
2. THE Engagement_Helper SHALL compute the current streak as the length of the run of complete Mission_Days that ends on the current Mission_Day, or on the previous Mission_Day when the current Mission_Day is not complete.
3. THE Engagement_Helper SHALL compute the best streak as the length of the longest run of complete Mission_Days from Mission_Day 0 to the current Mission_Day.
4. THE Engagement_Helper SHALL compute the crew-goal share as the number of crew members with a complete current Mission_Day divided by the number of crew members of the scenario.
5. THE Engagement_Helper SHALL return the completion of each of the last N Mission_Days for one astronaut, where N is the weekly strip length from `src/data/engagement.ts`.
6. THE Engagement_Helper SHALL compare the crew-goal share with the target share passed in from data and SHALL return whether the target is met.
7. WHEN the Engagement_Helper is called twice with equal inputs, THE Engagement_Helper SHALL return equal outputs, and THE Engagement_Helper SHALL read no clock.
8. THE Engagement_Helper SHALL derive streaks and the crew goal from the completions and SHALL store neither.

### Requirement 7: Ground-Link Message Timing (Area 0, FD-11, R16)

**User Story:** As a developer, I want the delay choice, the message stage and the reply choice in pure functions, so that the same stored message always shows the same stage.

#### Acceptance Criteria

1. THE Link_Timing_Helper SHALL choose the one-way delay of a message from the environment's delay range, using the seeded random source keyed by the scenario seed and the message id, and SHALL return a number of link-seconds that is at least the range minimum and at most the range maximum.
2. WHERE the environment has no delay figure, THE Link_Timing_Helper SHALL return the fixed demo delay passed in from `src/data/escalation.ts`.
3. WHEN the Link_Timing_Helper is called twice with an equal scenario seed, an equal message id and an equal range, THE Link_Timing_Helper SHALL return the same delay.
4. THE Link_Timing_Helper SHALL derive the Message_Stage from the Escalation_Message and the Link_Clock value, with these rules: queued while no transmission start is stored, transmitting from the start time, delivered from the start time plus one one-way delay, and reply-received from the start time plus two one-way delays.
5. FOR ALL Escalation_Messages, the Message_Stage SHALL never move to an earlier stage as the Link_Clock value increases (monotonic property).
6. THE Link_Timing_Helper SHALL choose the Scripted_Reply id from the highest Tier in the Escalation_Summary, through an exhaustive `switch` or a `Record` keyed by the full Tier union.
7. THE Link_Timing_Helper SHALL add no ground processing time to the reply time.
8. THE Link_Timing_Helper SHALL read no clock and SHALL call no unseeded random source.

### Requirement 8: Seeded Teammate Completions (Area 0, FD-12)

**User Story:** As a presenter, I want teammates' task completions filled by a seeded action, so that the crew goal is demonstrable without clicking through every crew member.

#### Acceptance Criteria

1. WHEN the Teammate_Simulator receives a scenario seed, the Mission_Day, the crew ids, the selected astronaut id and the daily task ids, THE Teammate_Simulator SHALL return completions for crew members other than the selected astronaut.
2. THE Teammate_Simulator SHALL take every random choice from the seeded random source keyed by the scenario seed, the astronaut id, the task id and the Mission_Day.
3. WHEN the Teammate_Simulator is called twice with equal inputs, THE Teammate_Simulator SHALL return equal outputs.
4. THE Teammate_Simulator SHALL return only completions for task ids and crew ids that were passed in.
5. THE Teammate_Simulator SHALL read no clock and SHALL call no unseeded random source.

### Requirement 9: Content Files and Content Schemas (Area 0, FD-6, FD-12, FD-14)

**User Story:** As a content author, I want all UI text and settings in data files checked by Zod, so that a bad content file stops the build with a message that names the file and field.

#### Acceptance Criteria

1. THE Data_Layer SHALL provide the Content_Files `app-defaults.ts`, `navigation.ts`, `body-regions.ts`, `hazards.ts`, `check-in.ts`, `countermeasures.ts`, `engagement.ts`, `escalation.ts`, `radiation.ts`, `director-presets.ts` and `about.ts` in `src/data/`, in addition to the existing `disclaimer.ts`.
2. THE Content_Schemas SHALL define a Zod schema for the content of each Content_File, and each Content_File SHALL parse its content against its schema at module load.
3. IF a Content_File fails its schema, THEN THE Content_File module SHALL throw an error whose message names the file and the field, so that the dev server and the Build stop.
4. THE `app-defaults.ts` file SHALL hold the start scenario id `mars-transit-30d`, the start astronaut id `aria`, the start Mission_Day 9 and the Link_Time_Scale, each marked as a proposed default where PROJECT.md gives no value.
5. THE `body-regions.ts` file SHALL hold one entry for each Body_System with the system id, display label, function text, lead indicator id, map region id, Verification_Flag and `sources`, typed as a `Record` keyed by the full Body_System union.
6. THE `check-in.ts` file SHALL hold the step order, the step titles, numbered instructions, field labels, units, the symptom labels, and the fixed emergency note text for chest pain and fainting.
7. THE `countermeasures.ts` file SHALL hold, for each task, an id, title, why text, how steps, Body_System, daily flag, `suggestedWhen` systems, an optional `environments` field, a Verification_Flag and `sources`, and SHALL hold at least one task with the daily flag set.
8. THE `director-presets.ts` file SHALL hold presets for sleep drift, mood dip, solar particle event, EVA, treadmill outage and headache with values copied from the shipped scenarios, and presets for `co2Spike` and `commsBlackout` with the origin `proposed-default`.
9. THE text fields of the Content_Files SHALL contain no clinical number, dose, drug name or threshold.
10. THE Content_Files SHALL set every `sources` array to an empty array and SHALL set the Verification_Flag to `B` for team-written guidance and `C` where the text touches a space-specific claim.
11. THE `check-in.ts` file SHALL define no safety-flag input.
12. THE Content_Files SHALL type their content with `satisfies` against the schema types, without an `as` assertion.

### Requirement 10: Tier Presentation Map (Area 0, R9)

**User Story:** As a user, I want every status shown with a colour, an icon and a text label, so that I can read it without relying on colour.

#### Acceptance Criteria

1. THE Tier_Presentation_Map SHALL define for each Tier and for the No_Data_State one `status-*` token class, one icon and one plain text label.
2. THE Tier_Presentation_Map SHALL be a `Record` keyed by the full Tier union plus the No_Data_State, so that a missing key fails Typecheck.
3. THE Tier_Presentation_Map SHALL present the No_Data_State with neutral tokens, a dashed-circle icon and the label "No data yet".
4. THE TierBadge SHALL read the Tier_Presentation_Map and keep its existing look.
5. THE Body_Map, the chart legend, the tier history strips, the daily summary and the crew strip SHALL read the Tier_Presentation_Map for every Tier they show.
6. THE Tier_Presentation_Map SHALL contain no literal colour value.

### Requirement 11: Shared Presentational Components (Area 0)

**User Story:** As a developer, I want repeated UI parts as shared components that receive text through props, so that class combinations are not copied and components stay thin.

#### Acceptance Criteria

1. THE App SHALL provide the shared components `ConfidenceBadge`, `VerificationMarker`, `PageHeader`, `NoticeBanner`, `EmptyState`, skeleton parts and `ChartErrorBoundary` in `src/components/`.
2. THE ConfidenceBadge SHALL show the confidence level with an icon and text such as "Confidence: medium".
3. THE PageHeader SHALL render one `h1` and a one-line purpose, and every page SHALL use the PageHeader.
4. THE NoticeBanner SHALL provide neutral, warning and error styles, each with an icon and text, and an optional action.
5. THE skeleton parts and THE EmptyState SHALL have a fixed size, so that the layout does not jump while Stores hydrate.
6. THE ChartErrorBoundary SHALL catch a chart render error and show a NoticeBanner in place of the chart, and SHALL be a shared version of the error boundary that the dev chart page holds locally, while the dev chart page stays unedited (Requirement 12.2).
7. THE shared components SHALL receive all text through props and SHALL import nothing from `src/store`, `src/features` or `src/data`, with the existing `disclaimer-footer.tsx` as the only exception.
8. THE App SHALL add the shadcn components `sheet`, `tabs`, `select`, `checkbox`, `progress`, `slider`, `separator`, `skeleton`, `alert`, `scroll-area`, `dialog` and `toggle-group` to `src/components/ui/` with the shadcn CLI as component files only, and SHALL reuse the existing `button`, `card`, `badge` and `tooltip`.
9. IF a shadcn component needs a package that is not installed or does not compile against the installed `@base-ui/react`, THEN THE developer SHALL stop and ask the user before adding the package.

## Area 1: App Shell and Session

### Requirement 12: Composition Root, Layout and Routes (FD-2, FD-3)

**User Story:** As a developer, I want one composition root and a fixed route map, so that engine data reaches the features through one place and every page has the shell and the footer.

#### Acceptance Criteria

1. THE App SHALL provide the routes `/`, `/check-in`, `/trends`, `/alerts`, `/escalation`, `/radiation`, `/countermeasures`, `/director` and `/about`, each as a `page.tsx` server component that exports `metadata` and renders one client view.
2. THE App SHALL leave the existing `/dev/chart-check` route unchanged, and THE production build SHALL not include that route.
3. THE root layout SHALL render the Composition_Root, the App_Shell and the existing `DisclaimerFooter` around every page, and SHALL keep the `LayoutProps<'/'>` type.
4. THE Composition_Root SHALL be the client component `src/app/app-providers.tsx`, SHALL import the indicator catalog, engine config, cluster definitions, finding text and Content_Files from `src/data/`, and SHALL pass them as props to the Session_Provider.
5. THE `src/app/about/page.tsx` file SHALL import the decision-support constant from `src/data/disclaimer.ts` and pass it to the about view as a prop.
6. THE page files SHALL import a feature only through the `index.ts` of that feature.
7. THE App SHALL replace the foundation placeholder `src/app/page.tsx` with the dashboard page.
8. THE App SHALL add the feature folders `session`, `shell`, `dashboard`, `director` and `about` in `src/features/`, in addition to the seven existing feature folders.
9. WHEN a real file is added to a feature folder that holds a `.gitkeep` file, THE developer SHALL delete the `.gitkeep` file of that folder.
10. THE App SHALL use no URL search parameters, so that selections live in the UI_Store and no `Suspense` workaround is needed.
11. THE footer SHALL be visible on every page, including the error page and the not-found page.

### Requirement 13: Session Provider and Session View (FD-1, FD-5, FD-8, FD-13)

**User Story:** As a developer, I want one provider that computes everything the views need once per state change, so that four crew evaluations happen once and every page reads one consistent snapshot.

#### Acceptance Criteria

1. THE Session_Provider SHALL receive the engine data and the Content_Files as props from the Composition_Root and SHALL share the Session_View through React context.
2. THE Session_View SHALL hold the fields `scenario`, `environment`, `durationDays`, `day`, `astronautId`, `run`, `result`, `crewStatus`, `groundLink`, `notices` and `status`.
3. THE Replay SHALL apply each edit of the Edit_Log in order with `injectEvent`, `switchEnvironment` or `switchCrew` to the Base_Scenario, and SHALL validate each stored event payload with a Zod parse before calling `injectEvent`.
4. IF an edit of the Edit_Log fails its Zod parse or returns problems, THEN THE Replay SHALL leave that edit out of effect, SHALL add a Notice with the problem text, and SHALL leave the Edit_Log unrewritten.
5. THE Session_Provider SHALL run the scenario with `runScenario` through the current Mission_Day only, so that no reading of a later Mission_Day is in memory for a view.
6. WHEN the run succeeds, THE Session_Provider SHALL apply the Check_In_Overlay, build an `EvaluationInput` with `buildEvaluationInput` for each crew member, and call `evaluateAstronaut` once for each crew member.
7. THE `crewStatus` field SHALL hold, for each crew member, the overall Tier, the number of findings and the id of the strongest finding.
8. THE overall Tier of a crew member SHALL be the worst Tier among the body-system statuses of the Evaluation_Result, computed with the domain tier order, and SHALL be the No_Data_State when every body system has no data.
9. THE `groundLink` field SHALL hold the result of `groundLinkStatus` for the current Mission_Day, together with the delay range and the blackout rules of the environment.
10. THE Session_Provider SHALL recompute the Session_View only when the Base_Scenario, the Edit_Log, the current Mission_Day or the Entries change, and SHALL memoise each evaluation per scenario, Edit_Log, day, Entries and astronaut.
11. THE Session_Provider SHALL pass the current Mission_Day through `useDeferredValue`, so that dragging the director slider stays responsive.
12. THE Session_Provider SHALL keep the current Mission_Day an integer from 0 to the scenario duration minus 1, and SHALL keep the selected astronaut in the crew of the scenario.
13. IF `runScenario` or `buildEvaluationInput` returns an error, THEN THE Session_Provider SHALL set `status` to `blocked` for the failed part, SHALL add a Notice with the list of problems, and SHALL keep the App_Shell usable.
14. THE `status` field SHALL be `loading` until the Hydration_Gate has finished, and SHALL then be `ready` or `blocked`.
15. WHEN no stored session state is valid after hydration, THE Session_Provider SHALL apply the start state from `src/data/app-defaults.ts`: the scenario `mars-transit-30d`, the astronaut `aria` and the Mission_Day 9.
16. THE views SHALL call the Engine and the Simulation_Layer only for user-triggered actions (inject event, run simulation checks), and SHALL read everything else through Selector_Hooks.

### Requirement 14: Stores (FD-1, FD-7)

**User Story:** As a developer, I want the stores to hold plain data and an edit log, so that the layer rules of `structure.md` hold and stored data can be validated at the boundary.

#### Acceptance Criteria

1. THE App SHALL provide the Session_Store, Entries_Store, Engagement_Store, Escalation_Store and UI_Store in `src/store/`, a shared `persist-config.ts`, and SHALL keep the existing `counter-store.ts` for the dev chart route only.
2. THE Stores SHALL hold plain, serialisable data and setter functions, and SHALL import nothing from `src/simulation`, `src/features` or `src/components`.
3. THE Session_Store SHALL hold the Base_Scenario id, the Edit_Log, the selected astronaut id, the current Mission_Day and a `hydrated` flag that is not saved.
4. THE Session_Store SHALL accept three kinds of edit in the Edit_Log: inject event with a plain payload, switch environment with an environment id, and switch crew with a list of astronaut ids.
5. WHEN the Base_Scenario changes, THE Session_Store SHALL clear the Edit_Log.
6. THE Entries_Store SHALL hold check-in readings keyed by Base_Scenario id, astronaut id, Mission_Day and indicator id with a value and a quality, and symptom reports keyed by Base_Scenario id, astronaut id and Mission_Day, with one Entry for each key.
7. THE Engagement_Store SHALL hold the completed countermeasure ids keyed by Base_Scenario id, astronaut id and Mission_Day, and SHALL hold no streak and no crew-goal value.
8. THE Escalation_Store SHALL hold the Link_Clock in whole link-seconds and the list of Escalation_Messages, and SHALL hold no Message_Stage.
9. THE UI_Store SHALL hold the selected region, the selected trend indicator and range, the alerts filters, the findings preselected for escalation, the Director_Overlay open flag, the demo pack position and the dismissed Notices, and SHALL not be persisted.
10. THE Session_Store, Entries_Store, Engagement_Store and Escalation_Store SHALL be persisted as defined in Requirement 45.

### Requirement 15: Hydration Gate and Selector Hooks (Rendering model)

**User Story:** As a user, I want the app to show my saved state without a flash or a console warning, so that the first render matches the server and my data appears right after mount.

#### Acceptance Criteria

1. THE Hydration_Gate SHALL rehydrate each persisted Store in an effect after mount and SHALL set one `hydrated` flag when every persisted Store has finished.
2. THE App SHALL read no `localStorage` value while rendering.
3. WHILE the `hydrated` flag is not set, THE main area of every page SHALL show a skeleton, and THE Context_Bar SHALL show placeholders of fixed size.
4. THE title, the navigation and the footer SHALL render on the server and SHALL not depend on stored state.
5. THE Selector_Hooks SHALL give views the current astronaut result, the findings for a region, the Trend_Series, the radiation figures, the ground link status, the crew status list and the Notices.
6. WHILE the `hydrated` flag is not set, EACH Selector_Hook SHALL return a `loading` value.

### Requirement 16: Header, Navigation and Context Bar (R13, section 12)

**User Story:** As a user, I want a header with navigation and a context bar on every page, so that I always know where I am, which environment and day I am looking at and whether the ground link is up.

#### Acceptance Criteria

1. THE App_Shell SHALL render a header with the app title, links to the seven main pages (dashboard, check-in, trends, alerts, escalation, radiation, countermeasures) and a link to the about page, taken from `src/data/navigation.ts`.
2. THE App_Shell SHALL leave the director page out of the navigation.
3. THE navigation SHALL mark the active page with `aria-current="page"`, using `usePathname`.
4. THE App_Shell SHALL render a skip link as the first focusable element that moves focus to the main content.
5. THE navigation SHALL be reachable with the keyboard and SHALL collapse to a menu on narrow screens.
6. THE App SHALL render the landmarks header, nav, main and footer on every page.
7. THE Context_Bar SHALL show the environment name, the text "Day N of M" where N is the Mission_Day as the Engine numbers it and M is the scenario duration, the selected astronaut and the ground link status badge.
8. THE ground link status badge SHALL show an icon and a text label, and SHALL read "Link unavailable" while the ground link is not available.

### Requirement 17: Environment Switcher, Crew Selector and Day Control (FD-5, FD-8)

**User Story:** As a presenter, I want to switch environment and crew member and to move the mission day by hand, so that the demo shows different environments and times without autoplay.

#### Acceptance Criteria

1. THE App_Shell SHALL provide "Previous day" and "Next day" controls that move the Mission_Day by one within 0 to the scenario duration minus 1, and SHALL disable "Previous day" on Mission_Day 0 and "Next day" on the last Mission_Day.
2. THE App SHALL advance the Mission_Day only by user action, and SHALL provide no timer that changes the Mission_Day.
3. THE environment switcher SHALL offer ISS, lunar surface and Mars transit, and WHEN the user chooses an environment, THE environment switcher SHALL load the library scenario of that environment, clear the Edit_Log and clamp the Mission_Day to the duration of the new scenario.
4. WHEN the user switches to the lunar surface scenario, THE environment switcher SHALL limit the Mission_Day to 13 at most, because that scenario has 14 days.
5. THE crew selector SHALL list the crew members of the current scenario and SHALL show the overall Tier of each member next to the name through the Tier_Presentation_Map.
6. WHEN the user selects a crew member, THE crew selector SHALL set the selected astronaut to that member.
7. WHEN the selected astronaut is not in the crew of a newly loaded scenario, THE Session_Provider SHALL select the first crew member of that scenario.

### Requirement 18: Link Clock Driver (FD-11)

**User Story:** As a presenter, I want the simulated ground link to run on a compressed clock, so that a Mars round trip of minutes plays out in seconds during a live demo.

#### Acceptance Criteria

1. THE App_Shell SHALL contain a driver that advances the Link_Clock in the Escalation_Store by the Link_Time_Scale once for each real second.
2. THE driver SHALL start only after the Hydration_Gate has finished.
3. WHILE the browser tab is hidden, THE driver SHALL not advance the Link_Clock.
4. THE driver SHALL set up its timer in an effect and clear it in the clean-up, and SHALL live in the App_Shell, which is never hidden when a route is hidden, so that the timer keeps running while a page is hidden.
5. THE Link_Clock SHALL hold whole link-seconds.
6. THE Link_Time_Scale SHALL come from `src/data/app-defaults.ts` and SHALL be marked as a proposed default.

### Requirement 19: Notices, Error Page and Not-Found Page

**User Story:** As a user, I want problems shown as messages with a way to recover, so that a bad input, a failed edit or an unreadable store does not crash a page.

#### Acceptance Criteria

1. THE Session_Provider SHALL collect Notices from the Replay, the simulation, the `errors` list of each Evaluation_Result and storage, and SHALL deduplicate them by message.
2. THE App_Shell SHALL show the Notices as a dismissible list, and SHALL store the dismissed Notices in the UI_Store.
3. WHEN an Evaluation_Result has a non-empty `errors` list, THE App_Shell SHALL show the number of engine errors in the Notice area.
4. THE `src/app/error.tsx` file SHALL be a client component that shows a message and a "Try again" button that calls `retry`, and THE shell and footer SHALL stay visible.
5. THE `src/app/not-found.tsx` file SHALL explain that the page does not exist and SHALL link to the dashboard.
6. IF a run failure leaves no usable run, THEN THE App SHALL show a full-width error NoticeBanner with the list of problems, and THE environment switcher and the crew selector SHALL stay usable.


## Area 2: Dashboard and Body Map

### Requirement 20: Body Map (R8, R9, FD-15)

**User Story:** As a crew member, I want a clickable body figure whose region colours come from my indicators, so that I see at a glance which body systems need attention and why.

#### Acceptance Criteria

1. THE Body_Map SHALL be an SVG figure with exactly six regions, one for each Body_System: cardiovascular, musculoskeletal, vision, immune, mental and sleep.
2. THE Body_Map SHALL define its regions as a `Record` keyed by the full Body_System union, so that a missing region fails Typecheck.
3. THE Body_Map SHALL take the status of each region from the `SystemStatus` that `src/domain/rules/body-systems.ts` produces in the Evaluation_Result, and SHALL compute no status of its own.
4. THE Body_Map SHALL fill each region with the `status-*` token class of its Tier from the Tier_Presentation_Map, and SHALL show the Tier icon and the Tier text label with each region.
5. WHILE a region has the No_Data_State, THE Body_Map SHALL show that region with the No_Data_State presentation and the text "No data yet".
6. WHILE no vision symptom has been reported and no indicator maps to `vision`, THE Body_Map SHALL show the vision region with the No_Data_State.
7. THE Body_Map SHALL render each region as a keyboard-focusable button with an accessible name made of the system label, the Tier label and the text "Open details", such as "Sleep, concerning. Open details".
8. WHEN the user activates a region with a click, the Enter key or the Space key, THE Body_Map SHALL write the region to the selected region field of the UI_Store and open the Region_Panel.
9. THE Body_Map SHALL show a legend that lists each Tier and the No_Data_State with icon and text from the Tier_Presentation_Map.
10. THE Body_Map SHALL style the regions with Tailwind classes driven by status and SVG attributes, and SHALL use no inline style string.
11. THE App SHALL show a region list with the same six regions as buttons, with the same accessible names, as the keyboard-friendly and small-screen alternative to the figure.
12. THE Body_Map SHALL place the immune, mental and sleep regions at conventional positions, since these systems have no precise anatomical place, and the region geometry file SHALL record in a comment that these positions are conventional (FD-15).

### Requirement 21: Region Panel (R10)

**User Story:** As a crew member, I want a panel for each body region, so that I can read its function, current status, threatening hazards, trend and actions in one place.

#### Acceptance Criteria

1. WHEN a region is selected, THE Region_Panel SHALL show, in this order: name and function, status, threatening hazards, trend, findings and recommended actions.
2. THE Region_Panel SHALL take the name, function text and lead indicator from `src/data/body-regions.ts` through the Session_Provider.
3. THE Region_Panel SHALL show the TierBadge of the region and a sentence that states whether a cluster finding raised the Tier of the region.
4. THE Region_Panel SHALL list the hazards of the indicators of the region from the indicator catalog through `indicatorsForSystem`, each with the short hazard description from `src/data/hazards.ts`.
5. THE Region_Panel SHALL show, for each listed hazard, the text "emphasised here" or "less emphasised here" according to the hazard weight of the current environment profile.
6. THE hazard section SHALL carry a Verification_Marker, because the hazard to body-system mapping carries flag C.
7. THE Region_Panel SHALL show a compact chart of the lead indicator of the region, built from the Trend_Series, and a link to the trends page for the other indicators.
8. THE Region_Panel SHALL show the findings of the region with reason, confidence and action, using the same finding card as the alerts page.
9. THE Region_Panel SHALL list the countermeasures of Content_File data tagged for the region, each with a "Mark done" action that writes to the Engagement_Store for the selected astronaut and Mission_Day.
10. THE Region_Panel SHALL appear as a side sheet on wide screens and stacked below the figure on narrow screens.
11. WHEN the route is hidden, THE Region_Panel SHALL close, through a layout-effect clean-up that resets the selected region.

### Requirement 22: Dashboard Home Screen (R8, R13, section 12)

**User Story:** As a crew member, I want a home screen that gathers the body map, my daily status, active findings, next tasks and the crew, so that I know what needs attention today.

#### Acceptance Criteria

1. THE dashboard SHALL arrange the Body_Map, the daily summary, the active findings, the next tasks, the crew strip and the Context_Bar on the `/` route.
2. THE daily summary SHALL show the overall Tier of the selected astronaut through the TierBadge, the count of findings for each Tier, and one sentence that names the strongest finding.
3. THE daily summary SHALL take the overall Tier from the worst body-system Tier using the domain tier order, and SHALL show the No_Data_State when every body system has no data.
4. THE active findings list SHALL show the top findings for the selected astronaut, sorted by Tier and then by confidence with `compareTiers` and `CONFIDENCE_ORDER`, each with reason, confidence and a link to the alerts page.
5. THE active findings list SHALL show the top 3 findings, with the count as a proposed default in `src/data/app-defaults.ts`.
6. THE next tasks list SHALL show the check-in of today when no Entry exists for the selected astronaut and Mission_Day, and the daily countermeasures not yet done.
7. THE crew strip SHALL show one chip for each crew member with the overall Tier through the Tier_Presentation_Map, and WHEN the user clicks a chip, THE dashboard SHALL select that astronaut.
8. THE dashboard SHALL show the ground link status in the Context_Bar and the environment and Mission_Day indicator.
9. WHEN the Evaluation_Result has no findings, THE dashboard SHALL show the empty state "Nothing needs attention today" in the green Tier style with icon and text.

## Area 3: Check-In and Trends

### Requirement 23: Check-In Wizard (R11, FD-6)

**User Story:** As a non-expert crew member, I want a guided check-in with plain instructions for each measurement, so that I can record my vitals in about two minutes.

#### Acceptance Criteria

1. THE Check_In_Wizard SHALL provide three measurement steps in this order: resting heart rate, blood pressure with two fields (systolic and diastolic), and mood on a scale from 1 to 5.
2. THE Check_In_Wizard SHALL read the step order, titles, numbered instructions, field labels and units from `src/data/check-in.ts`.
3. THE Check_In_Wizard SHALL show the step number, a progress indicator, the instruction list, a value field with its unit and a quality choice of good or poor for each step.
4. THE Check_In_Wizard SHALL prefill each field with the simulated sensor value of the selected astronaut on the current Mission_Day, and SHALL leave the field empty WHERE the run holds no value for that day.
5. THE Check_In_Wizard SHALL let the user change a prefilled value and set the quality of each measurement to good or poor.
6. THE Check_In_Wizard SHALL keep "Back" and "Next" available on every step.
7. THE Check_In_Wizard SHALL offer no safety-flag input and no self-harm screening question.
8. WHEN the user saves, THE Check_In_Wizard SHALL write one Entry for each measured indicator to the Entries_Store, keyed by Base_Scenario id, astronaut id, Mission_Day and indicator id.
9. WHEN the user saves a second time for the same key, THE Entries_Store SHALL replace the first Entry.
10. WHEN the route is hidden, THE Check_In_Wizard SHALL reset the open step, through a layout-effect clean-up.
11. THE check-in instruction text SHALL carry a Verification_Flag and an empty `sources` array in `src/data/check-in.ts`, with a visible Verification_Marker WHERE the step carries a flag C value.

### Requirement 24: Check-In Validation (R11, FD-6)

**User Story:** As a crew member, I want a clear message when a value is impossible, so that I can correct it before saving.

#### Acceptance Criteria

1. WHEN the user attempts to save, THE Check_In_Wizard SHALL check each value against the `validRange` of its indicator in the indicator catalog.
2. IF a value is empty, is not a number or lies outside the `validRange` of its indicator, THEN THE Check_In_Wizard SHALL show an inline message that names the field and the allowed range from the catalog, and SHALL block saving.
3. THE inline message SHALL be associated with its field for assistive technology, through `aria-describedby` or equivalent.
4. WHEN the user corrects the value, THE Check_In_Wizard SHALL remove the inline message and allow saving.
5. WHEN a saved Entry still fails the engine range check, THE Session_Provider SHALL show the engine error as a Notice.
6. THE Check_In_Wizard SHALL take the allowed range from the catalog and SHALL hold no range value of its own.

### Requirement 25: Symptom Step (R11, FD-6)

**User Story:** As a crew member, I want to report symptoms during the check-in, so that the engine can use them in its cluster rules.

#### Acceptance Criteria

1. THE Check_In_Wizard SHALL provide one optional symptom step after the measurement steps.
2. THE symptom step SHALL show a checklist of the symptom kinds of the existing `SymptomKindSchema`, each with the plain label from `src/data/check-in.ts`.
3. WHEN the user selects chest pain or fainting, THE symptom step SHALL show the fixed emergency note from `src/data/check-in.ts`, which tells the user to follow emergency procedures and tell the crew now.
4. THE symptom step SHALL allow the user to continue with no symptom selected.
5. WHEN the user saves, THE Check_In_Wizard SHALL write each selected symptom as a symptom Entry keyed by Base_Scenario id, astronaut id and Mission_Day, and THE Check_In_Overlay SHALL add the report to the symptom reports of the day.
6. THE symptom step SHALL give no diagnosis, no drug and no dose.

### Requirement 26: Check-In Result Summary (R11, R6)

**User Story:** As a crew member, I want to see what changed after I save, so that I understand how today's measurements affect my status.

#### Acceptance Criteria

1. WHEN the user saves, THE Check_In_Wizard SHALL show a result summary that compares two Evaluation_Results of the same Mission_Day, one before and one after the Entries were applied, using the comparison function of the Check_In_Overlay.
2. THE result summary SHALL show each saved reading with its TierBadge.
3. THE result summary SHALL show each finding that is new after saving, with reason, confidence and action.
4. THE result summary SHALL show the change of Tier for each indicator whose Tier changed.
5. THE result summary SHALL link to the alerts page and the trends page.
6. WHEN the saved readings change no Tier and add no finding, THE result summary SHALL say so in text.
7. THE trends page and the alerts page SHALL reflect the saved Entries on the next render, because the Session_View is recomputed when the Entries change.

### Requirement 27: Trend Page Controls (R12, section 12)

**User Story:** As a crew member, I want to choose an indicator and a time range, so that I can look at one history at a time.

#### Acceptance Criteria

1. THE indicator picker SHALL list the indicators of the catalog that have data in the current run, grouped by Body_System with `BODY_SYSTEM_LABELS`.
2. THE indicator picker SHALL show the unit of each indicator and a Verification_Marker.
3. THE range filter SHALL offer "Last 7 days", "Last 14 days" and "Whole mission so far".
4. THE range filter and the selected indicator SHALL be kept in the UI_Store.
5. THE baseline note SHALL state, under the chart, whether the baseline comes from pre-flight data or from the 14-day window, and SHALL state when a baseline freeze is in force.
6. WHERE the indicator has a pending floor (TD-11), THE baseline note SHALL say "Minimum change not yet set".
7. THE baseline note SHALL take its facts from the Trend_Series, and SHALL compute none of them.

### Requirement 28: Trend Chart (R12, R9)

**User Story:** As a crew member, I want a chart of my readings with my personal baseline band, so that I can see drift against my own normal and not against Earth norms.

#### Acceptance Criteria

1. THE trend chart SHALL draw the readings as a line, the Baseline_Band as a shaded range area, and the baseline mean as a dashed line, using the Trend_Series and no value computed in the component.
2. THE trend chart SHALL draw the hard limits of the indicator as labelled reference lines WHERE the indicator has hard limits.
3. THE trend chart SHALL mark each point with a shape and the colour of its Tier, and the legend SHALL read the Tier_Presentation_Map.
4. THE trend chart SHALL draw a poor-quality reading with a hollow marker.
5. WHEN a Mission_Day has no reading, THE trend chart SHALL show a gap.
6. THE trend chart SHALL show the Tier text of a point in its tooltip.
7. THE trend chart SHALL be accompanied by a text summary and a visually hidden data table that gives the same values to assistive technology.
8. THE trend chart SHALL use `var(--status-*)` and other token strings for colours and SHALL use no literal colour value.
9. THE trend chart SHALL turn animation off and use `ResponsiveContainer` for its size.
10. THE trend chart and every other Recharts chart SHALL be imported only in chart components, and the chart pages SHALL load them with `next/dynamic`, so that the dashboard bundle stays small.
11. WHEN a chart render error occurs, THE ChartErrorBoundary SHALL show a NoticeBanner in place of the chart.
12. THE trend chart SHALL show a point for the selected astronaut only, on the Mission_Days up to the current Mission_Day.
13. WHEN a reading lies inside the Earth reference range of its indicator and outside the Baseline_Band, THE trend chart SHALL draw that point outside the band at its true value, so that a personal-baseline deviation is visible although the value looks normal by Earth norms (PROJECT.md section 16, demo step 5).

## Area 4: Alerts and Escalation

### Requirement 29: Findings List (R6, section 12)

**User Story:** As a crew member, I want one list of all findings for me today, sorted and filterable, so that I can see what needs attention first.

#### Acceptance Criteria

1. THE alerts page SHALL list all findings of the selected astronaut on the current Mission_Day.
2. THE findings list SHALL sort findings by Tier and then by confidence, using `compareTiers` and `CONFIDENCE_ORDER` of the Domain_Layer, with the most severe first.
3. THE alerts page SHALL provide a filter by Tier and a filter by Body_System, and SHALL keep both filters in the UI_Store.
4. WHEN the Evaluation_Result has no findings, THE alerts page SHALL show the empty state "Nothing needs attention today" in the green Tier style with icon and text.
5. WHEN a filter matches no finding while findings exist, THE alerts page SHALL show an empty state that says the filter matches nothing and offers to clear the filter.
6. THE alerts page SHALL list the `errors` of the Evaluation_Result in a collapsed list titled "Data problems", so that a bad reading is visible and not silent.
7. WHILE the `errors` list is empty, THE alerts page SHALL show no "Data problems" list.

### Requirement 30: Finding Card and Tier History (R6, R9, R14)

**User Story:** As a crew member, I want each finding to show why it was raised, how sure the tool is, what to do and where the threshold comes from, so that I can trust and act on it.

#### Acceptance Criteria

1. THE finding card SHALL show the TierBadge, the kind of finding (single indicator or pattern from several signals), the reason, the ConfidenceBadge and the numbered actions.
2. THE finding card SHALL show the sources of the finding, and WHERE `sourceIds` is empty, THE finding card SHALL show the text "No source supplied yet".
3. THE finding card SHALL show a Verification_Marker.
4. THE finding card SHALL provide a "Show details" area that lists the contributing indicators, links to their trends and shows the mean, the spread and the distance of a deviation WHERE the finding carries deviation evidence.
5. THE finding card SHALL be one shared component used by the alerts page, the Region_Panel, the dashboard and the check-in result summary.
6. THE tier history SHALL show, for each indicator, a strip of the daily Tiers over the mission so far, built from `EvaluationResult.history`.
7. THE tier history SHALL give each day cell the Tier icon from the Tier_Presentation_Map and a text alternative that states the Mission_Day and the Tier label.
8. THE tier history SHALL mark each day on which `DayState.frozen` is true as a frozen-baseline day, with text and not colour alone.
9. THE tier history SHALL resolve the classification of each indicator with `classificationFor` of the Trend_Helper, and SHALL compute no Tier.
10. WHERE a finding is orange or red, THE finding card SHALL show an escalate action "Prepare message for ground" that opens the escalation page with that finding preselected in the UI_Store.
11. WHILE a finding is green or yellow, THE finding card SHALL show no escalate action.

### Requirement 31: Escalation Summary View and Send (R15, R16, FD-11)

**User Story:** As a crew medical officer, I want to review a generated summary, choose what to include and send it with one tap into a queue, so that flight surgeons receive a structured message even when the link is down.

#### Acceptance Criteria

1. THE escalation page SHALL show the Escalation_Summary with the sections who and when, environment and mission day, findings with Tier and confidence, trends for the contributing indicators, context and actions taken, with the section titles from `src/data/escalation.ts`.
2. THE escalation page SHALL build the summary with the Summary_Builder from the Evaluation_Result, and SHALL compute no summary content in a component.
3. THE escalation page SHALL let the user choose which findings to include, and WHERE a finding was preselected from the alerts page, THE escalation page SHALL start with that finding chosen.
4. WHEN no finding is chosen, THE send control SHALL be disabled and THE escalation page SHALL say that at least one finding is needed.
5. WHEN the user sends, THE send control SHALL create an Escalation_Message in the Escalation_Store with the summary snapshot, the creation Mission_Day and Link_Clock value, the one-way delay chosen by the Link_Timing_Helper and the Scripted_Reply id chosen by the Link_Timing_Helper.
6. THE send control SHALL reject a second send of the same summary snapshot, and the escalation page SHALL say that the snapshot was already sent.
7. WHILE the ground link is unavailable on the current Mission_Day, THE new Escalation_Message SHALL stay queued, and THE escalation page SHALL say that messages wait in the queue.
8. WHEN the ground link is available on the current Mission_Day, THE queued Escalation_Message SHALL start transmitting, and THE Escalation_Store SHALL record the Link_Clock value of the start.
9. WHEN a blackout begins after transmission started, THE transmission SHALL continue without interruption.
10. THE summary SHALL contain no medical advice that is not already in the finding text.

### Requirement 32: Ground Link Status, Message Timeline and Scripted Reply (R16, FD-11)

**User Story:** As a presenter, I want the simulated delay, the message stages and the scripted reply visible and skippable, so that the distance hazard is demonstrated within the demo time.

#### Acceptance Criteria

1. THE link status panel SHALL show the one-way delay range of the environment, whether the ground link is available on the current Mission_Day and a countdown to the next stage.
2. WHERE the environment has no delay figure, THE link status panel SHALL show the demo delay from `src/data/escalation.ts` and label it as a demo value.
3. WHILE a blackout covers the current Mission_Day, THE link status panel SHALL show "Link unavailable. Messages wait in the queue." and the wording of the blackout rule (conjunction or signal gaps) from `src/data/escalation.ts`.
4. THE message timeline SHALL show the stages queued, transmitting, delivered and reply received, each with an icon and a text label.
5. THE message timeline SHALL take the Message_Stage from the Link_Timing_Helper for the stored message and the Link_Clock value, and SHALL store no stage.
6. THE Scripted_Reply SHALL appear when the Link_Clock reaches the start time plus two one-way delays.
7. THE reply card SHALL label the reply "Scripted demo reply" and SHALL show the text from `src/data/escalation.ts`, which gives no medical advice and no instruction beyond "continue the steps shown and report changes".
8. THE escalation page SHALL provide a "Skip to next stage" button that sets the Link_Clock to the time of the next stage of the oldest unfinished message.
9. THE message history SHALL list the previous Escalation_Messages read-only from the Escalation_Store.
10. WHEN the page is reloaded, THE Message_Stage of every stored message SHALL be the same as before the reload for the same Link_Clock value, because the stage is derived.
11. THE escalation page SHALL read no clock during render and SHALL take every time value from the Link_Clock in the Escalation_Store.

## Area 5: Radiation and Countermeasures

### Requirement 33: Radiation Page (R13, section 6.6, section 12)

**User Story:** As a crew member, I want to see my dose rate against the environment background and my projected mission dose against my remaining allowance, so that I understand my radiation situation without being told a limit as fact.

#### Acceptance Criteria

1. THE dose rate card SHALL show the current dose rate as a multiple of the environment background from the Radiation_Helper, the TierBadge taken from the `dose-rate` classification of the Evaluation_Result, and a Draft_Marker.
2. THE career dose card SHALL show the projected mission dose and the share of the remaining allowance from the Radiation_Helper, the TierBadge taken from the `career-effective-dose` classification, and a Draft_Marker.
3. THE career dose card text SHALL state no career limit as a fact.
4. THE dose chart SHALL show the dose rate over the mission so far with the environment background as a reference line, using the same chart parts as the trend chart.
5. WHEN a solar particle event covers the current Mission_Day according to the Radiation_Helper and the alert list of the run, THE radiation page SHALL show a banner and the shelter checklist.
6. THE shelter checklist steps SHALL come from `src/data/radiation.ts`, SHALL contain no numbers, and SHALL point to the escalation page.
7. WHEN the route is hidden, THE shelter checklist SHALL reset its ticks, through a layout-effect clean-up.
8. WHERE `dose-rate` or `career-effective-dose` has no reading for the day, THE radiation page SHALL show the No_Data_State for that card.
9. THE radiation page SHALL use `Draft value` markers for every number that rests on flag C and SHALL never present such a number as plain fact.

### Requirement 34: Countermeasure Task List (R20, FD-12)

**User Story:** As a crew member, I want a list of today's countermeasures with how and why, so that I know which preventive actions to do and can mark them done.

#### Acceptance Criteria

1. THE countermeasures page SHALL list today's tasks from `src/data/countermeasures.ts`, each with title, why it matters, short how-to steps and the Body_System.
2. THE countermeasures page SHALL show a Verification_Marker for each task.
3. WHEN the user marks a task done, THE countermeasures page SHALL write the task id to the Engagement_Store for the selected astronaut, Base_Scenario and Mission_Day.
4. WHEN the user marks a done task as not done for the current Mission_Day, THE countermeasures page SHALL remove the completion.
5. THE countermeasures page SHALL show past Mission_Days as read-only, and SHALL allow changes to the current Mission_Day only.
6. THE countermeasure content SHALL contain no medication, no dose and no clinical number.
7. THE "Suggested for you" section SHALL list tasks whose `suggestedWhen` systems include a Body_System that is yellow or worse in the Evaluation_Result, using the Tier order of the Domain_Layer.
8. WHILE no body system is yellow or worse, THE "Suggested for you" section SHALL show an empty state in text.

### Requirement 35: Streaks, Crew Goal and Weekly Strip (R20, FD-12)

**User Story:** As a crew member, I want a streak, a crew goal and a weekly strip, so that completing countermeasures feels rewarding without pressure.

#### Acceptance Criteria

1. THE streak card SHALL show the current streak and the best streak from the Engagement_Helper.
2. THE crew goal SHALL show a progress bar and the same value as text, such as "2 of 3 crew members", together with the target share from `src/data/engagement.ts`, and SHALL say in text whether the target is met.
3. THE weekly strip SHALL show the last 7 Mission_Days for the selected astronaut, each as an icon with a text label of done or not done, with the strip length from `src/data/engagement.ts`.
4. WHEN a completion changes, THE streak card, the crew goal, the weekly strip and the dashboard next tasks SHALL update on the next render, because streaks and goals are derived and never stored.
5. THE crew goal SHALL count teammates' completions entered by selecting each crew member in the crew selector and marking tasks done for that member.
6. WHEN the user chooses "Simulate teammates" in the Director_Panel, THE Session_Provider SHALL write the completions that the Teammate_Simulator returns to the Engagement_Store.
7. THE page SHALL show all progress as text as well as with a bar, so that progress is not understood by colour or length alone.
8. WHEN the streak is 0, THE streak card SHALL show the text "No streak yet" and an invitation to start, and SHALL show no negative or punishing wording.

## Area 6: Director and Demo

### Requirement 36: Director Overlay and Route (R19, FD-10)

**User Story:** As a presenter, I want to open the director panel on any page with a keyboard shortcut and also at a fallback route, so that I can control the live demo without leaving the screen the judges are looking at.

#### Acceptance Criteria

1. THE App SHALL render one Director_Panel component in two places: as the Director_Overlay on every page, and as the page at `/director`.
2. WHEN the user presses the physical key D (`event.code` equal to `KeyD`) together with Alt and Shift and without Ctrl or Meta, THE App_Shell SHALL toggle the Director_Overlay open flag in the UI_Store.
3. WHILE the keyboard focus is in an `input`, `textarea`, `select` or content-editable element, THE App_Shell SHALL ignore the `Alt+Shift+D` shortcut.
4. THE App_Shell SHALL register the key listener once in an effect and SHALL remove the key listener in the clean-up of that effect.
5. THE Director_Overlay SHALL open as a dialog that moves the keyboard focus into the Director_Panel, keeps the keyboard focus inside while open, and closes with the Escape key and with a visible "Close" button.
6. WHEN the Director_Overlay closes, THE App_Shell SHALL return the keyboard focus to the element that had the focus when the Director_Overlay opened.
7. THE Director_Overlay SHALL give the dialog the accessible title "Director panel" and SHALL render no second `h1` on the page.
8. THE App SHALL leave `/director` out of the navigation, the footer and every in-page link, and THE `/director` page SHALL render inside the root layout with the App_Shell and the footer.
9. THE Director_Panel SHALL show five sections in this order, each with a heading: time, scenario, events, demo pack and session.
10. THE Director_Panel SHALL call `injectEvent`, `switchEnvironment`, `switchCrew`, the Teammate_Simulator and `verifySimulation` only through hooks of `src/features/session/`, and SHALL contain no health logic.
11. WHILE the `status` of the Session_View is `loading`, THE Director_Panel SHALL show a skeleton in place of its controls.
12. WHILE the `status` of the Session_View is `blocked`, THE Director_Panel SHALL keep the scenario section and the session section usable, so that the user can recover.
13. WHEN the `/director` route is hidden, THE Director_Panel SHALL reset its transient form state (the day field and the selected preset), through a layout-effect clean-up.

### Requirement 37: Director Time, Scenario and Event Controls (R19, FD-8, FD-14)

**User Story:** As a presenter, I want to scrub the mission day, switch the environment and crew, inject an event and remove it again, so that I can show the storylines on demand and recover from a mistake.

#### Acceptance Criteria

1. THE time section SHALL provide a slider with the accessible name "Mission day", a minimum of 0, a maximum of the scenario duration minus 1, a step of one Mission_Day, and the value text "Day N of M".
2. WHEN the user moves the slider, THE Director_Panel SHALL write the Mission_Day to the Session_Store, and THE slider SHALL show the new day at once while the views follow the deferred Mission_Day of Requirement 13.11.
3. THE time section SHALL provide "Previous day" and "Next day" buttons with the limits of Requirement 17.1, and jump buttons labelled with the day number for the first day, the last day and each Mission_Day on which the current scenario holds an event.
4. THE slider SHALL be operable with the arrow keys, the Home key and the End key.
5. THE scenario section SHALL offer the environments ISS, lunar surface and Mars transit, and WHEN the user chooses an environment, THE Director_Panel SHALL apply `switchEnvironment` to the current scenario so that the scenario keeps its events and crew.
6. THE scenario section SHALL tell the user in text that this choice keeps the events of the current scenario, and that the environment switcher in the header loads the scenario of the chosen environment instead.
7. THE scenario section SHALL list the crew profiles of the simulation library as a checklist, and WHEN the user applies a selection, THE Director_Panel SHALL apply `switchCrew` with the selected astronaut ids.
8. WHEN no crew member is selected, THE scenario section SHALL disable the apply control and SHALL say that at least one crew member is needed.
9. THE Director_Panel SHALL apply each edit to the replayed current scenario first, and SHALL append the edit to the Edit_Log only when the simulation returns no Simulation_Problem.
10. IF `injectEvent`, `switchEnvironment` or `switchCrew` returns Simulation_Problems, THEN THE Director_Panel SHALL show the `message` of each Simulation_Problem next to the control that caused it, SHALL leave the Edit_Log unchanged and SHALL leave the scenario unchanged.
11. THE events section SHALL list one control for each Director_Preset in `src/data/director-presets.ts`: sleep drift, mood dip, solar particle event, EVA, treadmill outage, headache, CO₂ spike and comms blackout.
12. THE events section SHALL provide a whole-number day field that defaults to the current Mission_Day.
13. IF the day field is empty or is not a whole number, THEN THE events section SHALL show an inline message that names the field and SHALL block the injection.
14. WHEN the user injects a Director_Preset, THE Director_Panel SHALL apply `injectEvent` with the payload of the Director_Preset and the day of the day field.
15. WHERE a Director_Preset has the origin `proposed-default`, THE events section SHALL show a Draft_Marker and the text "proposed default" next to the Director_Preset.
16. THE events section SHALL list the injected events of the Edit_Log in order, each with its Director_Preset label or event type, its day and a "Remove" button, and SHALL list no event of the Base_Scenario.
17. WHEN the user chooses "Remove", THE Director_Panel SHALL drop that edit from the Edit_Log and THE Session_Provider SHALL replay the remaining edits.
18. IF a replay after "Remove" returns Simulation_Problems, THEN THE Session_Provider SHALL show them as Notices and SHALL leave the Edit_Log as the user changed it.

### Requirement 38: Demo Pack Playback and Session Tools (R19, section 11.5, section 16)

**User Story:** As a presenter, I want to step through the six segments of the judges' demo with captions, and to reset the session or check the simulation data before I go on stage, so that the 3-minute demo runs the same way every time.

#### Acceptance Criteria

1. THE demo pack section SHALL list the segments of the Demo_Pack in pack order, each with the plan step, the scenario label, the first and last Mission_Day, the focus astronaut, the target seconds and the caption.
2. THE demo pack section SHALL show the total target time as the sum of the target seconds of the segments, which is 170 seconds for the shipped Demo_Pack.
3. WHEN the user chooses "Go to segment" for a Demo_Segment, THE Session_Provider SHALL set the Base_Scenario to the scenario of that Demo_Segment, SHALL clear the Edit_Log, SHALL select the focus astronaut, SHALL set the Mission_Day to the first day of that Demo_Segment, and SHALL write the position of that Demo_Segment to the UI_Store.
4. WHILE a Demo_Segment is active, THE Caption_Bar SHALL show on every page the plan step, the text "Segment N of M", the caption and the target seconds of that Demo_Segment, together with the controls "Previous segment", "Next segment", "Restart" and "Leave demo".
5. WHEN the user chooses "Next segment" or "Previous segment", THE Session_Provider SHALL go to the adjacent Demo_Segment with the same effect as "Go to segment".
6. THE Caption_Bar SHALL disable "Previous segment" on the first Demo_Segment and "Next segment" on the last Demo_Segment.
7. WHEN the user chooses "Restart", THE Session_Provider SHALL go to the first Demo_Segment.
8. WHEN the user chooses "Leave demo", THE App_Shell SHALL clear the position from the UI_Store and hide the Caption_Bar, and THE Session_Provider SHALL leave the scenario, the astronaut and the Mission_Day unchanged.
9. THE App SHALL change the Demo_Segment only by user action, and SHALL provide no timer that plays the Demo_Pack.
10. THE Caption_Bar SHALL render the caption as plain text read from the Demo_Pack, and SHALL hold no copy of any caption.
11. WHEN the active Demo_Segment changes, THE Live_Region SHALL announce the caption.
12. IF the scenario id of a Demo_Segment is not in the simulation library, or the focus astronaut is not in the crew of that scenario, or the first Mission_Day is outside the duration of that scenario, THEN THE Session_Provider SHALL show a Notice with the problem text and SHALL leave the session and the Demo_Segment position unchanged.
13. THE session section SHALL provide the controls "Simulate teammates", "Reset session" and "Run simulation checks".
14. WHEN the user chooses "Simulate teammates", THE Director_Panel SHALL write the completions as Requirement 35.6 defines, and SHALL state in text how many completions were written.
15. WHEN the user chooses "Reset session", THE Director_Panel SHALL ask for confirmation in a dialog, and WHEN the user confirms, THE App SHALL reset the session as Requirement 45.8 defines.
16. WHEN the user chooses "Run simulation checks", THE Director_Panel SHALL call `verifySimulation` with the default simulation library and the context of the Session_Provider (catalog, clusters, engine config and finding text).
17. WHEN the verification report has `ok` set to true, THE session section SHALL show the text "No problems found".
18. WHEN the verification report lists problems, THE session section SHALL list each Simulation_Problem with its code description from `describeProblemCode`, its entry kind, its entry id, its field path and its message.
19. THE Director_Panel SHALL run `verifySimulation` only on user action, and THE result SHALL change no store.

## Area 7: About, Polish and Delivery

### Requirement 39: About Page (R13, R14, section 2.3, section 12)

**User Story:** As a judge or crew member, I want an about page that says plainly what the tool is, how sure its values are and where they come from, so that I do not mistake a prototype with draft values for a medical device.

#### Acceptance Criteria

1. THE `/about` page SHALL render the PageHeader and four sections in this order: notice, draft data, sources and how it works.
2. THE `src/app/about/page.tsx` file SHALL import `DISCLAIMER_NOTICE` from `src/data/disclaimer.ts` and pass the constant to the about view as a prop, as Requirement 12.5 defines, and THE about view SHALL render the prop unchanged.
3. THE decision-support text rendered on `/about` SHALL equal the text rendered in the footer character for character.
4. THE about view SHALL read the plain statements, the flag explanations, the reading list and the how-it-works text from `src/data/about.ts` through a Selector_Hook of `src/features/session/`.
5. THE draft data section SHALL explain the Verification_Flags A, B and C with the meaning of PROJECT.md section 6.1, and SHALL state that every threshold and space-specific value is a draft.
6. THE draft data section SHALL show the number of indicators that have no source and the total number of indicators, taken from `findUnverifiedIndicators` of the Domain_Layer.
7. THE draft data section SHALL show the number of clusters that have no source and the total number of clusters, taken from a pure function `findUnverifiedClusters` that THE Domain_Layer adds as a new file `src/domain/indicators/cluster-verification.ts` and that mirrors `findUnverifiedIndicators`.
8. WHILE the number of indicators with no source equals the total number of indicators, THE draft data section SHALL state that no threshold has a source yet.
9. WHILE every `sources` array of the indicators and clusters is empty, THE sources section SHALL show the text "No sources have been supplied yet".
10. WHERE an indicator or a cluster has a source reference, THE sources section SHALL list each distinct source reference once, with its id, its citation and its URL when present.
11. THE sources section SHALL show the Reading_List of the NASA Human Research Program pages named in PROJECT.md section 1 (hazards, risks and ongoing research), each with its title and URL, and SHALL label the list "Reading list, not citations".
12. THE Reading_List links SHALL be ordinary links that make no network request until the user activates a link, and each link SHALL open with `rel="noopener noreferrer"`.
13. THE how-it-works section SHALL explain the six steps of the core loop (measure, compare to personal baseline, classify, explain, act, escalate) and the idea of a personal baseline in plain language.
14. THE about text SHALL contain no clinical number, dose, drug name or threshold, as Requirement 9.9 defines.

## Cross-Cutting Requirements

### Requirement 40: Layering and Purity (D4, section 13.2, FD-1 to FD-4)

**User Story:** As a developer, I want the layer rules of `structure.md` to hold in every file, so that health logic stays out of components and the pure layers stay free of React and the clock.

#### Acceptance Criteria

1. THE Import_Search SHALL list no import statement in a file under `src/store` whose module path points into `src/simulation`, `src/features` or `src/components` (FD-1).
2. THE Import_Search SHALL list no import statement in a file under `src/components` whose module path points into `src/store`, `src/features` or `src/data`, with `src/components/disclaimer-footer.tsx` as the only file that may import from `src/data` (FD-2).
3. THE Import_Search SHALL list no import statement in a file under `src/features` whose module path points into `src/data`, so that features read engine data and content only through the context hooks of the Session_Provider (FD-2).
4. THE Import_Search SHALL list import statements from `src/data` in `src/app` only in `src/app/app-providers.tsx` and, for the `DISCLAIMER_NOTICE` constant alone, in `src/app/about/page.tsx`.
5. THE Import_Search SHALL list no import statement that reaches into another feature other than through that feature's `index.ts`, and the listed feature-to-feature imports SHALL form no cycle.
6. THE App SHALL give each feature folder in `src/features/` an `index.ts` that exports the public parts of that feature (FD-3).
7. THE Import_Search SHALL list no import of a classification module (`classify-base`, `deviation`, `persistence`, `confidence`, `clusters`, `compare` or `findings` in `src/domain/rules/`) in a file under `src/components`, `src/features`, `src/store` or `src/app`.
8. THE Search_Check SHALL list no use of the names `hardLimits`, `yellowSd`, `orangeSd`, `minAbsoluteChange` or `careerLimitMsv` in a file under `src/components`, `src/features`, `src/store` or `src/app`, so that no view compares a number with a threshold.
9. THE Import_Search SHALL list no import of `react`, `react-dom`, `next` or a UI layer in the new files of `src/domain` and `src/simulation`, and THE Search_Check SHALL list no `Math.random`, `Date.now` or `new Date(` in `src/domain` and `src/simulation`.
10. THE App SHALL leave `eslint.config.mjs`, `eslint.rules.mjs` and every file in `eslint-rules/` unedited.
11. THE Stores SHALL hold plain, serialisable data and setter functions only, and SHALL hold no derived value that Requirement 14 lists as derived (streak, crew goal, Message_Stage).
12. THE Session_Provider, the Stores and every component that reads a Store SHALL be client components, so that no Store is read on the server.

### Requirement 41: Content as Data (section 13.2 rule 3, FD-2)

**User Story:** As a content author, I want every instruction, description and wording in data files, so that I can change text without touching components and so that the decision-support notice exists in one place.

#### Acceptance Criteria

1. THE views SHALL contain no check-in instruction, countermeasure text, region description, hazard description, shelter step, scripted reply, demo caption or about text as a string literal, and SHALL read each from a Content_File or from the Demo_Pack through props or hooks.
2. THE Search_Check SHALL find the decision-support notice text ("Decision support only") in exactly one file under `src/`, which is `src/data/disclaimer.ts`.
3. THE existing `DisclaimerFooter` SHALL keep rendering the notice from its import of `DISCLAIMER_NOTICE`, which is the one exception of Requirement 11.7, and THE about view SHALL render the notice from the prop that `src/app/about/page.tsx` passes in, so that neither holds a copy.
4. THE App SHALL read each of these tunable values from a Content_File and SHALL mark each as a proposed default where PROJECT.md gives no value: the start state, the Link_Time_Scale, the ISS demo delay, the number of active findings shown, the crew-goal target share, the weekly strip length and the event values of the Director_Presets with the origin `proposed-default`.
5. WHEN an entry is added to or changed in `countermeasures.ts`, `check-in.ts`, `body-regions.ts`, `hazards.ts`, `radiation.ts`, `director-presets.ts` or `about.ts`, THE views SHALL show that entry with no edit to a component.
6. THE Tier_Presentation_Map SHALL hold the plain tier labels, and THE App SHALL hold no second tier label list.
7. THE App SHALL take finding reasons, actions and finding kinds from the `FindingText` supplied by the Composition_Root, and SHALL hold no copy of finding text in a component.

### Requirement 42: Never Colour Alone (R9, section 8, section 13.3)

**User Story:** As a user who cannot rely on colour, I want every status, stage and progress value shown with an icon and text as well, so that I understand the app in grayscale.

#### Acceptance Criteria

1. THE App SHALL render every Tier and the No_Data_State through the Tier_Presentation_Map, and THE Search_Check SHALL list `status-green`, `status-yellow`, `status-orange` and `status-red` token classes only in `src/components/tier-presentation.ts`, in `src/app/globals.css` and in the chart components that use `var(--status-*)` strings.
2. THE Search_Check SHALL list no Tailwind colour class that names a tier word with a shade, such as `bg-red-500` or `text-green-600`, in `src/`.
3. THE Body_Map regions, the region list items, the crew chips and the crew selector SHALL show the Tier icon and the Tier label next to every Tier colour.
4. THE trend chart points SHALL differ by marker shape for each Tier, and THE tooltip and the visually hidden data table SHALL state the Tier label of each point in text.
5. THE ground link status badge, the Message_Stage timeline and the weekly strip SHALL show an icon and a text label for every state.
6. THE crew goal and every other progress bar SHALL show its value as text, such as "2 of 3 crew members".
7. THE tier history SHALL mark a frozen-baseline day and a missing day with text, and SHALL not rely on colour or shade alone.
8. THE App SHALL be usable with the display set to grayscale, as the Manual_Checklist check 13 verifies.

### Requirement 43: Honest About Drafts (R14, section 6.1, FD-9)

**User Story:** As a judge, I want every draft or unsourced value to be visibly marked, so that I never mistake a team heuristic or a memory-based number for a verified fact.

#### Acceptance Criteria

1. WHILE `process.env.NODE_ENV` is not `production`, THE Verification_Marker SHALL show an "Unverified" badge for each indicator whose `sources` array is empty.
2. THE Verification_Marker SHALL show the same output on the server and in the browser for the same `process.env.NODE_ENV` value, because the value is inlined at build time.
3. WHERE a value, text or claim has the Verification_Flag `C`, THE Verification_Marker SHALL show the "Draft value" marker in every build, including the production build.
4. THE App SHALL show the Draft_Marker on the finding card, the indicator picker, the hazard section of the Region_Panel, the dose rate card, the career dose card, the dose chart, the one-way delay range of the link status panel, each countermeasure task, each check-in step that carries flag C, and each Director_Preset with the origin `proposed-default`.
5. THE Verification_Marker SHALL give a tooltip or an adjacent text that says no source has been supplied, WHERE the `sources` array is empty.
6. THE finding card SHALL show "No source supplied yet" WHERE `sourceIds` is empty, as Requirement 30.2 defines.
7. THE App SHALL state no flag C number as a plain fact in any text, and THE Content_Files SHALL contain no clinical number, dose, drug name or threshold, as Requirement 9.9 defines.
8. THE App SHALL leave every `sources` array that this spec adds empty, SHALL add no entry to `approvedSourceIds`, and SHALL add no invented citation.
9. THE Scripted_Reply card SHALL carry the label "Scripted demo reply", and THE footer SHALL carry the notice that the prototype uses synthetic data and draft thresholds.
10. THE About page SHALL state, WHILE no indicator has a source, that no threshold has a source yet, as Requirement 39.8 defines.

### Requirement 44: Hydration Safety (section 13.2 rule 4, section 18)

**User Story:** As a user, I want the first render to match the server and my saved state to appear right after mount, so that the app shows no flash and no console warning.

#### Acceptance Criteria

1. THE persisted Stores SHALL use `skipHydration: true`, and THE Hydration_Gate SHALL rehydrate them in an effect after mount, as Requirements 15.1 and 45.1 define.
2. THE Search_Check SHALL list `localStorage` and `sessionStorage` only in `src/store/persist-config.ts`.
3. THE Search_Check SHALL list no `Math.random`, `Date.now`, `new Date(` or `toLocaleString` in `src/features`, `src/components`, `src/store`, `src/app` and `src/lib`.
4. THE Stores SHALL start with the same default values on the server and in the browser, and THE App SHALL read no browser-only value (window size, storage, locale, time) while rendering.
5. WHILE the `hydrated` flag is not set, THE main area of every page SHALL show a skeleton of fixed size, and THE title, the navigation and the footer SHALL render the same HTML as on the server.
6. THE App SHALL show no calendar date or clock time, so that no locale or time zone enters the render.
7. THE link clock timer, the director key listener and every other global listener SHALL be created in an effect and removed in the clean-up of that effect.
8. THE App SHALL reset the transient state of a hidden route (open check-in step, shelter checklist ticks, region panel and director form) in layout-effect clean-ups, as Requirements 21.11, 23.10, 33.7 and 36.13 define.
9. THE Search_Check SHALL list no `useSearchParams` in `src/`, because the App uses no URL search parameters.
10. THE App SHALL load each chart component with `next/dynamic`, and WHEN the Build prerenders the static routes, THE Build SHALL report no hydration or request-bound API error.
11. THE Manual_Checklist check 2 SHALL show no hydration warning in the browser console when each route is reloaded with stored data present.

### Requirement 45: Persistence (FD-7, FD-6, section 13.2)

**User Story:** As a user, I want my session, check-in entries, completed tasks and sent messages to survive a reload, and I want a bad or missing store to be handled without a crash, so that my work is kept and the app always starts.

#### Acceptance Criteria

1. THE Session_Store, Entries_Store, Engagement_Store and Escalation_Store SHALL persist to `localStorage` with the Zustand `persist` middleware, and THE UI_Store SHALL persist nothing.
2. THE `persist-config.ts` file SHALL hold the shared persist options and the storage guard, and each persisted Store SHALL use a key of the form `health-companion.<store>.v<N>` with the `version` option set to the same number N.
3. THE persisted Stores SHALL save only the fields that Requirement 14 lists for that Store, through `partialize`, and SHALL not save the `hydrated` flag.
4. WHEN a persisted Store is rehydrated, THE Store SHALL parse the stored value with a Zod schema in its `merge` function and SHALL accept the value only when the parse succeeds.
5. IF the stored value of a Store fails the Zod parse, is not valid JSON or has a version other than the current version, THEN THE Store SHALL discard that value, SHALL keep its default state, and SHALL cause one Notice with the text "Saved data could not be read, starting fresh."
6. WHEN one persisted Store discards its value, THE other persisted Stores SHALL keep their own valid values.
7. IF `localStorage` is missing, blocked or full, THEN THE Stores SHALL keep their state in memory, and WHEN a write fails, THE App SHALL cause one Notice about the failed write and SHALL continue.
8. WHEN the user confirms "Reset session", THE App SHALL remove the four stored keys, SHALL set the Session_Store to the start state of `src/data/app-defaults.ts` with an empty Edit_Log, SHALL empty the Entries_Store and the Engagement_Store, SHALL set the Link_Clock to 0 and empty the message list, and SHALL reset the UI_Store, without a page reload.
9. THE Notice of criterion 5 SHALL contain a "Reset session" action that asks for the same confirmation as the Director_Panel.
10. THE Stores SHALL write nothing to storage before their own rehydration has finished, so that default values never overwrite saved values.
11. WHEN the Base_Scenario id of the stored Session_Store is not in the simulation library, THE Session_Provider SHALL apply the start state and SHALL cause a Notice.
12. THE Entries_Store SHALL keep Entries of a Base_Scenario while the user has another scenario loaded, so that the Entries apply again when the user returns (dormant Entries).
13. THE persisted Stores SHALL hold only the plain values that Requirement 14 lists and SHALL hold no free text typed by the user.

### Requirement 46: Error Handling (Error scenarios 1 to 8 of the design)

**User Story:** As a user, I want every failure shown as a message with a way to recover, so that a bad store, a rejected edit, a failed run or an unknown URL never leaves me on a blank or crashed page.

#### Acceptance Criteria

1. IF a persisted Store holds unreadable, invalid or old-version data, or `localStorage` is missing, blocked or full, THEN THE App SHALL fall back to the defaults of that Store, SHALL show the Notice of Requirement 45.5 or 45.7 once, and SHALL keep every page usable (error scenario 1).
2. IF `injectEvent`, `switchEnvironment` or `switchCrew` returns Simulation_Problems, THEN THE App SHALL leave the edit out of effect, SHALL show the Simulation_Problem `message` text, and SHALL leave the Edit_Log unrewritten, as Requirements 13.4 and 37.10 define (error scenario 2).
3. IF `runScenario` or `buildEvaluationInput` returns an error, THEN THE App SHALL show a full-width error NoticeBanner with the list of problems and SHALL keep the environment switcher, the crew selector and "Reset session" usable, as Requirements 13.13 and 19.6 define (error scenario 3).
4. IF the `errors` list of an Evaluation_Result is not empty, THEN THE alerts page SHALL list the errors under "Data problems", THE App_Shell SHALL show the number of engine errors, and THE rest of the page SHALL render (error scenario 3).
5. IF a route component throws during render, THEN `src/app/error.tsx` SHALL show a message and a "Try again" button that calls `retry`, and THE header, the Context_Bar and the footer SHALL stay visible, as Requirement 19.4 defines (error scenario 4).
6. IF a chart throws during render, THEN THE ChartErrorBoundary SHALL show a NoticeBanner in place of that chart only, and THE rest of the page SHALL stay interactive (error scenario 4).
7. IF the user opens a URL that is not one of the routes of Requirement 12.1, THEN `src/app/not-found.tsx` SHALL explain that the page does not exist and SHALL link to the dashboard, inside the root layout with the footer (error scenario 5).
8. IF the check-in value is empty, is not a number or lies outside the `validRange` of its indicator, THEN THE Check_In_Wizard SHALL show an inline message with the field name and the allowed range and SHALL block saving, as Requirement 24 defines (error scenario 6).
9. IF a Content_File fails its schema at module load, THEN THE Content_File module SHALL throw an error that names the file and the field, so that `npm run dev` and `npm run build` stop, as Requirement 9.3 defines (error scenario 7).
10. WHILE a blackout covers the current Mission_Day, THE App SHALL treat the ground link state as an expected state and not as an error, SHALL show the badge "Link unavailable", SHALL keep new Escalation_Messages queued, and SHALL say so on the escalation page, as Requirements 16.8, 31.7 and 32.3 define (error scenario 8).
11. THE App SHALL show each Notice and each error message as plain text with an icon, and SHALL show no raw stack trace, no raw exception text and no Zod error object to the user.
12. THE App SHALL give every error message a way to recover: a "Try again" button, a "Reset session" action, a correction hint or a link, as the matching requirement above defines.
13. THE App SHALL catch no error silently, and SHALL show every problem that a Simulation_Layer, Domain_Layer or storage function returns as data in a Notice, an inline message or a list.

### Requirement 47: Accessibility and Responsiveness (section 12, UI rules compliance)

**User Story:** As a user with a keyboard, a screen reader, a small screen or a zoomed display, I want every page to work for me, so that no part of the app is out of reach.

#### Acceptance Criteria

1. THE App SHALL render exactly one `h1` on each page, including the error page, the not-found page and the Director_Panel page, through the PageHeader.
2. THE App SHALL render the heading levels of each page without skipping a level.
3. THE App SHALL render a skip link as the first focusable element on every page that moves the keyboard focus to the `main` element, as Requirement 16.4 defines.
4. THE App SHALL render the landmarks `header`, `nav`, `main` and `footer` once each on every page, and SHALL give each `nav` an accessible name.
5. THE App SHALL show a visible focus ring on every interactive element, using the focus styles of the shadcn components and of the shared components, with no element that removes the outline without a replacement.
6. THE App SHALL make every function reachable with the keyboard alone, including the navigation, the environment switcher, the crew selector, the Body_Map regions, the Check_In_Wizard, the trend controls, the filters, the escalation controls, the countermeasure tasks and the Director_Panel.
7. THE Body_Map regions and the region list items SHALL be `button` elements with the accessible names of Requirement 20.7.
8. THE App SHALL give every icon-only control an accessible name, and SHALL mark every decorative icon `aria-hidden="true"`.
9. THE trend chart and the dose chart SHALL each be accompanied by a text summary and a visually hidden data table, as Requirement 28.7 defines.
10. THE App_Shell SHALL contain one Live_Region with `aria-live="polite"` that announces the change of the Mission_Day, the change of the environment, a new finding, a new Notice, a change of the Message_Stage and the caption of a new Demo_Segment, and SHALL announce each change once.
11. THE App SHALL associate each inline validation message with its field, as Requirement 24.3 defines.
12. WHILE the viewport is at Touch_Width, THE App SHALL give each button, link in the navigation, Body_Map region button, region list item, chart range control and form control a target at least 44 px high and 44 px wide.
13. THE App SHALL lay out single-column at Touch_Width and SHALL use two or three columns on wider screens, with the Body_Map and the region list swapping places as Requirement 20.11 defines.
14. WHEN the viewport is 320 px wide, THE App SHALL show every page with no horizontal scrolling of the page, with no content cut off and with every control reachable.
15. WHEN the browser zoom is 200 percent, THE App SHALL show every page with no loss of content and no loss of function.
16. THE App SHALL use text colours and tier token pairs (token and matching foreground token) of the theme for all text, so that the contrast pairs of the foundation theme stay in force, and SHALL add no literal colour value.
17. THE App SHALL be usable in grayscale, as Requirement 42.8 defines.
18. THE App SHALL set the `lang` attribute of the `html` element to `en`, and SHALL give each page a distinct document title through `metadata`.

### Requirement 48: No Test Runner and Verification (tech.md, FD-18, FD-19)

**User Story:** As a developer, I want the compiler, schemas, lint, build, documented searches and a manual checklist to stand in for a test runner, so that I can show the app is correct without adding a test tool.

#### Acceptance Criteria

1. THE App SHALL add no test runner, no test script, no test package, no test configuration file and no test file, which includes any file whose name matches `*.test.*` or `*.spec.*` and any folder named `__tests__`.
2. THE App SHALL leave `package.json` and `package-lock.json` unedited, so that no dependency, no script and no version changes.
3. THE shadcn CLI SHALL add the component files of Requirement 11.8 to `src/components/ui/` and nothing else, and IF a component needs a package that is not installed, THEN THE developer SHALL stop and ask the user before adding the package, as Requirement 11.9 defines.
4. WHEN a task of the task list is complete, THE Check_Script SHALL pass, and WHEN a stage of the build order is complete, THE Build SHALL pass.
5. THE App SHALL pass Lint, which enforces no literal colours, no unjustified `style` attribute, no `any`, no `Math.random` and the Tailwind class rules, with no new `eslint-disable` comment.
6. THE App SHALL end every `switch` over a Tier, a Confidence, a Hazard, a Body_System, a finding kind, a Message_Stage and a store edit kind with a `never` check, and SHALL define each table keyed by such a union as a `Record` over the full union.
7. THE App SHALL type each Content_File with `satisfies` against its schema type and SHALL use no `as` assertion on content.
8. THE tasks of this spec SHALL document the Import_Search commands of Requirement 40 and the Search_Check commands of Requirements 40, 41, 42 and 44 as commands that run in the project shell with no added package, each with the expected result (an empty list, or the single allowed file).
9. THE tasks of this spec SHALL list the 14 checks of the Manual_Checklist, and THE developer SHALL perform them once per stage in `npm run dev` and once on the final `npm run build` and `npm run start`.
10. WHEN the Build finishes, THE route list of the Build output SHALL contain the nine routes of Requirement 12.1 and SHALL not contain `/dev/chart-check`.
11. THE App SHALL add no API route, no server action and no `route.ts` file, and THE Search_Check SHALL list no `'use server'`, no `fetch(` and no `serviceWorker` in `src/`.
12. THE App SHALL add no manifest, no service worker and no PWA tooling (decision D5).
13. THE App SHALL leave the existing `verifySimulation` and the validators of the Simulation_Layer in use and unedited, and the director "Run simulation checks" control SHALL be the way to run them in the browser.
14. THE App SHALL leave the existing `docs/PROJECT.md` and the steering files unedited.

### Requirement 49: Delivery Readiness (section 14 step 10, section 16, section 18)

**User Story:** As a team member, I want a final state that starts cleanly, shows the demo path first and can be run from the README alone, so that the judges' demo does not depend on anyone's memory.

#### Acceptance Criteria

1. THE `README.md` file SHALL hold run notes that state how to install, start the development server, run `npm run check`, run `npm run build`, run `npm run start` and open the app, and that state the start state, how to open the Director_Panel (`Alt+Shift+D` and `/director`), where the Demo_Pack is and how to use "Reset session".
2. THE `README.md` file SHALL keep its existing scripts list and its statement that the project has no test runner, and SHALL pass `npm run format:check`.
3. WHEN the final `npm run check` runs, THE Check_Script SHALL pass with no warning that the team has not accepted in writing.
4. WHEN the final `npm run build` runs, THE Build SHALL finish with no error and prerender the nine routes of Requirement 12.1.
5. WHEN `npm run start` serves the production build, THE App SHALL serve each of the nine routes of Requirement 12.1 and SHALL serve the not-found page for `/dev/chart-check`.
6. WHEN `npm run dev` serves the app, THE App SHALL serve the nine routes of Requirement 12.1 and the development route `/dev/chart-check`, which makes ten routes.
7. WHEN a browser profile with no stored data opens `/`, THE App SHALL show the Mars transit scenario, the astronaut Aria and Mission_Day 9, as Requirement 13.15 defines.
8. WHILE the app runs in a browser, THE App SHALL send no network request to any domain other than its own origin, with the Reading_List links as the only exception and only after the user activates a link, as the Manual_Checklist check 14 verifies in the network panel of the browser.
9. THE App SHALL load no web font, no script, no style sheet and no image from another domain.
10. WHEN the final delivery is built, THE seven original feature folders of `src/features/` SHALL hold no `.gitkeep` file, and THE five new feature folders SHALL hold none either, because each folder holds real files.
11. THE developer SHALL deliver and verify the Mars transit path with Manual_Checklist checks 1 to 11 before verifying the ISS path, and the ISS path before the lunar path.
12. IF scope must be reduced, THEN THE developer SHALL defer lunar-specific polish first, then ISS-specific polish, and SHALL keep the Mars transit path complete, as the PROJECT.md section 18 risk note states.
13. WHEN the 3-minute demo is played through the Demo_Pack with "Next segment" from the first Demo_Segment, THE App SHALL show the caption of each of the six Demo_Segments in order in the Caption_Bar, with the scenario, focus astronaut and first Mission_Day of each Demo_Segment applied, and THE Manual_Checklist checks 5, 6, 7 and 9 SHALL pass on the segments for plan steps 4, 5, 6 and 7 (fatigue pattern, personal baseline, escalation with a solar particle event, ISS switch).
14. WHEN the app is delivered, THE App SHALL contain no placeholder text, no "TODO" and no lorem ipsum in a rendered page, and THE foundation placeholder at `/` SHALL be replaced by the dashboard, as Requirement 12.7 defines.
15. THE App SHALL show the decision-support notice in the footer of every page and in the notice section of the about page when it is delivered, as PROJECT.md R13 and section 2.3 require.

## Open Questions and Minimal Readings

PROJECT.md and the approved design are silent or ambiguous on the points below. Each row states the minimal reading used in the requirements above. The team can change a reading without changing the rest of the spec. Rows 1 to 4 record the layer-rule decisions that the user approved with no change. Rows 5 to 16 carry the design defaults FD-5 to FD-16 that are reading choices. Rows 17 to 19 carry the housekeeping items FD-17 to FD-19. Rows 20 to 38 record points that this requirements phase had to settle.

| #   | Question                                                                                                                                                                                                                    | Minimal reading used                                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | FD-1: `structure.md` lets `src/store` use only `src/domain`, but the stores must hold a scenario and injected events.                                                                                                      | The stores hold plain data and an Edit_Log. The Session_Provider replays the log with `injectEvent`, `switchEnvironment` and `switchCrew`. Stored event payloads are checked with a Zod parse before use (Requirements 13, 14).                                                                                                                          |
| 2   | FD-2: `structure.md` lets `src/app` use `src/data`, but not `src/features`, and features need the catalog and the content.                                                                                                 | One Composition_Root, `src/app/app-providers.tsx`, imports the data and passes it as props. Features read it through hooks. Content types and schemas live in `src/domain/content/` (Requirements 9, 12, 40).                                                                                                                                           |
| 3   | FD-3: `structure.md` lists seven feature folders. The shell, session, dashboard, director and about have none.                                                                                                              | Five folders are added: `session`, `shell`, `dashboard`, `director`, `about`. A feature imports another feature only through its `index.ts`, with no cycle (Requirements 12.8, 40.5, 40.6).                                                                                                                                                             |
| 4   | FD-4: chart band, radiation figures, escalation summary, check-in overlay, streaks and message timing need logic that no finished layer provides.                                                                           | New pure files are added in `src/domain/` and `src/simulation/`. No existing file is edited (Requirements 1 to 8).                                                                                                                                                                                                                                      |
| 5   | FD-5: PROJECT.md does not say how time moves.                                                                                                                                                                               | Time moves by user action only: "Next day", "Previous day" and the director slider. There is no timer that changes the day. Days are numbered as the Engine numbers them, from 0 (Requirement 17).                                                                                                                                                      |
| 6   | FD-6: PROJECT.md says "2 to 3 measurements" and gives no list.                                                                                                                                                              | Three measurement steps (resting heart rate, blood pressure, mood) and one optional symptom step. A saved Entry replaces the simulated value for that day. There is no safety-flag input, because self-harm screening needs a team ethics discussion first (Requirements 23 to 26).                                                                     |
| 7   | FD-7: PROJECT.md does not say what survives a reload.                                                                                                                                                                       | Session, Entries, Engagement and Escalation persist under versioned keys and are Zod-validated on read. The UI_Store does not persist. "Reset session" clears all of it (Requirement 45).                                                                                                                                                              |
| 8   | FD-8: "Environment switcher" (section 4) and "switching environment at runtime" (R19) can mean two things.                                                                                                                  | The shell switcher loads the library scenario of the chosen environment and clears the Edit_Log. The director applies `switchEnvironment` to the current scenario and keeps its events. The director section says so in text (Requirements 17.3, 37.5, 37.6).                                                                                         |
| 9   | FD-9: R14 says the "unverified" badge shows in development builds only. Flag C values must never look like fact in a production build.                                                                                      | The badge shows when `NODE_ENV` is not `production`. In every build a flag C value carries a "Draft value" marker, and the About page says no threshold has a source yet (Requirement 43).                                                                                                                                                              |
| 10  | FD-10: "Hidden" director panel (section 4) has no defined way to open it.                                                                                                                                                   | `Alt+Shift+D` opens an overlay on any page, ignored while typing in a field, plus the unlinked route `/director`. "Hidden" means not in navigation. It is not a security feature (Requirement 36).                                                                                                                                                      |
| 11  | FD-11: PROJECT.md gives Mars delays of 3 to 22 minutes and no way to show them in a 3-minute demo. ISS has no delay figure. Reply timing and blackout behaviour are not given.                                              | A link clock runs at a time-scale from data (proposed default 120 link-seconds per real second). "Skip to next stage" jumps it. ISS uses a fixed demo delay from data. The reply is due after two one-way delays. A queued message starts when the link is available. A blackout does not stop a message already transmitting (Requirements 7, 18, 31, 32). |
| 12  | FD-12: PROJECT.md says "streaks and a crew-level adherence goal" and gives no rules.                                                                                                                                        | A day counts when all daily tasks are done. The streak ends today, or yesterday if today is open. The crew goal is the share of crew members who met today's goal against a target from data. Streaks are derived, never stored. Teammates are entered by selecting them, or by the seeded "Simulate teammates" action (Requirements 6, 8, 35).         |
| 13  | FD-13: PROJECT.md gives no start state.                                                                                                                                                                                     | Mars transit, Aria, Mission_Day 9, so charts have history and the first demo segment starts calm (Requirements 13.15, 49.7).                                                                                                                                                                                                                           |
| 14  | FD-14: The director presets need event values. `co2Spike` and `commsBlackout` appear in no shipped scenario.                                                                                                                | Preset values are copied from the shipped scenarios. `co2Spike` and `commsBlackout` are proposed defaults and carry a Draft_Marker (Requirements 9.8, 37.15).                                                                                                                                                                                            |
| 15  | FD-15: The body map needs a place for immune, mental and sleep, which have no precise anatomical place, and for vision, which has no indicator.                                                                              | A stylised figure with six regions at conventional positions, recorded in a comment. A list of the same six regions sits beside it. Vision shows "No data yet" until a vision symptom is reported (Requirement 20).                                                                                                                                      |
| 16  | FD-16: Several optional features are in the PROJECT.md stretch list or unmentioned.                                                                                                                                         | Out of scope: dark-mode toggle, translations, autoplay of the demo, PDF export, camera input, PWA and per-environment countermeasure availability. The countermeasure content has an optional `environments` field so the last can be added without a schema change.                                                                                  |
| 17  | FD-17: The workflow supplied the same `specId` that other specs use.                                                                                                                                                        | The `.config.kiro` of this spec keeps the supplied value. The team may want a unique id.                                                                                                                                                                                                                                                                |
| 18  | FD-18: PROJECT.md section 4 lists unit tests as in scope, and the user decided there is no test runner.                                                                                                                     | No test runner, test script, test package or test file. The compiler, Zod, Lint, Build, the documented searches and the Manual_Checklist stand in (Requirement 48).                                                                                                                                                                                     |
| 19  | FD-19: The shadcn CLI could add a component that needs a package which is not installed.                                                                                                                                    | The CLI adds component files only. If a component needs another package, the developer stops and asks (Requirements 11.8, 11.9, 48.3).                                                                                                                                                                                                                  |
| 20  | PROJECT.md section 11.5 says the director can "switch environment or crew". The design lets "Remove" drop an injected event, but the Base_Scenario events are not in the Edit_Log.                                          | "Remove" lists and removes injected events only. Events of the Base_Scenario are not listed, because they belong to the scenario file (Requirement 37.16).                                                                                                                                                                                              |
| 21  | The design says a failed edit "does not take effect" but does not say whether it enters the Edit_Log.                                                                                                                       | The director applies an edit to the replayed scenario first and appends it only if the simulation returns no problem. A stored edit that later fails on replay stays in the log and raises a Notice (Requirements 13.4, 37.9, 37.18).                                                                                                                  |
| 22  | The design says "Go to segment" loads the scenario and focus astronaut but not what happens to the Edit_Log, Entries or messages.                                                                                           | The Edit_Log is cleared (a new Base_Scenario clears it). Entries, completions and messages are keyed by scenario and are kept (Requirements 14.5, 38.3, 45.12).                                                                                                                                                                                         |
| 23  | The design says demo segments are played "by the presenter". It does not say what "Leave demo" does to the session.                                                                                                         | "Leave demo" hides the Caption_Bar and leaves scenario, astronaut and day as they are (Requirement 38.8).                                                                                                                                                                                                                                               |
| 24  | The design says `Alt+Shift+D` but not which key value to match. On some keyboard layouts the character produced by Alt+Shift+D is not "D".                                                                                  | The match uses the physical key (`event.code` equal to `KeyD`) with Alt and Shift and no Ctrl or Meta (Requirement 36.2).                                                                                                                                                                                                                               |
| 25  | The design says "Reset session" clears everything but not whether the page reloads, or what happens to unsaved UI state.                                                                                                    | Reset happens in place with no reload. It removes the four stored keys, applies the start state and resets the UI_Store. A confirmation dialog guards it (Requirements 38.15, 45.8).                                                                                                                                                                     |
| 26  | The design names a storage key idea ("versioned keys") but no format.                                                                                                                                                       | `health-companion.<store>.v<N>`, with the Zustand `version` option equal to N (Requirement 45.2).                                                                                                                                                                                                                                                       |
| 27  | The About page must count clusters with no source "with the existing verification helpers", but the existing helper covers indicators only (`findUnverifiedIndicators`). No helper exists for clusters.                    | One new pure file, `src/domain/indicators/cluster-verification.ts`, mirrors `findUnverifiedIndicators` for clusters. It edits no existing file (Requirements 1.1, 1.3, 39.7).                                                                                                                                                                           |
| 28  | The About page lists "known sources". Nothing in the repo has a source, and `approvedSourceIds` is empty.                                                                                                                   | The sources section shows "No sources have been supplied yet" while every `sources` array is empty. If a source exists later it is listed once. The NASA reading list is labelled "Reading list, not citations" (Requirement 39.9 to 39.11).                                                                                                           |
| 29  | The design says the dev-only `/dev/chart-check` route is "unchanged", but its error boundary is a local class in `chart-check.tsx`, and Requirement 11.6 said the shared boundary is "promoted" from there.                 | The shared `ChartErrorBoundary` is a new file in `src/components/`. The dev page keeps its own copy and stays unedited. Requirement 11.6 was reworded for this reason.                                                                                                                                                                                   |
| 30  | The design says `error.tsx` at the app root keeps the shell and footer. An `error.tsx` at the root renders inside the root layout, so it cannot catch an error thrown by the root layout or the shell themselves.          | Not confirmed in the installed Next.js docs. The requirements cover errors in route components only (Requirement 46.5). A `global-error.tsx` for layout errors is not in the approved design, so it is left out. The team can ask for it.                                                                                                              |
| 31  | The design's manual check 14 says no network request goes to another domain. The About page links to external NASA pages.                                                                                                   | Links make no request until the user activates them. The check applies to requests the app makes by itself (Requirements 39.12, 49.8).                                                                                                                                                                                                                  |
| 32  | The production build omits `/dev/chart-check` through `pageExtensions`. A production `npm run start` serves a not-found page for it.                                                                                        | Delivery is checked as nine routes in the build output, plus the dev route in `npm run dev` (Requirements 48.10, 49.5, 49.6).                                                                                                                                                                                                                            |
| 33  | The Introduction calls the result "ten routes", and Requirement 12.1 lists nine page files plus the existing dev route.                                                                                                     | Ten routes counts the dev route. Production has nine (Requirements 12.1, 48.10).                                                                                                                                                                                                                                                                        |
| 34  | The design lists the layer rules and says nothing enforces them in `src/store`, `src/features`, `src/components` or `src/app`. The `.prettierignore` also excludes `.kiro`, so this spec is not format-checked.            | The documented Import_Search and Search_Check commands cover the layer rules. No ESLint rule is added or edited (Requirements 40, 48.8).                                                                                                                                                                                                                 |
| 35  | The design gives the WCAG-style needs (44 px targets, 320 px, 200% zoom) but no contrast target or test method.                                                                                                             | Contrast relies on the existing theme token pairs, with no new colour. Targets, width and zoom are checked in the Manual_Checklist (Requirements 47.12 to 47.16).                                                                                                                                                                                       |
| 36  | The design says the Live_Region announces "status changes" without a list.                                                                                                                                                  | It announces day change, environment change, new finding, new Notice, message stage change and demo caption, each once (Requirement 47.10).                                                                                                                                                                                                             |
| 37  | The design says README run notes are part of delivery without content.                                                                                                                                                      | The README keeps its scripts list and gains run notes for install, run, check, build, start, start state, the director and "Reset session" (Requirement 49.1).                                                                                                                                                                                           |
| 38  | The design says the app evaluates up to four crew members per state change and flags runtime cost as "not confirmed".                                                                                                       | No performance number is required. If the manual check shows lag, the design fallback (evaluate only the selected astronaut) is allowed as a task-level change.                                                                                                                                                                                         |
| 39  | The design says the director time section can "jump to a preset day" but gives no list of days.                                                                                                                              | Jump buttons cover the first day, the last day and each day on which the current scenario holds an event, so the presenter can reach each storyline moment without knowing the day numbers (Requirement 37.3).                                                                                                                                         |
