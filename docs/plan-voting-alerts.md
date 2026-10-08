# Voting, Role Reveal, Timer Alerts and Cloudflare Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single execution step with nominations, recorded votes and a verdict; move role reveal from a game setting to per-death buttons; alert with sound and vibration when timers expire; host the app on Cloudflare.

**Architecture:** The pure engine gains a `tally` function and two day steps (`voting`, `verdict`) whose inputs are validated in `deriveGame` like every other step, so past edits invalidate stale nominations and reveals automatically. Alerts are a small testable `fireAlert(prefs, device)` fed by app-wide prefs stored in IndexedDB. Cloudflare Workers static assets serve `dist`.

**Tech Stack:** unchanged (Vite, React, TypeScript strict, Zustand, idb, Vitest, Playwright) plus Web Audio, the Vibration API and wrangler.

**Spec:** `docs/design.md` (§4.3, §4.4, §4.6, §4.8, §5, §6, §7, §8, §9, §10, §13 changed in commit `2a9c3b7`)

## Global Constraints

- Code and commit messages in English; every user-visible string in Hungarian following `docs/design.md` §10.
- UI text uses the en dash `–`. Player names are never inflected; they appear only as labels or subjects. Role names are capitalized as labels, lowercase inside sentences. Articles before role names and ordinals come from `withArticle` / `numberArticle`.
- Comments only for a hidden reason, a constraint or a gotcha; never restate code; never repeat a comment across files.
- Commit messages: short imperative subject, body only when the why is not obvious, no `Co-Authored-By`.
- Markdown: no hard-wrapped lines.
- `src/domain` stays pure: no React, IndexedDB, `Date.now()`, randomness or browser APIs.
- Interactive touch targets at least `h-14` (56 px).
- `cn` comes from the `cn` package; shadcn primitives live in `src/ui/primitives`.
- Verify with `pnpm test`, `npx tsc -b`, `pnpm lint`, `pnpm build`, `pnpm e2e`. Tasks 2–4 change engine types that the UI consumes; between Task 2 and Task 5 `npx tsc -b` and `pnpm build` are expected to fail, and `pnpm test` must pass.

## Review Focus

1. A past edit kills a player who was later nominated → that nomination is flagged and ignored, and the verdict recomputes from the remaining ones. Pinned in Task 2 (`ignores a nomination whose nominee died after an edit`).
2. A past edit lowers the living count below a recorded vote count → the nomination is flagged and ignored rather than executing someone with impossible votes. Pinned in Task 2 (`rejects more votes than living players`).
3. A game or draft saved before this change (morning input without `revealed`, settings with `revealRoleOnDeath`) is loaded → nothing crashes and reveals start empty. Pinned in Task 2 (`accepts a morning input saved before reveals existed`).
4. A revealed night victim is later marked alive by the GM → the reveal is ignored and the Temető no longer shows that role. Pinned in Task 3 (`drops a reveal once the player is no longer among the deaths`).
5. A timer expires before the first tap on iOS, or on a device without audio or vibration → no crash; the visual pulse still shows. Pinned in Task 4 (`survives a device without vibration or audio`).

## File Structure

```
src/domain/vote.ts            Nomination tally rules
src/domain/types.ts           StepInput: morning.revealed, votes, verdict; Step kinds voting/verdict; Nomination
src/domain/steps.ts           day slots morning, discussion, voting, verdict
src/domain/derive.ts          voting/verdict/reveal validation; DayResult gains nominations, tally, revealed
src/domain/navigation.ts      win at verdict; aliveAt without `ended`
src/domain/history.ts         graveyard reveals, nomination/verdict log entries, chronicle votes
src/domain/setup.ts           Settings without revealRoleOnDeath
src/lib/alert.ts              fireAlert, browser device, audio unlock
src/storage/db.ts, repo.ts    prefs.alerts
src/store/appStore.ts         setAlerts
src/ui/hooks/useExpiryAlert.ts
src/ui/components/AppSettingsSheet.tsx
src/ui/screens/game/cards/VotingCard.tsx, VerdictCard.tsx, MorningCard.tsx
wrangler.jsonc, public/_headers
```

---

### Task 1: Vote tally

**Files:**
- Modify: `src/domain/types.ts` (add `Nomination`)
- Create: `src/domain/vote.ts`
- Test: `src/domain/vote.test.ts`

**Interfaces:**
- Produces:

```ts
interface Nomination { playerId: string; votes: number }          // types.ts
type Tally =
  | { outcome: 'none' }
  | { outcome: 'tie'; playerIds: string[]; votes: number }
  | { outcome: 'noMajority'; playerId: string; votes: number; needed: number }
  | { outcome: 'executed'; playerId: string; votes: number }
function votesNeeded(aliveCount: number): number                  // floor(alive / 2) + 1
function tally(nominations: Nomination[], aliveCount: number): Tally
```

- [ ] **Step 1: Add the type**

In `src/domain/types.ts`, after `Adjustment`:

```ts
export interface Nomination {
  playerId: string
  votes: number
}
```

- [ ] **Step 2: Write failing tests**

`src/domain/vote.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { tally, votesNeeded } from './vote'

describe('votesNeeded', () => {
  it('needs more than half of the living players', () => {
    expect([4, 5, 6, 7].map(votesNeeded)).toEqual([3, 3, 4, 4])
  })
})

describe('tally', () => {
  it('executes nobody without nominations', () => {
    expect(tally([], 7)).toEqual({ outcome: 'none' })
  })

  it('executes the only nominee with a majority', () => {
    expect(tally([{ playerId: 'a', votes: 4 }], 7)).toEqual({
      outcome: 'executed',
      playerId: 'a',
      votes: 4,
    })
  })

  it('picks the nominee with the most votes', () => {
    const result = tally(
      [
        { playerId: 'a', votes: 2 },
        { playerId: 'b', votes: 5 },
      ],
      7,
    )
    expect(result).toEqual({ outcome: 'executed', playerId: 'b', votes: 5 })
  })

  it('saves everyone on a tie at the top', () => {
    const result = tally(
      [
        { playerId: 'a', votes: 4 },
        { playerId: 'b', votes: 4 },
        { playerId: 'c', votes: 1 },
      ],
      8,
    )
    expect(result).toEqual({ outcome: 'tie', playerIds: ['a', 'b'], votes: 4 })
  })

  it('saves the top nominee without a majority, exactly half included', () => {
    expect(tally([{ playerId: 'a', votes: 3 }], 6)).toEqual({
      outcome: 'noMajority',
      playerId: 'a',
      votes: 3,
      needed: 4,
    })
  })
})
```

- [ ] **Step 3: Run to see it fail**

Run: `pnpm vitest run src/domain/vote.test.ts`
Expected: FAIL, cannot resolve `./vote`.

- [ ] **Step 4: Implement**

`src/domain/vote.ts`:

