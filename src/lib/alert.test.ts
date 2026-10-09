import { describe, expect, it, vi } from 'vitest'
import { fireAlert, unlockAudio } from './alert'

const device = (accepted = true) => ({ vibrate: vi.fn(() => accepted), chime: vi.fn() })

describe('fireAlert', () => {
  it('vibrates and chimes when both are on', () => {
    const d = device()
    fireAlert({ sound: true, vibration: true }, d)
    expect(d.vibrate).toHaveBeenCalledOnce()
    expect(d.chime).toHaveBeenCalledOnce()
  })

  it('respects each switch', () => {
    const d = device()
    fireAlert({ sound: false, vibration: false }, d)
    expect(d.vibrate).not.toHaveBeenCalled()
    expect(d.chime).not.toHaveBeenCalled()
  })

  it('survives a device without vibration or audio', () => {
    const chime = vi.fn(() => {
      throw new Error('Audio is locked')
    })
    expect(() => fireAlert({ sound: true, vibration: true }, { chime })).not.toThrow()
  })
})

describe('fireAlert result', () => {
  it('reports a vibration the browser accepted', () => {
    expect(fireAlert({ sound: false, vibration: true }, device(true))).toBe('sent')
  })

  it('reports a vibration the browser refused', () => {
    expect(fireAlert({ sound: false, vibration: true }, device(false))).toBe('blocked')
  })

  it('reports a device without vibration', () => {
    expect(fireAlert({ sound: false, vibration: true }, { chime: vi.fn() })).toBe('unsupported')
  })

  it('reports vibration switched off', () => {
    expect(fireAlert({ sound: true, vibration: false }, device())).toBe('off')
  })
})

describe('unlockAudio', () => {
  it('does nothing where Web Audio is missing', () => {
    expect(() => unlockAudio()).not.toThrow()
  })
})
