import { describe, it, expect } from 'vitest'
import { applyCalendar, buildCalendarEvents, calKey, extractExtra, keyTime, mergeRemoteState, toWireState } from '../lib/sync'
import { EMPTY_STATE, type AppState, type EventItem } from '../lib/model'

const DAY = '2026-09-10'
const base = (p: Partial<AppState> = {}): AppState => ({ ...EMPTY_STATE, tasks: { today: [], shopping: [], work: [], health: [] }, shopHistory: {}, extra: {}, ...p })
const ev = (p: Partial<EventItem> & { text: string }): EventItem => ({ id: p.text, date: DAY, allDay: false, color: 'accent', source: 'manual', ...p })

describe('Kalender aus dem Worker', () => {
  it('dedupliziert, wendet Overrides an und lässt gelöschte weg', () => {
    const raw = [
      { time: '09:00', end: '10:00', text: 'Meeting', sub: 'Zoom' },
      { time: '09:00', end: '10:00', text: 'Meeting', sub: 'Zoom' },
      { time: '12:00', text: 'Mittag' },
      { time: 'Abges', text: 'Ganztags-Ding' },
    ]
    const list = buildCalendarEvents(raw, { '09:00|meeting': { time: '09:30', text: 'Meeting neu' }, '12:00|mittag': { deleted: true } }, DAY)
    expect(list).toHaveLength(2)
    expect(list[0]).toMatchObject({ time: '09:30', end: '10:00', text: 'Meeting neu', sub: 'Zoom', key: '09:00|meeting', source: 'calendar', date: DAY })
    expect(list[1]).toMatchObject({ allDay: true, text: 'Ganztags-Ding' })
  })

  it('ersetzt nur die Kalender-Termine des Tages', () => {
    const s = base({ events: [ev({ text: 'alt', source: 'calendar', date: DAY }), ev({ text: 'gestern', source: 'calendar', date: '2026-09-09' }), ev({ text: 'manuell' })], updatedAt: 5 })
    const n = applyCalendar(s, [{ time: '08:00', text: 'neu' }], DAY)
    expect(n.events.map((e) => e.text).sort()).toEqual(['gestern', 'manuell', 'neu'])
    expect(n.updatedAt).toBe(5)
    expect(n.lastCalendarSync).toBeGreaterThan(0)
  })

  it('legt Zeilen mit Datum auf ihren Tag, Key und ID tragen das Datum', () => {
    const raw = [
      { date: '2026-09-12', time: '08:00', end: '09:30', text: 'Uni', sub: 'Leuphana' },
      { date: '2026-09-12', time: '08:00', end: '09:30', text: 'Uni', sub: 'Leuphana' },
      { date: '2026-09-13', time: '08:00', text: 'Uni' },
      { time: '12:00', text: 'Mittag' },
    ]
    const list = buildCalendarEvents(raw, { '2026-09-13|08:00|uni': { date: '2026-09-14', time: '10:00' } }, DAY)
    expect(list).toHaveLength(3)
    expect(list[0]).toMatchObject({ id: 'cal|2026-09-12|2026-09-12|08:00|uni', key: '2026-09-12|08:00|uni', date: '2026-09-12', time: '08:00', end: '09:30' })
    expect(list[1]).toMatchObject({ key: '2026-09-13|08:00|uni', date: '2026-09-14', time: '10:00' })
    expect(list[2]).toMatchObject({ id: 'cal|' + DAY + '|12:00|mittag', key: '12:00|mittag', date: DAY })
    expect(calKey('08:00', 'Uni', '2026-09-12')).toBe('2026-09-12|08:00|uni')
    expect(keyTime('2026-09-12|08:00|uni')).toBe('08:00')
    expect(keyTime('08:00|uni')).toBe('08:00')
  })

  it('Snapshot mit mehreren Tagen ersetzt ab heute, Vergangenheit bleibt als Verlauf', () => {
    const s = base({
      events: [
        ev({ text: 'gestern', source: 'calendar', date: '2026-09-09' }),
        ev({ text: 'heute-alt', source: 'calendar', date: DAY }),
        ev({ text: 'übermorgen-alt', source: 'calendar', date: '2026-09-12' }),
        ev({ text: 'nächste-woche-alt', source: 'calendar', date: '2026-09-20' }),
        ev({ text: 'manuell-morgen', date: '2026-09-11' }),
      ],
    })
    const n = applyCalendar(s, [{ date: DAY, time: '08:00', text: 'heute-neu' }, { date: '2026-09-11', time: '09:00', text: 'morgen-neu' }], DAY)
    expect(n.events.map((e) => e.text).sort()).toEqual(['gestern', 'heute-neu', 'manuell-morgen', 'morgen-neu'])
  })

  it('Snapshot ohne Datum (altes Format) ersetzt heute und alles Spätere aus dem Kalender', () => {
    const s = base({ events: [ev({ text: 'gestern', source: 'calendar', date: '2026-09-09' }), ev({ text: 'später', source: 'calendar', date: '2026-09-15' })] })
    const n = applyCalendar(s, [{ time: '08:00', text: 'neu' }], DAY)
    expect(n.events.map((e) => e.text).sort()).toEqual(['gestern', 'neu'])
  })
})

