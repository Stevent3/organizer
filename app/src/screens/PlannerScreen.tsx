import { BookOpen, CalendarPlus, Check, Dices, RefreshCw, ShoppingCart, Sparkles, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, SectionLabel } from '../components/Card'
import { Screen } from '../components/Screen'
import { Segmented } from '../components/Segmented'
import { Sheet } from '../components/Sheet'
import { describeError, groqJson, groqText } from '../lib/ai'
import { colorVar } from '../lib/colors'
import { useConfig } from '../lib/config'
import {
  FOOD_Q, MEAL_PLAN_SYSTEM, MEAL_SLOTS, PLAN_COLOR, PLAN_ICON, RECIPE_SYSTEM, REROLL_SYSTEM, dayPlanPrompt, recipeUserPrompt, foodProfileText, newIngredients, normMeal,
  normalizeDayPlan, normalizeMealPlan, parseJsonObject, planToEvents, readDayPlan, readFoodProfile, readMealPlan, rerollUserPrompt, todayMealIndex,
  type FoodKey, type FoodProfile, type MealPlan, type MealSlot,
} from '../lib/planner'
import { mealPlanIngredients, shopInfo } from '../lib/shopping'
import { todayKey } from '../lib/time'
import { useStore } from '../store/useStore'

type Mode = 'day' | 'food'
const MODE_KEY = 'organizer_v8_planner_mode'

const btnPrimary = 'press flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-3 text-[15px] font-semibold text-on-accent disabled:opacity-60'
const btnSoft = 'press flex w-full items-center justify-center gap-2 rounded-md bg-accent-soft px-3 py-3 text-[15px] font-semibold text-accent disabled:opacity-60'
const btnFill = 'press flex w-full items-center justify-center gap-2 rounded-md bg-fill px-3 py-3 text-[15px] font-semibold text-text-2'
const input = 'w-full rounded-md bg-fill px-3 py-2.5 text-[15px] outline-none placeholder:text-text-3'

export function PlannerScreen() {
  const [mode, setModeState] = useState<Mode>(() => {
    try { return localStorage.getItem(MODE_KEY) === 'food' ? 'food' : 'day' } catch { return 'day' }
  })
  const setMode = (m: Mode) => {
    setModeState(m)
    try { localStorage.setItem(MODE_KEY, m) } catch { /* egal */ }
  }
  return (
    <Screen title="Planer" subtitle="Dein KI-Coach">
      <Segmented options={[{ id: 'day', label: '🗺 Tag' }, { id: 'food', label: '🍽 Essen' }]} value={mode} onChange={setMode} />
      {mode === 'day' ? <DayPlanView /> : <FoodView />}
    </Screen>
  )
}

function useFlash() {
  const [msg, setMsg] = useState<string | null>(null)
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2500) }
  return { msg, flash }
}

function Flash({ msg, tone = 'ok' }: { msg: string | null; tone?: 'ok' | 'error' }) {
  if (!msg) return null
  return <p className={'mt-3 rounded-md px-3 py-2 text-center text-[13px] font-medium ' + (tone === 'ok' ? 'bg-accent-soft text-accent' : 'bg-red/10 text-red')}>{msg}</p>
}

function NoKeyHint() {
  return (
    <Card tone="soft" className="mt-3">
      <p className="text-[15px] font-semibold text-accent">Kein Groq-Key hinterlegt</p>
      <p className="mt-1 text-[13px] text-text-2">Unter „Mehr" den Groq-Key eintragen, dann plant die KI hier deinen Tag und deine Woche.</p>
    </Card>
  )
}

const fmtClock = (ts: number) => new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

// ── Tagesplan ────────────────────────────────────────────────

