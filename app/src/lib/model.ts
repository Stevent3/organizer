// Datenmodell v8 – kompatibel zum Worker (/state) und zur v7-Struktur, aber mit Datum an jedem Termin.

export type ColorKey = 'accent' | 'green' | 'orange' | 'red' | 'teal' | 'pink' | 'yellow'
export type EnergyLevel = 'low' | 'good' | 'top'
export type ListId = 'today' | 'shopping' | 'work' | 'health'

export type EventItem = {
  id: string
  date: string // 'YYYY-MM-DD' (Starttag)
  endDate?: string // inklusiv, nur bei Mehrtages-Terminen
  allDay: boolean
  time?: string // 'HH:MM' (nur wenn !allDay)
  end?: string // 'HH:MM'
  text: string
  sub?: string // Ort / Notiz
  color: ColorKey
  source: 'manual' | 'calendar'
  key?: string // Apple-Termin: Override-Schlüssel "origTime|origText.toLowerCase()"
  travel?: number // Fahrzeit in Minuten
}

export type Task = { id: string; text: string; done: boolean; tag?: string }

export type Energy = { level: EnergyLevel; label: string; pct: number }

/** Lokale Änderungen an Apple-Terminen – überleben jeden Kalender-Sync (siehe CLAUDE.md §6). */
export type CalOverride = { time?: string; end?: string; text?: string; sub?: string; date?: string; deleted?: boolean }

export type AppState = {
  version: 8
  updatedAt: number
  energy: Energy | null
  tasks: Record<ListId, Task[]>
  events: EventItem[]
  calOverrides: Record<string, CalOverride>
  lastCalendarSync: number | null
}

export const EMPTY_STATE: AppState = {
  version: 8,
  updatedAt: 0,
  energy: null,
  tasks: { today: [], shopping: [], work: [], health: [] },
  events: [],
  calOverrides: {},
  lastCalendarSync: null,
}

export const COLORS: { key: ColorKey; label: string }[] = [
  { key: 'accent', label: 'Indigo' },
  { key: 'teal', label: 'Türkis' },
  { key: 'green', label: 'Grün' },
  { key: 'yellow', label: 'Gelb' },
  { key: 'orange', label: 'Orange' },
  { key: 'red', label: 'Rot' },
  { key: 'pink', label: 'Pink' },
]

export function uid(prefix = 'e') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
