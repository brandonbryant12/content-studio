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
            "CallExpression[callee.object.name='Effect'][callee.property.name='catchAll'] > ArrowFunctionExpression > CallExpression[callee.object.name='Effect'][callee.property.name='void']",
          message:
            'Do not swallow failures with Effect.catchAll(() => Effect.void) in production use-cases.',
        },
        {
          selector:
            "CallExpression[callee.object.name='Effect'][callee.property.name='catchAll'] > ArrowFunctionExpression > CallExpression[callee.object.name='Effect'][callee.property.name='succeed'][arguments.length=1][arguments.0.value=null]",
          message:
            'Do not swallow failures with Effect.catchAll(() => Effect.succeed(null)) in production use-cases.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: [
      'src/**/__tests__/**',
      'src/**/*.test.ts',
      'src/prompt-registry/**',
      'src/testing/**',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='generate'] ObjectExpression > Property[key.name='system'][value.type=/^(Literal|TemplateLiteral)$/]",
          message:
            'Use prompt registry definitions instead of inline production system prompts.',
        },
        {
          selector:
            "CallExpression[callee.property.name='generate'] ObjectExpression > Property[key.name='prompt'][value.type=/^(Literal|TemplateLiteral)$/]",
          message:
            'Use prompt registry definitions or derived prompt variables instead of inline production prompt literals.',
        },
        {
          selector:
            "CallExpression[callee.property.name='streamText'] ObjectExpression > Property[key.name='system'][value.type=/^(Literal|TemplateLiteral)$/]",
          message:
            'Use prompt registry definitions instead of inline production system prompts.',
        },
        {
          selector:
            "CallExpression[callee.property.name='generateImage'] ObjectExpression > Property[key.name='prompt'][value.type=/^(Literal|TemplateLiteral)$/]",
          message:
            'Use prompt registry definitions or derived prompt variables instead of inline production prompt literals.',
        },
      ],
    },
  },
];
