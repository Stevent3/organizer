import type { ReactNode } from 'react'

type Props = { title: string; subtitle?: string; children: ReactNode; right?: ReactNode; compact?: boolean }

export function Screen({ title, subtitle, children, right, compact = false }: Props) {
  return (
    <div className="mx-auto max-w-lg px-4 animate-fade-up">
      <header className="flex items-end justify-between pb-2 pt-4">
        <div>
          {subtitle && <p className="text-[13px] font-medium text-text-2">{subtitle}</p>}
          <h1 className={'font-display font-bold leading-tight tracking-tight ' + (compact ? 'whitespace-nowrap text-[25px]' : 'text-[32px]')}>{title}</h1>
        </div>
        {right}
      </header>
      {children}
    </div>
  )
}
