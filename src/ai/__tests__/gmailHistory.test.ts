import * as gmailLayer from '@/lib/google/gmailLayer'

describe('Gmail historyId incremental sync', () => {
  it('calls incrementalSync and returns newHistoryId', async () => {
    const spy = jest.spyOn(gmailLayer, 'incrementalSync' as any).mockResolvedValue({ threads: [], newHistoryId: '123' })
    const res = await (gmailLayer as any).incrementalSync('user-1', '100')
    expect(res.newHistoryId).toBe('123')
    spy.mockRestore()
  })
})


