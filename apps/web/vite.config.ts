import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import tanstackRouter from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react-swc';
import { Schema } from 'effect';
import { defineConfig } from 'vite';

/**
 * Fixes issue with "__dirname is not defined in ES module scope"
 * https://flaviocopes.com/fix-dirname-not-defined-es-module-scope
 *
 * This is only necessary when using vite with `--configLoader runner`.
 * We use this option to allow for importing TS files from monorepos.
 * https://vite.dev/config/#configuring-vite
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envSchema = Schema.Struct({
  /**
   * Since vite is only used during development, we can assume the structure
   * will resemble a URL such as: http://localhost:8085.
   * This will then be used to set the vite dev server's host and port.
   */
  PUBLIC_WEB_URL: Schema.optionalWith(
    Schema.String.pipe(
      Schema.filter(
        (s) => {
          try {
            new URL(s);
            return true;
          } catch {
            return false;
          }
        },
        { message: () => 'Must be a valid URL' },
      ),
    ),
    { default: () => 'http://localhost:8085' },
  ),

  /**
   * Set this if you want to run or deploy your app at a base URL. This is
   * usually required for deploying a repository to Github/Gitlab pages.
   */
  PUBLIC_BASE_PATH: Schema.optionalWith(
    Schema.String.pipe(
      Schema.filter((s) => s.startsWith('/'), {
        message: () => 'Must start with /',
      }),
    ),
    { default: () => '/' },
  ),
});

const env = Schema.decodeUnknownSync(envSchema)(process.env);
const webUrl = new URL(env.PUBLIC_WEB_URL);
const host = webUrl.hostname;
const port = parseInt(webUrl.port, 10);

export default defineConfig({
  plugins: [
    tanstackRouter({
      routeToken: 'layout',
      autoCodeSplitting: true,
    }),
    tailwindcss(),
    react(),
  ],
  base: env.PUBLIC_BASE_PATH,
  envPrefix: 'PUBLIC_',
  server: {
    host,
    port,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Vite's current bundler path does not honor Rollup's
        // `onlyExplicitManualChunks`, so we keep chunking explicit by
        // constraining this function to coarse vendor buckets.
        // Keep chunking coarse-grained. The previous per-package strategy
        // created many tiny/empty chunks in production builds.
        // `onlyExplicitManualChunks` is not yet supported by this Vite/Rollup stack.
        // Keep explicit boundaries by returning chunk names only for known package groups.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('/node_modules/react/')) return 'vendor-react';
          if (id.includes('/node_modules/react-dom/')) return 'vendor-react';

          if (id.includes('/node_modules/@tanstack/')) {
            return 'vendor-tanstack';
          }

          if (
            id.includes('/node_modules/react-markdown/') ||
            id.includes('/node_modules/react-syntax-highlighter/') ||
            id.includes('/node_modules/remark-') ||
            id.includes('/node_modules/rehype-') ||
            id.includes('/node_modules/micromark') ||
            id.includes('/node_modules/mdast-') ||
            id.includes('/node_modules/hast-') ||
            id.includes('/node_modules/unified/') ||
            id.includes('/node_modules/vfile')
          ) {
            return 'vendor-markdown';
          }

          if (id.includes('/node_modules/effect/')) return 'vendor-effect';
          if (id.includes('/node_modules/@radix-ui/')) return 'vendor-radix';

          return 'vendor';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
