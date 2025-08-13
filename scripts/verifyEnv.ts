/*
  Usage: ts-node --transpile-only scripts/verifyEnv.ts
*/

type EnvSpec = {
  key: string
  required: boolean
  note?: string
}

const envs: EnvSpec[] = [
  { key: 'DATABASE_URL', required: true },
  { key: 'NEXTAUTH_URL', required: true, note: 'e.g., http://localhost:3000 in dev' },
  { key: 'NEXTAUTH_SECRET', required: true },
  { key: 'GOOGLE_CLIENT_ID', required: true },
  { key: 'GOOGLE_CLIENT_SECRET', required: true },
  { key: 'GOOGLE_OAUTH_REDIRECT', required: false, note: 'Defaults to /api/auth/callback/google based on NEXTAUTH_URL' },
  { key: 'REDIS_URL', required: false },
  { key: 'REDIS_TOKEN', required: false },
  { key: 'GCP_PROJECT_ID', required: false },
  { key: 'GCP_CLIENT_EMAIL', required: false },
  { key: 'GCP_PRIVATE_KEY', required: false },
]

function main() {
  const missing: string[] = []
  for (const e of envs) {
    const val = process.env[e.key]
    if (e.required && (!val || val.trim() === '')) missing.push(`${e.key}${e.note ? ` - ${e.note}` : ''}`)
  }

  if (missing.length > 0) {
    console.error('Missing required environment variables:\n- ' + missing.join('\n- '))
    process.exit(1)
  }

  // Quick sanity for redirect URI
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, '')
  const redirect = process.env.GOOGLE_OAUTH_REDIRECT || `${base}/api/auth/callback/google`
  console.log('Environment OK. Google OAuth redirect:', redirect)
}

main()


