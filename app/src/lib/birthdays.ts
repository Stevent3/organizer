// Geburtstags-Assistent (M13 B): Geburtstage aus dem Apple-Kalender erkennen und Glückwünsche in Stevens Ton formulieren.
import { eventsOnDay } from './calendar'
import type { EventItem } from './model'
import { addDaysKey, todayKey } from './time'

export type Birthday = { name: string; age: number | null; ev: EventItem }

const BDAY = /\b(geburtstag|gebby|geb\.?tag|bday|b-day|birthday)\b/i

/** „Tristan Eberhardt (28. Geburtstag)" → Tristan Eberhardt, 28 · „Lülle gebby" → Lülle · „Hannes (Geburtstag)" → Hannes */
export function parseBirthday(ev: EventItem): Birthday | null {
  if (!BDAY.test(ev.text)) return null
  let age: number | null = null
  let name = ev.text
  const paren = /\(([^)]*)\)/.exec(name)
  if (paren) {
    const m = /(\d{1,3})\s*\./.exec(paren[1])
    if (m) age = Number(m[1])
    name = name.replace(paren[0], ' ')
  }
  const m2 = /(\d{1,3})\s*\.?\s*(?=geburtstag|gebby|bday|birthday)/i.exec(name)
  if (m2 && age == null) age = Number(m2[1])
  const clean = name.replace(/\b(hat|has)\b/gi, ' ').replace(/\d{1,3}\s*\./g, ' ').replace(/[🎂🎉🎈🥳]/gu, ' ')
  // Name = Teil VOR dem Stichwort („Celinda bday feier" → Celinda); nur wenn davor nichts steht, der Rest („Geburtstag Nora" → Nora)
  const tidy = (s: string) => s.replace(/[:\-–·,]+\s*$/g, ' ').replace(/^\s*[:\-–·,]+/g, ' ').replace(/\s+/g, ' ').trim()
  name = tidy(clean.split(BDAY)[0]) || tidy(clean.replace(BDAY, ' ')) || 'Jemand'
  return { name, age, ev }
}

/** Geburtstage heute und morgen (Vorwarnung fürs Geschenk) */
export function findBirthdays(events: EventItem[], day = todayKey()): { today: Birthday[]; tomorrow: Birthday[] } {
  const pick = (d: string) => {
    const seen = new Set<string>()
    const out: Birthday[] = []
    for (const ev of eventsOnDay(events, d)) {
      const b = parseBirthday(ev)
      if (!b || seen.has(b.name.toLowerCase())) continue
      seen.add(b.name.toLowerCase())
      out.push(b)
    }
    return out
  }
  return { today: pick(day), tomorrow: pick(addDaysKey(day, 1)) }
}

/** Ton für die KI: Freitext + ein echtes Beispiel von Steven (extra.greetingStyle, synchronisiert) */
export type GreetingStyle = { tone: string; example: string }
export const DEFAULT_STYLE: GreetingStyle = {
  tone: 'locker, herzlich, per Du, kurz; ein persönlicher Bezug, wenn möglich; höchstens ein Emoji',
  example: '',
}

export function readGreetingStyle(extra: Record<string, unknown>): GreetingStyle {
  const g = extra.greetingStyle as Partial<GreetingStyle> | undefined
  return { tone: typeof g?.tone === 'string' && g.tone.trim() ? g.tone.trim() : DEFAULT_STYLE.tone, example: typeof g?.example === 'string' ? g.example.trim() : '' }
}

export function greetingPrompt(style: GreetingStyle, b: Birthday, note = ''): { system: string; user: string } {
  const system =
    'Du schreibst für Steven eine Geburtstagsnachricht, die klingt, als hätte er sie selbst getippt (WhatsApp). ' +
    'Ton: ' + style.tone + '. ' +
    (style.example ? 'So schreibt Steven wirklich – übernimm Stil, Länge und Wortwahl, aber kopiere den Text nicht: „' + style.example + '". ' : '') +
    'Schreib GENAU EINE Nachricht, 2–4 Sätze, Deutsch, ohne Anführungszeichen, ohne Betreff, ohne Erklärung. Keine Floskeln wie „alles Gute zum Geburtstag" ohne persönlichen Dreh.'
  const user = 'Name: ' + b.name + (b.age ? '. Wird ' + b.age + '.' : '.') + (note ? ' Bezug: ' + note : '')
  return { system, user }
}

export function whatsappUrl(text: string): string {
  return 'https://wa.me/?text=' + encodeURIComponent(text)
}