function DayPlanView() {
  const extra = useStore((s) => s.extra)
  const events = useStore((s) => s.events)
  const setExtra = useStore((s) => s.setExtra)
  const addEvent = useStore((s) => s.addEvent)
  const hasKey = useConfig((c) => !!c.groqKey)
  const plan = useMemo(() => readDayPlan(extra), [extra])
  const toAdd = useMemo(() => (plan ? planToEvents(plan, events) : []), [plan, events])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const { msg, flash } = useFlash()
  const stale = !!plan && plan.date !== todayKey()

  const generate = async () => {
    setBusy(true); setError(null)
    try {
      const { system, user } = dayPlanPrompt(useStore.getState().snapshot())
      const text = await groqJson(system, user, { maxTokens: 1100, temperature: 0.6 })
      setExtra({ dayPlan: normalizeDayPlan(parseJsonObject(text)) })
      flash('Plan erstellt ✨')
    } catch (e) {
      setError(describeError(e))
    }
    setBusy(false)
  }

  const apply = () => {
    if (!plan) return
    for (const ev of toAdd) addEvent(ev)
    setExtra({ dayPlan: { ...plan, appliedAt: Date.now() } })
    setConfirm(false)
    flash(toAdd.length + ' Termin' + (toAdd.length === 1 ? '' : 'e') + ' in den Kalender übernommen')
  }

  return (
    <>
      <div className="mt-3">
        {!hasKey && <NoKeyHint />}
        <button onClick={generate} disabled={busy || !hasKey} className={btnPrimary}>
          {busy ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {busy ? 'Plane …' : plan ? 'Neu planen' : 'Meinen Tag planen'}
        </button>
        <p className="mt-2 px-2 text-center text-[12px] text-text-3">
          {plan?.generatedAt ? 'Erstellt um ' + fmtClock(plan.generatedAt) + (stale ? ' (veraltet, von ' + plan.date + ')' : '') : 'Erstellt aus Kalender, Aufgaben & Energie einen optimierten Ablauf.'}
        </p>
        <Flash msg={error} tone="error" />
        <Flash msg={msg} />
      </div>

      {!plan && (
        <Card className="mt-4 text-center">
          <p className="text-[15px] text-text-2">Noch kein Plan für heute.</p>
          <p className="mt-1 text-[13px] text-text-3">Tipp oben auf „Meinen Tag planen".</p>
        </Card>
      )}

      {plan && (
        <>
          {plan.summary && (
            <Card tone="accent" className="mt-4">
              <p className="text-[15px] font-medium leading-snug">{plan.summary}</p>
            </Card>
          )}
          <SectionLabel>Ablauf · {plan.blocks.length} Blöcke</SectionLabel>
          <Card className="p-0">
            {plan.blocks.map((b, i) => {
              const c = colorVar(PLAN_COLOR[b.type] ?? 'accent')
              return (
                <div key={i} className={'flex gap-3 px-3 py-2 ' + (i ? 'border-t border-line' : '')}>
                  <div className="w-[84px] shrink-0 pt-2 text-[12px] tabular-nums text-text-3">{b.time}{b.end ? '–' + b.end : ''}</div>
                  <div className="flex-1 rounded-sm py-1.5 pl-3 pr-2" style={{ borderLeft: '3px solid ' + c, background: 'color-mix(in srgb, ' + c + ' 10%, transparent)' }}>
                    <p className="text-[14px] font-semibold" style={{ color: c }}>{PLAN_ICON[b.type] ?? '•'} {b.title}</p>
                    {b.note && <p className="mt-0.5 text-[12px] text-text-2">{b.note}</p>}
                  </div>
                </div>
              )
            })}
          </Card>

          <div className="mt-4">
            {toAdd.length > 0 ? (
              <button onClick={() => setConfirm(true)} className={btnSoft}>
                <CalendarPlus size={18} /> Plan übernehmen · {toAdd.length} Termin{toAdd.length === 1 ? '' : 'e'}
              </button>
            ) : (
              <p className="flex items-center justify-center gap-1.5 py-2 text-center text-[13px] font-medium text-green">
                <Check size={16} strokeWidth={2.5} /> Alle Blöcke stehen im Kalender{plan.appliedAt ? ' · übernommen um ' + fmtClock(plan.appliedAt) : ''}
              </p>
            )}
            <p className="mt-2 px-2 text-center text-[12px] text-text-3">Fixtermine und freie Zeit bleiben außen vor, schon vorhandene Termine werden nicht doppelt angelegt.</p>
          </div>

          <Sheet open={confirm} onClose={() => setConfirm(false)} title="Plan übernehmen">
            <p className="text-[13px] text-text-2">Diese Blöcke werden als Termine am {plan.date || todayKey()} eingetragen:</p>
            <ul className="mt-3 divide-y divide-line rounded-md bg-fill">
              {toAdd.map((e, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorVar(e.color) }} />
                  <span className="w-[84px] shrink-0 text-[13px] tabular-nums text-text-2">{e.time}{e.end ? '–' + e.end : ''}</span>
                  <span className="flex-1 text-[14px] font-medium">{e.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirm(false)} className={btnFill}>Abbrechen</button>
              <button onClick={apply} className={btnPrimary}><CalendarPlus size={18} /> Übernehmen</button>
            </div>
          </Sheet>
        </>
      )}
    </>
  )
}

// ── Essensplaner ─────────────────────────────────────────────

function FoodView() {
  const extra = useStore((s) => s.extra)
  const profile = useMemo(() => readFoodProfile(extra), [extra])
  const [editingProfile, setEditingProfile] = useState(false)
  if (!profile || editingProfile) return <FoodInterview existing={profile} onDone={() => setEditingProfile(false)} onCancel={profile ? () => setEditingProfile(false) : undefined} />
  return <MealPlanView profile={profile} onEditProfile={() => setEditingProfile(true)} />
}

function FoodInterview({ existing, onDone, onCancel }: { existing: FoodProfile | null; onDone: () => void; onCancel?: () => void }) {
  const setExtra = useStore((s) => s.setExtra)
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Partial<Record<FoodKey, string>>>({})
  const [free, setFree] = useState('')
  const [hint, setHint] = useState<string | null>(null)
  const q = FOOD_Q[idx]

  const answer = (val: string) => {
    const v = val.trim()
    if (!v) { setHint('Tipp etwas ein oder wähl einen Chip'); return }
    const next = { ...answers, [q.k]: v }
    setHint(null); setFree('')
    if (idx + 1 >= FOOD_Q.length) {
      setExtra({ foodProfile: { ...next, updatedAt: Date.now() } })
      onDone()
    } else {
      setAnswers(next)
      setIdx(idx + 1)
    }
  }
  const back = () => { if (idx > 0) { setIdx(idx - 1); setFree('') } }

  return (
    <div className="mt-3">
      {idx === 0 && (
        <Card tone="accent" className="mb-3">
          <p className="text-[14px] leading-snug">👋 Ich bin dein Ernährungscoach! Ein paar kurze Fragen, dann erstelle ich dir Wochenpläne, die wirklich zu dir passen.</p>
          {existing && <p className="mt-2 text-[12px] opacity-80">Dein bisheriges Profil bleibt, bis du alle Fragen beantwortet hast.</p>}
        </Card>
      )}
      <Card>
        <p className="text-[12px] font-semibold uppercase tracking-wider text-text-3">Frage {idx + 1} von {FOOD_Q.length}</p>
        <h3 className="mt-1 text-[18px] font-bold leading-snug">{q.q}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {q.chips.map((c) => (
            <button key={c} onClick={() => answer(c)} className={'press rounded-full px-3.5 py-2 text-[14px] font-medium ' + (existing?.[q.k] === c ? 'bg-accent text-on-accent' : 'bg-fill text-text')}>{c}</button>
          ))}
        </div>
        {q.free && (
          <form onSubmit={(e) => { e.preventDefault(); answer(free) }} className="mt-3 flex gap-2">
            <input value={free} onChange={(e) => setFree(e.target.value)} placeholder="…oder selbst tippen" enterKeyHint="next" className={input} />
            <button type="submit" className="press rounded-md bg-accent px-4 text-[15px] font-semibold text-on-accent">→</button>
          </form>
        )}
        {hint && <p className="mt-2 text-[13px] text-red">{hint}</p>}
        <div className="mt-4 flex items-center justify-between text-[13px] font-semibold text-accent">
          <button onClick={back} disabled={idx === 0} className="disabled:opacity-30">Zurück</button>
          {onCancel && <button onClick={onCancel}>Abbrechen</button>}
        </div>
      </Card>
    </div>
  )
}

function MealPlanView({ profile, onEditProfile }: { profile: FoodProfile; onEditProfile: () => void }) {
  const extra = useStore((s) => s.extra)
  const shopping = useStore((s) => s.tasks.shopping)
  const setExtra = useStore((s) => s.setExtra)
  const addTask = useStore((s) => s.addTask)
  const hasKey = useConfig((c) => !!c.groqKey)
  const plan = useMemo(() => readMealPlan(extra), [extra])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sel, setSel] = useState<{ day: number; slot: MealSlot } | null>(null)
  const { msg, flash } = useFlash()
  const [todayIdx] = useState(() => todayMealIndex())

  const generate = async () => {
    setBusy(true); setError(null)
    try {
      const text = await groqJson(MEAL_PLAN_SYSTEM, foodProfileText(profile), { maxTokens: 4000, temperature: 0.7 })
      setExtra({ mealPlan: normalizeMealPlan(parseJsonObject(text)) })
      flash('Wochenplan erstellt 🍽')
    } catch (e) {
      setError(describeError(e))
    }
    setBusy(false)
  }

  const addAll = () => {
    const fresh = newIngredients(mealPlanIngredients(extra), shopping)
    for (const ing of fresh) addTask('shopping', ing)
    flash(fresh.length ? '🛒 ' + fresh.length + ' Zutaten hinzugefügt' : 'Alles schon auf der Liste ✓')
  }

  const summary = [profile.diet, profile.cuisines, profile.people ? profile.people + ' Pers.' : '', profile.time].filter(Boolean).join(' · ')

  return (
    <>
      <div className="mt-3 flex gap-2">
        <button onClick={generate} disabled={busy || !hasKey} className={btnPrimary + ' flex-1'}>
          {busy ? <RefreshCw size={18} className="animate-spin" /> : plan ? <Dices size={18} /> : <Sparkles size={18} />}
          {busy ? 'Erstelle Plan …' : plan ? 'Neuer Wochenplan' : 'Wochenplan erstellen'}
        </button>
        <button onClick={onEditProfile} aria-label="Profil neu erstellen" title="Profil neu erstellen" className="press grid w-12 shrink-0 place-items-center rounded-md bg-accent-soft text-accent"><UserRound size={20} /></button>
      </div>
      <p className="mt-2 px-2 text-center text-[12px] text-text-3">Profil: {summary || 'gespeichert'}</p>
      {!hasKey && <NoKeyHint />}
      <Flash msg={error} tone="error" />
      <Flash msg={msg} />

      {!plan && (
        <Card className="mt-4 text-center">
          <p className="text-[15px] text-text-2">Profil gespeichert{profile.diet ? ' (' + profile.diet + ')' : ''}.</p>
          <p className="mt-1 text-[13px] text-text-3">Erstell jetzt deinen ersten Wochenplan!</p>
        </Card>
      )}

      {plan && (
        <>
          <button onClick={addAll} className={btnSoft + ' mt-4'}><ShoppingCart size={18} /> Alle Zutaten auf die Einkaufsliste</button>
          {plan.days.map((d, di) => (
            <div key={di}>
              <SectionLabel>{d.tag}{di === todayIdx ? <span className="normal-case tracking-normal text-accent"> · heute</span> : null}</SectionLabel>
              <Card className="p-0">
                {MEAL_SLOTS.map((s, si) => {
                  const m = d[s.id]
                  if (!m) return null
                  return (
                    <button key={s.id} onClick={() => setSel({ day: di, slot: s.id })} className={'press flex w-full items-center gap-3 px-4 py-2.5 text-left ' + (si ? 'border-t border-line' : '')}>
                      <span className="text-[20px]">{s.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold">{m.name}</span>
                        <span className="block truncate text-[12px] text-text-2">{s.label}{m.zutaten.length ? ' · ' + m.zutaten.slice(0, 3).join(', ') + (m.zutaten.length > 3 ? ' …' : '') : ''}</span>
                      </span>
                      <span className="text-text-3">›</span>
                    </button>
                  )
                })}
              </Card>
            </div>
          ))}
          <p className="mt-3 px-2 text-center text-[12px] text-text-3">
            Erstellt am {new Date(plan.createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })} · Gericht antippen zum Anpassen
          </p>
          {sel && plan.days[sel.day]?.[sel.slot] && (
            <MealSheet key={sel.day + sel.slot} sel={sel} plan={plan} profile={profile} onClose={() => setSel(null)} onFlash={flash} />
          )}
        </>
      )}
    </>
  )
}

/** Gericht-Sheet: ansehen / neu würfeln / bearbeiten / Zutaten auf die Liste. Wird pro Gericht neu aufgebaut (key). */
function MealSheet({ sel, plan, profile, onClose, onFlash }: { sel: { day: number; slot: MealSlot }; plan: MealPlan; profile: FoodProfile; onClose: () => void; onFlash: (m: string) => void }) {
  const setExtra = useStore((s) => s.setExtra)
  const addTask = useStore((s) => s.addTask)
  const hasKey = useConfig((c) => !!c.groqKey)
  const day = plan.days[sel.day]
  const meal = day[sel.slot]!
  const [name, setName] = useState(meal.name)
  const [ings, setIngs] = useState(meal.zutaten.join(', '))
  const [busy, setBusy] = useState(false)
  const [recipeBusy, setRecipeBusy] = useState(false)
  const [recipe, setRecipe] = useState<string | null>(meal.rezept ?? null)
  const [error, setError] = useState<string | null>(null)

  const slotLabel = MEAL_SLOTS.find((s) => s.id === sel.slot)?.label ?? ''
  const writeMeal = (m: { name: string; zutaten: string[]; rezept?: string }) => {
    const days = plan.days.map((d, i) => (i === sel.day ? { ...d, [sel.slot]: m } : d))
    setExtra({ mealPlan: { ...plan, days } })
  }
  const edited = () => ({ name: name.trim() || meal.name, zutaten: ings.split(',').map((s) => s.trim()).filter(Boolean) })
  const save = () => {
    // Rezept nur behalten, wenn das Gericht noch dasselbe ist
    const m = edited()
    writeMeal({ ...m, ...(recipe && m.name === meal.name ? { rezept: recipe } : {}) })
    onFlash('Gericht gespeichert')
    onClose()
  }
  const showRecipe = async () => {
    setRecipeBusy(true); setError(null)
    try {
      const m = edited()
      const text = (await groqText(RECIPE_SYSTEM, recipeUserPrompt(profile, m), { maxTokens: 700, temperature: 0.5 })).trim()
      if (!text) throw new Error('Leere Antwort')
      setRecipe(text)
      writeMeal({ ...m, rezept: text })
    } catch (e) {
      setError(describeError(e))
    }
    setRecipeBusy(false)
  }
  const toList = () => {
    const fresh = newIngredients(ings.split(',').map((s) => s.trim()), useStore.getState().tasks.shopping)
    for (const ing of fresh) addTask('shopping', ing)
    onFlash(fresh.length ? '🛒 ' + fresh.length + ' Zutaten hinzugefügt' : 'Schon alles auf der Liste ✓')
    onClose()
  }
  const reroll = async () => {
    setBusy(true); setError(null)
    try {
      const text = await groqJson(REROLL_SYSTEM, rerollUserPrompt(profile, plan, sel.slot, day.tag), { maxTokens: 250, temperature: 0.9 })
      const nm = normMeal(parseJsonObject(text))
      if (!nm?.name) throw new Error('Kein Gericht in der Antwort')
      writeMeal(nm)
      setName(nm.name); setIngs(nm.zutaten.join(', ')); setRecipe(null)
      onFlash('Neues Gericht 🎲')
    } catch (e) {
      setError(describeError(e))
    }
    setBusy(false)
  }

  return (
    <Sheet open onClose={onClose} title={day.tag + ' · ' + slotLabel}>
      <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wider text-text-3">Gericht</label>
      <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
      <label className="mb-1 mt-3 block text-[12px] font-semibold uppercase tracking-wider text-text-3">Zutaten (Komma-getrennt)</label>
      <textarea value={ings} onChange={(e) => setIngs(e.target.value)} rows={3} className={input + ' resize-none'} />
      {ings.trim() && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ings.split(',').map((s) => s.trim()).filter(Boolean).map((z, i) => <span key={i} className="rounded-full bg-fill px-2.5 py-1 text-[12px] font-medium">{shopInfo(z).emoji} {z}</span>)}
        </div>
      )}
      {recipe && (
        <div className="mt-3 rounded-md bg-fill px-3 py-2.5">
          <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-text-3"><BookOpen size={13} /> Rezept</p>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{recipe}</p>
        </div>
      )}
      <Flash msg={error} tone="error" />
      <div className="mt-4 grid gap-2">
        {!recipe && (
          <button onClick={showRecipe} disabled={recipeBusy || !hasKey} className={btnSoft}>{recipeBusy ? <RefreshCw size={18} className="animate-spin" /> : <BookOpen size={18} />} {recipeBusy ? 'Schreibe Rezept …' : 'Rezept anzeigen'}</button>
        )}
        <button onClick={reroll} disabled={busy || !hasKey} className={btnPrimary}>{busy ? <RefreshCw size={18} className="animate-spin" /> : <Dices size={18} />} {busy ? 'Würfle …' : 'Neu würfeln'}</button>
        <button onClick={toList} className={btnSoft}><ShoppingCart size={18} /> Zutaten auf die Liste</button>
        <div className="flex gap-2">
          <button onClick={onClose} className={btnFill}>Abbrechen</button>
          <button onClick={save} className={btnFill + ' text-accent'}><Check size={18} /> Speichern</button>
        </div>
      </div>
    </Sheet>
  )
}
