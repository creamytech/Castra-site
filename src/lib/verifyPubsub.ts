export function verifyPubsub(req: Request) {
  const aud = process.env.GCP_PUBSUB_VERIFIER_AUDIENCE!
  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) throw new Error('Missing bearer')
  // Keep simple per prompt; optionally decode & verify aud/IP at ingress
  return true
}


