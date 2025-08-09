import { NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function GET() {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: {
      url: config.database.url ? 'SET' : 'NOT SET',
    },
    auth: {
      secret: config.auth.secret ? 'SET' : 'NOT SET',
      url: config.auth.url,
    },
    providers: {
      okta: {
        clientId: config.okta.clientId ? 'SET' : 'NOT SET',
        clientSecret: config.okta.clientSecret ? 'SET' : 'NOT SET',
        issuer: config.okta.issuer ? 'SET' : 'NOT SET',
      },
      google: {
        clientId: config.google.clientId ? 'SET' : 'NOT SET',
        clientSecret: config.google.clientSecret ? 'SET' : 'NOT SET',
      },
      azure: {
        clientId: config.azure.clientId ? 'SET' : 'NOT SET',
        clientSecret: config.azure.clientSecret ? 'SET' : 'NOT SET',
        tenantId: config.azure.tenantId ? 'SET' : 'NOT SET',
      },
    },
    openai: {
      apiKey: config.openai.apiKey ? 'SET' : 'NOT SET',
    },
    // Check if we're in development mode
    developmentMode: process.env.NODE_ENV === 'development',
    // Check if adapter will be disabled
    adapterDisabled: process.env.NODE_ENV === 'development',
  }

  return NextResponse.json(debugInfo)
}
