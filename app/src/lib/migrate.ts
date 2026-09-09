import { EMPTY_STATE, type AppState, type EventItem, type ColorKey, type Task, type ListId } from './model'
import { todayKey } from './time'

/** Roh-Struktur des v7-States (localStorage organizer_v3 / KV state), nur die übernommenen Felder */
export type V3State = {
  version?: number
  updatedAt?: number
  energy?: { level: string; label: string; pct: number } | null
  tasks?: Partial<Record<string, Task[]>>
  schedule?: { id?: string; time?: string; end?: string; text?: string; sub?: string; color?: string; date?: string }[]
  calendarEvents?: { id?: string; key?: string; origTime?: string; time?: string; end?: string; text?: string; sub?: string; travel?: number; date?: string }[]
  calOverrides?: Record<string, { time?: string; end?: string; text?: string; sub?: string; deleted?: boolean }>
  lastCalendarSync?: number | null
}

const V7_COLORS: Record<string, ColorKey> = {
  'ev-blue': 'accent', 'ev-cal': 'teal', 'ev-green': 'green', 'ev-orange': 'orange',
  'ev-red': 'red', 'ev-purple': 'pink', 'ev-yellow': 'yellow',
}
const KEYS: readonly ColorKey[] = ['accent', 'green', 'orange', 'red', 'teal', 'pink', 'yellow']

export function mapColor(c: string | undefined, fallback: ColorKey = 'accent'): ColorKey {
  if (!c) return fallback
  if (c in V7_COLORS) return V7_COLORS[c]
  return KEYS.includes(c as ColorKey) ? (c as ColorKey) : fallback
}

const isTime = (t?: string) => !!t && /^\d{1,2}:\d{2}$/.test(t)

/**
 * v7 zu v8: Termine hatten nur eine Uhrzeit (immer "heute"). Sie bekommen das Datum day
 * (Standard: heute). Apple-Termine behalten ihren Override-Key.
 */
export function migrateV3(raw: V3State | null | undefined, day: string = todayKey()): AppState {
  if (!raw) return { ...EMPTY_STATE, tasks: { ...EMPTY_STATE.tasks } }
  const events: EventItem[] = []

  for (const s of raw.schedule ?? []) {
    if (!s.text) continue
    events.push({
      id: s.id || 'm' + events.length,
      date: s.date || day,
      allDay: !isTime(s.time),
      time: isTime(s.time) ? s.time : undefined,
      end: isTime(s.end) ? s.end : undefined,
      text: s.text,
      sub: s.sub || undefined,
      color: mapColor(s.color),
      source: 'manual',
    })
  }

  for (const c of raw.calendarEvents ?? []) {
    if (!c.text) continue
    events.push({
      id: c.id || 'c' + events.length,
      date: c.date || day,
      allDay: !isTime(c.time),
      time: isTime(c.time) ? c.time : undefined,
      end: isTime(c.end) ? c.end : undefined,
      text: c.text,
      sub: c.sub || undefined,
      color: 'teal',
      source: 'calendar',
      key: c.key || (c.origTime ?? c.time ?? '') + '|' + c.text.toLowerCase(),
      travel: c.travel || undefined,
    })
  }

  const tasks: Record<ListId, Task[]> = { today: [], shopping: [], work: [], health: [] }
  for (const id of Object.keys(tasks) as ListId[]) tasks[id] = (raw.tasks?.[id] ?? []).map((t) => ({ ...t }))

  const level = raw.energy?.level
  const energy: AppState['energy'] = level === 'low' || level === 'good' || level === 'top'
    ? { level, label: raw.energy!.label, pct: raw.energy!.pct }
    : null

  return {
    version: 8,
    updatedAt: raw.updatedAt ?? 0,
    energy,
    tasks,
    events,
    calOverrides: { ...(raw.calOverrides ?? {}) },
    lastCalendarSync: raw.lastCalendarSync ?? null,
  }
}
