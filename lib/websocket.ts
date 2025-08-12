import Pusher from 'pusher'
import PusherClient from 'pusher-js'

export function getPusherServer() {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env as any
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) return null
  return new Pusher({ appId: PUSHER_APP_ID, key: PUSHER_KEY, secret: PUSHER_SECRET, cluster: PUSHER_CLUSTER, useTLS: true })
}

export function getPusherClient() {
  const { NEXT_PUBLIC_PUSHER_KEY, NEXT_PUBLIC_PUSHER_CLUSTER } = process.env as any
  if (!NEXT_PUBLIC_PUSHER_KEY || !NEXT_PUBLIC_PUSHER_CLUSTER) return null as any
  const client = new PusherClient(NEXT_PUBLIC_PUSHER_KEY, { cluster: NEXT_PUBLIC_PUSHER_CLUSTER })
  return client
}

export async function notifyUser(userId: string, event: string, payload: any) {
  const p = getPusherServer()
  if (!p) return false
  try { await p.trigger(`private-user-${userId}`, event, payload); return true } catch { return false }
}


