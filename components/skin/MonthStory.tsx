"use client";

import type { CSSProperties } from "react";
import { daysBetween, fmtDay, fmtRange, type Derived } from "@/lib/insights";
import { dailySeries } from "@/lib/routine";
import { monthStory } from "@/lib/voice";
import { DayCurve, type CurveBand, type CurvePoint } from "./DayCurve";
import { useReveal } from "./hooks";
import g from "./glance.module.css";

// The month in one picture, right under the hero: the overall score day by
// day, with every product and trip on its own band. The pins name them when
// tapped, so the story (what stung, where it dipped, what brought it back)
// reads before a single tab is opened.

export function MonthStory({ d, n }: { d: Derived; n: number }) {
  const [ref, reveal] = useReveal<HTMLElement>("glance-story");
  const series = dailySeries(d, "overall");
  const days = series.length;
  const idx = (day: string) => Math.max(0, Math.min(days - 1, daysBetween(d.start, day)));
  const points: CurvePoint[] = series.flatMap((v, i) => (v.value == null ? [] : [{ i, value: v.value, label: fmtDay(v.day) }]));
  if (points.length < 3) return null;

  const bands: CurveBand[] = d.spans.map((sp) => ({
    id: sp.id,
    from: idx(sp.start),
    to: idx(sp.end),
    kind: sp.kind === "travel" ? "trip" : "product",
    tone: d.factors.find((f) => f.spanId === sp.id)?.direction ?? "neutral",
    label: `${sp.label} · ${sp.start <= d.start && sp.ongoing ? "All month" : sp.ongoing ? `Since ${fmtDay(sp.start)}` : fmtRange(sp.start, sp.end)}`,
  }));
  const first = points[0];
  const last = points[points.length - 1];
  const up = last.value >= first.value;
  const story = monthStory(d);

  return (
    <section ref={ref} className={g.story} aria-label="Your month" style={{ "--n": n } as CSSProperties}>
      {story && <p className={g.storyLine}>{story}</p>}
      <DayCurve
        days={days}
        points={points}
        bands={bands}
        pins
        values
        marks={{ from: first.i, to: last.i }}
        tone={up ? "helped" : "held"}
        height={136}
        reveal={reveal}
        label={`Overall score from ${first.value} on ${first.label} to ${last.value} on ${last.label}${
          bands.length ? `, with ${d.spans.map((s) => s.label).join(", ")} marked` : ""
        }`}
      />
      <p className={g.storyDates} aria-hidden>
        <span>{fmtDay(d.start)}</span>
        <span>{fmtDay(d.end)}</span>
      </p>
    </section>
  );
}
