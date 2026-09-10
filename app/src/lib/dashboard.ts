import { create } from 'zustand'

/** Welche Abschnitte das Dashboard zeigt – unter Mehr → Dashboard schaltbar, nur auf diesem Gerät. */
export type DashSection = 'weather' | 'quickAdd' | 'energy' | 'focus' | 'progress' | 'meal' | 'todos' | 'calendar'

export const DASH_SECTIONS: { id: DashSection; label: string; hint: string }[] = [
  { id: 'weather', label: 'Wetter', hint: 'Chip im Kopf, Open-Meteo, ohne Account' },
  { id: 'quickAdd', label: 'Schnell-Eingabe', hint: '„morgen 15 Uhr Zahnarzt", „Milch, Brot" …' },
  { id: 'energy', label: 'Energie', hint: 'Fließt in alle KI-Vorschläge ein' },
  { id: 'focus', label: 'Jetzt dran', hint: 'Laufender oder nächster Termin, Plan-Block' },
  { id: 'progress', label: 'Tagesfortschritt', hint: 'To-dos, Termine, Plan auf einen Blick' },
  { id: 'meal', label: 'Heute essen', hint: 'Aus dem Essensplan im Planer' },
  { id: 'todos', label: 'To-dos', hint: 'Offene Aufgaben mit Schnell-Eingabe' },
  { id: 'calendar', label: 'Kalender', hint: 'Monat + nächste 7 Tage' },
]

const KEY = 'organizer_v8_dashboard'
const ALL_ON = Object.fromEntries(DASH_SECTIONS.map((s) => [s.id, true])) as Record<DashSection, boolean>

function read(): Record<DashSection, boolean> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...ALL_ON, ...(JSON.parse(raw) as Partial<Record<DashSection, boolean>>) } : ALL_ON
  } catch {
    return ALL_ON
  }
}

type DashStore = { on: Record<DashSection, boolean>; toggle: (id: DashSection, v?: boolean) => void }

export const useDashboard = create<DashStore>()((set, get) => ({
  on: read(),
  toggle: (id, v) => {
    const on = { ...get().on, [id]: v ?? !get().on[id] }
    try { localStorage.setItem(KEY, JSON.stringify(on)) } catch { /* egal */ }
    set({ on })
  },
}))
