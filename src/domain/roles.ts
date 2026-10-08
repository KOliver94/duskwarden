import type { RoleDef } from './types'

export const BUILT_IN_ROLES: RoleDef[] = [
  {
    id: 'killer',
    builtIn: true,
    name: 'Gyilkos',
    namePlural: 'gyilkosok',
    faction: 'killers',
    action: 'kill',
    description:
      'Éjjelente kiválaszt egy áldozatot. A gyilkosok akkor nyernek, ha legalább annyian vannak, mint a többi élő játékos.',
    gmHint:
      'Ha a gyilkosok ismerik egymást, együtt ébrednek, és közösen választanak áldozatot. Ha nem, egyenként ébreszd őket – ilyenkor egymást is megtámadhatják.',
    stepSeconds: 30,
    constraints: { canTargetSelf: false, noRepeatTarget: false },
  },
  {
    id: 'serialKiller',
    builtIn: true,
    name: 'Sorozatgyilkos',
    namePlural: 'sorozatgyilkosok',
    faction: 'neutral',
    neutralGoal: 'soloKiller',
    action: 'kill',
    description:
      'Egyedül játszik: éjjelente kiválaszt egy áldozatot. Akkor nyer, ha rajta kívül legfeljebb egy játékos marad életben.',
    gmHint: 'Nem tartozik a gyilkosok csapatához, de a nyomozó gyanúsnak látja.',
    stepSeconds: 20,
    constraints: { canTargetSelf: false, noRepeatTarget: false },
  },
  {
    id: 'doctor',
    builtIn: true,
    name: 'Orvos',
    namePlural: 'orvosok',
    faction: 'town',
    action: 'protect',
    description:
      'Éjjelente megvéd egy játékost, akit aznap éjjel nem lehet megölni. Ugyanazt a játékost két egymást követő éjjel nem védheti meg, saját magát pedig csak egyszer.',
    gmHint:
      'A tiltott játékosokat az app kiszürkíti. Ha az orvos tiltott játékosra mutat, kérd meg, hogy válasszon mást.',
    stepSeconds: 20,
    constraints: { canTargetSelf: true, noRepeatTarget: true, selfTargetMax: 1 },
  },
  {
    id: 'detective',
    builtIn: true,
    name: 'Nyomozó',
    namePlural: 'nyomozók',
    faction: 'town',
    action: 'investigate',
    description:
      'Éjjelente megvizsgál egy játékost, és megtudja, gyanús-e. A gyilkosok és a sorozatgyilkos gyanúsak, mindenki más nem.',
    gmHint: 'Gyanús játékosnál felfelé mutató hüvelykujjal jelezz, ártatlannál lefelé mutatóval.',
    stepSeconds: 20,
    constraints: { canTargetSelf: false, noRepeatTarget: false },
  },
  {
    id: 'villager',
    builtIn: true,
    name: 'Városlakó',
    namePlural: 'városlakók',
    faction: 'town',
    action: 'none',
    description: 'Nincs különleges képessége. Nappal a vitában és a szavazáson segíti a várost.',
    stepSeconds: 0,
    constraints: { canTargetSelf: false, noRepeatTarget: false },
  },
  {
    id: 'jester',
    builtIn: true,
    name: 'Bolond',
    namePlural: 'bolondok',
    faction: 'neutral',
    neutralGoal: 'executed',
    action: 'none',
    description: 'Akkor nyer, ha a város kivégzi. Mindent megtesz, hogy gyanúsnak tűnjön.',
    gmHint:
      'A beállításoktól függ, hogy a kivégzésével véget ér-e a játék. Ha nem, a játék folytatódik, de a végén a bolond is győztesként szerepel.',
    stepSeconds: 0,
    constraints: { canTargetSelf: false, noRepeatTarget: false },
  },
  {
    id: 'survivor',
    builtIn: true,
    name: 'Túlélő',
    namePlural: 'túlélők',
    faction: 'neutral',
    neutralGoal: 'survive',
    action: 'vest',
    description:
      'Négyszer veheti fel a golyóálló mellényét, ilyenkor aznap éjjel nem lehet megölni. Akkor nyer, ha a játék végén életben van.',
    gmHint: 'Ha a túlélő nem jelez, vedd úgy, hogy nem veszi fel a mellényt.',
    stepSeconds: 15,
    constraints: { canTargetSelf: false, noRepeatTarget: false, maxUses: 4 },
  },
]

export const BUILT_IN_ORDER = ['killer', 'serialKiller', 'doctor', 'survivor', 'detective']

export function rolesById(custom: RoleDef[]): Record<string, RoleDef> {
  return Object.fromEntries([...BUILT_IN_ROLES, ...custom].map((r) => [r.id, r]))
}

export const isSuspicious = (role: RoleDef) => role.suspiciousOverride ?? role.action === 'kill'

export const isHostile = (role: RoleDef) =>
  role.faction === 'killers' || role.neutralGoal === 'soloKiller'

export function wakingOrder(
  order: string[],
  roleIds: string[],
  roles: Record<string, RoleDef>,
): string[] {
  const waking = roleIds.filter((id) => roles[id] && roles[id].action !== 'none')
  return [
    ...order.filter((id) => waking.includes(id)),
    ...waking.filter((id) => !order.includes(id)),
  ]
}
