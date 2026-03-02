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
        {
          selector:
            "CallExpression[callee.object.name='Effect'][callee.property.name='catchAll'] > ArrowFunctionExpression > CallExpression[callee.object.name='Effect'][callee.property.name='void']",
          message:
            'Do not swallow failures with Effect.catchAll(() => Effect.void) in production use-cases. Use runBestEffortSideEffect(...) for intentional best-effort side effects, otherwise propagate errors.',
        },
        {
          selector:
            "CallExpression[callee.object.name='Effect'][callee.property.name='catchAll'] > ArrowFunctionExpression > CallExpression[callee.object.name='Effect'][callee.property.name='succeed'][arguments.length=1][arguments.0.value=null]",
          message:
            'Do not swallow failures with Effect.catchAll(() => Effect.succeed(null)) in production use-cases. Use explicit error classification and propagation.',
        },
      ],
    },
  },
];
