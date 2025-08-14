import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { isFeatureEnabled } from '@/lib/config'

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
	try {
		if (!isFeatureEnabled('gmail')) {
			return NextResponse.json({ error: 'Gmail disabled' }, { status: 503 })
		}
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { draftId } = await request.json();

		if (!draftId) {
			return NextResponse.json({ error: "Draft ID is required" }, { status: 400 });
		}

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

		// Send the draft
		const sentMessage = await gmail.users.drafts.send({
			userId: 'me',
			requestBody: {
				id: draftId
			}
		});

		// Log the sent email for tracking
		await prisma.emailLog.create({
			data: {
				userId: session.user.id,
				messageId: sentMessage.data.id || '',
				threadId: sentMessage.data.threadId || '',
				action: 'SENT',
				timestamp: new Date()
			}
		});

		return NextResponse.json({
			success: true,
			messageId: sentMessage.data.id,
			threadId: sentMessage.data.threadId
		});

	} catch (error: any) {
		console.error("[email-send]", error);
		
		// Handle token refresh if needed
		if (error.code === 401) {
			return NextResponse.json({ 
				error: "Authentication expired. Please reconnect your Google account." 
			}, { status: 401 });
		}

		return NextResponse.json({ 
			error: "Failed to send email" 
		}, { status: 500 });
	}
}
