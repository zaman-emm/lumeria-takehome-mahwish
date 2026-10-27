"use client";

import type { CSSProperties, ReactNode } from "react";
import { signed } from "@/lib/insights";
import { schedule } from "@/lib/routine";
import type { Product, Scan } from "@/lib/types";
import { useCountUp, type RevealState } from "./hooks";
import { Icon } from "./Icon";
import u from "./ui.module.css";

// The report's small visual vocabulary: photos, score rings, range bars,
// tick rows and chips.

// ---------------------------------------------------------------- photos

export type Light = "ambient" | "polarized" | "uva";

export const LIGHTS: { key: Light; label: string }[] = [
  { key: "ambient", label: "Daylight" },
  { key: "polarized", label: "Polarized" },
  { key: "uva", label: "UV" },
];

export function photoFor(scan: Scan, light: Light) {
  if (scan.photos) return scan.photos[light];
  return light === "ambient" ? scan.photoUrl : null;
}

/** A scan photo, or a quiet stand-in when the upload didn't make it. */
export function Photo({
  scan,
  light = "ambient",
  className,
  alt,
  priority,
  style,
  on,
  say,
}: {
  scan: Scan;
  light?: Light;
  className?: string;
  alt?: string;
  priority?: boolean;
  style?: CSSProperties;
  /** Sets data-on, for stacks that crossfade between lights. */
  on?: boolean;
  /** Where there's room, say in words that the photo didn't upload. */
  say?: boolean;
}) {
  const src = photoFor(scan, light);
  if (!src) {
    // photoUrl is null when the upload failed (lib/types.ts): the scan and its scores are fine.
    return (
      <span className={`${u.noPhoto} ${className ?? ""}`} style={style} role="img" aria-label="Photo didn’t upload">
        <Icon name="target" size={18} />
        {say && <span className={u.noPhotoText}>Photo didn’t upload</span>}
      </span>
    );
  }
  return (
    // Plain img: photos are local, already sized, and swapped by light.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? `${scan.area} close-up`}
      className={`${u.photo} ${className ?? ""}`}
      style={style}
      data-on={on}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
    />
  );
}

// ---------------------------------------------------------------- rings

/**
 * A score as a ring: the fuller, the healthier. Draws in once when `draw` is
 * set; with `count`, the number counts up with it.
 */
export function Ring({
  value,
  size = 54,
  draw,
  count,
  delay = 0,
  dashed,
  className,
}: {
  value: number | null;
  size?: number;
  draw?: boolean;
  count?: boolean;
  delay?: number;
  dashed?: boolean;
  className?: string;
}) {
  const empty = value == null || dashed;
  const digits = useCountUp<HTMLElement>(value, Boolean(draw && count && !empty), { delay, duration: 1000, ease: "inOut" });
  return (
    <span className={`${u.ring} ${className ?? ""}`} style={{ width: size, height: size }} data-empty={empty}>
      <svg viewBox="0 0 54 54" width={size} height={size} aria-hidden>
        <circle cx="27" cy="27" r="24" className={empty ? u.ringDash : u.ringTrack} pathLength={100} />
        {!empty && (
          <circle
            cx="27"
            cy="27"
            r="24"
            className={u.ringValue}
            data-draw={draw}
            pathLength={100}
            strokeDasharray="100"
            transform="rotate(-90 27 27)"
            style={{ "--off": 100 - value, animationDelay: `${delay}ms` } as CSSProperties}
          />
        )}
      </svg>
      <b ref={digits}>{empty ? "–" : value}</b>
    </span>
  );
}

// ---------------------------------------------------------------- range bar

/**
 * One score moving across its 0–100 range: a small dot where it was, a bigger
 * one where it is now, and the stretch between tinted by direction.
 */
