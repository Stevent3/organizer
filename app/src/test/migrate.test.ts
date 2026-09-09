import { describe, it, expect } from 'vitest'
import { migrateV3 } from '../lib/migrate'

describe('Migration v7 zu v8', () => {
  it('gibt bei leerem Input einen leeren State', () => {
    const s = migrateV3(null)
    expect(s.version).toBe(8)
    expect(s.events).toEqual([])
    expect(s.tasks.today).toEqual([])
  })

  it('datiert Termine ohne Datum auf den Zieltag und behält Apple-Overrides', () => {
    const s = migrateV3(
      {
        updatedAt: 123,
        energy: { level: 'good', label: 'Gut', pct: 66 },
        tasks: { today: [{ id: 't1', text: 'Test', done: false }] },
        schedule: [{ id: 'm1', time: '14:00', end: '15:00', text: 'Zahnarzt', color: 'ev-blue' }],
        calendarEvents: [{ id: 'c1', origTime: '09:00', time: '09:30', text: 'Meeting', sub: 'Zoom', travel: 20 }],
        calOverrides: { '09:00|meeting': { time: '09:30' } },
      },
      '2026-09-10',
    )
    expect(s.updatedAt).toBe(123)
    expect(s.energy?.level).toBe('good')
    expect(s.tasks.today).toHaveLength(1)
    expect(s.events).toHaveLength(2)
    expect(s.events[0]).toMatchObject({ id: 'm1', date: '2026-09-10', time: '14:00', end: '15:00', allDay: false, color: 'accent', source: 'manual' })
    expect(s.events[1]).toMatchObject({ id: 'c1', date: '2026-09-10', time: '09:30', source: 'calendar', key: '09:00|meeting', travel: 20, color: 'teal' })
    expect(s.calOverrides['09:00|meeting']).toEqual({ time: '09:30' })
  })

  it('macht Einträge ohne gültige Uhrzeit ganztägig (Shortcut liefert manchmal Müll)', () => {
    const s = migrateV3({ calendarEvents: [{ time: 'Abges', text: 'Teams-Besprechung' }] }, '2026-09-10')
    expect(s.events[0]).toMatchObject({ allDay: true, time: undefined })
  })
})
