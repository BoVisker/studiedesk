import { execSync } from 'node:child_process'

// Vangnet: in de frontend-code mogen geen API-keys of service-role-keys staan.
describe('geen secrets in de frontend', () => {
  it('src/ verwijst niet naar server-only keys', () => {
    const hits = execSync(
      "grep -rnE 'sk-ant-|SERVICE_ROLE|ANTHROPIC_API_KEY|YOUTUBE_API_KEY|AIza[0-9A-Za-z_-]{20,}' src || true",
      { encoding: 'utf8' },
    )
    expect(hits).toBe('')
  })
})
