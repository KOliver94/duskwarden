import { Moon } from 'lucide-react'
import { Say, StepCard } from '../StepCard'

export function DuskCard() {
  return (
    <StepCard title="Éjszaka" aside={<Moon className="size-8 text-primary" />}>
      <Say>Leszállt az éj. Mindenki csukja be a szemét!</Say>
    </StepCard>
  )
}
