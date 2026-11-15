import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

import { projectRules } from './eslint.rules.mjs';

// Block order matters in flat config (design section 5):
// 1 ignores, 2 Next.js rule sets, 3 to 7 project rules, 8 Prettier last.
const eslintConfig = defineConfig([
  // 1. Ignores. This replaces the eslint-config-next defaults.
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'next-env.d.ts',
    'coverage/**',
  ]),
  // 2. Next.js, React, hooks and TypeScript rule sets.
  ...nextVitals,
  ...nextTs,
  // 3 to 7. No `any`, Math.random, framework-free layers, colours and styles,
  //         Tailwind class check.
  ...projectRules,
  // 8. Turn off style rules that conflict with Prettier.
  prettier,
]);

export default eslintConfig;
