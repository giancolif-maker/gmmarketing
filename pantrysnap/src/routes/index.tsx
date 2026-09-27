import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronLeft,
  Clock3,
  Home,
  ImagePlus,
  Keyboard,
  Minus,
  Plus,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  X,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import {
  detectIngredients,
  generateRecipes,
  getAccountStatus,
  startTypedSession,
  trackEvent,
} from "@/lib/pantry.functions";
import { classifyThrown, ERROR_MESSAGES, type ErrorCode } from "@/lib/pantry/errors";
import { ACCEPTED_IMAGE_TYPES, ImagePrepError, prepareImage } from "@/lib/pantry/image-client";
import {
  cleanText,
  CUISINES,
  DIETS,
  LIMITS,
  MEAL_TYPES,
  TIME_OPTIONS,
  type ClientEvent,
  type Cuisine,
  type Diet,
  type Ingredient,
  type MealType,
  type Recipe,
  type SessionResult,
  type TimeOption,
  type Usage,
} from "@/lib/pantry/schemas";
import heroImage from "@/assets/lemon-chicken.jpg";

const STEPS = ["scan", "type", "review", "results", "recipe", "profile"] as const;
type Step = (typeof STEPS)[number];
type Screen = Step | "home";

export const Route = createFileRoute("/")({
  validateSearch: z.object({
    step: z.enum(STEPS).optional().catch(undefined),
    r: z.string().max(8).optional().catch(undefined),
  }),
  head: () => ({
    meta: [
      { title: "Pantry Snap — What can I make?" },
      {
        name: "description",
        content: "Snap or type what you have. See recipes you can actually make with it.",
      },
      { property: "og:title", content: "Pantry Snap — What can I make?" },
      {
        property: "og:description",
        content: "Show us what you have. We'll tell you what you can actually make.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

// ---------------------------------------------------------------------------- flow persistence

const FLOW_KEY = "pantrysnap:flow:v2";

type Edits = { added: number; removed: number; renamed: number };
type Feedback = { cooked?: "yes" | "not_yet"; useful?: "yes" | "no" };

type Flow = {
  source: "scan" | "type" | null;
  photos: string[];
  typedText: string;
  ingredients: Ingredient[];
  initialCount: number;
  edits: Edits;
  scanId: string | null;
  servings: number;
  maxMinutes: TimeOption;
  mealType: MealType;
  diet: Diet;
  highProtein: boolean;
  spicy: boolean;
  kidFriendly: boolean;
  cuisine: Cuisine;
  note: string;
  recipes: Recipe[];
  excluded: string[];
  feedback: Record<string, Feedback>;
};

const PREF_KEYS = [
  "servings",
  "maxMinutes",
  "mealType",
  "diet",
  "highProtein",
  "spicy",
  "kidFriendly",
  "cuisine",
] as const;

const EMPTY_FLOW: Flow = {
  source: null,
  photos: [],
  typedText: "",
  ingredients: [],
  initialCount: 0,
  edits: { added: 0, removed: 0, renamed: 0 },
  scanId: null,
  servings: 2,
  maxMinutes: "30",
  mealType: "Dinner",
  diet: "None",
  highProtein: false,
  spicy: false,
  kidFriendly: false,
  cuisine: "Any",
  note: "",
  recipes: [],
  excluded: [],
  feedback: {},
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
const QUICK_ADD = ["Oil", "Butter", "Garlic", "Onion", "Eggs", "Rice"];

function timeLabel(r: Recipe) {
  return r.totalMinutesUpper
    ? `${r.totalMinutes}–${r.totalMinutesUpper} min`
    : `${r.totalMinutes} min`;
}

function Index() {
  const detect = useServerFn(detectIngredients);
  const typedFn = useServerFn(startTypedSession);
  const recipesFn = useServerFn(generateRecipes);
  const accountFn = useServerFn(getAccountStatus);
  const trackFn = useServerFn(trackEvent);
  const navigate = useNavigate({ from: "/" });
  const search = Route.useSearch();
  const screen: Screen = search.step ?? "home";

  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [flow, setFlow] = useState<Flow>(EMPTY_FLOW);
  const [restored, setRestored] = useState(false);
  const [newIngredient, setNewIngredient] = useState("");
  const [editing, setEditing] = useState<{ index: number; value: string } | null>(null);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [pending, setPending] = useState<null | "detect" | "typed" | "recipes">(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [notice, setNotice] = useState("");
  const [scanEmpty, setScanEmpty] = useState(false);

  const [account, setAccount] = useState<{ email: string | null; guest: boolean } | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authIntro, setAuthIntro] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);

  const requestRef = useRef<{ controller: AbortController; origin: Screen } | null>(null);
  const usageForRef = useRef<string | null>(null);
  const pendingModeRef = useRef<{ mode: "scan" | "type"; fallback: boolean } | null>(null);

  const update = (patch: Partial<Flow>) => setFlow((f) => ({ ...f, ...patch }));
  const { photos, ingredients, scanId, recipes } = flow;
  const selected = recipes.find((r) => r.id === search.r) ?? null;
  const signedIn = !!account && !account.guest;

  const go = useCallback(
    (step: Screen, extra: { r?: string } = {}, replace = false) => {
      setError(null);
      setNotice("");
      setScanEmpty(false);
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
    if (screen === "review" && !scanId) go("home", {}, true);
    else if (screen === "results" && recipes.length === 0) go(scanId ? "review" : "home", {}, true);
    else if (screen === "recipe" && !selected) go(recipes.length ? "results" : "home", {}, true);
  }, [restored, pending, screen, scanId, recipes.length, selected, go]);

  // ---------------------------------------------------------------- analytics (fire and forget)
  const track = useCallback(
    (event: ClientEvent) => {
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) void trackFn({ data: event }).catch(() => {});
      });
    },
    [trackFn],
  );

  const chooseMode = (mode: "scan" | "type", fallback = false) => {
    pendingModeRef.current = { mode, fallback };
  };
  const flushMode = () => {
    const m = pendingModeRef.current;
    if (!m) return;
    pendingModeRef.current = null;
    track({ name: "input_mode_selected", mode: m.mode, fallback: m.fallback });
  };

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
    const apply = (user: { email?: string; is_anonymous?: boolean } | null | undefined) =>
      setAccount(user ? { email: user.email ?? null, guest: !!user.is_anonymous } : null);
    void supabase.auth.getSession().then(({ data }) => {
      apply(data.session?.user);
      if (data.session) void refreshUsage();
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      apply(session?.user);
      if (event === "SIGNED_OUT") {
        usageForRef.current = null;
        setUsage(null);
      } else if (session) {
        void refreshUsage(event === "USER_UPDATED");
      }
    });
    return () => data.subscription.unsubscribe();
  }, [refreshUsage]);

  /** Signed-in user, or a one-time guest trial when the project allows anonymous sign-ins. */
  const ensureSession = async (): Promise<boolean> => {
    const { data } = await supabase.auth.getSession();
    if (data.session) return true;
    try {
      const guest = await supabase.auth.signInAnonymously();
      if (!guest.error && guest.data.session) return true;
    } catch {
      /* anonymous sign-ins disabled or unreachable — fall back to sign-in */
    }
    setAuthIntro("Sign in to see what you can make. You get 3 free tries every month.");
    setAuthOpen(true);
    return false;
  };

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

  async function run<T>(
    kind: "detect" | "typed" | "recipes",
    call: (signal: AbortSignal) => Promise<T>,
  ) {
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
      setAuthIntro("Please sign in to continue.");
      setAuthOpen(true);
      return;
    }
    if (code === "TRIAL_USED") {
      setAuthIntro(ERROR_MESSAGES.TRIAL_USED);
      setAuthMode("signup");
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

  function startReview(result: Extract<SessionResult, { ok: true }>, source: "scan" | "type") {
    usageForRef.current = null;
    setUsage(result.usage);
    update({
      source,
      ingredients: result.ingredients,
      initialCount: result.ingredients.length,
      edits: { added: 0, removed: 0, renamed: 0 },
      scanId: result.scanId,
      recipes: [],
      excluded: [],
      feedback: {},
    });
    setEditing(null);
    go("review");
  }

  const findIngredients = async () => {
    setScanEmpty(false);
    if (!(await ensureSession())) return;
    flushMode();
    const outcome = await run("detect", (signal) => detect({ data: { images: photos }, signal }));
    if (!outcome) return;
    if ("error" in outcome) return handleFailure(outcome.error);
    const result = outcome.value;
    if (!result.ok) {
      if (result.code === "NO_INGREDIENTS") {
        setScanEmpty(true);
        void refreshUsage(true);
        return;
      }
      return handleFailure(result.code);
    }
    startReview(result, "scan");
  };

  const submitTyped = async () => {
    if (!cleanText(flow.typedText)) return;
    if (!(await ensureSession())) return;
    flushMode();
    const outcome = await run("typed", (signal) =>
      typedFn({ data: { text: flow.typedText.slice(0, LIMITS.maxTypedChars) }, signal }),
    );
    if (!outcome) return;
    if ("error" in outcome) return handleFailure(outcome.error);
    const result = outcome.value;
    if (!result.ok) {
      if (result.code === "NO_INGREDIENTS") {
        setNotice("We couldn't read any ingredients from that. Try one per line, like “eggs”.");
        return;
      }
      return handleFailure(result.code);
    }
    startReview(result, "type");
  };

  const findRecipes = async () => {
    if (!scanId || ingredients.length === 0) return;
    setEditing(null);
    track({
      name: "ingredients_confirmed",
      sessionId: scanId,
      source: flow.source ?? "scan",
      initialCount: flow.initialCount,
      finalCount: ingredients.length,
      ...flow.edits,
    });
    const prefs = Object.fromEntries(PREF_KEYS.map((k) => [k, flow[k]])) as Pick<
      Flow,
      (typeof PREF_KEYS)[number]
    >;
    const outcome = await run("recipes", (signal) =>
      recipesFn({ data: { scanId, ingredients, ...prefs, note: flow.note }, signal }),
    );
    if (!outcome) return;
    if ("error" in outcome) return handleFailure(outcome.error);
    const result = outcome.value;
    if (!result.ok) return handleFailure(result.code);
    update({ recipes: result.recipes, excluded: result.excluded, feedback: {} });
    go("results");
  };

  // ---------------------------------------------------------------- photos
  const pickPhotos = async (files: FileList | null, input: HTMLInputElement | null) => {
    if (!files?.length) return;
    const room = LIMITS.maxImages - photos.length;
    const chosen = Array.from(files).slice(0, Math.max(0, room));
    if (input) input.value = "";
    setError(null);
    setScanEmpty(false);
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

  // ---------------------------------------------------------------- ingredient editing
  const addIngredient = (raw: string) => {
    const name = cleanText(raw).toLowerCase().slice(0, LIMITS.maxIngredientNameChars);
    if (!name) return;
    setFlow((f) => {
      if (f.ingredients.length >= LIMITS.maxIngredients) return f;
      if (f.ingredients.some((i) => i.name.toLowerCase() === name)) return f;
      return {
        ...f,
        ingredients: [...f.ingredients, { name, quantity: "" }],
        edits: { ...f.edits, added: f.edits.added + 1 },
      };
    });
  };

  const removeIngredient = (index: number) => {
    setEditing(null);
    setFlow((f) => ({
      ...f,
      ingredients: f.ingredients.filter((_, i) => i !== index),
      edits: { ...f.edits, removed: f.edits.removed + 1 },
    }));
  };

  const commitEdit = () => {
    if (!editing) return;
    const name = cleanText(editing.value).toLowerCase().slice(0, LIMITS.maxIngredientNameChars);
    const index = editing.index;
    setEditing(null);
    if (!name) return removeIngredient(index);
    setFlow((f) => {
      const current = f.ingredients[index];
      if (!current || current.name === name) return f;
      const duplicate = f.ingredients.some((i, j) => j !== index && i.name.toLowerCase() === name);
      return {
        ...f,
        ingredients: duplicate
          ? f.ingredients.filter((_, j) => j !== index)
          : f.ingredients.map((i, j) => (j === index ? { ...i, name } : i)),
        edits: { ...f.edits, renamed: f.edits.renamed + 1 },
      };
    });
  };

  const startOver = () => {
    cancelRequest();
    setFlow((f) => ({
      ...EMPTY_FLOW,
      ...Object.fromEntries(PREF_KEYS.map((k) => [k, f[k]])),
    }));
    go("home");
  };

  const openRecipe = (recipe: Recipe, index: number) => {
    if (scanId) {
      track({
        name: "recipe_opened",
        sessionId: scanId,
        recipeName: recipe.name,
        position: index + 1,
        shown: recipes.length,
        everythingOnHand: recipe.everythingOnHand,
        missingCount: recipe.missing.length,
      });
    }
    go("recipe", { r: recipe.id });
  };

  const giveFeedback = (recipe: Recipe, patch: Feedback) => {
    setFlow((f) => ({
      ...f,
      feedback: { ...f.feedback, [recipe.id]: { ...f.feedback[recipe.id], ...patch } },
    }));
    if (scanId)
      track({ name: "recipe_feedback", sessionId: scanId, recipeName: recipe.name, ...patch });
  };

  // ---------------------------------------------------------------- auth
  const submitAuth = async () => {
    setAuthError("");
    setAuthMessage("");
    const { data } = await supabase.auth.getSession();
    const isGuest = !!data.session?.user.is_anonymous;
    if (authMode === "signup" && isGuest) {
      // Upgrade the guest in place so their trial history carries over.
      const result = await supabase.auth.updateUser({ email, password });
      if (result.error) setAuthError(result.error.message);
      else setAuthMessage("Check your email to confirm your account, then come back to this tab.");
      return;
    }
    const result =
      authMode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/` },
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

  const resetDate = usage?.resetsAt
    ? new Date(usage.resetsAt).toLocaleDateString(undefined, { month: "long", day: "numeric" })
    : null;
  const triesLeft = usage && !usage.isPro ? Math.max(0, usage.scanLimit - usage.scansUsed) : null;
  const errorAction =
    error === "SCAN_EXPIRED" || error === "RECIPE_LIMIT" ? (
      <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={startOver}>
        Start again
      </Button>
    ) : error === "NO_RECIPES" ? (
      <p className="mt-2 text-destructive/80">Your ingredients and settings are kept below.</p>
    ) : null;

  const pendingText = {
    detect: "Looking for ingredients in your photos",
    typed: "Reading your list",
    recipes: "Finding recipes and checking them against your ingredients",
  };

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
            onClick={() => (signedIn ? go("profile") : setAuthOpen(true))}
          >
            {signedIn ? (account?.email ?? "Account").split("@")[0] : "Sign in"}
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
            <h1 className="mt-2 font-display text-4xl">{pendingText[pending]}</h1>
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
              <h1 className="font-display text-6xl leading-[.94] md:text-8xl">What can I make?</h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground md:text-xl">
                Show us what you have — snap it or type it. We’ll tell you what you can actually
                make.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="h-14 rounded-full px-7 text-base shadow-xl shadow-primary/20"
                  onClick={() => {
                    chooseMode("scan");
                    go("scan");
                    setTimeout(() => cameraRef.current?.click(), 50);
                  }}
                >
                  <Camera /> Scan my food
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-full px-7 text-base"
                  onClick={() => {
                    chooseMode("type");
                    go("type");
                  }}
                >
                  <Keyboard /> Type what I have
                </Button>
              </div>
              <button
                type="button"
                className="mt-4 text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => {
                  chooseMode("scan");
                  go("scan");
                  setTimeout(() => libraryRef.current?.click(), 50);
                }}
              >
                or upload photos
              </button>
              <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                <span>Snap or type</span>
                <span>→</span>
                <span>Check</span>
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
            <p className="text-sm font-bold text-primary">Step 1 of 2</p>
            <h1 className="mt-1 font-display text-5xl">Show us what you’ve got</h1>
            <p className="mt-3 text-muted-foreground">
              A photo of what you’re thinking of using works best. Up to three photos.
            </p>

            {scanEmpty ? (
              <div className="mt-8 rounded-2xl border bg-card p-6 text-center shadow-sm">
                <h2 className="font-display text-3xl">No ingredients detected</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {ERROR_MESSAGES.NO_INGREDIENTS}
                </p>
                <Button
                  className="mt-5 h-12 w-full rounded-full"
                  onClick={() => {
                    chooseMode("type", true);
                    go("type");
                  }}
                >
                  <Keyboard /> Type what you have
                </Button>
                <Button
                  variant="ghost"
                  className="mt-2 w-full"
                  onClick={() => {
                    setScanEmpty(false);
                    update({ photos: [] });
                  }}
                >
                  Try another photo
                </Button>
              </div>
            ) : (
              <>
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
                            {preparingPhotos && index === photos.length
                              ? "Preparing…"
                              : "Add photo"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                  <strong className="text-foreground">Best results:</strong> Good light, labels
                  facing out. Photos are only used for this scan and aren’t saved.
                </div>
                <Button
                  className="mt-8 h-14 w-full rounded-full text-base"
                  disabled={!photos.length || preparingPhotos}
                  onClick={findIngredients}
                >
                  Find my ingredients <Sparkles />
                </Button>
              </>
            )}
            {!scanEmpty && (
              <button
                type="button"
                className="mt-4 w-full text-center text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => {
                  chooseMode("type");
                  go("type");
                }}
              >
                Prefer to type? Type what you have
              </button>
            )}
            {triesLeft !== null && (
              <p className="mt-3 text-center text-sm text-muted-foreground">
                {usage?.isAnonymous
                  ? "Free try"
                  : `${triesLeft} of ${usage?.scanLimit} free tries left this month`}
              </p>
            )}
          </section>
        )}

        {!pending && screen === "type" && (
          <section className="mx-auto max-w-2xl">
            <button
              className="mb-6 flex items-center gap-1 text-sm font-semibold"
              onClick={() => go("home")}
            >
              <ChevronLeft /> Back
            </button>
            <p className="text-sm font-bold text-primary">Step 1 of 2</p>
            <h1 className="mt-1 font-display text-5xl">What do you have?</h1>
            <p className="mt-3 text-muted-foreground">
              One per line or separated by commas. Amounts are optional.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submitTyped();
              }}
            >
              <textarea
                aria-label="Ingredients you have"
                value={flow.typedText}
                maxLength={LIMITS.maxTypedChars}
                onChange={(e) => update({ typedText: e.target.value })}
                rows={7}
                placeholder={"chicken\nrice\n6 eggs\ncheddar cheese\nspinach"}
                className="mt-6 w-full rounded-2xl border border-input bg-card p-4 text-base shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                type="submit"
                className="mt-6 h-14 w-full rounded-full text-base"
                disabled={!cleanText(flow.typedText)}
              >
                Continue
              </Button>
            </form>
          </section>
        )}

        {!pending && screen === "review" && (
          <section className="mx-auto max-w-2xl">
            <button
              className="mb-6 flex items-center gap-1 text-sm font-semibold"
              onClick={() => go(flow.source === "type" ? "type" : "scan")}
            >
              <ChevronLeft /> {flow.source === "type" ? "Edit list" : "Photos"}
            </button>
            <p className="text-sm font-bold text-primary">Step 2 of 2</p>
            <h1 className="mt-1 font-display text-5xl">
              {flow.source === "scan" ? "Did we get it right?" : "Your ingredients"}
            </h1>
            <p className="mt-3 text-muted-foreground">
              Tap an item to fix it. Recipes only count what’s on this list.
            </p>

            <div className="mt-6 flex flex-wrap gap-2" aria-label="Ingredients">
              {ingredients.map((item, index) =>
                editing?.index === index ? (
                  <form
                    key={`edit-${index}`}
                    className="flex items-center gap-1 rounded-full border-2 border-primary bg-card py-1 pl-3 pr-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      commitEdit();
                    }}
                  >
                    <input
                      autoFocus
                      aria-label={`Edit ${item.name}`}
                      value={editing.value}
                      maxLength={LIMITS.maxIngredientNameChars}
                      onChange={(e) => setEditing({ index, value: e.target.value })}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className="w-36 bg-transparent font-semibold outline-none"
                    />
                    <button
                      type="submit"
                      aria-label="Save"
                      className="rounded-full bg-primary p-1 text-primary-foreground"
                    >
                      <Check className="size-3" />
                    </button>
                  </form>
                ) : (
                  <div
                    key={`${item.name}-${index}`}
                    className="flex items-center gap-2 rounded-full border bg-card py-2 pl-4 pr-2 shadow-sm"
                  >
                    <button
                      type="button"
                      className="font-semibold"
                      aria-label={`Edit ${item.name}`}
                      onClick={() => setEditing({ index, value: item.name })}
                    >
                      {item.name}
                      {item.quantity && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {item.quantity}
                        </span>
                      )}
                    </button>
                    <button
                      aria-label={`Remove ${item.name}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => removeIngredient(index)}
                      className="rounded-full bg-muted p-1"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ),
              )}
              {ingredients.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No ingredients yet. Add at least one to continue.
                </p>
              )}
            </div>
            <form
              className="mt-4 flex gap-2"
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
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_ADD.filter(
                (name) => !ingredients.some((i) => i.name.toLowerCase() === name.toLowerCase()),
              ).map((name) => (
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
            <p className="mt-2 text-xs text-muted-foreground">
              We assume you have salt, pepper and water.
            </p>

            <div className="mt-8 space-y-6 rounded-2xl border bg-card p-5">
              <Choice
                label="Time"
                values={TIME_OPTIONS}
                value={flow.maxMinutes}
                onChange={(v) => update({ maxMinutes: v })}
                suffix=" min"
              />
              <div className="flex items-center justify-between gap-4">
                <p className="font-bold">Servings</p>
                <div className="flex w-fit items-center gap-5 rounded-full border bg-background p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Fewer servings"
                    className="rounded-full"
                    onClick={() =>
                      update({ servings: Math.max(LIMITS.minServings, flow.servings - 1) })
                    }
                  >
                    <Minus />
                  </Button>
                  <span className="min-w-5 text-center text-xl font-extrabold">
                    {flow.servings}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="More servings"
                    className="rounded-full"
                    onClick={() =>
                      update({ servings: Math.min(LIMITS.maxServings, flow.servings + 1) })
                    }
                  >
                    <Plus />
                  </Button>
                </div>
              </div>
              <Choice
                label="Diet"
                values={DIETS}
                value={flow.diet}
                onChange={(v) => update({ diet: v })}
              />
              <div>
                <p className="mb-3 font-bold">I’d like it…</p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["highProtein", "High protein"],
                      ["spicy", "Spicy"],
                      ["kidFriendly", "Kid-friendly"],
                    ] as const
                  ).map(([key, label]) => (
                    <Button
                      key={key}
                      variant={flow[key] ? "default" : "outline"}
                      className="h-10 rounded-full"
                      aria-pressed={flow[key]}
                      onClick={() => update({ [key]: !flow[key] })}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <details className="group">
                <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
                  Meal &amp; cuisine: {flow.mealType}
                  {flow.cuisine !== "Any" ? ` · ${flow.cuisine}` : ""}
                </summary>
                <div className="mt-4 space-y-5">
                  <Choice
                    label="Meal"
                    values={MEAL_TYPES}
                    value={flow.mealType}
                    onChange={(v) => update({ mealType: v })}
                  />
                  <Choice
                    label="Cuisine"
                    values={CUISINES}
                    value={flow.cuisine}
                    onChange={(v) => update({ cuisine: v })}
                  />
                </div>
              </details>
              <div>
                <label htmlFor="note" className="mb-2 block font-bold">
                  Anything else?{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="note"
                  value={flow.note}
                  maxLength={LIMITS.maxNoteChars}
                  onChange={(e) => update({ note: e.target.value })}
                  placeholder="e.g. something crispy, no mushrooms"
                />
              </div>
            </div>

            <Button
              className="mt-8 h-14 w-full rounded-full text-base"
              disabled={ingredients.length === 0}
              onClick={findRecipes}
            >
              Find recipes <Sparkles />
            </Button>
          </section>
        )}

        {!pending && screen === "results" && (
          <section className="mx-auto max-w-3xl">
            <button
              className="mb-6 flex items-center gap-1 text-sm font-semibold"
              onClick={() => go("review")}
            >
              <ChevronLeft /> Ingredients
            </button>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-primary">
                  Checked against your {ingredients.length} ingredients
                </p>
                <h1 className="mt-1 font-display text-5xl">What you can make</h1>
              </div>
              <Button variant="outline" size="sm" className="rounded-full" onClick={startOver}>
                Start over
              </Button>
            </div>
            {flow.excluded.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                Avoiding: <strong className="text-foreground">{flow.excluded.join(", ")}</strong>.
                Always double-check for allergies.
              </p>
            )}
            <div className="mt-7 space-y-4">
              {recipes.map((recipe, index) => (
                <button
                  key={recipe.id}
                  onClick={() => openRecipe(recipe, index)}
                  className="group w-full rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <h2 className="font-display text-3xl leading-tight">{recipe.name}</h2>
                  <p className="mt-2 text-sm font-semibold text-muted-foreground">
                    <Clock3 className="mr-1 inline size-4" />
                    {timeLabel(recipe)} · {recipe.servings} servings · {recipe.matchPercent}% on
                    hand
                  </p>
                  <p
                    className={`mt-3 font-bold ${recipe.everythingOnHand ? "text-primary" : "text-foreground"}`}
                  >
                    {recipe.everythingOnHand ? (
                      <>
                        <Check className="mr-1 inline size-5" />
                        Everything on hand
                      </>
                    ) : recipe.missing.length ? (
                      `Need: ${recipe.missing.join(", ")}`
                    ) : (
                      "Check amounts before you start"
                    )}
                  </p>
                  {recipe.checks.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recipe.checks.map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                  {recipe.whyItFits && (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                      {recipe.whyItFits}
                    </p>
                  )}
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
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 font-bold">
              <span>
                {timeLabel(selected)}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  ({selected.prepMinutes} prep · {selected.cookMinutes} cook)
                </span>
              </span>
              <span>{selected.servings} servings</span>
              <span>{selected.matchPercent}% on hand</span>
            </div>
            {selected.totalMinutesUpper && (
              <p className="mt-2 text-sm text-muted-foreground">
                The steps add up to about {selected.totalMinutesUpper} min, so allow extra time.
              </p>
            )}
            <div className="mt-6 rounded-2xl bg-secondary p-5">
              {selected.everythingOnHand ? (
                <p className="font-bold">
                  <Check className="mr-1 inline size-5" />
                  Everything on hand
                </p>
              ) : (
                <>
                  {selected.missing.length > 0 && (
                    <>
                      <p className="font-bold">You’ll need</p>
                      <p className="mt-1 text-sm">{selected.missing.join(", ")}</p>
                    </>
                  )}
                  {selected.ingredients
                    .filter((i) => i.short)
                    .map((i) => (
                      <p key={i.name} className="mt-2 text-sm">
                        <strong>Check amount:</strong> {i.name} — recipe uses {i.short?.need}, you
                        listed {i.short?.have}
                      </p>
                    ))}
                  {selected.substitutes.map((s) => (
                    <p key={`${s.from}-${s.to}`} className="mt-3 text-sm">
                      <strong>Swap:</strong> {s.from} → {s.to}
                    </p>
                  ))}
                </>
              )}
            </div>
            {selected.checks.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selected.checks.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground"
                  >
                    {c}
                  </span>
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
                        {item.short && (
                          <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
                            check amount
                          </span>
                        )}
                        {item.status === "staple" && (
                          <span className="ml-2 text-xs text-muted-foreground">staple</span>
                        )}
                        {item.fromSteps && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            mentioned in steps
                          </span>
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

            <div className="mt-10 rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
              <p className="font-bold text-foreground">What we checked</p>
              <p className="mt-1">
                Every ingredient in the list and in the steps against your list; time against the
                step durations; diet and anything you asked to avoid by ingredient name.
                {selected.servingsStated ? "" : " The recipe didn’t state its serving count."} Not
                checked: exact amounts, taste, or allergens.
              </p>
            </div>

            <FeedbackPanel
              value={flow.feedback[selected.id] ?? {}}
              onChange={(patch) => giveFeedback(selected, patch)}
            />
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
                  <p className="font-bold">
                    {signedIn ? account?.email : account?.guest ? "Guest" : "Not signed in"}
                  </p>
                  {usage && (
                    <p className="text-sm text-muted-foreground">
                      {usage.isAnonymous ? "Free try" : usage.isPro ? "Pro plan" : "Free plan"}
                    </p>
                  )}
                </div>
              </div>
              {usage && !usage.isAnonymous && (
                <div className="mt-6 rounded-xl bg-muted p-4">
                  <div className="flex justify-between text-sm font-bold">
                    <span>Monthly tries</span>
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
              {signedIn ? (
                <Button variant="outline" className="mt-6 w-full" onClick={signOut}>
                  Sign out
                </Button>
              ) : (
                <Button
                  className="mt-6 w-full"
                  onClick={() => {
                    setAuthMode(account?.guest ? "signup" : "signin");
                    setAuthOpen(true);
                  }}
                >
                  {account?.guest ? "Create a free account" : "Sign in"}
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
              {authIntro || "You get 3 free tries every month."}
            </p>
            <Button
              variant="outline"
              className="mt-6 h-12 w-full rounded-full"
              onClick={async () => {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: `${window.location.origin}/`,
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
            <h2 className="mt-5 font-display text-4xl">That’s this month’s tries</h2>
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

function FeedbackPanel({
  value,
  onChange,
}: {
  value: Feedback;
  onChange: (patch: Feedback) => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border bg-card p-5">
      <p className="font-bold">Did you make it?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant={value.cooked === "yes" ? "default" : "outline"}
          className="rounded-full"
          aria-pressed={value.cooked === "yes"}
          onClick={() => onChange({ cooked: "yes" })}
        >
          <Check /> I cooked it
        </Button>
        <Button
          variant={value.cooked === "not_yet" ? "default" : "outline"}
          className="rounded-full"
          aria-pressed={value.cooked === "not_yet"}
          onClick={() => onChange({ cooked: "not_yet" })}
        >
          Not yet
        </Button>
      </div>
      <p className="mt-5 font-bold">Was this useful?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant={value.useful === "yes" ? "default" : "outline"}
          className="rounded-full"
          aria-pressed={value.useful === "yes"}
          onClick={() => onChange({ useful: "yes" })}
        >
          <ThumbsUp /> Yes
        </Button>
        <Button
          variant={value.useful === "no" ? "default" : "outline"}
          className="rounded-full"
          aria-pressed={value.useful === "no"}
          onClick={() => onChange({ useful: "no" })}
        >
          <ThumbsDown /> No
        </Button>
      </div>
      {(value.cooked || value.useful) && (
        <p className="mt-4 text-sm text-muted-foreground">Thanks — that helps us a lot.</p>
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
      <div className="flex flex-wrap gap-2">
        {values.map((item) => (
          <Button
            key={item}
            variant={value === item ? "default" : "outline"}
            className="h-10 rounded-full"
            aria-pressed={value === item}
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
