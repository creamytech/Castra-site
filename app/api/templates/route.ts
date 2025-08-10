import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET - List all templates for user
export const GET = withAuth(async ({ ctx }) => {
  try {
    const templates = await prisma.template.findMany({
      where: { userId: ctx.session.user.id, orgId: ctx.orgId, isActive: true },
      orderBy: { updatedAt: "desc" }
    });
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[templates-get]", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}, { action: 'templates.list' })

// POST - Create new template
export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const { name, type, subject, content, variables } = await req.json();
    if (!name || !type || !content) {
      return NextResponse.json({ error: "Name, type, and content are required" }, { status: 400 });
    }
    const template = await prisma.template.create({
      data: { userId: ctx.session.user.id, orgId: ctx.orgId, name, type, subject, content, variables: variables || [] }
    });
    return NextResponse.json({ template });
  } catch (error) {
    console.error("[templates-post]", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}, { action: 'templates.create' })
