import { contrastRatio, subjectPalette, themeBase } from '@/design/subjectPalette'
import { readFileSync } from 'node:fs'

const AA = 4.5

describe('vak-accentkleuren (WCAG AA)', () => {
  for (const [slug, c] of Object.entries(subjectPalette)) {
    it(`${slug} is leesbaar in licht en donker`, () => {
      expect(contrastRatio(c.light, themeBase.light.bg)).toBeGreaterThanOrEqual(AA)
      expect(contrastRatio(c.light, themeBase.light.surface)).toBeGreaterThanOrEqual(AA)
      expect(contrastRatio(c.dark, themeBase.dark.bg)).toBeGreaterThanOrEqual(AA)
      expect(contrastRatio(c.dark, themeBase.dark.surface)).toBeGreaterThanOrEqual(AA)
      // --on-accent (tekst op een accentknop) is surface in licht en bg in
      // donker, dus de checks hierboven dekken dat ook.
    })
  }

  it('basistekst haalt AA in beide thema’s', () => {
    for (const t of [themeBase.light, themeBase.dark]) {
      expect(contrastRatio(t.text, t.bg)).toBeGreaterThanOrEqual(7)
      expect(contrastRatio(t.muted, t.bg)).toBeGreaterThanOrEqual(AA)
      expect(contrastRatio(t.muted, t.surface)).toBeGreaterThanOrEqual(AA)
    }
  })

  it('tokens.css gebruikt dezelfde basiskleuren als themeBase', () => {
    const css = readFileSync('src/styles/tokens.css', 'utf8').toLowerCase()
    for (const t of [themeBase.light, themeBase.dark]) {
      for (const hex of [t.bg, t.surface, t.text, t.muted]) expect(css).toContain(hex.toLowerCase())
    }
  })
})
