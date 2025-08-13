## Ops Optimization (Prisma)

This branch introduces caching and batching to reduce Postgres operations by ~60–80%:

- Redis read caching via `lib/cache.ts` with TTLs and pattern invalidation
- Lead list endpoint now caches per filter/page and invalidates on writes
- Indices migration `20250812000000_ops_indices` adds hot-path indexes
- Metrics at `GET /api/admin/metrics` report ops/request p50/p95 and cache hit rate

Env:

```
REDIS_URL=...
S3_ENDPOINT=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
CRON_SECRET=...
```

Migrations: If a migration fails part-way (P3009), resolve via Prisma docs, or in dev you can reset: `npx prisma migrate reset` (DANGEROUS: wipes DB).

# Castra - AI-Powered Realtor Co-Pilot

Castra is an AI-powered real estate management platform that helps realtors streamline their workflow with intelligent email management, calendar scheduling, CRM integration, and AI-powered chat assistance.

## Features

- **AI Chat Assistant**: Get help with email drafting, scheduling, and CRM tasks
- **Email Management**: Gmail integration with smart threading and summarization
- **Calendar Integration**: Google Calendar sync with intelligent event creation
- **CRM System**: Contact and lead management with email/calendar sync
- **Modern UI**: Clean, responsive design with dark/light mode support

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with Google, Okta, Azure AD
- **AI**: OpenAI GPT integration
- **Deployment**: Vercel Pro

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run the development server: `npm run dev`

## Environment Variables

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Authentication secret
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Google OAuth credentials

### Google OAuth Setup

1. In Google Cloud Console, configure OAuth consent screen: App name "Castra", support email, scopes: openid, email, profile, https://www.googleapis.com/auth/gmail.readonly, https://www.googleapis.com/auth/gmail.modify, https://www.googleapis.com/auth/calendar.readonly. Publish to production.
2. Create OAuth Client (Web), set Authorized redirect URI to `${NEXTAUTH_URL}/api/auth/callback/google`.
3. Set `.env.local` with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.
4. Verify env quickly:

```bash
pnpm ts-node --transpile-only scripts/verifyEnv.ts
```

Then visit `/login`.

### Secure Email Storage

Add the following to `.env.local`:

```
DATABASE_URL=...
REDIS_URL=...
KMS_PROVIDER=gcp|aws
GCP_KMS_KEY_RESOURCE=projects/.../locations/.../keyRings/.../cryptoKeys/...
AWS_KMS_KEY_ID=arn:aws:kms:...
OBJECT_STORE=s3|gcs
S3_BUCKET=...
GCS_BUCKET=...
APP_ENCRYPTION_KEY= # base64 32 bytes (dev fallback only)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
```

### Secure Email Storage Overview

- Metadata in Postgres; bodies/attachments encrypted in object storage
- Field-level AES-256-GCM encryption via KMS-derived DEK
- Postgres RLS isolates tenants; API sets `app.user_id` via request context
- Access tokens cached in Redis (short TTL); only encrypted refresh tokens persisted

Runbook:
- `pnpm prisma migrate dev -n "secure_email_storage"`
- Set `KMS_PROVIDER` and keys, `OBJECT_STORE` and bucket envs
- To rotate keys, invalidate app workers and refresh KMS DEK cache

## Recent Updates

- ✅ Fixed Google API authentication and token refresh
- ✅ Added chat calendar event creation capability
- ✅ Improved UI with new theme system
- ✅ Enhanced search functionality
- ✅ Moved theme toggle to sidebar
- ✅ Fixed AssistantDock colors for better theme consistency

## License

MIT License
