"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal ambient types for the Web Speech API (not in lib.dom.d.ts).
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<SpeechRecognitionResultLike>;
  resultIndex: number;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

type LogEntry =
  | { kind: "user"; text: string }
  | { kind: "ultron"; text: string }
  | { kind: "action"; text: string }
  | { kind: "error"; text: string };

interface VoiceControlProps {
  onActivity?: (level: number) => void;
}

const ACTIVITY = { idle: 0, listening: 0.4, thinking: 0.65, speaking: 1 };

export default function VoiceControl({ onActivity }: VoiceControlProps) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSupported(Boolean(Ctor));
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log]);

  const speak = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (!text || !("speechSynthesis" in window)) {
          resolve();
          return;
        }
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.02;
        utter.pitch = 0.85;
        utter.onstart = () => onActivity?.(ACTIVITY.speaking);
        utter.onend = () => {
          onActivity?.(busy ? ACTIVITY.thinking : ACTIVITY.idle);
          resolve();
        };
        utter.onerror = () => resolve();
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }),
    [onActivity, busy],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setLog((l) => [...l, { kind: "user", text: trimmed }]);
      setBusy(true);
      onActivity?.(ACTIVITY.thinking);
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

        const actions: { summary: string }[] = data.actions ?? [];
        if (actions.length) {
          setLog((l) => [...l, ...actions.map((a) => ({ kind: "action" as const, text: a.summary }))]);
          if (actions.length > 0) setViewOpen(true);
        }
        const reply: string = data.reply ?? "";
        setLog((l) => [...l, { kind: "ultron", text: reply }]);
        setBusy(false);
        await speak(reply);
      } catch (err) {
        setBusy(false);
        const message = err instanceof Error ? err.message : String(err);
        setLog((l) => [...l, { kind: "error", text: message }]);
        onActivity?.(ACTIVITY.idle);
      }
    },
    [onActivity, speak],
  );

  const startListening = useCallback(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor || recognitionRef.current) return;
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results as unknown as SpeechRecognitionResultLike[])
        .map((r) => r[0].transcript)
        .join(" ");
      void send(transcript);
    };
    recognition.onerror = () => {
      setListening(false);
      onActivity?.(ACTIVITY.idle);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      onActivity?.(busy ? ACTIVITY.thinking : ACTIVITY.idle);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    onActivity?.(ACTIVITY.listening);
  }, [send, onActivity, busy]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const toggleListening = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = draft;
      setDraft("");
      void send(text);
    },
    [draft, send],
  );

  const resetConversation = useCallback(async () => {
    await fetch("/api/agent/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closeBrowser: false }),
    }).catch(() => {});
    setLog([]);
  }, []);

  return (
    <div className="hud ultron-panel">
      {!supported && (
        <div className="hud-error" style={{ marginBottom: 8 }}>
          Voice input needs Chrome/Edge (Web Speech API). You can still type below.
        </div>
      )}

      <div className="ultron-log">
        {log.map((entry, i) => (
          <div key={i} className={`ultron-log-row ultron-log-${entry.kind}`}>
            {entry.kind === "user" && <>› {entry.text}</>}
            {entry.kind === "ultron" && <>ULTRON: {entry.text}</>}
            {entry.kind === "action" && <>⚙ {entry.text}</>}
            {entry.kind === "error" && <>⚠ {entry.text}</>}
          </div>
        ))}
        {busy && <div className="ultron-log-row ultron-log-action">⚙ thinking…</div>}
        <div ref={logEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="hud-row" style={{ marginTop: 6 }}>
        <input
          className="ultron-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a command, or use the mic…"
        />
        <button type="submit" className="hud-btn" disabled={!draft.trim() || busy}>
          SEND
        </button>
      </form>

      <div className="hud-row" style={{ marginTop: 6 }}>
        <button
          type="button"
          className="hud-btn"
          aria-pressed={listening}
          onClick={toggleListening}
          disabled={!supported || busy}
        >
          {listening ? "● LISTENING…" : "🎤 SPEAK"}
        </button>
        <button type="button" className="hud-btn" onClick={() => setViewOpen((v) => !v)}>
          {viewOpen ? "HIDE VIEW" : "SHOW VIEW"}
        </button>
        <button type="button" className="hud-btn" onClick={() => void resetConversation()}>
          RESET
        </button>
      </div>

      {viewOpen && <BrowserView />}
    </div>
  );
}

function BrowserView() {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/agent/screenshot?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        setSrc((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        setFailed(false);
      } catch {
        setFailed(true);
      }
    };
    void tick();
    const id = setInterval(tick, 1500);
    return () => {
      stopped = true;
      clearInterval(id);
      setSrc((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
    };
  }, []);

  return (
    <div className="ultron-view">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="ULTRON's browser view" />
      ) : (
        <div className="ultron-view-empty">
          {failed ? "No browser session yet — ask ULTRON to open a site." : "Loading…"}
        </div>
      )}
    </div>
  );
}
