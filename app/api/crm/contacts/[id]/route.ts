import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const PUT = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { firstName, lastName, email, phone, company, title, notes } = await req.json();
    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
    }
    const existing = await prisma.contact.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: { firstName, lastName, email, phone, company, title, notes }
    })
    return NextResponse.json({ contact });
  } catch (error) {
    console.error("[crm-contact-update]", error);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}, { action: 'crm.contacts.update' })
