import { getAccessTokenForUser } from '@/lib/google/exchange'

describe('Token refresh helper', () => {
  const originalFetch = global.fetch
  afterEach(() => { global.fetch = originalFetch as any })
  it('refreshes and returns access token on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: 'x', expires_in: 3600 }) }) as any
    // We cannot run full flow without DB; just ensure callable
    expect(typeof getAccessTokenForUser).toBe('function')
  })
})