```ts
import type { Nomination } from './types'

export type Tally =
  | { outcome: 'none' }
  | { outcome: 'tie'; playerIds: string[]; votes: number }
  | { outcome: 'noMajority'; playerId: string; votes: number; needed: number }
  | { outcome: 'executed'; playerId: string; votes: number }

export const votesNeeded = (aliveCount: number) => Math.floor(aliveCount / 2) + 1

export function tally(nominations: Nomination[], aliveCount: number): Tally {
  if (nominations.length === 0) return { outcome: 'none' }
  const votes = Math.max(...nominations.map((n) => n.votes))
  const top = nominations.filter((n) => n.votes === votes)
  if (top.length > 1) return { outcome: 'tie', playerIds: top.map((n) => n.playerId), votes }
  const needed = votesNeeded(aliveCount)
  if (votes < needed) return { outcome: 'noMajority', playerId: top[0].playerId, votes, needed }
  return { outcome: 'executed', playerId: top[0].playerId, votes }
}
```

- [ ] **Step 5: Run to see it pass**

Run: `pnpm vitest run src/domain/vote.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/domain
git commit -m "Add vote tally"
```

---

### Task 2: Day derivation with voting, verdict and reveals

**Files:**
- Modify: `src/domain/types.ts`, `src/domain/steps.ts`, `src/domain/derive.ts`, `src/domain/setup.ts`, `src/domain/fixtures.ts`
- Test: `src/domain/derive.test.ts`, `src/domain/steps.test.ts`

**Interfaces:**
- Consumes: `Nomination`, `tally`, `Tally` (Task 1).
- Produces:

```ts
// types.ts
type StepInput =
  | { kind: 'target'; targetId: string | null }
  | { kind: 'vest'; use: boolean }
  | { kind: 'tell'; told: string[] }
  | { kind: 'morning'; adjustments: Adjustment[]; revealed: string[] }
  | { kind: 'votes'; nominations: Nomination[] }
  | { kind: 'verdict'; revealed: boolean }
// Step day kinds: 'morning' | 'discussion' | 'voting' | 'verdict'  ('execution' removed)
// Settings: revealRoleOnDeath removed

// derive.ts
interface DayResult {
  nightDeaths: string[]
  adjustments: Adjustment[]
  announced: string[]
  aliveAfterMorning: string[]
  nominations: Nomination[]   // valid ones, in entry order
  tally: Tally
  executedId: string | null   // tally.outcome === 'executed' ? tally.playerId : null
  revealed: string[]          // valid morning reveals, plus executedId when the verdict reveal is set
  winAfterMorning: Winner | null
  winAfterExecution: Winner | null
}
// options[`dN:voting`] lists every player, `disabled: 'dead'` unless alive after the morning
```

- [ ] **Step 1: Update types and settings**

`src/domain/types.ts`:

```ts
export interface Settings {
  killersKnowEachOther: boolean
  autoEnd: boolean
  discussionMinutes: number | null
  jesterWinEndsGame: boolean
}
```

```ts
export type StepInput =
  | { kind: 'target'; targetId: string | null }
  | { kind: 'vest'; use: boolean }
  | { kind: 'tell'; told: string[] }
  | { kind: 'morning'; adjustments: Adjustment[]; revealed: string[] }
  | { kind: 'votes'; nominations: Nomination[] }
  | { kind: 'verdict'; revealed: boolean }
```

and in `Step` replace `'execution'` with `'voting' | 'verdict'`:

```ts
  | (StepBase & {
      kind: 'dusk' | 'tell' | 'morning' | 'discussion' | 'voting' | 'verdict'
    })
```

Remove `revealRoleOnDeath` from `DEFAULT_SETTINGS` in `src/domain/setup.ts` and from `SETTINGS` in `src/domain/fixtures.ts`.

- [ ] **Step 2: Update the day steps test, see it fail**

In `src/domain/steps.test.ts` change the day expectation:

```ts
  it('builds the day steps', () => {
    expect(ids(makeSetup(['killer', 'villager']), 1)).toEqual([
      'd1:morning',
      'd1:discussion',
      'd1:voting',
      'd1:verdict',
    ])
  })
```

Run: `pnpm vitest run src/domain/steps.test.ts`
Expected: FAIL (`d1:execution` received).

- [ ] **Step 3: Update the day slots**

`src/domain/steps.ts`:

```ts
const DAY_SLOTS = ['morning', 'discussion', 'voting', 'verdict'] as const
```

Run: `pnpm vitest run src/domain/steps.test.ts`
Expected: PASS.

- [ ] **Step 4: Rewrite the day tests in `derive.test.ts`**

Replace the `exec` helper and the whole `describe('day', …)` block with:

```ts
const votes = (...nominations: [string, number][]): StepInput => ({
  kind: 'votes',
  nominations: nominations.map(([playerId, n]) => ({ playerId, votes: n })),
})
const morning = (adjustments: { playerId: string; dead: boolean }[], revealed: string[] = []) =>
  ({ kind: 'morning', adjustments, revealed }) as StepInput

describe('day', () => {
  it('applies morning adjustments to the announcement and the living', () => {
    const d = deriveGame(
      s,
      {
        'n1:killer': t('p4'),
        'd1:morning': morning([
          { playerId: 'p4', dead: false },
          { playerId: 'p5', dead: true },
        ]),
      },
      1,
    )
    expect(d.phases[1].day!.announced).toEqual(['p5'])
    expect(d.phases[1].day!.aliveAfterMorning).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('ignores an adjustment that no longer matches the night', () => {
    const d = deriveGame(s, { 'd1:morning': morning([{ playerId: 'p5', dead: false }]) }, 1)
    expect(d.invalid.has('d1:morning')).toBe(true)
    expect(d.effective['d1:morning']).toEqual(morning([]))
  })

  it('accepts a morning input saved before reveals existed', () => {
    const legacy = { kind: 'morning', adjustments: [] } as unknown as StepInput
    const d = deriveGame(s, { 'n1:killer': t('p4'), 'd1:morning': legacy }, 1)
    expect(d.phases[1].day!.revealed).toEqual([])
    expect(d.invalid.has('d1:morning')).toBe(false)
  })

  it('keeps reveals only for that morning’s deaths', () => {
    const d = deriveGame(s, { 'n1:killer': t('p4'), 'd1:morning': morning([], ['p4', 'p5']) }, 1)
    expect(d.phases[1].day!.revealed).toEqual(['p4'])
    expect(d.effective['d1:morning']).toEqual(morning([], ['p4']))
  })

  it('executes the vote winner and checks wins at both checkpoints', () => {
    const d = deriveGame(s, { 'd1:voting': votes(['p1', 3]) }, 1)
    expect(d.phases[1].day!.tally).toEqual({ outcome: 'executed', playerId: 'p1', votes: 3 })
    expect(d.phases[1].day!.executedId).toBe('p1')
    expect(d.phases[1].day!.winAfterMorning).toBeNull()
    expect(d.phases[1].day!.winAfterExecution).toBe('town')
    expect(d.phases[1].aliveAtEnd).toEqual(['p2', 'p3', 'p4', 'p5'])
  })

  it('executes nobody on a tie', () => {
    const d = deriveGame(s, { 'd1:voting': votes(['p1', 2], ['p2', 2]) }, 1)
    expect(d.phases[1].day!.executedId).toBeNull()
    expect(d.phases[1].aliveAtEnd).toHaveLength(5)
  })

  it('ignores a nomination whose nominee died after an edit', () => {
    const d = deriveGame(s, { 'n1:killer': t('p4'), 'd1:voting': votes(['p4', 4], ['p1', 1]) }, 1)
    expect(d.invalid.has('d1:voting')).toBe(true)
    expect(d.phases[1].day!.nominations).toEqual([{ playerId: 'p1', votes: 1 }])
    expect(d.phases[1].day!.executedId).toBeNull()
    expect(option(d, 'd1:voting', 'p4')).toBe('dead')
  })

  it('rejects more votes than living players', () => {
    const d = deriveGame(s, { 'n1:killer': t('p4'), 'd1:voting': votes(['p1', 5]) }, 1)
    expect(d.invalid.has('d1:voting')).toBe(true)
    expect(d.phases[1].day!.executedId).toBeNull()
  })

  it('ignores a second nomination of the same player', () => {
    const d = deriveGame(s, { 'd1:voting': votes(['p1', 3], ['p1', 1]) }, 1)
    expect(d.invalid.has('d1:voting')).toBe(true)
    expect(d.phases[1].day!.executedId).toBe('p1')
  })

  it('reveals the executed role only after the verdict reveal', () => {
    const hidden = deriveGame(s, { 'd1:voting': votes(['p1', 3]) }, 1)
    expect(hidden.phases[1].day!.revealed).toEqual([])
    const shown = deriveGame(
      s,
      { 'd1:voting': votes(['p1', 3]), 'd1:verdict': { kind: 'verdict', revealed: true } },
      1,
    )
    expect(shown.phases[1].day!.revealed).toEqual(['p1'])
  })
})
```

