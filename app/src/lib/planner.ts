// Planer: KI-Tagesplan + Essensplaner (Ernährungscoach). Prompts und JSON-Formate 1:1 aus v7,
// Daten liegen weiter in state.extra (dayPlan, mealPlan, foodProfile) – so lesen Worker-Cron und v7 sie unverändert.
import { eventsOnDay } from './calendar'
import { LISTS, type AppState, type ColorKey, type EventItem, type Task } from './model'
import { mergeQty, parseIngredient, shopBaseName } from './shopping'
import { addDaysKey, todayKey, weekStartKey } from './time'

// ── Tagesplan ────────────────────────────────────────────────

export type PlanBlockType = 'event' | 'task' | 'focus' | 'break' | 'travel' | 'meal' | 'free' | 'routine'
export type PlanBlock = { time: string; end?: string; title: string; type: PlanBlockType; note?: string }
export type DayPlan = { generatedAt: number; date: string; summary: string; blocks: PlanBlock[]; appliedAt?: number }

export const PLAN_TYPES: readonly PlanBlockType[] = ['event', 'task', 'focus', 'break', 'travel', 'meal', 'free', 'routine']
export const PLAN_ICON: Record<PlanBlockType, string> = { event: '📍', task: '✅', focus: '🎯', break: '☕', travel: '🚶', meal: '🍽️', free: '🌤️', routine: '🔁' }
/** v7: event=ev-cal, focus/routine=purple, break/meal=green, travel=orange, task/free=blau */
export const PLAN_COLOR: Record<PlanBlockType, ColorKey> = { event: 'teal', task: 'accent', focus: 'pink', break: 'green', travel: 'orange', meal: 'green', free: 'accent', routine: 'pink' }

const isTime = (t: unknown): t is string => typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t.trim())
const padTime = (t: string) => t.trim().padStart(5, '0')

/** JSON-Objekt aus einer Modellantwort – auch wenn Text oder ```-Zäune drumherum stehen */
export function parseJsonObject(text: string): Record<string, unknown> {
  const t = (text || '').trim()
  try {
    const v = JSON.parse(t)
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  } catch { /* weiter unten */ }
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a >= 0 && b > a) {
    const v = JSON.parse(t.slice(a, b + 1))
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  }
  throw new Error('Antwort ist kein JSON-Objekt')
}

/** Rohe Blöcke (Modell oder KV/v7) absichern: Uhrzeit + Titel Pflicht, Typ mit Fallback, sortiert */
export function normalizeBlocks(raw: unknown): PlanBlock[] {
  if (!Array.isArray(raw)) return []
  return (raw as Record<string, unknown>[])
    .filter((b) => b && isTime(b.time) && String(b.title ?? '').trim())
    .map((b) => ({
      time: padTime(b.time as string),
      ...(isTime(b.end) ? { end: padTime(b.end) } : {}),
      title: String(b.title).trim(),
      type: PLAN_TYPES.includes(b.type as PlanBlockType) ? (b.type as PlanBlockType) : 'task',
      ...(b.note ? { note: String(b.note).trim() } : {}),
    }))
    .sort((a, b) => a.time.localeCompare(b.time))
}

/** Gespeicherter Plan (auch aus v7/KV, dort nur nach Uhrzeit gefiltert) – validiert, null wenn leer */
export function readDayPlan(extra: Record<string, unknown>): DayPlan | null {
  const p = extra.dayPlan as Partial<DayPlan> | null | undefined
  if (!p) return null
  const blocks = normalizeBlocks(p.blocks)
  if (!blocks.length) return null
  return { generatedAt: Number(p.generatedAt ?? 0), date: String(p.date ?? ''), summary: String(p.summary ?? ''), blocks, ...(p.appliedAt ? { appliedAt: p.appliedAt } : {}) }
}

