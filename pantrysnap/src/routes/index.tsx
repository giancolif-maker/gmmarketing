import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, Clock3, Heart, Home, ImagePlus, LoaderCircle, Minus, Plus, Sparkles, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { analyzePantry } from "@/lib/pantry.functions";
import chickenImage from "@/assets/lemon-chicken.jpg";
import pastaImage from "@/assets/tomato-pasta.jpg";
import riceImage from "@/assets/veggie-rice.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Pantry Snap — What's for dinner?" },
    { name: "description", content: "Snap what you've got and turn your fridge into dinner ideas in under a minute." },
    { property: "og:title", content: "Pantry Snap — What's for dinner?" },
    { property: "og:description", content: "Snap what you've got. We'll figure out the rest." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

type Ingredient = { name: string; quantity: string };
type Recipe = { name: string; description: string; prepMinutes: number; cookMinutes: number; matchPercent: number; missingIngredients: string[]; ingredients: Array<{name:string;measurement:string}>; steps: string[]; substitutes: Array<{from:string;to:string}> };
type Screen = "home" | "scan" | "loading" | "confirm" | "preferences" | "results" | "recipe" | "favorites" | "profile";
const visuals = [chickenImage, pastaImage, riceImage];
const exampleRecipes = [
  { name: "Lemon herb skillet", meta: "35 min · One pan", image: chickenImage },
  { name: "Creamy tomato pasta", meta: "25 min · Weeknight", image: pastaImage },
  { name: "Crispy veggie rice bowl", meta: "30 min · Vegetarian", image: riceImage },
];

function Index() {
  const analyze = useServerFn(analyzePantry);
  const fileRef = useRef<HTMLInputElement>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [photos, setPhotos] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newIngredient, setNewIngredient] = useState("");
  const [servings, setServings] = useState(2);
  const [maxMinutes, setMaxMinutes] = useState("30");
  const [mealType, setMealType] = useState("Dinner");
  const [diet, setDiet] = useState("None");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin"|"signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [scansUsed, setScansUsed] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingStage, setLoadingStage] = useState(0);

  useEffect(() => {
    const syncUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setUserEmail(user?.email ?? null); setUserId(user?.id ?? null);
      if (user) {
        await supabase.from("profiles").upsert({ id: user.id, display_name: user.user_metadata?.["full_name"] ?? null }, { onConflict: "id" });
        const start = new Date(); start.setUTCDate(1); start.setUTCHours(0,0,0,0);
        const [{ count }, { data: profile }] = await Promise.all([
          supabase.from("scans").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString()),
          supabase.from("profiles").select("is_pro").eq("id", user.id).maybeSingle(),
        ]);
        setScansUsed(count ?? 0); setIsPro(profile?.is_pro ?? false);
      }
    };
    syncUser();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { setUserEmail(session?.user.email ?? null); setUserId(session?.user.id ?? null); if (session) void syncUser(); });
    return () => data.subscription.unsubscribe();
  }, []);

  const pickPhotos = async (files: FileList | null) => {
    if (!files) return;
    const room = 3 - photos.length;
    const chosen = Array.from(files).slice(0, room);
    const next = await Promise.all(chosen.map(file => new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
    })));
    setPhotos(prev => [...prev, ...next]);
  };

  const detect = async () => {
    if (!userEmail) { setAuthOpen(true); return; }
    if (!isPro && scansUsed >= 3) { setPaywallOpen(true); return; }
    setScreen("loading"); setError(""); setLoadingStage(0);
    const timer = window.setInterval(() => setLoadingStage(v => Math.min(v + 1, 2)), 1500);
    try {
      const result = await analyze({ data: { images: photos, mode: "detect" } });
      const parsed = JSON.parse(result.payload) as { ingredients: Ingredient[] };
      setIngredients(parsed.ingredients ?? []);
      if (userId) {
        const { error: scanError } = await supabase.from("scans").insert({ user_id: userId, detected_ingredients: parsed.ingredients ?? [], status: "complete", image_paths: [] });
        if (!scanError) setScansUsed(value => value + 1);
      }
      setScreen("confirm");
    } catch (err) { setError(err instanceof Error ? err.message : "We couldn't read those photos."); setScreen("scan"); }
    finally { window.clearInterval(timer); }
  };

  const findMeals = async () => {
    setScreen("loading"); setLoadingStage(2); setError("");
    try {
      const result = await analyze({ data: { images: [photos[0]], ingredients: ingredients.map(i => `${i.quantity} ${i.name}`), servings, maxMinutes, mealType, diet, mode: "recipes" } });
      const parsed = JSON.parse(result.payload) as { recipes: Recipe[] };
      setRecipes(parsed.recipes ?? []); setScreen("results");
    } catch (err) { setError(err instanceof Error ? err.message : "We couldn't make recipes right now."); setScreen("preferences"); }
  };

  const submitAuth = async () => {
    setError(""); setMessage("");
    const options = authMode === "signup"
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email, password });
    if (options.error) setError(options.error.message);
    else if (authMode === "signup" && !options.data.session) setMessage("Check your email to confirm your account.");
    else setAuthOpen(false);
  };

  const openRecipe = (recipe: Recipe) => { setSelected(recipe); setScreen("recipe"); window.scrollTo(0, 0); };
  const reset = () => { setPhotos([]); setIngredients([]); setRecipes([]); setSelected(null); setScreen("scan"); };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <button type="button" onClick={() => setScreen("home")} className="flex items-center gap-2 font-extrabold"><span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground"><Sparkles className="size-4" /></span>Pantry Snap</button>
          <Button variant="ghost" size="sm" onClick={() => userEmail ? setScreen("profile") : setAuthOpen(true)}>{userEmail ? userEmail.split("@")[0] : "Sign in"}</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-28 pt-6 md:pt-10">
        {error && <div className="mx-auto mb-5 max-w-xl rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

        {screen === "home" && <div className="space-y-14">
          <section className="grid items-center gap-8 md:grid-cols-[1fr_1.05fr]">
            <div className="py-4 md:py-12">
              <span className="mb-4 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider text-secondary-foreground">Dinner, solved</span>
              <h1 className="font-display text-6xl leading-[.94] md:text-8xl">What’s for dinner?</h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground md:text-xl">Snap what you’ve got. We’ll figure out the rest.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-14 rounded-full px-7 text-base shadow-xl shadow-primary/20" onClick={() => setScreen("scan")}><Camera /> Snap my food</Button>
                <Button variant="outline" size="lg" className="h-14 rounded-full px-7 text-base" onClick={() => { setScreen("scan"); setTimeout(() => fileRef.current?.click(), 50); }}><ImagePlus /> Upload photos</Button>
              </div>
              <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-muted-foreground"><span>Snap</span><span>→</span><span>Confirm</span><span>→</span><span>Cook</span></div>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] app-shadow md:aspect-[5/4]"><img src={chickenImage} alt="Lemon herb chicken skillet" className="h-full w-full object-cover" width={1200} height={912}/><div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-background/90 p-4 backdrop-blur"><p className="font-display text-2xl">Lemon herb skillet</p><p className="mt-1 text-sm text-muted-foreground">Made from a fridge clean-out · 35 min</p></div></div>
          </section>
          <section><div className="mb-5 flex items-end justify-between"><div><p className="text-sm font-bold text-primary">A little inspiration</p><h2 className="font-display text-4xl">Your next favorite dinner</h2></div></div><div className="grid gap-5 sm:grid-cols-3">{exampleRecipes.map(item => <article key={item.name} className="overflow-hidden rounded-2xl border bg-card shadow-sm"><img src={item.image} alt={item.name} loading="lazy" width={1200} height={912} className="aspect-[4/3] w-full object-cover"/><div className="p-4"><h3 className="font-bold">{item.name}</h3><p className="mt-1 text-sm text-muted-foreground">{item.meta}</p></div></article>)}</div></section>
        </div>}

        {screen === "scan" && <section className="mx-auto max-w-2xl">
          <button className="mb-6 flex items-center gap-1 text-sm font-semibold" onClick={() => setScreen("home")}><ChevronLeft /> Back</button>
          <p className="text-sm font-bold text-primary">Step 1 of 3</p><h1 className="mt-1 font-display text-5xl">Show us what you’ve got</h1><p className="mt-3 text-muted-foreground">Add up to three clear photos. One is enough to get started.</p>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => pickPhotos(e.target.files)}/>
          <div className="mt-8 grid grid-cols-3 gap-3">{["Fridge","Pantry","Counter"].map((label, index) => { const photo = photos[index]; return <button key={label} type="button" onClick={() => fileRef.current?.click()} className="relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-dashed border-border bg-card">{photo ? <><img src={photo} alt={`${label} upload`} className="h-full w-full object-cover"/><span onClick={e => {e.stopPropagation();setPhotos(p => p.filter((_,i)=>i!==index));}} className="absolute right-2 top-2 rounded-full bg-foreground p-1 text-background"><X className="size-4"/></span></> : <span className="flex h-full flex-col items-center justify-center gap-2 text-sm font-bold text-muted-foreground"><ImagePlus className="size-6"/>{label}</span>}</button>})}</div>
          <div className="mt-5 rounded-2xl bg-muted p-4 text-sm text-muted-foreground"><strong className="text-foreground">Best results:</strong> Open the door, turn on the light, and include labels when you can.</div>
          <Button className="mt-8 h-14 w-full rounded-full text-base" disabled={!photos.length} onClick={detect}>Find my ingredients <Sparkles /></Button>
        </section>}

        {screen === "loading" && <section className="mx-auto flex min-h-[65vh] max-w-lg flex-col items-center justify-center text-center"><div className="pantry-pulse flex size-28 items-center justify-center rounded-full bg-secondary"><Sparkles className="size-10 text-primary"/></div><p className="mt-8 text-sm font-bold text-primary">Pantry Snap is thinking</p><h1 className="mt-2 font-display text-4xl">{["Looking through your fridge...","Finding ingredients...","Figuring out what you can make..."][loadingStage]}</h1><p className="mt-3 text-muted-foreground">Keep this open. This usually takes a few moments.</p></section>}

        {screen === "confirm" && <section className="mx-auto max-w-2xl"><p className="text-sm font-bold text-primary">Step 2 of 3</p><h1 className="mt-1 font-display text-5xl">Did we get it right?</h1><p className="mt-3 text-muted-foreground">Tap anything that looks wrong, or add what we missed.</p><div className="mt-7 flex flex-wrap gap-2">{ingredients.map((item,index)=><div key={`${item.name}-${index}`} className="flex items-center gap-2 rounded-full border bg-card py-2 pl-4 pr-2 shadow-sm"><span className="font-semibold">{item.name}</span>{item.quantity && <span className="text-sm text-muted-foreground">{item.quantity}</span>}<button aria-label={`Remove ${item.name}`} onClick={()=>setIngredients(v=>v.filter((_,i)=>i!==index))} className="rounded-full bg-muted p-1"><X className="size-3"/></button></div>)}</div><div className="mt-6 flex gap-2"><Input value={newIngredient} onChange={e=>setNewIngredient(e.target.value)} placeholder="Add an ingredient" onKeyDown={e=>{if(e.key==="Enter"&&newIngredient){setIngredients(v=>[...v,{name:newIngredient,quantity:""}]);setNewIngredient("")}}}/><Button variant="secondary" onClick={()=>{if(newIngredient){setIngredients(v=>[...v,{name:newIngredient,quantity:""}]);setNewIngredient("")}}}><Plus/> Add</Button></div><div className="mt-6"><p className="mb-3 text-xs font-bold uppercase text-muted-foreground">Quick add</p><div className="flex flex-wrap gap-2">{["Salt","Pepper","Oil","Water","Garlic","Butter"].map(name=><Button key={name} variant="outline" size="sm" className="rounded-full" onClick={()=>setIngredients(v=>v.some(i=>i.name.toLowerCase()===name.toLowerCase())?v:[...v,{name,quantity:"as needed"}])}><Plus/>{name}</Button>)}</div></div><Button className="mt-9 h-14 w-full rounded-full text-base" onClick={()=>setScreen("preferences")}>Looks good</Button></section>}

        {screen === "preferences" && <section className="mx-auto max-w-2xl"><button className="mb-6 flex items-center gap-1 text-sm font-semibold" onClick={()=>setScreen("confirm")}><ChevronLeft/> Ingredients</button><p className="text-sm font-bold text-primary">Step 3 of 3</p><h1 className="mt-1 font-display text-5xl">Make it yours</h1><div className="mt-8 space-y-8"><div><p className="mb-3 font-bold">Servings</p><div className="flex w-fit items-center gap-7 rounded-full border bg-card p-2"><Button variant="ghost" size="icon" className="rounded-full" onClick={()=>setServings(v=>Math.max(1,v-1))}><Minus/></Button><span className="min-w-5 text-center text-xl font-extrabold">{servings}</span><Button variant="ghost" size="icon" className="rounded-full" onClick={()=>setServings(v=>Math.min(10,v+1))}><Plus/></Button></div></div><Choice label="Maximum time" values={["15","30","45","60+"]} value={maxMinutes} onChange={setMaxMinutes} suffix=" min"/><Choice label="Meal type" values={["Breakfast","Lunch","Dinner","Snack"]} value={mealType} onChange={setMealType}/><Choice label="Diet (optional)" values={["None","Vegetarian","Vegan","Gluten-free"]} value={diet} onChange={setDiet}/></div><Button className="mt-10 h-14 w-full rounded-full text-base" onClick={findMeals}>Find my meals <Sparkles/></Button></section>}

        {screen === "results" && <section className="mx-auto max-w-3xl"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold text-primary">Fresh from your kitchen</p><h1 className="mt-1 font-display text-5xl">Dinner is handled</h1></div><Button variant="outline" size="sm" className="rounded-full" onClick={reset}>Scan again</Button></div><div className="mt-7 space-y-5">{recipes.map((recipe,index)=><button key={recipe.name} onClick={()=>openRecipe(recipe)} className="group grid w-full overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:grid-cols-[220px_1fr]"><img src={visuals[index%visuals.length]} alt="" width={1200} height={912} className="h-52 w-full object-cover sm:h-full"/><div className="p-5"><span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{recipe.matchPercent}% already here</span><h2 className="mt-4 font-display text-3xl">{recipe.name}</h2><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p><div className="mt-5 flex gap-5 text-sm font-semibold"><span><Clock3 className="mr-1 inline size-4"/>{recipe.prepMinutes + recipe.cookMinutes} min</span><span>{recipe.missingIngredients.length ? `${recipe.missingIngredients.length} missing` : "Nothing missing"}</span></div></div></button>)}</div></section>}

        {screen === "recipe" && selected && <article className="mx-auto max-w-3xl"><button className="mb-5 flex items-center gap-1 text-sm font-semibold" onClick={()=>setScreen("results")}><ChevronLeft/> All recipes</button><div className="relative overflow-hidden rounded-[2rem]"><img src={visuals[Math.max(0,recipes.indexOf(selected))%visuals.length]} alt={selected.name} width={1200} height={912} className="aspect-[4/3] w-full object-cover md:aspect-[16/9]"/><button aria-label="Save recipe" onClick={()=>setSaved(v=>v.includes(selected.name)?v.filter(n=>n!==selected.name):[...v,selected.name])} className="absolute right-4 top-4 rounded-full bg-background p-3 shadow-lg"><Heart className={saved.includes(selected.name)?"fill-primary text-primary":""}/></button></div><h1 className="mt-7 font-display text-5xl">{selected.name}</h1><p className="mt-3 text-lg text-muted-foreground">{selected.description}</p><div className="mt-5 flex flex-wrap gap-5 font-bold"><span>{selected.prepMinutes+selected.cookMinutes} min total</span><span>{servings} servings</span><span>{selected.matchPercent}% on hand</span></div>{selected.missingIngredients.length>0&&<div className="mt-7 rounded-2xl bg-secondary p-5"><p className="font-bold">You’re missing</p><p className="mt-1 text-sm">{selected.missingIngredients.join(", ")}</p>{selected.substitutes?.[0]&&<p className="mt-3 text-sm"><strong>Easy swap:</strong> {selected.substitutes[0].from} → {selected.substitutes[0].to}</p>}</div>}<div className="mt-10 grid gap-10 md:grid-cols-[.8fr_1.2fr]"><section><h2 className="font-display text-3xl">Ingredients</h2><ul className="mt-4 divide-y">{selected.ingredients.map(item=><li key={item.name} className="flex justify-between gap-4 py-3"><span>{item.name}</span><strong className="text-right">{item.measurement}</strong></li>)}</ul></section><section><h2 className="font-display text-3xl">Method</h2><ol className="mt-4 space-y-5">{selected.steps.map((step,index)=><li key={index} className="grid grid-cols-[2rem_1fr] gap-3"><span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index+1}</span><p className="pt-1 leading-relaxed">{step}</p></li>)}</ol></section></div><Button className="sticky bottom-24 mt-10 h-14 w-full rounded-full text-base shadow-xl">Start cooking</Button></article>}

        {screen === "favorites" && <section className="mx-auto max-w-3xl"><h1 className="font-display text-5xl">Saved recipes</h1>{saved.length===0?<div className="mt-12 rounded-2xl border border-dashed p-10 text-center"><Heart className="mx-auto size-8 text-muted-foreground"/><h2 className="mt-4 font-bold">Nothing saved yet</h2><p className="mt-2 text-sm text-muted-foreground">Tap the heart on a recipe you want to cook later.</p><Button className="mt-5 rounded-full" onClick={()=>setScreen("home")}>Find a recipe</Button></div>:<div className="mt-7 grid gap-4 sm:grid-cols-2">{recipes.filter(r=>saved.includes(r.name)).map((r,i)=><button key={r.name} onClick={()=>openRecipe(r)} className="overflow-hidden rounded-2xl border bg-card text-left"><img src={visuals[i%3]} alt="" className="aspect-[4/3] w-full object-cover"/><div className="p-4 font-bold">{r.name}</div></button>)}</div>}</section>}

        {screen === "profile" && <section className="mx-auto max-w-xl"><h1 className="font-display text-5xl">Your kitchen</h1><div className="mt-7 rounded-2xl border bg-card p-6"><div className="flex items-center gap-4"><span className="flex size-14 items-center justify-center rounded-full bg-secondary"><UserRound/></span><div><p className="font-bold">{userEmail ?? "Guest cook"}</p><p className="text-sm text-muted-foreground">{isPro ? "Pro plan" : "Free plan"}</p></div></div><div className="mt-6 rounded-xl bg-muted p-4"><div className="flex justify-between text-sm font-bold"><span>Monthly scans</span><span>{isPro ? "Unlimited" : `${scansUsed} of 3 used`}</span></div>{!isPro&&<progress className="mt-3 h-2 w-full overflow-hidden rounded-full accent-primary" max={3} value={scansUsed}/>}</div>{userEmail?<Button variant="outline" className="mt-6 w-full" onClick={async()=>{await supabase.auth.signOut();setScreen("home")}}>Sign out</Button>:<Button className="mt-6 w-full" onClick={()=>setAuthOpen(true)}>Sign in</Button>}</div></section>}
      </main>

      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 px-6 pt-2 backdrop-blur"><div className="mx-auto flex max-w-md justify-around">{([{id:"home",label:"Home",icon:Home},{id:"favorites",label:"Favorites",icon:Heart},{id:"profile",label:"Profile",icon:UserRound}] as const).map(item=><button key={item.id} onClick={()=>setScreen(item.id)} className={`flex min-w-20 flex-col items-center gap-1 py-1 text-xs font-semibold ${screen===item.id?"text-primary":"text-muted-foreground"}`}><item.icon className="size-5"/>{item.label}</button>)}</div></nav>

      {authOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-5" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthOpen(false)}}><div className="w-full max-w-md rounded-t-[2rem] bg-background p-6 app-shadow sm:rounded-[2rem]"><div className="flex items-center justify-between"><h2 className="font-display text-3xl">{authMode==="signin"?"Welcome back":"Create your account"}</h2><Button variant="ghost" size="icon" className="rounded-full" onClick={()=>setAuthOpen(false)}><X/></Button></div><p className="mt-2 text-sm text-muted-foreground">Save favorites and get 3 free scans every month.</p><Button variant="outline" className="mt-6 h-12 w-full rounded-full" onClick={async()=>{const result=await lovable.auth.signInWithOAuth("google",{redirect_uri:window.location.origin});if(result.error)setError(result.error.message)}}>Continue with Google</Button><div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border"/>OR<span className="h-px flex-1 bg-border"/></div><div className="space-y-3"><Input type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/><Input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/></div>{error&&<p className="mt-3 text-sm text-destructive">{error}</p>}{message&&<p className="mt-3 text-sm text-primary">{message}</p>}<Button className="mt-4 h-12 w-full rounded-full" onClick={submitAuth}>{authMode==="signin"?"Sign in":"Create account"}</Button><button className="mt-4 w-full text-center text-sm font-semibold text-primary" onClick={()=>setAuthMode(v=>v==="signin"?"signup":"signin")}>{authMode==="signin"?"New here? Create an account":"Already have an account? Sign in"}</button></div></div>}
      {paywallOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center sm:p-5"><div className="w-full max-w-md rounded-t-[2rem] bg-background p-7 text-center app-shadow sm:rounded-[2rem]"><span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary"><Sparkles className="text-primary"/></span><h2 className="mt-5 font-display text-4xl">Keep the ideas coming</h2><p className="mt-3 text-muted-foreground">You’ve used your 3 free scans this month. Pantry Snap Pro includes unlimited scans.</p><Button className="mt-6 h-12 w-full rounded-full" disabled>Upgrade payments coming soon</Button><Button variant="ghost" className="mt-2 w-full" onClick={()=>setPaywallOpen(false)}>Maybe later</Button></div></div>}
    </div>
  );
}

function Choice({label,values,value,onChange,suffix=""}:{label:string;values:string[];value:string;onChange:(value:string)=>void;suffix?:string}) {
  return <div><p className="mb-3 font-bold">{label}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{values.map(item=><Button key={item} variant={value===item?"default":"outline"} className="h-11 rounded-full" onClick={()=>onChange(item)}>{item}{suffix}</Button>)}</div></div>;
}
