export type ThemePref = 'light' | 'dark' | 'system'
export const THEME_STORAGE_KEY = 'studiedesk-theme'

export function readStoredTheme(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function storeTheme(pref: ThemePref) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref)
  } catch {
    /* privémodus: alleen in geheugen */
  }
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): 'light' | 'dark' {
  return pref === 'system' ? (systemDark ? 'dark' : 'light') : pref
}

export function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.dataset.theme = resolved
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute('content', resolved === 'dark' ? '#0E1A2F' : '#F6F1E7')
    m.removeAttribute('media')
  })
}
