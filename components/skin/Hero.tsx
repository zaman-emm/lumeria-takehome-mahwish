"use client";

import { useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { band, dayOf as localDayOf, daysBetween, fmtDay, scanTz, type Derived } from "@/lib/insights";
import type { Scan } from "@/lib/types";
import { useFirstTime } from "./hooks";
import { Gauge } from "./Gauge";
import { Flame, Icon } from "./Icon";
import { headline, sinceStart } from "@/lib/voice";
import { Logo } from "./Logo";
import { Photo } from "./ui";
import h from "./hero.module.css";

// The At a glance hero: the score as a sunrise gauge on gold. On a first load
// the splash flies the gauge in from the middle of the screen (splash "go"),
// and the rest of the hero rises around it; with no splash the gauge draws in
// place. Once per load only.

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

const greetingFor = (hour: number) => (hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");

export function Hero({
  d,
  lens,
  onScan,
  onPlay,
  splash,
}: {
  d: Derived;
  lens: Scan;
  onScan: () => void;
  /** Where the splash is: held back until it flies in, then rising around the gauge. */
  splash?: "wait" | "go" | "done";
  onPlay?: (from: HTMLElement) => void;
}) {
  const value = d.latest.scores.overall;
  const reduce = useReducedMotion();
  const first = useFirstTime("hero");
  const play = first && !reduce && !splash; // with a splash, the splash plays it

  // Greeted by the hour where she's reading it; the report renders in the
  // browser, so this is her own clock.
  const [greeting] = useState(() => greetingFor(new Date().getHours()));
  const scanDays = new Set(d.scans.map((s) => localDayOf(d, s))).size;
  const days = daysBetween(d.start, d.end) + 1;

  const pair = beforeAfter(d, lens);
  const tz = scanTz(d.latest) ?? d.tz;
  const dayOf = (s: Scan) => fmtDay(s.takenAt, scanTz(s) ?? d.tz);

  return (
    <header className={h.hero} data-play={play} data-reduce={first && reduce} data-splash={splash} data-skin-hero>
      <BackButton />
      <Logo className={h.logo} />
      <h1 className={h.title}>{headline(d)}</h1>

      <div className={h.gaugeBox} data-skin-gauge>
        <Gauge value={value} play={play} named />
      </div>

      {onPlay && (
        <button className={h.month} onClick={(e) => onPlay(e.currentTarget)}>
          {d.isMonthly ? "Check your month’s highlights" : "Check your highlights"}
          <Icon name="chevronR" size={12} stroke={2} />
        </button>
      )}

      <div className={h.hi}>
        <h2>
          {greeting} <span>{d.firstName}</span>
        </h2>
        <p>
          You made time for your skin on {scanDays} of {days} days.
        </p>
      </div>
      <div className={h.card}>
        <div className={h.cardText}>
          {d.trend?.delta ? (
            <>
              <span className={h.delta}>
                <Icon name={d.trend.delta > 0 ? "up" : "down"} size={22} stroke={2} />
                {Math.abs(d.trend.delta)}
              </span>
              <span className={h.change}>since you started</span>
            </>
          ) : (
            <span className={h.change}>{sinceStart(d)}</span>
          )}
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
      <BackButton />
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
        <button className={h.play} onClick={(e) => onPlay(e.currentTarget)} aria-label={d.isMonthly ? "Check your month’s highlights" : "Check your highlights"}>
          <Icon name="spark" size={16} />
        </button>
      )}
    </header>
  );
}

/** Back to the app the report opens from. That app isn't part of this build, so it only shows. */
function BackButton() {
  return (
    <button type="button" className={h.back} aria-label="Back">
      <Icon name="chevronL" size={18} stroke={2} />
    </button>
  );
}
