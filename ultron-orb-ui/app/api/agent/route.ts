import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, loadLlmConfig, type ChatMessage } from "@/lib/llmClient";
import { TOOLS, runTool, type ToolExecution } from "@/lib/agentTools";

// Needs a real Node process (Playwright + a long-lived browser session).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are ULTRON, a voice-driven assistant with control of a real web browser.

You have tools to read the current page, navigate to URLs, click elements, type into
fields, scroll, and go back. Use read_page whenever you're unsure what's on screen —
element ids change after every navigation/click, so re-read before acting on stale ids.

Keep spoken replies short and conversational (1-3 sentences) — they get read aloud via
text-to-speech. Narrate what you found or did in plain language; don't dump raw HTML,
URLs full of tracking params, or element ids into your reply. Only act within http/https
websites. If a task seems unsafe, irreversible (payments, deleting things, sending
messages on the user's behalf to third parties) or you're not confident, describe what
you'd do and ask for confirmation instead of doing it.`;

const MAX_STEPS = 8;
const MAX_HISTORY_MESSAGES = 40;

declare global {
  // eslint-disable-next-line no-var
  var __ultronConversation: ChatMessage[] | undefined;
}

function getConversation(): ChatMessage[] {
  if (!globalThis.__ultronConversation) {
    globalThis.__ultronConversation = [{ role: "system", content: SYSTEM_PROMPT }];
  }
  return globalThis.__ultronConversation;
}

function trimHistory(messages: ChatMessage[]) {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
  // Always keep the system prompt, drop oldest turns after it.
  return [messages[0], ...messages.slice(messages.length - (MAX_HISTORY_MESSAGES - 1))];
}

export async function POST(req: NextRequest) {
  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const userMessage = (body.message ?? "").trim();
  if (!userMessage) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }

  let config;
  try {
    config = loadLlmConfig();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  const conversation = getConversation();
  conversation.push({ role: "user", content: userMessage });

  const actions: { summary: string }[] = [];

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const { message } = await chatCompletion(config, conversation, TOOLS);
      conversation.push(message);

      if (!message.tool_calls || message.tool_calls.length === 0) {
        globalThis.__ultronConversation = trimHistory(conversation);
        return NextResponse.json({
          reply: message.content ?? "",
          actions,
        });
      }

      for (const call of message.tool_calls) {
        const exec: ToolExecution = await runTool(call.function.name, call.function.arguments);
        actions.push({ summary: exec.summary });
        conversation.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: exec.resultText,
        });
      }
    }

    globalThis.__ultronConversation = trimHistory(conversation);
    return NextResponse.json({
      reply:
        "I took several steps but didn't reach a final answer yet — ask me to continue and I'll pick up from here.",
      actions,
    });
  } catch (err) {
    globalThis.__ultronConversation = trimHistory(conversation);
    return NextResponse.json(
      { error: (err as Error).message, actions },
      { status: 500 },
    );
  }
}
