import { encrypt, decrypt } from '@/lib/crypto'

describe('crypto aes-gcm', () => {
  it('round trips', () => {
    const key = Buffer.alloc(32, 7)
    const plain = Buffer.from('hello world')
    const blob = encrypt(plain, key)
    const out = decrypt(blob, key)
    expect(out.toString()).toBe('hello world')
  })
})


