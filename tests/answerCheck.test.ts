import { checkAnswer, editDistance, expandParentheses } from '@/features/study/answerCheck'

const v = (given: string, expected: string, o = {}) => checkAnswer(given, expected, o).verdict

describe('antwoordcontrole', () => {
  it('negeert hoofdletters en witruimte standaard', () => {
    expect(v('  De Hond ', 'de hond')).toBe('correct')
    expect(v('Hond', 'hond', { ignoreCase: false })).not.toBe('correct')
  })

  it('negeert afsluitende punten', () => {
    expect(v('hond.', 'hond')).toBe('correct')
  })

  it('accenten tellen standaard mee, maar een accentfout is "bijna goed"', () => {
    expect(v('été', 'été')).toBe('correct')
    expect(checkAnswer('ete', 'été')).toEqual({ verdict: 'almost', reason: 'accent' })
    expect(v('ete', 'été', { allowAlmost: false })).toBe('wrong')
    expect(v('ete', 'été', { ignoreAccents: true })).toBe('correct')
  })

  it('kent Duitse en Spaanse tekens', () => {
    expect(v('strasse', 'Straße', { ignoreAccents: true })).toBe('correct')
    expect(v('Straße', 'Straße')).toBe('correct')
    expect(v('manana', 'mañana', { ignoreAccents: true })).toBe('correct')
    expect(v('Mädchen', 'Mädchen', { ignoreCase: false })).toBe('correct')
    expect(v('Madchen', 'Mädchen').toString()).toBe('almost')
  })

  it('accepteert één van meerdere antwoorden (komma, puntkomma, slash)', () => {
    expect(v('hond', 'hond, viervoeter')).toBe('correct')
    expect(v('viervoeter', 'hond; viervoeter')).toBe('correct')
    expect(v('mooi', 'mooi/prachtig')).toBe('correct')
    expect(v('hond, viervoeter', 'hond, viervoeter')).toBe('correct')
    expect(v('viervoeter, hond', 'hond, viervoeter')).toBe('correct')
    expect(v('hond, kat', 'hond, viervoeter')).toBe('wrong')
  })

  it('haakjes zijn optioneel', () => {
    expect(v('hond', '(de) hond')).toBe('correct')
    expect(v('de hond', '(de) hond')).toBe('correct')
    expect(v('opstaan', 'op(staan)')).toBe('correct')
    expect(v('op', 'op(staan)')).toBe('correct')
    expect(expandParentheses('(zich) (iets) herinneren').sort()).toEqual(['herinneren', 'iets herinneren', 'zich herinneren', 'zich iets herinneren'].sort())
  })

  it('kleine typefouten zijn "bijna goed", grote zijn fout', () => {
    expect(checkAnswer('hodn', 'hond')).toEqual({ verdict: 'almost', reason: 'typo' })
    expect(v('olifnat', 'olifant')).toBe('almost')
    expect(v('ui', 'uil')).toBe('wrong') // te kort voor tolerantie
    expect(v('kat', 'hond')).toBe('wrong')
    expect(v('onafhankelijkhied', 'onafhankelijkheid')).toBe('almost')
  })

  it('splitsen kan uit (formules)', () => {
    expect(v('F = m·a', 'F = m·a', { splitAlternatives: false })).toBe('correct')
    expect(v('a, b', 'a, b', { splitAlternatives: false })).toBe('correct')
    expect(v('a', 'a, b', { splitAlternatives: false })).toBe('wrong')
  })

  it('leeg antwoord is fout', () => {
    expect(v('', 'hond')).toBe('wrong')
    expect(v('   ', 'hond')).toBe('wrong')
  })

  it('editDistance telt verwisselingen als één fout', () => {
    expect(editDistance('hond', 'hodn')).toBe(1)
    expect(editDistance('abc', 'abc')).toBe(0)
    expect(editDistance('', 'abc')).toBe(3)
  })
})
