# Duskwarden Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Duskwarden, an offline-first React PWA that guides a Game Master through an in-person Town of Salem–style game.

**Architecture:** A pure TypeScript engine (`src/domain`) derives every piece of game state from `setup + inputs + cursor`. A thin Zustand store applies GM actions and persists the whole game record to IndexedDB through a coalescing write queue. React screens render derived state; the visible screen is store state, not a URL.

**Tech Stack:** Vite, React, TypeScript (strict), pnpm, Tailwind v4, shadcn/ui, dnd-kit, motion, canvas-confetti, Zustand, idb, vite-plugin-pwa, html-to-image, Vitest + fake-indexeddb, Playwright.

**Spec:** `docs/design.md`

**How code is specified:** Engine, storage and store tasks contain complete tests and implementations. UI tasks contain complete code for every piece with non-obvious logic (dialog sequencing, back guard, wake lock, timers, drag-and-drop, export, PWA) and an exact behavior and copy checklist for straightforward layout JSX. All Hungarian strings a UI task needs are listed in that task.

## Global Constraints

- Code, identifiers and commit messages in English. Every user-visible string in Hungarian, following `docs/design.md` §10 (glossary and rules).
- UI text uses the Hungarian en dash `–`, never `—`. Player names are never inflected; they appear only as labels or subjects. Role names are capitalized as labels and lowercase inside sentences. Articles before role names and ordinals come from `withArticle` / `numberArticle` (Task 2), never hand-written.
- Comments only for what code cannot say: a hidden reason, a constraint, a gotcha. Never restate names, never describe what a component is, never repeat the same comment in several files.
- Commit messages: short imperative subject, body only when the why is not obvious. No `Co-Authored-By` trailer.
- Markdown files: no hard-wrapped lines.
- pnpm, Node 24. Dependencies installed with `pnpm add <name>` (latest stable at install time). TypeScript `strict`.
- `src/domain` is pure: no React, no IndexedDB, no `Date.now()`, no `Math.random()`, no `crypto`. Callers inject ids, time and randomness.
- Prettier: `semi: false`, `singleQuote: true`, `printWidth: 100`.
- Dark theme only. Interactive touch targets at least `h-14` (56 px). Screen content constrained to `max-w-xl`, centered.
- Unit tests are colocated `src/**/*.test.ts` (Vitest). End-to-end tests live in `e2e/` (Playwright).

## Review Focus

1. A closed night is edited so that a later step's stored target is now dead → that later step is flagged, its input is ignored, and Next is blocked until the GM chooses again. Pinned in Task 6 (`invalidates a later choice…`) and Task 7 (`blocks Next on an invalidated step`).
2. A shared role step where some holders have died → narration stays plural, otherwise the table hears that someone died. Pinned in Task 4 (`narrates in plural by role count…`).
3. Browser or hardware back on the game screen → the app stays open and performs in-app Back. Pinned in Task 19 (the `page.goBack()` assertions in the smoke test).
4. Player names that differ only by case, surrounding spaces or accented capitals ("Ödön" / "ödön ") → treated as duplicates. Pinned in Task 3 (`treats case and whitespace variants as duplicates`).
5. A custom role edited or deleted after use → a running game keeps its snapshot, and the saved setup draft drops the deleted role. Pinned in Task 3 (`sanitizeDraft drops unknown roles…`) and Task 10 (`keeps the role snapshot when the library changes`).

## File Structure

```
.gitattributes, .prettierrc.json, .prettierignore, components.json, index.html
vite.config.ts, playwright.config.ts, pwa-assets.config.ts
public/icon.svg
e2e/game.spec.ts
src/main.tsx, src/index.css
src/lib/utils.ts            cn() for shadcn
src/lib/random.ts           crypto-backed random() and newId()
src/lib/exportImage.ts      end screen PNG export/share
src/domain/types.ts         all engine types
src/domain/timeline.ts      phase arithmetic, step ids
src/domain/roles.ts         built-in roles, role predicates, waking order
src/domain/copy.ts          Hungarian text helpers
src/domain/setup.ts         setup draft helpers and validation
src/domain/assign.ts        shuffle, role assignment
src/domain/steps.ts         step list per phase
src/domain/win.ts           win conditions
src/domain/derive.ts        full derivation: options, resolution, day, invalidation
src/domain/navigation.ts    next/back, pending win, alive-at-cursor
src/domain/history.ts       graveyard, narrator log, chronicle, individual winners
src/domain/timer.ts         timer arithmetic
src/domain/fixtures.ts      test-only setup builder
src/storage/db.ts           idb schema and upgrades
src/storage/repo.ts         typed reads/writes, default prefs
src/storage/writeQueue.ts   coalescing serialized writer
src/store/appStore.ts       Zustand store and persistence wiring
src/store/bootstrap.ts      open DB, load state, create store
src/store/hooks.tsx         StoreProvider, useApp, useActions, useGame, useStepTimer
src/ui/primitives/*         shadcn components (generated)
src/ui/components/*         shared app components
src/ui/hooks/*              browser hooks (back guard, wake lock, now)
src/ui/App.tsx
src/ui/screens/HomeScreen.tsx
src/ui/screens/library/*    LibraryScreen, RoleDetailsSheet, RoleEditor
src/ui/screens/setup/*      SetupScreen + one file per page
src/ui/screens/game/*       GameScreen, step cards, sheets
src/ui/screens/end/EndScreen.tsx
```

---

### Task 1: Scaffold and toolchain

**Files:**
- Create: everything from the Vite `react-ts` template, `.gitattributes`, `.gitignore` additions, `.prettierrc.json`, `.prettierignore`, `components.json`, `src/lib/utils.ts`, `src/index.css`, `src/ui/App.tsx`, `src/ui/primitives/*` (generated)
- Modify: `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `package.json`, `src/main.tsx`, `index.html`
- Delete: template demo files (`src/App.tsx`, `src/App.css`, `src/assets/`, `public/vite.svg`)

**Interfaces:**
- Produces: `@/` alias to `src/`; `cn()` from `@/lib/utils`; shadcn primitives under `@/ui/primitives/*` (`button`, `alert-dialog`, `sheet`, `switch`, `input`, `label`, `textarea`, `toggle-group`); Tailwind tokens `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `text-primary`, `bg-primary`, `text-blood`, `border-border`, `font-display`, `font-sans`; scripts `dev`, `build`, `preview`, `lint`, `test`, `format`.

- [ ] **Step 1: Generate the template next to the repo and move it in**

The repo directory is not empty (`.git`, `docs`), so scaffold into a sibling directory. If the CLI offers to install or start the app, decline.

```bash
cd /d/Development/personal
pnpm create vite@latest duskwarden-scaffold --template react-ts
cp -rn duskwarden-scaffold/. duskwarden/
rm -rf duskwarden-scaffold
cd duskwarden
rm -rf src/App.tsx src/App.css src/assets public/vite.svg
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm install
pnpm add tailwindcss @tailwindcss/vite tw-animate-css clsx tailwind-merge class-variance-authority lucide-react @fontsource-variable/cinzel @fontsource-variable/figtree
pnpm add -D @types/node prettier vitest
```

If pnpm reports ignored build scripts, run `pnpm approve-builds` and approve `esbuild` only.

- [ ] **Step 3: Repository hygiene files**

`.gitattributes`:

```
* text=auto eol=lf
*.png binary
*.woff2 binary
```

Append to `.gitignore`:

```
/test-results
/playwright-report
/dev-dist
```

Keep `.claude/launch.json` (created in Step 9) local only:

```bash
echo ".claude/launch.json" >> .git/info/exclude
```

`.prettierrc.json`:

```json
{ "semi": false, "singleQuote": true, "printWidth": 100 }
```

`.prettierignore`:

```
dist
dev-dist
pnpm-lock.yaml
*.md
```

- [ ] **Step 4: Vite, TypeScript and scripts**

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serves the app from /<repo>/; set BASE_PATH there.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: { include: ['src/**/*.test.ts'] },
})
```

In both `tsconfig.json` and `tsconfig.app.json` add to `compilerOptions` (create the object in `tsconfig.json` if missing; shadcn's CLI reads the alias from the root file):

```json
"paths": { "@/*": ["./src/*"] }
```

In `package.json` set the scripts:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint .",
  "test": "vitest run --passWithNoTests",
  "test:watch": "vitest",
  "format": "prettier --write ."
}
```

- [ ] **Step 5: Theme, fonts and shadcn config**

`components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": { "config": "", "css": "src/index.css", "baseColor": "neutral", "cssVariables": true, "prefix": "" },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/ui",
    "ui": "@/ui/primitives",
    "utils": "@/lib/utils",
    "lib": "@/lib",
    "hooks": "@/ui/hooks"
  }
}
```

`src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

`src/index.css`:

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@fontsource-variable/cinzel';
@import '@fontsource-variable/figtree';

@theme inline {
  --font-display: 'Cinzel Variable', serif;
  --font-sans: 'Figtree Variable', system-ui, sans-serif;
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-blood: var(--blood);
  --radius-sm: calc(var(--radius) - 6px);
  --radius-md: calc(var(--radius) - 4px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  color-scheme: dark;
  --radius: 0.9rem;
  --background: oklch(0.16 0.03 285);
  --foreground: oklch(0.93 0.012 265);
  --card: oklch(0.21 0.035 285);
  --card-foreground: var(--foreground);
  --popover: oklch(0.21 0.035 285);
  --popover-foreground: var(--foreground);
  --primary: oklch(0.8 0.14 75);
  --primary-foreground: oklch(0.2 0.04 60);
  --secondary: oklch(0.27 0.04 285);
  --secondary-foreground: var(--foreground);
  --muted: oklch(0.25 0.03 285);
  --muted-foreground: oklch(0.7 0.025 275);
  --accent: oklch(0.3 0.05 285);
  --accent-foreground: var(--foreground);
  --destructive: oklch(0.6 0.2 25);
  --border: oklch(0.33 0.035 285);
  --input: oklch(0.33 0.035 285);
  --ring: oklch(0.8 0.14 75);
  --blood: oklch(0.6 0.2 25);
}

[data-phase='day'] {
  --background: oklch(0.21 0.04 320);
  --card: oklch(0.26 0.045 320);
}

body {
  @apply bg-background text-foreground font-sans antialiased;
  min-height: 100dvh;
  /* Pull-to-refresh would reload the page mid-game. */
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}
```

In `index.html`: set `<html lang="hu">`, `<title>Duskwarden</title>`, `<meta name="theme-color" content="#0f0d1a" />`, `<body style="background:#0f0d1a">` (avoids a white flash before CSS loads), and change the script src to `/src/main.tsx` if the template differs.

- [ ] **Step 6: Generate shadcn primitives**

```bash
pnpm dlx shadcn@latest add button alert-dialog sheet switch input label textarea toggle-group
```

Expected: files under `src/ui/primitives/`. If the CLI asks to overwrite `src/index.css` or `components.json`, decline.

- [ ] **Step 7: Placeholder app**

`src/ui/App.tsx`:

```tsx
export function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-4">
      <h1 className="font-display text-4xl text-primary">Duskwarden</h1>
      <p>Árvíztűrő tükörfúrógép – ŐŰ őű</p>
      <p className="font-display">Árvíztűrő tükörfúrógép – ŐŰ őű</p>
    </main>
  )
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from '@/ui/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 8: Verify tooling**

Run: `pnpm format && pnpm lint && pnpm test && pnpm build`
Expected: all succeed (`vitest` reports no test files and passes).

- [ ] **Step 9: Verify fonts in the browser**

Create `.claude/launch.json`:

```json
{
  "version": "0.0.1",
  "configurations": [{ "name": "dev", "runtimeExecutable": "pnpm", "runtimeArgs": ["dev", "--port", "5173"], "port": 5173 }]
}
```

Start it, open at 375×812, screenshot. Expected: dark indigo background, amber Cinzel title, both pangram lines render ő/ű/Ő/Ű in the intended fonts (no fallback glyphs).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Scaffold Vite React app with Tailwind, shadcn and Vitest"
```

---

### Task 2: Engine types, timeline, roles and Hungarian copy helpers

**Files:**
- Create: `src/domain/types.ts`, `src/domain/timeline.ts`, `src/domain/roles.ts`, `src/domain/copy.ts`, `src/domain/fixtures.ts`
- Test: `src/domain/timeline.test.ts`, `src/domain/roles.test.ts`, `src/domain/copy.test.ts`

**Interfaces:**
- Produces (types.ts): `Faction`, `ActionKind`, `NeutralGoal`, `RoleConstraints`, `RoleDef`, `Player`, `Settings`, `GameSetup`, `Adjustment`, `StepInput`, `Cursor`, `Winner`, `Ending`, `TimerState`, `Game`, `Step`, `ActionStep`, `DisabledReason`.
- Produces (timeline.ts): `isNight(phase): boolean`, `phaseNumber(phase): number`, `stepId(phase, slot): string`, `firstStepId(phase): string`.
- Produces (roles.ts): `BUILT_IN_ROLES: RoleDef[]`, `BUILT_IN_ORDER: string[]`, `rolesById(custom: RoleDef[]): Record<string, RoleDef>`, `isSuspicious(role): boolean`, `isHostile(role): boolean`, `wakingOrder(order: string[], roleIds: string[], roles): string[]`.
- Produces (copy.ts): `lowerFirst`, `upperFirst`, `withArticle(word)`, `numberArticle(n)`, `phaseLabel(phase)`, `phaseWithArticle(phase, accusative?)`, `morningTitle(phase)`, `closeNightTitle(phase)`, `closeNightBody(phase)`, `closeDayTitle(phase)`, `reopenTitle(phase)`, `reopenBody(phase)`, `wakeLine(role, plural)`, `sleepLine(role, plural)`, `dummyLine(role, plural)`, `promptFor(role, plural)`, `defaultPrompt(action, plural)`, `reasonText(reason, action)`, `winnerLabel(winner, roles)`.
- Produces (fixtures.ts, tests only): `ROLES`, `makeSetup(roleIds, settings?)`, `t(targetId)`.

- [ ] **Step 1: Write types**

`src/domain/types.ts`:

```ts
export type Faction = 'town' | 'killers' | 'neutral'
export type ActionKind = 'none' | 'kill' | 'protect' | 'investigate' | 'vest' | 'other'
export type NeutralGoal = 'soloKiller' | 'executed' | 'survive' | 'none'

export interface RoleConstraints {
  canTargetSelf: boolean
  noRepeatTarget: boolean
  selfTargetMax?: number
  maxUses?: number
}

export interface RoleDef {
  id: string
  builtIn: boolean
  name: string
  namePlural: string
  faction: Faction
  neutralGoal?: NeutralGoal
  action: ActionKind
  description: string
  gmHint?: string
  promptOverride?: string
  suspiciousOverride?: boolean
  stepSeconds: number
  constraints: RoleConstraints
}

export interface Player {
  id: string
  name: string
  seat: number
  roleId: string
}

export interface Settings {
  killersKnowEachOther: boolean
  autoEnd: boolean
  discussionMinutes: number | null
  revealRoleOnDeath: boolean
  jesterWinEndsGame: boolean
}

export interface GameSetup {
  players: Player[]
  roles: Record<string, RoleDef>
  nightOrder: string[]
  settings: Settings
}

export interface Adjustment {
  playerId: string
  dead: boolean
}

export type StepInput =
  | { kind: 'target'; targetId: string | null }
  | { kind: 'vest'; use: boolean }
  | { kind: 'tell'; told: string[] }
  | { kind: 'morning'; adjustments: Adjustment[] }
  | { kind: 'execution'; targetId: string | null }

export interface Cursor {
  phase: number
  stepId: string
}

export type Winner = 'town' | 'killers' | 'nobody' | { roleId: string }

export interface Ending {
  winner: Winner
  phase: number
  manual: boolean
}

export interface TimerState {
  startedAt: number | null
  accumulatedMs: number
}

export interface Game {
  schemaVersion: 1
  id: string
  createdAt: number
  updatedAt: number
  setup: GameSetup
  inputs: Record<string, StepInput>
  cursor: Cursor
  timers: Record<string, TimerState>
  ending: Ending | null
}

interface StepBase {
  id: string
  slot: string
  phase: number
}

export type Step =
  | (StepBase & { kind: 'dusk' | 'tell' | 'morning' | 'discussion' | 'execution' })
  | (StepBase & { kind: 'killersMeet'; actorIds: string[] })
  | (StepBase & {
      kind: 'action'
      roleId: string
      actorIds: string[]
      ownerId?: string
      plural: boolean
    })

export type ActionStep = Extract<Step, { kind: 'action' }>

export type DisabledReason = 'dead' | 'self' | 'repeat' | 'selfLimit' | 'exhausted'
```

- [ ] **Step 2: Write failing timeline tests**

`src/domain/timeline.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { firstStepId, isNight, phaseNumber, stepId } from './timeline'

describe('timeline', () => {
  it('alternates nights and days starting with night 1', () => {
    expect([0, 1, 2, 3].map(isNight)).toEqual([true, false, true, false])
    expect([0, 1, 2, 3].map(phaseNumber)).toEqual([1, 1, 2, 2])
  })

  it('builds step ids from phase and slot', () => {
    expect(stepId(0, 'doctor')).toBe('n1:doctor')
    expect(stepId(3, 'execution')).toBe('d2:execution')
    expect(firstStepId(2)).toBe('n2:dusk')
    expect(firstStepId(1)).toBe('d1:morning')
  })
})
```

- [ ] **Step 3: Run to see it fail**

Run: `pnpm vitest run src/domain/timeline.test.ts`
Expected: FAIL, cannot resolve `./timeline`.

- [ ] **Step 4: Implement timeline**

`src/domain/timeline.ts`:

```ts
export const isNight = (phase: number) => phase % 2 === 0

export const phaseNumber = (phase: number) => Math.floor(phase / 2) + 1

export const stepId = (phase: number, slot: string) =>
  `${isNight(phase) ? 'n' : 'd'}${phaseNumber(phase)}:${slot}`

export const firstStepId = (phase: number) => stepId(phase, isNight(phase) ? 'dusk' : 'morning')
```

- [ ] **Step 5: Run to see it pass**

Run: `pnpm vitest run src/domain/timeline.test.ts`
Expected: PASS.

- [ ] **Step 6: Write failing roles tests**

`src/domain/roles.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { BUILT_IN_ROLES, isHostile, isSuspicious, rolesById, wakingOrder } from './roles'
import type { RoleDef } from './types'

const roles = rolesById([])

describe('roles', () => {
  it('ships the agreed built-in set', () => {
    expect(BUILT_IN_ROLES.map((r) => r.id)).toEqual([
      'killer',
      'serialKiller',
      'doctor',
      'detective',
      'villager',
      'jester',
      'survivor',
    ])
  })

  it('derives suspicion from the kill action unless overridden', () => {
    expect(isSuspicious(roles.killer)).toBe(true)
    expect(isSuspicious(roles.serialKiller)).toBe(true)
    expect(isSuspicious(roles.doctor)).toBe(false)
    expect(isSuspicious({ ...roles.killer, suspiciousOverride: false })).toBe(false)
  })

  it('treats killers and solo killers as hostile', () => {
    expect(isHostile(roles.killer)).toBe(true)
    expect(isHostile(roles.serialKiller)).toBe(true)
    expect(isHostile(roles.jester)).toBe(false)
  })

  it('lets custom roles override built-ins with the same id', () => {
    const custom: RoleDef = { ...roles.doctor, id: 'doctor', name: 'Gyógyító', builtIn: false }
    expect(rolesById([custom]).doctor.name).toBe('Gyógyító')
  })

  it('orders waking roles by the night order and appends unknown ones', () => {
    const custom: RoleDef = { ...roles.villager, id: 'witch', action: 'other' }
    const all = { ...roles, witch: custom }
    expect(
      wakingOrder(['doctor', 'killer'], ['villager', 'witch', 'killer', 'doctor'], all),
    ).toEqual(['doctor', 'killer', 'witch'])
  })
})
```

- [ ] **Step 7: Run to see it fail**

Run: `pnpm vitest run src/domain/roles.test.ts`
Expected: FAIL, cannot resolve `./roles`.

- [ ] **Step 8: Implement roles**

`src/domain/roles.ts`:

