export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleClientsForUser } from "@/lib/google/getClient";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { offerSdp, model, voice: voiceOverride } = await req.json();
    if (!offerSdp) return NextResponse.json({ error: "Missing offerSdp" }, { status: 400 });

    const useModel = model || (process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview-2024-12-17");
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    let profile = await prisma.userProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile) {
      profile = await prisma.userProfile.create({
        data: {
          userId: session.user.id,
          displayName: session.user.name ?? null,
          styleGuide: {
            tone: "friendly",
            formality: 4,
            emojis: false,
            phrases: [],
            sentenceLength: "medium",
            description: "Concise, helpful real estate tone.",
          },
          voice: "verse",
          hotwordOn: true,
        },
      });
    }
    const sg = (profile.styleGuide as any) ?? {};
    // Pull lightweight context
    const [recentThreads, upcomingEvents, hotDeals] = await Promise.all([
      prisma.emailThread.findMany({ where: { userId: session.user.id }, orderBy: { lastSyncedAt: 'desc' }, take: 5 }),
      (async () => {
        try { const { calendar } = await getGoogleClientsForUser(session.user.id); const cal = await calendar.events.list({ calendarId: 'primary', maxResults: 3, singleEvents: true, orderBy: 'startTime', timeMin: new Date().toISOString() }); return (cal.data.items||[]).map(i=>i.summary).filter(Boolean) } catch { return [] as string[] }
      })(),
      prisma.deal.findMany({ where: { userId: session.user.id }, orderBy: { updatedAt: 'desc' }, take: 5, select: { title: true, stage: true } })
    ])
    const inboxSubjects = recentThreads.map(t => t.subject).filter(Boolean).slice(0,5)
    const hotTitles = hotDeals.map(d => `${d.title} (${d.stage})`)
    const instructions = `You are Castra, a voice-enabled real estate assistant.
Tone: ${sg.tone ?? 'friendly'}; Formality: ${sg.formality ?? 4}; Emojis: ${sg.emojis ? 'allowed' : 'avoid'}.
Style: ${sg.description ?? 'Concise, conversational, helpful.'}
Context:
- Recent inbox subjects: ${inboxSubjects.join(' | ') || 'none'}
- Upcoming events: ${upcomingEvents.join(' | ') || 'none'}
- Top deals: ${hotTitles.join(' | ') || 'none'}
Use server tools only (no secrets in client): /api/messaging/email/send, /api/calendar/events, /api/inbox/threads, /api/deals/**. Keep spoken responses <20s.`;

    // Create ephemeral session to obtain ephemeral key
    const ep = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: useModel,
        voice: voiceOverride || profile.voice || "verse",
        instructions,
      }),
    });

    const epText = await ep.text();
    if (!ep.ok) {
      return NextResponse.json({ error: "Failed to create ephemeral session", body: epText }, { status: 502 });
    }
    const epJson = JSON.parse(epText);
    const ephemeralKey = epJson?.client_secret?.value;
    if (!ephemeralKey) {
      return NextResponse.json({ error: "Missing ephemeral key in session response", body: epText }, { status: 502 });
    }

    // Post SDP offer to the realtime endpoint with ephemeral key
    const realtimeUrl = `https://api.openai.com/v1/realtime?model=${encodeURIComponent(useModel)}`;
    const answerResp = await fetch(realtimeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        "Content-Type": "application/sdp",
      },
      body: String(offerSdp),
    });

    const answerText = await answerResp.text();
    if (!answerResp.ok) {
      return new NextResponse(
        JSON.stringify({ error: "Realtime SDP exchange failed", status: answerResp.status, body: answerText }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new NextResponse(answerText, { status: 200, headers: { "Content-Type": "application/sdp" } });
  } catch (e: any) {
    return NextResponse.json({ error: "SDP proxy error", detail: e?.message ?? String(e) }, { status: 500 });
  }
}


