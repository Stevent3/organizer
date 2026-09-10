import { create } from 'zustand'

/** Erscheinungsbild: Hell/Dunkel folgt dem System oder wird fest gewählt, Akzentfarbe frei wählbar. */
export type ThemeMode = 'system' | 'light' | 'dark'
export type AccentId = 'indigo' | 'ozean' | 'sonne' | 'wald' | 'rose'

export const THEME_MODES: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Hell' },
  { id: 'dark', label: 'Dunkel' },
]

/** Vorschaufarbe (hell) je Akzent – die echten Tokens stehen in index.css ([data-accent]) */
export const ACCENTS: { id: AccentId; label: string; swatch: string }[] = [
  { id: 'indigo', label: 'Indigo', swatch: '#5b5bd6' },
  { id: 'ozean', label: 'Ozean', swatch: '#0e7fa8' },
  { id: 'sonne', label: 'Sonne', swatch: '#d9641e' },
  { id: 'wald', label: 'Wald', swatch: '#1f8a4c' },
  { id: 'rose', label: 'Rosé', swatch: '#c9407a' },
]

/** Hintergrundfarben für die Statusleiste (theme-color), identisch mit --bg in index.css */
export const THEME_BG = { light: '#f4f5f9', dark: '#0b0b0f' } as const

const KEY_MODE = 'organizer_v8_theme'
const KEY_ACCENT = 'organizer_v8_accent'

const isMode = (v: unknown): v is ThemeMode => v === 'system' || v === 'light' || v === 'dark'
const isAccent = (v: unknown): v is AccentId => ACCENTS.some((a) => a.id === v)

function read(): { mode: ThemeMode; accent: AccentId } {
  try {
    const m = localStorage.getItem(KEY_MODE), a = localStorage.getItem(KEY_ACCENT)
    return { mode: isMode(m) ? m : 'system', accent: isAccent(a) ? a : 'indigo' }
  } catch {
    return { mode: 'system', accent: 'indigo' }
  }
}

/** Attribute am <html> setzen; die CSS-Tokens reagieren darauf. theme-color (Statusleiste) folgt dem Hintergrund. */
export function applyTheme(mode: ThemeMode, accent: AccentId, doc: Document = document) {
  const root = doc.documentElement
  if (mode === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode)
  if (accent === 'indigo') root.removeAttribute('data-accent')
  else root.setAttribute('data-accent', accent)
  // light-dark() in einer Custom Property wird von getComputedStyle nicht aufgelöst → feste Werte (wie --bg in index.css)
  for (const m of doc.querySelectorAll('meta[name="theme-color"]')) {
    const media = m.getAttribute('media') ?? ''
    const fallback = media.includes('dark') ? THEME_BG.dark : THEME_BG.light
    m.setAttribute('content', mode === 'system' ? fallback : THEME_BG[mode])
  }
}

type ThemeStore = { mode: ThemeMode; accent: AccentId; set: (patch: Partial<{ mode: ThemeMode; accent: AccentId }>) => void }

export const useTheme = create<ThemeStore>()((setState, get) => ({
  ...read(),
  set: (patch) => {
    const next = { mode: patch.mode ?? get().mode, accent: patch.accent ?? get().accent }
    try {
      localStorage.setItem(KEY_MODE, next.mode)
      localStorage.setItem(KEY_ACCENT, next.accent)
    } catch { /* privater Modus */ }
    setState(next)
    applyTheme(next.mode, next.accent)
  },
}))

/** Beim App-Start einmal anwenden (vor dem ersten Paint, damit nichts flackert) */
export function initTheme() {
  const { mode, accent } = useTheme.getState()
  applyTheme(mode, accent)
}
