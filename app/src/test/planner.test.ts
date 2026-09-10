import { describe, it, expect, beforeEach } from 'vitest'
import { dayPlanPrompt, foodProfileText, recipeUserPrompt, newIngredients, normalizeDayPlan, normalizeMealPlan, parseJsonObject, planToEvents, readDayPlan, readMealPlan, rerollUserPrompt, todayMealIndex, type DayPlan } from '../lib/planner'
import { EMPTY_STATE, type EventItem } from '../lib/model'
import { toWireState, mergeRemoteState } from '../lib/sync'
import { todayKey } from '../lib/time'
import { useStore } from '../store/useStore'

beforeEach(() => {
  localStorage.clear()
  useStore.getState().replaceState({ ...EMPTY_STATE, tasks: { today: [], shopping: [], work: [], health: [] }, shopHistory: {}, extra: {} })
})

describe('JSON-Parser', () => {
  it('liest reines JSON, JSON in Zäunen und Text drumherum', () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 })
    expect(parseJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(parseJsonObject('Hier dein Plan: {"a":{"b":2}} – viel Spaß')).toEqual({ a: { b: 2 } })
    expect(() => parseJsonObject('[1,2]')).toThrow()
    expect(() => parseJsonObject('kein json')).toThrow()
  })
})

describe('Tagesplan', () => {
  it('normalisiert Blöcke: nur mit Uhrzeit, sortiert, Typ abgesichert, Zeiten gepolstert', () => {
    const p = normalizeDayPlan({
      summary: ' Los geht’s ',
      blocks: [
        { time: '14:00', title: 'Thesis', type: 'focus', note: 'Kapitel 3' },
        { time: '9:30', end: '9:45', title: 'Kaffee', type: 'break' },
        { title: 'ohne Zeit', type: 'task' },
        { time: '12:00', title: 'Essen', type: 'unbekannt' },
      ],
    }, '2026-09-10', 123)
    expect(p).toMatchObject({ date: '2026-09-10', generatedAt: 123, summary: 'Los geht’s' })
    expect(p.blocks.map((b) => b.time)).toEqual(['09:30', '12:00', '14:00'])
    expect(p.blocks[0]).toEqual({ time: '09:30', end: '09:45', title: 'Kaffee', type: 'break' })
    expect(p.blocks[1].type).toBe('task')
    expect(p.blocks[2].note).toBe('Kapitel 3')
    expect(() => normalizeDayPlan({ blocks: [] })).toThrow()
  })

  it('macht aus dem Plan Termine – ohne Fixtermine/freie Zeit und ohne Duplikate', () => {
    const plan: DayPlan = {
      generatedAt: 1, date: '2026-09-10', summary: '',
      blocks: [
        { time: '09:00', end: '10:00', title: 'Meeting', type: 'event' },
        { time: '10:00', end: '11:30', title: 'Thesis schreiben', type: 'focus', note: 'Kapitel 3' },
        { time: '12:00', title: 'Mittag', type: 'meal' },
        { time: '13:00', title: 'Frei', type: 'free' },
        { time: '15:00', end: '15:20', title: 'Losgehen', type: 'travel' },
      ],
    }
    const existing: EventItem[] = [
      { id: '1', date: '2026-09-10', allDay: false, time: '09:00', end: '10:00', text: 'Meeting', color: 'teal', source: 'calendar' },
      { id: '2', date: '2026-09-10', allDay: false, time: '12:00', text: 'mittag', color: 'green', source: 'manual' },
      { id: '3', date: '2026-09-11', allDay: false, time: '10:00', text: 'Thesis schreiben', color: 'pink', source: 'manual' },
    ]
    const evs = planToEvents(plan, existing)
    expect(evs.map((e) => e.text)).toEqual(['Thesis schreiben', 'Losgehen'])
    expect(evs[0]).toMatchObject({ date: '2026-09-10', time: '10:00', end: '11:30', sub: 'Kapitel 3', color: 'pink', source: 'manual', allDay: false })
    expect(evs[1].color).toBe('orange')
    // zweites Übernehmen: alles schon da
    const after = [...existing, ...evs.map((e, i) => ({ ...e, id: 'n' + i }))]
    expect(planToEvents(plan, after)).toEqual([])
  })

  it('baut den Prompt aus Terminen, Aufgaben aller Listen und Energie', () => {
    const st = useStore.getState()
    st.addEvent({ date: todayKey(), allDay: false, time: '10:00', end: '11:00', text: 'Zahnarzt', sub: 'Praxis', color: 'teal', source: 'calendar', travel: 20 })
    st.addEvent({ date: todayKey(), allDay: true, text: 'Ganztags', color: 'accent', source: 'manual' })
    st.addTask('work', 'Thesis')
    st.addTask('shopping', 'Milch')
    st.setEnergy({ level: 'top', label: 'Top', pct: 100 })
    const { system, user } = dayPlanPrompt(useStore.getState().snapshot(), new Date(2026, 8, 10, 8, 5))
    expect(system).toContain('Antworte NUR mit JSON')
    expect(user).toBe('Jetzt ist 08:05. Energie: Top. Fixtermine heute: 10:00–11:00 Zahnarzt (Praxis), Fahrt 20 Min. Offene Aufgaben: Thesis [Arbeit]; Milch [Einkauf].')
    expect(dayPlanPrompt({ ...EMPTY_STATE, energy: null }).user).toContain('Energie: nicht gesetzt. Fixtermine heute: keine. Offene Aufgaben: keine.')
  })
})

