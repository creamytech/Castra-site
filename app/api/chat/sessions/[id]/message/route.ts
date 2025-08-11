import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { generateChatReply } from "@/lib/llm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { role, content } = await req.json().catch(()=>({} as any));

    if (!role || !content) {
      return NextResponse.json({ error: "Role and content are required" }, { status: 400 });
    }

    // Verify session belongs to user
    const chatSession = await prisma.chatSession.findFirst({ where: { id: params.id, userId: ctx.session.user.id } });

    if (!chatSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({ data: { sessionId: params.id, userId: ctx.session.user.id, role, content } });

    // Get conversation history
    const dbMessages = await prisma.chatMessage.findMany({ where: { sessionId: params.id }, orderBy: { createdAt: "asc" } });

    // Convert to OpenAI format
    const messages = dbMessages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Fetch user memories (tone, signature, etc.)
    const memories = await prisma.memory.findMany({ where: { userId: ctx.session.user.id } });
    const tone = memories.find(m => m.key === "tone")?.value || "professional";
    const signature = memories.find(m => m.key === "signature")?.value || "";
    const userPrefs = memories
      .filter(m => m.key !== "tone" && m.key !== "signature")
      .map(m => `${m.key}: ${m.value}`)
      .join("\n");

    // Define tools available to the assistant
    const functions = [
      {
        name: "create_calendar_event",
        description: "Create a new calendar event with proper validation",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Event title or summary" },
            description: { type: "string", description: "Event description (optional)" },
            start: { type: "string", description: "Start time in RFC3339 format (e.g., '2024-01-15T14:00:00-05:00')" },
            end: { type: "string", description: "End time in RFC3339 format (e.g., '2024-01-15T15:00:00-05:00')" },
            timeZone: { type: "string", description: "Time zone (default: America/New_York)" },
            attendees: {
              type: "array",
              items: { type: "object", properties: { email: { type: "string", description: "Attendee email address" } }, required: ["email"] },
              description: "Array of attendee objects with email addresses"
            },
            location: { type: "string", description: "Event location (optional)" }
          },
          required: ["summary", "start", "end"]
        }
      },
      {
        name: "get_recent_emails",
        description: "Get recent emails from Gmail inbox",
        parameters: {
          type: "object",
          properties: {
            q: { type: "string", description: "Search query (optional)" },
            limit: { type: "number", description: "Number of emails to fetch (default: 10)" }
          }
        }
      }
    ];

    const systemPrompt = `You are Castra, an AI-powered realtor co-pilot. You help real estate professionals manage their business efficiently.

User tone: ${tone}
Signature: ${signature}
${userPrefs ? `Preferences:\n${userPrefs}` : ""}

- Email: draft replies (never send), summarize threads, sync/search inbox
- Calendar: create/manage events with validation (RFC3339 with timezone)
- Always ask for consent before accessing inbox or creating events
- Be concise, professional, and confirm actions
`;

    // Generate tool-enabled assistant reply
    const aiContent = await generateChatReply(messages, functions, systemPrompt);

    // Save AI response
    const assistantMessage = await prisma.chatMessage.create({ data: { sessionId: params.id, userId: ctx.session.user.id, role: "assistant", content: aiContent } });

    // Generate contextual title if needed
    const messageCount = await prisma.chatMessage.count({ where: { sessionId: params.id } });
    if (messageCount === 2 && (!chatSession.title || chatSession.title === "Draft...")) {
      const newTitle = content.substring(0, 60).trim() || "New Chat";
      await prisma.chatSession.update({ where: { id: params.id }, data: { title: newTitle } });
    }

    return NextResponse.json({ userMessage, assistantMessage, messages: [userMessage, assistantMessage] });
  } catch (error) {
    console.error("[chat-message]", error);
    return NextResponse.json({ error: "Failed to add message" }, { status: 500 });
  }
}, { action: 'chat.message.add' })

export const PATCH = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { title } = await req.json();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const updatedSession = await prisma.chatSession.updateMany({ where: { id: params.id, userId: ctx.session.user.id }, data: { title } });
    if (updatedSession.count === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, title });
  } catch (error) {
    console.error("[chat-session-rename]", error);
    return NextResponse.json({ error: "Failed to rename session" }, { status: 500 });
  }
}, { action: 'chat.message.rename' })
