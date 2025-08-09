import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: "No session found",
        authenticated: false 
      }, { status: 401 });
    }

    // Check if Gmail feature is enabled
    const gmailEnabled = isFeatureEnabled("gmail");
    
    // Check Google account connection
    const googleAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "google"
      }
    });

    // Check environment variables
    const envVars = {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: !!process.env.GOOGLE_REDIRECT_URI,
    };

    return NextResponse.json({
      authenticated: true,
      userId: session.user.id,
      userEmail: session.user.email,
      gmailEnabled,
      googleAccount: googleAccount ? {
        id: googleAccount.id,
        provider: googleAccount.provider,
        hasAccessToken: !!googleAccount.access_token,
        hasRefreshToken: !!googleAccount.refresh_token,
        expiresAt: googleAccount.expires_at,
        scope: googleAccount.scope
      } : null,
      environment: envVars,
      session: {
        hasUser: !!session.user,
        userId: session.user?.id,
        userEmail: session.user?.email
      }
    });

  } catch (error) {
    console.error("[debug-google]", error);
    return NextResponse.json({ 
      error: "Debug failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
