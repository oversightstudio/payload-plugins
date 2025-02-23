import { defineConfig } from 'tsup'
import { preserveDirectivesPlugin } from 'esbuild-plugin-preserve-directives'

export default defineConfig({
  entry: ['src/index.ts', 'src/fields/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  outDir: 'dist',
  splitting: false,
  clean: true,
  esbuildOptions(options) {
    options.loader = {
      '.tsx': 'tsx',
      '.ts': 'ts',
      '.scss': 'copy',
    }
  },
  esbuildPlugins: [
    preserveDirectivesPlugin({
      directives: ['use client', 'use strict'],
      include: /\.(js|ts|jsx|tsx)$/,
      exclude: /node_modules/,
    }),
  ],
})
