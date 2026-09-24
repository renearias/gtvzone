import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Tests run against the sources of sibling packages, no build needed.
const src = (pkg: string) => fileURLToPath(new URL(`./packages/${pkg}/src/index.ts`, import.meta.url))
const alias = {
  '@arxis/gtvzone-core': src('core'),
  '@arxis/gtvzone-dom': src('dom')
}

export default defineConfig({
  test: {
    projects: [
      { resolve: { alias }, test: { name: 'core', root: 'packages/core', environment: 'node' } },
      { resolve: { alias }, test: { name: 'dom', root: 'packages/dom', environment: 'jsdom' } },
      { resolve: { alias }, test: { name: 'react', root: 'packages/react', environment: 'jsdom' } },
      {
        resolve: { alias },
        test: { name: 'angular', root: 'packages/angular', environment: 'jsdom', setupFiles: ['src/test-setup.ts'] }
      }
    ]
  }
})
