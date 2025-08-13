import { google } from "googleapis";
import { prisma } from "./prisma";
import { isFeatureEnabled } from "./config";
import { getAccessTokenForUser } from "@/lib/google/exchange";

export interface GmailThread {
  id: string;
  messages: Array<{
    id: string;
    snippet: string;
    payload: {
      headers: Array<{ name: string; value: string }>;
      parts?: Array<{
        mimeType: string;
        body: { data?: string };
        parts?: Array<{
          mimeType: string;
          body: { data?: string };
        }>;
      }>;
      body?: { data?: string };
    };
    internalDate?: string;
    dateISO?: string | null;
  }>;
}

export interface CalendarEvent {
  summary: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: Array<{ email: string }>;
}

// Helper function to extract plain text and HTML from Gmail message payload
export function extractPlainAndHtml(payload: any): { text: string; html: string } {
  let text = "";
  let html = "";

  function extractFromPart(part: any) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      text = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.mimeType === "text/html" && part.body?.data) {
      html = Buffer.from(part.body.data, 'base64').toString('utf-8');
    }

    // Recursively check nested parts
    if (part.parts) {
      part.parts.forEach(extractFromPart);
    }
  }

  // Check main body first
  if (payload.body?.data) {
    if (payload.mimeType === "text/plain") {
      text = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else if (payload.mimeType === "text/html") {
      html = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
  }

  // Check parts
  if (payload.parts) {
    payload.parts.forEach(extractFromPart);
  }

  // If we only have HTML, create a simple text version
  if (!text && html) {
    text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  return { text, html };
}

// Helper function to convert dates to ISO strings with RFC2822 header fallback
function toISO(msg: any): string | null {
  // Try internalDate first (Gmail's internal timestamp)
  if (msg.internalDate) {
    try {
      return new Date(Number(msg.internalDate)).toISOString();
    } catch {
      // Continue to header fallback
    }
  }

  // Try RFC2822 Date header
  const dateHeader = msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === "date")?.value;
  if (dateHeader) {
    try {
      return new Date(dateHeader).toISOString();
    } catch {
      // Continue to null
    }
  }

  return null;
}

export async function getGoogleOAuth(userId: string) {
  if (!isFeatureEnabled("gmail")) {
    throw new Error("Google integration not configured");
  }

  const { accessToken } = await getAccessTokenForUser(userId);
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

export async function listRecentThreads(userId: string, maxResults: number = 10) {
  try {
    const auth = await getGoogleOAuth(userId);
    const gmail = google.gmail({ version: "v1", auth });

    const response = await gmail.users.threads.list({
      userId: "me",
      maxResults,
    });

    const threads = response.data.threads || [];
    
    // Get detailed thread info including dates
    const detailedThreads = await Promise.all(
      threads.map(async (thread) => {
        try {
          const threadDetail = await getThreadDetail(userId, thread.id!);
          return {
            ...thread,
            messages: threadDetail.messages.map(msg => ({
              ...msg,
              dateISO: toISO(msg)
            }))
          };
        } catch (error) {
          console.error(`Failed to get thread detail for ${thread.id}:`, error);
          return thread;
        }
      })
    );

    return detailedThreads;
  } catch (error) {
    console.error("Failed to list threads:", error);
    throw new Error("Failed to fetch email threads");
  }
}

export async function getThreadDetail(userId: string, threadId: string): Promise<GmailThread> {
  try {
    const auth = await getGoogleOAuth(userId);
    const gmail = google.gmail({ version: "v1", auth });

    const response = await gmail.users.threads.get({
      userId: "me",
      id: threadId,
    });

    const thread = response.data as GmailThread;
    
    // Add date information to messages
    thread.messages = thread.messages.map(msg => ({
      ...msg,
      dateISO: toISO(msg)
    }));

    return thread;
  } catch (error) {
    console.error("Failed to get thread detail:", error);
    throw new Error("Failed to fetch thread details");
  }
}

export async function createDraft(
  userId: string,
  to: string,
  subject: string,
  htmlContent: string
) {
  try {
    const auth = await getGoogleOAuth(userId);
    const gmail = google.gmail({ version: "v1", auth });

    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
      "",
      htmlContent,
    ].join("\n");

    const encodedMessage = Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");

    const response = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          raw: encodedMessage,
        },
      },
    });

    return response.data;
  } catch (error) {
    console.error("Failed to create draft:", error);
    throw new Error("Failed to create email draft");
  }
}

