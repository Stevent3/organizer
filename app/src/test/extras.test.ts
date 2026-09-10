import { describe, it, expect, beforeEach } from 'vitest'
import { executeIntent, runAction } from '../lib/actions'
import { useDashboard } from '../lib/dashboard'
import { EMPTY_STATE } from '../lib/model'
import { applyTheme, useTheme } from '../lib/theme'
import { todayKey } from '../lib/time'
import { useUi } from '../lib/ui'
import { describeCode, forecastUrl, parseForecast } from '../lib/weather'
import { useStore } from '../store/useStore'

beforeEach(() => {
  localStorage.clear()
  useStore.getState().replaceState({ ...EMPTY_STATE, tasks: { today: [], shopping: [], work: [], health: [] }, shopHistory: {}, extra: {} })
  useUi.setState({ tab: 'today', chatOpen: false, chatPrefill: null, toast: null })
})

describe('Kurzbefehle (URL-Schema)', () => {
  const run = (q: string) => runAction(new URLSearchParams(q))

  it('legt To-dos, Einkäufe und Termine an (v7-Parameter kompatibel)', () => {
    expect(run('action=add-task&text=Thesis&list=work')).toContain('Arbeit')
    expect(useStore.getState().tasks.work[0].text).toBe('Thesis')
    expect(run('action=add-shopping&items=milch,2 kg Kartoffeln, Milch')).toBe('🛒 Milch, Kartoffeln auf die Einkaufsliste')
    expect(useStore.getState().tasks.shopping.map((t) => t.text + '|' + (t.qty ?? ''))).toEqual(['Milch|', 'Kartoffeln|2 kg'])
    expect(run('action=add-event&title=Zahnarzt&date=2026-10-01&time=9:30&end=10:00')).toContain('Zahnarzt')
    expect(useStore.getState().events[0]).toMatchObject({ text: 'Zahnarzt', date: '2026-10-01', time: '09:30', end: '10:00', allDay: false })
    expect(run('action=add-event&text=Urlaub')).toContain('Urlaub')
    expect(useStore.getState().events[1]).toMatchObject({ text: 'Urlaub', date: todayKey(), allDay: true })
  })

  it('setzt Energie, öffnet den Chat mit Frage, wechselt Tabs und meldet Unbekanntes', () => {
    expect(run('action=set-energy&level=top')).toContain('Top')
    expect(useStore.getState().energy?.level).toBe('top')
    expect(run('action=set-energy&level=x')).toContain('Unbekanntes')
    expect(run('action=ask&q=Was steht an?')).toBeNull()
    expect(useUi.getState()).toMatchObject({ chatOpen: true, chatPrefill: 'Was steht an?' })
    expect(run('action=open&tab=planner')).toBeNull()
    expect(useUi.getState().tab).toBe('planner')
    expect(run('action=foo')).toContain('Unbekannter')
    expect(run('')).toBeNull()
  })

  it('„quick" nutzt den Parser: Termin, Einkauf, To-do', () => {
    expect(run('action=quick&text=morgen 15:00 Zahnarzt')).toMatch(/Zahnarzt.*15:00/)
    expect(useStore.getState().events[0]).toMatchObject({ text: 'Zahnarzt', time: '15:00' })
    expect(run('action=quick&text=Milch, Brot')).toContain('🛒')
    expect(useStore.getState().tasks.shopping).toHaveLength(2)
    expect(run('action=quick&text=Wäsche waschen')).toContain('To-dos')
    expect(useStore.getState().tasks.today[0].text).toBe('Wäsche waschen')
    expect(run('action=quick&text=')).toContain('ohne Text')
  })

  it('executeIntent dedupliziert Einkäufe gegen die Liste', () => {
    useStore.getState().addTask('shopping', 'Brot')
    expect(executeIntent({ kind: 'shopping', items: ['brot', 'Brot (2 Stk)'] })).toBe('Steht schon alles auf der Liste')
    expect(useStore.getState().tasks.shopping).toHaveLength(1)
  })
})

