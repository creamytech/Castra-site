import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({ error: 'Calendar events API removed' }, { status: 410 })
}
