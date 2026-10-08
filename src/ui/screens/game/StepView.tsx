import { ActionCard } from './cards/ActionCard'
import { DiscussionCard } from './cards/DiscussionCard'
import { DuskCard } from './cards/DuskCard'
import { ExecutionCard } from './cards/ExecutionCard'
import { KillersMeetCard } from './cards/KillersMeetCard'
import { MorningCard } from './cards/MorningCard'
import { TellCard } from './cards/TellCard'
import type { StepProps } from './types'

export function StepView(props: StepProps) {
  const { step } = props
  switch (step.kind) {
    case 'dusk':
      return <DuskCard />
    case 'tell':
      return <TellCard {...props} />
    case 'killersMeet':
      return <KillersMeetCard {...props} step={step} />
    case 'action':
      return <ActionCard {...props} step={step} />
    case 'morning':
      return <MorningCard {...props} />
    case 'discussion':
      return <DiscussionCard {...props} />
    case 'execution':
      return <ExecutionCard {...props} />
  }
}
