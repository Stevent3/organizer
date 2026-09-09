import type { ReactNode } from 'react'

type Tone = 'elev' | 'accent' | 'soft'

const TONES: Record<Tone, string> = {
  elev: 'bg-elev shadow-sm',
  accent: 'bg-accent text-on-accent shadow-md',
  soft: 'bg-accent-soft',
}

export function Card({ children, className = '', tone = 'elev' }: { children: ReactNode; className?: string; tone?: Tone }) {
  return <section className={'rounded-lg p-4 ' + TONES[tone] + ' ' + className}>{children}</section>
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 mt-6 px-1 text-[13px] font-semibold uppercase tracking-wider text-text-3">{children}</h2>
}
