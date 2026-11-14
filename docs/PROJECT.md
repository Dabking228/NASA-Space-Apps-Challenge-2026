# Astronaut Health Companion: Project Document

**Event:** NASA Space Apps Challenge 2026
**Challenge:** Create Health Monitoring Software for Astronauts on Space Missions
**Status:** Planning complete, development not started
**Last updated:** 15 Nov 2026
**Project name:** TBD (working title: "Health Companion")

---

## 0. How to use this document

- **Teammates:** read sections 1 to 5 for the idea and decisions, section 17 for what you must verify.
- **Kiro / coding agent:** this is the source of truth. Section 15 explains how to split it into steering files and specs. When this document and a chat message disagree, ask; do not guess.
- **Update rule:** any change of decision goes into the Decision Log (section 3) with a date.

**Important caveat:** all thresholds and space-specific numbers in this document are **drafts written from background knowledge, not from sources**. Each carries a verification flag (A, B, C, see section 6). Nothing flagged C may be presented as fact until verified.

---

## 1. The challenge in brief

Build a **visual tool that helps astronauts assess their own health** during space missions and gives **guidance on treatments and health improvements**.

From the brief:

- NASA HRP's five hazards: **radiation, isolation and confinement, distance from Earth, gravity fields, hostile closed environments**.
- Possible indicators: blood pressure, heart rate, blood sugar, body temperature, sleep hours, mood. Any health indicator is allowed (including images).
- Input can be anything: keyboard, clicks, camera.
- Suggested ideas (optional): clickable human body figure, gamification, dynamic charts, colour coding, prompts to take measurements, support for different environments (spacecraft, station, rover, planetary base), simple instructions for non-expert users.
- Questions the solution should answer: which measurements can be done in space, why each exam is needed, how hazards affect indicators, when to escalate to the crew or ground flight surgeons, what actions prevent critical conditions.

**What the challenge is really about:** *medical autonomy.* On long missions (Mars especially) communication is delayed or interrupted, evacuation is impossible, and the crew medical officer is not necessarily a physician. The tool must help a non-expert **measure, interpret, decide, and act** without live help from Earth.

Resources (read these first):

- NASA HRP hazards: https://www.nasa.gov/hrp/hazards/
- NASA HRP risks: https://www.nasa.gov/hrp/risks/
- Ongoing HRP research: https://www.nasa.gov/hrp/ongoing-hrp-research/
- CSA, radiation monitoring: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- CSA, why science in space: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- Intro video: https://www.youtube.com/watch?v=RERG3gEmdC8

---

## 2. Product concept

**A baseline-aware, explainable health companion with a hazard-linked body map.** It works for ISS, lunar surface, and Mars transit environments.

### 2.1 Core loop

**Measure → compare to personal baseline → classify → explain → act → escalate (if needed)**

1. **Measure:** a guided ~2 minute daily check-in plus simulated passive data (wearable, sleep).
2. **Compare:** each reading is judged against *this astronaut's* baseline, not population norms. Normal ranges shift in space (fluid shifts, disrupted circadian rhythm), so personal baselines are more meaningful.
3. **Classify:** every indicator and every body system gets a tier (green, yellow, orange, red).
4. **Explain:** every status shows the reason (evidence), a confidence level, and the threshold source.
5. **Act:** recommended countermeasures and guided steps.
6. **Escalate:** a one-tap structured summary for flight surgeons, with simulated delay and a queued reply (store-and-forward).

### 2.2 What makes it stand out

1. Personal baselines instead of Earth norms.
2. Every alert says **why** and **what to do next**.
3. **Confidence** is displayed; the tool admits uncertainty instead of over-diagnosing.
4. Multi-signal **cluster detection** (several mild changes combined into one meaningful finding).
5. Hazard-linked body map: the user sees *why* each system is at risk.
6. One scenario engine covering **ISS, lunar surface, and Mars transit** through configuration, not separate code.
7. Decision logic runs entirely client-side, so the architecture is compatible with "no contact with Earth".

### 2.3 Positioning (must appear in the UI)

This is **decision support, not a diagnostic device.** It uses synthetic data and draft thresholds. Show this in the footer and in the about page.

