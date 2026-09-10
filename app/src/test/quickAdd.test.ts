import { describe, it, expect } from 'vitest'
import { parseQuickAdd, describeIntent } from '../lib/quickAdd'

// Donnerstag, 10.09.2026, 10:00 Uhr (lokale Zeit)
const NOW = new Date(2026, 8, 10, 10, 0)
const p = (s: string) => parseQuickAdd(s, NOW)

describe('parseQuickAdd – Termine', () => {
  it('liefert null bei leerer Eingabe', () => {
    expect(p('')).toBeNull()
    expect(p('   ')).toBeNull()
  })

  it('erkennt „morgen 15 uhr" mit Titel und ohne erfundenes Ende', () => {
    expect(p('Zahnarzt morgen 15 uhr')).toEqual({ kind: 'event', title: 'Zahnarzt', date: '2026-09-11', allDay: false, time: '15:00' })
  })

  it('erkennt Wochentag kurz mit Zeitspanne „9-10 uhr"', () => {
    expect(p('Meeting mo 9-10 uhr')).toEqual({ kind: 'event', title: 'Meeting', date: '2026-09-14', allDay: false, time: '09:00', end: '10:00' })
  })

  it('erkennt numerisches Datum „15.9." mit Uhrzeit „20:15"', () => {
    expect(p('Kino 15.9. 20:15')).toEqual({ kind: 'event', title: 'Kino', date: '2026-09-15', allDay: false, time: '20:15' })
  })

  it('erkennt „am 15." (dieser Monat) und „von 9 bis 10"', () => {
    expect(p('am 15. Yoga von 9 bis 10')).toEqual({ kind: 'event', title: 'Yoga', date: '2026-09-15', allDay: false, time: '09:00', end: '10:00' })
  })

  it('„am 5." liegt schon hinter uns → nächster Monat', () => {
    expect(p('Miete am 5.')).toMatchObject({ kind: 'event', title: 'Miete', date: '2026-10-05', allDay: true })
  })

  it('Datum ohne Zeit → ganztägig, mehrteiliger Titel bleibt erhalten', () => {
    expect(p('Geburtstag Oma 3.10.')).toEqual({ kind: 'event', title: 'Geburtstag Oma', date: '2026-10-03', allDay: true })
  })

  it('heutiger Wochentag zählt nur mit Uhrzeit in der Zukunft, sonst nächste Woche', () => {
    expect(p('do 11 uhr Uni')).toMatchObject({ kind: 'event', date: '2026-09-10', time: '11:00' })
    expect(p('do 9 uhr Uni')).toMatchObject({ kind: 'event', date: '2026-09-17', time: '09:00' })
  })

  it('„nächste woche mi" → Mittwoch der kommenden Woche', () => {
    expect(p('nächste woche mi Physio')).toEqual({ kind: 'event', title: 'Physio', date: '2026-09-16', allDay: true })
  })

  it('volles Datum mit Jahr und Spanne „15:00-16:30", Titel dahinter', () => {
    expect(p('15.09.2026 15:00-16:30 Zahnarzt')).toEqual({ kind: 'event', title: 'Zahnarzt', date: '2026-09-15', allDay: false, time: '15:00', end: '16:30' })
  })

  it('„um 9" ohne „uhr" → heute 09:00, „um" verschwindet aus dem Titel', () => {
    expect(p('um 9 Frühstück')).toEqual({ kind: 'event', title: 'Frühstück', date: '2026-09-10', allDay: false, time: '09:00' })
  })

  it('„15.30 uhr" wird zu 15:30', () => {
    expect(p('Anruf Mama 15.30 uhr')).toMatchObject({ kind: 'event', title: 'Anruf Mama', time: '15:30' })
  })

  it('nur Zeit ohne Titel → „Termin"', () => {
    expect(p('morgen 15 uhr')).toEqual({ kind: 'event', title: 'Termin', date: '2026-09-11', allDay: false, time: '15:00' })
  })

  it('Präfix „termin:" ohne Zeit → heute ganztägig', () => {
    expect(p('Termin: Sommerfest')).toEqual({ kind: 'event', title: 'Sommerfest', date: '2026-09-10', allDay: true })
  })

  it('„ganztägig" überschreibt eine Uhrzeit', () => {
    expect(p('Messe übermorgen ganztägig')).toEqual({ kind: 'event', title: 'Messe', date: '2026-09-12', allDay: true })
  })

  it('Gesundheits-Stichwort mit Uhrzeit ist trotzdem ein Termin', () => {
    expect(p('Zahnarzt 15 uhr')).toMatchObject({ kind: 'event', title: 'Zahnarzt' })
    expect(p('Zahnarzt')).toEqual({ kind: 'task', list: 'health', text: 'Zahnarzt' })
  })

  it('„so" als normales Wort ist kein Sonntag', () => {
    expect(p('Steuer so schnell wie möglich machen')).toEqual({ kind: 'task', list: 'today', text: 'Steuer so schnell wie möglich machen' })
    expect(p('Brunch am So 11 uhr')).toMatchObject({ kind: 'event', title: 'Brunch', date: '2026-09-13', time: '11:00' })
  })
})

