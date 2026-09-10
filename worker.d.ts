// Typen für die Test-Exporte von worker.js (app/src/test/worker.test.ts). Der Worker selbst ist reines JS.
export type WorkerTask = { id?: string; text: string; done?: boolean; until?: string }
export type WorkerState = { tasks?: { today?: WorkerTask[] }; dayClosed?: string; calOverrides?: Record<string, unknown>; work?: { keyword?: string; rate?: number }; home?: { name?: string; lat: number; lon: number } }
export type CalEvent = { date?: string; endDate?: string; time: string; end?: string; text: string; sub?: string; travel?: number }
export type KvLike = {
  get(key: string, type?: 'json' | 'text'): Promise<unknown>
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}
export type WorkerEnv = { KV: KvLike; VAPID_PUBLIC: string; VAPID_SUBJECT: string; VAPID_PRIVATE_JWK: string; SECRET?: string; GROQ_KEY?: string }

export function runChecks(env: WorkerEnv): Promise<void>
export function applyOverrides(rawCal: CalEvent[], overrides: Record<string, Partial<CalEvent> & { deleted?: boolean }>): CalEvent[]
export function calendarForDay(cal: CalEvent[], day: string): CalEvent[]
export function calKey(e: Pick<CalEvent, 'date' | 'time' | 'text'>): string
export function parseLines(text: string): CalEvent[]
export function parseStamp(s: string): { date: string; time: string } | null
export function openTodayTasks(state: WorkerState, today: string): WorkerTask[]
export function buildReviewText(state: WorkerState, today: string, tomorrowBirthdays?: string[]): { title: string; body: string } | null
export function buildWeekPreview(cal: CalEvent[], state: WorkerState, monday: string): { title: string; body: string } | null
export function birthdayNames(cal: Pick<CalEvent, 'text'>[]): string[]
export function travelMinutes(env: WorkerEnv, home: { lat: number; lon: number }, place: string): Promise<number>
export function weatherLine(data: unknown): string
export function toMin(t: string): number

declare const worker: { fetch(request: Request, env: WorkerEnv): Promise<Response>; scheduled(event: unknown, env: WorkerEnv, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<void> }
export default worker
