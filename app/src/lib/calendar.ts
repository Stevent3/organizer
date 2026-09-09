import type { EventItem } from './model'
import { addDaysKey, timeToMin } from './time'

export const DEFAULT_DURATION = 60

export function eventEndDate(ev: EventItem): string {
  return ev.endDate && ev.endDate > ev.date ? ev.endDate : ev.date
}

export function isMultiDay(ev: EventItem): boolean {
  return eventEndDate(ev) !== ev.date
}

/** Deckt der Termin den Tag ab? (Mehrtages-Termine zählen an jedem Tag) */
export function coversDay(ev: EventItem, dayKey: string): boolean {
  return ev.date <= dayKey && dayKey <= eventEndDate(ev)
}

export function eventsOnDay(events: EventItem[], dayKey: string): EventItem[] {
  return events.filter((e) => coversDay(e, dayKey)).sort(compareEvents)
}

/** Ganztägig/mehrtägig zuerst, dann nach Startzeit, dann Titel */
export function compareEvents(a: EventItem, b: EventItem): number {
  const aTop = a.allDay || isMultiDay(a) ? 0 : 1
  const bTop = b.allDay || isMultiDay(b) ? 0 : 1
  if (aTop !== bTop) return aTop - bTop
  const am = timeToMin(a.time) ?? -1, bm = timeToMin(b.time) ?? -1
  if (am !== bm) return am - bm
  return a.text.localeCompare(b.text, 'de')
}

/** Start/Ende in Minuten für die Timeline; ohne Ende gilt die Standarddauer */
export function timedRange(ev: EventItem): { start: number; end: number } | null {
  if (ev.allDay) return null
  const start = timeToMin(ev.time)
  if (start == null) return null
  let end = timeToMin(ev.end)
  if (end == null || end <= start) end = Math.min(start + DEFAULT_DURATION, 1440)
  return { start, end }
}

export type Placed = { ev: EventItem; start: number; end: number; col: number; cols: number }

/**
 * Überlappungs-Layout für die Tages-Timeline: Termine, die sich zeitlich überschneiden,
 * werden nebeneinander in Spalten gelegt (wie Apple Kalender).
 */
export function layoutDay(events: EventItem[]): Placed[] {
  const timed = events
    .map((ev) => ({ ev, r: timedRange(ev) }))
    .filter((x): x is { ev: EventItem; r: { start: number; end: number } } => x.r != null)
    .sort((a, b) => a.r.start - b.r.start || b.r.end - a.r.end)

  const out: Placed[] = []
  let cluster: { ev: EventItem; start: number; end: number; col: number }[] = []
  let clusterEnd = -1

  const flush = () => {
    const cols = Math.max(1, ...cluster.map((c) => c.col + 1))
    for (const c of cluster) out.push({ ...c, cols })
    cluster = []
  }

  for (const { ev, r } of timed) {
    if (cluster.length && r.start >= clusterEnd) flush()
    const colEnds: number[] = []
    for (const c of cluster) colEnds[c.col] = Math.max(colEnds[c.col] ?? 0, c.end)
    let col = 0
    while ((colEnds[col] ?? 0) > r.start) col++
    cluster.push({ ev, start: r.start, end: r.end, col })
    clusterEnd = Math.max(clusterEnd, r.end)
  }
  if (cluster.length) flush()
  return out
}

/** Für Wochen-/Monatsansicht: mehrtägige Balken mit Spalten-Start/-Ende innerhalb eines Tagesfensters */
export type Span = { ev: EventItem; from: number; to: number; startsHere: boolean; endsHere: boolean }

export function spansInWindow(events: EventItem[], firstDay: string, days: number): Span[] {
  const lastDay = addDaysKey(firstDay, days - 1)
  const out: Span[] = []
  for (const ev of events) {
    if (!(ev.allDay || isMultiDay(ev))) continue
    const s = ev.date, e = eventEndDate(ev)
    if (e < firstDay || s > lastDay) continue
    const from = dayIndex(firstDay, s < firstDay ? firstDay : s)
    const to = dayIndex(firstDay, e > lastDay ? lastDay : e)
    out.push({ ev, from, to, startsHere: s >= firstDay, endsHere: e <= lastDay })
  }
  return out.sort((a, b) => a.from - b.from || (b.to - b.from) - (a.to - a.from) || a.ev.text.localeCompare(b.ev.text, 'de'))
}

function dayIndex(firstDay: string, key: string): number {
  let i = 0, k = firstDay
  while (k < key && i < 60) { k = addDaysKey(k, 1); i++ }
  return i
}

/** Freie Lücke ab fromMin am Tag (Tap auf Lücke = neuer Termin) */
export function nextFreeSlot(events: EventItem[], fromMin: number, step = 15): number {
  const ranges = events.map(timedRange).filter((r): r is { start: number; end: number } => r != null)
  let t = Math.ceil(fromMin / step) * step
  for (let i = 0; i < 96; i++) {
    const busy = ranges.find((r) => r.start <= t && t < r.end)
    if (!busy) return t
    t = Math.ceil(busy.end / step) * step
  }
  return t
}
