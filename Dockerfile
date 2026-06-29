# syntax=docker/dockerfile:1

# Fresh Guess — production image (Coolify / any Docker host).
#
# Real production server: TanStack Start is built with the Nitro plugin, which
# emits a self-contained Node server at .output/server/index.mjs (listens on all
# interfaces, honors $PORT). Chromium is included so the runtime Rotten Tomatoes
# Algolia-key scrape works and self-heals when RT rotates keys. To skip the
# browser, set the RT_ALGOLIA_* env vars in Coolify.
#
# In Coolify: Build Pack = Dockerfile, exposed port = 3000.

# ---- build stage: full deps + Nitro build -------------------------------------
FROM node:22-bookworm-slim AS build

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
# -> .output/ (self-contained; Nitro traces playwright into its node_modules)
RUN pnpm build

# ---- runtime stage: just Node + .output + Chromium ----------------------------
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# Chromium + OS libraries, pinned to the project's Playwright version, installed
# to PLAYWRIGHT_BROWSERS_PATH so the traced playwright-core finds it at runtime.
RUN npx --yes playwright@1.61.1 install --with-deps chromium \
    && rm -rf /root/.npm

COPY --from=build /app/.output ./.output

EXPOSE 3000

# Lets Coolify detect when the app is live (Node 22 has a global fetch()).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
