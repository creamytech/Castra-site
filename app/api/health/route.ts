import { NextResponse } from 'next/server'
import { validateRequiredEnvVars, getAuthProviders, isFeatureEnabled } from '@/lib/config'

export async function GET() {
  const errors = validateRequiredEnvVars()
  const authProviders = getAuthProviders()
  
  const health = {
    status: errors.length === 0 ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: {
      gmail: isFeatureEnabled('gmail'),
      calendar: isFeatureEnabled('calendar'),
      crm: isFeatureEnabled('crm'),
    },
    auth: {
      providers: authProviders,
      configured: authProviders.length > 0,
    },
    errors: errors.length > 0 ? errors : undefined,
  }

  return NextResponse.json(health, {
    status: errors.length === 0 ? 200 : 503,
  })
}
