import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL || '', { maxRetriesPerRequest: null })

export const leadQueue = new Queue('leads', { connection })
export const leadEvents = new QueueEvents('leads', { connection })

export function addLeadJob(name: string, data: any, opts: JobsOptions = {}) {
  return leadQueue.add(name, data, { removeOnComplete: 1000, removeOnFail: 1000, ...opts })
}

export function createWorker(processor: (job: any) => Promise<any>) {
  const worker = new Worker('leads', processor, { connection, concurrency: 5 })
  worker.on('failed', (job, err) => { console.error('[lead job failed]', job?.id, err) })
  worker.on('completed', (job) => { /* noop */ })
  return worker
}