/** Prompt wie v7 (generatePlan): Fixtermine heute, offene Aufgaben aller Listen, Energie, Uhrzeit */
export function dayPlanPrompt(s: AppState, now = new Date()): { system: string; user: string } {
  const day = todayKey()
  const events = eventsOnDay(s.events, day)
    .filter((e) => !e.allDay && e.time)
    .map((e) => e.time + (e.end ? '–' + e.end : '') + ' ' + e.text + (e.sub ? ' (' + e.sub + ')' : '') + (e.travel ? ', Fahrt ' + e.travel + ' Min' : ''))
    .join('; ') || 'keine'
  const tasks = LISTS.flatMap((l) => s.tasks[l.id].filter((t) => !t.done).map((t) => t.text + ' [' + l.label + ']')).join('; ') || 'keine'
  const time = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const system =
    'Du bist Stevens persönlicher Tagescoach. Erstelle einen realistischen, entspannten Tagesablauf als JSON. ' +
    'Berücksichtige Fixtermine (nicht verschieben!), plane offene Aufgaben in freie Lücken, baue Pausen/Mahlzeiten ein, und gib bei Terminen mit Ort einen Losgeh-Hinweis (Typ travel, ~15-20 Min vorher, als Schätzung). ' +
    'Antworte NUR mit JSON: {"summary":"1 motivierender Satz","blocks":[{"time":"HH:MM","end":"HH:MM optional","title":"...","type":"event|task|focus|break|travel|meal|free","note":"kurzer Tipp"}]}. ' +
    'Sortiere blocks nach Zeit. Halte dich an Realität, max 12 Blöcke.'
  const user = 'Jetzt ist ' + time + '. Energie: ' + (s.energy?.label ?? 'nicht gesetzt') + '. Fixtermine heute: ' + events + '. Offene Aufgaben: ' + tasks + '.'
  return { system, user }
}

/** Modellantwort zu einem DayPlan: nur Blöcke mit Uhrzeit, sortiert, Typen abgesichert */
export function normalizeDayPlan(parsed: Record<string, unknown>, date = todayKey(), generatedAt = Date.now()): DayPlan {
  const blocks = normalizeBlocks(parsed.blocks)
  if (!blocks.length) throw new Error('Der Plan enthält keine Blöcke mit Uhrzeit')
  return { generatedAt, date, summary: String(parsed.summary ?? '').trim(), blocks }
}

/**
 * „Plan übernehmen": Blöcke als echte Termine. Fixtermine (event) stehen schon im Kalender,
 * freie Zeit (free) ist kein Termin. Was am Plantag mit gleicher Uhrzeit + Titel existiert, wird
 * übersprungen – ein zweites Übernehmen legt nichts doppelt an.
 */
export function planToEvents(plan: DayPlan, existing: EventItem[]): Omit<EventItem, 'id'>[] {
  const date = plan.date || todayKey()
  const have = new Set(eventsOnDay(existing, date).map((e) => (e.time ?? '') + '|' + e.text.trim().toLowerCase()))
  const out: Omit<EventItem, 'id'>[] = []
  for (const b of plan.blocks) {
    if (b.type === 'event' || b.type === 'free') continue
    const k = b.time + '|' + b.title.trim().toLowerCase()
    if (have.has(k)) continue
    have.add(k)
    out.push({ date, allDay: false, time: b.time, end: b.end, text: b.title, sub: b.note, color: PLAN_COLOR[b.type], source: 'manual' })
  }
  return out
}

// ── Essensplaner ─────────────────────────────────────────────

export type MealSlot = 'fruehstueck' | 'mittag' | 'abend'
export const MEAL_SLOTS: { id: MealSlot; label: string; icon: string }[] = [
  { id: 'fruehstueck', label: 'Frühstück', icon: '🌅' },
  { id: 'mittag', label: 'Mittag', icon: '🌞' },
  { id: 'abend', label: 'Abend', icon: '🌙' },
]
export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

/** rezept: von der KI erzeugte Kochanleitung (optional, wird gecacht) */
/** unterwegs: laut Kalender keine Zeit zum Kochen – Slot bewusst leer (Stevens Wunsch 10.09.2026) */
export type Meal = { name: string; zutaten: string[]; rezept?: string; unterwegs?: boolean }
export type MealDay = { tag: string } & Record<MealSlot, Meal | null>
export type MealPlan = { createdAt: number; days: MealDay[] }

export type FoodKey = 'diet' | 'allergies' | 'dislikes' | 'cuisines' | 'people' | 'time' | 'breakfast' | 'prep' | 'extra'
export type FoodProfile = Partial<Record<FoodKey, string>> & { updatedAt: number }

