import {
  Amphora, Atom, BookOpenText, Briefcase, Calculator, Castle, ChartSpline, Code, Croissant, Dices,
  FlaskConical, Globe, Hourglass, Landmark, Leaf, Lightbulb, MessageSquareText, Sigma, Sun, TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import type { SubjectIcon as IconName } from '@/config/subjects'

const icons: Record<IconName, LucideIcon> = {
  Amphora, Atom, BookOpenText, Briefcase, Calculator, Castle, ChartSpline, Code, Croissant, Dices,
  FlaskConical, Globe, Hourglass, Landmark, Leaf, Lightbulb, MessageSquareText, Sigma, Sun, TrendingUp,
}

export function SubjectIcon({ name, className }: { name: IconName; className?: string }) {
  const Icon = icons[name]
  return <Icon className={className ?? 'size-5'} aria-hidden="true" />
}
