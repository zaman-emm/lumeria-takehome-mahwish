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

  // The before and after photos (or the one scan), shared by both card layouts.
  const photos = pair ? (
    <span className={h.pairInner}>
      {pair.map((sc, i) => (
        <span key={sc.id} className={h.pairItem} data-now={i === 1}>
          <Photo scan={sc} priority alt="" className={h.scanPhoto} style={i === 1 ? { viewTransitionName: "skin-photo" } : undefined} />
          <span>{dayOf(sc)}</span>
        </span>
      ))}
    </span>
  ) : (
    <>
      <Photo scan={lens} priority alt="" className={h.scanPhoto} style={{ viewTransitionName: "skin-photo" }} />
      <span>Your scan</span>
    </>
  );
  const progress = d.trend?.delta ? (
    <>
      <Icon name={d.trend.delta > 0 ? "up" : "down"} size={14} stroke={2} />
      <b>{Math.abs(d.trend.delta)}</b>
      <span>since your first scan</span>
    </>
  ) : (
    sinceStart(d)
  );

  return (
    <header className={h.hero} data-play={play} data-reduce={first && reduce} data-splash={splash} data-skin-hero>
      <BackButton />
      <Logo className={h.logo} />
      <h1 className={h.title}>{headline(d)}</h1>

      <div className={h.gaugeBox} data-skin-gauge>
        <Gauge value={value} play={play} named />
      </div>

      {/* With a story, the card under the score is the way into the month's
          highlights, the before and after photos as its cover, and the
          progress follows the greeting as a small pill. Without one, the card
          shows the progress as before. */}
      {onPlay && (
        <button className={h.card} data-story onClick={(e) => onPlay(e.currentTarget)}>
          <span className={h.storyText}>
            {/* Same words as the story's own header: one month for noor, a longer stretch otherwise. */}
            <span className={h.storyLabel}>{d.isMonthly ? "Your month" : "Your story"}</span>
            <span className={h.storyTitle}>
              See the highlights
              <Icon name="chevronR" size={12} stroke={2} />
            </span>
          </span>
          {photos}
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
      {onPlay && <p className={h.month} data-static>{progress}</p>}
      {!onPlay && (
        <div className={h.card}>
          <div className={h.cardText}>
            {d.trend?.delta ? (
              <>
                <span className={h.delta}>
                  <Icon name={d.trend.delta > 0 ? "up" : "down"} size={22} stroke={2} />
                  {Math.abs(d.trend.delta)}
                </span>
                {/* The first scan's date sits under its photo, so the words don't repeat it. */}
                <span className={h.change}>since your first scan</span>
              </>
            ) : (
              <span className={h.change}>{sinceStart(d)}</span>
            )}
          </div>
          <button
            className={pair ? h.pair : h.scan}
            onClick={onScan}
            aria-label={pair ? `Your skin on ${dayOf(pair[0])} and ${dayOf(pair[1])}. Open your latest scan` : `Open your scan from ${fmtDay(lens.takenAt, tz)}`}
          >
            {photos}
          </button>
        </div>
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
}: {
  d: Derived;
  lens: Scan;
  streak: string;
  onScan: () => void;
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
