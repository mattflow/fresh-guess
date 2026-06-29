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
- **Scores hidden by default** while picking — never auto-sent to the client or stored in `localStorage`. There is an **opt-in "Peek scores" toggle** (per turn, default off) that fetches scores on demand to show them on results + a running total. Each new turn resets to hidden.
- **Single round** + "Play again" (keep players) / "New game" (reset).
- **Persistence:** an in-progress game survives a refresh via `localStorage` (key `fresh-guess:game`).
- **Theming:** light/dark, **defaulting to system** preference, with a top-right toggle cycling system → light → dark (persisted in `localStorage` key `fg-theme`; pre-paint script in `__root.tsx` avoids flash).

### How movie scores are sourced (no RT API)
Rotten Tomatoes has no public API. RT's own site embeds Algolia search credentials in a runtime global, `window.RottenTomatoes.thirdParty.algoliaSearch` → `{ aId, sId }` (Algolia **app id** + **search-only key**). We read them server-side with **Playwright**, then query Algolia.

Discovered facts (via `scripts/probe-rt.mjs`):
- Algolia index: **`content_rt`** (holds both `movie` and `tv`; we filter to `type === 'movie'`).
- Tomatometer field: **`rottenTomatoes.criticsScore`** (audience is `rottenTomatoes.audienceScore`).
- Useful hit fields: `objectID`, `title`, `releaseYear`, `posterImageUrl`, `type`.
- Last-known-good public keys (already exposed in RT's HTML, search-only): app `79FRDP12PN`. RT **rotates** these, so we cache with a 6h TTL and re-scrape on Algolia auth failure.

### Architecture
```
Client (/ route — the whole app is the game)    Server (server functions → server-only module)
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
- `src/components/game/` — `GameProvider` (reducer + localStorage), `PlayerSetup`, `PassDevice` (hand-off gate so the next player can't see prior picks), `PickingScreen` (incl. the Peek toggle + running total), `MovieSearch` (debounced `useServerFn` search; `ScoreBadge` for peeked scores), `RevealScreen` (fetches scores, computes closest-to-160, tie-aware), `useScores.ts` (lazy on-demand score fetch/cache shared by Peek).
- `src/components/ThemeToggle.tsx` — system/light/dark toggle.
- Routes: `src/routes/index.tsx` is the game (mounts `GameProvider` + `ThemeToggle`, switches on phase). `__root.tsx` is a minimal HTML shell with the pre-paint theme script — no header/footer/nav. There are no other routes.
- `scripts/` — dev tooling, not part of the app runtime: `probe-rt.mjs` (re-discover keys/index/fields), `e2e.mjs` (full browser smoke test against a running dev server), `shots.mjs` (screenshots).

### Styling
The original starter's demo design system (ocean theme, `demo-*`/`island-*` classes, old `Header`/`Footer`, landing + about pages) was **removed** — the app is just the game. `src/styles.css` is small and purpose-built: Tailwind v4 import + a handful of `fg-*` classes (`fg-card`, `fg-btn` + `-primary`/`-ghost`/`-danger`, `fg-input`, `fg-pill`, `fg-kicker`, `fg-rise`) and two theme-independent accent tokens (`--color-splat` RT-red, `--color-fresh` green).

**Light/dark theming** is driven by `--fg-*` CSS variables defined three times in `styles.css`: `:root` (light default), `@media (prefers-color-scheme: dark) :root:not([data-theme=light])` (system dark), and `:root[data-theme=dark]` (manual dark). Components reference `var(--fg-muted)`, `var(--fg-danger)`, etc. — **don't hardcode `text-zinc-*`/hex colors** in components or they won't adapt. `ThemeToggle` (`src/components/ThemeToggle.tsx`) sets/removes `data-theme` and persists the choice.

### Hidden-score integrity (important when editing)
- `searchMoviesFn` must **never** return scores. Scores only come from `revealScoresFn` — called on the reveal screen, and on demand by the opt-in **Peek** feature (`useScores` hook, `src/components/game/useScores.ts`).
- `SelectedMovie` (persisted to `localStorage`) carries no score. Don't add one. Peeked scores live only in transient React state.

### Vite config note
`playwright` (and its optional native `fsevents`) are excluded from Vite's client dep optimizer and externalized for SSR in `vite.config.ts` — otherwise Vite tries to bundle the native `.node` binary and dev fails.

### Stack & integrations

- **Framework:** TanStack Start (React 19) — file-based router (`mode: file-router`).
- **Language:** TypeScript.
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite`. Custom dark theme in `src/styles.css` (see **Styling** above). The starter's demo design system was removed.
- **Build/dev:** Vite 8 (default CLI toolchain — not changed).
- **Devtools:** the `@tanstack/devtools-vite` Vite plugin is still wired, but the `<TanStackDevtools>` UI was removed from `__root.tsx` when the chrome was stripped. `react-devtools`/`@tailwindcss/typography`/`lucide-react` remain installed but unused — safe to prune.
- **Testing:** Vitest 4 + Testing Library + jsdom (no game tests yet; `scripts/e2e.mjs` is the smoke test).
- **Package manager:** pnpm.

Added for the game: **`playwright`** (server-side RT key scrape), **`algoliasearch`** v5 (movie search), **`zod`** v4 (server-fn validators). No auth/DB/ORM — game state is entirely client-side (pass-and-play).

### Project structure

```
src/
  router.tsx          # getRouter() factory + Register module augmentation
  routeTree.gen.ts    # AUTO-GENERATED by tsr — do not edit by hand
  styles.css          # Tailwind import + minimal fg-* game theme (dark)
  routes/
    __root.tsx        # minimal HTML shell (HeadContent, Scripts) — no chrome
    index.tsx         # / — mounts GameProvider, the entire game
  lib/
    game-types.ts     # shared types + TARGET/PICKS constants
    game.functions.ts # createServerFn wrappers (search / reveal)
    rt-algolia.server.ts  # server-only: Playwright key scrape + Algolia
  components/
    ThemeToggle.tsx    # system/light/dark toggle
    game/              # GameProvider, PlayerSetup, PassDevice, PickingScreen,
                       #   MovieSearch, RevealScreen, useScores
scripts/              # probe-rt.mjs, e2e.mjs, shots.mjs (dev tooling)
public/               # static assets
vite.config.ts        # plugins + playwright externalization
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
- `node scripts/verify-features.mjs` — checks the Peek-scores toggle and light/dark theming (incl. system default + persistence).
- `node scripts/probe-rt.mjs` — re-discover RT Algolia keys/index/fields if RT changes.

### Next steps / ideas
- `pnpm dev` → http://localhost:3000 (mobile viewport recommended).
- Possible enhancements: configurable target/round count, multi-round leaderboard, share-results screen, exclude already-picked movies across players, multi-device rooms (would need a backend).
