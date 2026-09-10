// Schnell-Eingabe (Dashboard): lokaler Natural-Language-Parser ohne KI.
// Erkennt Termin (Datum/Zeit), Einkauf (bekannte Artikel) oder To-do (Liste per Stichwort).
// `now` ist injizierbar, damit Tests deterministisch sind; alle Vergleiche in lokaler Zeit.
import { addDays, addMonths, addYears, format, getDay, getDaysInMonth, isBefore, setDate, startOfDay, startOfWeek } from 'date-fns'
import { addDaysKey, fromDateKey, minToTime, timeToMin, toDateKey } from './time'
import { SHOP_CATALOG, capitalize, parseQuantity, shopInfo } from './shopping'

export type QuickAddIntent =
  | { kind: 'event'; title: string; date: string; allDay: boolean; time?: string; end?: string }
  | { kind: 'shopping'; items: string[] }
  | { kind: 'task'; list: 'today' | 'work' | 'health'; text: string }

type TaskList = 'today' | 'work' | 'health'
type EventIntent = Extract<QuickAddIntent, { kind: 'event' }>

// Wortgrenzen inkl. Umlaute (JS-\b kennt nur ASCII)
const B1 = '(?<![\\wäöüß])'
const B2 = '(?![\\wäöüß])'
const WD_LABEL = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const WD_RE = 'montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|mo|di|mi|do|fr|sa|so'
const MONTHS = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember']
const H = '(\\d{1,2})(?:[:.](\\d{2}))?' // Stunde mit optionalen Minuten (15, 15:30, 15.30)
const SHOP_KEYS = Object.keys(SHOP_CATALOG)

const WORK_RE = new RegExp(`${B1}(?:thesis|uni|vorlesung|seminar|e-?mail|mail|meeting|kunde|laden|schicht|rechnung)`, 'i')
const HEALTH_RE = new RegExp(`${B1}(?:[\\wäöü]*arzt|sport|laufen|joggen|yoga|gym|training|medikament|tabletten|physio)`, 'i')

/** Wochentag-Index (0 = So) zu Token wie "mo", "montag" */
function weekdayIndex(token: string): number {
  const t = token.toLowerCase().slice(0, 2)
  return WD_LABEL.findIndex((l) => l.toLowerCase() === t)
}

/** Erstes gültiges Vorkommen von re in s entfernen (durch Leerzeichen ersetzen) und Treffer liefern */
function take(s: string, re: RegExp, ok: (m: RegExpExecArray) => boolean = () => true): [string, RegExpExecArray | null] {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
  let m: RegExpExecArray | null
  while ((m = g.exec(s))) {
    if (ok(m)) return [s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length), m]
    if (!m[0]) g.lastIndex++
  }
  return [s, null]
}

const validDay = (d: number, mo: number) => d >= 1 && d <= 31 && mo >= 1 && mo <= 12
const validTime = (h: string, mm?: string) => Number(h) <= 23 && (mm === undefined || Number(mm) <= 59)
const fmtTime = (h: string, mm?: string) => minToTime(Number(h) * 60 + (mm ? Number(mm) : 0))

type When = { rest: string; date?: string; time?: string; end?: string; allDay?: boolean }

