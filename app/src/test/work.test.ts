import { describe, expect, it } from 'vitest'
import type { EventItem } from '../lib/model'
import { DEFAULT_WORK, euro, hoursText, isShift, readWork, shiftHours, shiftStats } from '../lib/work'

const ev = (id: string, date: string, time: string, end: string, text: string, extra: Partial<EventItem> = {}): EventItem =>
  ({ id, date, allDay: false, time, end, text, color: 'teal', source: 'calendar', ...extra })

describe('Schichten & Verdienst', () => {
  it('liest Einstellungen mit Standard Samowar / Mindestlohn + 1 €', () => {
    expect(readWork({})).toEqual(DEFAULT_WORK)
    expect(readWork({ work: { keyword: ' Kiosk ', rate: 15 } })).toEqual({ keyword: 'Kiosk', rate: 15 })
    expect(readWork({ work: { keyword: '', rate: -1 } })).toEqual(DEFAULT_WORK)
  })

  it('erkennt Schichten am Stichwort, nur mit Uhrzeit', () => {
    expect(isShift(ev('a', '2026-09-11', '14:00', '18:30', 'Samowar Tea and Records'), 'samowar')).toBe(true)
    expect(isShift(ev('b', '2026-09-11', '14:00', '18:30', 'Stefan'), 'Samowar')).toBe(false)
    expect(isShift({ id: 'c', date: '2026-09-11', allDay: true, text: 'Samowar', color: 'teal', source: 'calendar' }, 'Samowar')).toBe(false)
  })

  it('rechnet Stunden, auch über Mitternacht und mehrtägig', () => {
    expect(shiftHours(ev('a', '2026-09-11', '14:00', '18:30', 'S'))).toBe(4.5)
    expect(shiftHours(ev('b', '2026-09-11', '22:00', '02:00', 'S'))).toBe(4)
    expect(shiftHours(ev('c', '2026-09-11', '22:00', '02:00', 'S', { endDate: '2026-09-12' }))).toBe(4)
    expect(shiftHours(ev('d', '2026-09-11', '09:00', '', 'S'))).toBe(1)
  })

  it('summiert Woche, nächste Woche und Monat und nennt die nächste Schicht', () => {
    const events = [
      ev('1', '2026-09-08', '10:00', '14:00', 'Samowar'), // Di diese Woche (KW 37: 07.–13.09.)
      ev('2', '2026-09-11', '14:00', '18:30', 'Samowar Tea and Records'), // heute, läuft
      ev('3', '2026-09-12', '09:30', '14:30', 'Samowar'), // Sa
      ev('4', '2026-09-14', '10:00', '14:00', 'Samowar'), // Mo nächste Woche
      ev('5', '2026-09-29', '10:00', '13:00', 'Samowar'), // Monat, übernächste Woche
      ev('6', '2026-10-01', '10:00', '13:00', 'Samowar'), // nächster Monat
      ev('7', '2026-09-12', '20:00', '23:00', 'Nele'),
    ]
    const s = shiftStats(events, { keyword: 'Samowar', rate: 14.9 }, '2026-09-11', 15 * 60)
    expect(s.today).toEqual({ count: 1, hours: 4.5, earnings: 67.05 })
    expect(s.week).toEqual({ count: 3, hours: 13.5, earnings: 201.15 })
    expect(s.nextWeek).toEqual({ count: 1, hours: 4, earnings: 59.6 })
    expect(s.month.count).toBe(5)
    expect(s.month.hours).toBe(20.5)
    expect(s.next?.id).toBe('2')
    // Nach Schichtende zählt die nächste
    expect(shiftStats(events, { keyword: 'Samowar', rate: 14.9 }, '2026-09-11', 19 * 60).next?.id).toBe('3')
  })

  it('formatiert Euro und Stunden deutsch', () => {
    expect(euro(201.15)).toBe('201 €')
    expect(euro(1234.5)).toBe('1.235 €')
    expect(hoursText(4.5)).toBe('4,5 h')
    expect(hoursText(13)).toBe('13 h')
  })
})
