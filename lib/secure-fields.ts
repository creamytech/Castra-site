import { encrypt, decrypt } from '@/lib/crypto'
import { getDataKey } from '@/lib/kms'

/** Encrypts utf8 string -> Buffer for Prisma Bytes */
export async function encryptStringToBytes(plaintext?: string | null): Promise<Buffer | null> {
	if (!plaintext) return null
	const key = await getDataKey()
	return encrypt(Buffer.from(plaintext, 'utf8'), key)
}

/** Decrypts Prisma Bytes -> utf8 string */
export async function decryptBytesToString(cipher?: Buffer | null): Promise<string | null> {
	if (!cipher || !Buffer.isBuffer(cipher) || cipher.length === 0) return null
	const key = await getDataKey()
	const plain = decrypt(cipher, key)
	return plain.toString('utf8')
}

/** Quick presence check that is safe to use in status endpoints */
export function hasBytes(v: unknown): boolean {
	return !!(v && Buffer.isBuffer(v) && (v as Buffer).length > 0)
}



