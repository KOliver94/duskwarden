# Duskwarden — Design

Private Game Master companion for in-person Town of Salem–style games. Frontend-only React PWA, phone portrait first. Code in English, UI in Hungarian.

## 1. Purpose

One GM, one device, in-person game nights. Players never touch the app. The app tells the GM what to do next, records hidden information, resolves night outcomes, and keeps the game safe from accidental loss or reveal.

Success: a full real game is run from the phone without paper notes, without the GM leaking information by accident, and survives reloads and app kills.

### Principles

1. The GM always knows what to do next.
2. The GM never accidentally loses the game.
3. Every mistake can be undone.
4. Hidden information is never revealed accidentally.
5. The GM is the authority: timers and checks are advisory; only mechanical role rules are enforced.
6. Works fully offline after first load.
7. Most interactions take one or two taps.
8. Comfortable on a portrait phone, scales to tablet.
9. Hidden/admin information is separated from what the GM needs during normal play.
10. Feels like a game companion, not a CRUD tool.

## 2. Scope

In: game setup, role library with custom roles, night order drag-and-drop, step-by-step night/day wizard, night resolution, nominations and recorded votes, win detection, back navigation and reopening closed phases, public and detailed histories, end screen with image export, continuous persistence, offline PWA.

Out: multiple devices or sync, player-facing views, replaying old games, i18n (Hungarian only), light theme, complex ToS mechanics (roleblock, framing, Jester haunt, night immunity).

## 3. Stack

- Vite, React, TypeScript, pnpm
- Tailwind v4 + shadcn/ui
- dnd-kit for ordered lists
- motion for transitions, canvas-confetti for the end screen
- Zustand as a thin store over the pure engine
- `idb` for IndexedDB
- `vite-plugin-pwa` (generateSW), `@vite-pwa/assets-generator` for icons
- `html-to-image` for end screen export
- `@fontsource/*` self-hosted fonts
- Vitest (+ `fake-indexeddb`), Playwright for end-to-end tests

No router. The visible screen is derived from state; browser history is only used as a back-button guard (§7).

## 4. Domain model

All of `src/domain` is pure: no React, no IO, no `Date.now()`, no randomness (callers pass ids, timestamps, shuffled orders).

### 4.1 Roles

```ts
type Faction = 'town' | 'killers' | 'neutral'
type ActionKind = 'none' | 'kill' | 'protect' | 'investigate' | 'vest' | 'other'
type NeutralGoal = 'soloKiller' | 'executed' | 'survive' | 'none'

interface RoleDef {
  id: string
  builtIn: boolean
  name: string            // "Orvos"
  namePlural: string      // "orvosok"
  faction: Faction
  neutralGoal?: NeutralGoal
  action: ActionKind
  description: string
  gmHint?: string
  promptOverride?: string
  suspiciousOverride?: boolean
  stepSeconds: number
  constraints: {
    canTargetSelf: boolean
    noRepeatTarget: boolean
    selfTargetMax?: number
    maxUses?: number
  }
}
```

Action kinds:

- `none`: does not wake.
- `kill`: target is attacked.
- `protect`: target is protected from all attacks that night.
- `investigate`: GM is shown the target's suspicious/not suspicious result to signal.
- `vest`: yes/no self-protection, limited by `maxUses`.
- `other`: wakes, optional target, recorded in the log, no automatic effect. For custom roles whose effect the GM applies by hand (via morning adjustments, §4.6).

Suspicious: `suspiciousOverride ?? action === 'kill'`.

Prompt: `promptOverride` or a default per action kind, in singular or plural form depending on how many players act in the step (§10).

Built-in roles:

| id | Name | Faction | Action | Notes |
|---|---|---|---|---|
| killer | Gyilkos | killers | kill | |
| serialKiller | Sorozatgyilkos | neutral (soloKiller) | kill | |
| doctor | Orvos | town | protect | noRepeatTarget, selfTargetMax 1 |
| detective | Nyomozó | town | investigate | |
| villager | Városlakó | town | none | |
| jester | Bolond | neutral (executed) | none | |
| survivor | Túlélő | neutral (survive) | vest | maxUses 4 |

Default night order: killer, serialKiller, doctor, survivor, detective. Resolution is simultaneous, so order only affects narration.

Built-ins live in code. Custom roles live in IndexedDB. At game start, every role used in the game is copied into the game record, so editing the library never changes a running game.

### 4.2 Setup

```ts
interface Player { id: string; name: string; seat: number; roleId: string }

interface Settings {
  killersKnowEachOther: boolean
  autoEnd: boolean
  discussionMinutes: number | null
  jesterWinEndsGame: boolean     // default false
}

interface GameSetup {
  players: Player[]
  roles: Record<string, RoleDef>
  nightOrder: string[]
  settings: Settings
}
```

