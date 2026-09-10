import { Check, Zap } from 'lucide-react'
import { ENERGY_LEVELS } from '../../lib/model'
import { useStore } from '../../store/useStore'

/** Kleine Kennzahl mit Fortschrittsring (To-dos · Termine · Plan) */
export function Stat({ label, value, pct, onClick }: { label: string; value: string; pct: number; onClick: () => void }) {
  const r = 11, c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, pct))
  return (
    <button onClick={onClick} className="press flex items-center gap-2.5 rounded-lg bg-elev px-3 py-2.5 text-left shadow-sm">
      <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0 -rotate-90">
        <circle cx="14" cy="14" r={r} fill="none" stroke="var(--fill-strong)" strokeWidth="3.5" />
        <circle cx="14" cy="14" r={r} fill="none" stroke={p >= 1 ? 'var(--green)' : 'var(--accent)'} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: 'stroke-dashoffset 500ms var(--ease-out)' }} />
      </svg>
      <span className="min-w-0">
        <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-text-3">{label}</span>
        <span className="block truncate text-[13px] font-bold">{value}</span>
      </span>
    </button>
  )
}

export function TaskLine({ text, done, onToggle, compact = false }: { text: string; done: boolean; onToggle: () => void; compact?: boolean }) {
  return (
    <button onClick={onToggle} className={'press flex w-full items-center text-left ' + (compact ? 'gap-2 py-1.5' : 'gap-3 px-4 py-2.5')}>
      <span className={'grid shrink-0 place-items-center rounded-full border-2 transition-colors ' + (compact ? 'h-5 w-5' : 'h-6 w-6') + ' ' + (done ? 'border-accent bg-accent text-on-accent' : 'border-fill-strong')}>
        {done && <Check size={compact ? 11 : 14} strokeWidth={3} />}
      </span>
      <span className={(compact ? 'min-w-0 flex-1 truncate text-[13px] font-medium ' : 'text-[15px] ') + (done ? 'text-text-3 line-through' : '')}>{text}</span>
    </button>
  )
}

/** Energie als eine Pille im Kopf: Tippen schaltet Wenig → Gut → Top → aus (spart eine ganze Zeile) */
export function EnergyPill() {
  const energy = useStore((s) => s.energy)
  const setEnergy = useStore((s) => s.setEnergy)
  const cycle = () => {
    const i = ENERGY_LEVELS.findIndex((l) => l.level === energy?.level)
    const next = ENERGY_LEVELS[i + 1]
    setEnergy(next ? { level: next.level, label: next.label, pct: next.pct } : null)
  }
  return (
    <button onClick={cycle} aria-label="Energie" className={'press mb-2 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-semibold shadow-sm ' + (energy ? 'bg-accent text-on-accent' : 'bg-elev text-text-3')}>
      <Zap size={13} strokeWidth={2.5} />{energy ? energy.label : 'Energie'}
    </button>
  )
}

export function fmtMin(m: number) {
  if (m < 60) return m + ' Min.'
  const h = Math.floor(m / 60), r = m % 60
  return h + ' Std.' + (r ? ' ' + r + ' Min.' : '')
}
