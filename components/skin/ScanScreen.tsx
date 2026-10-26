"use client";

import { useState } from "react";
import type { Derived } from "@/lib/insights";
import { LIGHTS } from "./ui";
import s from "./screens.module.css";

// Scan: a stand-in for the camera. A viewfinder with the guide circle and its
// corner marks, the spot to hold the scope to, the three lights it will take,
// and the shutter. This prototype doesn't take photos; the shutter says so.

export function ScanScreen({ d }: { d: Derived }) {
  const [area, setArea] = useState(d.latest.area);
  const [shot, setShot] = useState(false);
  const spots = d.areas.map((a) => a.area);
  return (
    <div className={s.scan} data-screen="dark">
      <div className={s.spots} role="radiogroup" aria-label="Spot">
        {spots.map((a) => (
          <button key={a} role="radio" aria-checked={a === area} onClick={() => setArea(a)}>
            {a}
          </button>
        ))}
      </div>

      <div className={s.finder} data-shot={shot} aria-hidden>
        <i className={s.corners} />
        <i className={s.guide} />
      </div>

      <p className={s.hint} aria-live="polite">
        {shot ? "Captured. Taking a scan isn’t part of this prototype." : `Hold the scope flat to your ${area.toLowerCase()}.`}
      </p>
      <ul className={s.lights} aria-label="The scope takes three photos">
        {LIGHTS.map((l) => (
          <li key={l.key}>{l.label}</li>
        ))}
      </ul>

      <button
        className={s.shutter}
        aria-label="Capture"
        onClick={() => {
          setShot(true);
          window.setTimeout(() => setShot(false), 2400);
        }}
      >
        <i />
      </button>
    </div>
  );
}
