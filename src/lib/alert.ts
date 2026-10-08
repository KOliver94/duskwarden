export interface AlertPrefs {
  sound: boolean
  vibration: boolean
}

export interface AlertDevice {
  vibrate?(pattern: number[]): void
  chime(): void
}

export function fireAlert(prefs: AlertPrefs, device: AlertDevice) {
  if (prefs.vibration) device.vibrate?.([200, 100, 200])
  if (!prefs.sound) return
  try {
    device.chime()
  } catch {
    // Audio stays locked until the first tap; the pulsing timer still signals expiry.
  }
}

let audio: AudioContext | null = null

// iOS only starts audio inside a user gesture and suspends it again in the background.
export function unlockAudio() {
  // Safari before 14.5 only has the prefixed constructor.
  const Context =
    globalThis.AudioContext ??
    (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Context) return
  audio ??= new Context()
  if (audio.state !== 'running') audio.resume().catch(() => {})
}

function chime() {
  const ctx = audio
  if (!ctx || ctx.state !== 'running') throw new Error('Audio is locked')
  const start = ctx.currentTime
  ;[880, 660].forEach((frequency, i) => {
    const at = start + i * 0.2
    const tone = ctx.createOscillator()
    const gain = ctx.createGain()
    tone.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.4)
    tone.connect(gain).connect(ctx.destination)
    tone.start(at)
    tone.stop(at + 0.45)
  })
}

export const canVibrate = () => typeof navigator !== 'undefined' && 'vibrate' in navigator

export const browserDevice: AlertDevice = {
  vibrate: (pattern) => {
    if (canVibrate()) navigator.vibrate(pattern)
  },
  chime,
}
