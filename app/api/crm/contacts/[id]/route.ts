import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { firstName, lastName, email, phone, company, title, notes } = await request.json();

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
    }

    const contact = await prisma.contact.update({
      where: {
        id: params.id,
        userId: session.user.id
      },
      data: {
        firstName,
        lastName,
        email,
        phone,
        company,
        title,
        notes
      }
    });

    return NextResponse.json({ contact });
  } catch (error) {
    console.error("[crm-contact-update]", error);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}
