export async function sendDM(_accessToken: string, igUserId: string, text: string) {
  // TODO: integrate Meta Graph API for IG messaging
  return { ok: false, igUserId, text }
}

export async function fetchRecentDMs(_accessToken: string, _igUserId: string) {
  return []
}