Run: `pnpm vitest run src/domain/derive.test.ts`
Expected: FAIL (no `tally`, `nominations`, `revealed` on the day result).

- [ ] **Step 5: Implement the day derivation**

In `src/domain/derive.ts` import `tally` and `Tally` from `./vote` and `Nomination` from `./types`, extend `DayResult`:

```ts
export interface DayResult {
  nightDeaths: string[]
  adjustments: Adjustment[]
  announced: string[]
  aliveAfterMorning: string[]
  nominations: Nomination[]
  tally: Tally
  executedId: string | null
  revealed: string[]
  winAfterMorning: Winner | null
  winAfterExecution: Winner | null
}
```

and replace the day branch of `deriveGame` (everything from `const morningId = …` to the end of the loop body) with:

```ts
    const morningId = stepId(phase, 'morning')
    const morning = inputs[morningId]
    let adjustments: Adjustment[] = []
    let requestedReveals: string[] = []
    if (morning?.kind === 'morning') {
      adjustments = morning.adjustments.filter(
        (a) => seatOrder.includes(a.playerId) && aliveSet.has(a.playerId) === a.dead,
      )
      if (adjustments.length !== morning.adjustments.length) invalid.add(morningId)
      // Records saved before reveals existed have no list.
      requestedReveals = morning.revealed ?? []
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
    const nightReveals = inSeatOrder(requestedReveals.filter((id) => announced.includes(id)))
    if (morning?.kind === 'morning') {
      effective[morningId] = { kind: 'morning', adjustments, revealed: nightReveals }
    }

    const votingId = stepId(phase, 'voting')
    const afterMorning = new Set(aliveAfterMorning)
    options[votingId] = seatOrder.map((id) => ({
      playerId: id,
      disabled: afterMorning.has(id) ? null : 'dead',
    }))
    const voting = inputs[votingId]
    let nominations: Nomination[] = []
    if (voting?.kind === 'votes') {
      const seen = new Set<string>()
      nominations = voting.nominations.filter((n) => {
        const valid =
          afterMorning.has(n.playerId) &&
          !seen.has(n.playerId) &&
          Number.isInteger(n.votes) &&
          n.votes >= 0 &&
          n.votes <= aliveAfterMorning.length
        seen.add(n.playerId)
        return valid
      })
      if (nominations.length !== voting.nominations.length) invalid.add(votingId)
      effective[votingId] = { kind: 'votes', nominations }
    } else if (voting) invalid.add(votingId)

    const result = tally(nominations, aliveAfterMorning.length)
    const executedId = result.outcome === 'executed' ? result.playerId : null
    const verdictId = stepId(phase, 'verdict')
    const verdict = inputs[verdictId]
    if (verdict?.kind === 'verdict') effective[verdictId] = verdict
    else if (verdict) invalid.add(verdictId)
    const executionRevealed = executedId !== null && verdict?.kind === 'verdict' && verdict.revealed

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
        nominations,
        tally: result,
        executedId,
        revealed: executionRevealed ? [...nightReveals, executedId] : nightReveals,
        winAfterMorning: checkWin(setup, aliveAfterMorning, null),
        winAfterExecution: checkWin(setup, aliveAtEnd, executedId),
      },
    })
    alive = aliveAtEnd
```

- [ ] **Step 6: Run the engine tests**

Run: `pnpm vitest run src/domain/derive.test.ts src/domain/steps.test.ts src/domain/vote.test.ts`
Expected: PASS. (`navigation` and `history` tests still reference `execution`; they are updated in Task 3.)

- [ ] **Step 7: Commit**

```bash
git add src/domain
git commit -m "Derive voting, verdict and role reveals for each day"
```

---

### Task 3: Navigation and histories for voting

**Files:**
- Modify: `src/domain/navigation.ts`, `src/domain/history.ts`
- Test: `src/domain/navigation.test.ts`, `src/domain/history.test.ts`

**Interfaces:**
- Consumes: `DayResult.nominations`, `.tally`, `.executedId`, `.revealed` (Task 2), `Tally` (Task 1).
- Produces:

```ts
// navigation.ts
function needsInput(step: Step): boolean                 // living action steps only
function next(derived, cursor): NextResult               // win from morning (winAfterMorning) and verdict (winAfterExecution)
function pendingWin(derived, cursor): Winner | null      // execution checkpoint = leaving the verdict
function aliveAt(derived: DerivedGame, cursor: Cursor): string[]   // `ended` parameter removed; verdict step → aliveAtEnd

// history.ts
interface GraveEntry { playerId: string; cause: 'night' | 'execution'; revealed: boolean }
function graveyard(derived: DerivedGame, cursor: Cursor): GraveDay[]   // `ended` parameter removed; execution listed once the verdict is reached
type LogEntry = …existing night entries…
  | { kind: 'adjustment'; playerId: string; dead: boolean }
  | { kind: 'nomination'; playerId: string; votes: number }          // once the voting step is reached
  | { kind: 'verdict'; tally: Tally }                                 // once the verdict step is reached
type ChronicleEntry = …
  | { kind: 'executed'; playerId: string; votes: number }
  | { kind: 'noExecution' }                                           // verdict reached, nobody executed
function individualWinners(setup, derived, cursor, finalAlive)        // executions count once the verdict is reached
```

