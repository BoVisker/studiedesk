// Tekst-naar-spraak via de Web Speech API (alleen in de browser, geen server).
const LOCALES: Record<string, string> = { nl: 'nl-NL', en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', la: 'it-IT', el: 'el-GR' }

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function speak(text: string, lang: string | null | undefined) {
  if (!canSpeak() || !lang) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/\([^)]*\)/g, ''))
  u.lang = LOCALES[lang] ?? lang
  u.rate = 0.9
  window.speechSynthesis.speak(u)
}
