import type { CSSProperties } from 'react'

// Accentkleuren per vak. Elke kleur haalt minstens 4,5:1 contrast (WCAG AA)
// op zowel achtergrond als oppervlak in het bijbehorende thema — zie
// tests/contrast.test.ts. Pas je hier iets aan, draai dan `npm test`.
export const subjectPalette = {
  nederlands: { light: '#AF491D', dark: '#E07040' },
  engels: { light: '#216ABD', dark: '#4D92E0' },
  frans: { light: '#4F60CC', dark: '#7F8BDA' },
  duits: { light: '#8B610B', dark: '#BF850F' },
  spaans: { light: '#CC2432', dark: '#E56974' },
  latijn: { light: '#BC3763', dark: '#D56F91' },
  grieks: { light: '#187289', dark: '#219CBA' },
  'wiskunde-a': { light: '#197663', dark: '#24A88E' },
  'wiskunde-b': { light: '#2960E0', dark: '#658DE9' },
  'wiskunde-c': { light: '#126F9E', dark: '#1898D8' },
  'wiskunde-d': { light: '#8549CA', dark: '#A87DD9' },
  geschiedenis: { light: '#945D38', dark: '#C08259' },
  aardrijkskunde: { light: '#55732B', dark: '#759D3C' },
  biologie: { light: '#287843', dark: '#36A35A' },
  natuurkunde: { light: '#096DB3', dark: '#0F94F2' },
  scheikunde: { light: '#B43494', dark: '#D46BBA' },
  economie: { light: '#7E680E', dark: '#B89714' },
  bedrijfseconomie: { light: '#9A5921', dark: '#D27A2D' },
  informatica: { light: '#2C7472', dark: '#3C9F9C' },
  filosofie: { light: '#944EA2', dark: '#B57CC0' },
} as const satisfies Record<string, { light: string; dark: string }>

export type SubjectSlug = keyof typeof subjectPalette

// Basiskleuren van het thema; moeten gelijk lopen met src/styles/tokens.css.
export const themeBase = {
  light: { bg: '#F6F1E7', surface: '#FFFCF5', text: '#1A2747', muted: '#5A6378' },
  dark: { bg: '#0E1A2F', surface: '#16243D', text: '#EEE7D8', muted: '#A7AFC2' },
} as const

// Avatar-kleuren voor het profiel (zelfde contrasteisen, dus hergebruik).
export const avatarColors = ['engels', 'wiskunde-a', 'nederlands', 'filosofie', 'duits', 'latijn'] as const

/** Props voor een container met de accentkleur van een vak: `<div {...accentProps(slug)}>`. */
export function accentProps(slug: SubjectSlug, className = ''): { className: string; style: CSSProperties } {
  const c = subjectPalette[slug]
  return {
    className: `accent-scope ${className}`.trim(),
    style: { '--accent-light': c.light, '--accent-dark': c.dark } as CSSProperties,
  }
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
