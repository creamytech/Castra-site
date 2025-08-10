export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { sdpEndpoint, offerSdp } = await req.json();
    if (!sdpEndpoint || !offerSdp) {
      return NextResponse.json({ error: "Missing sdpEndpoint or offerSdp" }, { status: 400 });
    }

    const resp = await fetch(String(sdpEndpoint), {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: String(offerSdp),
    });

    const answerText = await resp.text();
    if (!resp.ok) {
      return NextResponse.json(
        { error: "SDP exchange failed at OpenAI", status: resp.status, body: answerText },
        { status: 502 }
      );
    }

    return new NextResponse(answerText, {
      status: 200,
      headers: { "Content-Type": "application/sdp" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "SDP proxy error", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}


