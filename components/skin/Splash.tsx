"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Gauge } from "./Gauge";
import s from "./splash.module.css";

// The splash a first load opens on. The home page's own background stays put
// (the gold hero, nothing on it) behind one frosted glass layer. The score
// ring loads on the glass: it draws and the number counts up. Then the glass
// melts away as the gauge moves up into its place in the hero, and the hero
// rises around it. A tap skips ahead to the move.

/** The arc starts once the gauge has faded in, and draws a touch slower than in the hero. */
const LEAD = 450;
const DRAW = 1250;
/** The beat the finished score is held before it moves up. */
const HOLD = 380;
const FLY = 820;
const OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const DRAWER = "cubic-bezier(0.32, 0.72, 0, 1)";

type Geo = { left: number; top: number; width: number; height: number; scale: number; cy: number };

export function Splash({ value, onGo, onDone }: { value: number; onGo: () => void; onDone: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const skip = useRef<() => void>(() => {});
  const [geo, setGeo] = useState<Geo | null>(null);
  // The callbacks change every render; the timeline reads the latest.
  const calls = useRef({ onGo, onDone });
  calls.current = { onGo, onDone };

  // Measure where the hero's gauge will land, and size the big one from it.
  useLayoutEffect(() => {
    const box = document.querySelector("[data-skin-gauge]")?.getBoundingClientRect();
    if (!box) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(1.25, (Math.min(vw, 430) - 24) / box.width);
    setGeo({ left: box.left, top: box.top, width: box.width, height: box.height, scale, cy: vh * 0.5 });
  }, []);

  useEffect(() => {
    if (!geo || !wrap.current) return;
    const el = wrap.current;
    const vw = window.innerWidth;
    const tx = (vw - geo.width * geo.scale) / 2 - geo.left;
    const ty = geo.cy - geo.height * geo.scale * 0.48 - geo.top;
    const centred = `translate(${tx}px, ${ty}px) scale(${geo.scale})`;
    const settling = `translate(${tx}px, ${ty}px) scale(${geo.scale * 0.94})`;
    el.style.transform = centred;

    // The ring eases in on the glass before it draws.
    const enter = el.animate([{ opacity: 0, transform: settling }, { opacity: 1, transform: centred }], {
      duration: 560,
      easing: OUT,
      fill: "both",
    });

    const timers: number[] = [];
    let flown = false;
    const fly = () => {
      if (flown) return;
      flown = true;
      enter.finish();
      // A tap mid-draw lets the arc and count land first.
      el.getAnimations({ subtree: true }).forEach((a) => a.finish());
      const box = document.querySelector("[data-skin-gauge]")?.getBoundingClientRect();
      if (!box) {
        calls.current.onGo();
        calls.current.onDone();
        return;
      }
      const to = `translate(${box.left - geo.left}px, ${box.top - geo.top}px) scale(${box.width / geo.width})`;
      const flight = el.animate([{ transform: centred }, { transform: to }], { duration: FLY, easing: DRAWER, fill: "forwards" });
      // The glass clears as the gauge leaves; the gold beneath never changes.
      veil.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 640, easing: OUT, fill: "forwards" });

      calls.current.onGo();
      flight.finished.then(() => calls.current.onDone(), () => {});
    };
    skip.current = fly;
    timers.push(window.setTimeout(fly, LEAD + DRAW + HOLD));

    return () => {
      timers.forEach(window.clearTimeout);
      enter.cancel();
    };
  }, [geo]);

  return (
    <div className={s.splash} onPointerDown={() => skip.current()} aria-hidden>
      <div ref={veil} className={s.veil} />
      <div
        ref={wrap}
        className={s.gauge}
        data-ready={Boolean(geo)}
        style={geo ? { left: geo.left, top: geo.top, width: geo.width, height: geo.height } : undefined}
      >
        {geo && <Gauge value={value} play lead={LEAD} draw={DRAW} decorative />}
      </div>
    </div>
  );
}
