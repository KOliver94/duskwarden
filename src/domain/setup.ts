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
