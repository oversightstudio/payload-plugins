import { defineConfig } from 'tsup'

export default defineConfig({
  external: ['next', 'next/image.js', 'react', 'tsup', 'typescript'],
  entry: {
    index: 'src/index.ts',
    'next/index': 'src/next/index.tsx',
  },
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
