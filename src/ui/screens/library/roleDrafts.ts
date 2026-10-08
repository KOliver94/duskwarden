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
