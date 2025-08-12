import Pusher from 'pusher'

export function getPusherServer() {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env as any
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) return null
  return new Pusher({ appId: PUSHER_APP_ID, key: PUSHER_KEY, secret: PUSHER_SECRET, cluster: PUSHER_CLUSTER, useTLS: true })
}

export async function notifyUser(userId: string, event: string, payload: any) {
  const p = getPusherServer()
  if (!p) return false
  try { await p.trigger(`private-user-${userId}`, event, payload); return true } catch { return false }
}