describe('parseQuickAdd – Einkauf', () => {
  it('Liste aus lauter bekannten Artikeln (mit Menge) → Einkauf', () => {
    expect(p('Milch, Brot und 2 kg Kartoffeln')).toEqual({ kind: 'shopping', items: ['Milch', 'Brot', '2 kg Kartoffeln'] })
  })

  it('einzelner bekannter Artikel → Einkauf', () => {
    expect(p('Milch')).toEqual({ kind: 'shopping', items: ['Milch'] })
  })

  it('Präfix „einkauf:" nimmt auch unbekannte Artikel', () => {
    expect(p('Einkauf: Klopapier, Zahnpasta, Katzenfutter')).toEqual({ kind: 'shopping', items: ['Klopapier', 'Zahnpasta', 'Katzenfutter'] })
    expect(p('🛒 Katzenfutter')).toEqual({ kind: 'shopping', items: ['Katzenfutter'] })
  })

  it('unbekannter Teil in der Liste → kein Einkauf, sondern To-do', () => {
    expect(p('Milch und Steuer')).toMatchObject({ kind: 'task', list: 'today' })
  })
})

describe('parseQuickAdd – To-dos', () => {
  it('Arbeits-Stichwort → Liste work', () => {
    expect(p('Thesis Kapitel 3 schreiben')).toEqual({ kind: 'task', list: 'work', text: 'Thesis Kapitel 3 schreiben' })
  })

  it('Gesundheits-Stichwort → Liste health', () => {
    expect(p('joggen gehen')).toEqual({ kind: 'task', list: 'health', text: 'Joggen gehen' })
  })

  it('Hashtag bestimmt die Liste und verschwindet aus dem Text', () => {
    expect(p('Mail an Prof #arbeit')).toEqual({ kind: 'task', list: 'work', text: 'Mail an Prof' })
    expect(p('#health Tabletten bestellen')).toEqual({ kind: 'task', list: 'health', text: 'Tabletten bestellen' })
  })

  it('Präfix „todo:" schlägt Datum-Erkennung', () => {
    expect(p('todo: morgen Fenster putzen')).toEqual({ kind: 'task', list: 'today', text: 'Morgen Fenster putzen' })
  })

  it('ohne Stichwort → Liste today', () => {
    expect(p('Fenster putzen')).toEqual({ kind: 'task', list: 'today', text: 'Fenster putzen' })
  })
})

describe('describeIntent', () => {
  it('beschreibt Termin mit Wochentag, Datum und Spanne', () => {
    expect(describeIntent({ kind: 'event', title: 'X', date: '2026-09-15', allDay: false, time: '15:00', end: '16:00' })).toBe('Termin · Di 15.09. 15:00–16:00')
    expect(describeIntent({ kind: 'event', title: 'X', date: '2026-09-14', allDay: true })).toBe('Termin · Mo 14.09. · ganztägig')
  })

  it('beschreibt Einkauf und To-do', () => {
    expect(describeIntent({ kind: 'shopping', items: ['a', 'b', 'c'] })).toBe('Einkauf · 3 Artikel')
    expect(describeIntent({ kind: 'task', list: 'work', text: 'x' })).toBe('To-do · Arbeit')
  })
})
