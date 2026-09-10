import { afterEach, describe, expect, it, vi } from 'vitest'
import { useConfig } from '../lib/config'
import { departureMin, resetTravelCache, travelMinutes } from '../lib/travel'

describe('Losgehen um', () => {
  afterEach(() => { vi.unstubAllGlobals(); resetTravelCache() })

  it('rechnet Abfahrt = Start − Fahrt − 5 Min Puffer', () => {
    expect(departureMin(9 * 60, 23)).toBe(9 * 60 - 28)
    expect(departureMin(9 * 60, 0)).toBeNull()
  })

  it('fragt den Worker einmal je Ort und merkt sich das Ergebnis', async () => {
    useConfig.getState().set({ url: 'https://w.example', secret: 's' })
    const fetchMock = vi.fn(async (_url: string | URL | Request) => new Response(JSON.stringify({ minutes: 23 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await travelMinutes('Am Sande 33')).toBe(23)
    expect(await travelMinutes('am sande 33 ')).toBe(23)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://w.example/travel?place=Am%20Sande%2033')
  })

  it('liefert 0 ohne Verbindung oder bei Fehlern', async () => {
    useConfig.getState().set({ url: '', secret: '' })
    expect(await travelMinutes('Irgendwo')).toBe(0)
    useConfig.getState().set({ url: 'https://w.example', secret: 's' })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await travelMinutes('Woanders')).toBe(0)
  })
})