```ts
import type { RoleDef } from './types'

export const BUILT_IN_ROLES: RoleDef[] = [
  {
    id: 'killer',
    builtIn: true,
    name: 'Gyilkos',
    namePlural: 'gyilkosok',
    faction: 'killers',
    action: 'kill',
    description:
      'Éjjelente kiválaszt egy áldozatot. A gyilkosok akkor nyernek, ha legalább annyian vannak, mint a többi élő játékos.',
    gmHint:
      'Ha a gyilkosok ismerik egymást, együtt ébrednek, és közösen választanak áldozatot. Ha nem, egyenként ébreszd őket – ilyenkor egymást is megtámadhatják.',
    stepSeconds: 30,
    constraints: { canTargetSelf: false, noRepeatTarget: false },
  },
  {
    id: 'serialKiller',
    builtIn: true,
    name: 'Sorozatgyilkos',
    namePlural: 'sorozatgyilkosok',
    faction: 'neutral',
    neutralGoal: 'soloKiller',
    action: 'kill',
    description:
      'Egyedül játszik: éjjelente kiválaszt egy áldozatot. Akkor nyer, ha rajta kívül legfeljebb egy játékos marad életben.',
    gmHint: 'Nem tartozik a gyilkosok csapatához, de a nyomozó gyanúsnak látja.',
    stepSeconds: 20,
    constraints: { canTargetSelf: false, noRepeatTarget: false },
  },
  {
    id: 'doctor',
    builtIn: true,
    name: 'Orvos',
    namePlural: 'orvosok',
    faction: 'town',
    action: 'protect',
    description:
      'Éjjelente megvéd egy játékost, akit aznap éjjel nem lehet megölni. Ugyanazt a játékost két egymást követő éjjel nem védheti meg, saját magát pedig csak egyszer.',
    gmHint:
      'A tiltott játékosokat az app kiszürkíti. Ha az orvos tiltott játékosra mutat, kérd meg, hogy válasszon mást.',
    stepSeconds: 20,
    constraints: { canTargetSelf: true, noRepeatTarget: true, selfTargetMax: 1 },
  },
  {
    id: 'detective',
    builtIn: true,
    name: 'Nyomozó',
    namePlural: 'nyomozók',
    faction: 'town',
    action: 'investigate',
    description:
      'Éjjelente megvizsgál egy játékost, és megtudja, gyanús-e. A gyilkosok és a sorozatgyilkos gyanúsak, mindenki más nem.',
    gmHint: 'Gyanús játékosnál felfelé mutató hüvelykujjal jelezz, ártatlannál lefelé mutatóval.',
    stepSeconds: 20,
    constraints: { canTargetSelf: false, noRepeatTarget: false },
  },
  {
    id: 'villager',
    builtIn: true,
    name: 'Városlakó',
    namePlural: 'városlakók',
    faction: 'town',
    action: 'none',
    description: 'Nincs különleges képessége. Nappal a vitában és a szavazáson segíti a várost.',
    stepSeconds: 0,
    constraints: { canTargetSelf: false, noRepeatTarget: false },
  },
  {
    id: 'jester',
    builtIn: true,
    name: 'Bolond',
    namePlural: 'bolondok',
    faction: 'neutral',
    neutralGoal: 'executed',
    action: 'none',
    description: 'Akkor nyer, ha a város kivégzi. Mindent megtesz, hogy gyanúsnak tűnjön.',
    gmHint:
      'A beállításoktól függ, hogy a kivégzésével véget ér-e a játék. Ha nem, a játék folytatódik, de a végén a bolond is győztesként szerepel.',
    stepSeconds: 0,
    constraints: { canTargetSelf: false, noRepeatTarget: false },
  },
  {
    id: 'survivor',
    builtIn: true,
    name: 'Túlélő',
    namePlural: 'túlélők',
    faction: 'neutral',
    neutralGoal: 'survive',
    action: 'vest',
    description:
      'Négyszer veheti fel a golyóálló mellényét, ilyenkor aznap éjjel nem lehet megölni. Akkor nyer, ha a játék végén életben van.',
    gmHint: 'Ha a túlélő nem jelez, vedd úgy, hogy nem veszi fel a mellényt.',
    stepSeconds: 15,
    constraints: { canTargetSelf: false, noRepeatTarget: false, maxUses: 4 },
  },
]

export const BUILT_IN_ORDER = ['killer', 'serialKiller', 'doctor', 'survivor', 'detective']

export function rolesById(custom: RoleDef[]): Record<string, RoleDef> {
  return Object.fromEntries([...BUILT_IN_ROLES, ...custom].map((r) => [r.id, r]))
}

export const isSuspicious = (role: RoleDef) => role.suspiciousOverride ?? role.action === 'kill'

export const isHostile = (role: RoleDef) =>
  role.faction === 'killers' || role.neutralGoal === 'soloKiller'

export function wakingOrder(
  order: string[],
  roleIds: string[],
  roles: Record<string, RoleDef>,
): string[] {
  const waking = roleIds.filter((id) => roles[id] && roles[id].action !== 'none')
  return [...order.filter((id) => waking.includes(id)), ...waking.filter((id) => !order.includes(id))]
}
```

- [ ] **Step 9: Run to see it pass**

Run: `pnpm vitest run src/domain/roles.test.ts`
Expected: PASS.

- [ ] **Step 10: Write the test fixture**

`src/domain/fixtures.ts`:

```ts
import { BUILT_IN_ORDER, rolesById } from './roles'
import type { GameSetup, Settings, StepInput } from './types'

export const ROLES = rolesById([])

const SETTINGS: Settings = {
  killersKnowEachOther: true,
  autoEnd: true,
  discussionMinutes: null,
  revealRoleOnDeath: true,
  jesterWinEndsGame: false,
}

export function makeSetup(roleIds: string[], settings: Partial<Settings> = {}): GameSetup {
  return {
    players: roleIds.map((roleId, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, seat: i + 1, roleId })),
    roles: ROLES,
    nightOrder: BUILT_IN_ORDER,
    settings: { ...SETTINGS, ...settings },
  }
}

export const t = (targetId: string | null): StepInput => ({ kind: 'target', targetId })
```

- [ ] **Step 11: Write failing copy tests**

`src/domain/copy.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  closeDayTitle,
  closeNightBody,
  closeNightTitle,
  dummyLine,
  morningTitle,
  numberArticle,
  phaseLabel,
  promptFor,
  reasonText,
  reopenBody,
  reopenTitle,
  sleepLine,
  wakeLine,
  winnerLabel,
  withArticle,
} from './copy'
import { ROLES } from './fixtures'

describe('articles', () => {
  it('uses az before any vowel, including long and umlauted ones', () => {
    expect(withArticle('Orvos')).toBe('az orvos')
    expect(withArticle('Őrző')).toBe('az őrző')
    expect(withArticle('Úrnő')).toBe('az úrnő')
    expect(withArticle('Gyilkos')).toBe('a gyilkos')
  })

  it('follows the spoken form of ordinals', () => {
    expect([1, 2, 3, 5, 10, 15, 50, 55].map(numberArticle)).toEqual([
      'az',
      'a',
      'a',
      'az',
      'a',
      'a',
      'az',
      'az',
    ])
  })
})

describe('phase texts', () => {
  it('labels phases', () => {
    expect([0, 1, 2, 3].map(phaseLabel)).toEqual(['1. éjszaka', '1. nap', '2. éjszaka', '2. nap'])
  })

  it('builds dialog titles with correct articles and cases', () => {
    expect(morningTitle(1)).toBe('Felvirradt az 1. nap')
    expect(closeNightTitle(0)).toBe('Kezdődhet az 1. nap?')
    expect(closeNightBody(2)).toBe(
      'Nézd át, minden éjszakai akció rendben van-e. Utána a 2. éjszaka lezárul.',
    )
    expect(closeDayTitle(1)).toBe('Jöhet a 2. éjszaka?')
    expect(reopenTitle(0)).toBe('Újranyitod az 1. éjszakát?')
    expect(reopenTitle(3)).toBe('Újranyitod a 2. napot?')
    expect(reopenBody(3)).toBe(
      'Ez a nap már lezárult. Ha módosítasz rajta, a későbbi események is megváltozhatnak.',
    )
  })
})

describe('narration', () => {
  it('wakes and puts roles to sleep in singular and plural', () => {
    expect(wakeLine(ROLES.doctor, false)).toBe('Felébred az orvos.')
    expect(wakeLine(ROLES.killer, true)).toBe('Felébrednek a gyilkosok.')
    expect(sleepLine(ROLES.doctor, false)).toBe('Az orvos elalszik.')
    expect(sleepLine(ROLES.killer, true)).toBe('A gyilkosok elalszanak.')
  })

  it('tells the GM to call a dead role anyway', () => {
    expect(dummyLine(ROLES.doctor, false)).toBe(
      'Az orvos már nem él, de szólítsd ugyanúgy, és várj pár másodpercet.',
    )
    expect(dummyLine(ROLES.killer, true)).toBe(
      'A gyilkosok már nem élnek, de szólítsd őket ugyanúgy, és várj pár másodpercet.',
    )
  })

  it('derives prompts from the action and prefers a non-blank override', () => {
    expect(promptFor(ROLES.killer, false)).toBe('Kit öl meg?')
    expect(promptFor(ROLES.killer, true)).toBe('Kit ölnek meg?')
    expect(promptFor({ ...ROLES.killer, promptOverride: 'Kire mutat?' }, true)).toBe('Kire mutat?')
    expect(promptFor({ ...ROLES.killer, promptOverride: '  ' }, false)).toBe('Kit öl meg?')
  })

  it('explains disabled targets', () => {
    expect(reasonText('repeat', 'protect')).toBe('Előző éjjel is őt védte')
    expect(reasonText('repeat', 'investigate')).toBe('Előző éjjel is őt választotta')
    expect(reasonText('selfLimit', 'protect')).toBe('Magát már nem védheti meg')
  })
})

describe('winnerLabel', () => {
  it('names factions and solo winners', () => {
    expect(winnerLabel('town', ROLES)).toBe('A város nyert!')
    expect(winnerLabel('killers', ROLES)).toBe('A gyilkosok nyertek!')
    expect(winnerLabel('nobody', ROLES)).toBe('Senki sem nyert.')
    expect(winnerLabel({ roleId: 'serialKiller' }, ROLES)).toBe('A sorozatgyilkos nyert!')
    expect(winnerLabel({ roleId: 'jester' }, ROLES)).toBe('A bolond nyert!')
  })
})
```

- [ ] **Step 12: Run to see it fail**

Run: `pnpm vitest run src/domain/copy.test.ts`
Expected: FAIL, cannot resolve `./copy`.

- [ ] **Step 13: Implement copy helpers**

`src/domain/copy.ts`:

```ts
import { isNight, phaseNumber } from './timeline'
import type { ActionKind, DisabledReason, RoleDef, Winner } from './types'

const VOWELS = 'aáeéiíoóöőuúüű'

export const lowerFirst = (s: string) => s.charAt(0).toLocaleLowerCase('hu') + s.slice(1)
export const upperFirst = (s: string) => s.charAt(0).toLocaleUpperCase('hu') + s.slice(1)

export function withArticle(word: string): string {
  const w = lowerFirst(word.trim())
  return `${VOWELS.includes(w.charAt(0)) ? 'az' : 'a'} ${w}`
}

// The article follows the spoken ordinal: első, ötödik, ötvenedik start with a vowel.
export const numberArticle = (n: number): 'a' | 'az' =>
  n === 1 || String(n).startsWith('5') ? 'az' : 'a'

export const phaseLabel = (phase: number) =>
  `${phaseNumber(phase)}. ${isNight(phase) ? 'éjszaka' : 'nap'}`

export function phaseWithArticle(phase: number, accusative = false): string {
  const n = phaseNumber(phase)
  const noun = isNight(phase)
    ? accusative
      ? 'éjszakát'
      : 'éjszaka'
    : accusative
      ? 'napot'
      : 'nap'
  return `${numberArticle(n)} ${n}. ${noun}`
}

export const morningTitle = (phase: number) => `Felvirradt ${phaseWithArticle(phase)}`
export const closeNightTitle = (phase: number) => `Kezdődhet ${phaseWithArticle(phase + 1)}?`
export const closeNightBody = (phase: number) =>
  `Nézd át, minden éjszakai akció rendben van-e. Utána ${phaseWithArticle(phase)} lezárul.`
export const closeDayTitle = (phase: number) => `Jöhet ${phaseWithArticle(phase + 1)}?`
export const reopenTitle = (phase: number) => `Újranyitod ${phaseWithArticle(phase, true)}?`
export const reopenBody = (phase: number) =>
  `${isNight(phase) ? 'Ez az éjszaka' : 'Ez a nap'} már lezárult. Ha módosítasz rajta, a későbbi események is megváltozhatnak.`

const roleNoun = (role: RoleDef, plural: boolean) =>
  withArticle(plural ? role.namePlural : role.name)

export const wakeLine = (role: RoleDef, plural: boolean) =>
  plural ? `Felébrednek ${roleNoun(role, true)}.` : `Felébred ${roleNoun(role, false)}.`

export const sleepLine = (role: RoleDef, plural: boolean) =>
  `${upperFirst(roleNoun(role, plural))} ${plural ? 'elalszanak' : 'elalszik'}.`

export const dummyLine = (role: RoleDef, plural: boolean) =>
  plural
    ? `${upperFirst(roleNoun(role, true))} már nem élnek, de szólítsd őket ugyanúgy, és várj pár másodpercet.`
    : `${upperFirst(roleNoun(role, false))} már nem él, de szólítsd ugyanúgy, és várj pár másodpercet.`

const PROMPTS: Record<ActionKind, [string, string]> = {
  kill: ['Kit öl meg?', 'Kit ölnek meg?'],
  protect: ['Kit véd meg?', 'Kit védenek meg?'],
  investigate: ['Kit vizsgál meg?', 'Kit vizsgálnak meg?'],
  other: ['Kit választ?', 'Kit választanak?'],
  vest: ['Felveszi a golyóálló mellényt?', 'Felveszik a golyóálló mellényt?'],
  none: ['', ''],
}

export const defaultPrompt = (action: ActionKind, plural: boolean) =>
  PROMPTS[action][plural ? 1 : 0]

export const promptFor = (role: RoleDef, plural: boolean) =>
  role.promptOverride?.trim() || defaultPrompt(role.action, plural)

export function reasonText(reason: DisabledReason, action: ActionKind): string {
  switch (reason) {
    case 'dead':
      return 'Halott'
    case 'self':
      return 'Saját magát nem választhatja'
    case 'repeat':
      return action === 'protect' ? 'Előző éjjel is őt védte' : 'Előző éjjel is őt választotta'
    case 'selfLimit':
      return action === 'protect' ? 'Magát már nem védheti meg' : 'Magát már nem választhatja'
    case 'exhausted':
      return 'Nincs több lehetősége'
  }
}

export function winnerLabel(winner: Winner, roles: Record<string, RoleDef>): string {
  if (winner === 'town') return 'A város nyert!'
  if (winner === 'killers') return 'A gyilkosok nyertek!'
  if (winner === 'nobody') return 'Senki sem nyert.'
  return `${upperFirst(withArticle(roles[winner.roleId]?.name ?? 'ismeretlen szerep'))} nyert!`
}
```

- [ ] **Step 14: Run all domain tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 15: Commit**

```bash
git add src/domain
git commit -m "Add engine types, built-in roles and Hungarian copy helpers"
```

---

### Task 3: Setup helpers and role assignment

**Files:**
- Create: `src/domain/setup.ts`, `src/domain/assign.ts`
- Test: `src/domain/setup.test.ts`, `src/domain/assign.test.ts`

**Interfaces:**
- Consumes: `RoleDef`, `Settings`, `Player` (Task 2), `isHostile` (Task 2).
- Produces (setup.ts): `SetupDraft { names: string[]; roleCounts: Record<string, number>; settings: Settings }`, `DEFAULT_SETTINGS`, `EMPTY_DRAFT`, `NameIssue = 'noPlayers' | 'emptyName' | 'duplicateName'`, `nameIssue(names): NameIssue | null`, `totalRoles(counts): number`, `fillWithVillagers(counts, playerCount)`, `sanitizeDraft(draft, roles)`, `hasHostile(counts, roles)`, `mergeNightOrder(global, reordered)`, `rememberPlayers(known, used)`.
- Produces (assign.ts): `shuffle<T>(items, random): T[]`, `assignRoles(people: { id: string; name: string }[], roleCounts, random): Player[]`.

- [ ] **Step 1: Write failing setup tests**

`src/domain/setup.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ROLES } from './fixtures'
import {
  DEFAULT_SETTINGS,
  fillWithVillagers,
  hasHostile,
  mergeNightOrder,
  nameIssue,
  rememberPlayers,
  sanitizeDraft,
} from './setup'

describe('nameIssue', () => {
  it('requires at least one non-empty name', () => {
    expect(nameIssue([])).toBe('noPlayers')
    expect(nameIssue(['Anna', '  '])).toBe('emptyName')
    expect(nameIssue(['Anna', 'Bence'])).toBeNull()
  })

  it('treats case and whitespace variants as duplicates', () => {
    expect(nameIssue(['Ödön', 'ödön '])).toBe('duplicateName')
  })
})

describe('fillWithVillagers', () => {
  it('fills the remaining seats with villagers', () => {
    expect(fillWithVillagers({ killer: 1, doctor: 1 }, 5)).toEqual({ killer: 1, doctor: 1, villager: 3 })
    expect(fillWithVillagers({ killer: 1, villager: 4 }, 3)).toEqual({ killer: 1, villager: 2 })
  })

  it('never goes negative', () => {
    expect(fillWithVillagers({ killer: 4 }, 3)).toEqual({ killer: 4, villager: 0 })
  })
})

describe('sanitizeDraft', () => {
  it('sanitizeDraft drops unknown roles and zero counts and fills missing settings', () => {
    const draft = sanitizeDraft(
      {
        names: ['Anna'],
        roleCounts: { killer: 1, deleted: 2, doctor: 0 },
        settings: { autoEnd: false } as never,
      },
      ROLES,
    )
    expect(draft.roleCounts).toEqual({ killer: 1 })
    expect(draft.settings).toEqual({ ...DEFAULT_SETTINGS, autoEnd: false })
  })
})

describe('hasHostile', () => {
  it('detects killers and solo killers', () => {
    expect(hasHostile({ villager: 3 }, ROLES)).toBe(false)
    expect(hasHostile({ villager: 3, serialKiller: 1 }, ROLES)).toBe(true)
  })
})

describe('mergeNightOrder', () => {
  const global = ['killer', 'serialKiller', 'doctor', 'survivor', 'detective']

  it('rearranges the selected roles within the positions they occupy', () => {
    expect(mergeNightOrder(global, ['detective', 'killer'])).toEqual([
      'detective',
      'serialKiller',
      'doctor',
      'survivor',
      'killer',
    ])
  })

  it('appends roles missing from the global order', () => {
    expect(mergeNightOrder(['killer', 'doctor'], ['witch', 'doctor', 'killer'])).toEqual([
      'doctor',
      'killer',
      'witch',
    ])
  })
})

describe('rememberPlayers', () => {
  it('puts the latest names first and drops older spellings', () => {
    expect(rememberPlayers(['Anna', 'Bence', 'Csilla'], ['csilla ', 'Dani'])).toEqual([
      'csilla',
      'Dani',
      'Anna',
      'Bence',
    ])
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm vitest run src/domain/setup.test.ts`
Expected: FAIL, cannot resolve `./setup`.

- [ ] **Step 3: Implement setup helpers**

`src/domain/setup.ts`:

```ts
import { isHostile } from './roles'
import type { RoleDef, Settings } from './types'

export interface SetupDraft {
  names: string[]
  roleCounts: Record<string, number>
  settings: Settings
}

export const DEFAULT_SETTINGS: Settings = {
  killersKnowEachOther: true,
  autoEnd: true,
  discussionMinutes: null,
  revealRoleOnDeath: true,
  jesterWinEndsGame: false,
}

export const EMPTY_DRAFT: SetupDraft = { names: [], roleCounts: {}, settings: DEFAULT_SETTINGS }

export type NameIssue = 'noPlayers' | 'emptyName' | 'duplicateName'

const nameKey = (name: string) => name.trim().toLocaleLowerCase('hu')

export function nameIssue(names: string[]): NameIssue | null {
  if (names.length === 0) return 'noPlayers'
  if (names.some((n) => n.trim() === '')) return 'emptyName'
  const keys = names.map(nameKey)
  return new Set(keys).size === keys.length ? null : 'duplicateName'
}

export const totalRoles = (counts: Record<string, number>) =>
  Object.values(counts).reduce((sum, n) => sum + n, 0)

export function fillWithVillagers(
  counts: Record<string, number>,
  playerCount: number,
): Record<string, number> {
  const others = totalRoles(counts) - (counts.villager ?? 0)
  return { ...counts, villager: Math.max(0, playerCount - others) }
}

// Drafts outlive library edits and app updates: deleted roles and new settings must not break setup.
export function sanitizeDraft(draft: SetupDraft, roles: Record<string, RoleDef>): SetupDraft {
  const roleCounts = Object.fromEntries(
    Object.entries(draft.roleCounts).filter(([id, n]) => roles[id] && n > 0),
  )
  return { ...draft, roleCounts, settings: { ...DEFAULT_SETTINGS, ...draft.settings } }
}

export const hasHostile = (counts: Record<string, number>, roles: Record<string, RoleDef>) =>
  Object.entries(counts).some(([id, n]) => n > 0 && roles[id] && isHostile(roles[id]))

export function mergeNightOrder(global: string[], reordered: string[]): string[] {
  const known = reordered.filter((id) => global.includes(id))
  const slots = global.flatMap((id, i) => (reordered.includes(id) ? [i] : []))
  const result = [...global]
  slots.forEach((slot, k) => (result[slot] = known[k]))
  return [...result, ...reordered.filter((id) => !global.includes(id))]
}

export function rememberPlayers(known: string[], used: string[]): string[] {
  const latest = used.map((n) => n.trim())
  const keys = new Set(latest.map(nameKey))
  return [...latest, ...known.filter((n) => !keys.has(nameKey(n)))]
}
```

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run src/domain/setup.test.ts`
Expected: PASS.

- [ ] **Step 5: Write failing assignment tests**

`src/domain/assign.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { assignRoles, shuffle } from './assign'

const constant = (value: number) => () => value

describe('shuffle', () => {
  it('is a Fisher–Yates permutation driven by the injected random', () => {
    expect(shuffle([1, 2, 3, 4], constant(0))).toEqual([2, 3, 4, 1])
    expect(shuffle([1, 2, 3, 4], constant(0.999))).toEqual([1, 2, 3, 4])
  })
})

describe('assignRoles', () => {
  const people = [
    { id: 'a', name: ' Anna ' },
    { id: 'b', name: 'Bence' },
    { id: 'c', name: 'Csilla' },
  ]

  it('gives every seat exactly one role from the pool', () => {
    const players = assignRoles(people, { killer: 1, villager: 2 }, Math.random)
    expect(players.map((p) => p.seat)).toEqual([1, 2, 3])
    expect(players.map((p) => p.name)).toEqual(['Anna', 'Bence', 'Csilla'])
    expect(players.map((p) => p.roleId).sort()).toEqual(['killer', 'villager', 'villager'])
  })

  it('rejects a pool that does not match the player count', () => {
    expect(() => assignRoles(people, { killer: 1 }, Math.random)).toThrow()
  })
})
```

- [ ] **Step 6: Run to see it fail**

Run: `pnpm vitest run src/domain/assign.test.ts`
Expected: FAIL, cannot resolve `./assign`.

- [ ] **Step 7: Implement assignment**

`src/domain/assign.ts`:

```ts
import type { Player } from './types'

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function assignRoles(
  people: { id: string; name: string }[],
  roleCounts: Record<string, number>,
  random: () => number,
): Player[] {
  const pool = Object.entries(roleCounts).flatMap(([roleId, n]) => Array<string>(n).fill(roleId))
  if (pool.length !== people.length) throw new Error('Role count must equal player count')
  const roles = shuffle(pool, random)
  return people.map((p, i) => ({ id: p.id, name: p.name.trim(), seat: i + 1, roleId: roles[i] }))
}
```

- [ ] **Step 8: Run all tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/domain
git commit -m "Add setup validation, night order merge and role assignment"
```

---

### Task 4: Step derivation

**Files:**
- Create: `src/domain/steps.ts`
- Test: `src/domain/steps.test.ts`

**Interfaces:**
- Consumes: `GameSetup`, `Step`, `RoleDef`, `Settings` (Task 2), `wakingOrder` (Task 2), `isNight`, `stepId` (Task 2), `makeSetup` (Task 2 fixtures).
- Produces: `buildSteps(setup: GameSetup, phase: number, alive: ReadonlySet<string>): Step[]`. Night slots: `dusk`, `tell` (night 1), `killersMeet` (night 1), `<roleId>` (shared) or `<roleId>:<playerId>` (per player). Day slots: `morning`, `discussion`, `execution`.

