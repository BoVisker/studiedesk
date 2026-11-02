// Centrale feature flags. Een flag staat alleen aan als de env-variabele letterlijk "true" is.
const flag = (v: unknown) => v === 'true'

/** Magister-bron: voorbereid, niet actief. Zie docs/magister-later.md. */
export const FEATURE_MAGISTER = flag(import.meta.env.VITE_FEATURE_MAGISTER)

/** Google-login: zet aan nadat de provider in Supabase is ingesteld (zie README). */
export const FEATURE_GOOGLE_LOGIN = flag(import.meta.env.VITE_FEATURE_GOOGLE_LOGIN)
