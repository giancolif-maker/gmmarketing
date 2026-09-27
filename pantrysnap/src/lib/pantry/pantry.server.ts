// Trusted server-side orchestration: usage ledger, sessions (scan or typed), recipes
// and analytics. Only imported (dynamically) from server-function handlers.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { detectFromImages, generateVerifiedRecipes, log } from "./ai-pipeline.server";
import type { Failure } from "./errors";
import { sanitizeJpegDataUrl } from "./image-validation";
import { parseTypedIngredients } from "./ingredients";
import type {
  AccountResult,
  ClientEvent,
  DetectRequest,
  RecipesRequest,
  RecipesResult,
  SessionResult,
  TypedRequest,
  Usage,
} from "./schemas";

const fail = (code: Failure["code"]): Failure => ({ ok: false, code });

// ---------------------------------------------------------------------------- usage ledger

type UsageKind = "detect" | "typed" | "recipes";
const LEDGER_CODES = [
  "QUOTA_EXCEEDED",
  "TRIAL_USED",
  "RATE_LIMITED",
  "SCAN_EXPIRED",
  "RECIPE_LIMIT",
] as const;

async function beginUsage(
  userId: string,
  kind: UsageKind,
  scanId?: string,
): Promise<{ ok: true; id: string } | Failure> {
  const { data, error } = await supabaseAdmin.rpc("begin_usage", {
    p_user: userId,
    p_kind: kind,
    ...(scanId ? { p_scan: scanId } : {}),
  });
  if (error) {
    // Fail closed: without the ledger we cannot enforce limits.
    log("usage.begin_error", { kind, message: error.message });
    return fail("AI_UNAVAILABLE");
  }
  const result = data as { ok?: boolean; id?: string; code?: string } | null;
  if (result?.ok && result.id) return { ok: true, id: result.id };
  const code = LEDGER_CODES.find((c) => c === result?.code);
  if (code) return fail(code);
  log("usage.begin_unexpected", { kind, result });
  return fail("UNKNOWN");
}

async function finishUsage(id: string, status: "complete" | "failed" | "empty") {
  const { error } = await supabaseAdmin.rpc("finish_usage", { p_id: id, p_status: status });
  if (error) log("usage.finish_error", { id, status, message: error.message });
}

async function readUsage(userId: string): Promise<Usage | null> {
  const { data, error } = await supabaseAdmin.rpc("usage_summary", { p_user: userId });
  if (error || !data) {
    log("usage.summary_error", { message: error?.message });
    return null;
  }
  const d = data as {
    is_pro: boolean;
    is_anonymous: boolean;
    scans_used: number;
    scan_limit: number;
    resets_at: string | null;
  };
  return {
    isPro: d.is_pro,
    isAnonymous: d.is_anonymous,
    scansUsed: d.scans_used,
    scanLimit: d.scan_limit,
    resetsAt: d.resets_at,
  };
}

export async function getAccount(userId: string): Promise<AccountResult> {
  const usage = await readUsage(userId);
  return usage ? { ok: true, usage } : fail("UNKNOWN");
}

// ---------------------------------------------------------------------------- analytics

/** Best effort: analytics must never break the product flow. */
async function logEvent(
  userId: string,
  name: string,
  sessionId: string | null,
  props: Record<string, Json>,
) {
  const { error } = await supabaseAdmin.rpc("log_event", {
    p_user: userId,
    ...(sessionId ? { p_session: sessionId } : {}),
    p_name: name,
    p_props: props,
  });
  if (error) log("analytics.error", { name, message: error.message });
}

export async function trackClientEvent(userId: string, event: ClientEvent) {
  const { name, ...rest } = event;
  const sessionId = "sessionId" in rest ? (rest.sessionId as string) : null;
  const props = Object.fromEntries(
    Object.entries(rest).filter(([k, v]) => k !== "sessionId" && v !== undefined),
  ) as Record<string, Json>;
  await logEvent(userId, name, sessionId, props);
  return { ok: true as const };
}

// ---------------------------------------------------------------------------- sessions

