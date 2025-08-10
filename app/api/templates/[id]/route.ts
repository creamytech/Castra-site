import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET - Get specific template
export const GET = withAuth(async ({ ctx }, { params }: any) => {
  try {
    const template = await prisma.template.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId } });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    return NextResponse.json({ template });
  } catch (error) {
    console.error("[template-get]", error);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}, { action: 'templates.get' })

// PUT - Update template
export const PUT = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { name, type, subject, content, variables, isActive } = await req.json();
    const existing = await prisma.template.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId } })
    if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    const updated = await prisma.template.update({ where: { id: params.id }, data: { name, type, subject, content, variables: variables || [], isActive: isActive !== undefined ? isActive : true } })
    return NextResponse.json({ template: updated });
  } catch (error) {
    console.error("[template-put]", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}, { action: 'templates.update' })

// DELETE - Delete template (soft delete)
export const DELETE = withAuth(async ({ ctx }, { params }: any) => {
  try {
    const existing = await prisma.template.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId } })
    if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    await prisma.template.update({ where: { id: params.id }, data: { isActive: false } })
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[template-delete]", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}, { action: 'templates.delete' })
