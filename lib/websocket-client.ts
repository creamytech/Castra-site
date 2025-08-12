import PusherClient from 'pusher-js'

export function getPusherClient() {
  if (typeof window === 'undefined') return null
  const { NEXT_PUBLIC_PUSHER_KEY, NEXT_PUBLIC_PUSHER_CLUSTER } = process.env as any
  if (!NEXT_PUBLIC_PUSHER_KEY || !NEXT_PUBLIC_PUSHER_CLUSTER) return null as any
  const client = new PusherClient(NEXT_PUBLIC_PUSHER_KEY, { cluster: NEXT_PUBLIC_PUSHER_CLUSTER })
  return client
}


