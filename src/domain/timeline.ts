export const isNight = (phase: number) => phase % 2 === 0

export const phaseNumber = (phase: number) => Math.floor(phase / 2) + 1

export const stepId = (phase: number, slot: string) =>
  `${isNight(phase) ? 'n' : 'd'}${phaseNumber(phase)}:${slot}`

export const firstStepId = (phase: number) => stepId(phase, isNight(phase) ? 'dusk' : 'morning')
