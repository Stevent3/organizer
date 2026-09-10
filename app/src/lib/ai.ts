import { create } from 'zustand'
import { eventsOnDay } from './calendar'
import { useConfig } from './config'
import { ENERGY_LEVELS, isActive, type AppState, type ListId } from './model'
import { habitsSummary, readHabits } from './habits'
import { addDaysKey, todayKey } from './time'
import { useStore } from '../store/useStore'

/**
 * Groq hat llama-3.3-70b-versatile am 16.08.2026 abgeschaltet. Reihenfolge = Präferenz;
 * bei „model not found/decommissioned" wird automatisch das nächste probiert und gemerkt.
 */
export const GROQ_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant']
export const GROQ_MODEL = GROQ_MODELS[0]
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL_KEY = 'organizer_v8_groq_model'

export function currentModel(): string {
  try {
    const m = localStorage.getItem(MODEL_KEY)
    return m && GROQ_MODELS.includes(m) ? m : GROQ_MODELS[0]
  } catch {
    return GROQ_MODELS[0]
  }
}

export type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } }
export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

/** Sichtbare Chat-Zeile (Tool-Ergebnisse werden als Chips angezeigt) */
export type ChatLine = { id: string; role: 'user' | 'ai' | 'tool' | 'error'; text: string }

type ChatState = {
  history: ChatMessage[]
  lines: ChatLine[]
  busy: boolean
  reset: () => void
}

/** Chat lebt nur im Speicher (wie v7): App-Neustart = frischer Chat */
export const useChat = create<ChatState>()((set) => ({
  history: [],
  lines: [],
  busy: false,
  reset: () => set({ history: [], lines: [] }),
}))

const LIST_LABEL: Record<ListId, string> = { today: 'Heute', work: 'Arbeit', health: 'Gesundheit', shopping: 'Einkauf' }

export function buildContext(s: AppState, now = new Date()): string {
  const day = todayKey()
  const fmt = (list: AppState['tasks'][ListId]) => list.filter((t) => isActive(t, day)).map((t) => t.text).join(', ') || 'keine'
  const evs = (d: string) => eventsOnDay(s.events, d).map((e) => (e.allDay ? 'ganztägig' : e.time + (e.end ? '–' + e.end : '')) + ' ' + e.text + (e.sub ? ' (' + e.sub + ')' : '')).join(', ') || 'leer'
  const meal = todayMeals(s.extra)
  return [
    'Du bist der persönliche KI-Assistent im Organizer von Steven.',
    '',
    'PROFIL:',
    '- Steven, Bachelor-Student (Leuphana Lüneburg), schreibt Thesis über OCR-Systeme für klinische Dokumente (Pneumologie, MHH Hannover)',
    '- Arbeitet nebenbei in einem Tee-Laden mit Kulturraum',
    '- Raum Hannover, Partnerin seit 7 Jahren',
    '- Mag Fantasy (Rothfuss, Tolkien, Tad Williams) und Hörbücher',
    '- Studentisches Budget, kostenbewusst',
    '',
    'AKTUELLER STAND (' + now.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) + ', ' + now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ', heutiges Datum ISO ' + day + '):',
    '- Energie: ' + (s.energy ? s.energy.label + ' (' + s.energy.pct + '%)' : 'nicht gesetzt'),
    '- Termine heute: ' + evs(day),
    '- Termine morgen: ' + evs(addDaysKey(day, 1)),
    '- Offene Aufgaben heute: ' + fmt(s.tasks.today),
    '- Arbeit/Thesis offen: ' + fmt(s.tasks.work),
    '- Gesundheit offen: ' + fmt(s.tasks.health),
    '- Einkaufsliste offen: ' + fmt(s.tasks.shopping),
    '- Essensplan heute: ' + meal,
    '- Gewohnheiten heute: ' + habitsSummary(readHabits(s.extra), day),
    '',
    'Du kannst Aktionen ausführen: Aufgaben/Einkäufe/Termine (auch an anderen Tagen, mehrtägig, ganztägig) anlegen, Aufgaben abhaken, Termine löschen, Energie setzen. Nutze dafür die Tools, wenn Steven darum bittet. Frag nicht unnötig nach, handle direkt und bestätige knapp.',
    'Datumsangaben immer als ISO (YYYY-MM-DD) an Tools übergeben, relative Angaben wie „morgen" oder „Freitag" selbst auflösen.',
    'Antworte kurz, konkret, persönlich und auf Deutsch. Kein Geschwafel.',
  ].join('\n')
}

