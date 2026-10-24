"use client";

import type { Scan } from "@/lib/types";
import s from "./shared.module.css";

export type Light = "ambient" | "polarized" | "uva";

export const LIGHTS: { key: Light; label: string; body: string }[] = [
  { key: "ambient", label: "Daylight", body: "Your skin as you’d see it in a mirror." },
  { key: "polarized", label: "Polarized", body: "Glare removed, so redness and pigment under the surface show through." },
  { key: "uva", label: "UV", body: "Under 365 nm light, oil and pores glow, which helps us read shine." },
];

export function photoFor(scan: Scan, light: Light) {
  if (scan.photos) return scan.photos[light];
  return light === "ambient" ? scan.photoUrl : null;
}

/** A scan photo, or a gentle stand-in when the upload didn't make it. */
export function ScanPhoto({
  scan,
  light = "ambient",
  className,
  alt,
  priority,
}: {
  scan: Scan;
  light?: Light;
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  const src = photoFor(scan, light);
  if (!src) {
    return (
      <div className={`${s.noPhoto} ${className ?? ""}`} role="img" aria-label="No photo for this scan">
        <span>No photo this time</span>
      </div>
    );
  }
  return (
    // Plain img: photos are local, already sized, and swapped by light key.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? `${scan.area} close-up`}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
    />
  );
}
