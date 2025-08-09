import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET - Get specific template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const template = await prisma.template.findFirst({
      where: { 
        id: params.id,
        userId: session.user.id 
      }
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("[template-get]", error);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

// PUT - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, type, subject, content, variables, isActive } = await request.json();

    const template = await prisma.template.updateMany({
      where: { 
        id: params.id,
        userId: session.user.id 
      },
      data: {
        name,
        type,
        subject,
        content,
        variables: variables || [],
        isActive: isActive !== undefined ? isActive : true
      }
    });

    if (template.count === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const updatedTemplate = await prisma.template.findUnique({
      where: { id: params.id }
    });

    return NextResponse.json({ template: updatedTemplate });
  } catch (error) {
    console.error("[template-put]", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

// DELETE - Delete template (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const template = await prisma.template.updateMany({
      where: { 
        id: params.id,
        userId: session.user.id 
      },
      data: { isActive: false }
    });

    if (template.count === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[template-delete]", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