export async function runDetect(
  userId: string,
  data: DetectRequest,
  signal: AbortSignal | undefined,
): Promise<SessionResult> {
  const images: string[] = [];
  for (const img of data.images) {
    const clean = sanitizeJpegDataUrl(img);
    if (!clean) return fail("INVALID_IMAGE");
    images.push(clean);
  }

  const usage = await beginUsage(userId, "detect");
  if (!usage.ok) return usage;

  const outcome = await detectFromImages(images, signal);
  const base = {
    source: "scan",
    images: images.length,
    attempts: outcome.attempts,
    ms: outcome.ms,
  };
  if (!outcome.ok) {
    await finishUsage(usage.id, "failed");
    await logEvent(userId, "session_started", usage.id, { ...base, outcome: outcome.code });
    log("ai.detect", { ...base, outcome: outcome.code });
    return fail(outcome.code);
  }
  if (outcome.ingredients.length === 0) {
    await finishUsage(usage.id, "empty");
    await logEvent(userId, "session_started", usage.id, {
      ...base,
      outcome: "NO_INGREDIENTS",
      ingredientCount: 0,
    });
    log("ai.detect", { ...base, outcome: "NO_INGREDIENTS" });
    return fail("NO_INGREDIENTS");
  }
  await finishUsage(usage.id, "complete");
  const count = outcome.ingredients.length;
  await logEvent(userId, "session_started", usage.id, {
    ...base,
    outcome: "ok",
    ingredientCount: count,
  });
  log("ai.detect", { ...base, outcome: "ok", count });
  // The session is already charged and complete: never discard it because the summary
  // read failed (the client refreshes usage separately).
  const summary = await readUsage(userId);
  return { ok: true, scanId: usage.id, ingredients: outcome.ingredients, usage: summary };
}

/** Typed input: parsed and normalized on the server, then enters the same pipeline as scans. */
export async function runTyped(userId: string, data: TypedRequest): Promise<SessionResult> {
  const ingredients = parseTypedIngredients(data.text);
  if (ingredients.length === 0) return fail("NO_INGREDIENTS");
  const usage = await beginUsage(userId, "typed");
  if (!usage.ok) return usage;
  await finishUsage(usage.id, "complete");
  await logEvent(userId, "session_started", usage.id, {
    source: "type",
    outcome: "ok",
    ingredientCount: ingredients.length,
  });
  const summary = await readUsage(userId);
  return { ok: true, scanId: usage.id, ingredients, usage: summary };
}

// ---------------------------------------------------------------------------- recipes

export async function runRecipes(
  userId: string,
  data: RecipesRequest,
  signal: AbortSignal | undefined,
): Promise<RecipesResult> {
  const usage = await beginUsage(userId, "recipes", data.scanId);
  if (!usage.ok) return usage;

  const outcome = await generateVerifiedRecipes(data, signal);
  const props: Record<string, Json> = {
    attempts: outcome.attempts,
    ms: outcome.ms,
    rejected: outcome.rejected.length,
    rejectReasons: [...new Set(outcome.rejected)],
    ingredientCount: data.ingredients.length,
    constraints: {
      servings: data.servings,
      maxMinutes: data.maxMinutes,
      mealType: data.mealType,
      diet: data.diet,
      highProtein: data.highProtein,
      spicy: data.spicy,
      kidFriendly: data.kidFriendly,
      cuisine: data.cuisine,
      hasNote: data.note.length > 0,
    },
  };
  if (!outcome.ok) {
    await finishUsage(usage.id, "failed");
    await logEvent(userId, "recipes_result", data.scanId, {
      ...props,
      outcome: outcome.code,
      shown: 0,
    });
    log("ai.recipes", { ...props, outcome: outcome.code });
    return fail(outcome.code);
  }
  await finishUsage(usage.id, "complete");
  await logEvent(userId, "recipes_result", data.scanId, {
    ...props,
    outcome: "ok",
    shown: outcome.recipes.length,
    everythingOnHand: outcome.recipes.filter((r) => r.everythingOnHand).length,
    withUnconfirmed: outcome.recipes.filter((r) => r.unconfirmed.length > 0).length,
    unconfirmedIngredients: data.ingredients.filter((i) => !i.confirmed).length,
  });
  log("ai.recipes", { ...props, outcome: "ok", shown: outcome.recipes.length });
  return { ok: true, recipes: outcome.recipes, excluded: outcome.excluded };
}
