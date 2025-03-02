import { defineConfig } from 'tsup'

export default defineConfig({
  external: ['tsup', 'typescript'],
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  outDir: 'dist',
  splitting: false,
  clean: true,
  esbuildOptions(options) {
    options.loader = {
      '.ts': 'ts',
    }
  },
})
