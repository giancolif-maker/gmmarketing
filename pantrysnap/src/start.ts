import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { LIMITS } from "@/lib/pantry/schemas";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Rejects oversized server-function bodies before they are buffered and parsed.
// Bodies without a Content-Length (chunked uploads) are refused outright.
const bodyLimitMiddleware = createMiddleware().server(async ({ next, request, handlerType }) => {
  if (handlerType === "serverFn" && request.method === "POST") {
    const length = request.headers.get("content-length");
    if (length === null) return new Response("Length required", { status: 411 });
    if (!/^\d+$/.test(length) || Number(length) > LIMITS.maxRequestBytes) {
      return new Response("Payload too large", { status: 413 });
    }
  }
  return next();
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, bodyLimitMiddleware, csrfMiddleware],
}));
