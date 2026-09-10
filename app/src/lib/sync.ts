import { coversDay } from './calendar'
import { migrateV3, type V3State } from './migrate'
import type { AppState, CalOverride, EventItem } from './model'
import type { RawCalEvent } from './worker'

/**
 * Override-Schlüssel wie im Worker (calKey): `origTime|text` (klein) für Zeilen ohne Datum (v7-Format),
 * `date|origTime|text` für Zeilen mit Datum – so bleiben bestehende Overrides gültig.
 */
export const calKey = (time: string, text: string, date?: string) => (date ? date + '|' : '') + time + '|' + (text || '').toLowerCase()

/** Ursprüngliche Uhrzeit aus einem Override-Schlüssel (mit oder ohne Datum) */
export function keyTime(key: string): string {
  const parts = key.split('|')
  return parts.length >= 3 ? parts[1] : parts[0]
}

const isTime = (t?: string) => !!t && /^\d{1,2}:\d{2}$/.test(t)

const isDate = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d)

/**
 * Apple-Termine aus dem Worker: deduplizieren, Overrides anwenden, als EventItems.
 * Zeilen mit Datum liegen auf ihrem Tag, Zeilen ohne Datum (altes Kurzbefehl-Format) auf `day` (heute).
 * IDs sind stabil (Tag + Key), damit React nicht flackert und Overrides greifen.
 */
export function buildCalendarEvents(raw: RawCalEvent[], overrides: Record<string, CalOverride>, day: string): EventItem[] {
  const seen = new Set<string>()
  const out: EventItem[] = []
  for (const e of raw) {
    if (!e || !e.text) continue
    const origDate = isDate(e.date) ? e.date! : day
    const dedupe = origDate + '|' + (e.time || '') + '|' + (e.end || '') + '|' + e.text
    if (seen.has(dedupe)) continue
    seen.add(dedupe)
    const key = calKey(e.time || '', e.text, isDate(e.date) ? e.date : undefined)
    const o = overrides[key]
    if (o?.deleted) continue
    const time = o?.time || (isTime(e.time) ? e.time : undefined)
    const endRaw = o?.end !== undefined ? o.end : e.end
    out.push({
      id: 'cal|' + origDate + '|' + key,
      date: o?.date || origDate,
      endDate: !o?.date && isDate(e.endDate) && e.endDate! > origDate ? e.endDate : undefined,
      allDay: !time,
      time,
      end: isTime(endRaw) ? endRaw : undefined,
      text: o?.text || e.text,
      sub: (o?.sub !== undefined ? o.sub : e.sub) || undefined,
      color: 'teal',
      source: 'calendar',
      key,
      travel: e.travel || undefined,
    })
  }
  return out
}

/**
 * Kalender-Snapshot des Workers übernehmen. Er ist die Wahrheit ab heute (Kurzbefehl liefert heute + X Tage):
 * Kalender-Termine ab `day` und aller Tage im Snapshot werden ersetzt, ältere Tage bleiben als Verlauf.
 * updatedAt bleibt (kein Push nötig).
 */
export function applyCalendar(state: AppState, raw: RawCalEvent[], day: string): AppState {
  // Leerer Snapshot (Kurzbefehl hat nichts geliefert): nichts wegwerfen, alter Stand bleibt bis zum nächsten guten Lauf
  if (!raw.length) return state
  const fresh = buildCalendarEvents(raw, state.calOverrides, day)
  const freshIds = new Set(fresh.map((e) => e.id))
  const snapshotDays = new Set(raw.map((e) => (isDate(e?.date) ? e.date! : day)))
  const keep = state.events.filter((e) => e.source !== 'calendar' || (e.date < day && !snapshotDays.has(e.date) && !freshIds.has(e.id)))
  return { ...state, events: [...keep, ...fresh], lastCalendarSync: Date.now() }
}

const V8_FIELDS = ['version', 'updatedAt', 'energy', 'tasks', 'events', 'calOverrides', 'lastCalendarSync', 'shopHistory', 'extra'] as const
const V7_ONLY = ['schedule', 'calendarEvents'] as const

/** Alle Felder, die v8 nicht modelliert (dayPlan, mealPlan, …), zum Durchreichen aufheben */
export function extractExtra(remote: Record<string, unknown>): Record<string, unknown> {
  const skip = new Set<string>([...V8_FIELDS, ...V7_ONLY])
  const extra: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(remote)) if (!skip.has(k)) extra[k] = v
  return extra
}

/**
 * Remote-Stand übernehmen, wenn er neuer ist (updatedAt-Guard, Lesson #2).
 * - v8-Format (version 8 + events): komplett übernehmen
 * - v7-Format: nur der Tag `day` wird aus schedule/calendarEvents neu aufgebaut, andere Tage bleiben
 * Gibt null zurück, wenn nichts zu übernehmen ist.
 */
export function mergeRemoteState(local: AppState, remote: Record<string, unknown> | null | undefined, day: string): AppState | null {
  if (!remote) return null
  const rUpdated = Number(remote.updatedAt ?? 0)
  if (rUpdated <= local.updatedAt) return null

  if (remote.version === 8 && Array.isArray(remote.events)) {
    const r = remote as unknown as AppState
    return {
      ...local,
      updatedAt: rUpdated,
      energy: r.energy ?? null,
      tasks: { ...local.tasks, ...(r.tasks ?? {}) },
      events: r.events,
      calOverrides: r.calOverrides ?? {},
      lastCalendarSync: r.lastCalendarSync ?? local.lastCalendarSync,
      shopHistory: r.shopHistory ?? local.shopHistory,
      extra: { ...local.extra, ...(r.extra ?? {}), ...extractExtra(remote) },
    }
  }

  const m = migrateV3(remote as V3State, day)
  const others = local.events.filter((e) => e.date !== day)
  return {
    ...local,
    updatedAt: rUpdated,
    energy: m.energy,
    tasks: m.tasks,
    events: [...others, ...m.events],
    calOverrides: m.calOverrides,
    lastCalendarSync: m.lastCalendarSync ?? local.lastCalendarSync,
    shopHistory: Object.keys(m.shopHistory).length ? m.shopHistory : local.shopHistory,
    extra: { ...local.extra, ...m.extra },
  }
}

/**
 * Was v8 an den Worker schickt: v8-Felder plus v7-kompatible `schedule`/`calendarEvents`
 * für `day`, damit die alte App (und der Cron) weiter alles versteht. Unbekannte v7-Felder
 * (dayPlan, mealPlan, …) werden unverändert durchgereicht.
 */
export function toWireState(state: AppState, day: string): Record<string, unknown> {
  const today = state.events.filter((e) => coversDay(e, day))
  const schedule = today
    .filter((e) => e.source === 'manual' && !e.allDay && e.time)
    .map((e) => ({ id: e.id, time: e.time, end: e.end ?? '', text: e.text, sub: e.sub ?? '', color: 'ev-blue', source: 'manual' }))
  const calendarEvents = today
    .filter((e) => e.source === 'calendar' && e.time)
    .map((e, i) => ({
      id: 'cal' + i, key: e.key, origTime: keyTime(e.key ?? ''), time: e.time, end: e.end ?? '',
      text: e.text, sub: e.sub ?? '', travel: e.travel ?? 0, color: 'ev-cal', source: 'calendar',
    }))
  return {
    ...state.extra,
    version: 8,
    updatedAt: state.updatedAt,
    energy: state.energy,
    tasks: state.tasks,
    events: state.events,
    calOverrides: state.calOverrides,
    lastCalendarSync: state.lastCalendarSync,
    shopHistory: state.shopHistory,
    schedule,
    calendarEvents,
  }
}