/** Datum-/Zeit-Tokens aus dem Text ziehen; rest = Text ohne diese Tokens */
function parseWhen(text: string, now: Date): When {
  let s = text
  let m: RegExpExecArray | null
  const out: When = { rest: text }
  const today = startOfDay(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()

  // 1) Numerisches Datum: 15.9., 15.09.2026, 15.9.26 (ohne Jahr: nächstes Vorkommen)
  ;[s, m] = take(s, /(?:\bam\s+)?\b(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})?(?![\d.])/i, (m) => validDay(+m[1], +m[2]))
  if (m) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : now.getFullYear()
    let d = new Date(y, +m[2] - 1, +m[1])
    if (!m[3] && isBefore(d, today)) d = addYears(d, 1)
    out.date = toDateKey(d)
  }
  // 1b) "15. September"
  if (!out.date) {
    ;[s, m] = take(s, new RegExp(`(?:\\bam\\s+)?\\b(\\d{1,2})\\.\\s*(${MONTHS.join('|')})${B2}`, 'i'), (m) => validDay(+m[1], 1))
    if (m) {
      let d = new Date(now.getFullYear(), MONTHS.indexOf(m[2].toLowerCase()), +m[1])
      if (isBefore(d, today)) d = addYears(d, 1)
      out.date = toDateKey(d)
    }
  }
  // 1c) "am 15." → dieser Monat, falls noch nicht vorbei, sonst nächster
  if (!out.date) {
    ;[s, m] = take(s, /\bam\s+(\d{1,2})\.(?![\d.])/i, (m) => validDay(+m[1], 1))
    if (m) {
      const day = +m[1]
      const base = day >= now.getDate() ? today : addMonths(today, 1)
      out.date = toDateKey(setDate(base, Math.min(day, getDaysInMonth(base))))
    }
  }

  // 2) Zeitspanne: 15:00-16:30, 9-10 uhr, von 9 bis 10, 15.30-16.00 uhr
  //    Nackte Zahlen ("9-10") zählen nur mit "von"/"uhr" oder Doppelpunkt.
  ;[s, m] = take(
    s,
    new RegExp(`\\b(?:(um|von)\\s+)?${H}\\s*(uhr\\s*)?(?:-|–|bis)\\s*${H}(\\s*uhr)?\\b(?![:.]\\d)`, 'i'),
    (m) => (m[1]?.toLowerCase() === 'von' || !!m[4] || !!m[7] || m[0].includes(':')) && validTime(m[2], m[3]) && validTime(m[5], m[6]),
  )
  if (m) {
    out.time = fmtTime(m[2], m[3])
    out.end = fmtTime(m[5], m[6])
  }

  // 3) Einzelzeit: 15:00, 15.30 uhr, 15 uhr, um 9
  if (!out.time) {
    ;[s, m] = take(s, /\b(?:um\s+)?(\d{1,2}):(\d{2})\b/i, (m) => validTime(m[1], m[2]))
    if (!m) [s, m] = take(s, /\b(?:um\s+)?(\d{1,2})(?:\.(\d{2}))?\s*uhr\b/i, (m) => validTime(m[1], m[2]))
    if (!m) [s, m] = take(s, /\bum\s+(\d{1,2})\b(?![:.]\d)/i, (m) => validTime(m[1]))
    if (m) out.time = fmtTime(m[1], m[2])
  }

  // 4) ganztägig
  ;[s, m] = take(s, new RegExp(`${B1}(?:ganzt(?:ä|ae)gig|ganztags)${B2}`, 'i'))
  if (m) out.allDay = true

  // 5) Relative Tage und Wochentage
  if (!out.date) {
    ;[s, m] = take(s, new RegExp(`${B1}(heute|morgen|übermorgen)${B2}`, 'i'))
    if (m) {
      const w = m[1].toLowerCase()
      out.date = addDaysKey(toDateKey(now), w === 'heute' ? 0 : w === 'morgen' ? 1 : 2)
    }
  }
  if (!out.date) {
    // "nächste Woche Mi" → Wochentag der kommenden Woche (Mo–So)
    ;[s, m] = take(s, new RegExp(`(?:\\bam\\s+)?${B1}n(?:ä|ae)chste\\s+woche\\s+(?:am\\s+)?(${WD_RE})\\.?${B2}`, 'i'))
    if (m) {
      const monday = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7)
      out.date = toDateKey(addDays(monday, (weekdayIndex(m[1]) + 6) % 7))
    }
  }
  if (!out.date) {
    // Nächstes Vorkommen; heute nur, wenn eine Uhrzeit in der Zukunft dabei ist.
    // "so" ist ein normales Wort → nur mit "am", Punkt oder am Anfang.
    ;[s, m] = take(s, new RegExp(`(?:\\bam\\s+|${B1}n(?:ä|ae)chsten?\\s+)?${B1}(${WD_RE})\\.?${B2}`, 'i'), (m) =>
      m[1].toLowerCase() !== 'so' || /^(am|n)/i.test(m[0]) || m[0].endsWith('.') || m.index === 0,
    )
    if (m) {
      let diff = (weekdayIndex(m[1]) - getDay(now) + 7) % 7
      const later = out.time !== undefined && (timeToMin(out.time) ?? 0) > nowMin
      if (diff === 0 && !later) diff = 7
      out.date = toDateKey(addDays(today, diff))
    }
  }

  out.rest = s
  return out
}

/** Titel säubern: Leerraum, hängende Füllwörter (am/um/von/bis/uhr) und Satzzeichen an den Rändern */
function cleanTitle(s: string): string {
  let t = s.replace(/\s+/g, ' ').trim()
  let prev: string
  do {
    prev = t
    t = t
      .replace(/^[,;:\-–·\s]+|[,;:\-–·\s]+$/g, '')
      .replace(/^(?:am|um|von|bis|uhr)(?:\s+|$)/i, '')
      .replace(/(?:^|\s+)(?:am|um|von|bis|uhr)$/i, '')
      .trim()
  } while (t !== prev)
  return t
}

