// Vertaal technische fouten naar korte, Nederlandse meldingen.
export function authErrorMessage(err: { message?: string; code?: string; status?: number } | null | undefined): string {
  if (!err) return 'Er ging iets mis. Probeer het opnieuw.'
  const m = (err.message ?? '').toLowerCase()
  const code = err.code ?? ''
  if (m.includes('failed to fetch') || m.includes('network')) return 'Geen verbinding. Controleer je internet en probeer het opnieuw.'
  if (code === 'invalid_credentials' || m.includes('invalid login')) return 'E-mailadres of wachtwoord klopt niet.'
  if (code === 'email_not_confirmed') return 'Bevestig eerst je e-mailadres via de link in je mail.'
  if (code === 'user_already_exists' || m.includes('already registered')) return 'Er bestaat al een account met dit e-mailadres. Log in.'
  if (code === 'weak_password' || m.includes('password should')) return 'Kies een sterker wachtwoord (minimaal 8 tekens).'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || err.status === 429)
    return 'Even geduld: er zijn te veel pogingen gedaan. Probeer het over een minuut opnieuw.'
  if (code === 'otp_disabled' || code === 'signup_disabled' || m.includes('signups not allowed') || m.includes('signup_not_allowed') || m.includes('database error saving new user'))
    return 'Dit e-mailadres staat niet op de uitnodigingslijst. Vraag de beheerder om een uitnodiging.'
  if (code === 'otp_expired' || m.includes('expired')) return 'Deze link is verlopen of al gebruikt. Vraag een nieuwe aan.'
  if (code === 'same_password') return 'Kies een ander wachtwoord dan je huidige.'
  return 'Er ging iets mis. Probeer het opnieuw.'
}
