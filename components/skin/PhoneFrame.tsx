"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DeviceChrome } from "./DeviceChrome";
import { Gauge } from "./Gauge";
import f from "./frame.module.css";

// On a laptop the report sits in an iPhone-sized phone in the middle of the
// screen. The phone is an iframe of this same page, so inside it everything
// (fixed sheets, the story, 100dvh, the status bar) sizes to a real phone's
// 393 × 852 screen. On a phone, or inside the frame, it renders as is.

const W = 393;
const H = 852;
const BEZEL = 12;
/** The splash's ring: the screen less 12px each side, at the gauge's 342 : 240. */
const RING_H = ((W - 24) * 240) / 342;

const desktop = () => window.self === window.top && matchMedia("(hover: hover) and (pointer: fine)").matches;

export function PhoneFrame({ children }: { children: ReactNode }) {
  const [framed, setFramed] = useState<boolean | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setFramed(desktop());
    const fit = () => setScale(Math.min(1, (window.innerHeight - 48) / (H + BEZEL * 2)));
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);

  if (!framed) {
    // Held back on a laptop until we know, so the full-width page never flashes.
    return <div className={framed === null ? f.pending : undefined}>{children}</div>;
  }

  return (
    <div className={f.desk}>
      <div className={f.phone} style={{ width: W + BEZEL * 2, height: H + BEZEL * 2, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <span className={f.buttons} aria-hidden />
        <div className={f.clip}>
          {/* Behind the iframe: what the loading screen looks like, status bar and all, for the
              moment before the iframe's own page paints. Once it does, it covers this. */}
          <div className={f.under} style={{ width: W, height: H }} aria-hidden>
            <span className={f.gold} />
            {/* The ring's track, where the splash holds it (Splash.tsx, state.module.css .shell). */}
            <div className={f.ring} style={{ left: 12, width: W - 24, height: RING_H, top: H * 0.5 - RING_H * 0.48 }}>
              <Gauge value={0} play={false} idle decorative />
            </div>
            <DeviceChrome />
          </div>
          <iframe className={f.screen} src={location.href} title="Skin report" style={{ width: W, height: H }} />
          <span className={f.bezel} aria-hidden />
        </div>
      </div>
    </div>
  );
}