- [ ] **Step 1: Rewrite the affected navigation tests**

In `src/domain/navigation.test.ts` add the helper after `at`:

```ts
const votes = (playerId: string, n: number): StepInput => ({
  kind: 'votes',
  nominations: [{ playerId, votes: n }],
})
```

Replace the tests `reports the win when leaving the execution` and `blocks Next on an invalidated step`, and the whole `describe('aliveAt', …)` block, with:

```ts
  it('lets the vote proceed without nominations', () => {
    expect(next(d({}, 1), at(1, 'd1:voting'))).toEqual({
      ok: true,
      cursor: at(1, 'd1:verdict'),
      closesPhase: null,
      win: null,
    })
  })

  it('reports the win when leaving the verdict', () => {
    const derived = d({ 'd1:voting': votes('p1', 3) }, 1)
    expect(next(derived, at(1, 'd1:verdict'))).toEqual({
      ok: true,
      cursor: at(2, 'n2:dusk'),
      closesPhase: 1,
      win: 'town',
    })
  })

  it('blocks Next on a night action invalidated by an earlier edit', () => {
    const inputs: Record<string, StepInput> = { 'n1:killer': t('p3'), 'n2:doctor': t('p3') }
    expect(next(d(inputs, 2), at(2, 'n2:doctor'))).toEqual({ ok: false })
  })
```

```ts
describe('aliveAt', () => {
  // p3 dies in night 1, so 3 players vote and 2 votes are a majority
  const inputs: Record<string, StepInput> = { 'n1:killer': t('p3'), 'd1:voting': votes('p4', 2) }

  it('keeps night deaths hidden during the night', () => {
    expect(aliveAt(d(inputs, 0), at(0, 'n1:doctor'))).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('uses the morning state while the town votes', () => {
    expect(aliveAt(d(inputs, 1), at(1, 'd1:voting'))).toEqual(['p1', 'p2', 'p4'])
  })

  it('applies the execution from the verdict on', () => {
    expect(aliveAt(d(inputs, 1), at(1, 'd1:verdict'))).toEqual(['p1', 'p2'])
  })
})
```

In `describe('pendingWin', …)` nothing changes (it uses the morning checkpoint).

- [ ] **Step 2: Rewrite the affected history tests**

In `src/domain/history.test.ts` replace the shared `inputs` and the `graveyard`, `narratorLog`, `chronicle` (first test only) and `individualWinners` blocks:

```ts
// p5 dies in night 1; 4 players vote and 3 votes are a majority
const inputs: Record<string, StepInput> = {
  'n1:killer': t('p5'),
  'n1:doctor': t('p4'),
  'n1:detective': t('p1'),
  'd1:voting': { kind: 'votes', nominations: [{ playerId: 'p1', votes: 3 }] },
}

describe('graveyard', () => {
  it('shows night deaths from the morning but hides an execution still being voted on', () => {
    expect(graveyard(deriveGame(s, inputs, 1), at(1, 'd1:voting'))).toEqual([
      { phase: 1, entries: [{ playerId: 'p5', cause: 'night', revealed: false }] },
    ])
  })

  it('lists the execution once the verdict is reached', () => {
    expect(graveyard(deriveGame(s, inputs, 1), at(1, 'd1:verdict'))).toEqual([
      {
        phase: 1,
        entries: [
          { playerId: 'p5', cause: 'night', revealed: false },
          { playerId: 'p1', cause: 'execution', revealed: false },
        ],
      },
    ])
  })

  it('shows a role once it is revealed', () => {
    const revealed = {
      ...inputs,
      'd1:morning': { kind: 'morning', adjustments: [], revealed: ['p5'] },
      'd1:verdict': { kind: 'verdict', revealed: true },
    } satisfies Record<string, StepInput>
    expect(graveyard(deriveGame(s, revealed, 1), at(1, 'd1:verdict'))[0].entries).toEqual([
      { playerId: 'p5', cause: 'night', revealed: true },
      { playerId: 'p1', cause: 'execution', revealed: true },
    ])
  })

  it('drops a reveal once the player is no longer among the deaths', () => {
    const revived = {
      ...inputs,
      'd1:morning': {
        kind: 'morning',
        adjustments: [{ playerId: 'p5', dead: false }],
        revealed: ['p5'],
      },
    } satisfies Record<string, StepInput>
    expect(graveyard(deriveGame(s, revived, 1), at(1, 'd1:discussion'))[0].entries).toEqual([])
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

  it('adds nominations while voting and the verdict once reached', () => {
    const voting = narratorLog(s, deriveGame(s, inputs, 1), at(1, 'd1:voting'), false)[1]
    expect(voting.entries).toEqual([{ kind: 'nomination', playerId: 'p1', votes: 3 }])
    const verdict = narratorLog(s, deriveGame(s, inputs, 1), at(1, 'd1:verdict'), false)[1]
    expect(verdict.entries).toEqual([
      { kind: 'nomination', playerId: 'p1', votes: 3 },
      { kind: 'verdict', tally: { outcome: 'executed', playerId: 'p1', votes: 3 } },
    ])
  })
})
```

Replace the first `chronicle` test with:

```ts
  it('summarises saves and executions with their votes', () => {
    const saved: Record<string, StepInput> = { ...inputs, 'n1:killer': t('p4') }
    expect(chronicle(s, deriveGame(s, saved, 1), at(1, 'd1:verdict'))).toEqual([
      {
        phase: 0,
        entries: [{ kind: 'saved', playerId: 'p4', by: 'protect', protectorRoleId: 'doctor' }],
      },
      { phase: 1, entries: [{ kind: 'executed', playerId: 'p1', votes: 3 }] },
    ])
  })
```

and the `individualWinners` block with:

```ts
describe('individualWinners', () => {
  // p1 killer, p2 jester, p3 survivor, p4 villager; 4 voters, 3 votes needed
  const n = makeSetup(['killer', 'jester', 'survivor', 'villager'])
  const jesterVoted: Record<string, StepInput> = {
    'd1:voting': { kind: 'votes', nominations: [{ playerId: 'p2', votes: 3 }] },
  }

  it('lists executed jesters and living survivors', () => {
    const d = deriveGame(n, jesterVoted, 1)
    expect(individualWinners(n, d, at(1, 'd1:verdict'), ['p1', 'p3', 'p4'])).toEqual(['p2', 'p3'])
  })

  it('ignores an execution the game never reached', () => {
    const d = deriveGame(n, jesterVoted, 1)
    expect(individualWinners(n, d, at(1, 'd1:voting'), ['p1', 'p2', 'p3', 'p4'])).toEqual(['p3'])
  })
})
```