---

## 3. Decision log

| # | Decision | Reason |
|---|---|---|
| D1 | Build a **web app prototype with simulated data** | A prototype only needs to show the functionality and idea |
| D2 | Use **Next.js (App Router) + TypeScript** | Team preference; good shadcn/ui support; easy Vercel hosting |
| D3 | **No hand-written CSS.** Tailwind utilities + shadcn/ui components only | Team requirement for clean, readable UI code |
| D4 | Keep **health logic framework-free** (`domain/`, `simulation/`) | Testable, keeps UI thin, supports the "runs without Earth" claim |
| D5 | **No offline/PWA functionality** (no service worker, no Serwist, no manifest) | Not required by the brief; costs time that judges will not see. Can be added later as an isolated task |
| D6 | Keep the **simulated ground link** (delay, blackout, queued reply) | It is a storyline feature demonstrating the distance hazard, not a networking feature |
| D7 | Rule-based, **explainable** engine; **no ML** | More defensible and explainable than a trained model on synthetic data |
| D8 | Support **all three environments** (ISS, Lunar, Mars) via config objects | Cheap because environments are data; shows breadth |
| D9 | Simulation data is **organised into groups** (engine, crew, environments, events, scenarios, demo packs) | Clean organisation and reusability |
| D10 | Every threshold carries a **verification flag** and a `sources` array | Forces honest sourcing; unverified values are visible in the UI during development |
| D11 | Thresholds are **drafted first, then verified manually** by the team | Drafts are from memory and must not be trusted |

---

## 4. Scope

### In scope (MVP)

- Dashboard with clickable SVG body map, colour + icon + label status
- Guided daily check-in flows (2 to 3 measurements with instructions)
- Trend charts with baseline band
- Rules engine: hard limits, baseline deviation, cluster rules, confidence
- Alerts page with reason, confidence, action, source
- Escalation summary with simulated ground delay and queued reply
- Environment switcher (ISS, Lunar, Mars)
- Seeded scenario simulator with three storylines, four crew profiles
- Director panel (hidden) to scrub time and inject events for the live demo
- Countermeasures with light gamification (streaks, crew goal)
- Unit tests for the domain layer

### Out of scope

- Real diagnosis, real ML, real device or wearable integration
- Backend, database, authentication
- Offline/PWA (see D5)
- Camera-based measurement (stretch goal only)

### Stretch goals (only if time remains)

- Camera heart rate (rPPG), voice-based mood signals
- PWA support
- Printable or exportable flight-surgeon report (PDF)
- Self-harm screening bypass flow (needs a deliberate team ethics discussion first)

---

## 5. Requirements (draft, for Kiro specs)

IDs are stable so tasks can reference them.

**Indicators and engine**

- **R1** The system SHALL define each indicator in a data file with id, unit, hard limits, deviation settings, verification flag, and a `sources` array.
- **R2** The system SHALL compute a personal baseline (mean and SD) per astronaut per indicator, seeded from pre-flight data and adapted with a 14-day rolling window.
- **R3** The system SHALL freeze baseline adaptation while any indicator for that astronaut is orange or red.
- **R4** The system SHALL classify each indicator reading as green, yellow, orange, or red using hard limits first, then baseline deviation.
- **R5** The system SHALL detect cluster patterns (section 7) and raise a single finding with combined evidence.
- **R6** Every finding SHALL include reason, confidence (high, medium, low), recommended action, and threshold source.
- **R7** Confidence SHALL decrease when data is missing, a measurement is marked poor quality, or only one signal supports a finding.

**UI**

- **R8** The dashboard SHALL show a clickable body map whose region colours are computed from underlying indicators.
- **R9** Status SHALL never rely on colour alone; each tier has an icon and a text label.
- **R10** Clicking a body region SHALL open a panel with function, current status, threatening hazards, trend, and actions.
- **R11** The check-in flow SHALL give step-by-step instructions for each measurement, written for non-experts.
- **R12** Trend charts SHALL show the reading history with the personal baseline band.
- **R13** The UI SHALL display the "decision support, not diagnosis" notice.
- **R14** Indicators with an empty `sources` array SHALL show an "unverified" badge in development builds.

