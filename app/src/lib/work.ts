// Schichten & Verdienst (M13 A): Kalender-Termine mit einem Stichwort (z. B. „Samowar") zählen als Arbeitsschicht.
// Einstellungen liegen synchronisiert in state.extra.work, damit der Worker (Wochen-Vorschau) dieselben Zahlen nennt.
import { eventsOnDay, timedRange } from './calendar'
import type { EventItem } from './model'
import { addDaysKey, fromDateKey, timeToMin, todayKey, weekStartKey } from './time'

export type WorkSettings = { keyword: string; rate: number }

/** Mindestlohn 2026 (13,90 €) + 1 € – Stevens Samowar-Satz */
export const DEFAULT_WORK: WorkSettings = { keyword: 'Samowar', rate: 14.9 }

export function readWork(extra: Record<string, unknown>): WorkSettings {
  const w = extra.work as Partial<WorkSettings> | undefined
  const keyword = typeof w?.keyword === 'string' && w.keyword.trim() ? w.keyword.trim() : DEFAULT_WORK.keyword
  const rate = typeof w?.rate === 'number' && w.rate >= 0 ? w.rate : DEFAULT_WORK.rate
  return { keyword, rate }
}

/** Schicht = Termin mit Uhrzeit, dessen Titel das Stichwort enthält (Groß/Klein egal) */
export function isShift(ev: EventItem, keyword: string): boolean {
  return !!keyword && !!timedRange(ev) && ev.text.toLowerCase().includes(keyword.toLowerCase())
}

/** Dauer in Stunden; Nachtschicht über Mitternacht (Ende vor Start oder endDate am Folgetag) wird richtig gezählt */
export function shiftHours(ev: EventItem): number {
  const start = timeToMin(ev.time)
  if (ev.allDay || start == null) return 0
  let end = timeToMin(ev.end)
  if (end == null) return 1 // ohne Ende: eine Stunde (wie die Timeline)
  if (ev.endDate && ev.endDate > ev.date) {
    const days = Math.round((fromDateKey(ev.endDate).getTime() - fromDateKey(ev.date).getTime()) / 86_400_000)
    end += days * 1440
  } else if (end <= start) end += 1440
  return Math.max(0, end - start) / 60
}

export type ShiftSum = { count: number; hours: number; earnings: number }

function sum(list: EventItem[], rate: number): ShiftSum {
  const hours = list.reduce((n, e) => n + shiftHours(e), 0)
  return { count: list.length, hours: Math.round(hours * 100) / 100, earnings: Math.round(hours * rate * 100) / 100 }
}

/** Schichten in einem Zeitraum (inklusive Grenzen), am Starttag gezählt, ohne Doppelungen */
export function shiftsBetween(events: EventItem[], keyword: string, from: string, to: string): EventItem[] {
  const seen = new Set<string>()
  const out: EventItem[] = []
  for (let d = from; d <= to; d = addDaysKey(d, 1)) {
    for (const e of eventsOnDay(events, d)) {
      if (e.date !== d || seen.has(e.id) || !isShift(e, keyword)) continue
      seen.add(e.id)
      out.push(e)
    }
  }
  return out
}

export type ShiftStats = { today: ShiftSum; week: ShiftSum; nextWeek: ShiftSum; month: ShiftSum; next: EventItem | null }

/** Kennzahlen für die Karte: heute, diese Woche (Mo–So), nächste Woche, dieser Monat, nächste Schicht */
export function shiftStats(events: EventItem[], settings: WorkSettings, day = todayKey(), nowMin = 0): ShiftStats {
  const { keyword, rate } = settings
  const ws = weekStartKey(day)
  const monthStart = day.slice(0, 8) + '01'
  const monthEnd = addDaysKey(day.slice(0, 8) + '01', 45).slice(0, 8) + '01'
  const monthLast = addDaysKey(monthEnd, -1)
  const upcoming = shiftsBetween(events, keyword, day, addDaysKey(day, 60))
    .filter((e) => e.date > day || timedRange(e)!.end > nowMin)
    .sort((a, b) => (a.date + a.time!).localeCompare(b.date + b.time!))
  return {
    today: sum(shiftsBetween(events, keyword, day, day), rate),
    week: sum(shiftsBetween(events, keyword, ws, addDaysKey(ws, 6)), rate),
    nextWeek: sum(shiftsBetween(events, keyword, addDaysKey(ws, 7), addDaysKey(ws, 13)), rate),
    month: sum(shiftsBetween(events, keyword, monthStart, monthLast), rate),
    next: upcoming[0] ?? null,
  }
}

export function euro(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}

export function hoursText(h: number): string {
  const r = Math.round(h * 10) / 10
  return (Number.isInteger(r) ? String(r) : r.toLocaleString('de-DE', { maximumFractionDigits: 1 })) + ' h'
}