describe('Wetter', () => {
  it('übersetzt WMO-Codes', () => {
    expect(describeCode(0)).toEqual({ emoji: '☀️', text: 'Klar' })
    expect(describeCode(0, false).emoji).toBe('🌙')
    expect(describeCode(3).text).toBe('Bedeckt')
    expect(describeCode(63).text).toBe('Regen')
    expect(describeCode(66).text).toBe('Starker Regen')
    expect(describeCode(95).emoji).toBe('⛈️')
    expect(describeCode(999).text).toBe('Wetter')
  })

  it('parst die Open-Meteo-Antwort und baut die URL', () => {
    const w = parseForecast({
      current: { temperature_2m: 17.6, apparent_temperature: 16.2, weather_code: 2, is_day: 1 },
      daily: { time: ['2026-09-10', '2026-09-11'], temperature_2m_max: [21.4, 19], temperature_2m_min: [11.6, 10], precipitation_probability_max: [20, 65], weather_code: [2, 61] },
    }, 'Hannover', 5)
    expect(w).toMatchObject({ fetchedAt: 5, location: 'Hannover', temp: 18, feels: 16, code: 2, isDay: true })
    expect(w.days).toEqual([{ date: '2026-09-10', max: 21, min: 12, rain: 20, code: 2 }, { date: '2026-09-11', max: 19, min: 10, rain: 65, code: 61 }])
    expect(parseForecast({}, 'X').days).toEqual([])
    const url = forecastUrl({ name: 'H', lat: 52.3759, lon: 9.732 })
    expect(url).toContain('latitude=52.3759')
    expect(url).toContain('timezone=Europe%2FBerlin')
  })
})

describe('Erscheinungsbild + Dashboard', () => {
  it('setzt data-theme/data-accent am html und merkt sich die Wahl', () => {
    applyTheme('dark', 'ozean')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-accent')).toBe('ozean')
    applyTheme('system', 'indigo')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(document.documentElement.hasAttribute('data-accent')).toBe(false)
    useTheme.getState().set({ accent: 'rose' })
    expect(localStorage.getItem('organizer_v8_accent')).toBe('rose')
    expect(document.documentElement.getAttribute('data-accent')).toBe('rose')
    useTheme.getState().set({ mode: 'light' })
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    applyTheme('system', 'indigo')
  })

  it('blendet Dashboard-Abschnitte aus und speichert das lokal', () => {
    expect(useDashboard.getState().on.weather).toBe(true)
    useDashboard.getState().toggle('weather')
    expect(useDashboard.getState().on.weather).toBe(false)
    expect(JSON.parse(localStorage.getItem('organizer_v8_dashboard')!)).toMatchObject({ weather: false, todos: true })
    useDashboard.getState().toggle('weather', true)
  })
})

describe('Wunsch-Sammler', () => {
  it('sammelt, hakt ab, löscht und exportiert offene Wünsche', async () => {
    const { addWish, readWishes, removeWish, toggleWish, wishesToText } = await import('../lib/wishes')
    let l = addWish([], '  Abend-Review um 21 Uhr ', 1_000_000)
    l = addWish(l, 'Wetter im Briefing', 2_000_000)
    l = addWish(l, '   ', 3)
    expect(l.map((w) => w.text)).toEqual(['Wetter im Briefing', 'Abend-Review um 21 Uhr'])
    l = toggleWish(l, l[0].id)
    expect(wishesToText(l)).toMatch(/^Wünsche aus der Organizer-App:\n- Abend-Review um 21 Uhr \(/)
    l = removeWish(l, l[1].id)
    expect(l).toHaveLength(1)
    expect(wishesToText(l)).toBe('')
    useStore.getState().setExtra({ wishes: l })
    expect(readWishes(useStore.getState().extra)).toEqual(l)
    expect(readWishes({ wishes: 'kaputt' })).toEqual([])
  })
})

describe('Review-Regressionen', () => {
  it('Kurzbefehl add-event: Uhrzeit außerhalb des Bereichs wird ganztägig, add-shopping teilt wie der Parser', () => {
    expect(runAction(new URLSearchParams('action=add-event&title=X&time=25:99'))).toContain('X')
    expect(useStore.getState().events[0]).toMatchObject({ text: 'X', allDay: true })
    expect(useStore.getState().events[0].time).toBeUndefined()
    runAction(new URLSearchParams('action=add-shopping&items=Milch %26 Brot und Butter'))
    expect(useStore.getState().tasks.shopping.map((t) => t.text)).toEqual(['Milch', 'Brot', 'Butter'])
  })

  it('theme-color-Meta bekommt echte Hex-Werte, nie light-dark()', () => {
    document.head.innerHTML = '<meta name="theme-color" content="a" media="(prefers-color-scheme: light)"><meta name="theme-color" content="b" media="(prefers-color-scheme: dark)">'
    applyTheme('dark', 'indigo')
    expect([...document.querySelectorAll('meta[name="theme-color"]')].map((m) => m.getAttribute('content'))).toEqual(['#0b0b0f', '#0b0b0f'])
    applyTheme('system', 'indigo')
    expect([...document.querySelectorAll('meta[name="theme-color"]')].map((m) => m.getAttribute('content'))).toEqual(['#f4f5f9', '#0b0b0f'])
    document.head.innerHTML = ''
  })
})
