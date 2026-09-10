import { uid } from './model'
import { addDaysKey, todayKey } from './time'

/**
 * Gewohnheiten (Routinen mit Serie), Vorbild: Structured/Streaks. Liegen in state.extra.habits
 * (synchronisiert). log: Tag → erledigt. days: Wochentage (0 = So … 6 = Sa), leer = täglich.
 */
export type Habit = { id: string; name: string; emoji: string; days: number[]; log: Record<string, true>; createdAt: number }

export const HABIT_PRESETS: { name: string; emoji: string }[] = [
  { name: 'Wasser trinken', emoji: '💧' },
  { name: 'Bewegung', emoji: '🏃' },
  { name: 'Lesen', emoji: '📚' },
  { name: 'Thesis-Block', emoji: '🎓' },
  { name: 'Meditation', emoji: '🧘' },
  { name: 'Früh ins Bett', emoji: '🌙' },
  { name: 'Aufräumen', emoji: '🧹' },
  { name: 'Vitamine', emoji: '💊' },
]

export function readHabits(extra: Record<string, unknown>): Habit[] {
  const h = extra.habits
  if (!Array.isArray(h)) return []
  return (h as Partial<Habit>[])
    .filter((x) => x && typeof x.name === 'string' && typeof x.id === 'string')
    .map((x) => ({ id: x.id!, name: x.name!, emoji: x.emoji || '✅', days: Array.isArray(x.days) ? x.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [], log: x.log && typeof x.log === 'object' ? x.log : {}, createdAt: x.createdAt ?? 0 }))
}

export function addHabit(list: Habit[], name: string, emoji = '✅', days: number[] = [], now = Date.now()): Habit[] {
  const n = name.trim()
  if (!n) return list
  return [...list, { id: uid('h'), name: n, emoji, days, log: {}, createdAt: now }]
}

export function removeHabit(list: Habit[], id: string): Habit[] {
  return list.filter((h) => h.id !== id)
}

/** Gilt die Gewohnheit an diesem Tag? */
export function isDue(h: Habit, day = todayKey()): boolean {
  if (!h.days.length) return true
  return h.days.includes(new Date(day + 'T12:00:00').getDay())
}

export function isDone(h: Habit, day = todayKey()): boolean {
  return !!h.log[day]
}

export function toggleHabit(list: Habit[], id: string, day = todayKey()): Habit[] {
  return list.map((h) => {
    if (h.id !== id) return h
    const log = { ...h.log }
    if (log[day]) delete log[day]
    else log[day] = true
    return { ...h, log }
  })
}

/**
 * Serie: zusammenhängende erledigte fällige Tage bis heute. Ein heute noch offener Tag bricht die
 * Serie nicht (man hat ja noch Zeit), nicht fällige Tage werden übersprungen.
 */
export function streak(h: Habit, day = todayKey()): number {
  let n = 0
  let d = day
  if (!isDone(h, d)) d = addDaysKey(d, -1)
  for (let i = 0; i < 400; i++) {
    if (isDue(h, d)) {
      if (!isDone(h, d)) break
      n++
    }
    d = addDaysKey(d, -1)
  }
  return n
}

/** Erledigt in den letzten `n` Tagen (für die kleine Wochenansicht), neueste zuletzt */
export function lastDays(h: Habit, n = 7, day = todayKey()): { day: string; due: boolean; done: boolean }[] {
  const out: { day: string; due: boolean; done: boolean }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = addDaysKey(day, -i)
    out.push({ day: d, due: isDue(h, d), done: isDone(h, d) })
  }
  return out
}

/** Kurzfassung für den KI-Kontext */
export function habitsSummary(list: Habit[], day = todayKey()): string {
  const due = list.filter((h) => isDue(h, day))
  if (!due.length) return 'keine'
  return due.map((h) => h.name + (isDone(h, day) ? ' ✓' : ' offen') + (streak(h, day) > 1 ? ' (Serie ' + streak(h, day) + ')' : '')).join(', ')
}
