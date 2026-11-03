import { fireEvent, render, screen, within } from '@testing-library/react'
import { WorkedView } from '@/features/notes/NoteViews'
import { Quiz, shortAnswerCorrect } from '@/features/notes/Quiz'
import { splitMath } from '@/features/notes/splitMath'
import { normalizeQuestion, type Question } from '@/features/notes/types'

describe('splitMath', () => {
  it('herkent \\( \\) en \\[ \\] en laat dollartekens met rust', () => {
    expect(splitMath('Kost $5 en \\(x^2\\) is kwadraat. \\[ y = ax + b \\]')).toEqual([
      { type: 'text', value: 'Kost $5 en ' },
      { type: 'math', value: 'x^2', display: false },
      { type: 'text', value: ' is kwadraat. ' },
      { type: 'math', value: 'y = ax + b', display: true },
    ])
  })

  it('tekst zonder wiskunde blijft één stuk', () => {
    expect(splitMath('Gewoon tekst')).toEqual([{ type: 'text', value: 'Gewoon tekst' }])
  })
})

describe('shortAnswerCorrect', () => {
  it('splitst niet op een decimale komma', () => {
    expect(shortAnswerCorrect('3,5', '3,5')).toBe(true)
    expect(shortAnswerCorrect('3', '3,5')).toBe(false)
  })
  it('accepteert varianten na " / ", kleine typefouten en negeert LaTeX-scheidingstekens', () => {
    expect(shortAnswerCorrect('mitochondrien', 'mitochondriën / mitochondria')).toBe(true)
    expect(shortAnswerCorrect('mitochondria', 'mitochondriën / mitochondria')).toBe(true)
    expect(shortAnswerCorrect('fotosynthese', 'fotosyntese')).toBe(true)
    expect(shortAnswerCorrect('12', '\\(12\\)')).toBe(true)
    expect(shortAnswerCorrect('celwand', 'celmembraan')).toBe(false)
  })
})

const mc: Question = { soort: 'meerkeuze', vraag: 'Waar vindt fotosynthese plaats?', opties: ['Kern', 'Bladgroenkorrel', 'Vacuole', 'Celwand'], juist: 1, antwoord: 'Bladgroenkorrel', uitleg: 'In de chloroplasten.' }
const kort: Question = { soort: 'kort', vraag: 'Bereken \\(2 \\cdot 3\\).', opties: [], juist: null, antwoord: '6', uitleg: 'Twee keer drie.' }
const open: Question = { soort: 'open', vraag: 'Leg osmose uit.', opties: [], juist: null, antwoord: 'Water beweegt door een membraan.', uitleg: 'Van laag naar hoog opgeloste stof.' }

describe('normalizeQuestion', () => {
  it('maakt van een kapotte meerkeuzevraag een open vraag', () => {
    expect(normalizeQuestion({ ...mc, juist: 7 }).soort).toBe('open')
    expect(normalizeQuestion({ ...mc, opties: [] }).soort).toBe('open')
    expect(normalizeQuestion(mc)).toBe(mc)
  })
})

describe('Quiz', () => {
  it('controleert meerkeuze, kort en open direct en telt de score', () => {
    render(<Quiz questions={[mc, kort, open]} />)
    const items = screen.getAllByRole('listitem')

    // Meerkeuze: fout antwoord, daarna zijn de opties dicht.
    fireEvent.click(within(items[0]).getByRole('button', { name: /Kern/ }))
    expect(within(items[0]).getByText('Helaas.')).toBeInTheDocument()
    expect(within(items[0]).getByRole('button', { name: /Bladgroenkorrel/ })).toBeDisabled()

    // Kort antwoord, wiskunde in de vraag wordt met KaTeX gezet.
    expect(items[1].querySelector('.katex')).not.toBeNull()
    fireEvent.change(within(items[1]).getByLabelText('Jouw antwoord'), { target: { value: '6' } })
    fireEvent.click(within(items[1]).getByRole('button', { name: 'Controleer' }))
    expect(within(items[1]).getByText('Goed!')).toBeInTheDocument()

    // Open: modelantwoord tonen en zelf beoordelen.
    fireEvent.click(within(items[2]).getByRole('button', { name: /Toon modelantwoord/ }))
    expect(within(items[2]).getByText('Water beweegt door een membraan.')).toBeInTheDocument()
    fireEvent.click(within(items[2]).getByRole('button', { name: /^Goed$/ }))

    expect(screen.getByText('2 van 3')).toBeInTheDocument()
  })
})

describe('WorkedView', () => {
  it('toont altijd de controlewaarschuwing, stappen en antwoord', () => {
    render(
      <WorkedView
        content={{
          waarschuwing: null,
          opgaven: [
            {
              nummer: '4a',
              opgave: 'Los op: \\(2x + 3 = 7\\)',
              stappen: [
                { titel: '3 aftrekken', uitleg: 'Aan beide kanten.', berekening: '2x &= 4' },
                { titel: 'Delen door 2', uitleg: 'Zo houd je x over.', berekening: 'x &= 2' },
              ],
              antwoord: '\\(x = 2\\)',
              controle: 'Invullen: \\(2 \\cdot 2 + 3 = 7\\).',
              onzeker: true,
            },
          ],
        }}
      />,
    )
    expect(screen.getByText(/Controleer deze uitwerking zelf/)).toBeInTheDocument()
    expect(screen.getByText('Opgave 4a')).toBeInTheDocument()
    expect(screen.getByText('3 aftrekken')).toBeInTheDocument()
    expect(screen.getByText(/lastig te lezen/)).toBeInTheDocument()
    expect(document.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(4)
  })
})
