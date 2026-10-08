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
    expect(fillWithVillagers({ killer: 1, doctor: 1 }, 5)).toEqual({
      killer: 1,
      doctor: 1,
      villager: 3,
    })
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
