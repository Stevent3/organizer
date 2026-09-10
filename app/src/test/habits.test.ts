import { describe, it, expect, beforeEach } from 'vitest'
import { addHabit, habitsSummary, isDue, lastDays, readHabits, removeHabit, streak, toggleHabit } from '../lib/habits'
import { EMPTY_STATE, SOMEDAY, isActive, isSnoozed } from '../lib/model'
import { useStore } from '../store/useStore'

beforeEach(() => {
  localStorage.clear()
  useStore.getState().replaceState({ ...EMPTY_STATE, tasks: { today: [], shopping: [], work: [], health: [] }, shopHistory: {}, extra: {} })
})

describe('Gewohnheiten', () => {
  it('legt an, prüft Fälligkeit nach Wochentag, hakt ab und löscht', () => {
    let l = addHabit([], ' Wasser ', '💧', [], 1)
    l = addHabit(l, 'Sport', '🏃', [1, 3, 5], 2) // Mo Mi Fr
    l = addHabit(l, '  ', '❌')
    expect(l.map((h) => h.name)).toEqual(['Wasser', 'Sport'])
    expect(isDue(l[0], '2026-09-10')).toBe(true) // Do
    expect(isDue(l[1], '2026-09-10')).toBe(false) // Do
    expect(isDue(l[1], '2026-09-11')).toBe(true) // Fr
    l = toggleHabit(l, l[0].id, '2026-09-10')
    expect(l[0].log['2026-09-10']).toBe(true)
    l = toggleHabit(l, l[0].id, '2026-09-10')
    expect(l[0].log['2026-09-10']).toBeUndefined()
    expect(removeHabit(l, l[1].id)).toHaveLength(1)
  })

  it('zählt Serien: heute offen bricht nicht, nicht fällige Tage werden übersprungen', () => {
    let h = addHabit([], 'Sport', '🏃', [1, 3, 5])[0] // Mo Mi Fr
    for (const d of ['2026-09-02', '2026-09-04', '2026-09-07', '2026-09-09']) h = toggleHabit([h], h.id, d)[0] // Mi Fr Mo Mi
    expect(streak(h, '2026-09-10')).toBe(4) // Do: heute nicht fällig, Serie läuft
    expect(streak(h, '2026-09-11')).toBe(4) // Fr: heute noch offen, bricht nicht
    h = toggleHabit([h], h.id, '2026-09-11')[0]
    expect(streak(h, '2026-09-11')).toBe(5)
    expect(streak(h, '2026-09-14')).toBe(5) // Mo offen: gestern (So) nicht fällig, Fr erledigt
    expect(streak(h, '2026-09-15')).toBe(0) // Di: Mo wurde verpasst
    const daily = toggleHabit(addHabit([], 'Lesen'), 'x', '2026-09-10')
    expect(streak(daily[0], '2026-09-10')).toBe(0)
    expect(lastDays(h, 3, '2026-09-11').map((d) => [d.due, d.done])).toEqual([[true, true], [false, false], [true, true]])
  })

  it('liest robust aus extra und fasst für die KI zusammen', () => {
    expect(readHabits({ habits: 'nein' })).toEqual([])
    expect(readHabits({ habits: [{ id: 'a', name: 'X' }, { name: 'ohne id' }, null] })).toEqual([{ id: 'a', name: 'X', emoji: '✅', days: [], log: {}, createdAt: 0 }])
    let l = addHabit([], 'Wasser', '💧')
    l = addHabit(l, 'Sport', '🏃', [6]) // Sa
    for (const d of ['2026-09-08', '2026-09-09', '2026-09-10']) l = toggleHabit(l, l[0].id, d)
    expect(habitsSummary(l, '2026-09-10')).toBe('Wasser ✓ (Serie 3)')
    expect(habitsSummary([], '2026-09-10')).toBe('keine')
  })
})

describe('Zurückstellen (Snooze)', () => {
  it('blendet zurückgestellte To-dos bis zum Datum aus, Irgendwann dauerhaft', () => {
    const st = useStore.getState()
    const t = st.addTask('today', 'Steuer')
    st.snoozeTask('today', t.id, '2026-09-12')
    let task = useStore.getState().tasks.today[0]
    expect(isActive(task, '2026-09-11')).toBe(false)
    expect(isSnoozed(task, '2026-09-11')).toBe(true)
    expect(isActive(task, '2026-09-12')).toBe(true)
    useStore.getState().snoozeTask('today', t.id, SOMEDAY)
    task = useStore.getState().tasks.today[0]
    expect(isActive(task, '2030-01-01')).toBe(false)
    useStore.getState().snoozeTask('today', t.id, undefined)
    task = useStore.getState().tasks.today[0]
    expect(task.until).toBeUndefined()
    expect(isActive(task, '2026-09-11')).toBe(true)
    useStore.getState().toggleTask('today', t.id)
    expect(isSnoozed(useStore.getState().tasks.today[0], '2026-09-11')).toBe(false)
  })
})
