import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId, to, subject, content } = await request.json();

    if (!to || !subject || !content) {
      return NextResponse.json({ 
        error: "To, subject, and content are required" 
      }, { status: 400 });
    }

    // Get user's memory (tone, signature, etc.)
    const memories = await prisma.memory.findMany({
      where: { userId: session.user.id }
    });

    const tone = memories.find(m => m.key === "tone")?.value || "professional";
    const signature = memories.find(m => m.key === "signature")?.value || "";
    const persona = memories.find(m => m.key === "persona")?.value || "";

    // Get Gmail API client
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "google" }
    });

    if (!account?.access_token) {
      return NextResponse.json({ error: "Google account not connected" }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Build email content with user's tone and signature
    let emailContent = content;
    
    // Apply tone if specified
    if (tone && tone !== "professional") {
      emailContent = `[Writing in ${tone} tone]\n\n${emailContent}`;
    }

    // Add signature if available
    if (signature) {
      emailContent += `\n\n${signature}`;
    }

    // Create email message
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      emailContent
    ].join('\n');

    const encodedMessage = Buffer.from(message).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Create draft
    const draft = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: encodedMessage,
          threadId: threadId || undefined
        }
      }
    });

    // Generate HTML preview
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; margin-bottom: 20px;">
          <strong>To:</strong> ${to}<br>
          <strong>Subject:</strong> ${subject}
        </div>
        <div style="line-height: 1.6; white-space: pre-wrap;">
          ${emailContent.replace(/\n/g, '<br>')}
        </div>
      </div>
    `;

    return NextResponse.json({
      draftId: draft.data.id,
      messageId: draft.data.message?.id,
      html: htmlContent,
      threadId: draft.data.message?.threadId
    });

  } catch (error: any) {
    console.error("[email-draft]", error);
    
    // Handle token refresh if needed
    if (error.code === 401) {
      return NextResponse.json({ 
        error: "Authentication expired. Please reconnect your Google account." 
      }, { status: 401 });
    }

    return NextResponse.json({ 
      error: "Failed to create email draft" 
    }, { status: 500 });
  }
}
