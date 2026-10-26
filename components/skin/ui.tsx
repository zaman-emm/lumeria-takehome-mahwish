"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { signed, type FaceMark, type FaceRegion } from "@/lib/insights";
import { schedule } from "@/lib/routine";
import type { Product, Scan } from "@/lib/types";
import { useCountUp, type RevealState } from "./hooks";
import { Icon } from "./Icon";
import u from "./ui.module.css";

// The report's small visual vocabulary: photos, score rings, range bars,
// tick rows, chips and the face map.

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
}: {
  scan: Scan;
  light?: Light;
  className?: string;
  alt?: string;
  priority?: boolean;
  style?: CSSProperties;
  /** Sets data-on, for stacks that crossfade between lights. */
  on?: boolean;
}) {
  const src = photoFor(scan, light);
  if (!src) {
    return (
      <span className={`${u.noPhoto} ${className ?? ""}`} style={style} role="img" aria-label="No photo for this scan">
        <Icon name="target" size={18} />
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
 * now; the dot marks the previous scan of the same spot. Each tick sits in an
 * equal cell, so TickAxis lines up with it at any width.
 */
export function Ticks({ value, prev, reveal = "done", order = 0 }: { value: number | null; prev?: number | null; reveal?: RevealState; order?: number }) {
  const now = value == null ? -1 : Math.min(19, Math.floor(value / 5));
  const was = prev == null ? -1 : Math.min(19, Math.floor(prev / 5));
  return (
    <span className={u.ticks} data-reveal={reveal} aria-hidden>
      {Array.from({ length: 20 }, (_, i) => (
        <i
          key={i}
          data-now={i === now}
          data-was={i === was && was !== now}
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

/** When a product is used: sun and moon, plus how often when it isn't daily. */
export function ScheduleChip({ product }: { product: Product }) {
  const sc = schedule(product);
  return (
    <span className={u.chip} data-kind="schedule" aria-label={sc.spoken} role="img">
      {sc.am && <Icon name="sun" size={12} />}
      {sc.pm && <Icon name="moon" size={12} />}
      {sc.label && <span aria-hidden>{sc.label}</span>}
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

// ---------------------------------------------------------------- face map

// Face geometry in a 320 × 150 box: the face on the left, labels on the right.
const REGION_SHAPES: Record<FaceRegion, string> = {
  forehead: "M40 40a30 12 0 1060 0a30 12 0 10-60 0z",
  tzone: "M36 30h68v16H80v48H60V46H36z",
  nose: "M60 92a10 11 0 1020 0a10 11 0 10-20 0z",
  cheeks: "M22 102a15 15 0 1030 0a15 15 0 10-30 0zM88 102a15 15 0 1030 0a15 15 0 10-30 0z",
  chin: "M52 136a18 8 0 1036 0a18 8 0 10-36 0z",
};
const ANCHORS: Record<FaceRegion, [number, number]> = {
  forehead: [92, 38],
  tzone: [104, 38],
  nose: [80, 92],
  cheeks: [118, 102],
  chin: [88, 136],
};
/** Areas we can point at. Left and right are the person's own, so they mirror. */
const AREA_SPOTS: [RegExp, number, number][] = [
  [/left cheek/i, 103, 102],
  [/right cheek/i, 37, 102],
  [/left jaw/i, 104, 124],
  [/right jaw/i, 36, 124],
  [/forehead/i, 70, 40],
  [/chin/i, 70, 136],
  [/nose/i, 70, 92],
];

/**
 * What a scan saw, drawn on a face: each note is a short label on the zone it's
 * about, filled with a pattern (dots for calm, hatching for worth a look), so
 * it never leans on colour alone. A dashed ring marks the spot that was scanned.
 */
export function FaceMap({ marks, area, reveal = "done" }: { marks: FaceMark[]; area: string; reveal?: RevealState }) {
  const id = useId().replace(/:/g, "");
  const spot = AREA_SPOTS.find(([re]) => re.test(area));
  const placed = [...marks]
    .sort((a, b) => ANCHORS[a.region][1] - ANCHORS[b.region][1])
    .reduce<(FaceMark & { y: number })[]>((acc, m) => {
      const prevY = acc.length ? acc[acc.length - 1].y : -Infinity;
      acc.push({ ...m, y: Math.max(ANCHORS[m.region][1], prevY + 36) });
      return acc;
    }, []);
  const fill = (tone: FaceMark["tone"]) => `url(#${id}-${tone})`;
  return (
    <figure className={u.face} data-reveal={reveal}>
      <svg viewBox="0 8 320 148" role="img" aria-label={`${marks.map((m) => m.label).join(", ") || "Nothing to flag"}. Scanned: ${area}.`}>
        <defs>
          <pattern id={`${id}-good`} width="5" height="5" patternUnits="userSpaceOnUse">
            <rect width="5" height="5" className={u.fGoodBg} />
            <circle cx="2.5" cy="2.5" r="1" className={u.fGoodInk} />
          </pattern>
          <pattern id={`${id}-watch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" className={u.fWatchBg} />
            <line x1="1" y1="0" x2="1" y2="5" className={u.fWatchInk} />
          </pattern>
        </defs>
        <path className={u.fHead} d="M70 12c34 0 50 30 50 66 0 42-24 72-50 72S20 120 20 78c0-36 16-66 50-66z" />
        {marks.map((m, k) => (
          <path key={m.region} d={REGION_SHAPES[m.region]} fill={fill(m.tone)} className={u.fZone} style={{ "--k": k } as CSSProperties} />
        ))}
        <path className={u.fLine} d="M45 72q8-5 16 0M79 72q8-5 16 0M70 78v20q-3 3-7 2M59 120q11 7 22 0" />
        {spot && <circle cx={spot[1]} cy={spot[2]} r="17" className={u.fSpot} />}
        {placed.map((m, k) => {
          const [ax, ay] = ANCHORS[m.region];
          return (
            <g key={m.region} className={u.fMark} style={{ "--k": k } as CSSProperties}>
              <path className={u.fLeader} d={`M${ax} ${ay}L140 ${m.y}H154`} pathLength={1} />
              <circle cx={ax} cy={ay} r="2.5" className={u.fPin} />
              <rect x="160" y={m.y - 6.5} width="13" height="13" rx="2" fill={fill(m.tone)} className={u.fSwatch} />
              <text x="181" y={m.y} dominantBaseline="central" className={u.fLabel}>
                {m.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
