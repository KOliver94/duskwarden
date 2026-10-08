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
  const noun = isNight(phase) ? (accusative ? 'éjszakát' : 'éjszaka') : accusative ? 'napot' : 'nap'
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
