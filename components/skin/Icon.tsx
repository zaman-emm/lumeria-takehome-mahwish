import type { ScoreKey } from "@/lib/insights";

// One stroke icon set on a 16 grid, drawn to sit with Montserrat at 12–15px.

const PATHS = {
  close: "M4 4l8 8M12 4l-8 8",
  play: "M5.5 3.2v9.6L13 8z",
  chevronL: "M10 3L5 8l5 5",
  chevronR: "M6 3l5 5-5 5",
  chevronD: "M3.5 6l4.5 4.5L12.5 6",
  info: "M8 1.8a6.2 6.2 0 100 12.4A6.2 6.2 0 008 1.8zM8 7.2v4M8 5h.01",
  up: "M8 13V3M4 7l4-4 4 4",
  arrowUR: "M5 11l6-6M6.5 5H11v4.5",
  down: "M8 3v10M4 9l4 4 4-4",
  spark: "M8 1.2c.5 3.6 1.9 5.1 5.6 5.8C9.9 7.7 8.5 9.2 8 12.8 7.5 9.2 6.1 7.7 2.4 7 6.1 6.3 7.5 4.8 8 1.2z",
  target: "M8 1.8a6.2 6.2 0 100 12.4A6.2 6.2 0 008 1.8zM8 5a3 3 0 100 6 3 3 0 000-6zM8 7.4v1.2",
  clock: "M8 1.8a6.2 6.2 0 100 12.4A6.2 6.2 0 008 1.8zM8 4.6V8l2.3 1.6",
  bottle: "M6.2 1.8h3.6v2.4l1.2 1.4v8.6H5V5.6l1.2-1.4zM5 8.6h6",
  drop: "M8 1.8S3.6 6.6 3.6 9.6a4.4 4.4 0 008.8 0C12.4 6.6 8 1.8 8 1.8z",
  moon: "M13 9.6A5.4 5.4 0 016.4 3a5.6 5.6 0 106.6 6.6z",
  sun: "M8 5.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6zM8 1v1.4M8 13.6V15M1 8h1.4M13.6 8H15M3 3l1 1M12 12l1 1M13 3l-1 1M4 12l-1 1",
  plane: "M14.6 8c0-.6-.5-1-1.2-1H9.6L6.4 2.2H5.2L6.8 7H3.6L2.6 5.4H1.6L2.2 8l-.6 2.6h1l1-1.6h3.2l-1.6 4.8h1.2L9.6 9h3.8c.7 0 1.2-.4 1.2-1z",
  stop: "M8 1.8a6.2 6.2 0 100 12.4A6.2 6.2 0 008 1.8zM5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4",
  pin: "M8 14.4s-4.6-4.3-4.6-7.6a4.6 4.6 0 019.2 0c0 3.3-4.6 7.6-4.6 7.6zM8 5a1.8 1.8 0 100 3.6A1.8 1.8 0 008 5z",
  grid: "M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z",
  rows: "M2.5 3h4v4h-4zM9 4.2h4.5M9 6h3M2.5 9h4v4h-4zM9 10.2h4.5M9 12h3",
  share: "M8 10V1.8M5 4.6l3-3 3 3M3.5 7.5v6.2h9V7.5",
  check: "M3.5 8.5l3 3 6-7",
  hydration: "M8 1.8S3.6 6.6 3.6 9.6a4.4 4.4 0 008.8 0C12.4 6.6 8 1.8 8 1.8z",
  evenness: "M8 2.4a5.6 5.6 0 100 11.2A5.6 5.6 0 008 2.4zM8 2.4v11.2",
  redness: "M3 13c0-5.5 4-9.5 10-10-.5 6-4.5 10-10 10zM3 13l5.5-5.5",
  pigmentation: "M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2",
  oiliness: "M8 3.4a4.6 4.6 0 100 9.2A4.6 4.6 0 008 3.4zM8 1v1.2M8 13.8V15M1 8h1.2M13.8 8H15",
  overall: "M8 2l1.8 3.9 4.2.5-3.1 2.9.8 4.2L8 11.4l-3.7 2.1.8-4.2L2 6.4l4.2-.5z",
  radiance: "M8 4.6a3.4 3.4 0 100 6.8 3.4 3.4 0 000-6.8zM8 1.4v1.4M8 13.2v1.4M1.4 8h1.4M13.2 8h1.4",
  pores: "M4.5 4.5h.01M8 3.5h.01M11.5 4.5h.01M3.5 8h.01M8 8h.01M12.5 8h.01M4.5 11.5h.01M8 12.5h.01M11.5 11.5h.01",
  spots: "M5.5 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM11 7.5a2 2 0 100 4 2 2 0 000-4zM5 11.5a1 1 0 100 2 1 1 0 000-2z",
} satisfies Record<string, string>;

export type IconName = keyof typeof PATHS;

const FILLED = new Set<string>(["play", "spark", "plane"]);

export function Icon({
  name,
  size = 16,
  className,
  stroke = 1.5,
}: {
  name: IconName | ScoreKey;
  size?: number;
  className?: string;
  stroke?: number;
}) {
  const d = (PATHS as Record<string, string>)[name] ?? PATHS.overall;
  const filled = FILLED.has(name);
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden focusable="false">
      <path
        d={d}
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? "none" : "currentColor"}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The streak flame, two-tone like the pill it sits in. */
export function Flame({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 10 16" width={(size * 10) / 16} height={size} aria-hidden focusable="false">
      <path
        d="M5 .6C5.6 3.4 9.4 5.4 9.4 10A4.4 4.4 0 01.6 10c0-2.4 1.3-3.7 2.2-4.6.2 1.5.8 2.4 1.6 2.8C4 5.6 4.3 3 5 .6z"
        fill="var(--evergreen)"
      />
      <path d="M5 8.6c.9 1 2 1.8 2 3.3a2 2 0 01-4 0c0-1.2.8-2 2-3.3z" fill="var(--gold)" />
    </svg>
  );
}
