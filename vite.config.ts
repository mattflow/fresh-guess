import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Playwright is server-only (dynamically imported inside rt-algolia.server.ts).
  // Keep it (and its native fsevents optional dep) out of Vite's client dep
  // optimizer and externalize it for SSR so the native .node binary isn't bundled.
  optimizeDeps: { exclude: ['playwright', 'playwright-core', 'fsevents'] },
  ssr: { external: ['playwright', 'playwright-core', 'fsevents'] },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    // Nitro builds the production Node server -> .output/server/index.mjs
    // (run with `node .output/server/index.mjs`). Keep Playwright external so
    // Nitro traces it as a node_module instead of bundling the native binary.
    nitro({ externals: { external: ['playwright', 'playwright-core', 'fsevents'] } }),
    viteReact(),
  ],
})

export default config