**Escalation**

- **R15** The system SHALL generate a structured summary (findings, trends, context, actions taken) for flight surgeons.
- **R16** The simulated ground link SHALL apply the environment's delay and blackout rules, queue the summary, and deliver a scripted reply after the delay.

**Simulation**

- **R17** The simulator SHALL be deterministic given a seed (no `Math.random()`).
- **R18** Scenarios SHALL be declarative data composed of crew, environment, and events.
- **R19** The director panel SHALL allow scrubbing time, injecting events, and switching environment and crew at runtime.

**Engagement**

- **R20** The system SHALL track countermeasure completion, streaks, and a crew-level adherence goal.

---

## 6. Thresholds (DRAFT, UNVERIFIED)

### 6.1 Verification flags

| Flag | Meaning | Rule |
|---|---|---|
| **A** | Standard clinical reference value, likely correct | Still cite a source and confirm |
| **B** | Team heuristic or convention | Document the rationale; it is a design decision |
| **C** | Space-specific, written from memory | **Do not use or present until verified against NASA/agency documents** |

### 6.2 Engine-wide rules

| Rule | Value | Flag |
|---|---|---|
| Yellow | ≥2 SD from personal baseline, with a minimum absolute change floor per indicator | B |
| Orange | ≥3 SD, or yellow persisting 2+ days, or a hard limit | B |
| Red | Hard red limit, or specified symptom combination | B |
| Baseline window | 14-day rolling, frozen while orange/red | B |
| Hard limits | Absolute; ignore baseline | A / B |

### 6.3 Vitals (resting, guided protocol)

| Indicator | Earth reference | Orange | Red | Flag |
|---|---|---|---|---|
| Heart rate (bpm) | 60 to 100 | >110 or <45 | >130 or <40, or any value with chest pain or fainting | A / B |
| Blood pressure (mmHg) | <120/80 | ≥140/90 or systolic <90 | ≥180 systolic or ≥120 diastolic, or systolic <80 with symptoms | A; **C** for in-flight expectations |
| Temperature (°C) | 36.1 to 37.2 | ≥38.0 or <35.5 | ≥39.0 or <35.0 | A / B (depends on method) |
| SpO₂ (%) | ≥95 | <92 | <90 | A; **C** for reduced-pressure cabins |
| Fasting glucose (mg/dL) | 70 to 99 | ≥126 or <70 | <54 or >300 | A / B (optional, on-demand indicator) |

### 6.4 Sleep and behavioural health

| Indicator | Reference | Orange | Red | Flag |
|---|---|---|---|---|
| Sleep (h/night) | 7 to 9 | <6 h for 3 nights in a row | <4 h in one night, or <5 h for 5 nights in a row | B; **C** (ISS crews reportedly average about 6 h) |
| Daily mood (1 to 5) | Personal baseline | ≤2 for 3 days in a row | 1 plus any safety flag | B |
| WHO-5 wellbeing (0 to 100, weekly) | ≥50 | <50 | ≤28 | A |
| Reaction time (PVT-B median) | Baseline only | ≥+25% vs baseline on 2 consecutive tests | n/a | B; **C** (lapse definitions) |

### 6.5 Nutrition and musculoskeletal

| Indicator | Reference | Orange | Red | Flag |
|---|---|---|---|---|
| Body mass change (30 days) | Baseline | ≥5% loss | ≥10% loss | A |
| Energy intake (% of plan) | ≥90% | <70% for 3 days | n/a | B; **C** |
| Exercise adherence (weekly) | Mission plan (ISS is roughly 2 h/day, 6 days/week) | <50% of target for 2 weeks | n/a | B; **C** |

### 6.6 Radiation

| Indicator | Rule | Flag |
|---|---|---|
| Career effective dose | Compare to NASA career limit (memory says **600 mSv**). Orange if projected mission dose ≥80% of remaining allowance; red if projected to exceed it | **C** |
| Dose rate vs environment background | Orange if >5× background, sustained. Red if >20×, or on a solar particle event alert (shelter flow) | B; **C** |
| Background rates (for simulation) | ISS about 0.3 to 0.7 mSv/day; Mars transit about 1.8; lunar surface about 1.3 | **C** |

