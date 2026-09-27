// Application-level error codes shared by server and client.
// The client only ever shows the copy below — never raw error messages.

export const ERROR_CODES = [
  "INVALID_IMAGE",
  "IMAGE_TOO_LARGE",
  "TOO_MANY_IMAGES",
  "AI_TIMEOUT",
  "AI_UNAVAILABLE",
  "AI_BAD_RESPONSE",
  "NO_INGREDIENTS",
  "NO_RECIPES",
  "AUTH_REQUIRED",
  "QUOTA_EXCEEDED",
  "TRIAL_USED",
  "RATE_LIMITED",
  "SCAN_EXPIRED",
  "RECIPE_LIMIT",
  "INVALID_REQUEST",
  "NETWORK",
  "CANCELLED",
  "UNKNOWN",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type Failure = { ok: false; code: ErrorCode };

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_IMAGE: "We couldn't open that photo. Try a JPEG or PNG taken with your camera.",
  IMAGE_TOO_LARGE: "That photo is too large. Try a different photo or a screenshot of it.",
  TOO_MANY_IMAGES: "You can add up to three photos per scan.",
  AI_TIMEOUT: "That took too long, so we stopped. Please try again.",
  AI_UNAVAILABLE: "Our kitchen assistant is unavailable right now. Please try again in a minute.",
  AI_BAD_RESPONSE: "We got a garbled answer back. Please try again.",
  NO_INGREDIENTS: "We couldn't spot any food in those photos. This didn't use up a try.",
  NO_RECIPES:
    "We couldn't find recipes that fit these ingredients and settings. Try a longer time limit, a different diet, or add a few ingredients.",
  AUTH_REQUIRED: "Please sign in to continue.",
  QUOTA_EXCEEDED: "You've used all your free tries this month.",
  TRIAL_USED: "That was your free try. Create a free account to keep going.",
  RATE_LIMITED: "You're going a little fast. Please wait a minute and try again.",
  SCAN_EXPIRED: "This ingredient list has expired. Please start again.",
  RECIPE_LIMIT:
    "You've generated recipes for this list a few times already. Start again for more ideas.",
  INVALID_REQUEST: "Something about that request didn't look right. Please try again.",
  NETWORK: "You seem to be offline. Check your connection and try again.",
  CANCELLED: "Cancelled.",
  UNKNOWN: "Something went wrong. Please try again.",
};

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && (ERROR_CODES as readonly string[]).includes(value);
}

/**
 * Maps anything thrown by a server-function call to a safe error code.
 * Expected failures come back as `{ ok: false, code }`; this handles the rest
 * (auth middleware, input validation, transport, aborts).
 */
export function classifyThrown(error: unknown): ErrorCode {
  if (error instanceof DOMException && error.name === "AbortError") return "CANCELLED";
  if (error instanceof Error && error.name === "AbortError") return "CANCELLED";
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "NETWORK";
  if (error instanceof TypeError) return "NETWORK"; // fetch() network failure
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/^unauthori[sz]ed|jwt expired|invalid jwt/i.test(message)) return "AUTH_REQUIRED";
  if (/payload too large|413/i.test(message)) return "IMAGE_TOO_LARGE";
  if (
    /INVALID_REQUEST|too_big|too_small|invalid_type|invalid_enum|unrecognized_keys|zod/i.test(
      message,
    )
  ) {
    return "INVALID_REQUEST";
  }
  return "UNKNOWN";
}