- [ ] **Step 1: Write failing tests**

`src/domain/steps.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { makeSetup } from './fixtures'
import { buildSteps } from './steps'
import type { GameSetup } from './types'

const everyone = (s: GameSetup) => new Set(s.players.map((p) => p.id))
const ids = (s: GameSetup, phase: number, alive = everyone(s)) =>
  buildSteps(s, phase, alive).map((step) => step.id)

describe('buildSteps', () => {
  it('opens night 1 with dusk, tell and the killers meeting', () => {
    const s = makeSetup(['killer', 'killer', 'doctor', 'villager'])
    expect(ids(s, 0)).toEqual(['n1:dusk', 'n1:tell', 'n1:killersMeet', 'n1:killer', 'n1:doctor'])
  })

  it('skips the meeting with a single killer', () => {
    expect(ids(makeSetup(['killer', 'doctor', 'villager']), 0)).toEqual([
      'n1:dusk',
      'n1:tell',
      'n1:killer',
      'n1:doctor',
    ])
  })

  it('wakes each killer alone when they do not know each other', () => {
    const s = makeSetup(['killer', 'killer', 'doctor'], { killersKnowEachOther: false })
    expect(ids(s, 0)).toEqual(['n1:dusk', 'n1:tell', 'n1:killer:p1', 'n1:killer:p2', 'n1:doctor'])
  })

  it('drops the tell step after night 1', () => {
    expect(ids(makeSetup(['killer', 'doctor', 'villager']), 2)).toEqual([
      'n2:dusk',
      'n2:killer',
      'n2:doctor',
    ])
  })

  it('keeps a dummy step for a dead role', () => {
    const s = makeSetup(['killer', 'doctor', 'villager'])
    const doctor = buildSteps(s, 2, new Set(['p1', 'p3'])).find((x) => x.id === 'n2:doctor')
    expect(doctor).toMatchObject({ kind: 'action', actorIds: [] })
  })

  it('narrates in plural by role count even when only one holder lives', () => {
    const s = makeSetup(['doctor', 'doctor', 'killer'])
    const doctor = buildSteps(s, 2, new Set(['p2', 'p3'])).find((x) => x.id === 'n2:doctor')
    expect(doctor).toMatchObject({ actorIds: ['p2'], plural: true })
  })

  it('gives every vest holder an own step', () => {
    const s = makeSetup(['killer', 'survivor', 'survivor'])
    expect(ids(s, 2)).toEqual(['n2:dusk', 'n2:killer', 'n2:survivor:p2', 'n2:survivor:p3'])
  })

  it('builds the day steps', () => {
    expect(ids(makeSetup(['killer', 'villager']), 1)).toEqual([
      'd1:morning',
      'd1:discussion',
      'd1:execution',
    ])
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm vitest run src/domain/steps.test.ts`
Expected: FAIL, cannot resolve `./steps`.

- [ ] **Step 3: Implement**

`src/domain/steps.ts`:

```ts
import { wakingOrder } from './roles'
import { isNight, stepId } from './timeline'
import type { GameSetup, RoleDef, Settings, Step } from './types'

const DAY_SLOTS = ['morning', 'discussion', 'execution'] as const

const perPlayer = (role: RoleDef, settings: Settings) =>
  role.action === 'vest' || (role.faction === 'killers' && !settings.killersKnowEachOther)

export function buildSteps(setup: GameSetup, phase: number, alive: ReadonlySet<string>): Step[] {
  const base = (slot: string) => ({ id: stepId(phase, slot), slot, phase })
  if (!isNight(phase)) return DAY_SLOTS.map((slot) => ({ ...base(slot), kind: slot }))

  const steps: Step[] = [{ ...base('dusk'), kind: 'dusk' }]
  if (phase === 0) {
    steps.push({ ...base('tell'), kind: 'tell' })
    const killers = setup.players.filter((p) => setup.roles[p.roleId].faction === 'killers')
    if (setup.settings.killersKnowEachOther && killers.length >= 2) {
      steps.push({ ...base('killersMeet'), kind: 'killersMeet', actorIds: killers.map((p) => p.id) })
    }
  }

  const roleIds = [...new Set(setup.players.map((p) => p.roleId))]
  for (const roleId of wakingOrder(setup.nightOrder, roleIds, setup.roles)) {
    const holders = setup.players.filter((p) => p.roleId === roleId)
    if (perPlayer(setup.roles[roleId], setup.settings)) {
      for (const p of holders) {
        steps.push({
          ...base(`${roleId}:${p.id}`),
          kind: 'action',
          roleId,
          ownerId: p.id,
          actorIds: alive.has(p.id) ? [p.id] : [],
          plural: false,
        })
      }
    } else {
      steps.push({
        ...base(roleId),
        kind: 'action',
        roleId,
        actorIds: holders.filter((p) => alive.has(p.id)).map((p) => p.id),
        // Counting only living holders would switch the narration to singular and reveal a death.
        plural: holders.length > 1,
      })
    }
  }
  return steps
}
```

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run src/domain/steps.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "Derive night and day steps"
```

---

### Task 5: Win conditions

**Files:**
- Create: `src/domain/win.ts`
- Test: `src/domain/win.test.ts`

**Interfaces:**
- Consumes: `GameSetup`, `Winner` (Task 2), `makeSetup` (fixtures).
- Produces: `checkWin(setup: GameSetup, alive: string[], executedId: string | null): Winner | null`, `isMainWinner(setup: GameSetup, playerId: string, winner: Winner): boolean`.

- [ ] **Step 1: Write failing tests**

`src/domain/win.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { makeSetup } from './fixtures'
import { checkWin, isMainWinner } from './win'

// p1 killer, p2 serial killer, p3 doctor, p4 detective, p5 villager, p6 jester, p7 survivor
const roles = ['killer', 'serialKiller', 'doctor', 'detective', 'villager', 'jester', 'survivor']
const s = makeSetup(roles)

describe('checkWin', () => {
  it('reports nobody when everyone is dead', () => {
    expect(checkWin(s, [], null)).toBe('nobody')
  })

  it('lets the town win once no hostile is alive', () => {
    expect(checkWin(s, ['p3', 'p4', 'p7'], null)).toBe('town')
  })

  it('lets killers win at parity, but not while a serial killer lives', () => {
    expect(checkWin(s, ['p1', 'p3'], null)).toBe('killers')
    expect(checkWin(s, ['p1', 'p3', 'p4'], null)).toBeNull()
    expect(checkWin(s, ['p1', 'p2'], null)).toBeNull()
  })

  it('lets the serial killer win with at most one other survivor', () => {
    expect(checkWin(s, ['p2', 'p3'], null)).toEqual({ roleId: 'serialKiller' })
    expect(checkWin(s, ['p2', 'p3', 'p4'], null)).toBeNull()
  })

  it('ends with the jester only when the setting says so', () => {
    const alive = ['p1', 'p3', 'p4', 'p5']
    expect(checkWin(s, alive, 'p6')).toBeNull()
    expect(checkWin(makeSetup(roles, { jesterWinEndsGame: true }), alive, 'p6')).toEqual({
      roleId: 'jester',
    })
  })

  it('checks the town before the jester', () => {
    const j = makeSetup(roles, { jesterWinEndsGame: true })
    expect(checkWin(j, ['p3', 'p4'], 'p6')).toBe('town')
  })
})

