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
