import sodium from 'libsodium-wrappers'

const keyB64 = process.env.DATA_KEY || ''
let key: Uint8Array | null = null

export async function initCrypto() {
  if (!key) {
    await sodium.ready
    if (!keyB64) throw new Error('DATA_KEY missing')
    const k = sodium.from_base64(keyB64, sodium.base64_variants.ORIGINAL)
    if (k.length !== sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES) throw new Error('Invalid DATA_KEY length')
    key = k
  }
}

export async function encryptField(plain: string): Promise<string> {
  await initCrypto()
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES)
  const cipher = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(plain, null, null, nonce, key!)
  const packed = new Uint8Array(nonce.length + cipher.length)
  packed.set(nonce, 0)
  packed.set(cipher, nonce.length)
  return sodium.to_base64(packed, sodium.base64_variants.ORIGINAL)
}

export async function decryptField(b64: string): Promise<string> {
  await initCrypto()
  const packed = sodium.from_base64(b64, sodium.base64_variants.ORIGINAL)
  const nonce = packed.slice(0, sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES)
  const cipher = packed.slice(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES)
  const plain = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, cipher, null, nonce, key!)
  return sodium.to_string(plain)
}