### 6.7 Habitat environment

| Indicator | Rule | Flag |
|---|---|---|
| Cabin CO₂ (mmHg) | Earth about 0.3. ISS typically a few mmHg. Judge against habitat baseline; orange about 5, red about 10 (placeholders) | **C** (least reliable memory) |

### 6.8 Example indicator definition (enforces the flag in code)

```ts
export const restingHeartRate: IndicatorDefinition = {
  id: 'resting-hr',
  unit: 'bpm',
  hardLimits: { orange: { high: 110, low: 45 }, red: { high: 130, low: 40 } },
  deviation: { yellowSd: 2, orangeSd: 3, minAbsoluteChange: 5 },
  verification: 'B',
  sources: [], // empty = unverified; UI shows a badge; lint check fails before submission
};
```

---

## 7. Cluster rules (multi-signal patterns)

| Cluster | Trigger | Result |
|---|---|---|
| Fatigue and stress | Sleep, mood, and resting HR all yellow or worse within 5 days (worsening reaction time adds confidence) | Orange |
| Possible infection | Elevated temperature, HR rise, and a reported symptom (cough, sore throat) | Orange |
| Under-fuelling or dehydration | Weight loss, low intake, and HR rise | Orange |
| Possible CO₂ exposure | Headache, CO₂ above baseline, and cognitive dip | Check environment first, then orange |
| Vision change | Any new blurring or acuity change: orange. Sudden vision loss: red | Qualitative only (**C**) |

---

## 8. Tiers and status presentation

| Tier | Meaning | Tool behaviour |
|---|---|---|
| Green | Normal for you | Routine tasks only |
| Yellow | Drifting | Self-management guidance, watch trend |
| Orange | Concerning | Guided assessment, prepare message to ground |
| Red | Act now | Immediate steps, urgent escalation |

Rules: always pair colour with an **icon and a text label**. Define status colours as design tokens (Tailwind theme / CSS variables), not inline colour values in components.

---

## 9. Hazard to indicator mapping (basis for the body map)

| Hazard | Health effects | Indicators |
|---|---|---|
| Radiation | Cancer risk, CNS effects, cardiovascular and immune changes | Cumulative dose, SPE alerts, fatigue |
| Isolation and confinement | Mood, sleep, cognition, team conflict | Mood, sleep, WHO-5, reaction time |
| Distance from Earth | Delayed help, supply limits, autonomy stress | Simulated ground link, supply and countermeasure tracking, triage logic |
| Gravity fields | Bone and muscle loss, fluid shift, cardiovascular deconditioning, vision changes (SANS), balance issues | HR, BP, body mass, exercise logs, vision self-check |
| Hostile closed environment | Air quality, noise, nutrition, hygiene, infection | CO₂, intake, temperature, hydration, symptoms |

**Body systems on the map:** cardiovascular, musculoskeletal, vision, immune, mental, sleep. System colour = worst-tier of its contributing indicators, with cluster findings overriding where applicable. (All mappings are C-flag until checked against HRP risk pages.)

---

## 10. Environments

Environments are **configuration objects**, not separate code paths.

| Property | ISS (LEO) | Lunar surface | Mars transit |
|---|---|---|---|
| One-way comms delay | Seconds, with signal gaps | About 1.3 s | Roughly 3 to 22 min, plus conjunction blackouts |
| Gravity | Microgravity | About 0.16 g | Microgravity |
| Radiation background | Lowest (partly shielded) | Higher (no magnetosphere) | Highest, SPE risk |
| Evacuation | Hours to days | Days | Not possible |
| Emphasised hazards | Gravity, vision, CO₂ | Dust, EVA, radiation | Isolation, radiation, autonomy |

All values are **C-flag**.

An environment config controls: hazard weighting, comms delay/blackout rules, background radiation, which checks are emphasised, and which countermeasures are available.

---

## 11. Simulation design

### 11.1 Groups

