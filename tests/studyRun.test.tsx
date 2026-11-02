import { fireEvent, render, screen } from '@testing-library/react'
import { defaultCheckOptions } from '@/features/study/answerCheck'
import { StudyRun } from '@/features/study/StudyRun'
import type { SessionItem, SessionResult } from '@/features/study/types'

const item = (id: string, term: string, definition: string): SessionItem => ({
  id, term, definition, srs_box: 0, due_at: null, correct_count: 0, wrong_count: 0, last_reviewed_at: null, termLang: null, definitionLang: null,
})

describe('StudyRun (typen)', () => {
  it('fout antwoord komt terug, SRS wordt één keer per item opgeslagen, resultaat klopt', async () => {
    const saves: [string, number][] = []
    let result: SessionResult | null = null
    render(
      <StudyRun
        items={[item('a', 'chien', 'hond')]}
        settings={{ mode: 'typen', direction: 'vooruit', check: defaultCheckOptions, count: 10 }}
        isFormula={false}
        saveSrs={async (id, s) => void saves.push([id, s.srs_box])}
        onFinish={(r) => (result = r)}
        onExit={() => {}}
      />,
    )

    const input = () => screen.getByLabelText('Jouw antwoord')
    fireEvent.change(input(), { target: { value: 'kat' } })
    fireEvent.submit(input().closest('form')!)
    expect(screen.getByText('Helaas')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Verder' }))

    // Zelfde kaart opnieuw (enige kaart in de wachtrij).
    fireEvent.change(input(), { target: { value: 'Hond' } })
    fireEvent.submit(input().closest('form')!)
    expect(screen.getByText('Goed!')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Verder' }))

    expect(saves).toEqual([['a', 1]]) // alleen eerste poging (fout ⇒ bakje 1)
    expect(result).toMatchObject({ total: 1, correct: 0, wrongIds: ['a'], grade: null })
  })

  it('bijna goed: gebruiker kan het toch goed rekenen', () => {
    let result: SessionResult | null = null
    render(
      <StudyRun
        items={[item('a', 'été', 'zomer')]}
        settings={{ mode: 'typen', direction: 'achteruit', check: defaultCheckOptions, count: 10 }}
        isFormula={false}
        saveSrs={async () => {}}
        onFinish={(r) => (result = r)}
        onExit={() => {}}
      />,
    )
    const input = screen.getByLabelText('Jouw antwoord')
    fireEvent.change(input, { target: { value: 'ete' } })
    fireEvent.submit(input.closest('form')!)
    expect(screen.getByText(/let op de accenten/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Toch goed rekenen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Verder' }))
    expect(result).toMatchObject({ total: 1, correct: 1 })
  })
})

describe('StudyRun (flashcards)', () => {
  it('omdraaien en beoordelen', () => {
    let result: SessionResult | null = null
    render(
      <StudyRun
        items={[item('a', 'dog', 'hond')]}
        settings={{ mode: 'flashcards', direction: 'vooruit', check: defaultCheckOptions, count: 10 }}
        isFormula={false}
        saveSrs={async () => {}}
        onFinish={(r) => (result = r)}
        onExit={() => {}}
      />,
    )
    expect(screen.getByText('dog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Omdraaien' }))
    expect(screen.getByText('hond')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Wist ik$/ }))
    expect(result).toMatchObject({ total: 1, correct: 1 })
  })
})
