import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api";
import { getThreadDetail, extractPlainAndHtml } from "@/lib/google";

export const dynamic = "force-dynamic";

export const GET = withAuth(async ({ ctx }, { params }: any) => {
  try {
    const thread = await getThreadDetail(ctx.session.user.id, params.id);

    if (!thread.messages || thread.messages.length === 0) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Get the latest message
    const latestMessage = thread.messages[thread.messages.length - 1];
    
    // Extract headers
    const headers = latestMessage.payload?.headers || [];
    const subject = headers.find(h => h.name.toLowerCase() === "subject")?.value || "";
    const from = headers.find(h => h.name.toLowerCase() === "from")?.value || "";
    const to = headers.find(h => h.name.toLowerCase() === "to")?.value || "";
    const date = headers.find(h => h.name.toLowerCase() === "date")?.value || "";

    // Extract content
    const { text, html } = extractPlainAndHtml(latestMessage.payload);

    return NextResponse.json({
      threadId: params.id,
      subject,
      from,
      to,
      dateISO: latestMessage.dateISO,
      headers,
      text,
      html,
      snippet: latestMessage.snippet,
      messageCount: thread.messages.length
    });
  } catch (error) {
    console.error("[email-thread]", error);
    return NextResponse.json({ error: "Failed to fetch thread details" }, { status: 500 });
  }
}, { action: 'email.thread' })
