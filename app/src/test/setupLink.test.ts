import { describe, it, expect, beforeEach } from 'vitest'
import { applySetupFromUrl, decodeSetup, encodeSetup } from '../lib/setupLink'
import { useConfig } from '../lib/config'

beforeEach(() => {
  localStorage.clear()
  useConfig.getState().set({ url: '', secret: '', groqKey: '' })
})

describe('Setup-Link', () => {
  it('kodiert URL-sicher und dekodiert verlustfrei, auch mit Umlauten', () => {
    const p = { u: 'https://organizer.example.workers.dev', s: 'a7b/l+M==Ü', g: 'gsk_x' }
    const enc = encodeSetup(p)
    expect(enc).not.toMatch(/[+/=]/)
    expect(decodeSetup(enc)).toEqual(p)
    expect(decodeSetup('%%%')).toBeNull()
  })

  it('übernimmt ?setup= in die Konfiguration und entfernt den Parameter', () => {
    const enc = encodeSetup({ u: 'https://w.example', s: 'tok', g: 'gsk_1' })
    window.history.replaceState(null, '', '/organizer/next/?setup=' + enc + '&x=1')
    expect(applySetupFromUrl()).toBe(true)
    const c = useConfig.getState()
    expect(c.url).toBe('https://w.example')
    expect(c.secret).toBe('tok')
    expect(c.groqKey).toBe('gsk_1')
    expect(window.location.search).toBe('?x=1')
    expect(localStorage.getItem('organizer_worker_secret')).toBe('tok')
  })

  it('tut nichts ohne Parameter', () => {
    window.history.replaceState(null, '', '/organizer/next/')
    expect(applySetupFromUrl()).toBe(false)
  })
})
