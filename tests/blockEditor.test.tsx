import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { subjectsBySlug } from '@/config/subjects'
import { BlockEditor } from '@/features/subjects/BlockEditor'
import { defaultBlocks, type BlockSetting } from '@/features/subjects/blockSettings'

function Harness({ onChange }: { onChange: (b: BlockSetting[]) => void }) {
  const [blocks, setBlocks] = useState(defaultBlocks(subjectsBySlug.latijn))
  return (
    <BlockEditor
      blocks={blocks}
      onChange={(b) => {
        setBlocks(b)
        onChange(b)
      }}
    />
  )
}

describe('BlockEditor', () => {
  it('zet een blok uit, hernoemt en verplaatst met de knoppen', () => {
    let last: BlockSetting[] = []
    render(<Harness onChange={(b) => (last = b)} />)

    fireEvent.click(screen.getByRole('switch', { name: 'Vormleer-trainer tonen' }))
    expect(last.find((b) => b.id === 'vormleer')?.enabled).toBe(false)

    fireEvent.change(screen.getByLabelText('Titel van blok Woordenlijsten'), { target: { value: 'Woordjes' } })
    expect(last.find((b) => b.id === 'woordenlijsten')?.title).toBe('Woordjes')

    const first = last[0].id
    fireEvent.click(screen.getAllByRole('button', { name: 'Omlaag' })[0])
    expect(last[1].id).toBe(first)
  })

  it('heeft een sleepgreep met toegankelijke naam per blok', () => {
    render(<Harness onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Verplaats Woordenlijsten' })).toBeInTheDocument()
  })
})
