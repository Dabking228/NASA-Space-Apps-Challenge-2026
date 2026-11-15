---
inclusion: always
---

# Product: Astronaut Health Companion

Working title: "Health Companion". Built for the NASA Space Apps Challenge 2026.

## Source of truth and honesty

- `docs/PROJECT.md` is the source of truth for every product, scope and technical decision.
- If a chat message conflicts with `docs/PROJECT.md`, stop and ask the user which one applies before making any change based on either.
- All thresholds are draft values written from background knowledge, not from sources. Each carries a verification flag (A, B or C).
- Flag A: standard clinical reference, likely correct, still needs a cited source.
- Flag B: team heuristic or convention, document the rationale.
- Flag C: space-specific value written from memory. Never present a flag C value as fact in any user-facing text or code comment. Do not use it until it is verified against NASA or agency documents.
- Do not invent thresholds, indicator values or sources. A `sources` array stays empty until the team supplies citations, and an empty array means unverified.

## Purpose and challenge

Build a visual tool that helps astronauts assess their own health during space missions and gives guidance on treatments and health improvements.

- The challenge names five NASA Human Research Program hazards: radiation, isolation and confinement, distance from Earth, gravity fields, and hostile closed environments.
- The tool answers: which measurements can be done in space, why each exam is needed, how hazards affect indicators, when to escalate to the crew or ground flight surgeons, and which actions prevent critical conditions.
- The real theme is medical autonomy. On long missions (Mars especially) communication is delayed or interrupted, evacuation is impossible, and the crew medical officer is not necessarily a physician. The tool helps a non-expert measure, interpret, decide and act without live help from Earth.

## Product concept

A baseline-aware, explainable health companion with a hazard-linked body map. It covers the ISS, the lunar surface and Mars transit through configuration, not separate code.

### Core loop

Measure, compare to personal baseline, classify, explain, act, escalate if needed.

1. Measure: a guided daily check-in plus simulated passive data (wearable, sleep).
2. Compare: judge each reading against this astronaut's own baseline, not population norms.
3. Classify: every indicator and every body system gets a tier (green, yellow, orange, red).
4. Explain: every status shows the reason (evidence), a confidence level and the threshold source.
5. Act: recommended countermeasures and guided steps.
6. Escalate: a one-tap structured summary for flight surgeons, with simulated delay and a queued reply (store-and-forward).

### What makes it stand out

- Personal baselines instead of Earth norms.
- Every alert says why and what to do next.
- Confidence is displayed. The tool admits uncertainty instead of over-diagnosing.
- Multi-signal cluster detection: several mild changes combine into one meaningful finding.
- Hazard-linked body map: the user sees why each system is at risk.
- One scenario engine for ISS, lunar surface and Mars transit.
- Decision logic runs entirely client-side, which fits the "no contact with Earth" situation.

### Tiers

| Tier   | Meaning         | Tool behaviour                                  |
| ------ | --------------- | ----------------------------------------------- |
| Green  | Normal for you  | Routine tasks only                              |
| Yellow | Drifting        | Self-management guidance, watch trend           |
| Orange | Concerning      | Guided assessment, prepare message to ground    |
| Red    | Act now         | Immediate steps, urgent escalation              |

Status never relies on colour alone. Every tier has a colour, an icon and a text label.

## Scope

### In scope (MVP)

- Dashboard with a clickable SVG body map (colour, icon and label status).
- Guided daily check-in flows with instructions for non-experts.
- Trend charts with a baseline band.
- Rules engine: hard limits, baseline deviation, cluster rules, confidence.
- Alerts page with reason, confidence, action and source.
- Escalation summary with simulated ground delay and a queued reply.
- Environment switcher (ISS, lunar, Mars).
- Seeded scenario simulator with three storylines and four crew profiles.
- Hidden director panel to scrub time and inject events for the live demo.
- Countermeasures with light gamification (streaks, crew goal).

### Out of scope

- Real diagnosis, real ML, real device or wearable integration.
- Backend, database, authentication.
- Offline or PWA support (decision D5).
- Camera-based measurement (stretch goal only).

### Stretch goals (only if time remains)

- Camera heart rate, voice-based mood signals.
- PWA support.
- Printable or exportable flight-surgeon report.
- Self-harm screening flow (needs a deliberate team ethics discussion first).

## Positioning (must appear in the UI)

This is decision support, not a diagnostic device. It uses synthetic data and draft thresholds. The notice appears in the footer of every page and on the about page.
