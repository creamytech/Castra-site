import { z } from 'zod'

export function parseOr400<T extends z.ZodTypeAny>(schema: T, data: unknown) {
  const r = schema.safeParse(data)
  if (!r.success) {
    const msg = r.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')
    const err = new Error(msg)
    ;(err as any).status = 400
    throw err
  }
  return r.data
}

export const dealCreateSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['BUYER','SELLER','RENTAL']).optional(),
  stage: z.enum(['LEAD','QUALIFIED','SHOWING','OFFER','ESCROW','CLOSED','LOST']).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  priceTarget: z.number().int().optional(),
  contactId: z.string().optional(),
})

export const calendarEventSchema = z.object({
  summary: z.string().min(1),
  startISO: z.string().min(1),
  endISO: z.string().min(1),
})


