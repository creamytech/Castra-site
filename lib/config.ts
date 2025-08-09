// Environment variable validation and defaults
export const config = {
  // Database
  database: {
    url: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  },

  // Authentication
  auth: {
    secret: process.env.NEXTAUTH_SECRET,
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },

  // Okta Configuration
  okta: {
    clientId: process.env.OKTA_CLIENT_ID,
    clientSecret: process.env.OKTA_CLIENT_SECRET,
    issuer: process.env.OKTA_ISSUER,
  },

  // Google Configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },

  // Azure AD Configuration
  azure: {
    clientId: process.env.AZURE_AD_CLIENT_ID,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
    tenantId: process.env.AZURE_AD_TENANT_ID,
  },

  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
}

// Validation functions
export function validateRequiredEnvVars() {
  const errors: string[] = []

  // Required for all deployments
  if (!config.database.url) {
    errors.push('DATABASE_URL or POSTGRES_URL is required')
  }
  if (!config.auth.secret) {
    errors.push('NEXTAUTH_SECRET is required')
  }
  if (!config.openai.apiKey) {
    errors.push('OPENAI_API_KEY is required')
  }

  // At least one auth provider is required
  const hasOkta = config.okta.clientId && config.okta.clientSecret && config.okta.issuer
  const hasGoogle = config.google.clientId && config.google.clientSecret
  const hasAzure = config.azure.clientId && config.azure.clientSecret && config.azure.tenantId

  if (!hasOkta && !hasGoogle && !hasAzure) {
    errors.push('At least one authentication provider (Okta, Google, or Azure AD) is required')
  }

  return errors
}

export function getAuthProviders() {
  const providers = []

  if (config.okta.clientId && config.okta.clientSecret && config.okta.issuer) {
    providers.push('okta')
  }

  if (config.google.clientId && config.google.clientSecret) {
    providers.push('google')
  }

  if (config.azure.clientId && config.azure.clientSecret && config.azure.tenantId) {
    providers.push('azure')
  }

  return providers
}

export function isFeatureEnabled(feature: 'gmail' | 'calendar' | 'crm'): boolean {
  switch (feature) {
    case 'gmail':
    case 'calendar':
      return !!(config.google.clientId && config.google.clientSecret)
    case 'crm':
      return !!config.database.url
    default:
      return false
  }
}
