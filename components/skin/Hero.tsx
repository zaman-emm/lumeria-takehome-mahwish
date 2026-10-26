"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { band, fmtDay, scanTz, type Derived } from "@/lib/insights";
import type { Scan } from "@/lib/types";
import { useFirstTime } from "./hooks";
import { Flame, Icon } from "./Icon";
import { headline, sinceStart } from "@/lib/voice";
import { Logo } from "./Logo";
import { Photo } from "./ui";
import h from "./hero.module.css";

// The At a glance hero: the score as a sunrise gauge on gold. On first load
// the thick arc draws to the score, each ray up to it swells as the tip
// passes, and the number counts up on the same curve so it lands with the
// tip. Once per load only.

const CX = 171;
const CY = 185;
const R = 118;
const RAYS = 25;
/** How long the arc takes to draw, in ms; the rays and the count follow it. */
const DRAW = 1100;
/** Where the arc starts drawing, in ms. */
const LEAD = 150;
/** The arc's cubic ease-out, shared by the count so both land together. */
const ease = (p: number) => 1 - (1 - p) ** 3;

/** When the arc's tip reaches a share of its length, with the ease-out it draws on. */
const reach = (share: number) => LEAD + DRAW * (1 - Math.cbrt(1 - Math.min(1, share)));

const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;
};

/**
 * Then and now for the card: the first and newest real photos of the spot,
 * else the two scans the trend compares. Never a real photo beside a stand-in.
 */
function beforeAfter(d: Derived, lens: Scan): [Scan, Scan] | null {
  const real = d.realPhotos.filter((s) => s.area === lens.area);
  if (real.length >= 2) return [real[0], real[real.length - 1]];
  if (real.length || !d.trend?.from.photoUrl || !d.trend.to.photoUrl) return null;
  return [d.trend.from, d.trend.to];
}

export function Hero({
  d,
  lens,
  onScan,
  slides,
  onPlay,
}: {
  d: Derived;
  lens: Scan;
  onScan: () => void;
  /** How many slides the month has; the button previews them as segments. */
  slides: number;
  onPlay?: (from: HTMLElement) => void;
}) {
  const value = d.latest.scores.overall;
  const reduce = useReducedMotion();
  const first = useFirstTime("hero");
  const play = first && !reduce;
  const digits = useRef<HTMLSpanElement>(null);
  const arc = useRef<SVGPathElement>(null);

  const gauge = useSearchParams().get("gauge") ?? "forest";

  useEffect(() => {
    if (!play || !digits.current) return;
    const el = digits.current;
    const start = performance.now() + LEAD;
    let raf = 0;
    // Read the arc's own clock when it has one, so the count never drifts from the tip.
    const tick = (now: number) => {
      const draw = arc.current?.getAnimations()[0];
      const t = draw?.currentTime != null ? Number(draw.currentTime) - LEAD : now - start;
      const p = Math.max(0, Math.min(1, t / DRAW));
      el.textContent = String(Math.round(value * ease(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    el.textContent = "0";
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = String(value);
    };
  }, [play, value]);

  const pair = beforeAfter(d, lens);
  const lit = Math.round((value / 100) * (RAYS - 1));
  const word = band(value).word;
  const tz = scanTz(d.latest) ?? d.tz;
  const dayOf = (s: Scan) => fmtDay(s.takenAt, scanTz(s) ?? d.tz);

  return (
    <header className={h.hero} data-gauge={gauge} data-play={play} data-reduce={first && reduce}>
      <Logo className={h.logo} />
      <p className={h.hi}>Hi {d.firstName},</p>
      <h1 className={h.title}>{headline(d)}</h1>

      <div className={h.gauge} role="img" aria-label={`Overall score ${value} out of 100, ${word.toLowerCase()}`}>
        <svg viewBox="0 0 342 240" aria-hidden>
          <defs>
            <linearGradient id="hero-arc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" className={h.arcFrom} />
              <stop offset="1" className={h.arcTo} />
            </linearGradient>
          </defs>
          {Array.from({ length: RAYS }, (_, i) => {
            const deg = 180 - i * 7.5;
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
            pathLength={100}
            strokeDasharray={`${value} 200`}
            style={{ "--v": value } as CSSProperties}
          />
        </svg>
        <div className={h.score}>
          <span className={h.value} style={{ viewTransitionName: "skin-score" }}>
            <span ref={digits} className={h.digits} aria-hidden>
              {value}
            </span>
          </span>
          <span className={h.label}>Overall score</span>
        </div>
      </div>

      <div className={h.card}>
        <div className={h.cardText}>
          <span className={h.pill}>{word}</span>
          <span className={h.change}>
            {d.trend && <Icon name={d.trend.delta >= 0 ? "up" : "down"} size={14} stroke={1.8} />}
            {sinceStart(d)}
          </span>
        </div>
        {pair ? (
          <button
            className={h.pair}
            onClick={onScan}
            aria-label={`Your skin on ${dayOf(pair[0])} and ${dayOf(pair[1])}. Open your latest scan`}
          >
            {pair.map((s, i) => (
              <span key={s.id} className={h.pairItem} data-now={i === 1}>
                <Photo
                  scan={s}
                  priority
                  alt=""
                  className={h.scanPhoto}
                  style={i === 1 ? { viewTransitionName: "skin-photo" } : undefined}
                />
                <span>{dayOf(s)}</span>
              </span>
            ))}
          </button>
        ) : (
          <button className={h.scan} onClick={onScan} aria-label={`Open your scan from ${fmtDay(lens.takenAt, tz)}`}>
            <Photo scan={lens} priority alt="" className={h.scanPhoto} style={{ viewTransitionName: "skin-photo" }} />
            <span>Your scan</span>
          </button>
        )}
      </div>

      {onPlay && (
        <button className={h.month} onClick={(e) => onPlay(e.currentTarget)}>
          <span className={h.monthPlay}>
            <Icon name="play" size={14} />
          </span>
          {d.isMonthly ? "Play your month" : "Play your story"}
          <span className={h.segs} aria-hidden>
            {Array.from({ length: slides }, (_, i) => (
              <i key={i} style={{ "--i": i } as CSSProperties} />
            ))}
          </span>
        </button>
      )}
    </header>
  );
}

/** The other tabs open on this: score, streak and the recap, in one row. */
export function SlimHeader({
  d,
  lens,
  streak,
  onScan,
  onPlay,
}: {
  d: Derived;
  lens: Scan;
  streak: string;
  onScan: () => void;
  onPlay?: (from: HTMLElement) => void;
}) {
  const tz = scanTz(lens) ?? d.tz;
  return (
    <header className={h.slim}>
      <button className={h.slimLens} onClick={onScan} aria-label={`Open your scan from ${fmtDay(lens.takenAt, tz)}`}>
        <Photo scan={lens} alt="" style={{ viewTransitionName: "skin-photo" }} />
      </button>
      <span className={h.slimScore}>
        <b style={{ viewTransitionName: "skin-score" }}>{d.latest.scores.overall}</b>
        <span>overall</span>
        {d.trend && <em>{d.trend.delta > 0 ? `+${d.trend.delta}` : d.trend.delta < 0 ? `−${-d.trend.delta}` : "±0"}</em>}
      </span>
      <span className={h.streak} aria-label={`Weekly streak: ${streak}`}>
        <Flame size={16} />
        {streak}
      </span>
      {onPlay && (
        <button className={h.play} onClick={(e) => onPlay(e.currentTarget)} aria-label={d.isMonthly ? "Play your month" : "Play your story"}>
          <Icon name="play" size={14} />
        </button>
      )}
    </header>
  );
}
