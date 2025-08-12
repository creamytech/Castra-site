import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),
  OPENAI_API_KEY: z.string().min(10),
  GOOGLE_CLIENT_ID: z.string().min(10),
  GOOGLE_CLIENT_SECRET: z.string().min(10),
  REDIS_URL: z.string().url().optional(),
  CRON_SECRET: z.string().optional(),
})

export const env = (() => {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const formatted = parsed.error.flatten().fieldErrors
    const missing = Object.entries(formatted)
      .filter(([, v]) => v && v.length > 0)
      .map(([k]) => k)
    throw new Error(`Invalid env: missing or invalid ${missing.join(", ")}`)
  }
  return parsed.data
})()


