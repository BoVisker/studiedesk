import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Magister mag niets doen, ook niet als de feature flag per ongeluk aan staat.
vi.mock('@/lib/featureFlags', () => ({ FEATURE_MAGISTER: true, FEATURE_GOOGLE_LOGIN: false }))

const { magisterCalendarSource, magisterGradeSource, MAGISTER_IMPLEMENTED } = await import('@/sources/magister')
const { enabledCalendarSources, enabledGradeSources, gradeExternalId } = await import('@/sources')

describe('Magister-stub', () => {
  it('staat uit, ook met FEATURE_MAGISTER=true', () => {
    expect(MAGISTER_IMPLEMENTED).toBe(false)
    expect(magisterGradeSource.isEnabled()).toBe(false)
    expect(magisterCalendarSource.isEnabled()).toBe(false)
    expect(enabledGradeSources().map((s) => s.id)).toEqual(['manual', 'screenshot'])
    expect(enabledCalendarSources().map((s) => s.id)).not.toContain('magister')
  })

  it('doet niets en maakt geen netwerkverzoek', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await expect(magisterGradeSource.fetchGrades!()).resolves.toEqual([])
    await expect(magisterCalendarSource.fetchItems!()).resolves.toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('de stub bevat geen netwerk-, opslag- of inlogcode', () => {
    const code = readFileSync('src/sources/magister.ts', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
    // fetchGrades/fetchItems zijn de (lege) interfacemethoden; een fetch(-aanroep mag niet.
    expect(code).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|axios|WebSocket|https?:|supabase|localStorage|sessionStorage|indexedDB|cookie|token|password|wachtwoord|client_?id|oauth/i)
  })

  it('nergens in de code een Magister-domein, -wachtwoord, -token of -client-ID', () => {
    const domains = execSync("grep -rniE 'magister\\.(net|nl|com)' src supabase || true", { encoding: 'utf8' })
    expect(domains).toBe('')
    const identifiers = execSync("grep -rniE 'magister[a-z_]*(password|wachtwoord|token|client_?id|secret|login|credential)' src supabase || true", { encoding: 'utf8' })
    expect(identifiers).toBe('')
  })

  it('wachtwoordvelden bestaan alleen voor het eigen StudieDesk-account', () => {
    const files = execSync("grep -rlE 'type=\"password\"' src || true", { encoding: 'utf8' }).trim().split('\n').filter(Boolean).sort()
    expect(files).toEqual(['src/features/auth/LoginPage.tsx', 'src/features/auth/NewPasswordPage.tsx'])
  })
})

describe('gradeExternalId', () => {
  it('is stabiel en ongevoelig voor hoofdletters en spaties in de omschrijving', () => {
    const a = gradeExternalId({ subject: 'engels', description: 'SO  Unit 3', grade: 7.4, weight: 1, graded_on: '2026-10-01' })
    const b = gradeExternalId({ subject: 'engels', description: 'so unit 3 ', grade: 7.4, weight: 1, graded_on: '2026-10-01' })
    expect(a).toBe(b)
    expect(gradeExternalId({ subject: 'engels', description: 'SO Unit 3', grade: 7.5, weight: 1, graded_on: '2026-10-01' })).not.toBe(a)
  })
})
