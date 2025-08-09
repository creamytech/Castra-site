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

## Recent Updates

- ✅ Fixed Google API authentication and token refresh
- ✅ Added chat calendar event creation capability
- ✅ Improved UI with new theme system
- ✅ Enhanced search functionality
- ✅ Moved theme toggle to sidebar
- ✅ Fixed AssistantDock colors for better theme consistency

## License

MIT License
