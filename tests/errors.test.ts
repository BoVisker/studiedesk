import { authErrorMessage } from '@/lib/errors'

describe('authErrorMessage', () => {
  it('vertaalt bekende fouten', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toMatch(/klopt niet/)
    expect(authErrorMessage({ message: 'Database error saving new user' })).toMatch(/uitnodigingslijst/)
    expect(authErrorMessage({ code: 'P0001', message: 'signup_not_allowed', status: 500 })).toMatch(/uitnodigingslijst/)
    expect(authErrorMessage({ code: 'otp_disabled', message: 'Signups not allowed for otp' })).toMatch(/uitnodigingslijst/)
    expect(authErrorMessage({ message: 'Failed to fetch' })).toMatch(/verbinding/)
    expect(authErrorMessage({ status: 429, message: 'x' })).toMatch(/te veel/)
  })
  it('heeft een nette fallback', () => {
    expect(authErrorMessage({ message: 'iets onbekends' })).toMatch(/ging iets mis/)
  })
})
