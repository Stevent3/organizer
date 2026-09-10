import { create } from 'zustand'

/**
 * Verbindungsdaten. Die Keys sind dieselben wie in v7 (gleiche Origin), damit die neue App
 * Worker-URL, Token und Groq-Key ohne erneutes Eintippen übernimmt.
 */
export const CONFIG_KEYS = {
  url: 'organizer_worker_url',
  secret: 'organizer_worker_secret',
  groqKey: 'organizer_groq_key',
  writeSync: 'organizer_v8_write_sync',
} as const

export type Config = { url: string; secret: string; groqKey: string; writeSync: boolean }

function read(): Config {
  try {
    return {
      url: localStorage.getItem(CONFIG_KEYS.url) ?? '',
      secret: localStorage.getItem(CONFIG_KEYS.secret) ?? '',
      groqKey: localStorage.getItem(CONFIG_KEYS.groqKey) ?? '',
      // Seit dem Umzug (10.09.2026) ist v8 die Haupt-App: Schreib-Sync standardmäßig an
      writeSync: localStorage.getItem(CONFIG_KEYS.writeSync) !== '0',
    }
  } catch {
    return { url: '', secret: '', groqKey: '', writeSync: true }
  }
}

type ConfigStore = Config & { set: (patch: Partial<Config>) => void }

export const useConfig = create<ConfigStore>()((setState, get) => ({
  ...read(),
  set: (patch) => {
    const next = { ...get(), ...patch }
    try {
      localStorage.setItem(CONFIG_KEYS.url, next.url.trim().replace(/\/$/, ''))
      localStorage.setItem(CONFIG_KEYS.secret, next.secret.trim())
      localStorage.setItem(CONFIG_KEYS.groqKey, next.groqKey.trim())
      localStorage.setItem(CONFIG_KEYS.writeSync, next.writeSync ? '1' : '0')
    } catch { /* privater Modus */ }
    setState({ url: next.url.trim().replace(/\/$/, ''), secret: next.secret.trim(), groqKey: next.groqKey.trim(), writeSync: next.writeSync })
  },
}))

export const isConfigured = (c: Pick<Config, 'url' | 'secret'>) => !!c.url && !!c.secret
