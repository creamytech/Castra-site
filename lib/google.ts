import { google } from "googleapis";
import { prisma } from "./prisma";
import { isFeatureEnabled } from "./config";

export interface GmailThread {
  id: string;
  messages: Array<{
    id: string;
    snippet: string;
    payload: {
      headers: Array<{ name: string; value: string }>;
    };
    internalDate?: string;
  }>;
}

export interface CalendarEvent {
  summary: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: Array<{ email: string }>;
}

// Helper function to convert dates to ISO strings
function toISO(d?: string | null): string | null {
  if (!d) return null;
  try {
    return new Date(d).toISOString();
  } catch {
    return null;
  }
}

async function getGoogleOAuth(userId: string, sessionTokens?: { accessToken?: string; refreshToken?: string }) {
  if (!isFeatureEnabled("gmail")) {
    throw new Error("Google integration not configured");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // If session tokens are provided, use them (JWT strategy)
  if (sessionTokens?.accessToken) {
    oauth2Client.setCredentials({
      access_token: sessionTokens.accessToken,
      refresh_token: sessionTokens.refreshToken,
    });
    return oauth2Client;
  }

  // Otherwise, try to get from database (fallback for database strategy)
  if (prisma) {
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: "google",
      },
    });

    if (account?.access_token) {
      oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
      });
      return oauth2Client;
    }
  }

  throw new Error("Google account not connected - no valid tokens found");
}

export async function listRecentThreads(userId: string, maxResults: number = 10, sessionTokens?: { accessToken?: string; refreshToken?: string }) {
  try {
    const auth = await getGoogleOAuth(userId, sessionTokens);
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
              dateISO: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : null
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

export async function getThreadDetail(userId: string, threadId: string, sessionTokens?: { accessToken?: string; refreshToken?: string }): Promise<GmailThread> {
  try {
    const auth = await getGoogleOAuth(userId, sessionTokens);
    const gmail = google.gmail({ version: "v1", auth });

    const response = await gmail.users.threads.get({
      userId: "me",
      id: threadId,
    });

    const thread = response.data as GmailThread;
    
    // Add date information to messages
    thread.messages = thread.messages.map(msg => ({
      ...msg,
      dateISO: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : null
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
  htmlContent: string,
  sessionTokens?: { accessToken?: string; refreshToken?: string }
) {
  try {
    const auth = await getGoogleOAuth(userId, sessionTokens);
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
  { summary, startISO, endISO, attendees = [], timeZone = "UTC" }:
  { summary: string; startISO: string; endISO: string; attendees?: string[]; timeZone?: string },
  sessionTokens?: { accessToken?: string; refreshToken?: string }
) {
  try {
    const auth = await getGoogleOAuth(userId, sessionTokens);
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

    const event = {
      summary,
      start: { dateTime: startISO, timeZone },
      end: { dateTime: endISO, timeZone },
      attendees: attendees.map(email => ({ email })),
    };

    const { data } = await calendar.events.insert({ 
      calendarId: "primary", 
      requestBody: event 
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
    
    // Handle 401 errors (token expired) with retry logic
    if (error.code === 401 && sessionTokens?.refreshToken) {
      console.log("Token expired, attempting refresh...");
      try {
        // Clear session tokens to force database lookup
        const retryAuth = await getGoogleOAuth(userId);
        const calendar = google.calendar({ version: "v3", auth: retryAuth });
        
        const event = {
          summary,
          start: { dateTime: startISO, timeZone },
          end: { dateTime: endISO, timeZone },
          attendees: attendees.map(email => ({ email })),
        };

        const { data } = await calendar.events.insert({ 
          calendarId: "primary", 
          requestBody: event 
        });

        return { 
          id: data.id, 
          summary: data.summary, 
          startISO: data.start?.dateTime || data.start?.date,
          endISO: data.end?.dateTime || data.end?.date,
          start: data.start,
          end: data.end 
        };
      } catch (retryError) {
        console.error("Retry failed:", retryError);
        throw new Error("Authentication failed - please reconnect your Google account");
      }
    }

    // Handle specific Google API errors
    if (error.code === 403) {
      throw new Error("Calendar access denied - check Google Calendar permissions");
    }
    
    if (error.code === 400) {
      throw new Error("Invalid event data - check date format and required fields");
    }

    throw new Error(error.message || "Failed to create calendar event");
  }
}

export async function listUpcomingEvents(
  userId: string, 
  { max = 10, timeMinISO }: { max?: number; timeMinISO?: string },
  sessionTokens?: { accessToken?: string; refreshToken?: string }
) {
  try {
    const auth = await getGoogleOAuth(userId, sessionTokens);
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
