/** Client für den Cloudflare Worker (API siehe CLAUDE.md §5) */

/** Zeile des Kalender-Kurzbefehls; `date` (YYYY-MM-DD) fehlt beim alten Format ohne Datum (= heute) */
export type RawCalEvent = { date?: string; endDate?: string; time: string; end?: string; text: string; sub?: string; travel?: number }

export class WorkerError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export class WorkerApi {
  private url: string
  private secret: string

  constructor(url: string, secret: string) {
    this.url = url.replace(/\/$/, '')
    this.secret = secret
  }

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(this.url + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'X-Secret': this.secret, ...(init.headers ?? {}) },
    })
    if (!res.ok) throw new WorkerError(res.status, 'Worker antwortet mit ' + res.status)
    return (await res.json()) as T
  }

  ping() {
    return this.req<{ ok: boolean; ts: number }>('/ping')
  }
  getCalendar() {
    return this.req<{ events: RawCalEvent[]; meta?: { updated?: number } }>('/calendar')
  }
  getState() {
    return this.req<{ state: Record<string, unknown> | null; meta?: { updated?: number } }>('/state')
  }
  postState(state: Record<string, unknown>) {
    return this.req<{ ok: boolean }>('/state', { method: 'POST', body: JSON.stringify(state) })
  }
  /** Rezept-Seite über den Worker laden (Browser-CORS umgehen); Zutaten aus schema.org-Recipe, sonst Text */
  fetchPage(url: string) {
    return this.req<{ ok: boolean; status: number; title: string; ingredients?: string[]; text: string }>('/fetch?url=' + encodeURIComponent(url))
  }
  /** Fahrzeit (Auto, Minuten) von Zuhause zum Ort; 0 = unbekannt oder kein Zuhause gespeichert */
  travel(place: string) {
    return this.req<{ minutes: number; reason?: string }>('/travel?place=' + encodeURIComponent(place))
  }
  pushStatus() {
    return this.req<{ subscribed: boolean }>('/push/status')
  }
  pushTest() {
    return this.req<{ ok: boolean; status: number }>('/push/test', { method: 'POST' })
  }
  pushSubscribe(sub: PushSubscriptionJSON) {
    return this.req<{ ok: boolean }>('/push/subscribe', { method: 'POST', body: JSON.stringify(sub) })
  }
  pushUnsubscribe() {
    return this.req<{ ok: boolean }>('/push/unsubscribe', { method: 'POST' })
  }
}
