# syntax=docker/dockerfile:1

# Fresh Guess — production image (Coolify / any Docker host).
#
# Serves the built TanStack Start app with `vite preview` (which runs the SSR
# server + server functions) and bundles Chromium so the runtime Rotten Tomatoes
# Algolia-key scrape works. If you'd rather not ship a browser, set the
# RT_ALGOLIA_* env vars in Coolify — the app then never launches Playwright.
#
# In Coolify: Build Pack = Dockerfile, and set the app's exposed port to 3000.

FROM node:22-bookworm-slim

# Don't auto-download browsers on `pnpm install`; we install Chromium explicitly.
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    PORT=3000 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN corepack enable

WORKDIR /app

# 1) Dependencies — cached unless the manifests change. devDependencies are
#    required because `vite build` and `vite preview` are dev tooling.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 2) Chromium + its OS libraries, matched to the installed Playwright version.
RUN pnpm exec playwright install --with-deps chromium

# 3) App source + production build (-> dist/).
COPY . .
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 3000

# Lets Coolify detect when the app is live (Node 22 has a global fetch()).
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# `start` => vite preview --host 0.0.0.0 --port ${PORT:-3000}
CMD ["pnpm", "start"]
