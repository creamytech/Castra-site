import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { Storage } from '@google-cloud/storage'
import { getDataKey } from './kms'
import { encrypt, decrypt } from './crypto'

function s3() {
  return new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })
}

function gcs() {
  const projectId = process.env.GCP_PROJECT_ID
  const clientEmail = process.env.GCP_CLIENT_EMAIL
  const rawKey = process.env.GCP_PRIVATE_KEY || ''
  const privateKey = rawKey.includes('\n') ? rawKey.replace(/\\n/g, '\n') : rawKey
  const hasCreds = !!(clientEmail && privateKey)
  const opts: any = hasCreds ? { projectId, credentials: { client_email: clientEmail, private_key: privateKey } } : {}
  return new Storage(opts)
}

export async function putEncryptedObject(buffer: Buffer, objectKey: string) {
  const dek = await getDataKey()
  const blob = encrypt(buffer, dek)
  const provider = (process.env.OBJECT_STORE || '').toLowerCase()
  if (provider === 's3') {
    const bucket = process.env.S3_BUCKET!
    const cmd = new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: blob })
    await s3().send(cmd)
  } else if (provider === 'gcs') {
    const bucket = process.env.GCS_BUCKET!
    await gcs().bucket(bucket).file(objectKey).save(blob)
  } else {
    throw new Error('OBJECT_STORE not configured')
  }
  return { objectKey }
}

export async function getDecryptedObject(objectKey: string): Promise<Buffer> {
  const dek = await getDataKey()
  const provider = (process.env.OBJECT_STORE || '').toLowerCase()
  let blob: Buffer
  if (provider === 's3') {
    const bucket = process.env.S3_BUCKET!
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: objectKey })
    const res = await s3().send(cmd)
    const arr = await (res.Body as any).transformToByteArray()
    blob = Buffer.from(arr)
  } else if (provider === 'gcs') {
    const bucket = process.env.GCS_BUCKET!
    const [buf] = await gcs().bucket(bucket).file(objectKey).download()
    blob = buf
  } else {
    throw new Error('OBJECT_STORE not configured')
  }
  return decrypt(blob, dek)
}

export async function deleteObject(objectKey: string): Promise<void> {
  const provider = (process.env.OBJECT_STORE || '').toLowerCase()
  if (provider === 's3') {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')
    await s3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: objectKey }))
    return
  }
  if (provider === 'gcs') {
    await gcs().bucket(process.env.GCS_BUCKET!).file(objectKey).delete({ ignoreNotFound: true })
    return
  }
  throw new Error('OBJECT_STORE not configured')
}