```
src/simulation/
├── engine/        # seeded RNG, signal generators (baseline + noise + drift), runner
├── crew/          # virtual astronaut profiles
├── environments/  # iss.ts, lunar-surface.ts, mars-transit.ts
├── events/        # reusable event library (SPE, CO2 spike, EVA, equipment outage...)
├── scenarios/     # compose crew + environment + events
│   ├── iss/
│   ├── lunar/
│   └── mars/
└── demo-packs/    # curated playlists for the judges' demo
```

### 11.2 Scenario format (declarative)

```ts
export const marsTransit30d: Scenario = {
  id: 'mars-transit-30d',
  environment: 'mars-transit',
  seed: 2026,
  crew: ['aria', 'kofi'],
  durationDays: 30,
  events: [
    { day: 6, type: 'drift', indicator: 'sleep', perDay: -0.12 },
    { day: 14, type: 'moodDip', depth: 1.5, lengthDays: 5 },
    { day: 21, type: 'solarParticleEvent', severity: 'moderate' },
  ],
};
```

### 11.3 Storylines

| Scenario | Storyline | Features shown |
|---|---|---|
| ISS: early adaptation and vision | Week 1 fluid shift (HR/BP changes, headaches). Treadmill outage cuts exercise adherence. CO₂ creeps up around day 20 | Environment-adjusted baselines, countermeasure gap, CO₂ cluster |
| Lunar: dust and EVA | 14-day stay with EVA-driven HR spikes, dust-related eye and throat irritation, SPE on day 9 | Shelter flow, symptom checker, short comms delay |
| Mars: the long haul | Sleep declines, mood dips, an SPE, then the fatigue cluster. Escalation queued with delayed ground reply | Baseline drift, cluster detection, store-and-forward |

### 11.4 Crew profiles

Four virtual astronauts with **different baselines**. Include an athlete with resting HR about 48 bpm: a reading of 62 bpm looks normal by Earth norms but is a real deviation for them. This shows the personal-baseline idea at a glance. (Names and exact values are placeholders.)

### 11.5 Demo pack and director panel

- A **3-minute judges' demo** pack stitches segments of the scenarios together.
- A hidden **director panel** lets the presenter scrub time, inject events, and switch environment or crew live.

### 11.6 Simulation rules

- All randomness comes from the **seeded RNG**. No `Math.random()` or `Date.now()` in render or generation paths.
- Generated data is deterministic and reproducible from `scenario.seed`.

---

## 12. Screens and features

| Screen | Contents |
|---|---|
| **Dashboard** | Body map, daily status summary, active findings, next due tasks, environment and day indicator, ground link status |
| **Body region panel** | Function, status, threatening hazards, trend, recommended actions |
| **Check-in** | Guided steps per measurement with instructions, quality flag, result summary |
| **Trends** | Charts with baseline band; filter by indicator and time range |
| **Alerts and findings** | Reason, confidence, action, source, tier history |
| **Escalation** | Generated summary, send (queued), simulated delay, scripted ground reply |
| **Countermeasures** | Daily tasks, streaks, crew goal |
| **Radiation** | Cumulative dose vs limit, dose rate, SPE shelter flow |
| **Director panel** | Hidden demo controls |
| **About** | Decision-support notice, data and threshold disclaimer, sources |

---

## 13. Technical approach

### 13.1 Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui. **No custom CSS files** beyond the generated global tokens file |
| Charts | Recharts |
| State | Zustand |
| Validation | Zod (at data boundaries: scenarios, readings) |
| Tests | Vitest |
| Quality | ESLint, Prettier |
| Hosting | Vercel (or any static-capable host) |

Use current stable versions at scaffold time and check compatibility notes then. Do not add Serwist or any PWA tooling (D5).

### 13.2 Architecture rules

1. `domain/` and `simulation/` are **pure TypeScript with no React or Next.js imports.**
2. UI components are thin: they read state and call domain functions; no health logic inside components.
3. Thresholds, countermeasure content, and instructional text live in **data files**, not components.
4. Simulation and persisted stores are used only in **client components**; no `Math.random()` during render (avoids hydration mismatches).
5. No API routes or server actions are needed. Keep the logic client-side.
6. Feature folders own their components, hooks, and types.

