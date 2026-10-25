"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { band, fmtDay, scanTz, type Derived } from "@/lib/insights";
import type { Scan } from "@/lib/types";
import { useFirstTime } from "./hooks";
import { Flame, Icon } from "./Icon";
import { Logo } from "./Logo";
import { Photo } from "./ui";
import h from "./hero.module.css";

// The At a glance hero: the score as a sunrise gauge on gold. On first load
// the rays light up along the arc, the arc draws to the score with its knob
// riding the tip, and the number scrambles into place. Once per load only.

const CX = 171;
const CY = 185;
const R = 126;
const RAYS = 25;
/** The digits the score flicks through before it lands, one every 100ms. */
const SCRAMBLE = [38, 91, 46, 83, 29, 65, 74];

const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;
};

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

  useEffect(() => {
    if (!play || !digits.current) return;
    const el = digits.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const i = Math.floor((now - start) / 100);
      if (i >= SCRAMBLE.length) {
        el.textContent = String(value);
        return;
      }
      el.textContent = String(SCRAMBLE[i]);
      raf = requestAnimationFrame(tick);
    };
    el.textContent = String(SCRAMBLE[0]);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = String(value);
    };
  }, [play, value]);

  const lit = Math.round((value / 100) * (RAYS - 1));
  const word = band(value).word;
  const tz = scanTz(d.latest) ?? d.tz;

  return (
    <header className={h.hero} data-play={play} data-reduce={first && reduce}>
      <Logo className={h.logo} />
      <p className={h.hi}>Hi {d.firstName},</p>
      <h1 className={h.title}>Your skin, at a glance</h1>

      <div className={h.gauge} role="img" aria-label={`Overall score ${value} out of 100, ${word.toLowerCase()}`}>
        <svg viewBox="0 0 342 240" aria-hidden>
          <defs>
            <linearGradient id="hero-arc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#14241a" />
              <stop offset="1" stopColor="#2f4a35" />
            </linearGradient>
          </defs>
          {Array.from({ length: RAYS }, (_, i) => {
            const deg = 180 - i * 7.5;
            const [x1, y1] = polar(deg, 143);
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
                style={{ "--i": i } as CSSProperties}
              />
            );
          })}
          <path d={`M${CX - R} ${CY}A${R} ${R} 0 0 1 ${CX + R} ${CY}`} className={h.track} />
          <path
            d={`M${CX - R} ${CY}A${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            className={h.arc}
            pathLength={100}
            strokeDasharray={`${value} 200`}
            style={{ "--v": value } as CSSProperties}
          />
          <g className={h.knob} style={{ "--rot": `${(value / 100) * 180}deg` } as CSSProperties}>
            <circle cx={CX - R} cy={CY} r="10" />
          </g>
        </svg>
        <div className={h.score}>
          <span className={h.value} style={{ viewTransitionName: "skin-score" }}>
            <span ref={digits} aria-hidden>
              {value}
            </span>
          </span>
          <span className={h.label}>Overall score</span>
        </div>
      </div>

      <div className={h.card}>
        <div className={h.cardText}>
          <span className={h.pill}>{word}</span>
          {d.trend ? (
            <>
              <span className={h.change}>
                <Icon name={d.trend.delta >= 0 ? "up" : "down"} size={14} stroke={1.8} />
                {d.trend.delta === 0
                  ? "Holding steady"
                  : `${d.trend.delta > 0 ? "Up" : "Down"} ${Math.abs(d.trend.delta)} ${Math.abs(d.trend.delta) === 1 ? "point" : "points"}`}
              </span>
              <span className={h.since}>since {fmtDay(d.trend.from.takenAt, scanTz(d.trend.from) ?? tz)}</span>
            </>
          ) : (
            <span className={h.change}>Your starting point</span>
          )}
        </div>
        <button className={h.scan} onClick={onScan} aria-label={`Open your scan from ${fmtDay(lens.takenAt, tz)}`}>
          <Photo scan={lens} priority alt="" className={h.scanPhoto} style={{ viewTransitionName: "skin-photo" }} />
          <span>Your scan</span>
        </button>
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
