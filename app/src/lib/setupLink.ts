import { useConfig } from './config'

/**
 * Übergabe der Zugangsdaten per Link (iOS: jede Homescreen-App hat eigenen Speicher, die v7-App
 * kann ihre localStorage-Werte nicht direkt teilen). v7 öffnet `/next/?setup=<base64url(JSON)>`.
 */
export type SetupPayload = { u?: string; s?: string; g?: string }

export function encodeSetup(p: SetupPayload): string {
  const json = JSON.stringify(p)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeSetup(s: string): SetupPayload | null {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
    const json = decodeURIComponent(escape(atob(b64)))
    const p = JSON.parse(json) as SetupPayload
    return typeof p === 'object' && p ? p : null
  } catch {
    return null
  }
}

/** Beim Start: `?setup=` auswerten, speichern, Parameter aus der URL entfernen. Liefert true, wenn etwas übernommen wurde. */
export function applySetupFromUrl(): boolean {
  let params: URLSearchParams
  try { params = new URLSearchParams(window.location.search) } catch { return false }
  const raw = params.get('setup')
  if (!raw) return false
  const p = decodeSetup(raw)
  if (!p) return false
  const patch: { url?: string; secret?: string; groqKey?: string } = {}
  if (p.u) patch.url = p.u
  if (p.s) patch.secret = p.s
  if (p.g) patch.groqKey = p.g
  if (Object.keys(patch).length) useConfig.getState().set(patch)
  params.delete('setup')
  const clean = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash
  try { window.history.replaceState(null, '', clean) } catch { /* egal */ }
  return Object.keys(patch).length > 0
}
