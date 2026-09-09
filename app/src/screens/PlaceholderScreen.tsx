import { Card } from '../components/Card'
import { Screen } from '../components/Screen'

export function PlaceholderScreen({ title, hint }: { title: string; hint: string }) {
  return (
    <Screen title={title}>
      <Card tone="soft" className="mt-2">
        <p className="text-[15px] font-semibold text-accent">In Arbeit</p>
        <p className="mt-1 text-[14px] text-text-2">{hint}</p>
      </Card>
    </Screen>
  )
}