/** Interview aus v7 (Ernährungscoach) – k = Feld im Profil, free = zusätzlich Freitext */
export const FOOD_Q: { k: FoodKey; q: string; chips: string[]; free?: boolean }[] = [
  { k: 'diet', q: 'Wie ernährst du dich?', chips: ['Alles', 'Vegetarisch', 'Vegan', 'Pescetarisch', 'Flexitarisch'] },
  { k: 'allergies', q: 'Unverträglichkeiten oder Allergien?', chips: ['Keine', 'Laktose', 'Gluten', 'Nüsse'], free: true },
  { k: 'dislikes', q: 'Zutaten, die gar nicht gehen?', chips: ['Nichts Bestimmtes'], free: true },
  { k: 'cuisines', q: 'Welche Küche liebst du am meisten?', chips: ['Italienisch', 'Asiatisch', 'Deutsch', 'Mexikanisch', 'Orientalisch', 'Gemischt'], free: true },
  { k: 'people', q: 'Für wie viele Personen kochst du meistens?', chips: ['1', '2', '3', '4+'] },
  { k: 'time', q: 'Wie viel Zeit hast du werktags zum Kochen?', chips: ['~15 Min', '~30 Min', '45+ Min'] },
  { k: 'breakfast', q: 'Wie frühstückst du am liebsten?', chips: ['Schnell & einfach', 'Ausgiebig', 'Abwechslungsreich', 'Meist gleich'] },
  { k: 'prep', q: 'Meal-Prep – vorkochen für mehrere Tage?', chips: ['Ja, gerne', 'Manchmal', 'Nein'] },
  { k: 'extra', q: 'Noch etwas, das dein Ernährungscoach wissen sollte?', chips: ['Nein, passt so'], free: true },
]

export function readFoodProfile(extra: Record<string, unknown>): FoodProfile | null {
  const p = extra.foodProfile as FoodProfile | null | undefined
  return p && typeof p === 'object' ? p : null
}

export function readMealPlan(extra: Record<string, unknown>): MealPlan | null {
  const p = extra.mealPlan as MealPlan | null | undefined
  return p && Array.isArray(p.days) && p.days.length ? p : null
}

/** Gemeinsamer Prompt-Baustein für Wochenplan und Neu-Würfeln (v7 foodProfileText) */
export function foodProfileText(p: FoodProfile | null): string {
  const f: Partial<Record<FoodKey, string>> = p ?? {}
  return 'Ernährung: ' + (f.diet || 'alles') + '. Allergien/Unverträglichkeiten: ' + (f.allergies || 'keine') + '. No-Gos: ' + (f.dislikes || 'keine') +
    '. Lieblingsküche: ' + (f.cuisines || 'gemischt') + '. Personen: ' + (f.people || '1') + '. Kochzeit werktags: ' + (f.time || '~30 Min') +
    '. Frühstück: ' + (f.breakfast || 'einfach') + '. Meal-Prep: ' + (f.prep || 'nein') + '. Sonstiges: ' + (f.extra || '-')
}

export const MEAL_PLAN_SYSTEM =
  'Du bist ein Ernährungsberater und erstellst einen 7-Tage-Essensplan (Mo–So) mit Frühstück, Mittag und Abendessen. ' +
  'Halte dich STRENG an das Profil (Ernährungsweise, Allergien, No-Gos, Kochzeit!). Frühstück darf sich wiederholen (2-3 Varianten). ' +
  'Nutze saisonale, in Deutschland gängige Zutaten, studentenfreundliches Budget. ' +
  'Antworte NUR mit JSON: {"days":[{"tag":"Mo","fruehstueck":{"name":"...","zutaten":["500 g Kartoffeln","2 Paprika"]},"mittag":{...},"abend":{...}}, ... 7 Tage]}. ' +
  'Zutaten als Einkaufsposten MIT Menge für die Personenzahl, Menge vorne: "500 g Kartoffeln", "2 Paprika", "1 Pck. Haferflocken", "200 ml Sahne" (Einheiten: g, kg, ml, L, Stk., Pck., Bund, Dose, Glas); 3-7 pro Gericht, Grundzutaten wie Salz/Öl weglassen. ' +
  'Du bekommst den Kalender der Woche. Ist Steven zur Essenszeit unterwegs (Termin über 12–14 Uhr bzw. 18–20 Uhr, ganztägig weg, Reise), dann für diesen Slot NICHT kochen, sondern genau {"name":"Unterwegs","unterwegs":true,"zutaten":[]}. Frühstück nur auslassen, wenn ein Termin vor 8 Uhr beginnt. Vergangene Tage der Woche kurz halten.'

