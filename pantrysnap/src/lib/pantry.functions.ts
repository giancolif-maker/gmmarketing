import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requestSchema = z.object({
  images: z.array(z.string().max(8_000_000)).min(1).max(3),
  ingredients: z.array(z.string()).optional(),
  servings: z.number().int().min(1).max(10).optional(),
  maxMinutes: z.string().optional(),
  mealType: z.string().optional(),
  diet: z.string().optional(),
  mode: z.enum(["detect", "recipes"]),
});

async function askPantryAI(data: z.infer<typeof requestSchema>) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Recipe intelligence is temporarily unavailable.");

  const isDetect = data.mode === "detect";
  const prompt = isDetect
    ? "Identify visible food ingredients in these fridge, pantry, or counter photos. Return JSON only as {ingredients:[{name:string,quantity:string}]}. Be conservative and never invent hidden ingredients."
    : `Create exactly 4 practical ${data.mealType ?? "dinner"} recipes for ${data.servings ?? 2} servings, within ${data.maxMinutes ?? "30"} minutes, diet ${data.diet ?? "none"}. Available ingredients: ${(data.ingredients ?? []).join(", ")}. Return JSON only as {recipes:[{name,description,prepMinutes,cookMinutes,matchPercent,missingIngredients:string[],ingredients:[{name,measurement}],steps:string[],substitutes:[{from,to}]}]}. Measurements must be exact and already scaled.`;

  const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
  if (isDetect) {
    for (const image of data.images) content.push({ type: "image_url", image_url: { url: image } });
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-lite",
      messages: [{ role: "user", content }],
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) throw new Error("We couldn't read those photos. Please try again.");
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content;
  if (!text) throw new Error("No recipe response was returned.");
  return { payload: text };
}

export const analyzePantry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => requestSchema.parse(input))
  .handler(async ({ data }) => askPantryAI(data));
