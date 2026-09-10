/**
 * Tests für die reine Logik des Cloudflare Workers (worker.js im Repo-Root):
 * Abend-Review, Wetter-Zeile, offene To-dos mit `until`, Kalender-Parser, Overrides –
 * plus ein Cron-Durchlauf (runChecks) mit Fake-KV, echten Push-Schlüsseln und gemocktem fetch.
 * Die Push-Krypto (encryptPayload, vapidJwt, sendPush) wird dabei unverändert mit durchlaufen.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyOverrides, buildReviewText, calKey, calendarForDay, openTodayTasks, parseLines, parseStamp, runChecks, weatherLine, type KvLike, type WorkerEnv } from '../../../worker.js'

const DAY = '2026-09-10'

describe('openTodayTasks', () => {
  it('zählt nur Unerledigtes, das nicht zurückgestellt ist', () => {
    const state = {
      tasks: {
        today: [
          { text: 'Müll raus' },
          { text: 'Erledigt', done: true },
          { text: 'Morgen', until: '2026-09-11' },
          { text: 'Irgendwann', until: '9999-12-31' },
          { text: 'Fällig heute', until: DAY },
          { text: 'Überfällig', until: '2026-09-01' },
        ],
      },
    }
    expect(openTodayTasks(state, DAY).map((t) => t.text)).toEqual(['Müll raus', 'Fällig heute', 'Überfällig'])
    expect(openTodayTasks({}, DAY)).toEqual([])
  })
})

describe('buildReviewText', () => {
  it('formuliert „3/5 geschafft" mit den offenen Titeln', () => {
    const state = {
      tasks: {
        today: [
          { text: 'A', done: true },
          { text: 'B', done: true },
          { text: 'C', done: true },
          { text: 'Wäsche' },
          { text: 'Thesis Kapitel 3' },
          { text: 'Zurückgestellt', until: '2026-09-12' },
        ],
      },
    }
    const r = buildReviewText(state, DAY)
    expect(r?.title).toBe('🌙 Tagesabschluss')
    expect(r?.body).toBe('3/5 geschafft. Offen: Wäsche, Thesis Kapitel 3. Rest auf morgen?')
  })

  it('kürzt bei mehr als drei offenen To-dos', () => {
    const state = { tasks: { today: ['a', 'b', 'c', 'd'].map((text) => ({ text })) } }
    expect(buildReviewText(state, DAY)?.body).toBe('0/4 geschafft. Offen: a, b, c, …. Rest auf morgen?')
  })

  it('lobt, wenn alles erledigt ist', () => {
    expect(buildReviewText({ tasks: { today: [{ text: 'A', done: true }, { text: 'B', done: true }] } }, DAY)?.body).toMatch(/Alle 2 To-dos geschafft/)
    expect(buildReviewText({ tasks: { today: [{ text: 'A', done: true }] } }, DAY)?.body).toMatch(/Dein To-do ist erledigt/)
  })

  it('schweigt ohne To-dos, bei nur Zurückgestelltem und nach dem Tagesabschluss in der App', () => {
    expect(buildReviewText({}, DAY)).toBeNull()
    expect(buildReviewText({ tasks: { today: [] } }, DAY)).toBeNull()
    expect(buildReviewText({ tasks: { today: [{ text: 'Später', until: '9999-12-31' }] } }, DAY)).toBeNull()
    expect(buildReviewText({ tasks: { today: [{ text: 'Offen' }] }, dayClosed: DAY }, DAY)).toBeNull()
    // Ein alter Tagesabschluss zählt nicht
    expect(buildReviewText({ tasks: { today: [{ text: 'Offen' }] }, dayClosed: '2026-09-09' }, DAY)).not.toBeNull()
  })
})

describe('weatherLine', () => {
  const daily = (over: Record<string, unknown[]> = {}) => ({
    daily: { time: [DAY], weather_code: [80], temperature_2m_max: [19.4], temperature_2m_min: [11.6], precipitation_probability_max: [60], ...over },
  })
  it('baut Emoji, Text, Spanne und Regen', () => {
    expect(weatherLine(daily())).toBe('🌦️ Schauer, 12–19 °C, Regen 60 %')
  })
  it('lässt geringe Regenwahrscheinlichkeit weg', () => {
    expect(weatherLine(daily({ weather_code: [0], precipitation_probability_max: [10] }))).toBe('☀️ Klar, 12–19 °C')
    expect(weatherLine(daily({ weather_code: [3], precipitation_probability_max: [] }))).toBe('☁️ Bedeckt, 12–19 °C')
  })
  it('liefert leer bei unbrauchbarer Antwort', () => {
    expect(weatherLine(null)).toBe('')
    expect(weatherLine({})).toBe('')
    expect(weatherLine({ daily: { weather_code: [1] } })).toBe('')
    expect(weatherLine({ error: true, reason: 'x' })).toBe('')
  })
})

describe('parseLines + applyOverrides (Bestand)', () => {
  it('parst das Shortcut-Zeilenformat mit optionalen Feldern und dedupliziert', () => {
    const evs = parseLines('08:00 | 09:30 | Zahnarzt | Praxis | 23 Min.\n12:00 | Mittag\n08:00 | 09:30 | zahnarzt | Praxis\n\n')
    expect(evs).toEqual([
      { time: '08:00', end: '09:30', text: 'Zahnarzt', sub: 'Praxis', travel: 23 },
      { time: '12:00', end: '', text: 'Mittag', sub: '', travel: 0 },
    ])
  })
  it('wendet Verschiebung, Umbenennung und Löschung an', () => {
    const cal = [{ time: '08:00', text: 'Uni' }, { time: '10:00', text: 'Weg' }]
    const out = applyOverrides(cal, { '08:00|uni': { time: '09:00', text: 'Uni (verschoben)' }, '10:00|weg': { deleted: true } })
    expect(out).toEqual([{ time: '09:00', end: '', text: 'Uni (verschoben)', sub: '' }])
  })
})

describe('Zeilenformat mit Datum (mehrere Tage)', () => {
  it('parst das Datum vorne (deutsch oder ISO) und lässt es bei alten Zeilen weg', () => {
    const evs = parseLines('12.09.2026 | 08:00 | 09:30 | Uni | Leuphana\n2026-09-13 | 18:00 | Schicht\n1.9.2026 | 07:15 | Früh\n12:00 | Mittag')
    expect(evs).toEqual([
      { date: '2026-09-12', time: '08:00', end: '09:30', text: 'Uni', sub: 'Leuphana', travel: 0 },
      { date: '2026-09-13', time: '18:00', end: '', text: 'Schicht', sub: '', travel: 0 },
      { date: '2026-09-01', time: '07:15', end: '', text: 'Früh', sub: '', travel: 0 },
      { time: '12:00', end: '', text: 'Mittag', sub: '', travel: 0 },
    ])
  })
  it('versteht unformatierte Datumsvariablen aus Kurzbefehlen (Datum und Uhrzeit in einem Feld)', () => {
    const evs = parseLines('10.09.2026, 08:00 | 10.09.2026, 09:30 | Uni | Leuphana\n10.09.26, 8:00 | Frühstück\n2026-09-11 18:00 | 2026-09-11 22:00 | Schicht\n08:00:00 | 09:00:00 | Alt')
    expect(evs).toEqual([
      { date: '2026-09-10', time: '08:00', end: '09:30', text: 'Uni', sub: 'Leuphana', travel: 0 },
      { date: '2026-09-10', time: '08:00', end: '', text: 'Frühstück', sub: '', travel: 0 },
      { date: '2026-09-11', time: '18:00', end: '22:00', text: 'Schicht', sub: '', travel: 0 },
      { time: '08:00', end: '09:00', text: 'Alt', sub: '', travel: 0 },
    ])
  })

  it('erkennt Zeitstempel in allen Schreibweisen der Kurzbefehle-App', () => {
    expect(parseStamp('10.09.2026, 08:00')).toEqual({ date: '2026-09-10', time: '08:00' })
    expect(parseStamp('10.09.26 um 8:00')).toEqual({ date: '2026-09-10', time: '08:00' })
    expect(parseStamp('Do., 10.09.2026 08:00 Uhr')).toEqual({ date: '2026-09-10', time: '08:00' })
    expect(parseStamp('2026-09-10T08:00')).toEqual({ date: '2026-09-10', time: '08:00' })
    expect(parseStamp('08:00:00')).toEqual({ date: '', time: '08:00' })
    expect(parseStamp('10.09.2026')).toEqual({ date: '2026-09-10', time: '' })
    expect(parseStamp('Uni')).toBeNull()
    expect(parseStamp('Meeting um 10:30')).toBeNull()
    expect(parseStamp('')).toBeNull()
  })
  it('parst Zeilen mit „um" und Wochentag, nur Datum wird ganztägig', () => {
    const evs = parseLines('10.09.2026 um 08:00 | 10.09.2026 um 09:30 | Uni | Leuphana\nDo., 11.09.2026 | Urlaub\n12:00 | Mittag um 13:00 | Kantine')
    expect(evs).toEqual([
      { date: '2026-09-10', time: '08:00', end: '09:30', text: 'Uni', sub: 'Leuphana', travel: 0 },
      { date: '2026-09-11', time: '', end: '', text: 'Urlaub', sub: '', travel: 0 },
      { time: '12:00', end: '', text: 'Mittag um 13:00', sub: 'Kantine', travel: 0 },
    ])
  })
  it('dedupliziert nur innerhalb eines Tages und verwirft Zeilen ohne Uhrzeit', () => {
    const evs = parseLines('12.09.2026 | 08:00 | Uni\n13.09.2026 | 08:00 | Uni\n12.09.2026 | 08:00 | uni\n12.09.2026 | Ganztags\nkein Termin')
    expect(evs.map((e) => e.date + ' ' + e.time)).toEqual(['2026-09-12 08:00', '2026-09-13 08:00', '2026-09-12 '])
  })
  it('bildet den Override-Schlüssel mit Datum, ohne Datum wie bisher', () => {
    expect(calKey({ date: '2026-09-12', time: '08:00', text: 'Uni' })).toBe('2026-09-12|08:00|uni')
    expect(calKey({ time: '08:00', text: 'Uni' })).toBe('08:00|uni')
  })
  it('wendet Overrides mit Datum an, auch Verschiebung auf einen anderen Tag', () => {
    const cal = [{ date: '2026-09-12', time: '08:00', text: 'Uni' }, { date: '2026-09-13', time: '18:00', text: 'Schicht' }, { time: '12:00', text: 'Mittag' }]
    const out = applyOverrides(cal, {
      '2026-09-12|08:00|uni': { date: '2026-09-10', time: '09:00' },
      '2026-09-13|18:00|schicht': { deleted: true },
      '12:00|mittag': { text: 'Mittag (Kantine)' },
    })
    expect(out).toEqual([
      { date: '2026-09-10', time: '09:00', end: '', text: 'Uni', sub: '' },
      { time: '12:00', end: '', text: 'Mittag (Kantine)', sub: '' },
    ])
    expect(calendarForDay(out, '2026-09-10').map((e) => e.text)).toEqual(['Uni', 'Mittag (Kantine)'])
    // Zeilen ohne Datum gelten für jeden abgefragten Tag als „heute" (altes Kurzbefehl-Format)
    expect(calendarForDay(out, '2026-09-12').map((e) => e.text)).toEqual(['Mittag (Kantine)'])
  })
})

// ── Cron-Durchlauf ────────────────────────────────────────────────────────────
function fakeKv(initial: Record<string, unknown>): KvLike & { store: Map<string, string> } {
  const store = new Map<string, string>(Object.entries(initial).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]))
  return {
    store,
    async get(key, type) {
      const v = store.get(key)
      if (v === undefined) return null
      return type === 'json' ? JSON.parse(v) : v
    },
    async put(key, value) {
      store.set(key, value)
    },
    async delete(key) {
      store.delete(key)
    },
  }
}

const b64url = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function makeEnv(state: unknown, kvExtra: Record<string, unknown> = {}) {
  const subKey = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const vapid = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const sub = {
    endpoint: 'https://web.push.apple.com/QAbc123',
    keys: { p256dh: b64url(await crypto.subtle.exportKey('raw', subKey.publicKey)), auth: b64url(crypto.getRandomValues(new Uint8Array(16))) },
  }
  const env: WorkerEnv = {
    KV: fakeKv({ push_sub: sub, state, calendar: [], ...kvExtra }),
    VAPID_PUBLIC: b64url(await crypto.subtle.exportKey('raw', vapid.publicKey)),
    VAPID_SUBJECT: 'mailto:test@example.com',
    VAPID_PRIVATE_JWK: JSON.stringify(await crypto.subtle.exportKey('jwk', vapid.privateKey)),
  }
  return { env, sub, kv: env.KV as ReturnType<typeof fakeKv> }
}

/** Berlin-Zeit (CEST, UTC+2 im September) → Systemzeit setzen */
function atBerlin(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  vi.setSystemTime(new Date(Date.UTC(2026, 8, 10, h - 2, m)))
}

