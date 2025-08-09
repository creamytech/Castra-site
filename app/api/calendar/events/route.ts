import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCalendarEvent } from "@/lib/google";
import { CreateEventSchema } from "@/lib/schemas/calendar";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input with Zod schema
    const validationResult = CreateEventSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        error: "Invalid event data",
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const { summary, description, start, end, timeZone, attendees, location } = validationResult.data;

    // Create event with proper Google Calendar format
    const event = await createCalendarEvent(session.user.id, {
      summary,
      startISO: start,
      endISO: end,
      timeZone,
      attendees: attendees || []
    });

    return NextResponse.json({
      success: true,
      event,
      message: "Calendar event created successfully"
    });

  } catch (error: any) {
    console.error("[calendar-events]", error);

    const errorMessage = error.message || "Unknown error occurred";
    const statusCode = error.code === 401 ? 401 :
                      error.code === 403 ? 403 :
                      error.code === 400 ? 400 : 500;

    return NextResponse.json(
      {
        error: errorMessage,
        details: statusCode === 401 ? "Authentication failed - please reconnect your Google account" :
                 statusCode === 403 ? "Calendar access denied - check Google Calendar permissions" :
                 statusCode === 400 ? "Invalid event data - check date format and required fields" :
                 "Check if Google account is connected and tokens are valid"
      },
      { status: statusCode }
    );
  }
}
