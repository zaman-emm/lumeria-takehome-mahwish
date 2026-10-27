"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";
import { band } from "@/lib/insights";
import h from "./hero.module.css";

// The sunrise gauge: a thick arc drawn to the score, rays up to it that swell
// as the tip passes, and the number counting up on the same curve so it lands
// with the tip. The hero shows it, and so does the splash before it flies up.

const CX = 171;
const CY = 185;
const R = 118;
const RAYS = 16;
const RAY_STEP = 12;
/** The arc's cubic ease-out, shared by the count so both land together. */
const ease = (p: number) => 1 - (1 - p) ** 3;

const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;
};

export function Gauge({
  value,
  play,
  lead = 150,
  draw = 1100,
  named,
  decorative,
}: {
  value: number;
  /** Draw the arc and count up; otherwise it simply is there. */
  play: boolean;
  /** Where the arc starts drawing, in ms. */
  lead?: number;
  /** How long the arc takes to draw, in ms; the rays and the count follow it. */
  draw?: number;
  /** Gives the score a view-transition name, for the one gauge the tabs morph. */
  named?: boolean;
  /** The splash copy is hidden from assistive tech; the hero's carries the label. */
  decorative?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const digits = useRef<HTMLSpanElement>(null);
  const arc = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!play || !digits.current) return;
    const el = digits.current;
    const start = performance.now() + lead;
    let raf = 0;
    // Read the arc's own clock when it has one, so the count never drifts from the tip.
    const tick = (now: number) => {
      const anim = arc.current?.getAnimations()[0];
      const t = anim?.currentTime != null ? Number(anim.currentTime) - lead : now - start;
      const p = Math.max(0, Math.min(1, t / draw));
      el.textContent = String(Math.round(value * ease(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    el.textContent = "0";
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = String(value);
    };
  }, [play, value, lead, draw]);

  /** When the arc's tip reaches a share of its length, with the ease-out it draws on. */
  const reach = (share: number) => lead + draw * (1 - Math.cbrt(1 - Math.min(1, share)));
  const lit = Math.round((value / 100) * (RAYS - 1));
  const word = band(value).word;
  const label = decorative ? undefined : `Overall score ${value} out of 100, ${word.toLowerCase()}`;

  return (
    <div
      className={h.gauge}
      data-play={play}
      role={decorative ? undefined : "img"}
      aria-label={label}
      aria-hidden={decorative || undefined}
      style={{ "--lead": `${lead}ms`, "--draw": `${draw}ms` } as CSSProperties}
    >
      <svg viewBox="0 0 342 240" aria-hidden>
        <defs>
          <linearGradient id={`arc-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" className={h.arcFrom} />
            <stop offset="1" className={h.arcTo} />
          </linearGradient>
        </defs>
        {Array.from({ length: RAYS }, (_, i) => {
          const deg = 180 - i * RAY_STEP;
          const [x1, y1] = polar(deg, 146);
          const [x2, y2] = polar(deg, i % 2 ? 158 : 167);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className={h.ray}
              data-lit={i <= lit}
              style={{ "--i": i, "--at": `${reach(i / (RAYS - 1) / (value / 100))}ms` } as CSSProperties}
            />
          );
        })}
        <path d={`M${CX - R} ${CY}A${R} ${R} 0 0 1 ${CX + R} ${CY}`} className={h.track} />
        <path
          d={`M${CX - R} ${CY}A${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          ref={arc}
          className={h.arc}
          stroke={`url(#arc-${id})`}
          pathLength={100}
          strokeDasharray={`${value} 200`}
          style={{ "--v": value } as CSSProperties}
        />
      </svg>
      <div className={h.score}>
        <span className={h.value} style={named ? { viewTransitionName: "skin-score" } : undefined}>
          <span ref={digits} className={h.digits} aria-hidden>
            {value}
          </span>
        </span>
      </div>
    </div>
  );
}