describe('isMainWinner', () => {
  it('maps winners to players', () => {
    expect(isMainWinner(s, 'p3', 'town')).toBe(true)
    expect(isMainWinner(s, 'p6', 'town')).toBe(false)
    expect(isMainWinner(s, 'p1', 'killers')).toBe(true)
    expect(isMainWinner(s, 'p2', { roleId: 'serialKiller' })).toBe(true)
    expect(isMainWinner(s, 'p3', 'nobody')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm vitest run src/domain/win.test.ts`
Expected: FAIL, cannot resolve `./win`.

- [ ] **Step 3: Implement**

`src/domain/win.ts`:

```ts
import type { GameSetup, RoleDef, Winner } from './types'

const roleOf = (setup: GameSetup, playerId: string): RoleDef =>
  setup.roles[setup.players.find((p) => p.id === playerId)!.roleId]

export function checkWin(setup: GameSetup, alive: string[], executedId: string | null): Winner | null {
  if (alive.length === 0) return 'nobody'
  const living = alive.map((id) => roleOf(setup, id))
  const killers = living.filter((r) => r.faction === 'killers').length
  const solo = living.filter((r) => r.neutralGoal === 'soloKiller')
  if (killers === 0 && solo.length === 0) return 'town'
  if (solo.length === 0 && killers >= alive.length - killers) return 'killers'
  if (killers === 0 && alive.length - solo.length <= 1) return { roleId: solo[0].id }
  if (executedId && setup.settings.jesterWinEndsGame) {
    const executed = roleOf(setup, executedId)
    if (executed.neutralGoal === 'executed') return { roleId: executed.id }
  }
  return null
}

export function isMainWinner(setup: GameSetup, playerId: string, winner: Winner): boolean {
  const role = roleOf(setup, playerId)
  if (winner === 'town') return role.faction === 'town'
  if (winner === 'killers') return role.faction === 'killers'
  if (winner === 'nobody') return false
  return role.id === winner.roleId
}
```

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run src/domain/win.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "Add win conditions"
```

---

### Task 6: Game derivation

**Files:**
- Create: `src/domain/derive.ts`
- Test: `src/domain/derive.test.ts`

**Interfaces:**
- Consumes: `buildSteps` (Task 4), `checkWin` (Task 5), `isNight`, `stepId` (Task 2), all types (Task 2), `makeSetup`, `t` (fixtures).
- Produces:

```ts
interface TargetOption { playerId: string; disabled: DisabledReason | null }
interface Attack { stepId: string; roleId: string; actorIds: string[]; targetId: string; result: 'killed' | 'protected'; protectedBy: string[] }
interface NightResult { attacks: Attack[]; deaths: string[] }
interface DayResult { nightDeaths: string[]; adjustments: Adjustment[]; announced: string[]; aliveAfterMorning: string[]; executedId: string | null; winAfterMorning: Winner | null; winAfterExecution: Winner | null }
interface DerivedPhase { index: number; steps: Step[]; aliveAtStart: string[]; aliveAtEnd: string[]; night?: NightResult; day?: DayResult }
interface DerivedGame { phases: DerivedPhase[]; effective: Record<string, StepInput>; invalid: ReadonlySet<string>; options: Record<string, TargetOption[]>; usesLeft: Record<string, number | null> }
function deriveGame(setup: GameSetup, inputs: Record<string, StepInput>, throughPhase: number): DerivedGame
```

All player id lists are in seat order. `options` exists for every non-dummy target step and every execution step and lists every player. `usesLeft` exists for every non-dummy action step (`null` = unlimited). For a day phase, `aliveAtStart` is after the night's deaths and before morning adjustments.

- [ ] **Step 1: Write failing tests**

`src/domain/derive.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { deriveGame } from './derive'
import { makeSetup, t } from './fixtures'
import type { StepInput } from './types'

// p1 killer, p2 doctor, p3 detective, p4 villager, p5 villager
const s = makeSetup(['killer', 'doctor', 'detective', 'villager', 'villager'])
const exec = (targetId: string | null): StepInput => ({ kind: 'execution', targetId })
const option = (d: ReturnType<typeof deriveGame>, stepId: string, playerId: string) =>
  d.options[stepId].find((o) => o.playerId === playerId)?.disabled

describe('night resolution', () => {
  it('kills an unprotected target and announces it in the morning', () => {
    const d = deriveGame(s, { 'n1:killer': t('p4'), 'n1:doctor': t('p5') }, 1)
    expect(d.phases[0].night!.deaths).toEqual(['p4'])
    expect(d.phases[1].day!.announced).toEqual(['p4'])
    expect(d.phases[1].aliveAtStart).toEqual(['p1', 'p2', 'p3', 'p5'])
  })

  it('records a protected attack without a death', () => {
    const d = deriveGame(s, { 'n1:killer': t('p4'), 'n1:doctor': t('p4') }, 0)
    expect(d.phases[0].night).toEqual({
      attacks: [
        {
          stepId: 'n1:killer',
          roleId: 'killer',
          actorIds: ['p1'],
          targetId: 'p4',
          result: 'protected',
          protectedBy: ['n1:doctor'],
        },
      ],
      deaths: [],
    })
  })

  it('lets a vest protect its wearer', () => {
    const v = makeSetup(['killer', 'survivor', 'villager'])
    const d = deriveGame(v, { 'n1:killer': t('p2'), 'n1:survivor:p2': { kind: 'vest', use: true } }, 0)
    expect(d.phases[0].night!.deaths).toEqual([])
  })

  it('resolves simultaneously, so killers can kill each other', () => {
    const k = makeSetup(['killer', 'killer', 'villager', 'villager'], { killersKnowEachOther: false })
    const d = deriveGame(k, { 'n1:killer:p1': t('p2'), 'n1:killer:p2': t('p3') }, 0)
    expect(d.phases[0].night!.deaths).toEqual(['p2', 'p3'])
  })

  it('accepts an explicit no-target choice', () => {
    const d = deriveGame(s, { 'n1:killer': t(null) }, 0)
    expect(d.effective['n1:killer']).toEqual(t(null))
    expect(d.phases[0].night!.deaths).toEqual([])
  })
})

describe('target options', () => {
  it('stops killers from choosing themselves', () => {
    expect(option(deriveGame(s, {}, 0), 'n1:killer', 'p1')).toBe('self')
  })

  it('blocks the previous protection target', () => {
    const d = deriveGame(s, { 'n1:doctor': t('p4') }, 2)
    expect(option(d, 'n2:doctor', 'p4')).toBe('repeat')
  })

  it('allows self protection once', () => {
    const d = deriveGame(s, { 'n1:doctor': t('p2'), 'n2:doctor': t('p4') }, 4)
    expect(option(d, 'n3:doctor', 'p2')).toBe('selfLimit')
  })

  it('marks dead players', () => {
    const d = deriveGame(s, { 'n1:killer': t('p4') }, 2)
    expect(option(d, 'n2:doctor', 'p4')).toBe('dead')
  })

  it('runs out of vest uses', () => {
    const v = makeSetup(['killer', 'survivor', 'villager', 'villager'])
    const vest: StepInput = { kind: 'vest', use: true }
    const inputs = Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`n${n}:survivor:p2`, vest]))
    const d = deriveGame(v, inputs, 8)
    expect(d.usesLeft['n4:survivor:p2']).toBe(1)
    expect(d.usesLeft['n5:survivor:p2']).toBe(0)
    expect(d.invalid.has('n5:survivor:p2')).toBe(true)
  })
})

describe('day', () => {
  it('applies morning adjustments to the announcement and the living', () => {
    const d = deriveGame(
      s,
      {
        'n1:killer': t('p4'),
        'd1:morning': {
          kind: 'morning',
          adjustments: [
            { playerId: 'p4', dead: false },
            { playerId: 'p5', dead: true },
          ],
        },
      },
      1,
    )
    expect(d.phases[1].day!.announced).toEqual(['p5'])
    expect(d.phases[1].day!.aliveAfterMorning).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('ignores an adjustment that no longer matches the night', () => {
    const d = deriveGame(
      s,
      { 'd1:morning': { kind: 'morning', adjustments: [{ playerId: 'p5', dead: false }] } },
      1,
    )
    expect(d.invalid.has('d1:morning')).toBe(true)
    expect(d.effective['d1:morning']).toEqual({ kind: 'morning', adjustments: [] })
  })

  it('executes and checks wins at both checkpoints', () => {
    const d = deriveGame(s, { 'd1:execution': exec('p1') }, 1)
    expect(d.phases[1].day!.winAfterMorning).toBeNull()
    expect(d.phases[1].day!.winAfterExecution).toBe('town')
    expect(d.phases[1].aliveAtEnd).toEqual(['p2', 'p3', 'p4', 'p5'])
  })

  it('invalidates a later choice when an earlier edit kills its target', () => {
    const d = deriveGame(s, { 'n1:killer': t('p4'), 'd1:execution': exec('p4') }, 1)
    expect(d.invalid.has('d1:execution')).toBe(true)
    expect(d.effective['d1:execution']).toBeUndefined()
    expect(d.phases[1].day!.executedId).toBeNull()
    expect(option(d, 'd1:execution', 'p4')).toBe('dead')
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm vitest run src/domain/derive.test.ts`
Expected: FAIL, cannot resolve `./derive`.

- [ ] **Step 3: Implement**

`src/domain/derive.ts`:

```ts
import { buildSteps } from './steps'
import { isNight, stepId } from './timeline'
import type {
  ActionStep,
  Adjustment,
  DisabledReason,
  GameSetup,
  Step,
  StepInput,
  Winner,
} from './types'
import { checkWin } from './win'

export interface TargetOption {
  playerId: string
  disabled: DisabledReason | null
}

export interface Attack {
  stepId: string
  roleId: string
  actorIds: string[]
  targetId: string
  result: 'killed' | 'protected'
  protectedBy: string[]
}

export interface NightResult {
  attacks: Attack[]
  deaths: string[]
}

export interface DayResult {
  nightDeaths: string[]
  adjustments: Adjustment[]
  announced: string[]
  aliveAfterMorning: string[]
  executedId: string | null
  winAfterMorning: Winner | null
  winAfterExecution: Winner | null
}

export interface DerivedPhase {
  index: number
  steps: Step[]
  aliveAtStart: string[]
  aliveAtEnd: string[]
  night?: NightResult
  day?: DayResult
}

export interface DerivedGame {
  phases: DerivedPhase[]
  effective: Record<string, StepInput>
  invalid: ReadonlySet<string>
  options: Record<string, TargetOption[]>
  usesLeft: Record<string, number | null>
}

interface SlotContext {
  previousTarget: string | null
  selfIds: ReadonlySet<string>
  selfUses: number
  usesLeft: number | null
}

const targetOf = (input: StepInput) => (input.kind === 'target' ? input.targetId : null)

function slotContext(
  setup: GameSetup,
  step: ActionStep,
  effective: Record<string, StepInput>,
): SlotContext {
  const role = setup.roles[step.roleId]
  // Shared steps change actors as holders die, so "self" means anyone holding the role.
  const selfIds = new Set(
    step.ownerId
      ? [step.ownerId]
      : setup.players.filter((p) => p.roleId === step.roleId).map((p) => p.id),
  )
  const earlier: StepInput[] = []
  for (let phase = step.phase - 2; phase >= 0; phase -= 2) {
    const input = effective[stepId(phase, step.slot)]
    if (input) earlier.push(input)
  }
  const previous = step.phase >= 2 ? effective[stepId(step.phase - 2, step.slot)] : undefined
  const used = earlier.filter((i) => (i.kind === 'vest' ? i.use : targetOf(i) !== null)).length
  const selfUses = earlier.filter((i) => {
    const target = targetOf(i)
    return target !== null && selfIds.has(target)
  }).length
  const max = role.constraints.maxUses
  return {
    previousTarget: previous ? targetOf(previous) : null,
    selfIds,
    selfUses,
    usesLeft: max === undefined ? null : Math.max(0, max - used),
  }
}

function targetOptions(
  setup: GameSetup,
  step: ActionStep,
  alive: ReadonlySet<string>,
  ctx: SlotContext,
): TargetOption[] {
  const { constraints } = setup.roles[step.roleId]
  return setup.players.map(({ id }) => {
    const self = ctx.selfIds.has(id)
    let disabled: DisabledReason | null = null
    if (!alive.has(id)) disabled = 'dead'
    else if (ctx.usesLeft === 0) disabled = 'exhausted'
    else if (self && !constraints.canTargetSelf) disabled = 'self'
    else if (
      self &&
      constraints.selfTargetMax !== undefined &&
      ctx.selfUses >= constraints.selfTargetMax
    )
      disabled = 'selfLimit'
    else if (constraints.noRepeatTarget && ctx.previousTarget === id) disabled = 'repeat'
    return { playerId: id, disabled }
  })
}

function resolveNight(
  setup: GameSetup,
  steps: Step[],
  effective: Record<string, StepInput>,
  seatOrder: string[],
): NightResult {
  const pending: Omit<Attack, 'result' | 'protectedBy'>[] = []
  const protections = new Map<string, string[]>()
  const protect = (targetId: string, by: string) =>
    protections.set(targetId, [...(protections.get(targetId) ?? []), by])

  for (const step of steps) {
    if (step.kind !== 'action') continue
    const input = effective[step.id]
    if (!input) continue
    if (input.kind === 'vest') {
      if (input.use && step.ownerId) protect(step.ownerId, step.id)
      continue
    }
    const targetId = targetOf(input)
    if (targetId === null) continue
    const { action } = setup.roles[step.roleId]
    if (action === 'kill') {
      pending.push({ stepId: step.id, roleId: step.roleId, actorIds: step.actorIds, targetId })
    }
    if (action === 'protect') protect(targetId, step.id)
  }

  const attacks: Attack[] = pending.map((a) => {
    const by = protections.get(a.targetId) ?? []
    return { ...a, result: by.length > 0 ? 'protected' : 'killed', protectedBy: by }
  })
  const killed = new Set(attacks.filter((a) => a.result === 'killed').map((a) => a.targetId))
  return { attacks, deaths: seatOrder.filter((id) => killed.has(id)) }
}

export function deriveGame(
  setup: GameSetup,
  inputs: Record<string, StepInput>,
  throughPhase: number,
): DerivedGame {
  const seatOrder = setup.players.map((p) => p.id)
  const inSeatOrder = (ids: Iterable<string>) => {
    const set = new Set(ids)
    return seatOrder.filter((id) => set.has(id))
  }
  const effective: Record<string, StepInput> = {}
  const invalid = new Set<string>()
  const options: Record<string, TargetOption[]> = {}
  const usesLeft: Record<string, number | null> = {}
  const phases: DerivedPhase[] = []
  let alive = seatOrder

  for (let phase = 0; phase <= throughPhase; phase++) {
    const aliveSet = new Set(alive)
    const steps = buildSteps(setup, phase, aliveSet)

    if (isNight(phase)) {
      for (const step of steps) {
        const input = inputs[step.id]
        if (step.kind === 'tell') {
          if (input?.kind === 'tell') effective[step.id] = input
          continue
        }
        if (step.kind !== 'action' || step.actorIds.length === 0) continue
        const ctx = slotContext(setup, step, effective)
        usesLeft[step.id] = ctx.usesLeft
        if (setup.roles[step.roleId].action === 'vest') {
          if (!input) continue
          if (input.kind === 'vest' && !(input.use && ctx.usesLeft === 0)) effective[step.id] = input
          else invalid.add(step.id)
          continue
        }
        const opts = targetOptions(setup, step, aliveSet, ctx)
        options[step.id] = opts
        if (!input) continue
        const valid =
          input.kind === 'target' &&
          (input.targetId === null ||
            opts.some((o) => o.playerId === input.targetId && o.disabled === null))
        if (valid) effective[step.id] = input
        else invalid.add(step.id)
      }
      const night = resolveNight(setup, steps, effective, seatOrder)
      const aliveAtEnd = alive.filter((id) => !night.deaths.includes(id))
      phases.push({ index: phase, steps, aliveAtStart: alive, aliveAtEnd, night })
      alive = aliveAtEnd
      continue
    }

    const morningId = stepId(phase, 'morning')
    const morning = inputs[morningId]
    let adjustments: Adjustment[] = []
    if (morning?.kind === 'morning') {
      adjustments = morning.adjustments.filter(
        (a) => seatOrder.includes(a.playerId) && aliveSet.has(a.playerId) === a.dead,
      )
      if (adjustments.length !== morning.adjustments.length) invalid.add(morningId)
      effective[morningId] = { kind: 'morning', adjustments }
    } else if (morning) invalid.add(morningId)

    const killedByGm = new Set(adjustments.filter((a) => a.dead).map((a) => a.playerId))
    const revived = adjustments.filter((a) => !a.dead).map((a) => a.playerId)
    const nightDeaths = phases[phase - 1].night!.deaths
    const aliveAfterMorning = inSeatOrder([
      ...alive.filter((id) => !killedByGm.has(id)),
      ...revived,
    ])
    const announced = inSeatOrder([
      ...nightDeaths.filter((id) => !revived.includes(id)),
      ...killedByGm,
    ])

    const executionId = stepId(phase, 'execution')
    const afterMorning = new Set(aliveAfterMorning)
    options[executionId] = seatOrder.map((id) => ({
      playerId: id,
      disabled: afterMorning.has(id) ? null : 'dead',
    }))
    const execution = inputs[executionId]
    let executedId: string | null = null
    if (execution) {
      const valid =
        execution.kind === 'execution' &&
        (execution.targetId === null || afterMorning.has(execution.targetId))
      if (valid) {
        effective[executionId] = execution
        executedId = execution.targetId
      } else invalid.add(executionId)
    }

    const aliveAtEnd = aliveAfterMorning.filter((id) => id !== executedId)
    phases.push({
      index: phase,
      steps,
      aliveAtStart: alive,
      aliveAtEnd,
      day: {
        nightDeaths,
        adjustments,
        announced,
        aliveAfterMorning,
        executedId,
        winAfterMorning: checkWin(setup, aliveAfterMorning, null),
        winAfterExecution: checkWin(setup, aliveAtEnd, executedId),
      },
    })
    alive = aliveAtEnd
  }

  return { phases, effective, invalid, options, usesLeft }
}
```

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run src/domain/derive.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "Derive game state from inputs"
```

---

### Task 7: Navigation

**Files:**
- Create: `src/domain/navigation.ts`
- Test: `src/domain/navigation.test.ts`

**Interfaces:**
- Consumes: `DerivedGame`, `DerivedPhase`, `deriveGame` (Task 6), `firstStepId` (Task 2), `Cursor`, `Step`, `Winner` (Task 2).
- Produces:

```ts
function stepIndex(phase: DerivedPhase, stepId: string): number          // falls back to 0
function currentStep(derived: DerivedGame, cursor: Cursor): Step
function needsInput(step: Step): boolean
type NextResult = { ok: false } | { ok: true; cursor: Cursor; closesPhase: number | null; win: Winner | null }
function next(derived: DerivedGame, cursor: Cursor): NextResult
function back(derived: DerivedGame, cursor: Cursor): { cursor: Cursor; reopensPhase: number | null } | null
function pendingWin(derived: DerivedGame, cursor: Cursor): Winner | null
function aliveAt(derived: DerivedGame, cursor: Cursor, ended: boolean): string[]
```

`derived` must be computed through `cursor.phase`.

- [ ] **Step 1: Write failing tests**

`src/domain/navigation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { deriveGame } from './derive'
import { makeSetup, t } from './fixtures'
import { aliveAt, back, next, pendingWin } from './navigation'
import type { StepInput } from './types'

// p1 killer, p2 doctor, p3 villager, p4 villager
const s = makeSetup(['killer', 'doctor', 'villager', 'villager'])
const d = (inputs: Record<string, StepInput>, phase: number) => deriveGame(s, inputs, phase)
const at = (phase: number, stepId: string) => ({ phase, stepId })

describe('next', () => {
  it('requires a choice on a living role step', () => {
    expect(next(d({}, 0), at(0, 'n1:killer'))).toEqual({ ok: false })
  })

  it('advances within a phase', () => {
    expect(next(d({ 'n1:killer': t('p3') }, 0), at(0, 'n1:killer'))).toEqual({
      ok: true,
      cursor: at(0, 'n1:doctor'),
      closesPhase: null,
      win: null,
    })
  })

  it('asks to close the phase on its last step', () => {
    const result = next(d({ 'n1:doctor': t('p3') }, 0), at(0, 'n1:doctor'))
    expect(result).toEqual({ ok: true, cursor: at(1, 'd1:morning'), closesPhase: 0, win: null })
  })

  it('lets a dummy step through without a choice', () => {
    const inputs = { 'n1:killer': t('p2') }
    expect(next(d(inputs, 2), at(2, 'n2:doctor'))).toMatchObject({ ok: true, closesPhase: 2 })
  })

  it('reports the win when leaving the morning', () => {
    const k = makeSetup(['killer', 'villager', 'villager'])
    const derived = deriveGame(k, { 'n1:killer': t('p2') }, 1)
    expect(next(derived, at(1, 'd1:morning'))).toMatchObject({ ok: true, win: 'killers' })
  })

  it('reports the win when leaving the execution', () => {
    const derived = d({ 'd1:execution': { kind: 'execution', targetId: 'p1' } }, 1)
    expect(next(derived, at(1, 'd1:execution'))).toEqual({
      ok: true,
      cursor: at(2, 'n2:dusk'),
      closesPhase: 1,
      win: 'town',
    })
  })

  it('blocks Next on an invalidated step', () => {
    const inputs: Record<string, StepInput> = {
      'n1:killer': t('p3'),
      'd1:execution': { kind: 'execution', targetId: 'p3' },
    }
    expect(next(d(inputs, 1), at(1, 'd1:execution'))).toEqual({ ok: false })
  })
})

describe('back', () => {
  it('steps back within a phase', () => {
    expect(back(d({}, 0), at(0, 'n1:doctor'))).toEqual({
      cursor: at(0, 'n1:killer'),
      reopensPhase: null,
    })
  })

  it('reopens the previous phase from the first step', () => {
    expect(back(d({}, 1), at(1, 'd1:morning'))).toEqual({
      cursor: at(0, 'n1:doctor'),
      reopensPhase: 0,
    })
  })

  it('stops at the very first step', () => {
    expect(back(d({}, 0), at(0, 'n1:dusk'))).toBeNull()
  })
})

describe('pendingWin', () => {
  const k = makeSetup(['killer', 'villager', 'villager'])
  const derived = deriveGame(k, { 'n1:killer': t('p2') }, 1)

  it('holds the latest passed checkpoint', () => {
    expect(pendingWin(derived, at(1, 'd1:discussion'))).toBe('killers')
  })

  it('ignores a checkpoint not yet passed', () => {
    expect(pendingWin(derived, at(1, 'd1:morning'))).toBeNull()
  })
})

describe('aliveAt', () => {
  const inputs: Record<string, StepInput> = {
    'n1:killer': t('p3'),
    'd1:execution': { kind: 'execution', targetId: 'p4' },
  }

  it('keeps night deaths hidden during the night', () => {
    expect(aliveAt(d(inputs, 0), at(0, 'n1:doctor'), false)).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('uses the morning state during the day', () => {
    expect(aliveAt(d(inputs, 1), at(1, 'd1:execution'), false)).toEqual(['p1', 'p2', 'p4'])
  })

  it('applies the execution once the game ended on it', () => {
    expect(aliveAt(d(inputs, 1), at(1, 'd1:execution'), true)).toEqual(['p1', 'p2'])
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm vitest run src/domain/navigation.test.ts`
Expected: FAIL, cannot resolve `./navigation`.

- [ ] **Step 3: Implement**

`src/domain/navigation.ts`:

```ts
import type { DerivedGame, DerivedPhase } from './derive'
import { firstStepId } from './timeline'
import type { Cursor, Step, Winner } from './types'

export const stepIndex = (phase: DerivedPhase, stepId: string) =>
  Math.max(0, phase.steps.findIndex((s) => s.id === stepId))

export function currentStep(derived: DerivedGame, cursor: Cursor): Step {
  const phase = derived.phases[cursor.phase]
  return phase.steps[stepIndex(phase, cursor.stepId)]
}

export const needsInput = (step: Step) =>
  step.kind === 'execution' || (step.kind === 'action' && step.actorIds.length > 0)

export type NextResult =
  | { ok: false }
  | { ok: true; cursor: Cursor; closesPhase: number | null; win: Winner | null }

export function next(derived: DerivedGame, cursor: Cursor): NextResult {
  const phase = derived.phases[cursor.phase]
  const i = stepIndex(phase, cursor.stepId)
  const step = phase.steps[i]
  if (needsInput(step) && !(step.id in derived.effective)) return { ok: false }
  const win =
    step.kind === 'morning'
      ? phase.day!.winAfterMorning
      : step.kind === 'execution'
        ? phase.day!.winAfterExecution
        : null
  if (i < phase.steps.length - 1) {
    const cursorNext = { phase: cursor.phase, stepId: phase.steps[i + 1].id }
    return { ok: true, cursor: cursorNext, closesPhase: null, win }
  }
  const following = cursor.phase + 1
  const cursorNext = { phase: following, stepId: firstStepId(following) }
  return { ok: true, cursor: cursorNext, closesPhase: cursor.phase, win }
}

export function back(
  derived: DerivedGame,
  cursor: Cursor,
): { cursor: Cursor; reopensPhase: number | null } | null {
  const phase = derived.phases[cursor.phase]
  const i = stepIndex(phase, cursor.stepId)
  if (i > 0) {
    return { cursor: { phase: cursor.phase, stepId: phase.steps[i - 1].id }, reopensPhase: null }
  }
  if (cursor.phase === 0) return null
  const previous = derived.phases[cursor.phase - 1]
  return {
    cursor: { phase: previous.index, stepId: previous.steps[previous.steps.length - 1].id },
    reopensPhase: previous.index,
  }
}

export function pendingWin(derived: DerivedGame, cursor: Cursor): Winner | null {
  for (let p = cursor.phase; p >= 0; p--) {
    const phase = derived.phases[p]
    if (!phase.day) continue
    const position = p === cursor.phase ? stepIndex(phase, cursor.stepId) : Infinity
    const execution = phase.steps.findIndex((s) => s.kind === 'execution')
    if (position > execution) return phase.day.winAfterExecution
    if (position > 0) return phase.day.winAfterMorning
  }
  return null
}

export function aliveAt(derived: DerivedGame, cursor: Cursor, ended: boolean): string[] {
  const phase = derived.phases[cursor.phase]
  if (!phase.day) return phase.aliveAtStart
  return ended && currentStep(derived, cursor).kind === 'execution'
    ? phase.aliveAtEnd
    : phase.day.aliveAfterMorning
}
```

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run src/domain/navigation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "Add cursor navigation and checkpoint wins"
```

---

### Task 8: Histories and timer arithmetic

**Files:**
- Create: `src/domain/history.ts`, `src/domain/timer.ts`
- Test: `src/domain/history.test.ts`, `src/domain/timer.test.ts`

**Interfaces:**
- Consumes: `DerivedGame`, `Attack`, `deriveGame` (Task 6), `stepIndex` (Task 7), `isSuspicious` (Task 2), `stepId` (Task 2), types.
- Produces (history.ts):

```ts
interface GraveEntry { playerId: string; cause: 'night' | 'execution' }
interface GraveDay { phase: number; entries: GraveEntry[] }
function graveyard(derived: DerivedGame, cursor: Cursor, ended: boolean): GraveDay[]

type LogEntry =
  | { kind: 'action'; stepId: string; roleId: string; actorIds: string[]; targetId: string | null; suspicious: boolean | null }
  | { kind: 'vest'; stepId: string; playerId: string; use: boolean }
  | { kind: 'attack'; attack: Attack }
  | { kind: 'adjustment'; playerId: string; dead: boolean }
  | { kind: 'execution'; targetId: string | null }
interface LogPhase { phase: number; entries: LogEntry[] }
function narratorLog(setup: GameSetup, derived: DerivedGame, cursor: Cursor, ended: boolean): LogPhase[]

type ChronicleEntry =
  | { kind: 'saved'; playerId: string; by: 'protect' | 'vest'; protectorRoleId: string | null }
  | { kind: 'killerKilledKiller'; playerId: string }
  | { kind: 'died'; playerId: string }
  | { kind: 'executed'; playerId: string }
  | { kind: 'noExecution' }
interface ChroniclePhase { phase: number; entries: ChronicleEntry[] }
function chronicle(setup: GameSetup, derived: DerivedGame, cursor: Cursor): ChroniclePhase[]   // ended games only; empty phases omitted

function individualWinners(setup: GameSetup, derived: DerivedGame, finalAlive: string[]): string[]
```

- Produces (timer.ts): `IDLE_TIMER: TimerState`, `elapsedMs(t, now)`, `startTimer(t, now)`, `pauseTimer(t, now)`.

- [ ] **Step 1: Write failing history tests**

`src/domain/history.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { deriveGame } from './derive'
import { makeSetup, t } from './fixtures'
import { chronicle, graveyard, individualWinners, narratorLog } from './history'
import type { StepInput } from './types'

// p1 killer, p2 doctor, p3 detective, p4 villager, p5 villager
const s = makeSetup(['killer', 'doctor', 'detective', 'villager', 'villager'])
const inputs: Record<string, StepInput> = {
  'n1:killer': t('p5'),
  'n1:doctor': t('p4'),
  'n1:detective': t('p1'),
  'd1:execution': { kind: 'execution', targetId: 'p1' },
}
const at = (phase: number, stepId: string) => ({ phase, stepId })

describe('graveyard', () => {
  it('shows night deaths from the morning but hides a pending execution', () => {
    expect(graveyard(deriveGame(s, inputs, 1), at(1, 'd1:discussion'), false)).toEqual([
      { phase: 1, entries: [{ playerId: 'p5', cause: 'night' }] },
    ])
  })

  it('includes the execution once the day is closed', () => {
    expect(graveyard(deriveGame(s, inputs, 2), at(2, 'n2:dusk'), false)).toEqual([
      {
        phase: 1,
        entries: [
          { playerId: 'p5', cause: 'night' },
          { playerId: 'p1', cause: 'execution' },
        ],
      },
    ])
  })

  it('includes the execution the game ended on', () => {
    const days = graveyard(deriveGame(s, inputs, 1), at(1, 'd1:execution'), true)
    expect(days[0].entries).toContainEqual({ playerId: 'p1', cause: 'execution' })
  })
})

describe('narratorLog', () => {
  it('lists choices up to the cursor and hides open night outcomes', () => {
    const [night] = narratorLog(s, deriveGame(s, inputs, 0), at(0, 'n1:doctor'), false)
    expect(night.entries.map((e) => e.kind)).toEqual(['action', 'action'])
  })

  it('adds outcomes and investigation results once the night is closed', () => {
    const [night] = narratorLog(s, deriveGame(s, inputs, 1), at(1, 'd1:morning'), false)
    expect(night.entries).toContainEqual({
      kind: 'action',
      stepId: 'n1:detective',
      roleId: 'detective',
      actorIds: ['p3'],
      targetId: 'p1',
      suspicious: true,
    })
    expect(night.entries.filter((e) => e.kind === 'attack')).toHaveLength(1)
  })
})

describe('chronicle', () => {
  it('summarises saves and executions', () => {
    const saved: Record<string, StepInput> = { ...inputs, 'n1:killer': t('p4') }
    expect(chronicle(s, deriveGame(s, saved, 1), at(1, 'd1:execution'))).toEqual([
      {
        phase: 0,
        entries: [{ kind: 'saved', playerId: 'p4', by: 'protect', protectorRoleId: 'doctor' }],
      },
      { phase: 1, entries: [{ kind: 'executed', playerId: 'p1' }] },
    ])
  })

  it('calls out a killer killing another killer', () => {
    const k = makeSetup(['killer', 'killer', 'villager'], { killersKnowEachOther: false })
    const d = deriveGame(k, { 'n1:killer:p1': t('p2') }, 1)
    expect(chronicle(k, d, at(1, 'd1:morning'))).toEqual([
      { phase: 0, entries: [{ kind: 'killerKilledKiller', playerId: 'p2' }] },
      { phase: 1, entries: [{ kind: 'died', playerId: 'p2' }] },
    ])
  })
})

describe('individualWinners', () => {
  it('lists executed jesters and living survivors', () => {
    const n = makeSetup(['killer', 'jester', 'survivor', 'villager'])
    const d = deriveGame(n, { 'd1:execution': { kind: 'execution', targetId: 'p2' } }, 1)
    expect(individualWinners(n, d, ['p1', 'p3', 'p4'])).toEqual(['p2', 'p3'])
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm vitest run src/domain/history.test.ts`
Expected: FAIL, cannot resolve `./history`.

- [ ] **Step 3: Implement histories**

`src/domain/history.ts`:

```ts
import type { Attack, DerivedGame } from './derive'
import { stepIndex } from './navigation'
import { isSuspicious } from './roles'
import { stepId } from './timeline'
import type { Cursor, GameSetup } from './types'

export interface GraveEntry {
  playerId: string
  cause: 'night' | 'execution'
}

export interface GraveDay {
  phase: number
  entries: GraveEntry[]
}

export type LogEntry =
  | {
      kind: 'action'
      stepId: string
      roleId: string
      actorIds: string[]
      targetId: string | null
      suspicious: boolean | null
    }
  | { kind: 'vest'; stepId: string; playerId: string; use: boolean }
  | { kind: 'attack'; attack: Attack }
  | { kind: 'adjustment'; playerId: string; dead: boolean }
  | { kind: 'execution'; targetId: string | null }

export interface LogPhase {
  phase: number
  entries: LogEntry[]
}

export type ChronicleEntry =
  | { kind: 'saved'; playerId: string; by: 'protect' | 'vest'; protectorRoleId: string | null }
  | { kind: 'killerKilledKiller'; playerId: string }
  | { kind: 'died'; playerId: string }
  | { kind: 'executed'; playerId: string }
  | { kind: 'noExecution' }

export interface ChroniclePhase {
  phase: number
  entries: ChronicleEntry[]
}

function progress(derived: DerivedGame, cursor: Cursor, ended: boolean) {
  const position = (phase: number, id: string) =>
    phase * 1000 + stepIndex(derived.phases[phase], id)
  const current = position(cursor.phase, cursor.stepId)
  return {
    reached: (phase: number, id: string) => position(phase, id) <= current,
    passed: (phase: number, id: string) =>
      position(phase, id) < current || (ended && position(phase, id) === current),
  }
}

const roleOfPlayer = (setup: GameSetup, id: string) =>
  setup.roles[setup.players.find((p) => p.id === id)!.roleId]

export function graveyard(derived: DerivedGame, cursor: Cursor, ended: boolean): GraveDay[] {
  const { passed } = progress(derived, cursor, ended)
  return derived.phases.flatMap((p) => {
    if (!p.day) return []
    const night = p.day.announced.map((playerId) => ({ playerId, cause: 'night' as const }))
    const executed =
      p.day.executedId !== null && passed(p.index, stepId(p.index, 'execution'))
        ? [{ playerId: p.day.executedId, cause: 'execution' as const }]
        : []
    return [{ phase: p.index, entries: [...night, ...executed] }]
  })
}

export function narratorLog(
  setup: GameSetup,
  derived: DerivedGame,
  cursor: Cursor,
  ended: boolean,
): LogPhase[] {
  const { reached, passed } = progress(derived, cursor, ended)
  return derived.phases.map((p) => {
    const entries: LogEntry[] = []
    if (p.night) {
      for (const step of p.steps) {
        if (step.kind !== 'action' || !reached(p.index, step.id)) continue
        const input = derived.effective[step.id]
        if (input?.kind === 'vest') {
          entries.push({ kind: 'vest', stepId: step.id, playerId: step.ownerId!, use: input.use })
        }
        if (input?.kind === 'target') {
          const investigates = setup.roles[step.roleId].action === 'investigate'
          entries.push({
            kind: 'action',
            stepId: step.id,
            roleId: step.roleId,
            actorIds: step.actorIds,
            targetId: input.targetId,
            suspicious:
              investigates && input.targetId
                ? isSuspicious(roleOfPlayer(setup, input.targetId))
                : null,
          })
        }
      }
      // Attack results can still change until the night is closed.
      if (p.index < cursor.phase || ended) {
        entries.push(...p.night.attacks.map((attack) => ({ kind: 'attack' as const, attack })))
      }
    }
    if (p.day) {
      entries.push(...p.day.adjustments.map((a) => ({ kind: 'adjustment' as const, ...a })))
      if (passed(p.index, stepId(p.index, 'execution'))) {
        entries.push({ kind: 'execution', targetId: p.day.executedId })
      }
    }
    return { phase: p.index, entries }
  })
}

export function chronicle(setup: GameSetup, derived: DerivedGame, cursor: Cursor): ChroniclePhase[] {
  const { passed } = progress(derived, cursor, true)
  const stepRole = new Map(
    derived.phases.flatMap((p) =>
      p.steps.flatMap((s) => (s.kind === 'action' ? [[s.id, setup.roles[s.roleId]] as const] : [])),
    ),
  )

  return derived.phases
    .map((p) => {
      const entries: ChronicleEntry[] = []
      for (const attack of p.night?.attacks ?? []) {
        const saved = entries.some((e) => e.kind === 'saved' && e.playerId === attack.targetId)
        if (attack.result === 'protected' && !saved) {
          const protectors = attack.protectedBy.map((id) => stepRole.get(id))
          const vest = protectors.some((r) => r?.action === 'vest')
          entries.push({
            kind: 'saved',
            playerId: attack.targetId,
            by: vest ? 'vest' : 'protect',
            protectorRoleId: vest ? null : (protectors[0]?.id ?? null),
          })
        }
        if (
          attack.result === 'killed' &&
          setup.roles[attack.roleId].faction === 'killers' &&
          roleOfPlayer(setup, attack.targetId).faction === 'killers'
        ) {
          entries.push({ kind: 'killerKilledKiller', playerId: attack.targetId })
        }
      }
      if (p.day) {
        entries.push(...p.day.announced.map((playerId) => ({ kind: 'died' as const, playerId })))
        if (passed(p.index, stepId(p.index, 'execution'))) {
          entries.push(
            p.day.executedId
              ? { kind: 'executed', playerId: p.day.executedId }
              : { kind: 'noExecution' },
          )
        }
      }
      return { phase: p.index, entries }
    })
    .filter((p) => p.entries.length > 0)
}

export function individualWinners(
  setup: GameSetup,
  derived: DerivedGame,
  finalAlive: string[],
): string[] {
  const executed = new Set(
    derived.phases.flatMap((p) => (p.day?.executedId ? [p.day.executedId] : [])),
  )
  return setup.players
    .filter((p) => {
      const goal = setup.roles[p.roleId].neutralGoal
      return (
        (goal === 'executed' && executed.has(p.id)) ||
        (goal === 'survive' && finalAlive.includes(p.id))
      )
    })
    .map((p) => p.id)
}
```

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run src/domain/history.test.ts`
Expected: PASS.

- [ ] **Step 5: Write failing timer tests**

`src/domain/timer.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { IDLE_TIMER, elapsedMs, pauseTimer, startTimer } from './timer'

describe('timer', () => {
  it('accumulates across pauses', () => {
    const running = startTimer(IDLE_TIMER, 1000)
    expect(elapsedMs(running, 4000)).toBe(3000)
    const paused = pauseTimer(running, 4000)
    expect(elapsedMs(paused, 9000)).toBe(3000)
    expect(elapsedMs(startTimer(paused, 10_000), 11_000)).toBe(4000)
  })

  it('ignores a second start', () => {
    const running = startTimer(IDLE_TIMER, 1000)
    expect(startTimer(running, 5000)).toBe(running)
  })

  it('never runs backwards when the clock jumps back', () => {
    expect(elapsedMs(startTimer(IDLE_TIMER, 5000), 1000)).toBe(0)
  })
})
```

- [ ] **Step 6: Run to see it fail**

Run: `pnpm vitest run src/domain/timer.test.ts`
Expected: FAIL, cannot resolve `./timer`.

- [ ] **Step 7: Implement timer**

`src/domain/timer.ts`:

```ts
import type { TimerState } from './types'

export const IDLE_TIMER: TimerState = { startedAt: null, accumulatedMs: 0 }

export const elapsedMs = (t: TimerState, now: number) =>
  t.accumulatedMs + (t.startedAt === null ? 0 : Math.max(0, now - t.startedAt))

export const startTimer = (t: TimerState, now: number): TimerState =>
  t.startedAt !== null ? t : { ...t, startedAt: now }

export const pauseTimer = (t: TimerState, now: number): TimerState =>
  t.startedAt === null ? t : { startedAt: null, accumulatedMs: elapsedMs(t, now) }
```

- [ ] **Step 8: Run all tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/domain
git commit -m "Add graveyard, narrator log, chronicle and timer math"
```

---

### Task 9: IndexedDB storage and write queue

**Files:**
- Create: `src/storage/db.ts`, `src/storage/repo.ts`, `src/storage/writeQueue.ts`
- Test: `src/storage/repo.test.ts`, `src/storage/writeQueue.test.ts`

**Interfaces:**
- Consumes: `Game`, `RoleDef` (Task 2), `SetupDraft` (Task 3), `BUILT_IN_ORDER` (Task 2), `makeSetup` (fixtures).
- Produces (db.ts): `Prefs { activeGameId: string | null; nightOrder: string[]; lastSetup: SetupDraft | null; knownPlayers: string[] }`, `Db`, `openDb(name?: string): Promise<Db>`.
- Produces (repo.ts): `DEFAULT_PREFS: Prefs`, `loadPrefs(db): Promise<Prefs>`, `savePref(db, key, value)`, `loadGame(db, id): Promise<Game | undefined>`, `saveGame(db, game)`, `loadCustomRoles(db): Promise<RoleDef[]>`, `saveCustomRole(db, role)`, `deleteCustomRole(db, id)`.
- Produces (writeQueue.ts): `WriteQueue<T> { push(value: T): void; flush(): Promise<void> }`, `createWriteQueue<T>(write: (value: T) => Promise<unknown>, onResult: (ok: boolean) => void): WriteQueue<T>`.

- [ ] **Step 1: Install dependencies**

```bash
pnpm add idb
pnpm add -D fake-indexeddb
```

- [ ] **Step 2: Write failing write queue tests**

`src/storage/writeQueue.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createWriteQueue } from './writeQueue'

describe('createWriteQueue', () => {
  it('coalesces to the latest value while a write is running', async () => {
    const written: number[] = []
    const queue = createWriteQueue(
      async (value: number) => {
        written.push(value)
      },
      () => {},
    )
    queue.push(1)
    queue.push(2)
    queue.push(3)
    await queue.flush()
    expect(written).toEqual([1, 3])
  })

  it('reports failures and keeps writing', async () => {
    const results: boolean[] = []
    const queue = createWriteQueue(
      async (value: number) => {
        if (value === 1) throw new Error('quota')
      },
      (ok) => results.push(ok),
    )
    queue.push(1)
    await queue.flush()
    queue.push(2)
    await queue.flush()
    expect(results).toEqual([false, true])
  })

  it('flushes immediately when idle', async () => {
    await expect(createWriteQueue(async () => {}, () => {}).flush()).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 3: Run to see it fail**

Run: `pnpm vitest run src/storage/writeQueue.test.ts`
Expected: FAIL, cannot resolve `./writeQueue`.

- [ ] **Step 4: Implement the queue**

`src/storage/writeQueue.ts`:

```ts
export interface WriteQueue<T> {
  push(value: T): void
  flush(): Promise<void>
}

export function createWriteQueue<T>(
  write: (value: T) => Promise<unknown>,
  onResult: (ok: boolean) => void,
): WriteQueue<T> {
  let pending: { value: T } | null = null
  let running: Promise<void> | null = null

  async function drain() {
    while (pending) {
      const { value } = pending
      pending = null
      try {
        await write(value)
        onResult(true)
      } catch {
        onResult(false)
      }
    }
    running = null
  }

  return {
    push(value) {
      pending = { value }
      running ??= drain()
    },
    flush: () => running ?? Promise.resolve(),
  }
}
```

- [ ] **Step 5: Run to see it pass**

Run: `pnpm vitest run src/storage/writeQueue.test.ts`
Expected: PASS.

- [ ] **Step 6: Write failing repository tests**

`src/storage/repo.test.ts`:

```ts
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { ROLES, makeSetup } from '@/domain/fixtures'
import type { Game } from '@/domain/types'
import { openDb } from './db'
import {
  DEFAULT_PREFS,
  deleteCustomRole,
  loadCustomRoles,
  loadGame,
  loadPrefs,
  saveCustomRole,
  saveGame,
  savePref,
} from './repo'

const fresh = () => openDb(`test-${crypto.randomUUID()}`)

const game: Game = {
  schemaVersion: 1,
  id: 'g1',
  createdAt: 1,
  updatedAt: 2,
  setup: makeSetup(['killer', 'villager']),
  inputs: { 'n1:killer': { kind: 'target', targetId: 'p2' } },
  cursor: { phase: 0, stepId: 'n1:killer' },
  timers: { 'n1:killer': { startedAt: 5, accumulatedMs: 0 } },
  ending: null,
}

describe('repo', () => {
  it('round-trips a game', async () => {
    const db = await fresh()
    await saveGame(db, game)
    expect(await loadGame(db, 'g1')).toEqual(game)
  })

  it('falls back to defaults for prefs never written', async () => {
    const db = await fresh()
    await savePref(db, 'knownPlayers', ['Anna'])
    expect(await loadPrefs(db)).toEqual({ ...DEFAULT_PREFS, knownPlayers: ['Anna'] })
  })

  it('keeps an explicitly cleared active game id', async () => {
    const db = await fresh()
    await savePref(db, 'activeGameId', 'g1')
    await savePref(db, 'activeGameId', null)
    expect((await loadPrefs(db)).activeGameId).toBeNull()
  })

  it('stores and deletes custom roles', async () => {
    const db = await fresh()
    const witch = { ...ROLES.villager, id: 'witch', builtIn: false, action: 'other' as const }
    await saveCustomRole(db, witch)
    expect(await loadCustomRoles(db)).toEqual([witch])
    await deleteCustomRole(db, 'witch')
    expect(await loadCustomRoles(db)).toEqual([])
  })
})
```

- [ ] **Step 7: Run to see it fail**

Run: `pnpm vitest run src/storage/repo.test.ts`
Expected: FAIL, cannot resolve `./db`.

- [ ] **Step 8: Implement schema and repository**

`src/storage/db.ts`:

```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { SetupDraft } from '@/domain/setup'
import type { Game, RoleDef } from '@/domain/types'

export interface Prefs {
  activeGameId: string | null
  nightOrder: string[]
  lastSetup: SetupDraft | null
  knownPlayers: string[]
}

interface Schema extends DBSchema {
  games: { key: string; value: Game }
  customRoles: { key: string; value: RoleDef }
  prefs: { key: keyof Prefs; value: Prefs[keyof Prefs] }
}

export type Db = IDBPDatabase<Schema>

export function openDb(name = 'duskwarden'): Promise<Db> {
  return openDB<Schema>(name, 1, {
    upgrade(db, oldVersion) {
      // One block per released version. Never edit a released block; append a new one.
      if (oldVersion < 1) {
        db.createObjectStore('games', { keyPath: 'id' })
        db.createObjectStore('customRoles', { keyPath: 'id' })
        db.createObjectStore('prefs')
      }
    },
  })
}
```

`src/storage/repo.ts`:

```ts
import { BUILT_IN_ORDER } from '@/domain/roles'
import type { Game, RoleDef } from '@/domain/types'
import type { Db, Prefs } from './db'

export const DEFAULT_PREFS: Prefs = {
  activeGameId: null,
  nightOrder: BUILT_IN_ORDER,
  lastSetup: null,
  knownPlayers: [],
}

const PREF_KEYS = Object.keys(DEFAULT_PREFS) as (keyof Prefs)[]

export async function loadPrefs(db: Db): Promise<Prefs> {
  const store = db.transaction('prefs').store
  const values = await Promise.all(PREF_KEYS.map((key) => store.get(key)))
  return Object.fromEntries(
    PREF_KEYS.map((key, i) => [key, values[i] === undefined ? DEFAULT_PREFS[key] : values[i]]),
  ) as unknown as Prefs
}

export const savePref = <K extends keyof Prefs>(db: Db, key: K, value: Prefs[K]) =>
  db.put('prefs', value, key)

export const loadGame = (db: Db, id: string) => db.get('games', id)
export const saveGame = (db: Db, game: Game) => db.put('games', game)
export const loadCustomRoles = (db: Db) => db.getAll('customRoles')
export const saveCustomRole = (db: Db, role: RoleDef) => db.put('customRoles', role)
export const deleteCustomRole = (db: Db, id: string) => db.delete('customRoles', id)
```

- [ ] **Step 9: Run all tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Add IndexedDB repository and coalescing write queue"
```

---

### Task 10: App store, bootstrap and React bindings

**Files:**
- Create: `src/lib/random.ts`, `src/store/appStore.ts`, `src/store/bootstrap.ts`, `src/store/hooks.tsx`, `src/ui/hooks/useNow.ts`, `src/ui/hooks/useStepTimer.ts`
- Modify: `src/main.tsx`
- Test: `src/store/appStore.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–9.
- Produces (random.ts): `newId(): string`, `random(): number`.
- Produces (appStore.ts):

```ts
type Screen = 'home' | 'setup' | 'library' | 'game'
interface AppState { screen: Screen; game: Game | null; customRoles: RoleDef[]; prefs: Prefs; saveFailed: boolean }
interface AppActions {
  goto(screen: Screen): void
  updateDraft(draft: SetupDraft): void
  forgetPlayer(name: string): void
  startGame(draft: SetupDraft, players: Player[], nightOrder: string[]): void
  setInput(stepId: string, input: StepInput): void
  moveCursor(cursor: Cursor): void
  timer(stepId: string, op: 'start' | 'pause' | 'reset'): void
  endGame(winner: Winner, manual: boolean): void
  resumeGame(): void
  saveCustomRole(role: RoleDef): void
  deleteCustomRole(id: string): void
  flush(): Promise<void>
}
type App = AppState & AppActions
interface Deps { db: Db | null; now(): number; newId(): string; requestPersist(): void }
interface InitialState { game: Game | null; customRoles: RoleDef[]; prefs: Prefs; saveFailed?: boolean }
function createAppStore(deps: Deps, initial: InitialState): AppStore   // zustand vanilla StoreApi<App>
```

- Produces (bootstrap.ts): `bootstrap(dbName?: string): Promise<AppStore>`.
- Produces (hooks.tsx): `StoreProvider`, `useApp<T>(selector: (s: App) => T): T`, `useActions(): AppActions` (stable), `useGame(): { game: Game; derived: DerivedGame }`.
- Produces (ui/hooks): `useNow(intervalMs: number | null): number`, `useStepTimer(stepId): { elapsed: number; running: boolean; idle: boolean; start(): void; pause(): void; reset(): void }`.

- [ ] **Step 1: Install Zustand**

```bash
pnpm add zustand
```

- [ ] **Step 2: Randomness and ids**

`src/lib/random.ts`:

```ts
// crypto.randomUUID needs a secure context; a phone testing the dev server over the LAN is plain http.
export const newId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')

export const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
```

- [ ] **Step 3: Write failing store tests**

`src/store/appStore.test.ts`:

```ts
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { BUILT_IN_ORDER, rolesById } from '@/domain/roles'
import { DEFAULT_SETTINGS, type SetupDraft } from '@/domain/setup'
import type { Player, RoleDef } from '@/domain/types'
import { openDb } from '@/storage/db'
import { DEFAULT_PREFS, loadGame, loadPrefs } from '@/storage/repo'
import { createAppStore, type Deps } from './appStore'
import { bootstrap } from './bootstrap'

const witch: RoleDef = {
  ...rolesById([]).villager,
  id: 'witch',
  builtIn: false,
  name: 'Boszorkány',
  namePlural: 'boszorkányok',
  action: 'other',
  stepSeconds: 20,
}

const draft: SetupDraft = {
  names: ['Anna', 'Bence', 'Csilla'],
  roleCounts: { killer: 1, witch: 1, villager: 1 },
  settings: DEFAULT_SETTINGS,
}

const players: Player[] = [
  { id: 'a', name: 'Anna', seat: 1, roleId: 'killer' },
  { id: 'b', name: 'Bence', seat: 2, roleId: 'witch' },
  { id: 'c', name: 'Csilla', seat: 3, roleId: 'villager' },
]

async function setup(overrides: Partial<Deps> = {}) {
  const name = `test-${crypto.randomUUID()}`
  const db = await openDb(name)
  let clock = 1000
  const store = createAppStore(
    { db, now: () => clock, newId: () => 'g1', requestPersist: () => {}, ...overrides },
    { game: null, customRoles: [witch], prefs: { ...DEFAULT_PREFS, knownPlayers: ['Dani', 'anna'] } },
  )
  const start = () => store.getState().startGame(draft, players, ['witch', 'killer'])
  return { db, name, store, start, tick: (ms: number) => (clock += ms) }
}

describe('app store', () => {
  it('starts a game on night 1', async () => {
    const { store, start } = await setup()
    start()
    const { game, screen } = store.getState()
    expect(screen).toBe('game')
    expect(game?.cursor).toEqual({ phase: 0, stepId: 'n1:dusk' })
    expect(Object.keys(game!.setup.roles).sort()).toEqual(['killer', 'villager', 'witch'])
  })

  it('keeps the role snapshot when the library changes', async () => {
    const { store, start } = await setup()
    start()
    store.getState().saveCustomRole({ ...witch, name: 'Javasasszony' })
    expect(store.getState().game!.setup.roles.witch.name).toBe('Boszorkány')
  })

  it('remembers players and the merged night order', async () => {
    const { db, store, start } = await setup()
    start()
    await store.getState().flush()
    const prefs = await loadPrefs(db)
    expect(prefs.knownPlayers).toEqual(['Anna', 'Bence', 'Csilla', 'Dani'])
    expect(prefs.nightOrder).toEqual([...BUILT_IN_ORDER, 'witch'])
    expect(prefs.activeGameId).toBe('g1')
    expect(prefs.lastSetup).toEqual(draft)
  })

  it('persists every game change', async () => {
    const { db, store, start } = await setup()
    start()
    store.getState().setInput('n1:killer', { kind: 'target', targetId: 'b' })
    store.getState().moveCursor({ phase: 0, stepId: 'n1:killer' })
    await store.getState().flush()
    expect(await loadGame(db, 'g1')).toEqual(store.getState().game)
  })

  it('runs timers on the injected clock', async () => {
    const { store, start, tick } = await setup()
    start()
    store.getState().timer('n1:killer', 'start')
    tick(5000)
    store.getState().timer('n1:killer', 'pause')
    expect(store.getState().game!.timers['n1:killer']).toEqual({ startedAt: null, accumulatedMs: 5000 })
  })

  it('ends and resumes a game', async () => {
    const { store, start } = await setup()
    start()
    store.getState().endGame('town', true)
    expect(store.getState().game!.ending).toEqual({ winner: 'town', manual: true, phase: 0 })
    store.getState().resumeGame()
    expect(store.getState().game!.ending).toBeNull()
  })

  it('restores the active game on bootstrap', async () => {
    const { name, store, start } = await setup()
    start()
    await store.getState().flush()
    const restored = (await bootstrap(name)).getState()
    expect(restored.screen).toBe('game')
    expect(restored.game?.id).toBe('g1')
  })

  it('flags failed saves and keeps playing in memory', async () => {
    const { store, start } = await setup({ db: null })
    start()
    await store.getState().flush()
    expect(store.getState().saveFailed).toBe(true)
    expect(store.getState().game?.id).toBe('g1')
  })
})
```

- [ ] **Step 4: Run to see it fail**

Run: `pnpm vitest run src/store/appStore.test.ts`
Expected: FAIL, cannot resolve `./appStore`.

- [ ] **Step 5: Implement the store**

`src/store/appStore.ts`:

```ts
import { createStore } from 'zustand/vanilla'
import { rolesById } from '@/domain/roles'
import { mergeNightOrder, rememberPlayers, type SetupDraft } from '@/domain/setup'
import { firstStepId } from '@/domain/timeline'
import { IDLE_TIMER, pauseTimer, startTimer } from '@/domain/timer'
import type { Cursor, Game, Player, RoleDef, StepInput, Winner } from '@/domain/types'
import type { Db, Prefs } from '@/storage/db'
import * as repo from '@/storage/repo'
import { createWriteQueue, type WriteQueue } from '@/storage/writeQueue'

export type Screen = 'home' | 'setup' | 'library' | 'game'

export interface AppState {
  screen: Screen
  game: Game | null
  customRoles: RoleDef[]
  prefs: Prefs
  saveFailed: boolean
}

export interface AppActions {
  goto(screen: Screen): void
  updateDraft(draft: SetupDraft): void
  forgetPlayer(name: string): void
  startGame(draft: SetupDraft, players: Player[], nightOrder: string[]): void
  setInput(stepId: string, input: StepInput): void
  moveCursor(cursor: Cursor): void
  timer(stepId: string, op: 'start' | 'pause' | 'reset'): void
  endGame(winner: Winner, manual: boolean): void
  resumeGame(): void
  saveCustomRole(role: RoleDef): void
  deleteCustomRole(id: string): void
  flush(): Promise<void>
}

export type App = AppState & AppActions

export interface Deps {
  db: Db | null
  now(): number
  newId(): string
  requestPersist(): void
}

export interface InitialState {
  game: Game | null
  customRoles: RoleDef[]
  prefs: Prefs
  saveFailed?: boolean
}

export function createAppStore(deps: Deps, initial: InitialState) {
  const requireDb = () => {
    if (!deps.db) throw new Error('IndexedDB is unavailable')
    return deps.db
  }
  let report: (ok: boolean) => void = () => {}
  const gameQueue = createWriteQueue<Game>((game) => repo.saveGame(requireDb(), game), (ok) => report(ok))
  const prefQueues = new Map<keyof Prefs, WriteQueue<Prefs[keyof Prefs]>>()
  const prefQueue = (key: keyof Prefs) => {
    let queue = prefQueues.get(key)
    if (!queue) {
      queue = createWriteQueue((value) => repo.savePref(requireDb(), key, value), (ok) => report(ok))
      prefQueues.set(key, queue)
    }
    return queue
  }
  const writeNow = (op: (db: Db) => Promise<unknown>) =>
    void (async () => {
      try {
        await op(requireDb())
        report(true)
      } catch {
        report(false)
      }
    })()

  const store = createStore<App>()((set, get) => {
    const patchGame = (patch: (game: Game) => Partial<Game>) => {
      const { game } = get()
      if (game) set({ game: { ...game, ...patch(game), updatedAt: deps.now() } })
    }
    const patchPrefs = (patch: Partial<Prefs>) => set({ prefs: { ...get().prefs, ...patch } })

    return {
      screen: initial.game ? 'game' : 'home',
      game: initial.game,
      customRoles: initial.customRoles,
      prefs: initial.prefs,
      saveFailed: initial.saveFailed ?? false,

      goto: (screen) => set({ screen }),
      updateDraft: (draft) => patchPrefs({ lastSetup: draft }),
      forgetPlayer: (name) =>
        patchPrefs({ knownPlayers: get().prefs.knownPlayers.filter((n) => n !== name) }),

      startGame: (draft, players, nightOrder) => {
        const library = rolesById(get().customRoles)
        const roleIds = [...new Set(players.map((p) => p.roleId))]
        const now = deps.now()
        const game: Game = {
          schemaVersion: 1,
          id: deps.newId(),
          createdAt: now,
          updatedAt: now,
          setup: {
            players,
            roles: Object.fromEntries(roleIds.map((id) => [id, library[id]])),
            nightOrder,
            settings: draft.settings,
          },
          inputs: {},
          cursor: { phase: 0, stepId: firstStepId(0) },
          timers: {},
          ending: null,
        }
        const { prefs } = get()
        set({
          game,
          screen: 'game',
          prefs: {
            ...prefs,
            activeGameId: game.id,
            lastSetup: draft,
            nightOrder: mergeNightOrder(prefs.nightOrder, nightOrder),
            knownPlayers: rememberPlayers(prefs.knownPlayers, players.map((p) => p.name)),
          },
        })
        deps.requestPersist()
      },

      setInput: (stepId, input) => patchGame((g) => ({ inputs: { ...g.inputs, [stepId]: input } })),
      moveCursor: (cursor) => patchGame(() => ({ cursor })),
      timer: (stepId, op) =>
        patchGame((g) => {
          const current = g.timers[stepId] ?? IDLE_TIMER
          const now = deps.now()
          const updated =
            op === 'start'
              ? startTimer(current, now)
              : op === 'pause'
                ? pauseTimer(current, now)
                : IDLE_TIMER
          return { timers: { ...g.timers, [stepId]: updated } }
        }),
      endGame: (winner, manual) =>
        patchGame((g) => ({ ending: { winner, manual, phase: g.cursor.phase } })),
      resumeGame: () => patchGame(() => ({ ending: null })),

      saveCustomRole: (role) => {
        set({ customRoles: [...get().customRoles.filter((r) => r.id !== role.id), role] })
        writeNow((db) => repo.saveCustomRole(db, role))
      },
      deleteCustomRole: (id) => {
        set({ customRoles: get().customRoles.filter((r) => r.id !== id) })
        writeNow((db) => repo.deleteCustomRole(db, id))
      },
      flush: async () => {
        await Promise.all([gameQueue.flush(), ...[...prefQueues.values()].map((q) => q.flush())])
      },
    }
  })

  report = (ok) => {
    if (store.getState().saveFailed === ok) store.setState({ saveFailed: !ok })
  }

  store.subscribe((state, prev) => {
    if (state.game && state.game !== prev.game) gameQueue.push(state.game)
    for (const key of Object.keys(state.prefs) as (keyof Prefs)[]) {
      if (state.prefs[key] !== prev.prefs[key]) prefQueue(key).push(state.prefs[key])
    }
  })

  return store
}

export type AppStore = ReturnType<typeof createAppStore>
```

`src/store/bootstrap.ts`:

```ts
import { newId } from '@/lib/random'
import { openDb, type Db } from '@/storage/db'
import { DEFAULT_PREFS, loadCustomRoles, loadGame, loadPrefs } from '@/storage/repo'
import { createAppStore, type InitialState } from './appStore'

async function load(db: Db): Promise<InitialState> {
  const prefs = await loadPrefs(db)
  const customRoles = await loadCustomRoles(db)
  const game = prefs.activeGameId ? ((await loadGame(db, prefs.activeGameId)) ?? null) : null
  return { prefs, customRoles, game }
}

export async function bootstrap(dbName?: string) {
  const deps = {
    now: () => Date.now(),
    newId,
    requestPersist: () => void navigator.storage?.persist?.(),
  }
  try {
    const db = await openDb(dbName)
    return createAppStore({ ...deps, db }, await load(db))
  } catch {
    const empty = { prefs: DEFAULT_PREFS, customRoles: [], game: null, saveFailed: true }
    return createAppStore({ ...deps, db: null }, empty)
  }
}
```

- [ ] **Step 6: Run to see it pass**

Run: `pnpm vitest run src/store/appStore.test.ts`
Expected: PASS.

- [ ] **Step 7: React bindings**

`src/store/hooks.tsx`:

```tsx
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useStore } from 'zustand'
import { deriveGame } from '@/domain/derive'
import type { App, AppActions, AppStore } from './appStore'

const StoreContext = createContext<AppStore | null>(null)

export function StoreProvider({ store, children }: { store: AppStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

function useAppStore(): AppStore {
  const store = useContext(StoreContext)
  if (!store) throw new Error('StoreProvider is missing')
  return store
}

// Selectors must return stable references; zustand v5 loops on a fresh object per call.
export const useApp = <T,>(selector: (state: App) => T): T => useStore(useAppStore(), selector)

// Actions are created once, so the first state object carries stable function references.
export function useActions(): AppActions {
  const store = useAppStore()
  return useMemo(() => store.getState(), [store])
}

export function useGame() {
  const game = useApp((s) => s.game)
  const derived = useMemo(
    () => (game ? deriveGame(game.setup, game.inputs, game.cursor.phase) : null),
    [game],
  )
  if (!game || !derived) throw new Error('No active game')
  return { game, derived }
}
```

`src/ui/hooks/useNow.ts`:

```ts
import { useEffect, useState } from 'react'

export function useNow(intervalMs: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (intervalMs === null) return
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
```

`src/ui/hooks/useStepTimer.ts`:

```ts
import { useCallback } from 'react'
import { IDLE_TIMER, elapsedMs } from '@/domain/timer'
import { useActions, useApp } from '@/store/hooks'
import { useNow } from './useNow'

export function useStepTimer(stepId: string) {
  const timer = useApp((s) => s.game?.timers[stepId]) ?? IDLE_TIMER
  const actions = useActions()
  const running = timer.startedAt !== null
  const now = useNow(running ? 250 : null)
  const start = useCallback(() => actions.timer(stepId, 'start'), [actions, stepId])
  const pause = useCallback(() => actions.timer(stepId, 'pause'), [actions, stepId])
  const reset = useCallback(() => actions.timer(stepId, 'reset'), [actions, stepId])
  return {
    elapsed: elapsedMs(timer, now),
    running,
    idle: !running && timer.accumulatedMs === 0,
    start,
    pause,
    reset,
  }
}
```

- [ ] **Step 8: Boot the store before the first render**

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import { bootstrap } from '@/store/bootstrap'
import { StoreProvider } from '@/store/hooks'
import { App } from '@/ui/App'

void bootstrap().then((store) =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <StoreProvider store={store}>
        <App />
      </StoreProvider>
    </StrictMode>,
  ),
)
```

- [ ] **Step 9: Verify**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: all pass. The dev server still shows the Task 1 placeholder.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Add persisted app store and React bindings"
```

---

### Task 11: App shell, shared components and Home

**Files:**
- Create: `src/ui/hooks/useConfirm.tsx`, `src/ui/hooks/useBackGuard.ts`, `src/ui/components/HoldButton.tsx`, `src/ui/components/SaveFailedBanner.tsx`, `src/ui/components/ScreenHeader.tsx`, `src/ui/names.ts`, `src/ui/screens/HomeScreen.tsx`
- Modify: `src/ui/App.tsx`
- Install: `motion`

**Interfaces:**
- Consumes: `useApp`, `useActions` (Task 10), `deriveGame` (Task 6), `aliveAt` (Task 7), `phaseLabel`, `winnerLabel` (Task 2).
- Produces:

```ts
interface ConfirmRequest { title: string; body?: string; cancelLabel: string; confirmLabel: string; destructive?: boolean; onConfirm(): void; onCancel?(): void }
function useConfirm(): { ask(request: ConfirmRequest): void; dialog: ReactElement; isOpen: boolean; dismiss(): void }
function useBackGuard(onBack: () => void): void
function HoldButton(props: { onConfirm(): void; children: ReactNode; durationMs?: number }): ReactElement
function ScreenHeader(props: { title: string; onClose(): void; closeLabel: string; right?: ReactNode }): ReactElement
function playerById(setup: GameSetup, id: string): Player
function displayName(setup: GameSetup, id: string, masked: boolean): string   // masked → "#<seat>"
```

- [ ] **Step 1: Install motion**

```bash
pnpm add motion
```

- [ ] **Step 2: Confirm dialog hook**

`src/ui/hooks/useConfirm.tsx`:

```tsx
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/ui/primitives/alert-dialog'
import { cn } from '@/lib/utils'

export interface ConfirmRequest {
  title: string
  body?: string
  cancelLabel: string
  confirmLabel: string
  destructive?: boolean
  onConfirm(): void
  onCancel?(): void
}

export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  // A handler may open the next dialog before Radix reports the close; keep that newer request.
  const close = (closed: ConfirmRequest) =>
    setRequest((current) => (current === closed ? null : current))

  const dialog = (
    <AlertDialog open={request !== null} onOpenChange={(open) => !open && request && close(request)}>
      {request && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">{request.title}</AlertDialogTitle>
            {request.body && <AlertDialogDescription>{request.body}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-14" onClick={() => request.onCancel?.()}>
              {request.cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn('h-14', request.destructive && 'bg-destructive text-white')}
              onClick={() => request.onConfirm()}
            >
              {request.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  )

  return { ask: setRequest, dialog, isOpen: request !== null, dismiss: () => setRequest(null) }
}
```

- [ ] **Step 3: Back guard**

`src/ui/hooks/useBackGuard.ts`:

```ts
import { useEffect, useRef } from 'react'

export function useBackGuard(onBack: () => void) {
  const handler = useRef(onBack)
  useEffect(() => {
    handler.current = onBack
  })
  useEffect(() => {
    // Chrome skips history entries that never saw a user activation; the GM taps constantly, so ours stick.
    history.pushState({ duskwardenGuard: true }, '')
    const onPop = () => {
      history.pushState({ duskwardenGuard: true }, '')
      handler.current()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
}
```

- [ ] **Step 4: Hold-to-confirm button**

`src/ui/components/HoldButton.tsx`:

```tsx
import { useEffect, useRef, useState, type ReactNode } from 'react'

export function HoldButton({
  onConfirm,
  children,
  durationMs = 2000,
}: {
  onConfirm(): void
  children: ReactNode
  durationMs?: number
}) {
  const [progress, setProgress] = useState(0)
  const frame = useRef(0)

  const stop = () => {
    cancelAnimationFrame(frame.current)
    setProgress(0)
  }

  const start = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const begin = performance.now()
    const tick = (time: number) => {
      const value = Math.min(1, (time - begin) / durationMs)
      setProgress(value)
      if (value < 1) frame.current = requestAnimationFrame(tick)
      else {
        navigator.vibrate?.(50)
        onConfirm()
      }
    }
    frame.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      className="relative h-14 w-full touch-none select-none overflow-hidden rounded-xl border-2 border-destructive font-semibold text-destructive"
    >
      <span className="absolute inset-y-0 left-0 bg-destructive/30" style={{ width: `${progress * 100}%` }} />
      <span className="relative">{children}</span>
    </button>
  )
}
```

- [ ] **Step 5: Small shared pieces**

`src/ui/names.ts`:

```ts
import type { GameSetup, Player } from '@/domain/types'

export const playerById = (setup: GameSetup, id: string): Player =>
  setup.players.find((p) => p.id === id)!

export const displayName = (setup: GameSetup, id: string, masked: boolean) => {
  const player = playerById(setup, id)
  return masked ? `#${player.seat}` : player.name
}
```

`src/ui/components/SaveFailedBanner.tsx`: a `role="alert"` bar, `bg-blood/20 text-blood px-4 py-3 text-sm`, text: **"Nem sikerült menteni. Amíg ez az üzenet látszik, ne zárd be az alkalmazást!"**

`src/ui/components/ScreenHeader.tsx`: a sticky top bar (`sticky top-0 z-10 bg-background/95 backdrop-blur`, `h-16`, `px-2`) with an icon button on the left (lucide `X`, `aria-label={closeLabel}`, `size-14`), the title centered-left in `font-display text-xl`, and an optional `right` slot.

- [ ] **Step 6: Home screen**

`src/ui/screens/HomeScreen.tsx`. Behavior:

- Layout: full-height column, `px-4 py-10`. Top: lucide `MoonStar` icon (`size-16 text-primary`), title **"Duskwarden"** (`font-display text-5xl text-primary`), subtitle **"Mesélői segéd"** (`text-muted-foreground`). Bottom: stacked `h-14` buttons.
- **"Játék folytatása"** (primary, `h-16`, two lines) only when `game !== null`; second line is `gameStatus(game)`; click → `goto('game')`.
- **"Új játék"**: primary when there is no game, `secondary` otherwise. Click: if no game or the game has ended → `goto('setup')`. If a game is running → `ask({ title: 'Fut egy játék!', body: 'Ha újat kezdesz, a mostanit nem tudod majd folytatni.', cancelLabel: 'Mégse', confirmLabel: 'Tovább', onConfirm: () => setHolding(true) })`.
- Second gate: an `AlertDialog` open while `holding`: title **"Biztosan új játékot kezdesz?"**, description **"Tartsd lenyomva a megerősítéshez"**, a `HoldButton` labeled **"Új játék kezdése"** whose `onConfirm` closes the dialog and calls `goto('setup')`, and an `AlertDialogCancel` **"Mégse"** (`h-14`). The running game stays active until a new one actually starts.
- **"Szerepek"** (`ghost`) → `goto('library')`.

```ts
function gameStatus(game: Game): string {
  if (game.ending) return `Vége · ${winnerLabel(game.ending.winner, game.setup.roles)}`
  const derived = deriveGame(game.setup, game.inputs, game.cursor.phase)
  return `${phaseLabel(game.cursor.phase)} · ${aliveAt(derived, game.cursor, false).length} élő`
}
```

- [ ] **Step 7: App shell**

`src/ui/App.tsx`:

```tsx
import { MotionConfig } from 'motion/react'
import { useApp } from '@/store/hooks'
import { SaveFailedBanner } from '@/ui/components/SaveFailedBanner'
import { HomeScreen } from '@/ui/screens/HomeScreen'

export function App() {
  const screen = useApp((s) => s.screen)
  const saveFailed = useApp((s) => s.saveFailed)
  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
        {saveFailed && <SaveFailedBanner />}
        {screen === 'home' && <HomeScreen />}
      </div>
    </MotionConfig>
  )
}
```

Later tasks add one line each for their screen.

- [ ] **Step 8: Verify in the browser**

Run `pnpm lint && pnpm build`, start the dev server at 375×812. Expected: Home shows the title, subtitle, "Új játék" and "Szerepek"; no "Játék folytatása". The other buttons switch to screens that stay blank until their tasks land.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Add app shell, confirm dialogs, hold button and home screen"
```

---

### Task 12: Role library

**Files:**
- Create: `src/ui/labels.ts`, `src/ui/screens/library/LibraryScreen.tsx`, `src/ui/screens/library/RoleDetailsSheet.tsx`, `src/ui/screens/library/RoleEditor.tsx`, `src/ui/screens/library/roleDrafts.ts`
- Modify: `src/ui/App.tsx`

**Interfaces:**
- Consumes: `BUILT_IN_ROLES`, `isSuspicious` (Task 2), `defaultPrompt` (Task 2), `newId` (Task 10), `useApp`, `useActions`, `useConfirm`, `useBackGuard`, `ScreenHeader` (Task 11).
- Produces:

```ts
// labels.ts
const FACTION_LABEL: Record<Faction, string>        // town 'Város', killers 'Gyilkosok', neutral 'Semleges'
const ACTION_LABEL: Record<ActionKind, string>      // none 'Nem ébred', kill 'Öl', protect 'Véd', investigate 'Vizsgál', vest 'Golyóálló mellény', other 'Egyéb'
const GOAL_LABEL: Record<NeutralGoal, string>       // soloKiller 'Egyedül gyilkol', executed 'Azt akarja, hogy kivégezzék', survive 'Túlélni akar', none 'Nincs külön célja'
const FACTION_TONE: Record<Faction, string>         // Tailwind text classes: town 'text-foreground', killers 'text-blood', neutral 'text-primary'
// roleDrafts.ts
function blankRole(id: string): RoleDef
function copyOfRole(role: RoleDef, id: string): RoleDef
// RoleDetailsSheet.tsx
function RoleDetailsSheet(props: { role: RoleDef | null; onClose(): void; actions?: ReactNode }): ReactElement
```

- [ ] **Step 1: Labels and role drafts**

`src/ui/labels.ts` exports the four maps above with exactly those strings.

`src/ui/screens/library/roleDrafts.ts`:

```ts
import type { RoleDef } from '@/domain/types'

export const blankRole = (id: string): RoleDef => ({
  id,
  builtIn: false,
  name: '',
  namePlural: '',
  faction: 'town',
  action: 'other',
  description: '',
  stepSeconds: 20,
  constraints: { canTargetSelf: false, noRepeatTarget: false },
})

export const copyOfRole = (role: RoleDef, id: string): RoleDef => ({
  ...structuredClone(role),
  id,
  builtIn: false,
  name: `${role.name} (másolat)`,
})
```

- [ ] **Step 2: Role details sheet**

`RoleDetailsSheet`: shadcn `Sheet` with `side="bottom"`, open when `role !== null`, content `max-h-[85dvh] overflow-y-auto`. Shows:

- Title: role name (`font-display text-2xl`), a line with `FACTION_LABEL` (colored with `FACTION_TONE`) · `ACTION_LABEL`, and `GOAL_LABEL` when neutral.
- Description paragraph.
- **"Mesélői tipp"** heading + hint when `gmHint` is set.
- A rules list built from the role, each line only when it applies: **"Gyanús a nyomozónak"** / **"Nem gyanús a nyomozónak"** (from `isSuspicious`), **"Saját magát is választhatja"**, **"Ugyanazt két egymást követő éjjel nem választhatja"**, **"Saját magát legfeljebb {n}× választhatja"**, **"Legfeljebb {n}× használhatja a képességét"**, **"Időzítő: {stepSeconds} mp"** (only when the role wakes).
- `actions` slot rendered at the bottom as full-width `h-14` buttons.

- [ ] **Step 3: Role editor**

`RoleEditor` props: `{ initial: RoleDef; onSave(role: RoleDef): void; onCancel(): void }`. Full-screen form under a `ScreenHeader` (title **"Új szerep"** for a blank role, else **"Szerep szerkesztése"**, close label **"Mégse"**). Local state is a `RoleDef`. Fields, in order:

| Label | Control | Rule |
|---|---|---|
| Név | `Input` | required |
| Többes szám | `Input`, placeholder **"pl. orvosok"** | required |
| Csapat | `ToggleGroup` single: Város / Gyilkosok / Semleges | switching away from neutral deletes `neutralGoal`; switching to neutral sets `'none'` |
| Cél | `ToggleGroup` single over `GOAL_LABEL` | only when faction is neutral |
| Képesség | `ToggleGroup` single over `ACTION_LABEL`, wraps | |
| Leírás | `Textarea` | |
| Mesélői tipp | `Textarea` | empty → `undefined` |
| Saját kérdés | `Input`, placeholder `defaultPrompt(action, false)` | hidden for `none` and `vest`; blank → `undefined` |
| Gyanús a nyomozónak | `Switch`, checked = `suspiciousOverride ?? action === 'kill'` | store `undefined` when equal to that default |
| Időzítő (mp) | `Input type=number inputMode=numeric` 0–300 | hidden for `none` |
| Választhatja saját magát | `Switch` | hidden for `none` and `vest` |
| Nem választhatja ugyanazt két egymást követő éjjel | `Switch` | hidden for `none` and `vest` |
| Saját magát legfeljebb ennyiszer választhatja | number `Input`, blank = unlimited | hidden unless `canTargetSelf` |
| Ennyiszer használhatja a képességét | number `Input`, blank = unlimited | hidden for `none` |

Footer: **"Mentés"** (primary `h-14`). On save, trim strings; if the name is empty show **"Adj nevet a szerepnek."**, if the plural is empty show **"Add meg a többes számot is."** (inline, `text-blood`), otherwise call `onSave`.

- [ ] **Step 4: Library screen**

`LibraryScreen`: `ScreenHeader` titled **"Szerepek"**, close label **"Vissza"**, close → `goto('home')`. Local state: `details: RoleDef | null`, `editing: RoleDef | null`.

- Section **"Beépített szerepek"**: one `h-14` row per built-in (name left, `ACTION_LABEL` right in muted text, a 2 px left border tinted by `FACTION_TONE`), tap → `details`.
- Section **"Saját szerepek"**: rows for `customRoles` sorted by name with `localeCompare(…, 'hu')`; empty state **"Még nincs saját szereped."**; button **"Új szerep"** → `editing = blankRole(\`custom-${newId()}\`)`.
- Details actions: built-in → **"Másolat készítése"** → `editing = copyOfRole(role, \`custom-${newId()}\`)`. Custom → **"Szerkesztés"** → `editing = role`; **"Törlés"** → `ask({ title: 'Biztosan törlöd ezt a szerepet?', body: role.name, cancelLabel: 'Mégse', confirmLabel: 'Törlés', destructive: true, onConfirm: () => deleteCustomRole(role.id) })`.
- When `editing` is set, render `RoleEditor` instead of the list; save → `saveCustomRole(role)` and clear.
- `useBackGuard`: close the editor, else the details sheet, else `goto('home')`.

Add to `App.tsx`: `{screen === 'library' && <LibraryScreen />}`.

- [ ] **Step 5: Verify in the browser**

`pnpm lint && pnpm build`, then at 375×812:
1. Home → Szerepek lists the 7 built-ins; tapping "Orvos" shows its description, hint and "Ugyanazt két egymást követő éjjel nem választhatja".
2. "Másolat készítése" opens the editor prefilled as "Orvos (másolat)"; save; it appears under "Saját szerepek".
3. Create a new role "Boszorkány" / "boszorkányok", Képesség "Egyéb"; save; reload the page; it is still there.
4. Delete it via the confirm dialog; browser back from the library returns Home.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add role library with custom role editor"
```

---

### Task 13: Setup wizard

**Files:**
- Create: `src/ui/components/Stepper.tsx`, `src/ui/components/SortableList.tsx`, `src/ui/screens/setup/SetupScreen.tsx`, `src/ui/screens/setup/PlayersPage.tsx`, `src/ui/screens/setup/RolesPage.tsx`, `src/ui/screens/setup/OrderPage.tsx`, `src/ui/screens/setup/SettingsPage.tsx`, `src/ui/screens/setup/DrawPage.tsx`
- Modify: `src/ui/App.tsx`
- Install: `@dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers @dnd-kit/utilities`

**Interfaces:**
- Consumes: `SetupDraft`, `EMPTY_DRAFT`, `sanitizeDraft`, `nameIssue`, `totalRoles`, `fillWithVillagers`, `hasHostile` (Task 3), `assignRoles` (Task 3), `rolesById`, `wakingOrder` (Task 2), `newId`, `random` (Task 10), `useApp`, `useActions` (Task 10), `RoleDetailsSheet`, labels (Task 12), `ScreenHeader`, `useBackGuard` (Task 11).
- Produces:

```ts
function Stepper(props: { value: number; onChange(value: number): void; label: string; min?: number }): ReactElement
function SortableList<T>(props: { items: T[]; getId(item: T): string; onReorder(items: T[]): void; renderItem(item: T, handle: ReactNode): ReactNode }): ReactElement
```

- [ ] **Step 1: Install dnd-kit**

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers @dnd-kit/utilities
```

- [ ] **Step 2: Sortable list**

`src/ui/components/SortableList.tsx`:

```tsx
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'

interface SortableListProps<T> {
  items: T[]
  getId(item: T): string
  onReorder(items: T[]): void
  renderItem(item: T, handle: ReactNode): ReactNode
}

export function SortableList<T>({ items, getId, onReorder, renderItem }: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = items.map(getId)
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    onReorder(arrayMove(items, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <SortableRow key={getId(item)} id={getId(item)}>
              {(handle) => renderItem(item, handle)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function SortableRow({ id, children }: { id: string; children(handle: ReactNode): ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const handle = (
    // Only the handle captures touches, so the rest of the row still scrolls the page.
    <button
      type="button"
      aria-label="Áthelyezés"
      className="flex size-14 shrink-0 touch-none items-center justify-center text-muted-foreground"
      {...attributes}
      {...listeners}
    >
      <GripVertical />
    </button>
  )
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'relative z-10 opacity-90 shadow-lg' : undefined}
    >
      {children(handle)}
    </li>
  )
}
```

- [ ] **Step 3: Stepper**

`Stepper`: a row with a `size-14` outline button (lucide `Minus`, `aria-label={\`${label} −1\`}`, disabled at `min ?? 0`), the value in `w-10 text-center text-xl tabular-nums`, and a `size-14` outline button (lucide `Plus`, `aria-label={\`${label} +1\`}`).

- [ ] **Step 4: Setup screen state**

`SetupScreen` owns:

```ts
const customRoles = useApp((s) => s.customRoles)
const lastSetup = useApp((s) => s.prefs.lastSetup)
const globalOrder = useApp((s) => s.prefs.nightOrder)
const actions = useActions()
const roles = useMemo(() => rolesById(customRoles), [customRoles])
const [draft, setDraft] = useState(() => sanitizeDraft(lastSetup ?? EMPTY_DRAFT, roles))
const [rows, setRows] = useState(() => draft.names.map((name) => ({ key: newId(), name })))
const [page, setPage] = useState(0)
const [order, setOrder] = useState<string[] | null>(null)
const [assignment, setAssignment] = useState<Player[] | null>(null)

const update = (next: SetupDraft) => {
  setDraft(next)
  setAssignment(null)
  actions.updateDraft(next)
}
const setNames = (nextRows: typeof rows) => {
  setRows(nextRows)
  update({ ...draft, names: nextRows.map((r) => r.name) })
}
const roleIdsInGame = Object.keys(draft.roleCounts).filter((id) => draft.roleCounts[id] > 0)
```

- When entering page 2 (order): if `order` is null or its role set differs from the waking roles in `roleIdsInGame`, set `order = wakingOrder(globalOrder, roleIdsInGame, roles)`.
- When entering page 4 (draw) with `assignment === null`: `setAssignment(assignRoles(rows.map((r) => ({ id: newId(), name: r.name })), draft.roleCounts, random))`.
- Start: `actions.startGame({ ...draft, names: rows.map((r) => r.name.trim()) }, assignment, order)`.

Pages and titles: 0 **"Játékosok"**, 1 **"Szerepek"**, 2 **"Ébredési sorrend"**, 3 **"Beállítások"**, 4 **"Sorsolás"**. Header: `ScreenHeader` with close label **"Kilépés"** → `goto('home')` (the draft is already saved), `right` slot shows `${page + 1}/5`. Footer (sticky bottom, `grid grid-cols-2 gap-3 p-4`): **"Vissza"** (hidden on page 0) and **"Tovább"**; on page 4 the primary button reads **"Indulhat a játék"**. **"Tovább"** is disabled when page 0 has a `nameIssue`, or page 1 has `totalRoles(draft.roleCounts) !== rows.length`. `useBackGuard`: previous page, or `goto('home')` on page 0.

- [ ] **Step 5: Players page**

- Intro **"Add meg a játékosokat ülésrend szerint."**
- `SortableList` over `rows`: each row is `[handle][Input placeholder="Név" value autoFocus-on-add][remove button lucide X aria-label "Törlés"]`. Enter in an input appends a new empty row and focuses it.
- **"Játékos hozzáadása"** (`outline h-14`, lucide `Plus`) appends an empty row and focuses it.
- Error line under the list (`text-blood`, only after the list is non-empty or the user pressed Tovább): `noPlayers` → **"Adj hozzá legalább egy játékost."**, `emptyName` → **"Minden játékosnak adj nevet."**, `duplicateName` → **"Két játékosnak ugyanaz a neve."**
- **"Korábbi játékosok"** section: chips (`h-11 rounded-full px-4 bg-secondary`) for every `prefs.knownPlayers` name whose trimmed, `hu`-lowercased form is not already in `rows`; tap appends it. A text button **"Szerkesztés"** / **"Kész"** toggles edit mode where each chip shows an `X` and tapping calls `actions.forgetPlayer(name)`.

- [ ] **Step 6: Roles page**

- Counter **"{assigned} / {players} szerep kiosztva"**, `text-blood` when they differ, plus **"A szerepek számának meg kell egyeznie a játékosok számával."** when they differ.
- **"Feltöltés városlakókkal"** (`outline h-14`) → `update({ ...draft, roleCounts: fillWithVillagers(draft.roleCounts, rows.length) })`.
- Warning **"Nincs gyilkos szerep a játékban."** when `!hasHostile(draft.roleCounts, roles)` and at least one role is counted.
- Three groups, headed **"Város"**, **"Gyilkosok"**, **"Semlegesek"**: built-ins first, then custom roles by name. Each row: the role name as a button opening `RoleDetailsSheet`, `ACTION_LABEL` muted below it, and a `Stepper` labeled with the role name. Setting a count to 0 removes the key.

- [ ] **Step 7: Order, settings and draw pages**

Order page: intro **"Húzd a szerepeket abba a sorrendbe, ahogy éjjel ébrednek."**; `SortableList` over `order` rendering `[handle][role name][ACTION_LABEL muted]` in `h-14` rows; empty state **"Ebben a játékban éjjel senki sem ébred."**

Settings page: one `h-16` row per setting (label left, `Switch` right): **"A gyilkosok ismerik egymást"**, **"Győzelemkor automatikusan vége a játéknak"**, **"Halottak szerepének felfedése"**, **"A bolond győzelmével véget ér a játék"**. Then **"Vitaidő (perc)"** with a number `Input` (`inputMode="numeric"`, min 1, max 60) and helper **"Üresen hagyva nincs időkorlát."**; blank → `discussionMinutes: null`.

Draw page: list with `data-testid="assignment"` per row, text exactly `` `${p.seat}. ${p.name} – ${roles[p.roleId].name}` `` (role name colored by `FACTION_TONE`); **"Újrasorsolás"** (`outline h-14`) → new `assignRoles` result.

Add to `App.tsx`: `{screen === 'setup' && <SetupScreen />}`.

- [ ] **Step 8: Verify in the browser**

`pnpm lint && pnpm build`, then at 375×812:
1. Home → Új játék. Add Anna, Bence, Csilla, Dani, Emese (Enter moves to a new row). Reorder by dragging the handle; scrolling the list by dragging a row body still scrolls.
2. Typing "anna" as a sixth name shows the duplicate error and disables Tovább; remove it.
3. Szerepek: Gyilkos +1, Orvos +1, Nyomozó +1, then "Feltöltés városlakókkal" → "5 / 5 szerep kiosztva".
4. Ébredési sorrend shows Gyilkos, Orvos, Nyomozó; drag Nyomozó first.
5. Sorsolás lists five rows; "Újrasorsolás" reshuffles.
6. Close with X, reopen Új játék: names, counts and settings are prefilled.
7. "Indulhat a játék" sets the screen to `game`, which stays blank until Task 14. In DevTools → Application → IndexedDB, `games` holds the record and `prefs/activeGameId` points to it.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Add setup wizard with name pool, role counts and night order"
```

---

### Task 14: Game screen shell

**Files:**
- Create: `src/ui/hooks/useWakeLock.ts`, `src/ui/screens/game/GameScreen.tsx`, `src/ui/screens/game/StepView.tsx`, `src/ui/screens/game/types.ts`
- Modify: `src/ui/App.tsx`

**Interfaces:**
- Consumes: `useGame`, `useActions` (Task 10), `next`, `back`, `currentStep`, `pendingWin` (Task 7), `isNight`, `phaseNumber` (Task 2), copy helpers `phaseLabel`, `closeNightTitle`, `closeNightBody`, `closeDayTitle`, `reopenTitle`, `reopenBody`, `winnerLabel` (Task 2), `useConfirm`, `useBackGuard` (Task 11), `playerById` (Task 11).
- Produces:

```ts
type SheetId = 'menu' | 'roster' | 'graveyard' | 'log' | 'end' | 'adjust'
interface StepProps { step: Step; game: Game; derived: DerivedGame; openSheet(id: SheetId): void }
function StepView(props: StepProps): ReactElement      // Task 15 fills in real cards
function useWakeLock(): void
```

- [ ] **Step 1: Wake lock**

`src/ui/hooks/useWakeLock.ts`:

```ts
import { useEffect } from 'react'

export function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let disposed = false
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (disposed) void lock.release()
      } catch {
        // Denied in battery saver or without a user gesture; the game works without it.
      }
    }
    // The browser drops the lock whenever the page is hidden.
    const onVisibility = () => document.visibilityState === 'visible' && void acquire()
    void acquire()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibility)
      void lock?.release()
    }
  }, [])
}
```

- [ ] **Step 2: Shared step types and a placeholder view**

`src/ui/screens/game/types.ts` exports `SheetId` and `StepProps` as above.

`src/ui/screens/game/StepView.tsx` (temporary until Task 15): renders a card with `step.id` and `step.kind`. For `action` steps with actors and for `execution` steps, render one plain button per option in `derived.options[step.id]` with `disabled === null`, writing `{ kind: 'target', targetId }` or `{ kind: 'execution', targetId }` respectively, so navigation can be exercised.

- [ ] **Step 3: Game screen**

`src/ui/screens/game/GameScreen.tsx`:

```tsx
import { AnimatePresence, motion } from 'motion/react'
import { Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  closeDayTitle,
  closeNightBody,
  closeNightTitle,
  phaseLabel,
  reopenBody,
  reopenTitle,
  winnerLabel,
} from '@/domain/copy'
import type { DerivedGame } from '@/domain/derive'
import { back, currentStep, next, pendingWin } from '@/domain/navigation'
import { isNight } from '@/domain/timeline'
import type { Cursor, GameSetup } from '@/domain/types'
import { useActions, useGame } from '@/store/hooks'
import { useBackGuard } from '@/ui/hooks/useBackGuard'
import { useConfirm, type ConfirmRequest } from '@/ui/hooks/useConfirm'
import { useWakeLock } from '@/ui/hooks/useWakeLock'
import { playerById } from '@/ui/names'
import { Button } from '@/ui/primitives/button'
import { cn } from '@/lib/utils'
import { StepView } from './StepView'
import type { SheetId } from './types'

const slide = {
  enter: (direction: number) => ({ x: direction * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction * -48, opacity: 0 }),
}

function closeRequest(
  closing: number,
  derived: DerivedGame,
  setup: GameSetup,
  onConfirm: () => void,
): ConfirmRequest {
  if (isNight(closing)) {
    return {
      title: closeNightTitle(closing),
      body: closeNightBody(closing),
      cancelLabel: 'Még nem',
      confirmLabel: 'Jöhet a reggel',
      onConfirm,
    }
  }
  const executedId = derived.phases[closing].day!.executedId
  return {
    title: closeDayTitle(closing),
    body: executedId
      ? `Kivégezve: ${playerById(setup, executedId).name}`
      : 'Ma senkit sem végeztek ki.',
    cancelLabel: 'Még nem',
    confirmLabel: 'Jöhet az éjszaka',
    onConfirm,
  }
}

export function GameScreen() {
  const { game, derived } = useGame()
  const actions = useActions()
  const confirm = useConfirm()
  const [sheet, setSheet] = useState<SheetId | null>(null)
  const [direction, setDirection] = useState<1 | -1>(1)
  const { setup, cursor } = game
  const phase = derived.phases[cursor.phase]
  const step = currentStep(derived, cursor)
  const win = pendingWin(derived, cursor)

  useWakeLock()

  useEffect(() => {
    document.documentElement.dataset.phase = isNight(cursor.phase) ? 'night' : 'day'
    return () => {
      delete document.documentElement.dataset.phase
    }
  }, [cursor.phase])

  const go = (target: Cursor, dir: 1 | -1) => {
    setDirection(dir)
    actions.moveCursor(target)
  }

  const onNext = () => {
    const result = next(derived, cursor)
    if (!result.ok) return
    const advance = () =>
      result.closesPhase === null
        ? go(result.cursor, 1)
        : confirm.ask(closeRequest(result.closesPhase, derived, setup, () => go(result.cursor, 1)))
    if (result.win && setup.settings.autoEnd) {
      const winner = result.win
      confirm.ask({
        title: winnerLabel(winner, setup.roles),
        body: 'Vége a játéknak?',
        cancelLabel: 'Még nem',
        confirmLabel: 'Játék vége',
        onConfirm: () => actions.endGame(winner, false),
        onCancel: advance,
      })
    } else advance()
  }

  const onBack = () => {
    const result = back(derived, cursor)
    if (!result) return
    if (result.reopensPhase === null) return go(result.cursor, -1)
    confirm.ask({
      title: reopenTitle(result.reopensPhase),
      body: reopenBody(result.reopensPhase),
      cancelLabel: 'Mégse',
      confirmLabel: 'Újranyitás',
      onConfirm: () => go(result.cursor, -1),
    })
  }

  useBackGuard(() => {
    if (confirm.isOpen) confirm.dismiss()
    else if (sheet) setSheet(null)
    else onBack()
  })

  const canGoBack = back(derived, cursor) !== null
  const canGoNext = next(derived, cursor).ok

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-3 bg-background/95 px-4 backdrop-blur">
        <div className="flex-1">
          <h1 className="font-display text-xl">{phaseLabel(cursor.phase)}</h1>
          <div className="mt-1 flex gap-1" aria-hidden>
            {phase.steps.map((s) => (
              <span
                key={s.id}
                className={cn('h-1.5 flex-1 rounded-full bg-muted', s.id === step.id && 'bg-primary')}
              />
            ))}
          </div>
        </div>
        <Button variant="ghost" className="size-14" aria-label="Menü" onClick={() => setSheet('menu')}>
          <Menu className="size-6" />
        </Button>
      </header>

      {win && (
        <div className="mx-4 flex items-center gap-3 rounded-xl bg-primary/15 p-3">
          <p className="flex-1 text-sm">
            Teljesült a győzelmi feltétel: <strong>{winnerLabel(win, setup.roles)}</strong>
          </p>
          <Button className="h-11" onClick={() => actions.endGame(win, false)}>
            Befejezés
          </Button>
        </div>
      )}

      <div className="relative flex-1 overflow-x-hidden px-4 py-4">
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={step.id}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <StepView step={step} game={game} derived={derived} openSheet={setSheet} />
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="sticky bottom-0 grid grid-cols-2 gap-3 bg-background/95 p-4 backdrop-blur">
        <Button variant="outline" className="h-14 text-lg" disabled={!canGoBack} onClick={onBack}>
          Vissza
        </Button>
        <Button className="h-14 text-lg" disabled={!canGoNext} onClick={onNext}>
          Tovább
        </Button>
      </footer>

      {confirm.dialog}
    </main>
  )
}
```

Task 16 adds the sheets keyed by `sheet`. Until then the menu button only sets state.

Add to `App.tsx`:

```tsx
const ended = useApp((s) => s.game?.ending != null)
const hasGame = useApp((s) => s.game !== null)
// …
{screen === 'game' && hasGame && !ended && <GameScreen />}
{screen === 'game' && !hasGame && <HomeScreen />}
```

- [ ] **Step 4: Verify in the browser**

`pnpm lint && pnpm build`, start a 5-player game (1 killer, 1 doctor, 1 detective, 2 villagers), then:
1. Tovább is disabled on the killer step until a target is chosen; Vissza is disabled on the first step.
2. After the last night step, the dialog reads "Kezdődhet az 1. nap?" with "Még nem" / "Jöhet a reggel"; "Még nem" stays put.
3. On "d1:morning", Vissza asks "Újranyitod az 1. éjszakát?"; "Újranyitás" returns to the last night step with the earlier choice still selected.
4. Steps slide left on Tovább and right on Vissza; the background turns violet during the day.
5. Executing the killer on day 1 opens "A város nyert!" / "Vége a játéknak?"; "Még nem" continues to the close-day dialog, and then the banner "Teljesült a győzelmi feltétel" shows on night 2.
6. Reload mid-night: the same step and choices come back. Browser back performs in-app Back.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add game screen navigation, dialogs, back guard and wake lock"
```

---

### Task 15: Step cards

**Files:**
- Create: `src/ui/screens/game/StepCard.tsx`, `src/ui/screens/game/PlayerGrid.tsx`, `src/ui/screens/game/Countdown.tsx`, `src/ui/hooks/useVibrateOnRise.ts`, `src/ui/screens/game/cards/DuskCard.tsx`, `TellCard.tsx`, `KillersMeetCard.tsx`, `ActionCard.tsx`, `MorningCard.tsx`, `DiscussionCard.tsx`, `ExecutionCard.tsx` (all under `cards/`)
- Modify: `src/ui/screens/game/StepView.tsx`

**Interfaces:**
- Consumes: `StepProps`, `SheetId` (Task 14), `useStepTimer` (Task 10), copy helpers `wakeLine`, `sleepLine`, `dummyLine`, `promptFor`, `reasonText`, `morningTitle`, `winnerLabel` (Task 2), `isSuspicious` (Task 2), `playerById` (Task 11), `useActions` (Task 10).
- Produces: `StepCard({ title, aside?, children })`, `Say({ children })`, `PlayerGrid(props)`, `Countdown({ stepId, seconds })`, `useVibrateOnRise(flag: boolean)`; `StepView` switches on `step.kind`.

- [ ] **Step 1: Card primitives**

`src/ui/screens/game/StepCard.tsx`:

```tsx
import type { ReactNode } from 'react'

export function StepCard({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl bg-card p-5 shadow-lg">
      <header className="flex items-start justify-between gap-3">
        <h2 className="font-display text-3xl leading-tight text-primary">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  )
}

export function Say({ children }: { children: ReactNode }) {
  return (
    <div className="border-l-4 border-primary/70 pl-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Mondd:</p>
      <p className="text-lg italic">{children}</p>
    </div>
  )
}
```

`src/ui/hooks/useVibrateOnRise.ts`:

```ts
import { useEffect, useRef } from 'react'

export function useVibrateOnRise(flag: boolean) {
  const previous = useRef(flag)
  useEffect(() => {
    if (flag && !previous.current) navigator.vibrate?.([200, 100, 200])
    previous.current = flag
  }, [flag])
}
```

`src/ui/screens/game/Countdown.tsx`:

```tsx
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useStepTimer } from '@/ui/hooks/useStepTimer'
import { useVibrateOnRise } from '@/ui/hooks/useVibrateOnRise'

export const formatClock = (ms: number) => {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function Countdown({ stepId, seconds }: { stepId: string; seconds: number }) {
  const { elapsed, idle, running, start, reset } = useStepTimer(stepId)
  const remaining = Math.max(0, seconds * 1000 - elapsed)
  const expired = running && remaining === 0

  useEffect(() => {
    if (idle && seconds > 0) start()
  }, [idle, seconds, start])
  useVibrateOnRise(expired)

  if (seconds <= 0) return null
  return (
    <button
      type="button"
      aria-label="Időzítő újraindítása"
      onClick={() => {
        reset()
        start()
      }}
      className={cn(
        'h-11 shrink-0 rounded-full px-4 font-mono text-lg tabular-nums',
        expired ? 'animate-pulse bg-blood/20 text-blood' : 'bg-muted',
      )}
    >
      {expired ? 'Lejárt' : formatClock(remaining)}
    </button>
  )
}
```

`src/ui/screens/game/PlayerGrid.tsx`:

```tsx
import { reasonText } from '@/domain/copy'
import type { TargetOption } from '@/domain/derive'
import type { ActionKind, Player } from '@/domain/types'
import { cn } from '@/lib/utils'

interface PlayerGridProps {
  players: Player[]
  options: TargetOption[]
  selectedId: string | null | undefined
  action: ActionKind
  onSelect(playerId: string): void
}

export function PlayerGrid({ players, options, selectedId, action, onSelect }: PlayerGridProps) {
  return (
    <div role="group" aria-label="Játékosok" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {players.map((p) => {
        const disabled = options.find((o) => o.playerId === p.id)?.disabled ?? null
        const selected = selectedId === p.id
        return (
          <button
            key={p.id}
            type="button"
            disabled={disabled !== null}
            aria-pressed={selected}
            onClick={() => onSelect(p.id)}
            className={cn(
              'flex min-h-16 flex-col items-start justify-center rounded-xl border-2 border-border bg-secondary px-3 py-2 text-left transition-colors',
              selected && 'border-primary bg-primary/15',
              disabled !== null && 'opacity-40',
            )}
          >
            <span className="text-xs text-muted-foreground">{p.seat}.</span>
            <span className="text-lg font-semibold leading-tight">{p.name}</span>
            {disabled !== null && <span className="text-xs">{reasonText(disabled, action)}</span>}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Night cards**

`DuskCard`: `StepCard` titled **"Éjszaka"**, `Say` **"Leszállt az éj. Mindenki csukja be a szemét!"**

`TellCard`: title **"Szerepek kiosztása"**, text **"Súgd meg mindenkinek a szerepét:"**, then one `h-14` toggle row per player in seat order: `` `${p.seat}. ${p.name} – ${role.name}` `` with a lucide `Check` when told. Toggling writes `{ kind: 'tell', told }` (the `told` list keeps seat order).

`KillersMeetCard`: title **"Gyilkosok"**, `Say` **"Felébrednek a gyilkosok, és megismerik egymást."**, the actor names, `Say` **"A gyilkosok elalszanak."**

`ActionCard` (`step.kind === 'action'`):

```tsx
const role = setup.roles[step.roleId]
const dummy = step.actorIds.length === 0
const chosen = derived.effective[step.id]
```

- `StepCard` title `role.name`, `aside={<Countdown stepId={step.id} seconds={role.stepSeconds} />}`.
- `Say`: `dummy ? dummyLine(role, step.plural) : wakeLine(role, step.plural)`.
- Not dummy: line **"Játékos: {names}"** or **"Játékosok: {names}"** (names joined with `, `). If `derived.invalid.has(step.id)`: alert box **"A korábbi választás már nem érvényes. Válassz újra!"**
- Vest role: question `promptFor(role, false)` plus `(még ${usesLeft} maradt)` when `derived.usesLeft[step.id]` is a number; two `h-14` buttons **"Igen"** (disabled when uses are 0) and **"Nem"**, `aria-pressed` from `chosen`, writing `{ kind: 'vest', use }`.
- Other roles: question `promptFor(role, step.plural)`; `PlayerGrid` with `derived.options[step.id]`, `selectedId = chosen?.kind === 'target' ? chosen.targetId : undefined`, writing `{ kind: 'target', targetId }`; a full-width `h-14` **"Senkit"** button (`aria-pressed` when `targetId === null`) writing `{ kind: 'target', targetId: null }`.
- Investigation result when the role investigates and a target is chosen: bordered box, **"Jelezd neki:"** and in `font-display text-3xl` either **"Gyanús 👍"** or **"Nem gyanús 👎"** from `isSuspicious(setup.roles[playerById(setup, targetId).roleId])`.
- `Say`: `sleepLine(role, step.plural)`.
- When `role.gmHint`: a ghost button **"Tipp"** toggling the hint text.

- [ ] **Step 3: Day cards**

`MorningCard`:
- Title **"Reggel"**, `Say` `` `${morningTitle(step.phase)}. Mindenki kinyithatja a szemét!` ``.
- `const day = derived.phases[step.phase].day!`. If `day.announced` is empty: **"Az éjszaka senki sem halt meg."** Otherwise **"Az éjszaka meghalt:"** and one row per id: `☠ {name}`, then ` – {role name}` when `setup.settings.revealRoleOnDeath`, and a muted **"(mesélői módosítás)"** for ids added by an adjustment.
- An `outline h-14` button **"Módosítás"** → `openSheet('adjust')`.

`DiscussionCard`:
- Title **"Vita"**. With `discussionMinutes`: a large `formatClock(remaining)` (`font-mono text-6xl tabular-nums text-center`) counting down from the setting; without it, the same display counting up from `elapsed`.
- Buttons (`grid grid-cols-2 gap-3`, `h-14`): **"Indítás"** / **"Szünet"** toggling start/pause, and **"Újra"** → reset.
- When the countdown hits 0 while running: alert **"Lejárt az idő! Jöhet a szavazás."** and `useVibrateOnRise`.
- A ghost `h-14` button **"Temető"** → `openSheet('graveyard')`.

`ExecutionCard`:
- Title **"Kivégzés"**, question **"Kit végez ki a város?"**, `PlayerGrid` with `derived.options[step.id]` and `action="none"`, writing `{ kind: 'execution', targetId }`; a full-width **"Senkit"** button writing `{ kind: 'execution', targetId: null }`.
- After a choice: **"Kivégezve: {name}"** (or **"Ma senkit sem végeztek ki."**), **"Szerepe: {role name}"** when `revealRoleOnDeath`, and `winnerLabel({ roleId }, setup.roles)` in `text-primary` when the executed role's `neutralGoal === 'executed'`.
- If `derived.invalid.has(step.id)`: the same alert as the action card.

`StepView`: replace the placeholder with a `switch (step.kind)` returning the matching card.

- [ ] **Step 4: Verify in the browser**

`pnpm lint && pnpm build`, start a 6-player game with 2 killers (know each other), doctor, detective, survivor, villager:
1. Night 1: dusk, tell (rows toggle), killers meet, "Gyilkos" wakes with plural narration "Felébrednek a gyilkosok.", both killers listed and disabled as targets ("Saját magát nem választhatja").
2. Doctor: self is allowed; on night 2 the previous target shows "Előző éjjel is őt védte".
3. Detective choosing a killer shows "Gyanús 👍".
4. Survivor step shows "(még 4 maradt)".
5. The countdown starts on entry, pulses "Lejárt" at zero, tapping it restarts.
6. Morning lists the death with role; discussion timer runs and survives a reload; execution shows "Kivégezve: …".

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add night and day step cards"
```

---

### Task 16: Menu and information sheets

**Files:**
- Create: `src/ui/screens/game/sheets/MenuSheet.tsx`, `RosterSheet.tsx`, `GraveyardSheet.tsx`, `NarratorLogSheet.tsx`, `EndGameSheet.tsx`, `AdjustSheet.tsx`, `src/ui/screens/game/sheets/GameSheet.tsx`
- Modify: `src/ui/screens/game/GameScreen.tsx`

**Interfaces:**
- Consumes: `graveyard`, `narratorLog` (Task 8), `aliveAt` (Task 7), `phaseLabel`, `winnerLabel` (Task 2), `displayName`, `playerById` (Task 11), `SheetId` (Task 14), `useActions` (Task 10).
- Produces: `GameSheet({ open, onClose, title, children })` (bottom `Sheet`, `max-h-[85dvh] overflow-y-auto`, title in `font-display text-2xl`) and one component per sheet, each taking `{ game, derived, onClose, onNavigate?(id: SheetId) }`.

- [ ] **Step 1: Sheets**

`MenuSheet` (title **"Menü"**): `h-14` rows **"Szereposztás"** → roster, **"Temető"** → graveyard, **"Mesélői napló"** → log, **"Játék befejezése"** → end, **"Kezdőlap"** → close and `goto('home')`.

`RosterSheet` (title **"Szereposztás"**): a `Switch` **"Nevek mutatása"** in local state (default off, so it resets whenever the sheet unmounts). One row per player in seat order: `displayName(setup, id, !show)`, role name colored by `FACTION_TONE`, and **"él"** / **"halott"** from `aliveAt(derived, cursor, false)`.

`GraveyardSheet` (title **"Temető"**): `graveyard(derived, cursor, false)`. Per day a heading `phaseLabel(phase)` and rows `` `${name} – éjjel halt meg` `` or `` `${name} – kivégezték` ``, followed by ` (${role name})` when `revealRoleOnDeath`. Days with no entries show **"Senki sem halt meg."** If no day has entries: **"Még senki sem halt meg."**

`NarratorLogSheet` (title **"Mesélői napló"**): `Switch` **"Nevek mutatása"** as in the roster; `const n = (id: string) => displayName(setup, id, !show)`. `narratorLog(setup, derived, cursor, false)`, per phase heading `phaseLabel(phase)` and rows:

| Entry | Text |
|---|---|
| action, target | `` `${role.name} (${actors}) → ${n(target)}` `` + `: gyanús` / `: nem gyanús` when `suspicious` is boolean |
| action, no target | `` `${role.name} (${actors}): senkit sem választott` `` |
| vest | `` `${role.name} (${n(player)}): felvette a mellényt` `` / `: nem vette fel a mellényt` |
| attack | `` `Támadás → ${n(target)}: meghalt` `` / `: túlélte` |
| adjustment | `` `Mesélői módosítás → ${n(player)}: halott` `` / `: él` |
| execution | `` `Kivégzés → ${n(target)}` `` / `Nem volt kivégzés` |

`actors` is `actorIds.map(n).join(', ')`. Empty phases show **"Nem történt semmi."**

`EndGameSheet` (title **"Játék befejezése"**): question **"Ki nyert?"**; single-choice `h-14` rows: **"A város"** (`'town'`), **"A gyilkosok"** (`'killers'`, only if a killers-faction role is in the game), one row per neutral role in the game labeled with its name (`{ roleId }`), **"Senki"** (`'nobody'`). Primary `h-14` **"Játék befejezése"**, disabled until a choice → `endGame(winner, true)`.

`AdjustSheet` (title **"Mesélői módosítás"**): one `h-14` row per player with name and a `Switch` labeled **"Él"** reflecting `day.aliveAfterMorning`. Toggling:

```ts
const day = derived.phases[cursor.phase].day!
const deadAtDayStart = (id: string) => !derived.phases[cursor.phase].aliveAtStart.includes(id)
const toggle = (id: string) => {
  const wantDead = day.aliveAfterMorning.includes(id)
  const rest = day.adjustments.filter((a) => a.playerId !== id)
  const adjustments = wantDead === deadAtDayStart(id) ? rest : [...rest, { playerId: id, dead: wantDead }]
  actions.setInput(stepIdOfMorning, { kind: 'morning', adjustments })
}
```

where `stepIdOfMorning = stepId(cursor.phase, 'morning')`.

- [ ] **Step 2: Wire the sheets**

In `GameScreen`, render each sheet with `open={sheet === id}` and `onClose={() => setSheet(null)}`; `MenuSheet` navigates by `setSheet(id)`.

- [ ] **Step 3: Verify in the browser**

`pnpm lint && pnpm build`, mid-game:
1. Szereposztás shows "#1 … #6" with roles; "Nevek mutatása" reveals names; closing and reopening masks them again.
2. During night 2 the Temető does not list night-2 victims; Mesélői napló shows night-2 choices made so far but no attack results.
3. Mesélői módosítás on the morning card adds a death; the morning list marks it "(mesélői módosítás)".
4. Browser back closes an open sheet instead of stepping back.
5. Játék befejezése with "A gyilkosok" ends the game (the screen goes blank until Task 17; reload keeps `ending`).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add roster, graveyard, narrator log and manual ending sheets"
```

---

### Task 17: End screen and image export

**Files:**
- Create: `src/lib/exportImage.ts`, `src/ui/screens/end/EndScreen.tsx`
- Modify: `src/ui/App.tsx`
- Install: `html-to-image canvas-confetti`, `-D @types/canvas-confetti`

**Interfaces:**
- Consumes: `useGame`, `useActions` (Task 10), `aliveAt` (Task 7), `chronicle`, `individualWinners` (Task 8), `isMainWinner` (Task 5), `winnerLabel`, `phaseLabel` (Task 2), `playerById` (Task 11), `useBackGuard` (Task 11).
- Produces: `exportPng(node: HTMLElement, fileName: string): Promise<void>`.

- [ ] **Step 1: Install**

```bash
pnpm add html-to-image canvas-confetti
pnpm add -D @types/canvas-confetti
```

- [ ] **Step 2: Export helper**

`src/lib/exportImage.ts`:

```ts
import { toBlob } from 'html-to-image'

export async function exportPng(node: HTMLElement, fileName: string): Promise<void> {
  const blob = await toBlob(node, {
    pixelRatio: 2,
    backgroundColor: getComputedStyle(document.body).backgroundColor,
  })
  if (!blob) throw new Error('Rendering failed')
  const file = new File([blob], fileName, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Duskwarden' })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      // A slow render can outlive the tap's user activation; fall back to a download.
    }
  }
  const url = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href: url, download: fileName }).click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
```

- [ ] **Step 3: End screen**

`EndScreen`:

```ts
const { game, derived } = useGame()
const ending = game.ending!
const finalAlive = aliveAt(derived, game.cursor, true)
const soloWinners = individualWinners(game.setup, derived, finalAlive)
const timeline = chronicle(game.setup, derived, game.cursor)
const card = useRef<HTMLDivElement>(null)
```

- On mount, unless `ending.winner === 'nobody'`: `confetti({ particleCount: 140, spread: 80, origin: { y: 0.3 }, colors: ['#f2c26b', '#e9e6f5', '#c0392b'], disableForReducedMotion: true })`.
- `useBackGuard(() => {})`: back does nothing here; leaving is explicit.
- Exported card (`ref={card}`, `bg-background p-5 flex flex-col gap-6`):
  - Hero: **"Játék vége"** (muted, small caps) and `winnerLabel(ending.winner, roles)` in `font-display text-4xl text-primary`.
  - When `soloWinners` is non-empty: **"Szintén nyert:"** + `` `${name} (${role name})` `` joined by `, `.
  - Player table, seat order: seat, name, role name (`FACTION_TONE`), ☠ or ✓ from `finalAlive`, and a lucide `Trophy` (`text-primary`) when `isMainWinner(setup, id, ending.winner)` or the id is in `soloWinners`.
  - **"Krónika"**: per `timeline` phase a heading `phaseLabel(phase)` and rows:

| Entry | Text |
|---|---|
| saved, protect | `` `${name} túlélte a támadást – védte: ${lowerFirst(roleName)}` `` |
| saved, vest | `` `${name} túlélte a támadást – golyóálló mellény` `` |
| killerKilledKiller | `` `${name} – egy másik gyilkos ölte meg` `` |
| died | `` `${name} – éjjel halt meg` `` |
| executed | `` `${name} – kivégezték` `` |
| noExecution | `Senkit sem végeztek ki.` |

  - Footer line in the image: `Duskwarden · ${new Date(game.createdAt).toLocaleDateString('hu-HU')}`.
- Buttons below the card (`h-14`): **"Kép mentése"** (shows **"Készül…"** while exporting; on failure shows **"Nem sikerült a képet elkészíteni."**) calling `exportPng(card.current!, \`duskwarden-${new Date(game.createdAt).toISOString().slice(0, 10)}.png\`)`; **"Vissza a játékhoz"** → `resumeGame()`; **"Új játék"** → `goto('setup')`; **"Kezdőlap"** → `goto('home')`.

Add to `App.tsx`: `{screen === 'game' && hasGame && ended && <EndScreen />}`.

- [ ] **Step 4: Verify in the browser**

`pnpm lint && pnpm build`, finish a game:
1. Confetti fires once; with OS reduced motion it does not.
2. Table, trophies and Krónika match what happened (a doctor save reads "… túlélte a támadást – védte: orvos").
3. "Kép mentése" downloads a PNG on desktop; the PNG shows Cinzel headings with ő/ű intact.
4. "Vissza a játékhoz" returns to the exact step; reloading the end screen keeps it.
5. Home shows "Játék folytatása" with "Vége · A város nyert!"; "Új játék" opens setup without the hold dialog.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add end screen with chronicle, confetti and image export"
```

---

### Task 18: PWA

**Files:**
- Create: `public/icon.svg`, `pwa-assets.config.ts`, `src/ui/components/UpdateBanner.tsx`
- Modify: `vite.config.ts`, `src/vite-env.d.ts`, `src/ui/App.tsx`, `index.html`
- Install: `-D vite-plugin-pwa @vite-pwa/assets-generator`

**Interfaces:**
- Produces: installable manifest, precaching service worker, generated icons, `UpdateBanner({ onUpdate })`.

- [ ] **Step 1: Install**

```bash
pnpm add -D vite-plugin-pwa @vite-pwa/assets-generator
```

If pnpm reports ignored build scripts for `sharp`, approve it with `pnpm approve-builds`.

- [ ] **Step 2: Icon and asset config**

`public/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0f0d1a"/>
  <circle cx="256" cy="230" r="140" fill="#f2c26b"/>
  <circle cx="312" cy="190" r="128" fill="#0f0d1a"/>
  <circle cx="150" cy="120" r="8" fill="#e9e6f5"/>
  <circle cx="390" cy="330" r="6" fill="#e9e6f5"/>
  <rect x="96" y="408" width="320" height="16" rx="8" fill="#2c2645"/>
</svg>
```

`pwa-assets.config.ts`:

```ts
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({ preset: minimal2023Preset, images: ['public/icon.svg'] })
```

- [ ] **Step 3: Plugin config**

In `vite.config.ts` add `import { VitePWA } from 'vite-plugin-pwa'` and append to `plugins`:

```ts
VitePWA({
  registerType: 'prompt',
  pwaAssets: { config: true, overrideManifestIcons: true },
  manifest: {
    name: 'Duskwarden',
    short_name: 'Duskwarden',
    description: 'Mesélői segéd gyilkosos társasjátékokhoz',
    lang: 'hu',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f0d1a',
    theme_color: '#0f0d1a',
  },
  workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'] },
}),
```

`src/vite-env.d.ts` (create it with `/// <reference types="vite/client" />` if the template has none) gains `/// <reference types="vite-plugin-pwa/react" />`. Remove any manual favicon `<link>` from `index.html`; the plugin injects icon links.

- [ ] **Step 4: Update banner on Home only**

`UpdateBanner`: a bar `bg-primary/15 px-4 py-3 flex items-center gap-3` with **"Új verzió érhető el."** and a `h-11` button **"Frissítés"** → `onUpdate()`.

In `App.tsx`:

```tsx
import { useRegisterSW } from 'virtual:pwa-register/react'
// …
const {
  needRefresh: [needRefresh],
  updateServiceWorker,
} = useRegisterSW()
// …
{screen === 'home' && needRefresh && <UpdateBanner onUpdate={() => void updateServiceWorker(true)} />}
```

Registration lives in `App` so the worker installs on the first visit whatever screen is shown; only the reload offer is limited to Home.

- [ ] **Step 5: Verify offline behavior**

```bash
pnpm build && pnpm preview --port 4173
```

At `http://localhost:4173` (375×812): the manifest has 192/512 icons and the service worker is activated (check `navigator.serviceWorker.controller` after one reload). Start a game, then set the browser offline and reload: the app loads and restores the game.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Make the app an installable offline PWA"
```

---

### Task 19: End-to-end smoke test

**Files:**
- Create: `playwright.config.ts`, `e2e/game.spec.ts`
- Modify: `package.json` (script `e2e`)
- Install: `-D @playwright/test`

- [ ] **Step 1: Install**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Add script `"e2e": "playwright test"`.

- [ ] **Step 2: Config**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  use: { ...devices['Pixel 7'], baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
})
```

- [ ] **Step 3: Write the test**

`e2e/game.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test'

const NAMES = ['Anna', 'Bence', 'Csilla', 'Dani', 'Emese']

const next = (page: Page) => page.getByRole('button', { name: 'Tovább', exact: true }).click()
const pick = (page: Page, name: string) =>
  page.getByRole('group', { name: 'Játékosok' }).getByRole('button', { name: new RegExp(name) }).click()

async function setUpGame(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Új játék' }).click()
  for (const name of NAMES) {
    await page.getByRole('button', { name: 'Játékos hozzáadása' }).click()
    await page.getByPlaceholder('Név').last().fill(name)
  }
  await next(page)
  for (const role of ['Gyilkos', 'Orvos', 'Nyomozó']) {
    await page.getByRole('button', { name: `${role} +1` }).click()
  }
  await page.getByRole('button', { name: 'Feltöltés városlakókkal' }).click()
  await next(page)
  await next(page)
  await next(page)
  const rows = await page.getByTestId('assignment').allTextContents()
  const byRole = new Map<string, string[]>()
  for (const row of rows) {
    const [, name, role] = row.match(/^\d+\. (.+) – (.+)$/)!
    byRole.set(role, [...(byRole.get(role) ?? []), name])
  }
  await page.getByRole('button', { name: 'Indulhat a játék' }).click()
  return {
    killer: byRole.get('Gyilkos')![0],
    doctor: byRole.get('Orvos')![0],
    villagers: byRole.get('Városlakó')!,
  }
}

test('plays a full game, survives a reload and keeps browser back inside the app', async ({ page }) => {
  const cast = await setUpGame(page)

  await expect(page.getByText('Leszállt az éj. Mindenki csukja be a szemét!')).toBeVisible()
  await next(page)
  await next(page)

  await expect(page.getByRole('heading', { name: 'Gyilkos' })).toBeVisible()
  await pick(page, cast.villagers[0])
  await next(page)

  await expect(page.getByRole('heading', { name: 'Orvos' })).toBeVisible()
  await pick(page, cast.villagers[1])
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Orvos' })).toBeVisible()
  await expect(
    page.getByRole('group', { name: 'Játékosok' }).getByRole('button', { name: new RegExp(cast.villagers[1]) }),
  ).toHaveAttribute('aria-pressed', 'true')
  await next(page)

  await expect(page.getByRole('heading', { name: 'Nyomozó' })).toBeVisible()
  await pick(page, cast.killer)
  await expect(page.getByText('Gyanús 👍')).toBeVisible()
  await next(page)
  await page.getByRole('button', { name: 'Jöhet a reggel' }).click()

  await expect(page.getByText('Az éjszaka meghalt:')).toBeVisible()
  await expect(page.getByText(new RegExp(`☠ ${cast.villagers[0]}`))).toBeVisible()

  await page.goBack()
  await expect(page.getByText('Újranyitod az 1. éjszakát?')).toBeVisible()
  await page.getByRole('button', { name: 'Mégse' }).click()
  await expect(page.getByText('Az éjszaka meghalt:')).toBeVisible()

  await next(page)
  await next(page)
  await pick(page, cast.killer)
  await next(page)
  await expect(page.getByRole('alertdialog')).toContainText('A város nyert!')
  await page.getByRole('button', { name: 'Játék vége' }).click()
  await expect(page.getByText('A város nyert!')).toBeVisible()
  await expect(page.getByText('Krónika')).toBeVisible()
})
```

- [ ] **Step 4: Run it**

Run: `pnpm e2e`
Expected: 1 passed. If a locator is ambiguous, fix the component's accessible name rather than loosening the test.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add end-to-end smoke test"
```

---

### Task 20: Final verification and handover

**Files:**
- Create: `README.md`

- [ ] **Step 1: Full check**

Run: `pnpm format && pnpm lint && pnpm test && pnpm build && pnpm e2e`
Expected: everything passes, no formatting diff left.

- [ ] **Step 2: Manual run-through**

At 375×812, then at 768×1024, play a 7-player game with Gyilkos ×2 (not knowing each other), Sorozatgyilkos, Orvos, Nyomozó, Bolond, Túlélő, with "A bolond győzelmével véget ér a játék" on:
1. Two separate killer steps; one killer kills the other; the chronicle later says "– egy másik gyilkos ölte meg".
2. Kill the doctor; next night the doctor step is a dummy with "Az orvos már nem él, de szólítsd ugyanúgy…" and a running timer.
3. Go back from day 2 into night 2, change the kill, return: the morning list updates; a stale execution choice is flagged.
4. Execute the jester → "A bolond nyert!" dialog.
5. Kill the app mid-night (close the tab), reopen: same step, same timer.
6. No horizontal scrolling anywhere; all buttons reachable with a thumb.

- [ ] **Step 3: README**

`README.md`, no hard-wrapped lines: one paragraph on what Duskwarden is, the scripts table (`dev`, `build`, `preview`, `test`, `e2e`, `lint`, `format`), a note that the spec lives in `docs/design.md`, and that GitHub Pages needs `BASE_PATH=/<repo>/` at build time.

- [ ] **Step 4: Copy review list**

Collect every Hungarian string the UI shows (grep `src/ui` and `src/domain/copy.ts`, `src/domain/roles.ts`) into a list for the user's native-speaker review; do not commit it.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add README"
```
