import { create } from 'zustand'

/** Welche Abschnitte das Dashboard zeigt – unter Mehr → Dashboard schaltbar, nur auf diesem Gerät. */
export type DashSection = 'weather' | 'quickAdd' | 'energy' | 'focus' | 'progress' | 'habits' | 'meal' | 'todos' | 'calendar' | 'work' | 'birthdays' | 'dayClose'

export const DASH_SECTIONS: { id: DashSection; label: string; hint: string }[] = [
  { id: 'weather', label: 'Wetter', hint: 'Chip im Kopf, Open-Meteo, ohne Account' },
  { id: 'quickAdd', label: 'Schnell-Eingabe', hint: '„morgen 15 Uhr Zahnarzt", „Milch, Brot" …' },
  { id: 'energy', label: 'Energie', hint: 'Fließt in alle KI-Vorschläge ein' },
  { id: 'focus', label: 'Jetzt dran', hint: 'Laufender oder nächster Termin, Plan-Block' },
  { id: 'progress', label: 'Tagesfortschritt', hint: 'To-dos, Termine, Plan auf einen Blick' },
  { id: 'habits', label: 'Gewohnheiten', hint: 'Tägliche Routinen mit Serie' },
  { id: 'meal', label: 'Heute essen', hint: 'Aus dem Essensplan im Planer' },
  { id: 'todos', label: 'To-dos', hint: 'Offene Aufgaben mit Schnell-Eingabe' },
  { id: 'calendar', label: 'Kalender', hint: 'Monat + nächste 7 Tage' },
  { id: 'work', label: 'Schichten & Verdienst', hint: 'Aus dem Kalender, Stichwort + Stundenlohn einstellbar' },
  { id: 'birthdays', label: 'Geburtstage', hint: 'Heute und morgen, Glückwunsch von der KI im eigenen Ton' },
  { id: 'dayClose', label: 'Tagesabschluss', hint: 'Abends: Offenes auf morgen, Bilanz' },
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

/** Layout der Heute-Seite: „glance" = alles auf einen Blick ohne Scrollen (Steven 10.09.2026), „classic" = Karten untereinander */
export type DashLayout = 'glance' | 'classic'
export const DASH_LAYOUTS: { id: DashLayout; label: string }[] = [
  { id: 'glance', label: 'Auf einen Blick' },
  { id: 'classic', label: 'Klassisch' },
]
const LAYOUT_KEY = 'organizer_v8_dashboard_layout'
function readLayout(): DashLayout {
  try { return localStorage.getItem(LAYOUT_KEY) === 'classic' ? 'classic' : 'glance' } catch { return 'glance' }
}

type DashStore = { on: Record<DashSection, boolean>; layout: DashLayout; toggle: (id: DashSection, v?: boolean) => void; setLayout: (l: DashLayout) => void }

export const useDashboard = create<DashStore>()((set, get) => ({
  on: read(),
  layout: readLayout(),
  toggle: (id, v) => {
    const on = { ...get().on, [id]: v ?? !get().on[id] }
    try { localStorage.setItem(KEY, JSON.stringify(on)) } catch { /* egal */ }
    set({ on })
  },
  setLayout: (layout) => {
    try { localStorage.setItem(LAYOUT_KEY, layout) } catch { /* egal */ }
    set({ layout })
  },
}))
