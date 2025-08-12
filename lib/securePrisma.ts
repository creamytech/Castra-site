import { PrismaClient } from '@prisma/client'
import { getDataKey } from './kms'
import { encrypt, decrypt } from './crypto'

const SENSITIVE: Record<string, string[]> = {
  MailAccount: ['refreshTokenEnc'],
  Thread: ['subjectEnc'],
  SecureMessage: ['fromEnc','toEnc','ccEnc','bccEnc','snippetEnc'],
}

export const prisma = new PrismaClient({ log: ['error','warn'] })

prisma.$use(async (params, next) => {
  // Place for optional tenant guard checks
  return next(params)
})

function toModelClient(model: string): any {
  const key = model.charAt(0).toLowerCase() + model.slice(1)
  return (prisma as any)[key]
}

export async function createSecure(model: keyof typeof SENSITIVE | string, data: any) {
  const key = await getDataKey()
  const fields = SENSITIVE[model as string] ?? []
  for (const f of fields) if (data[f] && !(data[f] instanceof Buffer)) data[f] = encrypt(Buffer.from(String(data[f])), key)
  const client = toModelClient(model as string)
  return client.create({ data })
}

export async function updateSecure(model: keyof typeof SENSITIVE | string, args: any) {
  const key = await getDataKey()
  const fields = SENSITIVE[model as string] ?? []
  const data = args?.data || {}
  for (const f of fields) if (data[f] && !(data[f] instanceof Buffer)) data[f] = encrypt(Buffer.from(String(data[f])), key)
  const client = toModelClient(model as string)
  return client.update({ ...args, data })
}

export async function decodeEntity(model: keyof typeof SENSITIVE | string, row: any) {
  if (!row) return row
  const key = await getDataKey()
  const fields = SENSITIVE[model as string] ?? []
  for (const f of fields) if (row?.[f]) row[f] = decrypt(row[f], key).toString()
  return row
}

export async function decodeEntities(model: keyof typeof SENSITIVE | string, rows: any[]) {
  const key = await getDataKey()
  const fields = SENSITIVE[model as string] ?? []
  for (const row of rows) for (const f of fields) if (row?.[f]) row[f] = decrypt(row[f], key).toString()
  return rows
}


