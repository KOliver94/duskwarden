# Duskwarden

A private Game Master companion for in-person Town of Salem–style games. It guides the GM through every night and day step, records hidden information, resolves night outcomes, and survives reloads and app kills. Offline-first PWA, phone portrait first, Hungarian UI.

The design lives in [docs/design.md](docs/design.md), the implementation plans in [docs/plan.md](docs/plan.md) and [docs/plan-voting-alerts.md](docs/plan-voting-alerts.md).

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm build` | Type-check and production build (with service worker and icons) |
| `pnpm preview` | Serve the production build |
| `pnpm test` | Engine, storage and store unit tests (Vitest) |
| `pnpm e2e` | End-to-end tests against a production build (Playwright) |
| `pnpm lint` | oxlint |
| `pnpm format` | Prettier |
| `pnpm deploy:cloudflare` | Build and deploy to Cloudflare |

## Deploying

Hosted on Cloudflare Workers static assets (`wrangler.jsonc` serves `dist`). Workers Builds deploys `main` on every push, with build command `pnpm run build` and deploy command `pnpm exec wrangler deploy`. To deploy by hand, log in once with `pnpm exec wrangler login`, then run `pnpm deploy:cloudflare`. `public/_headers` keeps `index.html`, the manifest and the service worker revalidated, so a new version is picked up on the next visit.
