import { NextRequest, NextResponse } from "next/server";
import { closeSession } from "@/lib/browserAgent";
import type { ChatMessage } from "@/lib/llmClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

declare global {
  // eslint-disable-next-line no-var
  var __ultronConversation: ChatMessage[] | undefined;
}

export async function POST(req: NextRequest) {
  globalThis.__ultronConversation = undefined;

  let closeBrowser = false;
  try {
    const body = await req.json();
    closeBrowser = Boolean(body?.closeBrowser);
  } catch {
    // no body / not JSON — fine, just reset the conversation
  }

  if (closeBrowser) {
    await closeSession();
  }

  return NextResponse.json({ ok: true });
}
