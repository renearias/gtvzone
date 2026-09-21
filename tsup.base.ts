import type { Options } from 'tsup'

/** Shared build: ESM + CJS + types, downleveled for Tizen 5 (Chromium 63) and webOS 5 (Chromium 68). */
export const baseConfig: Options = {
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'chrome63'
}