- [ ] **Step 3: Run to see them fail**

Run: `pnpm vitest run src/domain/navigation.test.ts src/domain/history.test.ts`
Expected: FAIL (verdict not a checkpoint, `revealed` missing on grave entries, no nomination entries).

- [ ] **Step 4: Update navigation**

`src/domain/navigation.ts`:

```ts
export const needsInput = (step: Step) => step.kind === 'action' && step.actorIds.length > 0
```

In `next`, the checkpoint win:

```ts
  const win =
    step.kind === 'morning'
      ? phase.day!.winAfterMorning
      : step.kind === 'verdict'
        ? phase.day!.winAfterExecution
        : null
```

In `pendingWin`:

```ts
    const verdict = phase.steps.findIndex((s) => s.kind === 'verdict')
    if (position > verdict) return phase.day.winAfterExecution
    if (position > 0) return phase.day.winAfterMorning
```

and `aliveAt`:

```ts
export function aliveAt(derived: DerivedGame, cursor: Cursor): string[] {
  const phase = derived.phases[cursor.phase]
  if (!phase.day) return phase.aliveAtStart
  return currentStep(derived, cursor).kind === 'verdict'
    ? phase.aliveAtEnd
    : phase.day.aliveAfterMorning
}
```

- [ ] **Step 5: Update histories**

`src/domain/history.ts` — types:

```ts
export interface GraveEntry {
  playerId: string
  cause: 'night' | 'execution'
  revealed: boolean
}
```

In `LogEntry` replace `{ kind: 'execution'; targetId: string | null }` with:

```ts
  | { kind: 'nomination'; playerId: string; votes: number }
  | { kind: 'verdict'; tally: Tally }
```

In `ChronicleEntry` replace `{ kind: 'executed'; playerId: string }` with `{ kind: 'executed'; playerId: string; votes: number }`. Import `type Tally` from `./vote`.

`graveyard`:

```ts
export function graveyard(derived: DerivedGame, cursor: Cursor): GraveDay[] {
  const { reached } = progress(derived, cursor, false)
  return derived.phases.flatMap((p) => {
    if (!p.day) return []
    const day = p.day
    const night = day.announced.map((playerId) => ({
      playerId,
      cause: 'night' as const,
      revealed: day.revealed.includes(playerId),
    }))
    const executed =
      day.executedId !== null && reached(p.index, stepId(p.index, 'verdict'))
        ? [
            {
              playerId: day.executedId,
              cause: 'execution' as const,
              revealed: day.revealed.includes(day.executedId),
            },
          ]
        : []
    return [{ phase: p.index, entries: [...night, ...executed] }]
  })
}
```

In `narratorLog`, replace the day block:

```ts
    if (p.day) {
      entries.push(...p.day.adjustments.map((a) => ({ kind: 'adjustment' as const, ...a })))
      if (reached(p.index, stepId(p.index, 'voting'))) {
        entries.push(...p.day.nominations.map((n) => ({ kind: 'nomination' as const, ...n })))
      }
      if (reached(p.index, stepId(p.index, 'verdict'))) {
        entries.push({ kind: 'verdict', tally: p.day.tally })
      }
    }
```

and drop `passed` from its `progress(...)` destructuring if it becomes unused.

In `chronicle`, use `const { reached } = progress(derived, cursor, true)` and replace the day block:

```ts
      if (p.day) {
        entries.push(...p.day.announced.map((playerId) => ({ kind: 'died' as const, playerId })))
        if (reached(p.index, stepId(p.index, 'verdict'))) {
          const result = p.day.tally
          entries.push(
            result.outcome === 'executed'
              ? { kind: 'executed', playerId: result.playerId, votes: result.votes }
              : { kind: 'noExecution' },
          )
        }
      }
```

In `individualWinners`:

```ts
  const { reached } = progress(derived, cursor, true)
  const executed = new Set(
    derived.phases.flatMap((p) =>
      p.day?.executedId && reached(p.index, stepId(p.index, 'verdict')) ? [p.day.executedId] : [],
    ),
  )
```

- [ ] **Step 6: Run all tests**

Run: `pnpm test`
Expected: PASS (all domain, storage and store tests).

- [ ] **Step 7: Commit**

```bash
git add src/domain
git commit -m "Move execution checkpoints to the verdict and log votes"
```

---

### Task 4: Alert preferences and alert firing

**Files:**
- Create: `src/lib/alert.ts`
- Modify: `src/storage/db.ts`, `src/storage/repo.ts`, `src/store/appStore.ts`
- Test: `src/lib/alert.test.ts`, `src/store/appStore.test.ts`

**Interfaces:**
- Produces:

```ts
// alert.ts
interface AlertPrefs { sound: boolean; vibration: boolean }
interface AlertDevice { vibrate?(pattern: number[]): void; chime(): void }
function fireAlert(prefs: AlertPrefs, device: AlertDevice): void
function unlockAudio(): void                 // call on every pointerdown
const browserDevice: AlertDevice
function canVibrate(): boolean

// db.ts
Prefs.alerts: AlertPrefs                     // DEFAULT_PREFS.alerts = { sound: true, vibration: true }

// appStore.ts
AppActions.setAlerts(alerts: AlertPrefs): void
```

- [ ] **Step 1: Write failing alert tests**

`src/lib/alert.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { fireAlert } from './alert'

const device = () => ({ vibrate: vi.fn(), chime: vi.fn() })

describe('fireAlert', () => {
  it('vibrates and chimes when both are on', () => {
    const d = device()
    fireAlert({ sound: true, vibration: true }, d)
    expect(d.vibrate).toHaveBeenCalledOnce()
    expect(d.chime).toHaveBeenCalledOnce()
  })

  it('respects each switch', () => {
    const d = device()
    fireAlert({ sound: false, vibration: false }, d)
    expect(d.vibrate).not.toHaveBeenCalled()
    expect(d.chime).not.toHaveBeenCalled()
  })

  it('survives a device without vibration or audio', () => {
    const chime = vi.fn(() => {
      throw new Error('Audio is locked')
    })
    expect(() => fireAlert({ sound: true, vibration: true }, { chime })).not.toThrow()
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm vitest run src/lib/alert.test.ts`
Expected: FAIL, cannot resolve `./alert`.

- [ ] **Step 3: Implement**

`src/lib/alert.ts`:

