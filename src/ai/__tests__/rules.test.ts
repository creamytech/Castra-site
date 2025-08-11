import { hasTourIntent, hasAnyContext, decideStatus } from '@/src/ai/rules'

describe('rules intent override', () => {
  it('detects tour intent', () => {
    expect(hasTourIntent('Can we schedule a showing this weekend?')).toBe(true)
  })
  it('detects context with address', () => {
    expect(hasAnyContext('Tour 220 SE 2nd St')).toBe(true)
  })
  it('classifies lead for tour with context', () => {
    const status = decideStatus({ score: 10, subject: 'Tour request 220 SE 2nd St', body: 'Budget 100,000', llmReason: 'tour request; address; budget' })
    expect(status).toBe('lead')
  })
  it('handles time phrases', () => {
    expect(hasAnyContext('tomorrow 3 pm works')).toBe(true)
  })
  it('handles budget phrases', () => {
    expect(hasAnyContext('around $450k')).toBe(true)
  })
  it('handles phone presence', () => {
    expect(hasAnyContext('reach me at 305-555-1212')).toBe(true)
  })
})


