"use client";
import { mutate } from 'swr'
import { apiPOST } from '@/lib/http'
import { useToast } from '@/components/ui/ToastProvider'

export function useBookSlot(leadId: string) {
  const { push, dismiss } = useToast();

  async function book(start: string, end: string) {
    const key = `/api/thread/${leadId}/bundle`
    mutate(key, (prev: any) => {
      if (!prev) return prev
      const optimistic = { ...prev }
      optimistic.schedule = optimistic.schedule || {}
      optimistic.schedule.event = { id: 'pending', start, end }
      return optimistic
    }, false)

    const toastId = push({ title: 'Invite scheduled', message: 'Sending reply + calendar invite…', variant: 'info', ttlMs: 10000 })

    try {
      const res = await apiPOST<{ ok: boolean; event: { id: string; htmlLink: string } }>(`/api/schedule/book`, { leadId, start, end })
      mutate(key, (prev: any) => ({ ...prev, schedule: { ...(prev?.schedule||{}), event: res.event } }), false)
      dismiss(toastId)
      push({ variant: 'success', message: 'Invite sent', actionLabel: 'Open', onAction: ()=> window.open(res.event.htmlLink, '_blank') })
    } catch (e: any) {
      await mutate(key)
      dismiss(toastId)
      push({ variant: 'error', title: 'Failed to send invite', message: e?.message || 'Please try again.' })
    }
  }

  return { book }
}


