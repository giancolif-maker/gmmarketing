import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  ChevronLeft,
  Clock3,
  Home,
  ImagePlus,
  Minus,
  Plus,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { detectIngredients, generateRecipes, getAccountStatus } from "@/lib/pantry.functions";
import { classifyThrown, ERROR_MESSAGES, type ErrorCode } from "@/lib/pantry/errors";
import { ACCEPTED_IMAGE_TYPES, ImagePrepError, prepareImage } from "@/lib/pantry/image-client";
import {
  cleanText,
  DIETS,
  LIMITS,
  MEAL_TYPES,
  TIME_OPTIONS,
  type Diet,
  type Ingredient,
  type MealType,
  type Recipe,
  type TimeOption,
  type Usage,
} from "@/lib/pantry/schemas";
import heroImage from "@/assets/lemon-chicken.jpg";

const STEPS = ["scan", "confirm", "preferences", "results", "recipe", "profile"] as const;
type Step = (typeof STEPS)[number];
type Screen = Step | "home";

export const Route = createFileRoute("/")({
  validateSearch: z.object({
    step: z.enum(STEPS).optional().catch(undefined),
    r: z.string().max(8).optional().catch(undefined),
  }),
  head: () => ({
    meta: [
      { title: "Pantry Snap — What's for dinner?" },
      {
        name: "description",
        content: "Snap what you've got and get dinner ideas that use it.",
      },
      { property: "og:title", content: "Pantry Snap — What's for dinner?" },
      { property: "og:description", content: "Snap what you've got. We'll suggest what to make." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

// ---------------------------------------------------------------------------- flow persistence

const FLOW_KEY = "pantrysnap:flow:v1";

type Flow = {
  photos: string[];
  ingredients: Ingredient[];
  scanId: string | null;
  servings: number;
  maxMinutes: TimeOption;
  mealType: MealType;
  diet: Diet;
  recipes: Recipe[];
};

const EMPTY_FLOW: Flow = {
  photos: [],
  ingredients: [],
  scanId: null,
  servings: 2,
  maxMinutes: "30",
  mealType: "Dinner",
  diet: "None",
  recipes: [],
};

// Session storage only: photos never outlive the tab and are never uploaded for storage.
function loadFlow(): Flow {
  try {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return EMPTY_FLOW;
    const saved = JSON.parse(raw) as Partial<Flow>;
    return {
      ...EMPTY_FLOW,
      ...saved,
      photos: Array.isArray(saved.photos) ? saved.photos.slice(0, LIMITS.maxImages) : [],
      ingredients: Array.isArray(saved.ingredients) ? saved.ingredients : [],
      recipes: Array.isArray(saved.recipes) ? saved.recipes : [],
    };
  } catch {
    return EMPTY_FLOW;
  }
}

function saveFlow(flow: Flow) {
  try {
    sessionStorage.setItem(FLOW_KEY, JSON.stringify(flow));
  } catch {
    // Quota exceeded (large photos) — retry without photos so the rest of the flow survives.
    try {
      sessionStorage.setItem(FLOW_KEY, JSON.stringify({ ...flow, photos: [] }));
    } catch {
      /* storage unavailable (private mode) — flow simply won't survive a reload */
    }
  }
}

function clearFlow() {
  try {
    sessionStorage.removeItem(FLOW_KEY);
  } catch {
    /* ignore */
  }
}

const CLIENT_TIMEOUT_MS = 90_000;

function Index() {
  const detect = useServerFn(detectIngredients);
  const recipesFn = useServerFn(generateRecipes);
  const accountFn = useServerFn(getAccountStatus);
  const navigate = useNavigate({ from: "/" });
  const search = Route.useSearch();
  const screen: Screen = search.step ?? "home";

  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [flow, setFlow] = useState<Flow>(EMPTY_FLOW);
  const [restored, setRestored] = useState(false);
  const [newIngredient, setNewIngredient] = useState("");
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [pending, setPending] = useState<null | "detect" | "recipes">(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [notice, setNotice] = useState("");

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);

  const requestRef = useRef<{ controller: AbortController; origin: Screen } | null>(null);
  const usageForRef = useRef<string | null>(null);

  const update = (patch: Partial<Flow>) => setFlow((f) => ({ ...f, ...patch }));
  const { photos, ingredients, scanId, servings, maxMinutes, mealType, diet, recipes } = flow;
  const selected = recipes.find((r) => r.id === search.r) ?? null;

  const go = useCallback(
    (step: Screen, extra: { r?: string } = {}, replace = false) => {
      setError(null);
      setNotice("");
      void navigate({ search: step === "home" ? {} : { step, ...extra }, replace });
      if (typeof window !== "undefined") window.scrollTo(0, 0);
    },
    [navigate],
  );

  // Restore the in-progress flow (survives refresh and sign-in redirects).
  useEffect(() => {
    setFlow(loadFlow());
    setRestored(true);
  }, []);
  useEffect(() => {
    if (restored) saveFlow(flow);
  }, [flow, restored]);

  // Deep links / Back into a step whose data no longer exists fall back gracefully.
  useEffect(() => {
    if (!restored || pending) return;
    if (screen === "confirm" && !scanId) go("scan", {}, true);
    else if (screen === "preferences" && (!scanId || ingredients.length === 0))
      go("confirm", {}, true);
    else if (screen === "results" && recipes.length === 0)
      go(scanId ? "preferences" : "scan", {}, true);
    else if (screen === "recipe" && !selected) go(recipes.length ? "results" : "scan", {}, true);
  }, [restored, pending, screen, scanId, ingredients.length, recipes.length, selected, go]);

  // ---------------------------------------------------------------- account
  const refreshUsage = useCallback(
    async (force = false) => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id ?? null;
      if (!uid) {
        usageForRef.current = null;
        setUsage(null);
        return;
      }
      if (!force && usageForRef.current === uid) return;
      usageForRef.current = uid;
      try {
        const result = await accountFn();
        if (result.ok) setUsage(result.usage);
      } catch {
        usageForRef.current = null; // non-critical: the server still enforces limits
      }
    },
    [accountFn],
  );

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null);
      if (data.session) void refreshUsage();
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUserEmail(session?.user.email ?? null);
      if (event === "SIGNED_OUT") {
        usageForRef.current = null;
        setUsage(null);
      } else if (session) {
        void refreshUsage();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [refreshUsage]);

  // ---------------------------------------------------------------- requests
  const cancelRequest = useCallback(() => {
    requestRef.current?.controller.abort();
    requestRef.current = null;
    setPending(null);
  }, []);

  // Leaving the screen that started a request (Back, bottom nav) abandons it.
  useEffect(() => {
    if (requestRef.current && requestRef.current.origin !== screen) cancelRequest();
  }, [screen, cancelRequest]);

  useEffect(() => () => requestRef.current?.controller.abort(), []);

  useEffect(() => {
    if (!pending) return;
    setElapsed(0);
    const started = Date.now();
    const id = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [pending]);

  async function run<T>(kind: "detect" | "recipes", call: (signal: AbortSignal) => Promise<T>) {
    requestRef.current?.controller.abort();
    const controller = new AbortController();
    const entry = { controller, origin: screen };
    requestRef.current = entry;
    setPending(kind);
    setError(null);
    const timer = window.setTimeout(() => controller.abort("timeout"), CLIENT_TIMEOUT_MS);
    try {
      const value = await call(controller.signal);
      return requestRef.current === entry ? { value } : null;
    } catch (err) {
      if (requestRef.current !== entry) return null; // abandoned: never touch the UI
      const code = controller.signal.reason === "timeout" ? "AI_TIMEOUT" : classifyThrown(err);
      return code === "CANCELLED" ? null : { error: code };
    } finally {
      window.clearTimeout(timer);
      if (requestRef.current === entry) {
        requestRef.current = null;
        setPending(null);
      }
    }
  }

  function handleFailure(code: ErrorCode) {
    if (code === "AUTH_REQUIRED") {
      setAuthOpen(true);
      return;
    }
    if (code === "QUOTA_EXCEEDED") {
      setPaywallOpen(true);
      void refreshUsage(true);
      return;
    }
    setError(code);
  }

  const findIngredients = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setAuthOpen(true);
      return;
    }
    const outcome = await run("detect", (signal) => detect({ data: { images: photos }, signal }));
    if (!outcome) return;
    if ("error" in outcome) return handleFailure(outcome.error);
    const result = outcome.value;
    if (!result.ok) return handleFailure(result.code);
    usageForRef.current = null;
    setUsage(result.usage);
    update({ ingredients: result.ingredients, scanId: result.scanId, recipes: [] });
    go("confirm");
  };

  const findMeals = async () => {
    if (!scanId || ingredients.length === 0) return;
    const outcome = await run("recipes", (signal) =>
      recipesFn({
        data: { scanId, ingredients, servings, maxMinutes, mealType, diet },
        signal,
      }),
    );
    if (!outcome) return;
    if ("error" in outcome) return handleFailure(outcome.error);
    const result = outcome.value;
    if (!result.ok) return handleFailure(result.code);
    update({ recipes: result.recipes });
    go("results");
  };

  // ---------------------------------------------------------------- photos
  const pickPhotos = async (files: FileList | null, input: HTMLInputElement | null) => {
    if (!files?.length) return;
    const room = LIMITS.maxImages - photos.length;
    const chosen = Array.from(files).slice(0, Math.max(0, room));
    if (input) input.value = "";
    setError(null);
    setNotice(
      files.length > room
        ? `Only the first ${Math.max(0, room)} photo(s) were added — three is the limit.`
        : "",
    );
    if (!chosen.length) return;
    setPreparingPhotos(true);
    const prepared: string[] = [];
    let failure: ErrorCode | null = null;
    for (const file of chosen) {
      try {
        prepared.push(await prepareImage(file));
      } catch (err) {
        failure = err instanceof ImagePrepError ? err.code : "INVALID_IMAGE";
      }
    }
    setPreparingPhotos(false);
    if (failure) setError(failure);
    if (prepared.length)
      setFlow((f) => ({ ...f, photos: [...f.photos, ...prepared].slice(0, LIMITS.maxImages) }));
  };

  const addIngredient = (raw: string, quantity = "") => {
    const name = cleanText(raw).slice(0, LIMITS.maxIngredientNameChars);
    if (!name) return;
    setFlow((f) => {
      if (f.ingredients.length >= LIMITS.maxIngredients) return f;
      if (f.ingredients.some((i) => i.name.toLowerCase() === name.toLowerCase())) return f;
      return { ...f, ingredients: [...f.ingredients, { name, quantity }] };
    });
  };

  const startOver = () => {
    cancelRequest();
    setFlow((f) => ({
      ...EMPTY_FLOW,
      servings: f.servings,
      maxMinutes: f.maxMinutes,
      mealType: f.mealType,
      diet: f.diet,
    }));
    go("scan");
  };

  const submitAuth = async () => {
    setAuthError("");
    setAuthMessage("");
    const result =
      authMode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/?step=scan` },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setAuthError(result.error.message);
    else if (authMode === "signup" && !result.data.session)
      setAuthMessage("Check your email to confirm your account, then come back to this tab.");
    else setAuthOpen(false);
  };

  const signOut = async () => {
    cancelRequest();
    await supabase.auth.signOut();
    clearFlow();
    setFlow(EMPTY_FLOW);
    go("home");
  };

  const resetDate = usage
    ? new Date(usage.resetsAt).toLocaleDateString(undefined, { month: "long", day: "numeric" })
    : null;
  const errorAction =
    error === "SCAN_EXPIRED" || error === "RECIPE_LIMIT" ? (
      <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={startOver}>
        Start a new scan
      </Button>
    ) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <button
            type="button"
            onClick={() => go("home")}
            className="flex items-center gap-2 font-extrabold"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            Pantry Snap
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (userEmail ? go("profile") : setAuthOpen(true))}
          >
            {userEmail ? userEmail.split("@")[0] : "Sign in"}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-28 pt-6 md:pt-10">
        {error && !pending && (
          <div
            role="alert"
            className="mx-auto mb-5 max-w-xl rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {ERROR_MESSAGES[error]}
            {errorAction}
          </div>
        )}
        {notice && !pending && (
          <div className="mx-auto mb-5 max-w-xl rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            {notice}
          </div>
        )}

        {pending && (
          <section className="mx-auto flex min-h-[65vh] max-w-lg flex-col items-center justify-center text-center">
            <div className="pantry-pulse flex size-28 items-center justify-center rounded-full bg-secondary">
              <Sparkles className="size-10 text-primary" />
            </div>
            <p className="mt-8 text-sm font-bold text-primary">Pantry Snap is thinking</p>
            <h1 className="mt-2 font-display text-4xl">
              {pending === "detect"
                ? "Looking for ingredients in your photos"
                : "Writing recipes from your ingredients"}
            </h1>
            <p className="mt-3 text-muted-foreground" aria-live="polite">
              {elapsed > 0 ? `${elapsed}s` : " "}
            </p>
            <Button variant="outline" className="mt-6 rounded-full" onClick={cancelRequest}>
              Cancel
            </Button>
          </section>
        )}

        {!pending && screen === "home" && (
          <section className="grid items-center gap-8 md:grid-cols-[1fr_1.05fr]">
            <div className="py-4 md:py-12">
              <span className="mb-4 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
                Cook with what you have
              </span>
              <h1 className="font-display text-6xl leading-[.94] md:text-8xl">
                What’s for dinner?
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground md:text-xl">
                Snap your fridge or pantry. Check what we found. Get recipes that use it.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="h-14 rounded-full px-7 text-base shadow-xl shadow-primary/20"
                  onClick={() => {
                    go("scan");
                    setTimeout(() => cameraRef.current?.click(), 50);
                  }}
                >
                  <Camera /> Snap my food
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-full px-7 text-base"
                  onClick={() => {
                    go("scan");
                    setTimeout(() => libraryRef.current?.click(), 50);
                  }}
                >
                  <ImagePlus /> Upload photos
                </Button>
              </div>
              <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                <span>Snap</span>
                <span>→</span>
                <span>Confirm</span>
                <span>→</span>
                <span>Cook</span>
              </div>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] app-shadow md:aspect-[5/4]">
              <img
                src={heroImage}
                alt=""
                className="h-full w-full object-cover"
                width={1200}
                height={912}
              />
            </div>
          </section>
        )}

        {/* Inputs live outside the scan screen so home-page buttons can open them. */}
        <input
          ref={cameraRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          capture="environment"
          className="hidden"
          onChange={(e) => pickPhotos(e.target.files, e.target)}
        />
        <input
          ref={libraryRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          className="hidden"
          onChange={(e) => pickPhotos(e.target.files, e.target)}
        />

        {!pending && screen === "scan" && (
          <section className="mx-auto max-w-2xl">
            <button
              className="mb-6 flex items-center gap-1 text-sm font-semibold"
              onClick={() => go("home")}
            >
              <ChevronLeft /> Back
            </button>
            <p className="text-sm font-bold text-primary">Step 1 of 3</p>
            <h1 className="mt-1 font-display text-5xl">Show us what you’ve got</h1>
            <p className="mt-3 text-muted-foreground">
              Add up to three clear photos of your fridge, pantry or counter. One is enough to get
              started.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {Array.from({ length: LIMITS.maxImages }, (_, index) => {
                const photo = photos[index];
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={!photo && preparingPhotos}
                    onClick={() => !photo && libraryRef.current?.click()}
                    className="relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-dashed border-border bg-card"
                  >
                    {photo ? (
                      <>
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <span
                          role="button"
                          aria-label={`Remove photo ${index + 1}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            update({ photos: photos.filter((_, i) => i !== index) });
                          }}
                          className="absolute right-2 top-2 rounded-full bg-foreground p-1 text-background"
                        >
                          <X className="size-4" />
                        </span>
                      </>
                    ) : (
                      <span className="flex h-full flex-col items-center justify-center gap-2 text-sm font-bold text-muted-foreground">
                        <ImagePlus className="size-6" />
                        {preparingPhotos && index === photos.length ? "Preparing…" : "Add photo"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
              <strong className="text-foreground">Best results:</strong> Open the door, turn on the
              light, and include labels when you can. Photos are only used for this scan and aren’t
              saved.
            </div>
            <Button
              className="mt-8 h-14 w-full rounded-full text-base"
              disabled={!photos.length || preparingPhotos}
              onClick={findIngredients}
            >
              Find my ingredients <Sparkles />
            </Button>
            {usage && !usage.isPro && (
              <p className="mt-3 text-center text-sm text-muted-foreground">
                {Math.max(0, usage.scanLimit - usage.scansUsed)} of {usage.scanLimit} free scans
                left this month
              </p>
            )}
          </section>
        )}

        {!pending && screen === "confirm" && (
          <section className="mx-auto max-w-2xl">
            <button
              className="mb-6 flex items-center gap-1 text-sm font-semibold"
              onClick={() => go("scan")}
            >
              <ChevronLeft /> Photos
            </button>
            <p className="text-sm font-bold text-primary">Step 2 of 3</p>
            <h1 className="mt-1 font-display text-5xl">Did we get it right?</h1>
            <p className="mt-3 text-muted-foreground">
              Remove anything that’s wrong and add what we missed. Recipes only count what’s on this
              list.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {ingredients.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex items-center gap-2 rounded-full border bg-card py-2 pl-4 pr-2 shadow-sm"
                >
                  <span className="font-semibold">{item.name}</span>
                  {item.quantity && (
                    <span className="text-sm text-muted-foreground">{item.quantity}</span>
                  )}
                  <button
                    aria-label={`Remove ${item.name}`}
                    onClick={() =>
                      update({ ingredients: ingredients.filter((_, i) => i !== index) })
                    }
                    className="rounded-full bg-muted p-1"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {ingredients.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No ingredients yet. Add at least one to continue.
                </p>
              )}
            </div>
            <form
              className="mt-6 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addIngredient(newIngredient);
                setNewIngredient("");
              }}
            >
              <Input
                value={newIngredient}
                maxLength={LIMITS.maxIngredientNameChars}
                onChange={(e) => setNewIngredient(e.target.value)}
                placeholder="Add an ingredient"
              />
              <Button type="submit" variant="secondary" disabled={!cleanText(newIngredient)}>
                <Plus /> Add
              </Button>
            </form>
            <div className="mt-6">
              <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">Quick add</p>
              <div className="flex flex-wrap gap-2">
                {["Oil", "Garlic", "Butter", "Onion", "Eggs", "Rice"].map((name) => (
                  <Button
                    key={name}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => addIngredient(name)}
                  >
                    <Plus />
                    {name}
                  </Button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                We assume you have salt, pepper and water.
              </p>
            </div>
            <Button
              className="mt-9 h-14 w-full rounded-full text-base"
              disabled={ingredients.length === 0}
              onClick={() => go("preferences")}
            >
              Looks good
            </Button>
          </section>
        )}

        {!pending && screen === "preferences" && (
          <section className="mx-auto max-w-2xl">
            <button
              className="mb-6 flex items-center gap-1 text-sm font-semibold"
              onClick={() => go("confirm")}
            >
              <ChevronLeft /> Ingredients
            </button>
            <p className="text-sm font-bold text-primary">Step 3 of 3</p>
            <h1 className="mt-1 font-display text-5xl">Make it yours</h1>
            <div className="mt-8 space-y-8">
              <div>
                <p className="mb-3 font-bold">Servings</p>
                <div className="flex w-fit items-center gap-7 rounded-full border bg-card p-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Fewer servings"
                    className="rounded-full"
                    onClick={() => update({ servings: Math.max(LIMITS.minServings, servings - 1) })}
                  >
                    <Minus />
                  </Button>
                  <span className="min-w-5 text-center text-xl font-extrabold">{servings}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="More servings"
                    className="rounded-full"
                    onClick={() => update({ servings: Math.min(LIMITS.maxServings, servings + 1) })}
                  >
                    <Plus />
                  </Button>
                </div>
              </div>
              <Choice
                label="Maximum time"
                values={TIME_OPTIONS}
                value={maxMinutes}
                onChange={(v) => update({ maxMinutes: v })}
                suffix=" min"
              />
              <Choice
                label="Meal type"
                values={MEAL_TYPES}
                value={mealType}
                onChange={(v) => update({ mealType: v })}
              />
              <Choice
                label="Diet (optional)"
                values={DIETS}
                value={diet}
                onChange={(v) => update({ diet: v })}
              />
            </div>
            <Button className="mt-10 h-14 w-full rounded-full text-base" onClick={findMeals}>
              Find my meals <Sparkles />
            </Button>
          </section>
        )}

        {!pending && screen === "results" && (
          <section className="mx-auto max-w-3xl">
            <button
              className="mb-6 flex items-center gap-1 text-sm font-semibold"
              onClick={() => go("preferences")}
            >
              <ChevronLeft /> Preferences
            </button>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-primary">From your ingredients</p>
                <h1 className="mt-1 font-display text-5xl">Here’s what you can make</h1>
              </div>
              <Button variant="outline" size="sm" className="rounded-full" onClick={startOver}>
                Scan again
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              We checked every recipe against your ingredient list. Salt, pepper and water are
              assumed.
            </p>
            <div className="mt-7 space-y-5">
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => go("recipe", { r: recipe.id })}
                  className="group w-full rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                    {recipe.missing.length === 0
                      ? "Everything on hand"
                      : `${recipe.matchPercent}% on hand`}
                  </span>
                  <h2 className="mt-4 font-display text-3xl">{recipe.name}</h2>
                  {recipe.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {recipe.description}
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap gap-5 text-sm font-semibold">
                    <span>
                      <Clock3 className="mr-1 inline size-4" />
                      {recipe.totalMinutes} min
                    </span>
                    <span>{recipe.servings} servings</span>
                    <span>
                      {recipe.missing.length
                        ? `Need ${recipe.missing.length}: ${recipe.missing.join(", ")}`
                        : "Nothing to buy"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {!pending && screen === "recipe" && selected && (
          <article className="mx-auto max-w-3xl">
            <button
              className="mb-5 flex items-center gap-1 text-sm font-semibold"
              onClick={() => go("results")}
            >
              <ChevronLeft /> All recipes
            </button>
            <h1 className="mt-2 font-display text-5xl">{selected.name}</h1>
            {selected.description && (
              <p className="mt-3 text-lg text-muted-foreground">{selected.description}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-5 font-bold">
              <span>
                {selected.totalMinutes} min total
                <span className="font-normal text-muted-foreground">
                  {" "}
                  ({selected.prepMinutes} prep · {selected.cookMinutes} cook)
                </span>
              </span>
              <span>{selected.servings} servings</span>
              <span>{selected.matchPercent}% on hand</span>
            </div>
            {selected.missing.length > 0 && (
              <div className="mt-7 rounded-2xl bg-secondary p-5">
                <p className="font-bold">You’ll need</p>
                <p className="mt-1 text-sm">{selected.missing.join(", ")}</p>
                {selected.substitutes.map((s) => (
                  <p key={`${s.from}-${s.to}`} className="mt-3 text-sm">
                    <strong>Swap:</strong> {s.from} → {s.to}
                  </p>
                ))}
              </div>
            )}
            <div className="mt-10 grid gap-10 md:grid-cols-[.8fr_1.2fr]">
              <section>
                <h2 className="font-display text-3xl">Ingredients</h2>
                <ul className="mt-4 divide-y">
                  {selected.ingredients.map((item, index) => (
                    <li key={index} className="flex justify-between gap-4 py-3">
                      <span>
                        {item.name}
                        {item.status === "missing" && (
                          <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
                            need
                          </span>
                        )}
                        {item.status === "staple" && (
                          <span className="ml-2 text-xs text-muted-foreground">staple</span>
                        )}
                      </span>
                      <strong className="text-right">{item.measurement}</strong>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h2 className="font-display text-3xl">Method</h2>
                <ol className="mt-4 space-y-5">
                  {selected.steps.map((step, index) => (
                    <li key={index} className="grid grid-cols-[2rem_1fr] gap-3">
                      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                      <p className="pt-1 leading-relaxed">{step}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </article>
        )}

        {!pending && screen === "profile" && (
          <section className="mx-auto max-w-xl">
            <h1 className="font-display text-5xl">Your kitchen</h1>
            <div className="mt-7 rounded-2xl border bg-card p-6">
              <div className="flex items-center gap-4">
                <span className="flex size-14 items-center justify-center rounded-full bg-secondary">
                  <UserRound />
                </span>
                <div>
                  <p className="font-bold">{userEmail ?? "Not signed in"}</p>
                  {usage && (
                    <p className="text-sm text-muted-foreground">
                      {usage.isPro ? "Pro plan" : "Free plan"}
                    </p>
                  )}
                </div>
              </div>
              {usage && (
                <div className="mt-6 rounded-xl bg-muted p-4">
                  <div className="flex justify-between text-sm font-bold">
                    <span>Monthly scans</span>
                    <span>
                      {usage.isPro ? "Unlimited" : `${usage.scansUsed} of ${usage.scanLimit} used`}
                    </span>
                  </div>
                  {!usage.isPro && (
                    <>
                      <progress
                        className="mt-3 h-2 w-full overflow-hidden rounded-full accent-primary"
                        max={usage.scanLimit}
                        value={Math.min(usage.scansUsed, usage.scanLimit)}
                      />
                      <p className="mt-2 text-xs text-muted-foreground">Resets {resetDate}</p>
                    </>
                  )}
                </div>
              )}
              {userEmail ? (
                <Button variant="outline" className="mt-6 w-full" onClick={signOut}>
                  Sign out
                </Button>
              ) : (
                <Button className="mt-6 w-full" onClick={() => setAuthOpen(true)}>
                  Sign in
                </Button>
              )}
            </div>
          </section>
        )}
      </main>

      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 px-6 pt-2 backdrop-blur">
        <div className="mx-auto flex max-w-md justify-around">
          {(
            [
              { id: "home", label: "Home", icon: Home },
              { id: "profile", label: "Profile", icon: UserRound },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={`flex min-w-20 flex-col items-center gap-1 py-1 text-xs font-semibold ${screen === item.id ? "text-primary" : "text-muted-foreground"}`}
            >
              <item.icon className="size-5" />
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {authOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAuthOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-t-[2rem] bg-background p-6 app-shadow sm:rounded-[2rem]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-3xl">
                {authMode === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close"
                className="rounded-full"
                onClick={() => setAuthOpen(false)}
              >
                <X />
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to scan your kitchen. You get 3 free scans every month.
            </p>
            <Button
              variant="outline"
              className="mt-6 h-12 w-full rounded-full"
              onClick={async () => {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: `${window.location.origin}/?step=scan`,
                });
                if (result.error) setAuthError("Google sign-in didn't work. Please try again.");
              }}
            >
              Continue with Google
            </Button>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              OR
              <span className="h-px flex-1 bg-border" />
            </div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submitAuth();
              }}
            >
              <Input
                type="email"
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {authError && <p className="text-sm text-destructive">{authError}</p>}
              {authMessage && <p className="text-sm text-primary">{authMessage}</p>}
              <Button type="submit" className="h-12 w-full rounded-full">
                {authMode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <button
              className="mt-4 w-full text-center text-sm font-semibold text-primary"
              onClick={() => setAuthMode((v) => (v === "signin" ? "signup" : "signin"))}
            >
              {authMode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      )}
      {paywallOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center sm:p-5">
          <div className="w-full max-w-md rounded-t-[2rem] bg-background p-7 text-center app-shadow sm:rounded-[2rem]">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary">
              <Sparkles className="text-primary" />
            </span>
            <h2 className="mt-5 font-display text-4xl">That’s this month’s scans</h2>
            <p className="mt-3 text-muted-foreground">
              {ERROR_MESSAGES.QUOTA_EXCEEDED}
              {resetDate ? ` They reset on ${resetDate}.` : ""}
            </p>
            <Button className="mt-6 h-12 w-full rounded-full" onClick={() => setPaywallOpen(false)}>
              OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Choice<T extends string>({
  label,
  values,
  value,
  onChange,
  suffix = "",
}: {
  label: string;
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
  suffix?: string;
}) {
  return (
    <div>
      <p className="mb-3 font-bold">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {values.map((item) => (
          <Button
            key={item}
            variant={value === item ? "default" : "outline"}
            className="h-11 rounded-full"
            onClick={() => onChange(item)}
          >
            {item}
            {suffix}
          </Button>
        ))}
      </div>
    </div>
  );
}