### 13.3 Styling rules (no messy CSS)

- Use Tailwind utility classes and shadcn/ui components.
- Repeated class combinations become shared components in `components/`, not new CSS classes.
- Colours, spacing, and radii come from the theme tokens. Status tier colours are named tokens (e.g. `status-green`, `status-yellow`, `status-orange`, `status-red`).
- The body map is an SVG component; styling it uses Tailwind classes driven by status, not inline style strings.
- No `style={{}}` attributes except for genuinely dynamic values (e.g. chart sizes).

### 13.4 Project structure

```
src/
├── app/                  # Next.js routes, layout, providers
├── domain/               # Pure TypeScript, no React
│   ├── indicators/       # Definitions, units, ranges, sources
│   ├── baseline/         # Baseline and deviation calculation
│   ├── rules/            # Hard limits, clusters, tier classification, confidence
│   ├── environments/     # Environment profile types and shared logic
│   └── types.ts
├── simulation/           # See section 11
├── features/
│   ├── body-map/
│   ├── check-in/
│   ├── trends/
│   ├── alerts/
│   ├── escalation/
│   ├── radiation/
│   └── countermeasures/
├── components/           # Shared UI built on shadcn/ui
├── store/                # Zustand stores
├── data/                 # Cited thresholds, countermeasure and instruction content
└── lib/                  # Utilities
```

### 13.5 Domain types (sketch, refine in the design spec)

```ts
type Tier = 'green' | 'yellow' | 'orange' | 'red';
type Verification = 'A' | 'B' | 'C';
type Confidence = 'high' | 'medium' | 'low';

interface IndicatorDefinition {
  id: string;
  label: string;
  unit: string;
  hardLimits: { orange?: Limit; red?: Limit };
  deviation?: { yellowSd: number; orangeSd: number; minAbsoluteChange: number };
  verification: Verification;
  sources: SourceRef[];          // empty = unverified
  hazards: Hazard[];
  system: BodySystem;
}

interface Finding {
  id: string;
  tier: Tier;
  reason: string;                // evidence in plain language
  confidence: Confidence;
  action: string;
  sourceIds: string[];
  indicators: string[];
  system: BodySystem;
}
```

### 13.6 Testing

- Unit-test the domain layer: baseline maths, tier classification, hard limits taking precedence, baseline freeze, each cluster rule, confidence reduction.
- Test that the simulator is deterministic (same seed gives identical output).
- UI tests are optional for the prototype.

### 13.7 Code conventions

- Strict TypeScript, no `any`.
- Pure functions in the domain layer, with explicit inputs and outputs.
- Small files with a single responsibility; descriptive names.
- Short comments only where the reasoning is not obvious (especially for health rules, cite the source ID).
- Plain-language UI text suitable for non-experts.

---

## 14. Build order

1. Scaffold project, tooling, Tailwind, shadcn/ui, Vitest, lint config.
2. Domain types and indicator definitions (with verification flags).
3. Baseline and rules engine, with tests.
4. Simulation engine (seeded RNG, generators, scenario runner), crew, environments, events, scenarios.
5. App shell, stores, and dashboard with body map.
6. Check-in flows and trend charts.
7. Alerts, explanations, and escalation summary with simulated ground link.
8. Radiation and countermeasures features.
9. Director panel and demo pack.
10. Polish, accessibility pass, about page, final verification of thresholds.

---

## 15. Working with Kiro

Kiro's spec-driven workflow uses steering files and per-feature specs. Check Kiro's current documentation for exact file locations and formats; the mapping below is the intent.

### 15.1 Steering files (persistent project context)

| File | Content (from this document) |
|---|---|
| `product.md` | Sections 1, 2, 4 (purpose, concept, scope, positioning notice) |
| `tech.md` | Section 13.1 to 13.3, 13.7 (stack, architecture rules, styling rules, conventions) |
| `structure.md` | Section 13.4 (folder layout) and simulation groups from section 11.1 |