```ts
export interface AlertPrefs {
  sound: boolean
  vibration: boolean
}

export interface AlertDevice {
  vibrate?(pattern: number[]): void
  chime(): void
}

export function fireAlert(prefs: AlertPrefs, device: AlertDevice) {
  if (prefs.vibration) device.vibrate?.([200, 100, 200])
  if (!prefs.sound) return
  try {
    device.chime()
  } catch {
    // Audio stays locked until the first tap; the pulsing timer still signals expiry.
  }
}

let audio: AudioContext | null = null

// iOS only starts audio inside a user gesture and suspends it again in the background.
export function unlockAudio() {
  audio ??= new AudioContext()
  if (audio.state !== 'running') void audio.resume()
}

function chime() {
  const ctx = audio
  if (!ctx || ctx.state !== 'running') throw new Error('Audio is locked')
  const start = ctx.currentTime
  ;[880, 660].forEach((frequency, i) => {
    const at = start + i * 0.2
    const tone = ctx.createOscillator()
    const gain = ctx.createGain()
    tone.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.4)
    tone.connect(gain).connect(ctx.destination)
    tone.start(at)
    tone.stop(at + 0.45)
  })
}

export const canVibrate = () => typeof navigator !== 'undefined' && 'vibrate' in navigator

export const browserDevice: AlertDevice = {
  vibrate: (pattern) => {
    if (canVibrate()) navigator.vibrate(pattern)
  },
  chime,
}
```

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run src/lib/alert.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing store test**

In `src/store/appStore.test.ts` add inside `describe('app store', …)`:

```ts
  it('persists alert preferences', async () => {
    const { db, store } = await setup()
    expect(store.getState().prefs.alerts).toEqual({ sound: true, vibration: true })
    store.getState().setAlerts({ sound: false, vibration: true })
    await store.getState().flush()
    expect((await loadPrefs(db)).alerts).toEqual({ sound: false, vibration: true })
  })
```

Run: `pnpm vitest run src/store/appStore.test.ts`
Expected: FAIL (`alerts` undefined / `setAlerts` not a function).

- [ ] **Step 6: Implement prefs and the action**

`src/storage/db.ts`: `import type { AlertPrefs } from '@/lib/alert'` and add `alerts: AlertPrefs` to `Prefs`.

`src/storage/repo.ts`: add `alerts: { sound: true, vibration: true }` to `DEFAULT_PREFS`.

`src/store/appStore.ts`: add `setAlerts(alerts: AlertPrefs): void` to `AppActions` and implement it next to `forgetPlayer`:

```ts
      setAlerts: (alerts) => patchPrefs({ alerts }),
```

- [ ] **Step 7: Run all tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib src/storage src/store
git commit -m "Add alert preferences and alert firing"
```

---

### Task 5: Voting and verdict cards, per-death reveal

**Files:**
- Create: `src/ui/screens/game/cards/VotingCard.tsx`, `src/ui/screens/game/cards/VerdictCard.tsx`
- Delete: `src/ui/screens/game/cards/ExecutionCard.tsx`
- Modify: `src/ui/components/Stepper.tsx`, `src/ui/screens/game/StepView.tsx`, `src/ui/screens/game/cards/MorningCard.tsx`, `src/ui/screens/game/sheets/AdjustSheet.tsx`, `src/ui/screens/game/sheets/GraveyardSheet.tsx`, `src/ui/screens/game/sheets/NarratorLogSheet.tsx`, `src/ui/screens/game/sheets/RosterSheet.tsx`, `src/ui/screens/end/EndScreen.tsx`, `src/ui/screens/HomeScreen.tsx`, `src/ui/screens/setup/SettingsPage.tsx`, `docs/design.md` (one glossary line)
- Test: `e2e/game.spec.ts`, `e2e/dummy-step.spec.ts`

**Interfaces:**
- Consumes: `StepInput` votes/verdict/morning (Task 2), `DayResult` (Task 2), `votesNeeded`, `Tally` (Task 1), `graveyard(derived, cursor)`, `aliveAt(derived, cursor)`, log and chronicle entries (Task 3).
- Produces: `Stepper` gains `max?: number`; `VotingCard(props: StepProps)`, `VerdictCard(props: StepProps)`.

- [ ] **Step 1: Update the e2e tests to the new day flow (they fail first)**

`e2e/game.spec.ts`: replace everything after the browser-back block (from `await next(page)` that follows `await expect(page.getByText('Az éjszaka meghalt:')).toBeVisible()` the second time) with:

```ts
  await next(page)
  await next(page)

  // 4 players are alive, so 3 votes are a majority
  await page.getByRole('button', { name: 'Jelölt hozzáadása' }).click()
  await pick(page, cast.killer)
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: `${cast.killer} szavazatai +1` }).click()
  }
  await next(page)

  await expect(page.getByText(`${cast.killer} kivégzésre kerül.`)).toBeVisible()
  await expect(page.getByText(/Szerepe:/)).toHaveCount(0)
  await page.getByRole('button', { name: 'Szerep felfedése' }).click()
  await expect(page.getByText(/Szerepe:\s*Gyilkos/)).toBeVisible()

  await next(page)
  await expect(page.getByRole('alertdialog')).toContainText('A város nyert!')
  await page.getByRole('button', { name: 'Játék vége' }).click()
  await expect(page.getByText('A város nyert!')).toBeVisible()
  await expect(page.getByText('Krónika')).toBeVisible()
```

`e2e/dummy-step.spec.ts`: replace the day-1 lines

```ts
  await next(page)
  await next(page)
  await page.getByRole('button', { name: 'Senkit' }).click()
  await next(page)
  await page.getByRole('button', { name: 'Jöhet az éjszaka' }).click()
```

with

```ts
  await next(page)
  await next(page)
  await next(page)
  await next(page)
  await page.getByRole('button', { name: 'Jöhet az éjszaka' }).click()
```

Run: `pnpm e2e`
Expected: FAIL (the build fails on the removed `execution` kind, or the voting UI is missing).

- [ ] **Step 2: Stepper maximum**

`src/ui/components/Stepper.tsx`: add `max?: number` to the props and `disabled={max !== undefined && value >= max}` on the `+1` button.

- [ ] **Step 3: Voting card**

`src/ui/screens/game/cards/VotingCard.tsx`:

```tsx
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { Nomination } from '@/domain/types'
import { votesNeeded } from '@/domain/vote'
import { useActions } from '@/store/hooks'
import { Stepper } from '@/ui/components/Stepper'
import { playerById } from '@/ui/names'
import { Button } from '@/ui/primitives/button'
import { PlayerGrid } from '../PlayerGrid'
import { Say, StepCard } from '../StepCard'
import type { StepProps } from '../types'
import { StaleChoiceAlert } from './StaleChoiceAlert'

