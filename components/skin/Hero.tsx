"use client";

import { useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { band, fmtDay, scanTz, type Derived } from "@/lib/insights";
import type { Scan } from "@/lib/types";
import { useFirstTime } from "./hooks";
import { Gauge } from "./Gauge";
import { Icon } from "./Icon";
import { headline, sinceStart } from "@/lib/voice";
import { Photo } from "./ui";
import h from "./hero.module.css";

// The At a glance hero: the score as a sunrise gauge on gold. On a first load
// the splash flies the gauge in from the middle of the screen (splash "go"),
// and the rest of the hero rises around it; with no splash the gauge draws in
// place. Once per load only.

/**
 * Then and now for the card: the first and newest real photos of the spot,
 * else the two scans the trend compares.
 */
function beforeAfter(d: Derived, lens: Scan): [Scan, Scan] | null {
  const real = d.realPhotos.filter((s) => s.area === lens.area);
  if (real.length >= 2) return [real[0], real[real.length - 1]];
  if (!d.trend?.from.photoUrl || !d.trend.to.photoUrl) return null;
  return [d.trend.from, d.trend.to];
}

const greetingFor = (hour: number) => (hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");

export function Hero({
  d,
  lens,
  onScan,
  onPlay,
  splash,
  fitnessLayout = false,
}: {
  d: Derived;
  lens: Scan;
  onScan: () => void;
  /** Where the splash is: held back until it flies in, then rising around the gauge. */
  splash?: "wait" | "go" | "done";
  fitnessLayout?: boolean;
  onPlay?: (from: HTMLElement) => void;
}) {
  const value = d.latest.scores.overall;
  const reduce = useReducedMotion();
  const first = useFirstTime("hero");
  const play = first && !reduce && !splash; // with a splash, the splash plays it

  // Greeted by the hour where she's reading it; the report renders in the
  // browser, so this is her own clock.
  const [greeting] = useState(() => greetingFor(new Date().getHours()));

  const pair = beforeAfter(d, lens);
  const tz = scanTz(d.latest) ?? d.tz;
  const dayOf = (s: Scan) => fmtDay(s.takenAt, scanTz(s) ?? d.tz);

  return (
    <header className={h.hero} data-play={play} data-reduce={first && reduce} data-splash={splash} data-iteration={fitnessLayout || undefined} data-skin-hero>
      <BackButton />
      <ProfileButton name={d.firstName} />

      <div className={h.hi}>
        <h1>
          {greeting}, <span>{d.firstName}</span>
        </h1>
      </div>

      <div className={h.gaugeBox} data-skin-gauge>
        <Gauge value={value} play={play} named />
      </div>

      <h2 className={h.title}>{headline(d).replace(/[.!?]+$/, "")}</h2>

      {onPlay && (
        <button className={h.month} onClick={(e) => onPlay(e.currentTarget)}>
          Check your highlights
          <Icon name="chevronR" size={16} stroke={2} />
        </button>
      )}

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

/** The other tabs open on this, like the iOS Health bar: back, a centred title, profile. */
export function SlimHeader({ d }: { d: Derived }) {
  return (
    <header className={h.slim}>
      <BackButton />
      <h1 className={h.slimTitle}>Report</h1>
      <ProfileButton name={d.firstName} />
    </header>
  );
}

/** Her profile, top right as iOS keeps it. The account screens aren't part of this build, so it only shows. */
export function ProfileButton({ name }: { name: string }) {
  return (
    <button type="button" className={h.profile} aria-label={`Profile, ${name}`}>
      <span aria-hidden>{name.charAt(0)}</span>
    </button>
  );
}

/** Back to the app the report opens from. That app isn't part of this build, so it only shows. */
export function BackButton() {
  return (
    <button type="button" className={h.back} aria-label="Back">
      <Icon name="chevronL" size={18} stroke={2} />
    </button>
  );
}
