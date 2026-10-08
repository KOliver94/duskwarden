# Duskwarden

A private Game Master companion for in-person Town of Salem–style games. It guides the GM through every night and day step, records hidden information, resolves night outcomes, and survives reloads and app kills. Offline-first PWA, phone portrait first, Hungarian UI.

The design lives in [docs/design.md](docs/design.md), the implementation plan in [docs/plan.md](docs/plan.md).

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm build` | Type-check and production build (with service worker and icons) |
| `pnpm preview` | Serve the production build |
| `pnpm test` | Engine, storage and store unit tests (Vitest) |
| `pnpm e2e` | End-to-end smoke test against a production build (Playwright) |
| `pnpm lint` | oxlint |
| `pnpm format` | Prettier |

## Deploying

The build is fully static. When it is served from a subpath, such as GitHub Pages at `/<repo>/`, build with `BASE_PATH=/<repo>/ pnpm build`.
