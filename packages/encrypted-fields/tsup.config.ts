import { defineConfig } from 'tsup'

export default defineConfig({
  external: ['tsup', 'typescript'],
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  outDir: 'dist',
  splitting: false,
  clean: true,
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' }
  },
  esbuildOptions(options) {
    options.loader = {
      '.ts': 'ts',
    }
  },
})
