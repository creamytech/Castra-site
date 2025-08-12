import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

export function encrypt(plain: Buffer, key: Buffer) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct])
}

export function decrypt(blob: Buffer, key: Buffer) {
  const iv = blob.subarray(0,12)
  const tag = blob.subarray(12,28)
  const ct  = blob.subarray(28)
  const dec = createDecipheriv('aes-256-gcm', key, iv)
  dec.setAuthTag(tag)
  return Buffer.concat([dec.update(ct), dec.final()])
}


