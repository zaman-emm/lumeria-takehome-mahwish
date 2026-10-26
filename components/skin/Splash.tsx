"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Gauge } from "./Gauge";
import s from "./splash.module.css";

// The splash a first load opens on. The score sits big in the middle of an
// evergreen screen and gold blooms out from behind it in three petals while
// the white arc draws and the number counts up. Then the gauge flies up into
// its place in the hero and the gold shrinks to the hero's shape, while the
// hero rises around them. A tap skips ahead to the flight.

/** The arc starts once the first petal is open, and draws a touch slower than in the hero. */
const LEAD = 520;
const DRAW = 1250;
/** The beat the finished score is held before it flies up. */
const HOLD = 380;
const FLY = 820;
const BLOOM = 1500;
const PETAL_STAGGER = 170;
const PETAL_START = 120;
/** Less front-loaded than the UI ease-out, so the colour is seen filling. */
const FILL = "cubic-bezier(0.3, 0.55, 0.25, 1)";
const OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const DRAWER = "cubic-bezier(0.32, 0.72, 0, 1)";
const HERO_RADIUS = 28;

type Geo = { left: number; top: number; width: number; height: number; scale: number; cy: number; h: number };

export function Splash({ value, onGo, onDone }: { value: number; onGo: () => void; onDone: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const dark = useRef<HTMLDivElement>(null);
  const petals = useRef<(HTMLDivElement | null)[]>([]);
  const skip = useRef<() => void>(() => {});
  const [geo, setGeo] = useState<Geo | null>(null);
  // The callbacks change every render; the timeline reads the latest.
  const calls = useRef({ onGo, onDone });
  calls.current = { onGo, onDone };

  // Measure where the hero's gauge will land, and size the big one from it.
  useLayoutEffect(() => {
    const box = document.querySelector("[data-skin-gauge]")?.getBoundingClientRect();
    const hero = document.querySelector("[data-skin-hero]")?.getBoundingClientRect();
    if (!box || !hero) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(1.25, (Math.min(vw, 430) - 24) / box.width);
    setGeo({ left: box.left, top: box.top, width: box.width, height: box.height, scale, cy: vh * 0.5, h: hero.height });
  }, []);

  useEffect(() => {
    if (!geo || !wrap.current || !dark.current) return;
    const el = wrap.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const reach = Math.hypot(vw, vh);
    const tx = (vw - geo.width * geo.scale) / 2 - geo.left;
    const ty = geo.cy - geo.height * geo.scale * 0.48 - geo.top;
    const centred = `translate(${tx}px, ${ty}px) scale(${geo.scale})`;
    el.style.transform = centred;
    // The bloom opens from behind the number.
    const origin = `at 50% ${geo.cy}px`;

    const bloom = petals.current.map((p, i) =>
      p?.animate([{ clipPath: `circle(0px ${origin})` }, { clipPath: `circle(${reach}px ${origin})` }], {
        duration: BLOOM,
        delay: PETAL_START + i * PETAL_STAGGER,
        easing: FILL,
        fill: "both",
      }),
    );

    const timers: number[] = [];
    let flown = false;
    const fly = () => {
      if (flown) return;
      flown = true;
      // A tap mid-draw lets the arc and count land first.
      el.getAnimations({ subtree: true }).forEach((a) => a.finish());
      const box = document.querySelector("[data-skin-gauge]")?.getBoundingClientRect();
      const hero = document.querySelector("[data-skin-hero]")?.getBoundingClientRect();
      if (!box || !hero) {
        calls.current.onGo();
        calls.current.onDone();
        return;
      }
      const to = `translate(${box.left - geo.left}px, ${box.top - geo.top}px) scale(${box.width / geo.width})`;
      const flight = el.animate([{ transform: centred }, { transform: to }], { duration: FLY, easing: DRAWER, fill: "forwards" });

      // Only the last petal, the hero's own gold, shrinks into the hero.
      petals.current.slice(0, 2).forEach((p) => p && (p.style.display = "none"));
      const sheet = petals.current[2];
      // Once it has the hero's shape it fades, so the hero's own gold (the same
      // gold) takes over and the headline rising on it shows through.
      sheet?.animate(
        [
          { clipPath: "inset(0px 0px 0px 0px round 0px 0px 0px 0px)", opacity: 1, offset: 0 },
          { opacity: 1, offset: 0.4 },
          {
            clipPath: `inset(${hero.top}px ${vw - hero.right}px ${vh - hero.bottom}px ${hero.left}px round 0px 0px ${HERO_RADIUS}px ${HERO_RADIUS}px)`,
            opacity: 0,
            offset: 1,
          },
        ],
        { duration: FLY, easing: DRAWER, fill: "forwards" },
      );
      // The sheet still covers the whole screen, so the night can go unseen.
      if (dark.current) dark.current.style.display = "none";

      calls.current.onGo();
      flight.finished.then(() => calls.current.onDone(), () => {});
    };
    skip.current = fly;
    timers.push(window.setTimeout(fly, LEAD + DRAW + HOLD));

    return () => {
      timers.forEach(window.clearTimeout);
      bloom.forEach((a) => a?.cancel());
    };
  }, [geo]);

  return (
    <div className={s.splash} onPointerDown={() => skip.current()} aria-hidden>
      <div ref={dark} className={s.dark} />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          ref={(n) => {
            petals.current[i] = n;
          }}
          className={s.petal}
          data-petal={i}
          style={{ "--h": `${geo?.h ?? 0}px`, clipPath: "circle(0px at 50% 50%)" } as CSSProperties}
        />
      ))}
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