function todayMeals(extra: Record<string, unknown>): string {
  const mp = extra.mealPlan as { createdAt?: number; days?: { tag?: string; fruehstueck?: { name?: string }; mittag?: { name?: string }; abend?: { name?: string } }[] } | undefined
  if (!mp?.days?.length) return 'keiner'
  const wd = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date().getDay()]
  const d = mp.days.find((x) => (x.tag ?? '').startsWith(wd)) ?? mp.days[0]
  return [d.fruehstueck?.name, d.mittag?.name, d.abend?.name].filter(Boolean).join(' / ') || 'keiner'
}

export const AI_TOOLS = [
  { type: 'function', function: { name: 'add_task', description: 'Fügt eine Aufgabe zu einer Liste hinzu', parameters: { type: 'object', properties: { text: { type: 'string' }, list: { type: 'string', enum: ['today', 'work', 'health'] } }, required: ['text'] } } },
  { type: 'function', function: { name: 'add_shopping_item', description: 'Fügt einen oder mehrere Artikel zur Einkaufsliste hinzu', parameters: { type: 'object', properties: { items: { type: 'array', items: { type: 'string' } } }, required: ['items'] } } },
  { type: 'function', function: { name: 'add_calendar_event', description: 'Trägt einen Termin ein (Datum ISO, Zeit HH:MM; ohne Zeit = ganztägig; end_date für mehrtägig)', parameters: { type: 'object', properties: { title: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD, Standard heute' }, end_date: { type: 'string', description: 'YYYY-MM-DD bei mehrtägigen Terminen' }, time: { type: 'string', description: 'HH:MM' }, end: { type: 'string', description: 'HH:MM' }, location: { type: 'string' } }, required: ['title'] } } },
  { type: 'function', function: { name: 'delete_calendar_event', description: 'Löscht einen Termin (Teiltext des Titels, optional Datum ISO)', parameters: { type: 'object', properties: { title: { type: 'string' }, date: { type: 'string' } }, required: ['title'] } } },
  { type: 'function', function: { name: 'complete_task', description: 'Hakt eine offene Aufgabe ab (Teiltext genügt, sucht in allen Listen)', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } },
  { type: 'function', function: { name: 'set_energy', description: 'Setzt das Energielevel', parameters: { type: 'object', properties: { level: { type: 'string', enum: ['low', 'good', 'top'] } }, required: ['level'] } } },
]

const isTime = (t: unknown): t is string => typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t)
const isDate = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)

/** Führt ein Tool gegen den Store aus und liefert eine knappe Bestätigung für Modell und UI */
export function executeTool(name: string, args: Record<string, unknown>): string {
  const st = useStore.getState()
  try {
    if (name === 'add_task') {
      const list = (['today', 'work', 'health'] as const).find((l) => l === args.list) ?? 'today'
      const text = String(args.text ?? '').trim()
      if (!text) return 'Kein Text angegeben.'
      st.addTask(list, text)
      return 'Aufgabe „' + text + '" zu ' + LIST_LABEL[list] + ' hinzugefügt.'
    }
    if (name === 'add_shopping_item') {
      const items = (Array.isArray(args.items) ? args.items : [args.text]).map((x) => String(x ?? '').trim()).filter(Boolean)
      if (!items.length) return 'Keine Artikel angegeben.'
      const have = new Set(st.tasks.shopping.map((t) => t.text.toLowerCase()))
      const added = items.filter((i) => !have.has(i.toLowerCase()))
      for (const i of added) st.addTask('shopping', i.charAt(0).toUpperCase() + i.slice(1))
      return added.length ? added.join(', ') + ' auf die Einkaufsliste gesetzt.' : 'Steht schon alles auf der Liste.'
    }
    if (name === 'add_calendar_event') {
      const title = String(args.title ?? '').trim()
      if (!title) return 'Kein Titel angegeben.'
      const date = isDate(args.date) ? args.date : todayKey()
      const time = isTime(args.time) ? args.time.padStart(5, '0') : undefined
      const end = isTime(args.end) ? args.end.padStart(5, '0') : undefined
      const endDate = isDate(args.end_date) && args.end_date > date ? args.end_date : undefined
      st.addEvent({ date, endDate, allDay: !time, time, end, text: title, sub: args.location ? String(args.location) : undefined, color: 'accent', source: 'manual' })
      return 'Termin „' + title + '" am ' + date + (time ? ' um ' + time : ' (ganztägig)') + (endDate ? ' bis ' + endDate : '') + ' eingetragen.'
    }
    if (name === 'delete_calendar_event') {
      const q = String(args.title ?? '').toLowerCase()
      const date = isDate(args.date) ? args.date : undefined
      const ev = st.events.find((e) => e.text.toLowerCase().includes(q) && (!date || e.date === date))
      if (!ev) return 'Keinen passenden Termin gefunden.'
      st.deleteEvent(ev.id)
      return 'Termin „' + ev.text + '" gelöscht.'
    }
    if (name === 'complete_task') {
      const q = String(args.text ?? '').toLowerCase()
      for (const list of ['today', 'work', 'health', 'shopping'] as ListId[]) {
        const t = st.tasks[list].find((x) => !x.done && x.text.toLowerCase().includes(q))
        if (t) { st.toggleTask(list, t.id); return '„' + t.text + '" abgehakt.' }
      }
      return 'Keine passende offene Aufgabe gefunden.'
    }
    if (name === 'set_energy') {
      const l = ENERGY_LEVELS.find((x) => x.level === args.level)
      if (!l) return 'Unbekanntes Level.'
      st.setEnergy({ level: l.level, label: l.label, pct: l.pct })
      return 'Energie auf ' + l.label + ' gesetzt.'
    }
  } catch (e) {
    return 'Fehler: ' + (e instanceof Error ? e.message : String(e))
  }
  return 'Unbekanntes Tool.'
}

export class GroqError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type GroqResponse = { choices: { message: { content: string | null; tool_calls?: ToolCall[] } }[] }

type GroqOptions = { tools?: boolean; json?: boolean; maxTokens?: number; temperature?: number }

async function groqCall(key: string, messages: ChatMessage[], opts: GroqOptions = {}): Promise<GroqResponse> {
  let model = currentModel()
  for (let attempt = 0; attempt < GROQ_MODELS.length; attempt++) {
    const body: Record<string, unknown> = { model, messages, max_tokens: opts.maxTokens ?? 900, temperature: opts.temperature ?? 0.7 }
    if (opts.tools) { body.tools = AI_TOOLS; body.tool_choice = 'auto' }
    if (opts.json) body.response_format = { type: 'json_object' }
    const res = await fetch(GROQ_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify(body) })
    if (res.ok) {
      try { localStorage.setItem(MODEL_KEY, model) } catch { /* egal */ }
      return (await res.json()) as GroqResponse
    }
    const text = (await res.text()).slice(0, 300)
    const modelGone = (res.status === 400 || res.status === 404) && /model|decommission|not found|does not exist/i.test(text)
    const next = GROQ_MODELS[GROQ_MODELS.indexOf(model) + 1]
    if (modelGone && next) { model = next; continue }
    throw new GroqError(res.status, text)
  }
  throw new GroqError(0, 'Kein Modell verfügbar')
}

let seq = 0
const line = (role: ChatLine['role'], text: string): ChatLine => ({ id: 'l' + Date.now() + '-' + seq++, role, text })

/** Nachricht senden: Kontext + Verlauf an Groq, Tool-Calls ausführen, Antwort anhängen */
export async function sendChat(text: string): Promise<void> {
  const t = text.trim()
  if (!t || useChat.getState().busy) return
  const key = useConfig.getState().groqKey
  useChat.setState((c) => ({ busy: true, history: [...c.history, { role: 'user', content: t }], lines: [...c.lines, line('user', t)] }))
  if (!key) {
    useChat.setState((c) => ({ busy: false, lines: [...c.lines, line('error', 'Kein Groq-Key hinterlegt. Unter „Mehr" eintragen, dann antworte ich richtig.')] }))
    return
  }
  try {
    const sys: ChatMessage = { role: 'system', content: buildContext(useStore.getState().snapshot()) }
    const msgs: ChatMessage[] = [sys, ...useChat.getState().history.slice(-12)]
    let data = await groqCall(key, msgs, { tools: true })
    let msg = data.choices[0].message
    if (msg.tool_calls?.length) {
      const assistant: ChatMessage = { role: 'assistant', content: msg.content ?? '', tool_calls: msg.tool_calls }
      msgs.push(assistant)
      useChat.setState((c) => ({ history: [...c.history, assistant] }))
      for (const tc of msg.tool_calls) {
        let args: Record<string, unknown> = {}
        try { args = JSON.parse(tc.function.arguments || '{}') } catch { /* leer */ }
        const result = executeTool(tc.function.name, args)
        const toolMsg: ChatMessage = { role: 'tool', tool_call_id: tc.id, content: result }
        msgs.push(toolMsg)
        useChat.setState((c) => ({ history: [...c.history, toolMsg], lines: [...c.lines, line('tool', result)] }))
      }
      data = await groqCall(key, msgs)
      msg = data.choices[0].message
    }
    const reply = msg.content?.trim() || 'Erledigt.'
    useChat.setState((c) => ({ busy: false, history: [...c.history, { role: 'assistant', content: reply }], lines: [...c.lines, line('ai', reply)] }))
  } catch (e) {
    useChat.setState((c) => ({ busy: false, lines: [...c.lines, line('error', describeError(e))] }))
  }
}

/** Fehler aus Groq/Netz als verständlicher deutscher Satz */
export function describeError(e: unknown): string {
  if (e instanceof GroqError) {
    let detail = e.message
    try { detail = (JSON.parse(e.message) as { error?: { message?: string } }).error?.message ?? e.message } catch { /* Rohtext */ }
    return e.status === 0 ? detail
      : e.status === 401 ? 'Groq-Key ungültig. Bitte unter „Mehr" neu eintragen.'
      : e.status === 429 ? 'Groq ist gerade ausgelastet. Gleich nochmal.'
      : 'Groq meldet ' + e.status + ': ' + detail.slice(0, 160)
  }
  let txt = 'Verbindung fehlgeschlagen. Versuch es nochmal.'
  if (e instanceof Error && e.message) txt += ' (' + e.message.slice(0, 80) + ')'
  return txt
}

/**
 * Strukturierte Antwort (JSON-Objekt) von Groq – für Tagesplan und Essensplan.
 * Nimmt den Schlüssel aus der Konfiguration; ohne Schlüssel wird eine GroqError(0) geworfen.
 */
export async function groqJson(system: string, user: string, opts: Omit<GroqOptions, 'json' | 'tools'> = {}): Promise<string> {
  return groqText(system, user, { ...opts, json: true })
}

/** Freitext-Antwort (z. B. Rezept). Nimmt den Schlüssel aus der Konfiguration; ohne Schlüssel GroqError(0). */
export async function groqText(system: string, user: string, opts: Omit<GroqOptions, 'tools'> = {}): Promise<string> {
  const key = useConfig.getState().groqKey
  if (!key) throw new GroqError(0, 'Kein Groq-Key hinterlegt. Unter „Mehr" eintragen.')
  const data = await groqCall(key, [{ role: 'system', content: system }, { role: 'user', content: user }], opts)
  return data.choices[0]?.message.content ?? ''
}
