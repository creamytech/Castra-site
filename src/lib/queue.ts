import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })
export const mailQueue = new Queue('mail', { connection })
export const gmailQueue = new Queue('gmail', { connection })
// Note: bullmq v5 no longer requires a separate scheduler in many setups;
// if needed, instantiate QueueScheduler from your version.

// Helper to create workers elsewhere
export function createWorker(processor: (job: any) => Promise<any> | any) {
  return new Worker('mail', processor as any, { connection })
}

export function createGmailWorker(processor: (job: any) => Promise<any> | any) {
  return new Worker('gmail', processor as any, { connection, concurrency: 3 })
}


