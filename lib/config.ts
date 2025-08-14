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
  // Feature flags
  features: {
    // Set DISABLE_GOOGLE=1 to hard-disable Google/Gmail/Calendar across the app
    googleDisabled: process.env.DISABLE_GOOGLE === '1' || process.env.GOOGLE_DISABLED === '1',
  },

  // DocuSign Configuration
  docusign: {
    integratorKey: process.env.DOCUSIGN_INTEGRATOR_KEY,
    userId: process.env.DOCUSIGN_USER_ID, // API User GUID
    accountId: process.env.DOCUSIGN_ACCOUNT_ID,
    privateKey: process.env.DOCUSIGN_PRIVATE_KEY, // base64 or raw
    basePath: process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi',
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

  if (!config.database.url) {
    errors.push('DATABASE_URL or POSTGRES_URL is required')
  }
  if (!config.auth.secret) {
    errors.push('NEXTAUTH_SECRET is required')
  }
  if (!config.openai.apiKey) {
    errors.push('OPENAI_API_KEY is required')
  }

  return errors
}

export function getAuthProviders() {
  const providers = []

  if (config.okta.clientId && config.okta.clientSecret && config.okta.issuer) {
    providers.push('okta')
  }

  if (!config.features.googleDisabled && config.google.clientId && config.google.clientSecret) {
    providers.push('google')
  }

  if (config.azure.clientId && config.azure.clientSecret && config.azure.tenantId) {
    providers.push('azure')
  }

  return providers
}

export function isFeatureEnabled(feature: 'gmail' | 'calendar' | 'crm' | 'docusign'): boolean {
  switch (feature) {
    case 'gmail':
    case 'calendar':
      return !config.features.googleDisabled && !!(config.google.clientId && config.google.clientSecret)
    case 'crm':
      return !!config.database.url
    case 'docusign':
      return !!(config.docusign.integratorKey && config.docusign.userId && config.docusign.accountId && config.docusign.privateKey)
    default:
      return false
  }
}