describe('Essensplan', () => {
  it('normalisiert den Wochenplan: max 7 Tage, Tag-Fallback, Zutaten max 10', () => {
    const days = Array.from({ length: 9 }, (_, i) => ({ tag: i === 1 ? '' : 'T' + i, fruehstueck: { name: 'Müsli', zutaten: ['Haferflocken', 'Milch'] }, mittag: null, abend: { zutaten: Array.from({ length: 12 }, (_, j) => 'Z' + j) } }))
    const p = normalizeMealPlan({ days }, 5)
    expect(p.createdAt).toBe(5)
    expect(p.days).toHaveLength(7)
    expect(p.days[1].tag).toBe('Di')
    expect(p.days[0].mittag).toBeNull()
    expect(p.days[0].abend).toEqual({ name: 'Gericht', zutaten: Array.from({ length: 10 }, (_, j) => 'Z' + j) })
    expect(() => normalizeMealPlan({})).toThrow()
  })

  it('formuliert Profil und Würfel-Prompt wie v7', () => {
    expect(foodProfileText(null)).toBe('Ernährung: alles. Allergien/Unverträglichkeiten: keine. No-Gos: keine. Lieblingsküche: gemischt. Personen: 1. Kochzeit werktags: ~30 Min. Frühstück: einfach. Meal-Prep: nein. Sonstiges: -')
    const plan = normalizeMealPlan({ days: [{ tag: 'Mo', fruehstueck: { name: 'Müsli' }, mittag: { name: 'Pasta' } }] })
    const u = rerollUserPrompt({ diet: 'Vegan', updatedAt: 1 }, plan, 'abend', 'Mo')
    expect(u).toContain('Ernährung: Vegan.')
    expect(u).toContain('Slot: abend am Mo. NICHT diese Gerichte: Müsli, Pasta')
  })

  it('baut den Rezept-Prompt aus Profil und Gericht', () => {
    expect(recipeUserPrompt({ people: '2', updatedAt: 1 }, { name: 'Shakshuka', zutaten: ['Eier', 'Tomaten'] })).toBe(foodProfileText({ people: '2', updatedAt: 1 }) + ' Gericht: Shakshuka. Geplante Zutaten: Eier, Tomaten.')
    expect(recipeUserPrompt(null, { name: 'Brot', zutaten: [] })).toMatch(/Gericht: Brot\.$/)
  })

  it('dedupliziert Zutaten gegen Liste inkl. Korb und in sich', () => {
    const shopping = [{ id: '1', text: 'Milch', done: false }, { id: '2', text: 'Paprika (2 Stk)', done: true }]
    expect(newIngredients(['Haferflocken', 'milch', 'Paprika', 'Haferflocken (500 g)', '', 'Reis '], shopping)).toEqual(['Haferflocken', 'Reis'])
  })

  it('kennt den heutigen Wochentag (Mo = 0)', () => {
    expect(todayMealIndex(new Date(2026, 8, 7))).toBe(0) // Montag
    expect(todayMealIndex(new Date(2026, 8, 13))).toBe(6) // Sonntag
  })
})

describe('Ablage in extra + Sync', () => {
  it('setExtra schreibt und löscht Schlüssel und zählt updatedAt hoch', () => {
    const t0 = useStore.getState().updatedAt
    useStore.getState().setExtra({ dayPlan: { generatedAt: 1, date: '2026-09-10', summary: 's', blocks: [{ time: '09:00', title: 'A', type: 'task' }] }, foodProfile: { diet: 'Alles', updatedAt: 1 } })
    const s = useStore.getState()
    expect(s.updatedAt).toBeGreaterThan(t0)
    expect(readDayPlan(s.extra)?.blocks[0].title).toBe('A')
    expect(readMealPlan(s.extra)).toBeNull()
    useStore.getState().setExtra({ foodProfile: null })
    expect(useStore.getState().extra.foodProfile).toBeUndefined()
    expect(readDayPlan(useStore.getState().extra)).not.toBeNull()
  })

  it('reicht dayPlan/mealPlan top-level an den Worker durch und liest sie zurück (v7-kompatibel)', () => {
    useStore.getState().setExtra({ mealPlan: { createdAt: 1, days: [{ tag: 'Mo', fruehstueck: { name: 'Müsli', zutaten: ['Hafer'] }, mittag: null, abend: null }] } })
    const wire = toWireState(useStore.getState().snapshot(), todayKey())
    expect((wire.mealPlan as { createdAt: number }).createdAt).toBe(1)
    const local = { ...EMPTY_STATE, extra: {} }
    const merged = mergeRemoteState(local, { ...wire, updatedAt: local.updatedAt + 10 }, todayKey())
    expect(readMealPlan(merged!.extra)?.days[0].fruehstueck?.name).toBe('Müsli')
  })
})