describe('runChecks (Cron)', () => {
  const calls: { url: string; init?: RequestInit }[] = []
  beforeEach(() => {
    calls.length = 0
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const u = String(url)
        calls.push({ url: u, init })
        if (u.startsWith('https://api.open-meteo.com/')) {
          return new Response(JSON.stringify({ daily: { weather_code: [61], temperature_2m_max: [15.2], temperature_2m_min: [8.8], precipitation_probability_max: [85] } }), { status: 200 })
        }
        return new Response('', { status: 201 })
      }),
    )
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  const pushCalls = () => calls.filter((c) => c.url.startsWith('https://web.push.apple.com/'))

  it('schickt um 21:05 genau einen Abend-Review-Push und merkt sich das', async () => {
    atBerlin('21:05')
    const { env, kv } = await makeEnv({ tasks: { today: [{ text: 'A', done: true }, { text: 'B' }] } })
    await runChecks(env)
    expect(pushCalls()).toHaveLength(1)
    const req = pushCalls()[0].init!
    expect(req.method).toBe('POST')
    expect((req.headers as Record<string, string>)['Content-Encoding']).toBe('aes128gcm')
    expect((req.headers as Record<string, string>).Authorization).toMatch(/^vapid t=.+, k=.+/)
    expect(kv.store.get(`sent:review:${DAY}`)).toBe('1')

    await runChecks(env)
    expect(pushCalls()).toHaveLength(1)
  })

  it('markiert den Review ohne Push, wenn der Tag in der App schon abgeschlossen ist', async () => {
    atBerlin('21:10')
    const { env, kv } = await makeEnv({ tasks: { today: [{ text: 'B' }] }, dayClosed: DAY })
    await runChecks(env)
    expect(pushCalls()).toHaveLength(0)
    expect(kv.store.get(`sent:review:${DAY}`)).toBe('1')
  })

  it('macht außerhalb der Fenster nichts', async () => {
    atBerlin('20:50')
    const { env, kv } = await makeEnv({ tasks: { today: [{ text: 'B' }] } })
    await runChecks(env)
    expect(calls).toHaveLength(0)
    expect(kv.store.has(`sent:review:${DAY}`)).toBe(false)
  })

  it('holt fürs Morgen-Briefing das Wetter und pusht einmal', async () => {
    atBerlin('06:10')
    const { env, kv } = await makeEnv({ tasks: { today: [{ text: 'Wäsche' }] } })
    await runChecks(env)
    expect(calls.filter((c) => c.url.startsWith('https://api.open-meteo.com/'))).toHaveLength(1)
    expect(calls.some((c) => c.url.includes('groq.com'))).toBe(false)
    expect(pushCalls()).toHaveLength(1)
    expect(kv.store.get(`sent:brief:${DAY}`)).toBe('1')
    await runChecks(env)
    expect(pushCalls()).toHaveLength(1)
  })

  it('pusht das Briefing auch, wenn Open-Meteo nicht antwortet', async () => {
    atBerlin('06:00')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), init })
        if (String(url).startsWith('https://api.open-meteo.com/')) throw new Error('offline')
        return new Response('', { status: 201 })
      }),
    )
    const { env } = await makeEnv({ tasks: { today: [] } })
    await runChecks(env)
    expect(pushCalls()).toHaveLength(1)
  })

  it('erinnert an die Abfahrt nur für heutige Termine', async () => {
    atBerlin('08:00')
    const calendar = [
      { date: DAY, time: '08:30', text: 'Heute' },
      { date: '2026-09-11', time: '08:30', text: 'Morgen' },
      { time: '08:30', text: 'Ohne Datum' },
    ]
    const { env, kv } = await makeEnv({ tasks: { today: [] } }, { calendar })
    await runChecks(env)
    expect(pushCalls()).toHaveLength(2)
    expect([...kv.store.keys()].filter((k) => k.startsWith('sent:dep:')).sort()).toEqual([`sent:dep:${DAY}:08:30:Heute`, `sent:dep:${DAY}:08:30:Ohne Datum`])
  })

  it('tut ohne Push-Abo gar nichts', async () => {
    atBerlin('21:05')
    const env = { ...(await makeEnv({ tasks: { today: [{ text: 'B' }] } })).env, KV: fakeKv({ state: { tasks: { today: [{ text: 'B' }] } } }) }
    await runChecks(env)
    expect(calls).toHaveLength(0)
  })
})
