/**
 * Project-specific ESLint blocks (design section 5, blocks 3 to 7).
 *
 * `eslint.config.mjs` spreads this array between the Next.js rule sets and
 * `eslint-config-prettier`. Order matters: for the same rule ID on the same
 * file, a later block replaces the options of an earlier block. Block 5 comes
 * after block 4 so that `src/domain/**` and `src/simulation/**` get the larger
 * `no-restricted-properties` list.
 */
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';

import noLiteralColors from './eslint-rules/no-literal-colors.mjs';
import noUnjustifiedStyle from './eslint-rules/no-unjustified-style.mjs';

const SRC_FILES = ['src/**/*.{ts,tsx}'];
const FRAMEWORK_FREE_FILES = [
  'src/domain/**/*.{ts,tsx}',
  'src/simulation/**/*.{ts,tsx}',
];

const FRAMEWORK_FREE_REASON =
  'src/domain and src/simulation must stay framework-free (D4)';

const MATH_RANDOM_MESSAGE =
  'Math.random is not allowed outside src/lib: it breaks seeded, deterministic simulation. Use a seeded random generator in src/lib instead.';

const LAYER_MATH_RANDOM_MESSAGE =
  'Math.random is not allowed in src/domain or src/simulation: it breaks seeded, deterministic simulation. Use a seeded random generator passed in from src/lib instead.';

const DATE_NOW_MESSAGE = `Date.now is not allowed in src/domain or src/simulation: it makes results depend on the wall clock. Pass the time in as an argument instead.`;

/**
 * Message for a restricted import. Names the rule (no-restricted-imports) and
 * the reason (D4), as required by the design.
 * @param {string} what
 */
const importMessage = (what) =>
  `no-restricted-imports: ${what} is not allowed here, because ${FRAMEWORK_FREE_REASON}. Move UI code to src/components, src/features or src/app.`;

/** @type {import('eslint').Linter.Config[]} */
export const projectRules = [
  // 3. No explicit `any` in annotations, type arguments and assertions.
  {
    name: 'project/no-explicit-any',
    files: SRC_FILES,
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // 4. Seeded randomness: no Math.random outside src/lib.
  {
    name: 'project/no-math-random-outside-lib',
    files: SRC_FILES,
    ignores: ['src/lib/**'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: MATH_RANDOM_MESSAGE },
      ],
    },
  },

  // 5. Framework-free layers.
  {
    name: 'project/framework-free-layers',
    files: FRAMEWORK_FREE_FILES,
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: LAYER_MATH_RANDOM_MESSAGE,
        },
        { object: 'Date', property: 'now', message: DATE_NOW_MESSAGE },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: importMessage('"react"') },
            { name: 'react-dom', message: importMessage('"react-dom"') },
            { name: 'next', message: importMessage('"next"') },
          ],
          patterns: [
            {
              group: ['react/*', 'react-dom/*', 'next/*'],
              message: importMessage('importing from react, react-dom or next'),
            },
            {
              // Alias form (@/components, ...) and relative form (../components, ...).
              group: [
                '@/components',
                '@/components/**',
                '@/features',
                '@/features/**',
                '@/app',
                '@/app/**',
                '@/store',
                '@/store/**',
                '**/components',
                '**/components/**',
                '**/features',
                '**/features/**',
                '**/app',
                '**/app/**',
                '**/store',
                '**/store/**',
              ],
              message: importMessage(
                'importing a UI layer (components, features, app or store)',
              ),
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "VariableDeclarator[init.type='Identifier'][init.name='Math'] > ObjectPattern.id > Property:matches([key.name='random'], [key.value='random'])",
          message: LAYER_MATH_RANDOM_MESSAGE,
        },
        {
          selector:
            "AssignmentExpression[right.type='Identifier'][right.name='Math'] > ObjectPattern.left > Property:matches([key.name='random'], [key.value='random'])",
          message: LAYER_MATH_RANDOM_MESSAGE,
        },
        {
          selector:
            "VariableDeclarator[init.type='Identifier'][init.name='Date'] > ObjectPattern.id > Property:matches([key.name='now'], [key.value='now'])",
          message: DATE_NOW_MESSAGE,
        },
        {
          selector:
            "AssignmentExpression[right.type='Identifier'][right.name='Date'] > ObjectPattern.left > Property:matches([key.name='now'], [key.value='now'])",
          message: DATE_NOW_MESSAGE,
        },
      ],
    },
  },

  // 6. Colours and styles (local plugin).
  {
    name: 'project/colours-and-styles',
    files: SRC_FILES,
    plugins: {
      local: {
        rules: {
          'no-literal-colors': noLiteralColors,
          'no-unjustified-style': noUnjustifiedStyle,
        },
      },
    },
    rules: {
      'local/no-literal-colors': 'error',
      'local/no-unjustified-style': 'error',
    },
  },

  // 7. Tailwind class check against the classes registered in globals.css.
  //    The design names `no-unregistered-classes`; in eslint-plugin-better-tailwindcss
  //    4.x that rule is called `no-unknown-classes`.
  {
    name: 'project/tailwind-classes',
    files: ['src/**/*.tsx'],
    plugins: {
      'better-tailwindcss': betterTailwindcss,
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: 'src/app/globals.css',
      },
    },
    rules: {
      'better-tailwindcss/no-unknown-classes': 'error',
    },
  },
];
