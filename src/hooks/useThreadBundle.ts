import useSWR from 'swr'
import { apiGET } from '@/src/lib/http'

export type ThreadBundle = {
  lead: any
  schedule: { proposedWindows?: { start: string; end: string }[]; event?: any } | null
  draft: any | null
}

export function useThreadBundle(leadId: string) {
  const key = leadId ? `/api/thread/${leadId}/bundle` : null
  const swr = useSWR<ThreadBundle>(key, apiGET, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  })
  return swr
}


