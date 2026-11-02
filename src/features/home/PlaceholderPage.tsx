import { Hammer } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui'

export function PlaceholderPage({ title, text }: { title: string; text: string }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState icon={<Hammer className="size-8" />} title="In aanbouw">
        {text}
      </EmptyState>
    </>
  )
}
