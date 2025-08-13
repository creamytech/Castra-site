import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { getGmailForUser } from "@/lib/google/gmail";

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

    // Get Gmail API client via centralized exchange
    const gmail = await getGmailForUser(session.user.id)

    // Build email content with user's tone and signature
    let emailContent = content;
    if (tone && tone !== "professional") {
      emailContent = `[Writing in ${tone} tone]\n\n${emailContent}`;
    }
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

    const payload = JSON.parse(JSON.stringify(draft.data));

    // Persist draft into local Message store so it appears under Drafts immediately
    const gmailId = draft.data.message?.id || undefined;
    const now = new Date();
    let dbMessageId: string | undefined = undefined;
    if (gmailId) {
      const saved = await prisma.message.upsert({
        where: { gmailId },
        update: {
          from: session.user.email || 'Me',
          subject,
          snippet: emailContent.slice(0, 180),
          internalDate: now,
          labels: ['DRAFT'],
          payload
        },
        create: {
          gmailId,
          threadId: draft.data.message?.threadId || threadId || '',
          userId: session.user.id,
          from: session.user.email || 'Me',
          subject,
          snippet: emailContent.slice(0, 180),
          internalDate: now,
          labels: ['DRAFT'],
          payload
        }
      });
      dbMessageId = saved.id;
    }

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
      dbMessageId,
      html: htmlContent,
      threadId: draft.data.message?.threadId
    });

  } catch (error: any) {
    console.error("[email-draft]", error);

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
