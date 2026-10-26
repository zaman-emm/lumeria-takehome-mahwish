"use client";

import { useEffect, useState, type ReactNode } from "react";
import f from "./frame.module.css";

// On a laptop the report sits in a Pixel-sized phone in the middle of the
// screen. The phone is an iframe of this same page, so inside it everything
// (fixed sheets, the story, 100dvh, the status bar) sizes to a real phone's
// 412 × 915 screen. On a phone, or inside the frame, it renders as is.

const W = 412;
const H = 915;
const BEZEL = 14;

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
        <iframe className={f.screen} src={location.href} title="Skin report" style={{ width: W, height: H }} />
      </div>
    </div>
  );
}
