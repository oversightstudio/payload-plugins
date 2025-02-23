import { defineConfig } from 'tsup'

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
})