/** Kalender der laufenden Woche (Mo–So) als Text für den Essensplan: Uhrzeiten und Ganztägiges je Tag */
export function weekCalendarText(events: EventItem[], day = todayKey()): string {
  const start = weekStartKey(day)
  return WEEKDAYS.map((w, i) => {
    const key = addDaysKey(start, i)
    const list = eventsOnDay(events, key).map((e) => (e.allDay || !e.time ? 'ganztägig ' + e.text : e.time + (e.end ? '–' + e.end : '') + ' ' + e.text))
    const mark = key === day ? ' (heute)' : key < day ? ' (vorbei)' : ''
    return w + mark + ': ' + (list.join(', ') || 'frei')
  }).join('; ')
}

/** Nutzer-Prompt für den Wochenplan: Profil + Kalender der Woche */
export function mealPlanUserPrompt(p: FoodProfile | null, events: EventItem[], day = todayKey()): string {
  return foodProfileText(p) + ' Kalender der Woche: ' + weekCalendarText(events, day)
}

export const RECIPE_SYSTEM = 'Du bist ein pragmatischer Koch für Studenten. Schreib ein kurzes, alltagstaugliches Rezept auf Deutsch: Zutaten mit Mengen für die genannte Personenzahl, dann nummerierte Schritte (max. 8), am Ende ein Tipp. Kein Vorgeplänkel, keine Überschrift, Markdown-frei (nur Zeilenumbrüche und „-" bzw. Nummern).'

export function recipeUserPrompt(p: FoodProfile | null, meal: Meal): string {
  return foodProfileText(p) + ' Gericht: ' + meal.name + (meal.zutaten.length ? '. Geplante Zutaten: ' + meal.zutaten.join(', ') : '') + '.'
}

export const REROLL_SYSTEM = 'Du bist Ernährungsberater. Schlage GENAU EIN alternatives Gericht vor. Antworte NUR mit JSON: {"name":"...","zutaten":["..."]}. Profil strikt beachten.'

export function rerollUserPrompt(p: FoodProfile | null, plan: MealPlan, slot: MealSlot, tag: string): string {
  const avoid = plan.days.flatMap((d) => MEAL_SLOTS.map((s) => d[s.id]?.name)).filter(Boolean).join(', ')
  return foodProfileText(p) + ' Slot: ' + slot + ' am ' + tag + '. NICHT diese Gerichte: ' + avoid
}

export function normMeal(m: unknown): Meal | null {
  if (!m || typeof m !== 'object') return null
  const o = m as { name?: unknown; zutaten?: unknown; unterwegs?: unknown }
  if (o.unterwegs === true || /^unterwegs\b/i.test(String(o.name || ''))) return { name: 'Unterwegs', zutaten: [], unterwegs: true }
  return { name: String(o.name || 'Gericht'), zutaten: Array.isArray(o.zutaten) ? o.zutaten.map(String).slice(0, 10) : [] }
}

export function normalizeMealPlan(parsed: Record<string, unknown>, createdAt = Date.now()): MealPlan {
  const raw = Array.isArray(parsed.days) ? (parsed.days as Record<string, unknown>[]).slice(0, 7) : []
  const days: MealDay[] = raw.map((d, i) => ({
    tag: String(d.tag || WEEKDAYS[i]),
    fruehstueck: normMeal(d.fruehstueck),
    mittag: normMeal(d.mittag),
    abend: normMeal(d.abend),
  }))
  if (!days.length) throw new Error('Der Plan enthält keine Tage')
  return { createdAt, days }
}

/** Index des heutigen Wochentags im Plan (Mo = 0) */
export function todayMealIndex(d = new Date()): number {
  const w = d.getDay()
  return w === 0 ? 6 : w - 1
}

/**
 * Zutaten, die noch nicht auf der Einkaufsliste stehen (auch nicht im Korb – Wochen-Übertrag wie v7),
 * innerhalb der Eingabe zusammengefasst: gleiche Zutat mehrfach in der Woche → eine Position, Mengen addiert.
 * Vergleich über shopBaseName des Namens ohne Menge.
 */
export function newIngredients(ingredients: string[], shopping: Task[]): { name: string; qty?: string }[] {
  const have = new Set(shopping.map((t) => shopBaseName(t.text)))
  const out: { name: string; qty?: string }[] = []
  const idx = new Map<string, number>()
  for (const raw of ingredients) {
    const { name, qty } = parseIngredient(raw)
    const base = shopBaseName(name)
    if (!base || have.has(base)) continue
    const i = idx.get(base)
    if (i === undefined) {
      idx.set(base, out.length)
      out.push(qty ? { name: name.trim(), qty } : { name: name.trim() })
    } else {
      const merged = mergeQty(out[i].qty, qty)
      if (merged) out[i].qty = merged
    }
  }
  return out
}
