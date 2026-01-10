import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: './src/server.ts',
  format: 'esm',
  noExternal: [/.*/],
  // Mark native modules and CJS-only packages as external
  external: [/\.node$/, 'ssh2', 'dockerode', 'docker-modem'],
  platform: 'node',
  unbundle: false,
  outDir: './dist',
  clean: true,
  minify: true,
  sourcemap: true,
  outputOptions: {
    inlineDynamicImports: true,
  },
});
