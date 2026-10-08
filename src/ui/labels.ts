import type { ActionKind, Faction, NeutralGoal } from '@/domain/types'

export const FACTION_LABEL: Record<Faction, string> = {
  town: 'Város',
  killers: 'Gyilkosok',
  neutral: 'Semleges',
}

export const ACTION_LABEL: Record<ActionKind, string> = {
  none: 'Nem ébred',
  kill: 'Öl',
  protect: 'Véd',
  investigate: 'Vizsgál',
  vest: 'Golyóálló mellény',
  other: 'Egyéb',
}

export const GOAL_LABEL: Record<NeutralGoal, string> = {
  soloKiller: 'Egyedül gyilkol',
  executed: 'Azt akarja, hogy kivégezzék',
  survive: 'Túlélni akar',
  none: 'Nincs külön célja',
}

export const FACTION_TONE: Record<Faction, string> = {
  town: 'text-foreground',
  killers: 'text-blood',
  neutral: 'text-primary',
}

export const FACTION_BORDER: Record<Faction, string> = {
  town: 'border-l-foreground/40',
  killers: 'border-l-blood',
  neutral: 'border-l-primary',
}