Keep this `PROJECT.md` in the repo (e.g. `docs/PROJECT.md`) as the master reference.

### 15.2 Suggested specs (one per feature, in this order)

1. `foundation`: scaffold, tooling, design tokens (build step 1)
2. `domain-engine`: indicators, baseline, rules, clusters, confidence (R1 to R7)
3. `simulation`: engine, crew, environments, events, scenarios (R17 to R19)
4. `dashboard-body-map`: (R8 to R10, R13, R14)
5. `check-in-trends`: (R11, R12)
6. `alerts-escalation`: (R6, R15, R16)
7. `countermeasures-radiation`: (R20 and radiation flows)
8. `demo-director`: director panel and judges' demo pack

### 15.3 Instructions for the agent

- Do not add offline/PWA tooling, a backend, or ML.
- Do not write custom CSS; use Tailwind and shadcn/ui only.
- Do not put health logic in React components.
- Do not invent thresholds or sources. Use the values in section 6 as-is, keep their flags, and leave `sources` empty until the team supplies citations.
- Do not use `Math.random()`; use the seeded RNG.
- Write tests alongside every domain function.
- If a requirement is ambiguous, ask before implementing.

---

## 16. Demo plan (3 minutes, draft)

1. **(20 s)** Problem: long missions, delayed comms, non-expert crew medical officer.
2. **(30 s)** Dashboard and body map; click a region to see function, hazards, status.
3. **(30 s)** Guided check-in; show instructions for a non-expert.
4. **(40 s)** Mars scenario: sleep and mood decline, then **fatigue cluster** raised with reason and confidence.
5. **(20 s)** Personal baseline: show the athlete crew member where "normal by Earth norms" is a real deviation.
6. **(30 s)** Escalation: queued summary, simulated delay, scripted ground reply.
7. **(20 s)** Switch environment (ISS or Lunar) via the director panel; hazard emphasis changes.
8. **(10 s)** Close: decision support, personal baselines, explainability, and sources.

---

## 17. Team verification checklist (manual)

Priority order. For each item: find the source, record it in the indicator's `sources`, update the value if needed, and change the flag.

- [ ] **1. Radiation:** NASA career and short-term dose limits (NASA-STD-3001, Vol. 1) and background dose rates for ISS, lunar surface, and Mars transit
- [ ] **2. Cabin CO₂:** NASA spacecraft maximum allowable concentration documents; typical ISS levels
- [ ] **3. In-flight BP and HR expectations:** HRP evidence reports and published in-flight studies
- [ ] **4. ISS sleep averages:** published ISS sleep studies
- [ ] **5. PVT-B lapse definitions:** published brief-PVT validation
- [ ] **6. SpO₂ and cabin pressure/oxygen mix** for each habitat
- [ ] **7. Hazard to body-system mapping** against HRP risk pages
- [ ] **8. Environment table (section 10):** comms delays, gravity, evacuation times
- [ ] **9. All A-flag values** against ACC/AHA (BP), ADA (glucose), WHO (WHO-5), and standard HR/temperature references
- [ ] **10. Exercise and energy intake targets** against ISS exercise and nutrition requirements

Suggested places to search: NASA Technical Reports Server, HRP evidence reports and Standards documents, NASA Life Sciences Data Archive, Open Science Data Repository, published Twins Study and HERA analog results.

**Before submission:** every indicator used in the demo should have at least one source, or be shown clearly as a team heuristic (B).

---

## 18. Risks and open questions

| Item | Note |
|---|---|
| Unverified thresholds | Biggest credibility risk; mitigated by flags, `sources` array, and the checklist above |
| Scope creep | Three environments, three scenarios, and four crew is ambitious; if time is short, finish **Mars** fully first, then ISS, then Lunar |
| Hydration mismatch | Keep simulation and stores in client components; seeded RNG only |
| Self-harm screening | Not in MVP; if added, it must bypass normal flow and go straight to private escalation. Team ethics discussion required first |
| Project name and branding | TBD |
| Team roles | TBD (suggested split: domain/engine, simulation, UI/body map, content and sourcing, demo and presentation) |
| Camera or voice input | Stretch only; decide after core features are done |
