import { describe, it, expect, beforeEach } from 'vitest'
import { buildContext, executeTool } from '../lib/ai'
import { EMPTY_STATE } from '../lib/model'
import { todayKey, addDaysKey } from '../lib/time'
import { useStore } from '../store/useStore'

beforeEach(() => {
  localStorage.clear()
  useStore.getState().replaceState({ ...EMPTY_STATE, tasks: { today: [], shopping: [], work: [], health: [] }, shopHistory: {}, extra: {} })
})

describe('KI-Tools', () => {
  it('legt Aufgaben, Einkäufe und Termine mit Datum an', () => {
    expect(executeTool('add_task', { text: 'Thesis Kapitel 3', list: 'work' })).toContain('Arbeit')
    expect(useStore.getState().tasks.work[0].text).toBe('Thesis Kapitel 3')
    expect(executeTool('add_shopping_item', { items: ['milch', 'Brot'] })).toContain('milch, Brot')
    expect(useStore.getState().tasks.shopping.map((t) => t.text)).toEqual(['Milch', 'Brot'])
    expect(executeTool('add_shopping_item', { items: ['Milch'] })).toContain('schon')
    const tomorrow = addDaysKey(todayKey(), 1)
    expect(executeTool('add_calendar_event', { title: 'Zahnarzt', date: tomorrow, time: '9:30', end: '10:00', location: 'Praxis' })).toContain(tomorrow)
    const ev = useStore.getState().events[0]
    expect(ev).toMatchObject({ text: 'Zahnarzt', date: tomorrow, time: '09:30', end: '10:00', sub: 'Praxis', allDay: false })
    expect(executeTool('add_calendar_event', { title: 'Urlaub', date: '2026-10-01', end_date: '2026-10-05' })).toContain('ganztägig')
    expect(useStore.getState().events[1]).toMatchObject({ allDay: true, endDate: '2026-10-05' })
  })

  it('hakt Aufgaben ab, löscht Termine und setzt Energie', () => {
    executeTool('add_task', { text: 'Wäsche waschen' })
    expect(executeTool('complete_task', { text: 'wäsche' })).toContain('abgehakt')
    expect(useStore.getState().tasks.today[0].done).toBe(true)
    expect(executeTool('complete_task', { text: 'gibts nicht' })).toContain('Keine')
    executeTool('add_calendar_event', { title: 'Kino', time: '20:00' })
    expect(executeTool('delete_calendar_event', { title: 'kino' })).toContain('gelöscht')
    expect(useStore.getState().events).toHaveLength(0)
    expect(executeTool('set_energy', { level: 'top' })).toContain('Top')
    expect(useStore.getState().energy?.level).toBe('top')
    expect(executeTool('unknown', {})).toContain('Unbekannt')
  })

  it('baut den Kontext mit Datum, Terminen und Listen', () => {
    executeTool('add_task', { text: 'Offen' })
    executeTool('add_calendar_event', { title: 'Meeting', time: '10:00', end: '11:00', location: 'Zoom' })
    const ctx = buildContext(useStore.getState().snapshot())
    expect(ctx).toContain('heutiges Datum ISO ' + todayKey())
    expect(ctx).toContain('10:00–11:00 Meeting (Zoom)')
    expect(ctx).toContain('Offene Aufgaben heute: Offen')
    expect(ctx).toContain('Energie: nicht gesetzt')
  })
})
