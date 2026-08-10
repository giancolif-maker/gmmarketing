// Minimal OpenAI-compatible chat-completions client.
//
// Works against any provider that speaks the OpenAI chat-completions +
// tool-calling wire format, which covers both OpenRouter
// (https://openrouter.ai/api/v1) and Groq (https://api.groq.com/openai/v1).
// Configure via env vars — see .env.example.

export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function loadLlmConfig(): LlmConfig {
  const baseUrl = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1";
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!apiKey) {
    throw new Error(
      "LLM_API_KEY is not set. Copy .env.example to .env and add your OpenRouter or Groq API key.",
    );
  }
  if (!model) {
    throw new Error(
      "LLM_MODEL is not set. Copy .env.example to .env and pick a model id for your provider.",
    );
  }
  return { baseUrl, apiKey, model };
}

export interface ChatCompletionResult {
  message: ChatMessage;
}

/** Calls POST {baseUrl}/chat/completions with tool definitions and returns the first choice's message. */
export async function chatCompletion(
  config: LlmConfig,
  messages: ChatMessage[],
  tools: ToolDef[],
): Promise<ChatCompletionResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };
  // OpenRouter asks (politely) for these — harmless to omit on other providers.
  if (config.baseUrl.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = "https://ultron-orb-ui.local";
    headers["X-Title"] = "ULTRON Orb UI";
  }

  const res = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages,
      tools: tools.length ? tools : undefined,
      tool_choice: tools.length ? "auto" : undefined,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LLM request failed (${res.status}): ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message: ChatMessage }[];
    error?: { message?: string };
  };

  if (data.error) {
    throw new Error(`LLM provider error: ${data.error.message ?? "unknown error"}`);
  }
  const message = data.choices?.[0]?.message;
  if (!message) {
    throw new Error("LLM response had no choices.");
  }
  return { message };
}
