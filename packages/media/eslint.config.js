import baseConfig, { restrictEnvAccess } from '@repo/eslint-config/base';

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: ['dist/**'],
  },
  ...baseConfig,
  ...restrictEnvAccess,
  {
    files: ['src/**/use-cases/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='queue'][callee.property.name='enqueue']",
          message: 'Use enqueueJob() from shared safety primitives.',
        },
        {
          selector:
            "CallExpression[callee.object.name='queue'][callee.property.name='getJob']",
          message: 'Use getOwnedJobOrNotFound() from shared safety primitives.',
        },
      ],
    },
  },
];
