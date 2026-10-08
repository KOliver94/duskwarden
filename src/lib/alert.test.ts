import { describe, expect, it, vi } from 'vitest'
import { fireAlert, unlockAudio } from './alert'

const device = () => ({ vibrate: vi.fn(), chime: vi.fn() })

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

describe('unlockAudio', () => {
  it('does nothing where Web Audio is missing', () => {
    expect(() => unlockAudio()).not.toThrow()
  })
})
