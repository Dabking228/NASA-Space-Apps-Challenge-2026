# Health Companion

Health Companion is a visual tool built for the NASA Space Apps Challenge 2026 challenge "Create Health Monitoring Software for Astronauts on Space Missions". It helps astronauts assess their own health during missions and supports medical autonomy when communication with Earth is delayed or interrupted. The core loop is to measure, compare to a personal baseline, classify, explain, act and escalate. The project is built with Next.js and TypeScript. See `docs/PROJECT.md` for the full project document.

## Scripts

- `dev`: Start the Next.js development server with `next dev`.
- `build`: Run `lint` first, then create the production build with `next build`.
- `start`: Serve the production build with `next start`. Run `build` first.
- `lint`: Run ESLint on the whole project with `eslint .`.
- `format`: Rewrite every file to Prettier formatting with `prettier --write .`.
- `format:check`: Report files that differ from Prettier formatting without changing them, using `prettier --check .`.
- `typecheck`: Run the TypeScript compiler without emitting files, using `tsc --noEmit`.
- `check`: Run `lint`, `format:check` and `typecheck` in order and stop at the first failure.

The project has no test runner.
