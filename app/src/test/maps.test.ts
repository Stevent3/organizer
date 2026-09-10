import { describe, expect, it } from 'vitest'
import { looksLikePlace, mapsUrl } from '../lib/maps'
import { describeSyncError } from '../lib/syncEngine'

describe('Route öffnen', () => {
  it('erkennt Adressen und Orte, aber keine Links oder Online-Meetings', () => {
    expect(looksLikePlace('Am Sande 33, 21335 Lüneburg')).toBe(true)
    expect(looksLikePlace('Café Central')).toBe(true)
    expect(looksLikePlace('Leuphana Campus')).toBe(true)
    expect(looksLikePlace('Microsoft Teams-Besprechung', true)).toBe(false)
    expect(looksLikePlace('https://zoom.us/j/123')).toBe(false)
    expect(looksLikePlace('Notiz an mich')).toBe(false)
    expect(looksLikePlace('Notiz an mich', true)).toBe(true)
    expect(looksLikePlace('')).toBe(false)
  })
  it('baut den Apple-Karten-Link', () => {
    expect(mapsUrl('Am Sande 33,  Lüneburg')).toBe('https://maps.apple.com/?q=Am%20Sande%2033%2C%20L%C3%BCneburg')
  })
})

describe('Sync-Fehler lesbar', () => {
  it('übersetzt Netzwerkfehler und 401', () => {
    expect(describeSyncError(new TypeError('Failed to fetch'))).toMatch(/Worker nicht erreichbar|Offline/)
    expect(describeSyncError(new Error('Worker antwortet mit 401'))).toBe('Token stimmt nicht (401)')
    expect(describeSyncError(new Error('kaputt'))).toBe('kaputt')
  })
})
