import { describe, expect, it } from 'vitest'
import { DEFAULT_STYLE, findBirthdays, greetingPrompt, parseBirthday, readGreetingStyle, whatsappUrl } from '../lib/birthdays'
import type { EventItem } from '../lib/model'

const allDay = (id: string, date: string, text: string): EventItem => ({ id, date, allDay: true, text, color: 'teal', source: 'calendar' })

describe('Geburtstage', () => {
  it('erkennt Name und Alter in allen Schreibweisen aus Stevens Kalender', () => {
    expect(parseBirthday(allDay('a', '2026-09-16', 'Tristan Eberhardt (28. Geburtstag)'))).toMatchObject({ name: 'Tristan Eberhardt', age: 28 })
    expect(parseBirthday(allDay('b', '2026-09-11', 'Lülle gebby'))).toMatchObject({ name: 'Lülle', age: null })
    expect(parseBirthday(allDay('c', '2026-09-23', 'Hannes Leuphana (Geburtstag)'))).toMatchObject({ name: 'Hannes Leuphana', age: null })
    expect(parseBirthday(allDay('d', '2026-09-10', 'Viktoria Vitalievna Bormashova (24. Geburtstag)'))).toMatchObject({ name: 'Viktoria Vitalievna Bormashova', age: 24 })
    expect(parseBirthday(allDay('e', '2026-09-10', '🎂 Nora hat Geburtstag'))).toMatchObject({ name: 'Nora', age: null })
    expect(parseBirthday(allDay('f', '2026-09-10', '30. Hochzeitstag'))).toBeNull()
    expect(parseBirthday(allDay('h', '2026-09-11', 'Celinda bday feier'))).toMatchObject({ name: 'Celinda', age: null })
    expect(parseBirthday(allDay('i', '2026-09-11', 'Geburtstag Nora'))).toMatchObject({ name: 'Nora' })
    expect(parseBirthday(allDay('g', '2026-09-10', 'Weltkindertag'))).toBeNull()
  })

  it('liefert heute und morgen getrennt, ohne Doppelungen', () => {
    const events = [allDay('a', '2026-09-11', 'Lülle gebby'), allDay('b', '2026-09-11', 'Lülle Geburtstag'), allDay('c', '2026-09-12', 'Nele (26. Geburtstag)'), allDay('d', '2026-09-13', 'Spät')]
    const b = findBirthdays(events, '2026-09-11')
    expect(b.today.map((x) => x.name)).toEqual(['Lülle'])
    expect(b.tomorrow.map((x) => x.name + x.age)).toEqual(['Nele26'])
  })

  it('baut den Prompt aus Ton, Beispiel und Bezug', () => {
    expect(readGreetingStyle({})).toEqual({ tone: DEFAULT_STYLE.tone, example: '' })
    const style = readGreetingStyle({ greetingStyle: { tone: 'kurz und trocken', example: 'Ey happy birthday!!' } })
    const p = greetingPrompt(style, { name: 'Lülle', age: 24, ev: allDay('a', '2026-09-11', 'x') }, 'Rave zusammen')
    expect(p.system).toContain('Ton: kurz und trocken')
    expect(p.system).toContain('„Ey happy birthday!!"')
    expect(p.user).toBe('Name: Lülle. Wird 24. Bezug: Rave zusammen')
    expect(whatsappUrl('Hi & tschüss')).toBe('https://wa.me/?text=Hi%20%26%20tsch%C3%BCss')
  })
})