Seat is the 1-based position in the player list (seating order around the table), used for masking (§6). Roles are assigned by a Fisher–Yates shuffle using `crypto.getRandomValues`.

### 4.3 Timeline and steps

Phases are indexed from 0: even indexes are nights, odd indexes are days. Phase 0 = 1. éjszaka, 1 = 1. nap, 2 = 2. éjszaka, …

Steps of a phase are derived from the state at the start of that phase.

Night N:

1. `nN:dusk`: narrator line, everyone closes their eyes.
2. Night 1 only: `n1:tell`, a seat-ordered checklist of every player with their role for the GM to whisper.
3. Night 1 only, if killers know each other and there are at least 2 killers: `n1:killersMeet`.
4. For each role in night order that is in the game and has `action !== 'none'`:
   - Per-player steps `nN:<roleId>:<playerId>` when the role is `vest`, or when the role's faction is `killers` and killers do not know each other.
   - Otherwise one shared step `nN:<roleId>`; all living holders wake together and choose one target.
   - A step whose actors are all dead is still shown as a dummy step: the GM calls the role as usual and waits, so the table cannot tell that the role is dead. The step timer uses the role's `stepSeconds` to keep the same pacing.

Day N:

1. `dN:morning`: deaths of night N, a role reveal button per death, manual adjustments.
2. `dN:discussion`: discussion timer.
3. `dN:voting`: nominations with recorded vote counts.
4. `dN:verdict`: the outcome of the vote, with a role reveal button when someone is executed.

Step ids are stable across recomputation because they are keyed by phase, role and player, never by index.

### 4.4 Inputs and cursor

```ts
type StepInput =
  | { kind: 'target'; targetId: string | null }   // null = explicit "no target"
  | { kind: 'vest'; use: boolean }
  | { kind: 'tell'; told: string[] }
  | { kind: 'morning'; adjustments: { playerId: string; dead: boolean }[]; revealed: string[] }
  | { kind: 'votes'; nominations: { playerId: string; votes: number }[] }
  | { kind: 'verdict'; revealedId: string | null }

interface Cursor { phase: number; stepId: string }
```

The persisted game is `setup + inputs + cursor (+ timers, ending)`. Everything else (alive set, step lists, resolution, histories, win state) is derived by pure functions.

- Next on an action or vest step requires an explicit choice (a player, "no target", yes or no), so a step can't be skipped by an accidental tap. All other steps can always proceed; a voting step without nominations means nobody is executed.
- Back moves the cursor to the previous step, crossing into the previous phase when needed.
- Inputs ahead of the cursor are kept and pre-filled when the GM moves forward again.
- A phase is closed when `phase < cursor.phase`.

### 4.5 Night resolution

At the end of night N, using all valid inputs of that night:

- Attacks: every `kill` step with a target.
- Protections: every `protect` target, and every vest user protecting themselves.
- An attacked player dies unless protected. Every attack is recorded with result `killed` or `protected`.
- Actors who die that night still act.
- A killer attacking another killer is allowed.
- `investigate` results come from the target's role and are shown on the step immediately after selection.

Constraints, enforced in the target picker with the reason shown:

- Dead players are disabled.
- `canTargetSelf: false` disables the actors themselves.
- `noRepeatTarget` disables the target chosen by the same step on the previous night.
- `selfTargetMax` disables self once the limit is reached (self = any of the step's actors).
- `maxUses` hides the "yes" choice of a vest step once uses are exhausted.

### 4.6 Day

- Morning applies night deaths, then the GM's manual adjustments (add a death or mark someone alive). Adjustments cover house rules and custom role effects.
- Voting: the town nominates players one after another; the GM records each nominee's vote count. A nominee must be alive after the morning and can be nominated once per day; a vote count is between 0 and the number of living players. Nominations can be edited or removed. A nomination that becomes invalid after a past edit is ignored and flagged.
- Verdict, from the valid nominations (`tally(nominations, aliveCount)`):
  - no nominations → `none`
  - the highest vote count is shared → `tie`
  - the highest vote count is not more than half of the living players → `noMajority`; the card shows the votes that would have been needed, `floor(alive / 2) + 1`
  - otherwise → that nominee is executed.
- The outcome first appears on the verdict step, so nothing is revealed while the town is still voting. Moving back from the verdict reopens the vote like any other step.
- An executed Jester records an individual win.
- Role reveal: each death on the morning card and the executed player on the verdict card has a "Szerep felfedése" button. A revealed role is shown on the card for the GM to announce and is public from then on (Temető). A reveal stored for a player who is no longer among that step's deaths, or no longer the executed player, is ignored. The end screen shows every role regardless.

### 4.7 Editing the past

The GM can move back into any closed phase and change inputs. All later state is recomputed. A later input that is no longer valid (its target is now dead, its step no longer exists) is ignored by derivation and flagged on its step so the GM chooses again. Inputs of steps that no longer exist stay in the record and are ignored, which makes undoing the edit lossless.

### 4.8 Win detection and ending

Checked when leaving the morning step and when leaving the verdict step. Conditions are evaluated in this order; the first match wins.

- Hostile = faction `killers`, or neutral goal `soloKiller`.
- Nobody: all players dead.
- Town: no living hostiles.
- Killers: no living soloKillers, and living killers ≥ all other living players.
- Serial killer: no living killers, and at most one living non-soloKiller player.
- Jester: executed, and only if `jesterWinEndsGame`.
- Survivors alive at the end are co-winners. An executed Jester is always listed as an individual winner, even if the game continued.

If a condition holds:

- `autoEnd: true`: a confirm dialog offers to end the game. Declining continues the game.
- `autoEnd: false`: a non-modal banner on the step suggests ending.

The GM can end the game from the menu at any time, picking the winner. Ending is stored as `{ winner, phase, manual }` with `winner: 'town' | 'killers' | 'nobody' | { roleId }`, and can be undone ("Vissza a játékhoz").

## 5. Screens

### Home

- "Játék folytatása", shown when there is an active or ended game, with a status like "2. éjszaka · 7 élő" or "Vége".
- "Új játék". If a game is running: a warning dialog, then a hold-to-confirm button (~2 s press). An ended game needs no confirmation.
- "Szerepek": the role library. Built-ins are view-only; custom roles can be created, edited and deleted.
- "Beállítások": the app settings sheet (§7).

### Setup wizard

Prefilled from the last game.

1. Játékosok: names in seating order, drag to reorder. Names must be unique and non-empty. Below the list, every previously used name not yet in the list is a chip ("Korábbi játékosok"); tapping a chip appends that player. Chips can be removed from the pool in an edit mode. The pool is updated when a game starts, most recently used first.
2. Szerepek: count stepper per role, a live "8 / 9 szerep kiosztva" counter, a "Feltöltés városlakókkal" button. Start is blocked until the total equals the player count. No hostile role shows a warning, not a block.
3. Ébredési sorrend: dnd-kit list of the waking roles in this game. The new order is merged into the global order: the selected roles are rearranged among the positions they already occupy.
4. Beállítások: the settings of §4.2.
5. Sorsolás: shuffled name → role list, "Újrasorsolás", "Indulhat a játék".

### Game

- Header: phase label, step dots for the current phase, menu.
- Body: one step card. Transitions slide by direction (Next from the right, Back from the left).
- Footer: large Vissza / Tovább buttons within thumb reach.
- Action step card: role, narrator wake line, actor names, prompt, player grid (disabled players greyed with reason), advisory step timer that starts on first entry and pulses at zero (silently, §7), investigation signal after selection, GM hint behind a toggle.
- Voting card: read-aloud line, the nominations in order (name, vote stepper, remove), "Jelölt hozzáadása" opening a picker of living players not yet nominated, and the votes needed for a majority.
- Verdict card: the outcome as a read-aloud line, the vote count, and "Szerep felfedése" when someone is executed.
- Menu sheets: Szereposztás (roster), Temető (public history), Mesélői napló (detailed history), Beállítások, Játék befejezése, Kezdőlap.

### End screen

- Winner hero with confetti (respecting `prefers-reduced-motion`).
- Player table: name, role, alive/dead, individual wins.
- Krónika: per phase deaths, executions and notable events (saves, a killer killing a killer, survivor vest saves).
- "Kép mentése": PNG via Web Share API when files can be shared, download otherwise.
- "Vissza a játékhoz", "Új játék".

## 6. Hidden information

- Night step cards show only the current step. Night deaths appear only on the morning card.
- Temető shows public information only: night deaths and executions per day, with a role only once it has been revealed.
- Mesélői napló shows everything: actions, attack results, protections, investigations and results, vest uses, manual adjustments, executions.
- Mesélői napló and Szereposztás mask player names as seat numbers ("#4") by default. "Nevek mutatása" shows names until the sheet closes.

## 7. Safety and resilience

- Browser and hardware back never leave the game: a guard history entry is pushed on the game screen and re-pushed on `popstate`; back closes the open sheet or dialog, otherwise runs in-app Back.
- Closing a night and closing a day each require confirmation (§10). Moving back into a closed phase shows the reopen warning once; navigation inside the reopened phase is free.
- A Screen Wake Lock is held on the game screen and re-acquired on `visibilitychange → visible`, since the browser releases it when the page is hidden.
- Persistence failure (quota, private mode) shows a persistent banner; the game continues in memory. A failed write reopens the database once and retries, because iOS Safari drops the connection of a backgrounded page.
- Timer alerts: when the discussion countdown reaches zero, the app vibrates and plays a short two-tone chime (Web Audio, no audio file), each only if enabled in the app settings and supported by the device. The audio context is unlocked on the first tap anywhere, because iOS blocks sound otherwise. iPhone browsers cannot vibrate. Night step countdowns only pulse on screen: a dead role's dummy step always runs its countdown out, so a sound or buzz there would tell the table which roles are dead.
- App settings ("Beállítások", reachable from Home and the game menu): "Hang" and "Rezgés" switches, both on by default, and "Próba" to play the alert once. Where vibration is unsupported the sheet says so.

## 8. Persistence

IndexedDB `duskwarden`, version 1:

- `games` (keyPath `id`): `{ schemaVersion, id, createdAt, updatedAt, setup, inputs, cursor, timers, ending }`. Ended and abandoned games are kept; nothing reads them yet.
- `customRoles` (keyPath `id`).
- `prefs` (key-value): `activeGameId`, `nightOrder`, `lastSetup`, `knownPlayers`, `alerts` (`{ sound: boolean; vibration: boolean }`).

Timers: `Record<stepId, { startedAt: number | null; accumulatedMs: number }>`, so a running timer is correct after a reload.

Writes:

- Every store change writes the whole game record (a few KB). Writes go through one serialized queue that coalesces to the latest state, so writes never land out of order.
- Writes start immediately (no debounce), so at most one coalesced write is ever pending when the page is hidden or killed.
- `navigator.storage.persist()` is requested when the first game starts.
- On boot the active game is loaded before the first render, so a reload never flashes Home.

## 9. PWA

- generateSW precaches the whole build, fonts included. The app runs offline after the first load.
- Update prompt is shown only on Home; a new version never reloads the app mid-game.
- Manifest: name Duskwarden, `display: standalone`, `orientation: portrait`, dark theme and background colors. Icons generated from one SVG.
- Hosted on Cloudflare Workers static assets: `wrangler.jsonc` serves `./dist`, `public/_headers` makes `sw.js` and `index.html` always revalidate so a cached service worker never blocks updates, and `pnpm deploy:cloudflare` builds and deploys by hand (plain `deploy` collides with pnpm's built-in command).
- Workers Builds deploys `main` on every push. `.node-version` and the `packageManager` field pin Node and pnpm, so a rebuild years later uses the same toolchain as the lockfile.

## 10. Hungarian copy

The UI addresses the GM informally (te). Narration uses party-game narrator phrasing, not literal translation.

Rules:

- Role names are capitalized as standalone labels ("Orvos") and lowercase inside sentences ("Felébred az orvos.").
- The article before a role name is `az` before a vowel-initial word, `a` otherwise; custom role names get it computed.
- The article before an ordinal number follows its spoken form: `az 1.` (első), `az 5.` (ötödik), `az 50.`–`az 59.`, otherwise `a`.
- UI text uses the Hungarian en dash (–), never the em dash.
- Player names never appear in inflected positions (no "Annát", "Annának"), because suffixes can't be generated reliably. Templates use names as labels or subjects only: "Anna – meghalt", "Gyilkos → Anna".
- Shared steps with several actors use plural forms (`namePlural`, plural verbs).

Glossary:

| Context | Text |
|---|---|
| Home | Játék folytatása · Új játék · Szerepek |
| Running game warning | Fut egy játék! Ha újat kezdesz, a mostanit nem tudod majd folytatni. |
| Hold to confirm | Tartsd lenyomva a megerősítéshez |
| Setup pages | Játékosok · Szerepek · Ébredési sorrend · Beállítások · Sorsolás |
| Known players | Korábbi játékosok |
| Role counter | 8 / 9 szerep kiosztva |
| Fill button | Feltöltés városlakókkal |
| Draw | Újrasorsolás · Indulhat a játék |
| Settings | A gyilkosok ismerik egymást · Győzelemkor automatikusan vége a játéknak · Vitaidő (perc) · A bolond győzelmével véget ér a játék |
| App settings | Beállítások · Hang · Rezgés · Próba · Ezen az eszközön a böngésző nem tud rezegni. |
| Phase labels | 2. éjszaka · 3. nap |
| Navigation | Vissza · Tovább |
| Dusk | Leszállt az éj. Mindenki csukja be a szemét! |
| Tell | Súgd meg mindenkinek a szerepét: |
| Killers meet | Felébrednek a gyilkosok, és megismerik egymást. |
| Wake / sleep | Felébred az orvos. · Az orvos elalszik. |
| Wake / sleep (plural) | Felébrednek a gyilkosok. · A gyilkosok elalszanak. |
| Dummy step | Az orvos már nem él, de szólítsd ugyanúgy, és várj pár másodpercet. |
| Prompt kill | Kit öl meg? · Kit ölnek meg? |
| Prompt protect | Kit véd meg? · Kit védenek meg? |
| Prompt investigate | Kit vizsgál meg? · Kit vizsgálnak meg? |
| Prompt other | Kit választ? · Kit választanak? |
| Vest | Felveszi a golyóálló mellényt? (még 3 maradt) |
| No target | Senkit |
| Investigation | Jelezd neki: Gyanús 👍 · Nem gyanús 👎 |
| Disabled reasons | Halott · Előző éjjel is őt védte · Magát már nem védheti meg |
| Morning | Felvirradt a 3. nap. Mindenki kinyithatja a szemét! |
| Read-aloud label | Mondd: |
| Night deaths | Az éjszaka meghalt: · Az éjszaka senki sem halt meg. |
| Discussion timer | Indítás · Szünet · Újra · Lejárt az idő! Jöhet a szavazás. |
| Voting | Szavazás · Kit jelöltök kivégzésre? · Jelölt hozzáadása · Még nincs jelölt. · 5 szavazat · Kivégzéshez legalább 4 szavazat kell. |
| Verdict | Ítélet · Anna kivégzésre kerül. · Döntetlen – ma senkit sem végeznek ki. · Nincs meg a többség – ma senkit sem végeznek ki. · Legalább 4 szavazat kellett volna. · Nem volt jelölt – ma senkit sem végeznek ki. |
| Reveal | Szerep felfedése · Szerepe: Orvos |
| Close night | Kezdődhet a 2. nap? Nézd át, minden éjszakai akció rendben van-e. Utána a 2. éjszaka lezárul. [Még nem] [Jöhet a reggel] |
| Close day | Jöhet a 3. éjszaka? Kivégezve: Anna · Ma senkit sem végeztek ki. [Még nem] [Jöhet az éjszaka] |
| Reopen | Újranyitod a 2. éjszakát? / Újranyitod a 2. napot? Ez az éjszaka / Ez a nap már lezárult. Ha módosítasz rajta, a későbbi események is megváltozhatnak. [Mégse] [Újranyitás] |
| Menu | Szereposztás · Temető · Mesélői napló · Nevek mutatása · Játék befejezése · Kezdőlap |
| Win | A város nyert! · A gyilkosok nyertek! · A sorozatgyilkos nyert! · A bolond nyert! · Senki sem nyert. |
| End screen | Játék vége · Krónika · Kép mentése · Vissza a játékhoz · Anna – kivégezték (5 szavazat) |
| Narrator log, day | Jelölés → Anna: 5 szavazat · Kivégzés → Anna · Döntetlen – nem volt kivégzés · Nincs többség – nem volt kivégzés · Nem volt jelölt |

New strings follow the same rules and are reviewed by a native speaker before release.

## 11. Visual direction

- Dark only. "Dusk" palette: near-black indigo background, candle-amber accent, blood red for death, moon-silver text.
- Serif display font for headings, clean sans for body. Fonts must include the latin-ext subset (ő, ű).
- Touch targets at least 56 px. One primary action per screen.
- Motion is subtle: step slides, timer pulse, confetti on the end screen only.

## 12. Code layout

```
src/domain/    pure engine: types, roles, steps, resolve, win, navigation, history, copy helpers
src/storage/   idb schema and upgrades, repositories, write queue
src/store/     Zustand store: actions → engine → persist
src/ui/        shadcn components, screens (home, setup, library, game, end), step cards
```

## 13. Testing

- Engine developed test-first with Vitest: step derivation, resolution, constraints, vote tally, reveal validity, win checks, navigation, reopening and invalidation, history derivation, Hungarian article and plural helpers.
- Repositories and the write queue tested against `fake-indexeddb`.
- Playwright: a 5-player smoke test (setup, voting, role reveal, play to the end screen, reload mid-night restores the exact step, browser back stays in the app), a dead-role test (the read-aloud lines never mention the death), an alerts test (night countdowns stay silent, the discussion countdown alerts) and a voting layout test (long names at 375 px).
- Manual verification in a mobile viewport.
