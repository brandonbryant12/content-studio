import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineProject, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagesRoot = path.resolve(__dirname, '../../packages');

export default mergeConfig(
  baseConfig,
  defineProject({
    test: {
      name: 'web',
      include: ['src/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      setupFiles: ['./src/test-utils/setup.ts'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Monorepo package aliases
        '@repo/auth/client': `${packagesRoot}/auth/src/client/index.ts`,
        '@repo/auth/policy': `${packagesRoot}/auth/src/policy/index.ts`,
        '@repo/auth/server': `${packagesRoot}/auth/src/server/index.ts`,
        '@repo/auth': `${packagesRoot}/auth/src/index.ts`,
        '@repo/api/client': `${packagesRoot}/api/src/client/index.ts`,
        '@repo/api/contracts': `${packagesRoot}/api/src/contracts/index.ts`,
        '@repo/api': `${packagesRoot}/api/src/index.ts`,
        // UI components - must be before the main @repo/ui alias
        '@repo/ui/components/spinner': `${packagesRoot}/ui/src/components/spinner.tsx`,
        '@repo/ui/components/button': `${packagesRoot}/ui/src/components/button.tsx`,
        '@repo/ui/components/dialog': `${packagesRoot}/ui/src/components/dialog.tsx`,
        '@repo/ui/components/sonner': `${packagesRoot}/ui/src/components/sonner.tsx`,
        '@repo/ui/components/slider': `${packagesRoot}/ui/src/components/slider.tsx`,
        '@repo/ui/components/select': `${packagesRoot}/ui/src/components/select.tsx`,
        '@repo/ui/components/input': `${packagesRoot}/ui/src/components/input.tsx`,
        '@repo/ui/components/label': `${packagesRoot}/ui/src/components/label.tsx`,
        '@repo/ui/components/textarea': `${packagesRoot}/ui/src/components/textarea.tsx`,
        '@repo/ui/components/tabs': `${packagesRoot}/ui/src/components/tabs.tsx`,
        '@repo/ui/components/checkbox': `${packagesRoot}/ui/src/components/checkbox.tsx`,
        '@repo/ui/components/badge': `${packagesRoot}/ui/src/components/badge.tsx`,
        '@repo/ui/components/avatar': `${packagesRoot}/ui/src/components/avatar.tsx`,
        '@repo/ui/components/tooltip': `${packagesRoot}/ui/src/components/tooltip.tsx`,
        '@repo/ui/components/dropdown-menu': `${packagesRoot}/ui/src/components/dropdown-menu.tsx`,
        '@repo/ui/components/empty-state': `${packagesRoot}/ui/src/components/empty-state.tsx`,
        '@repo/ui/lib/utils': `${packagesRoot}/ui/src/lib/utils.ts`,
        '@repo/ui': `${packagesRoot}/ui/src/index.ts`,
      },
    },
  }),
);
