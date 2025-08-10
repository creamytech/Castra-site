import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleOAuth } from "@/lib/google";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const oauth2Client = await getGoogleOAuth(session.user.id);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    let nextPageToken: string | undefined = undefined;
    let totalSynced = 0;
    const maxPages = 5; // pull up to ~250 messages

    for (let page = 0; page < maxPages; page++) {
      const listRes: any = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 50,
        q: 'in:anywhere',
        pageToken: nextPageToken
      });

      const messages: Array<{ id?: string }> = listRes.data.messages || [];
      if (messages.length === 0) break;

      for (const message of messages) {
        try {
          const messageDetail: any = await gmail.users.messages.get({ userId: 'me', id: message.id! });
          const headers = messageDetail.data.payload?.headers || [];
          const from = headers.find((h: any) => h.name === 'From')?.value || '';
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
          const snippet = messageDetail.data.snippet || '';
          const internalDate = new Date(parseInt(messageDetail.data.internalDate || '0'));
          const labels = messageDetail.data.labelIds || [];
          const payload = JSON.parse(JSON.stringify(messageDetail.data));

          await prisma.message.upsert({
            where: { gmailId: message.id! },
            update: { from, subject, snippet, internalDate, labels, payload },
            create: {
              gmailId: message.id!,
              threadId: messageDetail.data.threadId || '',
              userId: session.user.id,
              from, subject, snippet, internalDate, labels, payload
            }
          });
          totalSynced++;
        } catch (e) {
          console.error(`Error syncing message ${message.id}:`, e);
        }
      }

      nextPageToken = listRes.data.nextPageToken || undefined;
      if (!nextPageToken) break;
    }

    return NextResponse.json({ success: true, syncedCount: totalSynced });

  } catch (error: any) {
    console.error("[gmail-sync]", error);
    return NextResponse.json({ error: error.message || "Failed to sync Gmail messages" }, { status: 500 });
  }
}

function buildFolderWhere(userId: string, folder: string) {
  // Default to INBOX view
  const base: any = { userId };
  switch (folder) {
    case 'UNREAD':
      return { ...base, labels: { has: 'UNREAD' } };
    case 'READ':
      return { ...base, NOT: { labels: { has: 'UNREAD' } } };
    case 'SPAM':
      return { ...base, labels: { has: 'SPAM' } };
    case 'DRAFT':
    case 'DRAFTS':
      return { ...base, labels: { has: 'DRAFT' } };
    case 'TRASH':
      return { ...base, labels: { has: 'TRASH' } };
    case 'STARRED':
      return { ...base, labels: { has: 'STARRED' } };
    case 'INBOX':
    default:
      return { ...base, labels: { has: 'INBOX' } };
  }
}

function extractEmail(from: string): string | null {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase();
  if (from.includes('@')) return from.toLowerCase();
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const folder = (searchParams.get('label') || 'INBOX').toUpperCase();

    // Direct id lookups
    if (q.startsWith('id:')) {
      const id = q.slice(3);
      const message = await prisma.message.findFirst({ where: { id, userId: session.user.id } });
      return NextResponse.json({ success: true, messages: message ? [message] : [], count: message ? 1 : 0 });
    }
    if (q.startsWith('gmail:')) {
      const gmailId = q.slice(6);
      const message = await prisma.message.findFirst({ where: { gmailId, userId: session.user.id } });
      return NextResponse.json({ success: true, messages: message ? [message] : [], count: message ? 1 : 0 });
    }

    // Build where clause
    const whereBase = buildFolderWhere(session.user.id, folder);

    // Get messages from database with optional search
    const messages = await prisma.message.findMany({
      where: {
        ...whereBase,
        ...(q && {
          OR: [
            { subject: { contains: q, mode: 'insensitive' } },
            { from: { contains: q, mode: 'insensitive' } },
            { snippet: { contains: q, mode: 'insensitive' } }
          ]
        })
      },
      orderBy: { internalDate: 'desc' },
      take: limit
    });

    // Compute mailbox counts
    const [inboxCount, unreadCount, readCount, spamCount, draftsCount, trashCount] = await Promise.all([
      prisma.message.count({ where: { userId: session.user.id, labels: { has: 'INBOX' } } }),
      prisma.message.count({ where: { userId: session.user.id, labels: { has: 'UNREAD' } } }),
      prisma.message.count({ where: { userId: session.user.id, NOT: { labels: { has: 'UNREAD' } } } }),
      prisma.message.count({ where: { userId: session.user.id, labels: { has: 'SPAM' } } }),
      prisma.message.count({ where: { userId: session.user.id, labels: { has: 'DRAFT' } } }),
      prisma.message.count({ where: { userId: session.user.id, labels: { has: 'TRASH' } } }),
    ]);

    // AI/CRM auto-tags (compute on the fly)
    const enriched = [] as any[];
    for (const m of messages) {
      const autoTags: string[] = [];
      const email = extractEmail(m.from);
      if (email) {
        const contact = await prisma.contact.findFirst({ where: { userId: session.user.id, email: { equals: email, mode: 'insensitive' } } });
        if (contact) autoTags.push('contact');
        const lead = await prisma.lead.findFirst({ where: { userId: session.user.id, contact: { email: { equals: email, mode: 'insensitive' } } } });
        if (lead) {
          autoTags.push('lead');
          if (lead.status && lead.status.toLowerCase().includes('hot')) autoTags.push('hot-lead');
        }
      }
      enriched.push({ ...m, autoTags });
    }

    return NextResponse.json({
      success: true,
      messages: enriched,
      count: enriched.length,
      counts: {
        inbox: inboxCount,
        unread: unreadCount,
        read: readCount,
        spam: spamCount,
        drafts: draftsCount,
        trash: trashCount,
      },
      lastSynced: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("[gmail-sync-get]", error);

    return NextResponse.json(
      { error: error.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
