"use client";

import { useRef } from "react";
import JarvisOrb, { type JarvisOrbHandle } from "@/components/JarvisOrb";
import VoiceControl from "@/components/VoiceControl";

export default function Home() {
  const orbRef = useRef<JarvisOrbHandle>(null);

  return (
    <>
      <JarvisOrb ref={orbRef} />
      <VoiceControl onActivity={(level) => orbRef.current?.setActivity(level)} />
    </>
  );
}
