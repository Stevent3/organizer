import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store/useStore'
import { EMPTY_STATE } from '../lib/model'

beforeEach(() => {
  localStorage.clear()
  useStore.getState().replaceState({ ...EMPTY_STATE, tasks: { today: [], shopping: [], work: [], health: [] } })
})

describe('Store', () => {
  it('legt Termine an, ändert und löscht sie und zählt updatedAt hoch', () => {
    const s = useStore.getState()
    const ev = s.addEvent({ date: '2026-09-10', allDay: false, time: '10:00', text: 'Test', color: 'accent', source: 'manual' })
    const t1 = useStore.getState().updatedAt
    expect(t1).toBeGreaterThan(0)
    useStore.getState().updateEvent(ev.id, { time: '11:00' })
    expect(useStore.getState().events[0].time).toBe('11:00')
    expect(useStore.getState().updatedAt).toBeGreaterThan(t1)
    useStore.getState().deleteEvent(ev.id)
    expect(useStore.getState().events).toHaveLength(0)
    expect(useStore.getState().calOverrides).toEqual({})
  })

  it('schreibt Änderungen an Apple-Terminen als vollständige Overrides', () => {
    const s = useStore.getState()
    const ev = s.addEvent({ date: '2026-09-10', allDay: false, time: '09:00', text: 'Meeting', color: 'teal', source: 'calendar', key: '09:00|meeting' })
    useStore.getState().updateEvent(ev.id, { time: '09:30', text: 'Meeting neu', sub: 'Raum 2' })
    expect(useStore.getState().calOverrides['09:00|meeting']).toEqual({ time: '09:30', text: 'Meeting neu', sub: 'Raum 2' })
    useStore.getState().deleteEvent(ev.id)
    expect(useStore.getState().calOverrides['09:00|meeting']).toMatchObject({ deleted: true, time: '09:30' })
  })

  it('persistiert unter organizer_v8 und lässt organizer_v3 in Ruhe', () => {
    localStorage.setItem('organizer_v3', '{"version":3}')
    useStore.getState().addTask('today', 'Milch')
    expect(localStorage.getItem('organizer_v8')).toContain('Milch')
    expect(localStorage.getItem('organizer_v3')).toBe('{"version":3}')
  })
})