export async function createCalendarEvent(
  userId: string,
  { summary, startISO, endISO, attendees = [], timeZone = "UTC", description, location, allDay = false }:
  { summary: string; startISO: string; endISO: string; attendees?: Array<{ email: string }> | string[]; timeZone?: string; description?: string; location?: string; allDay?: boolean }
) {
  try {
    const auth = await getGoogleOAuth(userId);
    const calendar = google.calendar({ version: "v3", auth });

    // Validate ISO strings
    const startDate = new Date(startISO);
    const endDate = new Date(endISO);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid ISO date format provided");
    }

    if (startDate >= endDate) {
      throw new Error("Start time must be before end time");
    }

    // Convert attendees to proper format
    const formattedAttendees = attendees.map(attendee => 
      typeof attendee === 'string' ? { email: attendee } : attendee
    );

    // Handle all-day events vs timed events
    const eventBody = allDay
      ? {
          summary,
          description,
          location,
          start: { date: startISO.slice(0, 10) },
          end: { date: endISO.slice(0, 10) },
          attendees: formattedAttendees
        }
      : {
          summary,
          description,
          location,
          start: { dateTime: startISO, timeZone },
          end: { dateTime: endISO, timeZone },
          attendees: formattedAttendees
        };

    const { data } = await calendar.events.insert({ 
      calendarId: "primary", 
      requestBody: eventBody 
    });

    return { 
      id: data.id, 
      summary: data.summary, 
      startISO: data.start?.dateTime || data.start?.date,
      endISO: data.end?.dateTime || data.end?.date,
      start: data.start,
      end: data.end 
    };
  } catch (error: any) {
    console.error("Failed to create calendar event:", error);
    
    // Handle specific Google API errors
    if (error.code === 401) {
      throw new Error("Authentication expired. Please reconnect your Google account.");
    }
    
    if (error.code === 403) {
      throw new Error("Calendar access denied - check Google Calendar permissions");
    }
    
    if (error.code === 400) {
      throw new Error("Invalid event data - check date format and required fields");
    }

    throw new Error(error.message || "Failed to create calendar event");
  }
}

// Returns authorized Gmail for a connectionId (Google provider)
export async function getAuthorizedGmail(connectionId: string) {
  const connection = await (prisma as any).connection?.findUnique?.({ where: { id: connectionId }, include: { user: true } })
  if (!connection) throw new Error('Connection not found')
  if (connection.provider !== 'google') throw new Error('Not a Google connection')

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.expiresAt ? Number(connection.expiresAt) * 1000 : undefined,
  })
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  return { gmail, connection, user: connection.user }
}

export async function listUpcomingEvents(
  userId: string, 
  { max = 10, timeMinISO }: { max?: number; timeMinISO?: string }
) {
  try {
    const auth = await getGoogleOAuth(userId);
    const calendar = google.calendar({ version: "v3", auth });
    
    const { data } = await calendar.events.list({
      calendarId: "primary",
      maxResults: max,
      singleEvents: true,
      orderBy: "startTime",
      timeMin: timeMinISO ?? new Date().toISOString(),
    });

    return data.items?.map(ev => ({
      id: ev.id!,
      summary: ev.summary ?? "(No title)",
      startISO: ev.start?.dateTime ?? ev.start?.date ?? null,
      endISO: ev.end?.dateTime ?? ev.end?.date ?? null,
      attendees: (ev.attendees ?? []).map(a => a.email ?? "").filter(Boolean),
      location: ev.location ?? null,
      hangoutLink: ev.hangoutLink ?? null,
    })) ?? [];
  } catch (error) {
    console.error("Failed to list upcoming events:", error);
    throw new Error("Failed to fetch calendar events");
  }
}
