"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    VANTA?: {
      CLOUDS: (options: Record<string, unknown>) => { destroy?: () => void };
    };
  }
}

export function VantaBackground() {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const effectRef = useRef<{ destroy?: () => void } | null>(null);
  const [scriptsReady, setScriptsReady] = useState(false);

  useEffect(() => {
    if (!scriptsReady || !elementRef.current || !window.VANTA || effectRef.current) return;

    effectRef.current = window.VANTA.CLOUDS({
      el: elementRef.current,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      backgroundColor: 0x0c0b09,
      skyColor: 0x18130d,
      cloudColor: 0x5a4422,
      cloudShadowColor: 0x120f0a,
      sunColor: 0xe8a830,
      sunGlareColor: 0xf5c842,
      sunlightColor: 0x9c6616,
      speed: 0.4,
    });

    return () => {
      effectRef.current?.destroy?.();
      effectRef.current = null;
    };
  }, [scriptsReady]);

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r121/three.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.clouds.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsReady(true)}
      />
      <div
        ref={elementRef}
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.48]"
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[1] pointer-events-none bg-[radial-gradient(circle_at_20%_0%,rgba(232,168,48,0.08),transparent_28%),linear-gradient(180deg,rgba(12,11,9,0.12),rgba(12,11,9,0.28)_42%,rgba(12,11,9,0.56)_100%)]"
      />
    </>
  );
}