describe('State-Merge mit dem Worker', () => {
  it('ignoriert älteren oder gleich alten Remote-Stand', () => {
    const local = base({ updatedAt: 100 })
    expect(mergeRemoteState(local, { updatedAt: 100 }, DAY)).toBeNull()
    expect(mergeRemoteState(local, { updatedAt: 50 }, DAY)).toBeNull()
    expect(mergeRemoteState(local, null, DAY)).toBeNull()
  })

  it('übernimmt v8-Stände komplett und reicht Extras durch', () => {
    const local = base({ updatedAt: 1, events: [ev({ text: 'lokal' })] })
    const remote = { version: 8, updatedAt: 2, events: [ev({ text: 'remote', date: '2026-10-01' })], tasks: { today: [{ id: 't', text: 'x', done: false }] }, calOverrides: {}, energy: null, dayPlan: { a: 1 } }
    const m = mergeRemoteState(local, remote, DAY)!
    expect(m.events.map((e) => e.text)).toEqual(['remote'])
    expect(m.tasks.today).toHaveLength(1)
    expect(m.tasks.shopping).toEqual([])
    expect(m.extra).toEqual({ dayPlan: { a: 1 } })
    expect(m.updatedAt).toBe(2)
  })

  it('baut bei v7-Ständen nur den heutigen Tag neu, andere Tage bleiben', () => {
    const local = base({ updatedAt: 1, events: [ev({ text: 'heute-alt' }), ev({ text: 'morgen', date: '2026-09-11' })] })
    const remote = { version: 3, updatedAt: 2, schedule: [{ id: 'm1', time: '14:00', text: 'Zahnarzt' }], tasks: { today: [] }, mealPlan: { days: [] } }
    const m = mergeRemoteState(local, remote, DAY)!
    expect(m.events.map((e) => e.text).sort()).toEqual(['Zahnarzt', 'morgen'])
    expect(m.events.find((e) => e.text === 'Zahnarzt')).toMatchObject({ date: DAY, time: '14:00' })
    expect(m.extra).toEqual({ mealPlan: { days: [] } })
  })

  it('trennt Extras von bekannten Feldern', () => {
    expect(extractExtra({ version: 3, schedule: [], dayPlan: 1, foodProfile: 2 })).toEqual({ dayPlan: 1, foodProfile: 2 })
  })
})

describe('Wire-Format für den Worker', () => {
  it('enthält v8-Felder plus v7-kompatible schedule/calendarEvents für heute', () => {
    const s = base({
      updatedAt: 9,
      extra: { dayPlan: { blocks: [] } },
      events: [
        ev({ text: 'Manuell', time: '10:00', end: '11:00', sub: 'Büro' }),
        ev({ text: 'Ganztag', allDay: true }),
        ev({ text: 'Morgen', date: '2026-09-11', time: '09:00' }),
        ev({ text: 'Apple', time: '15:00', source: 'calendar', key: '14:30|apple', travel: 12 }),
        ev({ text: 'Datiert', time: '16:00', source: 'calendar', key: DAY + '|16:00|datiert' }),
      ],
    })
    const w = toWireState(s, DAY)
    expect(w.version).toBe(8)
    expect(w.updatedAt).toBe(9)
    expect(w.dayPlan).toEqual({ blocks: [] })
    expect(w.schedule).toEqual([{ id: 'Manuell', time: '10:00', end: '11:00', text: 'Manuell', sub: 'Büro', color: 'ev-blue', source: 'manual' }])
    expect(w.calendarEvents).toEqual([
      { id: 'cal0', key: '14:30|apple', origTime: '14:30', time: '15:00', end: '', text: 'Apple', sub: '', travel: 12, color: 'ev-cal', source: 'calendar' },
      { id: 'cal1', key: DAY + '|16:00|datiert', origTime: '16:00', time: '16:00', end: '', text: 'Datiert', sub: '', travel: 0, color: 'ev-cal', source: 'calendar' },
    ])
    expect((w.events as EventItem[]).length).toBe(5)
  })
})
