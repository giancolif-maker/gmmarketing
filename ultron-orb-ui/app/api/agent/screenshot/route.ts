import { NextResponse } from "next/server";
import { screenshotBase64 } from "@/lib/browserAgent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const b64 = await screenshotBase64();
    const buf = Buffer.from(b64, "base64");
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
