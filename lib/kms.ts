import { KMSClient as AwsKmsClient, GenerateDataKeyCommand } from '@aws-sdk/client-kms'
import { KeyManagementServiceClient as GcpKmsClient } from '@google-cloud/kms'

let cachedKey: { key: Buffer; expiresAt: number } | null = null

export async function getDataKey(): Promise<Buffer> {
  const now = Date.now()
  if (cachedKey && cachedKey.expiresAt > now) return cachedKey.key

  const provider = (process.env.KMS_PROVIDER || '').toLowerCase()
  let key: Buffer | null = null

  if (provider === 'aws' && process.env.AWS_KMS_KEY_ID) {
    const kms = new AwsKmsClient({})
    // Generate a 32-byte data key without returning plaintext to cloud logs
    const cmd = new GenerateDataKeyCommand({ KeyId: process.env.AWS_KMS_KEY_ID, KeySpec: 'AES_256' })
    const out = await kms.send(cmd)
    if (!out.Plaintext) throw new Error('KMS failed to generate data key')
    key = Buffer.from(out.Plaintext as Uint8Array)
  } else if (provider === 'gcp' && process.env.GCP_KMS_KEY_RESOURCE) {
    // GCP: simpler fallback — derive a DEK using KMS Encrypt over zeros (demo path); production should store a wrapped DEK
    const client = new GcpKmsClient()
    const name = process.env.GCP_KMS_KEY_RESOURCE!
    const zeros = Buffer.alloc(32, 0)
    const [enc] = await (client as any).encrypt({ name, plaintext: zeros })
    if (!enc.ciphertext) throw new Error('GCP KMS encrypt failed')
    // Use ciphertext bytes truncated/hashed to 32 bytes as DEK (demo only)
    key = Buffer.from(enc.ciphertext as Uint8Array).subarray(0, 32)
  } else {
    const b64 = process.env.APP_ENCRYPTION_KEY || ''
    if (!b64) throw new Error('No KMS configured and APP_ENCRYPTION_KEY missing')
    const raw = Buffer.from(b64, 'base64')
    if (raw.length !== 32) throw new Error('APP_ENCRYPTION_KEY must be 32 bytes base64')
    key = raw
  }

  cachedKey = { key: key!, expiresAt: now + 10 * 60 * 1000 }
  return key!
}


