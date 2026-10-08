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

export interface Nomination {
  playerId: string
  votes: number
}

export type StepInput =
  | { kind: 'target'; targetId: string | null }
  | { kind: 'vest'; use: boolean }
  | { kind: 'tell'; told: string[] }
  | { kind: 'morning'; adjustments: Adjustment[]; revealed: string[] }
  | { kind: 'votes'; nominations: Nomination[] }
  | { kind: 'verdict'; revealedId: string | null }

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
  | (StepBase & { kind: 'dusk' | 'tell' | 'morning' | 'discussion' | 'voting' | 'verdict' })
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
