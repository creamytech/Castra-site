import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, content } = await request.json();

    if (!role || !content) {
      return NextResponse.json({ error: "Role and content are required" }, { status: 400 });
    }

    // Verify session belongs to user
    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!chatSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: params.id,
        userId: session.user.id,
        role,
        content
      }
    });

    // If this is a user message, generate AI response and potentially update title
    if (role === "user") {
      // Check if this is the first user message and session has no title
      const messageCount = await prisma.chatMessage.count({
        where: { sessionId: params.id }
      });

      // Generate contextual title if this is the first user message and no title exists
      if (messageCount === 1 && !chatSession.title) {
        let newTitle = "New Chat";
        
        if (content.length < 80) {
          // Use first 60 chars as title
          newTitle = content.substring(0, 60).trim();
        } else {
          // Generate contextual title with OpenAI
          try {
            const titleResponse = await openai.chat.completions.create({
              model: process.env.OPENAI_MODEL || "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "You are a helpful assistant that creates short, descriptive titles for chat conversations. Respond with only the title, 3-6 words maximum."
                },
                {
                  role: "user",
                  content: `Name this chat conversation in 3-6 words: "${content.substring(0, 200)}..."`
                }
              ],
              temperature: 0.7,
              max_tokens: 20
            });

            const generatedTitle = titleResponse.choices[0]?.message?.content?.trim();
            if (generatedTitle) {
              newTitle = generatedTitle;
            }
          } catch (error) {
            console.error("Failed to generate title:", error);
            // Fallback to first 60 chars
            newTitle = content.substring(0, 60).trim();
          }
        }

        // Update session title
        await prisma.chatSession.update({
          where: { id: params.id },
          data: { title: newTitle }
        });
      }

      // Get conversation history
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: params.id },
        orderBy: { createdAt: "asc" }
      });

      // Get user's memory (tone, etc.)
      const memories = await prisma.memory.findMany({
        where: { userId: session.user.id }
      });

      const tone = memories.find(m => m.key === "tone")?.value || "professional";
      const signature = memories.find(m => m.key === "signature")?.value || "";

      // Build system prompt
      const systemPrompt = `You are Castra, an AI co-pilot for real estate professionals. 

User's writing tone: ${tone}
User's signature: ${signature}

You can help with:
- Email drafting and responses
- CRM management (contacts, leads, deals)
- Calendar scheduling
- MLS content and property descriptions
- Document preparation
- General real estate questions

Always be helpful, professional, and concise. If asked to draft emails, create drafts only (don't send automatically).`;

      // Prepare messages for OpenAI
      const openaiMessages = [
        { role: "system" as const, content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        }))
      ];

      // Generate AI response
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: openaiMessages,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

      // Save AI response
      const assistantMessage = await prisma.chatMessage.create({
        data: {
          sessionId: params.id,
          userId: session.user.id,
          role: "assistant",
          content: aiResponse
        }
      });

      return NextResponse.json({
        userMessage,
        assistantMessage,
        messages: [userMessage, assistantMessage]
      });
    }

    return NextResponse.json({ message: userMessage });
  } catch (error) {
    console.error("[chat-message]", error);
    return NextResponse.json({ error: "Failed to add message" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Verify session belongs to user and update title
    const updatedSession = await prisma.chatSession.updateMany({
      where: {
        id: params.id,
        userId: session.user.id
      },
      data: { title }
    });

    if (updatedSession.count === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, title });
  } catch (error) {
    console.error("[chat-session-rename]", error);
    return NextResponse.json({ error: "Failed to rename session" }, { status: 500 });
  }
}