export function VotingCard({ step, game, derived }: StepProps) {
  const actions = useActions()
  const [picking, setPicking] = useState(false)
  const { setup } = game
  const alive = derived.phases[step.phase].day!.aliveAfterMorning
  const stored = game.inputs[step.id]
  const nominations = stored?.kind === 'votes' ? stored.nominations : []
  const save = (next: Nomination[]) =>
    actions.setInput(step.id, { kind: 'votes', nominations: next })
  const nominated = new Set(nominations.map((n) => n.playerId))
  const candidates = setup.players.filter((p) => alive.includes(p.id) && !nominated.has(p.id))

  return (
    <StepCard title="Szavazás">
      <Say>Kit jelöltök kivégzésre?</Say>
      {derived.invalid.has(step.id) && <StaleChoiceAlert />}
      {nominations.length === 0 && <p className="text-muted-foreground">Még nincs jelölt.</p>}
      <ul className="flex flex-col gap-2">
        {nominations.map((n) => {
          const name = playerById(setup, n.playerId).name
          return (
            <li key={n.playerId} className="flex items-center gap-2 rounded-xl bg-secondary py-1 pr-1 pl-4">
              <span className="flex-1 truncate text-lg font-semibold">{name}</span>
              <Stepper
                label={`${name} szavazatai`}
                value={n.votes}
                max={alive.length}
                onChange={(votes) =>
                  save(nominations.map((m) => (m.playerId === n.playerId ? { ...m, votes } : m)))
                }
              />
              <Button
                variant="ghost"
                size="icon-touch"
                aria-label={`${name} jelölésének törlése`}
                onClick={() => save(nominations.filter((m) => m.playerId !== n.playerId))}
              >
                <X />
              </Button>
            </li>
          )
        })}
      </ul>
      {picking ? (
        <div className="flex flex-col gap-3">
          <PlayerGrid
            players={candidates}
            options={candidates.map((p) => ({ playerId: p.id, disabled: null }))}
            selectedId={undefined}
            action="none"
            onSelect={(playerId) => {
              save([...nominations, { playerId, votes: 0 }])
              setPicking(false)
            }}
          />
          <Button variant="ghost" size="touch" onClick={() => setPicking(false)}>
            Mégse
          </Button>
        </div>
      ) : (
        candidates.length > 0 && (
          <Button variant="outline" size="touch" onClick={() => setPicking(true)}>
            <Plus />
            Jelölt hozzáadása
          </Button>
        )
      )}
      <p className="text-sm text-muted-foreground">
        Kivégzéshez legalább {votesNeeded(alive.length)} szavazat kell.
      </p>
    </StepCard>
  )
}
```

- [ ] **Step 4: Verdict card**

`src/ui/screens/game/cards/VerdictCard.tsx`:

```tsx
import { cn } from 'cn'
import { winnerLabel } from '@/domain/copy'
import { useActions } from '@/store/hooks'
import { FACTION_TONE } from '@/ui/labels'
import { playerById } from '@/ui/names'
import { Button } from '@/ui/primitives/button'
import { Say, StepCard } from '../StepCard'
import type { StepProps } from '../types'

export function VerdictCard({ step, game, derived }: StepProps) {
  const actions = useActions()
  const { setup } = game
  const day = derived.phases[step.phase].day!
  const result = day.tally
  const name = (id: string) => playerById(setup, id).name

  if (result.outcome === 'executed') {
    const player = playerById(setup, result.playerId)
    const role = setup.roles[player.roleId]
    const revealed = day.revealed.includes(player.id)
    return (
      <StepCard title="Ítélet">
        <Say>{player.name} kivégzésre kerül.</Say>
        <p className="text-muted-foreground">{result.votes} szavazat</p>
        {revealed ? (
          <>
            <p className="text-lg">
              Szerepe: <span className={cn('font-semibold', FACTION_TONE[role.faction])}>{role.name}</span>
            </p>
            {role.neutralGoal === 'executed' && (
              <p className="font-semibold text-primary">{winnerLabel({ roleId: role.id }, setup.roles)}</p>
            )}
          </>
        ) : (
          <Button
            variant="outline"
            size="touch"
            onClick={() => actions.setInput(step.id, { kind: 'verdict', revealed: true })}
          >
            Szerep felfedése
          </Button>
        )}
      </StepCard>
    )
  }

  return (
    <StepCard title="Ítélet">
      {result.outcome === 'none' && <Say>Nem volt jelölt – ma senkit sem végeznek ki.</Say>}
      {result.outcome === 'tie' && (
        <>
          <Say>Döntetlen – ma senkit sem végeznek ki.</Say>
          <p className="text-muted-foreground">
            {result.playerIds.map(name).join(', ')} – {result.votes} szavazat
          </p>
        </>
      )}
      {result.outcome === 'noMajority' && (
        <>
          <Say>Nincs meg a többség – ma senkit sem végeznek ki.</Say>
          <p className="text-muted-foreground">
            {name(result.playerId)} – {result.votes} szavazat. Legalább {result.needed} szavazat
            kellett volna.
          </p>
        </>
      )}
    </StepCard>
  )
}
```

Add **"Legalább 4 szavazat kellett volna."** to the Verdict row of the glossary in `docs/design.md` §10.

- [ ] **Step 5: Morning reveal and the adjust sheet**

`MorningCard.tsx`: each death row becomes a flex row: `☠ {name}`, then either ` – {role name}` (when `day.revealed.includes(id)`) or an `outline` button **"Szerep felfedése"** (`h-14 shrink-0`) that writes:

```ts
actions.setInput(step.id, {
  kind: 'morning',
  adjustments: day.adjustments,
  revealed: [...day.revealed.filter((r) => day.announced.includes(r)), id],
})
```

Keep the **"(mesélői módosítás)"** marker. Remove every `revealRoleOnDeath` reference.

`AdjustSheet.tsx`: the written input keeps the reveals:

```ts
actions.setInput(stepId(game.cursor.phase, 'morning'), {
  kind: 'morning',
  adjustments,
  revealed: day.revealed.filter((id) => day.announced.includes(id)),
})
```

- [ ] **Step 6: Histories, roster, end screen, home, settings page**

- `GraveyardSheet.tsx`: call `graveyard(derived, game.cursor)`; show ` (${role name})` only when `entry.revealed`.
- `NarratorLogSheet.tsx`: replace the `execution` case with:

```ts
    case 'nomination':
      return `Jelölés → ${n(entry.playerId)}: ${entry.votes} szavazat`
    case 'verdict':
      switch (entry.tally.outcome) {
        case 'executed':
          return `Kivégzés → ${n(entry.tally.playerId)}`
        case 'tie':
          return 'Döntetlen – nem volt kivégzés'
        case 'noMajority':
          return 'Nincs többség – nem volt kivégzés'
        case 'none':
          return 'Nem volt jelölt'
      }
```

- `EndScreen.tsx`: `aliveAt(derived, game.cursor)`; the `executed` chronicle line is `` `${name} – kivégezték (${entry.votes} szavazat)` ``.
- `RosterSheet.tsx`, `HomeScreen.tsx`: `aliveAt(derived, game.cursor)`.
- `SettingsPage.tsx`: remove the "Halottak szerepének felfedése" switch.
- `StepView.tsx`: `case 'voting': return <VotingCard {...props} />` and `case 'verdict': return <VerdictCard {...props} />`; delete `ExecutionCard.tsx` and its import.

- [ ] **Step 7: Verify**

Run: `npx tsc -b && pnpm lint && pnpm test && pnpm e2e`
Expected: all pass, 2 e2e tests green.

- [ ] **Step 8: Check in the browser**

On the dev server at 375×812, play to day 1 and check:
1. The voting card shows "Kivégzéshez legalább N szavazat kell." with N = floor(alive / 2) + 1; the vote stepper stops at the living count.
2. Two nominees with equal votes → verdict "Döntetlen – ma senkit sem végeznek ki." with both names.
3. Below the majority → "Nincs meg a többség…" and "Legalább N szavazat kellett volna."
4. A morning death shows "Szerep felfedése"; after tapping, the role appears on the card and in the Temető; an unrevealed death shows only the name in the Temető.
5. Back from the verdict to voting, change votes, forward again: the verdict follows.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Replace execution with nominations, votes and a verdict"
```