export function RangeBar({ from, to, tone, reveal = "done" }: { from: number; to: number; tone: "helped" | "held"; reveal?: RevealState }) {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  return (
    <span
      className={u.range}
      data-tone={tone}
      data-reveal={reveal}
      style={{ "--from": `${from}%`, "--t-from": from, "--t-to": to, "--lo": `${lo}%`, "--w": `${hi - lo}%`, "--dir": to >= from ? 0 : 1 } as CSSProperties}
      aria-hidden
    >
      <i className={u.rangeSeg} />
      <i className={u.rangeFrom} />
      <i className={u.rangeTo} />
    </span>
  );
}

/** "Calm 54 › 84", with the latest value set large. */
export function FromTo({ from, to }: { from: number; to: number }) {
  return (
    <span className={u.fromTo}>
      <span>{from}</span>
      <Icon name="chevronR" size={10} className={u.fromToArrow} />
      <b>{to}</b>
    </span>
  );
}

// ---------------------------------------------------------------- ticks

/**
 * A score as twenty ticks, one per five points, filled up to the score and
 * faint past it, so where a score falls reads at a glance. The tall tick is
 * the score; the change since last time is said in numbers beside it. Each
 * tick sits in an equal cell, so TickAxis lines up with it at any width.
 */
export function Ticks({ value, reveal = "done", order = 0 }: { value: number | null; reveal?: RevealState; order?: number }) {
  const now = value == null ? -1 : Math.min(19, Math.floor(value / 5));
  return (
    <span className={u.ticks} data-reveal={reveal} aria-hidden>
      {Array.from({ length: 20 }, (_, i) => (
        <i
          key={i}
          data-now={i === now}
          data-fill={i <= now}
          data-off={value == null}
          style={{ "--d": `${order * 40 + i * 14}ms` } as CSSProperties}
        />
      ))}
    </span>
  );
}

/** Where the bands change under Ticks: 0, 60, 75 and 100. */
export function TickAxis() {
  return (
    <span className={u.tickAxis} aria-hidden>
      <span style={{ left: 0 }}>0</span>
      <span style={{ left: "60%" }}>60</span>
      <span style={{ left: "75%" }}>75</span>
      <span style={{ left: "100%" }}>100</span>
    </span>
  );
}

// ---------------------------------------------------------------- chips

export function Chip({ children, kind = "plain", icon }: { children?: ReactNode; kind?: "plain" | "line" | "schedule" | "alert"; icon?: ReactNode }) {
  return (
    <span className={u.chip} data-kind={kind}>
      {icon}
      {children}
    </span>
  );
}

/**
 * When a product is used: a sun pill for morning and a moon pill for night,
 * each in its own column so they line up down a list. How often is told to
 * screen readers.
 */
export function ScheduleChip({ product }: { product: Product }) {
  const sc = schedule(product);
  return (
    <span className={u.when} aria-label={sc.spoken} role="img">
      <span data-on={sc.am}>{sc.am && <Icon name="sun" size={12} />}</span>
      <span data-on={sc.pm}>{sc.pm && <Icon name="moon" size={12} />}</span>
    </span>
  );
}

/**
 * A scan's change from the last scan of the same spot, as a small gold pill
 * under its score: an arrow and the number. What it's measured from is read
 * out to screen readers ("down 3 since Sep 25").
 */
export function ChangeSince({ n, since, className }: { n: number; since: string; className?: string }) {
  return (
    <span className={`${u.since} ${className ?? ""}`}>
      <Icon name={n > 0 ? "up" : "down"} size={9} stroke={2} />
      <span aria-hidden>{Math.abs(n)}</span>
      <span className="sr-only">
        {n > 0 ? "up" : "down"} {Math.abs(n)} since {since}
      </span>
    </span>
  );
}

/** A change as an arrow and a number. The arrow already says which way, so no sign. */
export function Delta({ n, className }: { n: number; className?: string }) {
  return (
    <span className={`${u.delta} ${className ?? ""}`}>
      {n !== 0 && <Icon name={n > 0 ? "up" : "down"} size={11} />}
      {n === 0 ? signed(n) : Math.abs(n)}
    </span>
  );
}
