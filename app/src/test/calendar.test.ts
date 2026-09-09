import { describe, it, expect } from 'vitest'
import { coversDay, eventsOnDay, layoutDay, nextFreeSlot, spansInWindow, timedRange } from '../lib/calendar'
import type { EventItem } from '../lib/model'
import { timeToMin, minToTime, weekStartKey, addDaysKey } from '../lib/time'

const ev = (p: Partial<EventItem> & { text: string }): EventItem => ({
  id: p.text, date: '2026-09-10', allDay: false, color: 'accent', source: 'manual', ...p,
})

describe('time', () => {
  it('wandelt HH:MM und Minuten in beide Richtungen', () => {
    expect(timeToMin('09:30')).toBe(570)
    expect(timeToMin('9:05')).toBe(545)
    expect(timeToMin('24:00')).toBeNull()
    expect(timeToMin('abc')).toBeNull()
    expect(minToTime(570)).toBe('09:30')
    expect(minToTime(0)).toBe('00:00')
  })
  it('kennt Montag als Wochenstart', () => {
    expect(weekStartKey('2026-09-10')).toBe('2026-09-07')
    expect(weekStartKey('2026-09-07')).toBe('2026-09-07')
    expect(addDaysKey('2026-09-30', 1)).toBe('2026-10-01')
  })
})

describe('Mehrtages-Termine', () => {
  const trip = ev({ text: 'Reise', date: '2026-09-09', endDate: '2026-09-12', allDay: true })
  it('deckt jeden Tag im Bereich ab', () => {
    expect(coversDay(trip, '2026-09-08')).toBe(false)
    expect(coversDay(trip, '2026-09-09')).toBe(true)
    expect(coversDay(trip, '2026-09-12')).toBe(true)
    expect(coversDay(trip, '2026-09-13')).toBe(false)
  })
  it('sortiert ganztägig vor zeitlich, dann nach Uhrzeit', () => {
    const list = [ev({ text: 'B', time: '14:00' }), trip, ev({ text: 'A', time: '09:00' })]
    expect(eventsOnDay(list, '2026-09-10').map((e) => e.text)).toEqual(['Reise', 'A', 'B'])
  })
  it('liefert Balken im Wochenfenster mit abgeschnittenen Rändern', () => {
    const spans = spansInWindow([trip], '2026-09-07', 7)
    expect(spans).toHaveLength(1)
    expect(spans[0]).toMatchObject({ from: 2, to: 5, startsHere: true, endsHere: true })
    const cut = spansInWindow([trip], '2026-09-11', 7)
    expect(cut[0]).toMatchObject({ from: 0, to: 1, startsHere: false, endsHere: true })
    expect(spansInWindow([trip], '2026-09-14', 7)).toHaveLength(0)
  })
})

describe('Tages-Layout', () => {
  it('nutzt Standarddauer ohne Ende', () => {
    expect(timedRange(ev({ text: 'x', time: '10:00' }))).toEqual({ start: 600, end: 660 })
    expect(timedRange(ev({ text: 'x', time: '10:00', end: '09:00' }))).toEqual({ start: 600, end: 660 })
    expect(timedRange(ev({ text: 'x', allDay: true }))).toBeNull()
  })
  it('legt überlappende Termine in Spalten, getrennte Cluster bleiben einspaltig', () => {
    const placed = layoutDay([
      ev({ text: 'A', time: '09:00', end: '10:00' }),
      ev({ text: 'B', time: '09:30', end: '11:00' }),
      ev({ text: 'C', time: '10:00', end: '10:30' }),
      ev({ text: 'D', time: '13:00', end: '14:00' }),
    ])
    const by = Object.fromEntries(placed.map((p) => [p.ev.text, p]))
    expect(by.A).toMatchObject({ col: 0, cols: 2 })
    expect(by.B).toMatchObject({ col: 1, cols: 2 })
    expect(by.C).toMatchObject({ col: 0, cols: 2 })
    expect(by.D).toMatchObject({ col: 0, cols: 1 })
  })
  it('findet die nächste freie Lücke', () => {
    const list = [ev({ text: 'A', time: '09:00', end: '10:00' })]
    expect(nextFreeSlot(list, 8 * 60 + 7)).toBe(8 * 60 + 15)
    expect(nextFreeSlot(list, 9 * 60 + 20)).toBe(10 * 60)
  })
})
