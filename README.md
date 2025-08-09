# Castra - AI-Powered Realtor Co-Pilot

Castra is a comprehensive AI assistant for real estate professionals, featuring email management, calendar scheduling, CRM integration, and intelligent property descriptions.

## 🚀 Features

- **AI Email Assistant**: Summarize threads, draft responses, and manage Gmail/Outlook
- **Smart Scheduling**: AI-powered calendar suggestions with one-click booking
- **CRM Integration**: Contact and lead management with AI insights
- **Property Descriptions**: Generate fair-housing compliant property blurbs
- **Document Preparation**: Professional email templates and previews
- **Multi-Provider Auth**: Okta, Google, and Azure AD support
- **Role-Based Access**: Admin controls with Okta group integration

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **AI**: OpenAI GPT-4
- **Email/Calendar**: Google APIs, Microsoft Graph
- **Caching**: In-memory LRU cache (24h TTL)

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Okta, Google, or Azure AD account
- OpenAI API key

## 🔧 Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd castra
npm install
```

### 2. Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/castra"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key"

# Okta Configuration (Optional)
OKTA_CLIENT_ID="your-okta-client-id"
OKTA_CLIENT_SECRET="your-okta-client-secret"
OKTA_ISSUER="https://your-domain.okta.com"

# Google Configuration (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Azure AD Configuration (Optional)
AZURE_AD_CLIENT_ID="your-azure-client-id"
AZURE_AD_CLIENT_SECRET="your-azure-client-secret"
AZURE_AD_TENANT_ID="your-azure-tenant-id"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Run migrations
npm run db:migrate
```

### 4. Authentication Setup

#### Okta Setup

1. **Create Okta Application**:
   - Log into your Okta admin console
   - Go to Applications → Applications
   - Click "Create App Integration"
   - Choose "OIDC - OpenID Connect" and "Web Application"
   - Set application name: "Castra"

2. **Configure Application**:
   - **Base URIs**: `http://localhost:3000`
   - **Redirect URIs**: `http://localhost:3000/api/auth/callback/okta`
   - **Logout redirect URIs**: `http://localhost:3000`

3. **Assign Users**:
   - Go to Assignments tab
   - Assign users or groups to the application

4. **Get Credentials**:
   - Copy Client ID and Client Secret from the General tab
   - Note your Okta domain for the issuer URL

5. **Configure Groups** (Optional):
   - Create groups in Okta for role-based access
   - Add users to groups as needed

#### Google Setup

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API and Gmail API

2. **Create OAuth 2.0 Credentials**:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`

3. **Get Credentials**:
   - Copy Client ID and Client Secret

#### Azure AD Setup

1. **Register Application**:
   - Go to [Azure Portal](https://portal.azure.com/)
   - Navigate to Azure Active Directory → App registrations
   - Click "New registration"
   - Name: "Castra"
   - Supported account types: "Accounts in this organizational directory only"

2. **Configure Authentication**:
   - Go to Authentication
   - Add platform: "Web"
   - **Redirect URIs**: `http://localhost:3000/api/auth/callback/azure-ad`

3. **Create Client Secret**:
   - Go to Certificates & secrets
   - Click "New client secret"
   - Copy the secret value

4. **Get Credentials**:
   - Copy Application (client) ID
   - Copy Directory (tenant) ID
   - Copy the client secret

### 5. OpenAI Setup

1. **Get API Key**:
   - Go to [OpenAI Platform](https://platform.openai.com/)
   - Navigate to API Keys
   - Create a new secret key
   - Copy the key (starts with `sk-`)

### 6. PostgreSQL Setup

#### Local Development

1. **Install PostgreSQL**:
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql

   # Ubuntu
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Create Database**:
   ```bash
   sudo -u postgres psql
   CREATE DATABASE castra;
   CREATE USER castra_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE castra TO castra_user;
   \q
   ```

#### Production (Recommended)

Use a managed PostgreSQL service:
- **Vercel Postgres**: Easy integration with Vercel deployments
- **Supabase**: Free tier available, great for development
- **Neon**: Serverless PostgreSQL
- **AWS RDS**: Enterprise-grade managed database

### 7. Run the Application

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

### 8. Health Check

Verify your setup by visiting:
- **Health endpoint**: `http://localhost:3000/api/health`
- **Application**: `http://localhost:3000`

## 🔍 Environment Validation

The application includes built-in environment validation:

- **Health Check**: `/api/health` returns system status
- **Feature Detection**: Automatically detects available providers
- **Graceful Degradation**: Features unavailable if providers not configured

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**:
   - Push code to GitHub/GitLab
   - Connect repository to Vercel

2. **Configure Environment Variables**:
   - Add all environment variables in Vercel dashboard
   - Use production URLs for redirect URIs

3. **Deploy**:
   - Vercel automatically builds and deploys
   - Update redirect URIs in auth providers

### Other Platforms

- **Railway**: Easy PostgreSQL + Node.js deployment
- **Render**: Free tier available
- **Heroku**: Traditional platform deployment
- **AWS/GCP**: Enterprise deployments

## 🔧 Development

```bash
# Database commands
npm run db:generate    # Generate Prisma client
npm run db:push       # Push schema changes
npm run db:migrate    # Run migrations
npm run db:studio     # Open Prisma Studio

# Development
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
```

## 📁 Project Structure

```
castra/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard
│   ├── chat/              # AI chat interface
│   ├── connect/           # Account connection
│   ├── crm/               # CRM management
│   └── inbox/             # Email management
├── components/             # React components
├── lib/                    # Utility libraries
│   ├── cache.ts           # Thread summary cache
│   ├── config.ts          # Environment config
│   ├── google.ts          # Google API integration
│   ├── mls.ts             # Property data
│   ├── prisma.ts          # Database client
│   ├── rbac.ts            # Role-based access
│   └── tools.ts           # AI tools
├── prisma/                 # Database schema
└── types/                  # TypeScript types
```

## 🔒 Security Features

- **Multi-tenant**: Data scoped by user ID
- **RBAC**: Role-based access control with Okta groups
- **Session Management**: JWT-based sessions
- **API Protection**: All routes require authentication
- **Environment Validation**: Comprehensive config checking

## 🎯 Business Logic Guardrails

- **Draft-only emails**: Never send directly, always create drafts
- **No legal advice**: AI avoids legal recommendations
- **Fair housing compliant**: Property descriptions follow guidelines
- **Rate limiting**: Respect API limits and caching
- **Data privacy**: User-scoped data access

## 📞 Support

For issues and questions:
- Check the health endpoint: `/api/health`
- Review environment variables
- Verify database connection
- Check authentication provider configuration

## 📄 License

[Your License Here]
