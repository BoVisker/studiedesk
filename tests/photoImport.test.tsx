import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { newReviewRow, ReviewTable, type ReviewRow } from '@/features/imports/ReviewTable'
import { aiErrorMessage } from '@/lib/functions'
import { targetSize } from '@/lib/images'

describe('fotoverkleining', () => {
  it('verkleint de lange kant naar 2000 px en vergroot nooit', () => {
    expect(targetSize(4000, 3000)).toEqual({ width: 2000, height: 1500 })
    expect(targetSize(3000, 4032)).toEqual({ width: 1488, height: 2000 })
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 })
  })
})

describe('AI-foutmeldingen', () => {
  it('geeft voor elke bekende code een eigen Nederlandse melding', () => {
    const codes = ['offline', 'ai_limit_reached', 'ai_not_configured', 'ai_busy', 'ai_unavailable', 'ai_refused', 'too_long', 'image_not_found']
    const msgs = codes.map(aiErrorMessage)
    expect(new Set(msgs).size).toBe(codes.length)
    expect(aiErrorMessage('ai_limit_reached')).toMatch(/limiet/)
    expect(aiErrorMessage('iets-onbekends')).toMatch(/mislukt/)
  })
})

function Harness({ initial, spy }: { initial: ReviewRow[]; spy: (r: ReviewRow[]) => void }) {
  const [rows, setRows] = useState(initial)
  return <ReviewTable rows={rows} labels={{ term: 'Woord', definition: 'Vertaling' }} onChange={(r) => (setRows(r), spy(r))} />
}

describe('controlescherm', () => {
  const initial = [newReviewRow({ term: 'chien', definition: 'hond' }), newReviewRow({ term: 'cbat', definition: 'kat', uncertain: true })]

  it('toont onzekere regels en laat ze afvinken', () => {
    let last: ReviewRow[] = initial
    render(<Harness initial={initial} spy={(r) => (last = r)} />)
    expect(screen.getByText(/1 om te controleren/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Woord 2'), { target: { value: 'chat' } })
    fireEvent.click(screen.getByRole('button', { name: 'Regel 2 gecontroleerd' }))
    expect(last[1]).toMatchObject({ term: 'chat', uncertain: false })
    expect(screen.queryByText(/om te controleren/)).not.toBeInTheDocument()
  })

  it('wisselt kolommen om, voegt toe en verwijdert', () => {
    let last: ReviewRow[] = initial
    render(<Harness initial={initial} spy={(r) => (last = r)} />)
    fireEvent.click(screen.getByRole('button', { name: /Kolommen omwisselen/ }))
    expect(last[0]).toMatchObject({ term: 'hond', definition: 'chien' })
    fireEvent.click(screen.getByRole('button', { name: /Regel toevoegen/ }))
    expect(last).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'Regel 1 verwijderen' }))
    expect(last).toHaveLength(2)
    expect(last[0].term).toBe('kat') // was omgewisseld
  })
})