---

### Task 6: Timer alerts and the app settings sheet

**Files:**
- Create: `src/ui/hooks/useExpiryAlert.ts`, `src/ui/components/AppSettingsSheet.tsx`
- Delete: `src/ui/hooks/useVibrateOnRise.ts`
- Modify: `src/ui/screens/game/Countdown.tsx`, `src/ui/screens/game/cards/DiscussionCard.tsx`, `src/ui/App.tsx`, `src/ui/screens/HomeScreen.tsx`, `src/ui/screens/game/types.ts`, `src/ui/screens/game/sheets/MenuSheet.tsx`, `src/ui/screens/game/GameScreen.tsx`

**Interfaces:**
- Consumes: `fireAlert`, `browserDevice`, `unlockAudio`, `canVibrate`, `AlertPrefs` (Task 4), `setAlerts`, `prefs.alerts` (Task 4), `BottomSheet`, `SwitchRow` (existing).
- Produces: `useExpiryAlert(expired: boolean): void`, `AppSettingsSheet({ open, onClose })`, `SheetId` gains `'settings'`.

- [ ] **Step 1: Expiry hook**

`src/ui/hooks/useExpiryAlert.ts`:

```ts
import { useEffect, useRef } from 'react'
import { browserDevice, fireAlert } from '@/lib/alert'
import { useApp } from '@/store/hooks'

export function useExpiryAlert(expired: boolean) {
  const alerts = useApp((s) => s.prefs.alerts)
  const previous = useRef(expired)
  useEffect(() => {
    if (expired && !previous.current) fireAlert(alerts, browserDevice)
    previous.current = expired
  }, [expired, alerts])
}
```

Replace `useVibrateOnRise` with `useExpiryAlert` in `Countdown.tsx` and `DiscussionCard.tsx`; delete `useVibrateOnRise.ts`.

- [ ] **Step 2: Audio unlock**

In `App.tsx`:

```tsx
useEffect(() => {
  window.addEventListener('pointerdown', unlockAudio)
  return () => window.removeEventListener('pointerdown', unlockAudio)
}, [])
```

- [ ] **Step 3: App settings sheet**

`src/ui/components/AppSettingsSheet.tsx`: a `BottomSheet` titled **"Beállítások"** containing:
- `SwitchRow` **"Hang"** bound to `prefs.alerts.sound`,
- `SwitchRow` **"Rezgés"** bound to `prefs.alerts.vibration`,
- when `!canVibrate()`, a muted line **"Ezen az eszközön a böngésző nem tud rezegni."**,
- an `outline` `size="touch"` button **"Próba"** calling `fireAlert(prefs.alerts, browserDevice)`.

Each switch calls `actions.setAlerts({ ...alerts, sound })` / `{ ...alerts, vibration }`.

- [ ] **Step 4: Wire it**

- Home: a `ghost` `size="touch"` button **"Beállítások"** below "Szerepek" opening the sheet (local state).
- Game: `SheetId` gains `'settings'`; `MenuSheet` lists **"Beállítások"** between "Mesélői napló" and "Játék befejezése"; `GameScreen` renders `<AppSettingsSheet open={sheet === 'settings'} onClose={() => setSheet(null)} />`.

- [ ] **Step 5: Verify**

Run: `npx tsc -b && pnpm lint && pnpm test && pnpm e2e`
Expected: all pass.

In the browser: open Beállítások from Home, turn "Hang" off, reload, it stays off; "Próba" plays the chime (sound on) after any tap; a step countdown reaching zero chimes once; the discussion countdown reaching zero chimes once and shows "Lejárt az idő! Jöhet a szavazás.".

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Alert with sound and vibration when timers expire"
```

---

### Task 7: Cloudflare hosting

**Files:**
- Create: `wrangler.jsonc`, `public/_headers`
- Modify: `package.json`, `.gitignore`, `README.md`

- [ ] **Step 1: Load the wrangler skill**

Invoke `cloudflare:wrangler` and follow its current conventions for an assets-only Worker if they differ from the config below.

- [ ] **Step 2: Install and configure**

```bash
pnpm add -D wrangler
```

`wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "duskwarden",
  "compatibility_date": "2026-10-01",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

`public/_headers`:

```
/
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/sw.js
  Cache-Control: no-cache
/manifest.webmanifest
  Cache-Control: no-cache
```

`package.json` script: `"deploy:cloudflare": "pnpm build && wrangler deploy"`. Append `.wrangler` to `.gitignore`.

- [ ] **Step 3: Verify without deploying**

Run: `pnpm build && pnpm exec wrangler deploy --dry-run`
Expected: wrangler lists the assets from `dist` (including `_headers`, `sw.js`) and exits without uploading.

- [ ] **Step 4: README**

Replace the "Deploying" section: hosted on Cloudflare Workers static assets; first run `pnpm exec wrangler login`, then `pnpm deploy:cloudflare`; `public/_headers` keeps the service worker and `index.html` revalidated so updates are picked up.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Host on Cloudflare Workers static assets"
```

---

### Task 8: Final verification

- [ ] **Step 1: Full check**

Run: `pnpm format && pnpm lint && npx tsc -b && pnpm test && pnpm build && pnpm e2e`
Expected: everything passes, no formatting diff.

- [ ] **Step 2: Manual run-through**

At 375×812, a 6-player game (2 killers who know each other, doctor, detective, jester, villager), "A bolond győzelmével véget ér a játék" on:
1. Day 1: nominate two players with a tie → nobody executed; Temető lists no execution.
2. Day 2: reveal one night death, nominate the jester with a majority → verdict, no role until "Szerep felfedése", then "Szerepe: Bolond" and "A bolond nyert!"; leaving the verdict offers the jester win.
3. Go back into night 2 and kill the jester instead: the day-2 nomination is flagged and ignored, the verdict becomes "Nem volt jelölt…" or follows the remaining nominations.
4. Temető shows only revealed roles; Mesélői napló lists "Jelölés → …" and the verdict lines.
5. A step countdown and the discussion countdown chime at zero; with Hang off they stay silent.

- [ ] **Step 3: Copy for review**

List every new Hungarian string from this plan for the user's native-speaker check (voting, verdict, reveal, app settings, log and chronicle lines).
