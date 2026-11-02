import { readStoredTheme, resolveTheme, storeTheme, THEME_STORAGE_KEY } from '@/lib/theme'

describe('thema', () => {
  beforeEach(() => localStorage.clear())

  it('valt terug op systeem', () => {
    expect(readStoredTheme()).toBe('system')
    localStorage.setItem(THEME_STORAGE_KEY, 'paars')
    expect(readStoredTheme()).toBe('system')
  })

  it('bewaart de keuze', () => {
    storeTheme('dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('lost "systeem" op naar de OS-voorkeur', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
  })
})
