<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

## Project: fresh-guess

**Fresh Guess** — a mobile-first, pass-and-play party game built on **TanStack Start** (React). Players take turns secretly picking 3 movies, trying to make their Rotten Tomatoes **Tomatometer (critics)** scores sum closest to **160**. Scores stay hidden while picking (it's a *guess*); at the end all scores reveal and the closest to 160 wins (ties share the win).

> The repo began as the blank TanStack Start file-router starter (see scaffolding provenance below), then the game was built on top of it. The scaffolding/stack notes in this file remain accurate; the game-specific architecture is documented under **"Fresh Guess game"** below.

### Scaffolding provenance

Created with the TanStack CLI (run in this directory; contents then moved up so the repo root is the app):

```bash
npx @tanstack/cli@latest create my-tanstack-app --agent --package-manager pnpm --tailwind
```

Notes on the command:
- `--tailwind` is deprecated/ignored by the current CLI — Tailwind v4 is always enabled in TanStack Start scaffolds. It is present and configured regardless.
- The CLI requires a project name, so it generated into `my-tanstack-app/`. Its contents (including `.git`) were moved to the repo root and the empty subdir removed, so `fresh-guess/` itself is the app.

Follow-up TanStack Intent commands run after scaffolding:

```bash
npx @tanstack/intent@latest install   # wrote the Skill Loading block at the top of this file
npx @tanstack/intent@latest list      # enumerates available local skills (router, start, devtools, etc.)
```

## Fresh Guess game

### Gameplay decisions (confirmed with the user)
- **Pass-and-play on one device** — no backend room/realtime sync; all game state is client-side.
- **Tomatometer (critics) score** is what counts toward 160 (not audience).
- **Scores hidden until reveal** — the answer is never sent to the client or stored in `localStorage` during picking.
- **Single round** + "Play again" (keep players) / "New game" (reset).
- **Persistence:** an in-progress game survives a refresh via `localStorage` (key `fresh-guess:game`).

### How movie scores are sourced (no RT API)
Rotten Tomatoes has no public API. RT's own site embeds Algolia search credentials in a runtime global, `window.RottenTomatoes.thirdParty.algoliaSearch` → `{ aId, sId }` (Algolia **app id** + **search-only key**). We read them server-side with **Playwright**, then query Algolia.

Discovered facts (via `scripts/probe-rt.mjs`):
- Algolia index: **`content_rt`** (holds both `movie` and `tv`; we filter to `type === 'movie'`).
- Tomatometer field: **`rottenTomatoes.criticsScore`** (audience is `rottenTomatoes.audienceScore`).
- Useful hit fields: `objectID`, `title`, `releaseYear`, `posterImageUrl`, `type`.
- Last-known-good public keys (already exposed in RT's HTML, search-only): app `79FRDP12PN`. RT **rotates** these, so we cache with a 6h TTL and re-scrape on Algolia auth failure.

### Architecture
```
Client (/play route — all phases)              Server (server functions → server-only module)
  GameProvider (useReducer + localStorage)
    PlayerSetup → PickingScreen → RevealScreen
        │ searchMoviesFn (no scores)  ───────▶  rt-algolia.server.ts: searchMovies()
        │ revealScoresFn (scores, reveal only) ▶  rt-algolia.server.ts: getScores()
                                                   └─ getAlgoliaCredentials(): env → cache → Playwright scrape → fallback
```

Key files:
- `src/lib/rt-algolia.server.ts` — **server-only** (`.server.ts` keeps Playwright out of the client bundle). Credential cache + scrape, `searchMovies` (returns movies **without** scores, filtered to those that have a Tomatometer), `getScores` (objectID → criticsScore, reveal only).
- `src/lib/game.functions.ts` — `createServerFn` RPC wrappers (`searchMoviesFn`, `revealScoresFn`) with Zod validators; lazy-`import()` the server-only module inside handlers.
- `src/lib/game-types.ts` — shared client-safe types + `TARGET = 160`, `PICKS_PER_PLAYER = 3`.
- `src/components/game/` — `GameProvider` (reducer + localStorage), `PlayerSetup`, `PassDevice` (hand-off gate so the next player can't see prior picks), `PickingScreen`, `MovieSearch` (debounced `useServerFn` search), `RevealScreen` (fetches scores, computes closest-to-160, tie-aware).
- Routes: `src/routes/play.tsx` (the game), `index.tsx` (landing), `about.tsx` (how-to-play). `Header.tsx` nav updated.
- `scripts/` — dev tooling, not part of the app runtime: `probe-rt.mjs` (re-discover keys/index/fields), `e2e.mjs` (full browser smoke test against a running dev server), `shots.mjs` (screenshots).

### Hidden-score integrity (important when editing)
- `searchMoviesFn` must **never** return scores. Scores only come from `revealScoresFn`, called once on the reveal screen.
- `SelectedMovie` (persisted to `localStorage`) carries no score. Don't add one.

### Vite config note
`playwright` (and its optional native `fsevents`) are excluded from Vite's client dep optimizer and externalized for SSR in `vite.config.ts` — otherwise Vite tries to bundle the native `.node` binary and dev fails.

### Stack & integrations

- **Framework:** TanStack Start (React 19) — file-based router (`mode: file-router`).
- **Language:** TypeScript.
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite` (plus `@tailwindcss/typography`).
- **Build/dev:** Vite 8 (default CLI toolchain — not changed).
- **Devtools:** `@tanstack/react-devtools` + router devtools, wired via `@tanstack/devtools-vite` (stripped from production builds automatically).
- **Testing:** Vitest 4 + Testing Library + jsdom.
- **Icons:** `lucide-react` (available from the starter; current components use inline SVG/emoji).
- **Package manager:** pnpm.

Added for the game: **`playwright`** (server-side RT key scrape), **`algoliasearch`** v5 (movie search), **`zod`** v4 (server-fn validators). No auth/DB/ORM — game state is entirely client-side (pass-and-play).

### Project structure (generated — preserved as-is)

```
src/
  router.tsx          # getRouter() factory + Register module augmentation
  routeTree.gen.ts    # AUTO-GENERATED by tsr — do not edit by hand
  styles.css          # Tailwind entry
  routes/
    __root.tsx        # root document shell (HeadContent, Scripts, Outlet)
    index.tsx         # /
    about.tsx         # /about
  components/         # Header, Footer, ThemeToggle (starter UI)
public/               # static assets
vite.config.ts        # devtools(), tailwindcss(), tanstackStart(), viteReact()
tsr.config.json       # { "target": "react" }
```

### Scripts

```bash
pnpm dev              # vite dev --port 3000
pnpm build            # production build (client + SSR)
pnpm preview          # preview the production build
pnpm test             # vitest run
pnpm generate-routes  # tsr generate (regenerate routeTree.gen.ts)
```

### Environment variables

All **optional** (see `.env.example`). With none set, the app scrapes RT with Playwright at runtime — no config needed for local dev. Set these server-only vars (no `VITE_` prefix — they must not reach the browser) to **skip Playwright entirely**:

| Var | Purpose |
|-----|---------|
| `RT_ALGOLIA_APP_ID` | Algolia application id (skips scrape when set with the key) |
| `RT_ALGOLIA_SEARCH_KEY` | Algolia search-only key |
| `RT_ALGOLIA_INDEX` | Override the movie index (defaults to `content_rt`) |

They're read **inside** the server handler (`getAlgoliaCredentials`), per the execution-model skill, so they stay server-only and edge-safe.

### Deployment

Default Start build produces `dist/client` + `dist/server` and runs as a Node server (`pnpm preview` to test locally).

**Playwright caveat:** the runtime key-scrape needs a real Chromium binary (`npx playwright install chromium`), which most serverless/edge targets (Cloudflare/Vercel edge) don't ship. For those, set the `RT_ALGOLIA_*` env vars above to skip Playwright entirely; or deploy to a Node host that has the browser installed. For target-specific setup, load the `start-core/deployment` skill — no deploy target is configured yet.

### Key architectural decisions

- Repo root *is* the app (CLI subdir flattened) so there's no nested package.
- Kept the default CLI toolchain (Vite) and the generated structure unchanged per the request.
- TanStack Intent skill mappings are the source of truth for library patterns — consult them (see the Skill Loading block above) before architectural or library-specific changes rather than guessing.

### Known gotchas

- `src/routeTree.gen.ts` is generated by `tsr`; never edit manually — run `pnpm generate-routes` after changing routes.
- The deprecated `pnpm.onlyBuiltDependencies` field in `package.json` triggers a harmless warning under pnpm 11; functionally fine.
- Devtools code is auto-removed from production builds by `@tanstack/devtools-vite`.
- **RT key rotation:** the scraped Algolia key rotates; the server caches it 6h and re-scrapes on auth failure. If search suddenly breaks, the page DOM/global path may have changed — re-run `node scripts/probe-rt.mjs` to re-discover keys, index, and fields.
- **Hidden scores:** never return scores from `searchMoviesFn` or persist them to `localStorage` — only `revealScoresFn` exposes scores, at reveal.
- **Playwright + Vite:** must stay excluded/externalized in `vite.config.ts` (native `fsevents` otherwise breaks dev).

### Testing the game
- `node scripts/e2e.mjs` — full browser smoke test (register → pick → pass → reveal → play again + persistence) against a running `pnpm dev`.
- `node scripts/probe-rt.mjs` — re-discover RT Algolia keys/index/fields if RT changes.

### Next steps / ideas
- `pnpm dev` → http://localhost:3000 (mobile viewport recommended).
- Possible enhancements: configurable target/round count, multi-round leaderboard, share-results screen, exclude already-picked movies across players, multi-device rooms (would need a backend).
