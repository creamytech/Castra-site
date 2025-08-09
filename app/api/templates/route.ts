import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET - List all templates for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.template.findMany({
      where: { 
        userId: session.user.id,
        isActive: true 
      },
      orderBy: { updatedAt: "desc" }
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[templates-get]", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// POST - Create new template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, type, subject, content, variables } = await request.json();

    if (!name || !type || !content) {
      return NextResponse.json({ 
        error: "Name, type, and content are required" 
      }, { status: 400 });
    }

    const template = await prisma.template.create({
      data: {
        userId: session.user.id,
        name,
        type,
        subject,
        content,
        variables: variables || []
      }
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("[templates-post]", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
