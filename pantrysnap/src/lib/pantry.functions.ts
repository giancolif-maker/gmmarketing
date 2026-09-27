import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ZodTypeAny, z } from "zod";
import {
  clientEventSchema,
  detectRequestSchema,
  recipesRequestSchema,
  typedRequestSchema,
} from "@/lib/pantry/schemas";

/** Validates input without echoing schema details back to the caller. */
const validate =
  <S extends ZodTypeAny>(schema: S) =>
  (input: unknown): z.output<S> => {
    const result = schema.safeParse(input);
    if (!result.success) throw new Error("INVALID_REQUEST");
    return result.data;
  };

// Server functions ship a client stub; the implementation module is loaded lazily
// inside each handler so server-only code (service role, AI key) never reaches the browser.

export const detectIngredients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate(detectRequestSchema))
  .handler(async ({ data, context }) => {
    const { runDetect } = await import("@/lib/pantry/pantry.server");
    return runDetect(context.userId, data, getRequest()?.signal);
  });

export const startTypedSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate(typedRequestSchema))
  .handler(async ({ data, context }) => {
    const { runTyped } = await import("@/lib/pantry/pantry.server");
    return runTyped(context.userId, data);
  });

export const generateRecipes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate(recipesRequestSchema))
  .handler(async ({ data, context }) => {
    const { runRecipes } = await import("@/lib/pantry/pantry.server");
    return runRecipes(context.userId, data, getRequest()?.signal);
  });

export const getAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAccount } = await import("@/lib/pantry/pantry.server");
    return getAccount(context.userId);
  });

export const trackEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate(clientEventSchema))
  .handler(async ({ data, context }) => {
    const { trackClientEvent } = await import("@/lib/pantry/pantry.server");
    return trackClientEvent(context.userId, data);
  });
