import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api";
import { createCalendarEvent } from "@/lib/google";
import { CreateEventSchema } from "@/lib/schemas/calendar";

export const dynamic = "force-dynamic";

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const body = await req.json();
    
    // Validate input with Zod schema
    const validationResult = CreateEventSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        error: "Invalid event data",
        details: validationResult.error.errors
      }, { status: 400 });
    }

    // Force default timezone America/New_York if client did not provide
    const { summary, description, start, end, timeZone = 'America/New_York', attendees, location, allDay } = validationResult.data as any;

    // Create event with proper Google Calendar format
    const event = await createCalendarEvent(ctx.session.user.id, {
      summary,
      description,
      location,
      startISO: start,
      endISO: end,
      timeZone,
      attendees: attendees || [],
      allDay
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
}, { action: 'calendar.events.create' })
