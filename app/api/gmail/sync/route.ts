import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleAuthForUser } from "@/lib/gmail/client";
import { withRLS } from "@/lib/rls";
import { getLabelMap, syncSinceHistoryId } from "@/lib/gmail/history";
import { prisma } from "@/lib/securePrisma";
import { putEncryptedObject } from "@/lib/storage";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // set RLS via helper to avoid context loss and ensure MailAccount exists
    await withRLS(session.user.id, async () => {})
    const { oauth2 } = await getGoogleAuthForUser(session.user.id);
    const gmail = google.gmail({ version: 'v1', auth: oauth2 });

    // If client provides historyId, perform incremental delta sync
    const { historyId } = await request.json().catch(()=>({})) as any
    if (historyId) {
      const account = await prisma.mailAccount.findFirst({ where: { userId: session.user.id, provider: 'google' } })
      if (!account) return NextResponse.json({ error: 'no account' }, { status: 400 })
      const mailbox = await prisma.mailbox.findFirst({ where: { accountId: account.id } })
      if (!mailbox) return NextResponse.json({ error: 'no mailbox' }, { status: 400 })
      const newHistoryId = await syncSinceHistoryId(session.user.id, mailbox.id, String(historyId))
      const labels = await getLabelMap(session.user.id)
      return NextResponse.json({ success: true, newHistoryId, labels })
    }

    let nextPageToken: string | undefined = undefined;
    let totalSynced = 0;
    const maxPages = 5; // pull up to ~250 messages

    for (let page = 0; page < maxPages; page++) {
      const listRes: any = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 50,
        q: 'in:inbox newer_than:14d',
        pageToken: nextPageToken
      });

      const messages: Array<{ id?: string }> = listRes.data.messages || [];
      if (messages.length === 0) break;

      for (const message of messages) {
        try {
          // Shallow-first partial fetch
          const messageDetail: any = await gmail.users.messages.get({ userId: 'me', id: message.id!, format: 'metadata', metadataHeaders: ['From','Subject','Date','To','List-Unsubscribe','Precedence','Return-Path'], fields: 'threadId,id,snippet,payload/headers,internalDate,etag' as any });
          const headers = messageDetail.data.payload?.headers || [];
          const from = headers.find((h: any) => h.name === 'From')?.value || '';
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
          const snippet = messageDetail.data.snippet || '';
          const internalDate = new Date(parseInt(messageDetail.data.internalDate || '0'));
          const labels = messageDetail.data.labelIds || [];
          let bodyText = '';
          let bodyHtml = '';
          const likelyLead = /(tour|showing|offer|interested|schedule|budget|price|appointment)/i.test(`${subject} ${snippet}`);
          const vendorish = /(unsubscribe|list-unsubscribe|no-reply|news|promo|marketing)/i.test(JSON.stringify(headers));
          if (likelyLead && !vendorish) {
            const full = await gmail.users.messages.get({ userId: 'me', id: message.id!, format: 'full', fields: 'payload/parts,payload/body' as any });
            const parts: any[] = [];
            const walk = (p: any) => { if (!p) return; parts.push(p); (p.parts || []).forEach((pp: any) => walk(pp)) };
            walk((full.data as any).payload);
            for (const p of parts) {
              const b64 = p.body?.data; if (!b64) continue;
              const buff = Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
              const text = buff.toString('utf-8');
              if (p.mimeType?.includes('text/plain')) bodyText += text;
              if (p.mimeType?.includes('text/html')) bodyHtml += text;
            }
          }
          const payload = JSON.parse(JSON.stringify(messageDetail.data));

          // Secure storage path: create/update Thread and SecureMessage, store body to object storage
          // Map mailbox/account lazily (placeholder: single mailbox per user via account)
          const account = await prisma.mailAccount.findFirst({ where: { userId: session.user.id, provider: 'google' } })
          if (!account) continue
          // Ensure a mailbox exists per account; for simplicity, use first-or-create by account
          let mailbox = await prisma.mailbox.findFirst({ where: { accountId: account.id } })
          if (!mailbox) mailbox = await prisma.mailbox.create({ data: { accountId: account.id, email: session.user.email || 'me' } })
          const thread = await prisma.thread.upsert({ where: { providerThreadId: messageDetail.data.threadId || message.id! }, create: { providerThreadId: messageDetail.data.threadId || message.id!, mailboxId: mailbox.id, latestAt: internalDate }, update: { latestAt: internalDate } })
          let bodyRef: string | null = null
          if (bodyHtml || bodyText) {
            const objectKey = `mail/${mailbox.id}/${message.id}`
            const buf = Buffer.from(bodyHtml || bodyText, 'utf8')
            await putEncryptedObject(buf, objectKey)
            bodyRef = objectKey
          }
          await prisma.secureMessage.upsert({
            where: { providerMessageId: message.id! },
            update: { historyId: messageDetail.data.historyId || null, receivedAt: internalDate, hasAttachment: false, bodyRef },
            create: { threadId: thread.id, providerMessageId: message.id!, historyId: messageDetail.data.historyId || null, fromEnc: Buffer.from(from), toEnc: Buffer.from(''), ccEnc: null, bccEnc: null, snippetEnc: Buffer.from(snippet), receivedAt: internalDate, hasAttachment: false, bodyRef }
          })
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
