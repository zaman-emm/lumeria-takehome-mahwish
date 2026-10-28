import type { CSSProperties } from "react";
import e from "./edge.module.css";

// Where content scrolls under something that floats over it (a sheet's controls,
// Lumi's header, its composer), the content blurs and fades instead of running
// hard under it. It is a progressive blur: one thin layer per radius, the
// strongest at the edge it sits on and easing to almost nothing away from it,
// each masked to its own band, under a soft fade of the sheet's colour. A single
// blur faded with an alpha mask shows as a band with an edge; this has none.
//
// Place it absolutely inside the floating thing (behind that thing's own
// content), and size it with the class you pass in.

const BLURS = [16, 8, 4, 2, 1, 0.5];

export function ScrollEdge({
  side = "top",
  on = true,
  tint,
  className,
}: {
  /** The edge it sits on: the blur is strongest there. */
  side?: "top" | "bottom";
  /** Shown or not; it fades. */
  on?: boolean;
  /** How much of the sheet's colour fades in under it, 0 to 1. */
  tint?: number;
  className?: string;
}) {
  return (
    <div
      className={className ? `${e.edge} ${className}` : e.edge}
      data-side={side}
      data-on={on}
      style={tint == null ? undefined : ({ "--tint": tint } as CSSProperties)}
      aria-hidden
    >
      {BLURS.map((blur, k) => (
        <i key={blur} style={{ "--blur": `${blur}px`, "--at": `${((k + 1) / (BLURS.length + 1)) * 100}%` } as CSSProperties} />
      ))}
      <b />
    </div>
  );
}
