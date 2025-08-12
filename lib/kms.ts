import { KMSClient as AwsKmsClient, GenerateDataKeyCommand } from '@aws-sdk/client-kms'
import { KeyManagementServiceClient as GcpKmsClient, GenerateRandomBytesRequest } from '@google-cloud/kms'

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
    // GCP: use client to generate random bytes locally; real implementation should use Encrypt/Decrypt on a wrapped DEK
    const client = new GcpKmsClient()
    const req: GenerateRandomBytesRequest = { location: process.env.GCP_KMS_KEY_RESOURCE!.split('/locations/')[1]?.split('/')[0], lengthBytes: 32 }
    const [resp] = await client.generateRandomBytes(req)
    if (!resp.data) throw new Error('GCP KMS failed to generate bytes')
    key = Buffer.from(resp.data as Uint8Array)
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


