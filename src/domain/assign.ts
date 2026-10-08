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
