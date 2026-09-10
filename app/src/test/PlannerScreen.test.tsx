import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlannerScreen } from '../screens/PlannerScreen'
import { EMPTY_STATE } from '../lib/model'
import { readFoodProfile, FOOD_Q } from '../lib/planner'
import { useStore } from '../store/useStore'

beforeEach(() => {
  localStorage.clear()
  useStore.getState().replaceState({ ...EMPTY_STATE, tasks: { today: [], shopping: [], work: [], health: [] }, shopHistory: {}, extra: {} })
})

describe('Planer-Screen', () => {
  it('zeigt ohne Plan und ohne Key den Leerzustand und den Key-Hinweis', () => {
    render(<PlannerScreen />)
    expect(screen.getByText('Noch kein Plan für heute.')).toBeInTheDocument()
    expect(screen.getByText('Kein Groq-Key hinterlegt')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Meinen Tag planen/ })).toBeDisabled()
  })

  it('zeigt einen vorhandenen Plan und übernimmt die Blöcke als Termine', () => {
    useStore.getState().setExtra({ dayPlan: { generatedAt: 1, date: '2026-09-10', summary: 'Ruhig angehen.', blocks: [
      { time: '09:00', end: '10:00', title: 'Meeting', type: 'event' },
      { time: '10:00', end: '11:00', title: 'Thesis', type: 'focus', note: 'Kapitel 3' },
      { time: '12:30', title: 'Mittag', type: 'meal' },
    ] } })
    render(<PlannerScreen />)
    expect(screen.getByText('Ruhig angehen.')).toBeInTheDocument()
    expect(screen.getByText(/Thesis/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Plan übernehmen · 2 Termine/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }))
    const evs = useStore.getState().events
    expect(evs.map((e) => e.text)).toEqual(['Thesis', 'Mittag'])
    expect(evs[0]).toMatchObject({ date: '2026-09-10', time: '10:00', end: '11:00', sub: 'Kapitel 3', color: 'pink', source: 'manual' })
    expect(screen.getByText(/Alle Blöcke stehen im Kalender/)).toBeInTheDocument()
  })

  it('führt das Essens-Interview durch und speichert das Profil', () => {
    render(<PlannerScreen />)
    fireEvent.click(screen.getByRole('tab', { name: '🍽 Essen' }))
    expect(screen.getByText('Frage 1 von ' + FOOD_Q.length)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Vegetarisch' }))
    fireEvent.change(screen.getByPlaceholderText('…oder selbst tippen'), { target: { value: 'Sellerie' } })
    fireEvent.click(screen.getByRole('button', { name: '→' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))
    expect(screen.getByText('Frage 2 von ' + FOOD_Q.length)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Keine' }))
    for (const chip of ['Nichts Bestimmtes', 'Italienisch', '2', '~30 Min', 'Schnell & einfach', 'Manchmal', 'Nein, passt so']) {
      fireEvent.click(screen.getByRole('button', { name: chip }))
    }
    const p = readFoodProfile(useStore.getState().extra)
    expect(p).toMatchObject({ diet: 'Vegetarisch', allergies: 'Keine', dislikes: 'Nichts Bestimmtes', cuisines: 'Italienisch', people: '2', time: '~30 Min', breakfast: 'Schnell & einfach', prep: 'Manchmal', extra: 'Nein, passt so' })
    expect(screen.getByText(/Profil gespeichert/)).toBeInTheDocument()
    expect(screen.getByText(/Vegetarisch · Italienisch · 2 Pers\./)).toBeInTheDocument()
  })

  it('zeigt den Wochenplan, setzt Zutaten dedupliziert auf die Liste und speichert ein bearbeitetes Gericht', () => {
    useStore.getState().addTask('shopping', 'Milch')
    useStore.getState().setExtra({
      foodProfile: { diet: 'Alles', updatedAt: 1 },
      mealPlan: { createdAt: 1, days: [
        { tag: 'Mo', fruehstueck: { name: 'Müsli', zutaten: ['Haferflocken', 'Milch'] }, mittag: { name: 'Pasta', zutaten: ['Nudeln', 'Tomaten'] }, abend: null },
        { tag: 'Di', fruehstueck: { name: 'Müsli', zutaten: ['Haferflocken', 'Milch'] }, mittag: null, abend: null },
      ] },
    })
    localStorage.setItem('organizer_v8_planner_mode', 'food')
    render(<PlannerScreen />)
    fireEvent.click(screen.getByRole('button', { name: /Alle Zutaten auf die Einkaufsliste/ }))
    expect(useStore.getState().tasks.shopping.map((t) => t.text)).toEqual(['Milch', 'Haferflocken', 'Nudeln', 'Tomaten'])
    fireEvent.click(screen.getByRole('button', { name: /Pasta/ }))
    expect(screen.getByRole('dialog', { name: 'Mo · Mittag' })).toBeInTheDocument()
    fireEvent.change(screen.getByDisplayValue('Pasta'), { target: { value: 'Pasta Arrabbiata' } })
    fireEvent.change(screen.getByDisplayValue('Nudeln, Tomaten'), { target: { value: 'Nudeln, Tomaten, Chili' } })
    fireEvent.click(screen.getByRole('button', { name: /Speichern/ }))
    const mp = useStore.getState().extra.mealPlan as { days: { mittag: { name: string; zutaten: string[] } }[] }
    expect(mp.days[0].mittag).toEqual({ name: 'Pasta Arrabbiata', zutaten: ['Nudeln', 'Tomaten', 'Chili'] })
    expect(screen.getByText(/Pasta Arrabbiata/)).toBeInTheDocument()
  })
})
