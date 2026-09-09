import { addDays, format, parseISO, startOfWeek } from 'date-fns'

/** 'HH:MM' zu Minuten seit Mitternacht (ungültig: null) */
export function timeToMin(t: string | undefined | null): number | null {
  if (!t) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim())
  if (!m) return null
  const h = Number(m[1]), mm = Number(m[2])
  if (h > 23 || mm > 59) return null
  return h * 60 + mm
}

export function minToTime(min: number): string {
  const m = ((min % 1440) + 1440) % 1440
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')
}

/** Date zu 'YYYY-MM-DD' in lokaler Zeit */
export function toDateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function fromDateKey(key: string): Date {
  return parseISO(key)
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function addDaysKey(key: string, n: number): string {
  return toDateKey(addDays(fromDateKey(key), n))
}

/** Montag der Woche, in der der Tag liegt */
export function weekStartKey(key: string): string {
  return toDateKey(startOfWeek(fromDateKey(key), { weekStartsOn: 1 }))
}

export function roundToStep(min: number, step = 15): number {
  return Math.round(min / step) * step
}