function makeEvent(text: string, now: Date, force: boolean): EventIntent | null {
  const w = parseWhen(text, now)
  if (!force && !w.date && !w.time && !w.allDay) return null
  const allDay = !!w.allDay || !w.time
  const ev: EventIntent = { kind: 'event', title: capitalize(cleanTitle(w.rest)) || 'Termin', date: w.date ?? toDateKey(now), allDay }
  if (!allDay && w.time) {
    ev.time = w.time
    if (w.end) ev.end = w.end
  }
  return ev
}

/** Komma-/„und"-Liste; Kaufverben am Ende jedes Teils fallen weg */
function splitItems(s: string): string[] {
  return s
    .split(/\s*(?:,|;|&|\bund\b)\s*/i)
    .map((p) => p.replace(/\s+(?:holen|kaufen|besorgen|mitbringen)$/i, '').trim())
    .filter(Boolean)
}

/** Bekannter Artikel laut Katalog – zusätzlich zu shopInfo muss ein Wort zu einem Katalog-Schlüssel passen
 *  (exakt, oder bei längeren Schlüsseln Plural/Kompositum wie "Kartoffeln", "Hackfleisch"), damit
 *  Teilstring-Treffer wie "ei" in "Meeting" nicht als Einkauf gelten. */
function isKnownItem(part: string): boolean {
  const name = parseQuantity(part).name
  if (shopInfo(name).cat === 'sonst') return false
  const words = name.toLowerCase().split(/\s+/)
  if (words.length > 2) return false
  return words.some((w) => SHOP_KEYS.some((k) => w === k || (k.length >= 4 && (w.startsWith(k) || w.endsWith(k)))))
}

const TAG_RE = /(?:^|\s)#(arbeit|work|gesundheit|health|todo)(?![\wäöü])/i
const tagList = (t: string): TaskList => (/^(arbeit|work)$/i.test(t) ? 'work' : /^(gesundheit|health)$/i.test(t) ? 'health' : 'today')

function makeTask(list: TaskList, text: string): QuickAddIntent | null {
  const t = cleanTitle(text.replace(TAG_RE, ' '))
  return t ? { kind: 'task', list, text: capitalize(t) } : null
}

const guessList = (s: string): TaskList => (WORK_RE.test(s) ? 'work' : HEALTH_RE.test(s) ? 'health' : 'today')

/** Eingabe deuten; null bei leerer Eingabe (oder nur Präfix ohne Inhalt) */
export function parseQuickAdd(input: string, now: Date = new Date()): QuickAddIntent | null {
  const raw = (input ?? '').replace(/\s+/g, ' ').trim()
  if (!raw) return null

  // 1) Explizite Präfixe (höchste Priorität)
  let m = /^(?:einkauf\s*:|(?:einkaufen|kaufen|besorgen|🛒)\s*:?)\s*/i.exec(raw)
  if (m) {
    const items = splitItems(raw.slice(m[0].length))
    if (items.length) return { kind: 'shopping', items }
  }
  const prefixes: [RegExp, TaskList][] = [
    [/^(?:arbeit|work)\s*:\s*/i, 'work'],
    [/^gesundheit\s*:\s*/i, 'health'],
    [/^todo\s*:\s*/i, 'today'],
  ]
  for (const [re, list] of prefixes) {
    m = re.exec(raw)
    if (m) return makeTask(list, raw.slice(m[0].length))
  }
  m = /^termin\s*:\s*/i.exec(raw)
  if (m) return makeEvent(raw.slice(m[0].length), now, true)
  m = TAG_RE.exec(raw)
  if (m) return makeTask(tagList(m[1]), raw)

  // 2) Datum oder Zeit → Termin
  const ev = makeEvent(raw, now, false)
  if (ev) return ev

  // 3) Nur bekannte Artikel → Einkauf
  const parts = splitItems(raw)
  if (parts.length && parts.every(isKnownItem)) return { kind: 'shopping', items: parts }

  // 4) Sonst To-do, Liste per Stichwort
  return makeTask(guessList(raw), raw)
}

/** Kurze Vorschau, z. B. "Termin · Mo 15.09. 15:00–16:00", "Einkauf · 3 Artikel", "To-do · Arbeit" */
export function describeIntent(i: QuickAddIntent): string {
  if (i.kind === 'shopping') return `Einkauf · ${i.items.length} Artikel`
  if (i.kind === 'task') return 'To-do · ' + (i.list === 'work' ? 'Arbeit' : i.list === 'health' ? 'Gesundheit' : 'Heute')
  const d = fromDateKey(i.date)
  const day = `${WD_LABEL[getDay(d)]} ${format(d, 'dd.MM.')}`
  if (i.allDay) return `Termin · ${day} · ganztägig`
  return `Termin · ${day} ${i.time}${i.end ? '–' + i.end : ''}`
}
