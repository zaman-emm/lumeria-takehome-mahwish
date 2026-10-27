"use client";

import { useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { skinTypeOf } from "@/lib/extended";
import { noteEcho, streakLine } from "@/lib/voice";
import type { WeekStreak } from "@/lib/weeks";
import { useReportApi } from "./context";
import { useCountUp, useFirstTime, useReveal } from "./hooks";
import { Icon } from "./Icon";
import { NoteCard } from "./notes";
import { MetricCarousel } from "./MetricCarousel";
import { MonthStory } from "./MonthStory";
import { Ring } from "./ui";
import g from "./glance.module.css";

// At a glance, under the hero: the month as one curve, the five scores as a
// carousel of cards, what the latest scan saw, the week streak, and
// the extra measures folded away.

export function Glance({ streak }: { streak: WeekStreak }) {
  const { d, openMetric, openScan } = useReportApi();
  const latest = d.latest;
  const first = useFirstTime("glance-enter");
  const reduce = useReducedMotion();
  // On first load the sections rise in after the hero's card, top to bottom.
  const enter = first && !reduce;
  const echo = noteEcho(d);

  return (
    <div className={g.stack} data-enter={enter}>
      <MonthStory d={d} n={0} />
      <div style={{ "--n": 1 } as CSSProperties}>
        <MetricCarousel onOpen={(key) => openMetric(key)} />
      </div>

      <section className={g.read} aria-label="Your latest scan" style={{ "--n": 2 } as CSSProperties}>
        {/* Her note in its card, answered under it, then the scan's suggestion. */}
        {echo && (
          <>
            <NoteCard scan={latest} className={g.echoNote} />
            <p className={g.echo}>{echo}</p>
          </>
        )}
        <p className={g.tip}>
          <Icon name="spark" size={14} />
          {latest.summary.tip}
        </p>
        <button className={g.full} onClick={() => openScan(latest)}>
          This scan, in full
          <Icon name="chevronR" size={11} stroke={1.8} />
        </button>
      </section>

      <Streak streak={streak} />
      <MoreMetrics />
    </div>
  );
}

function Streak({ streak }: { streak: WeekStreak }) {
  const [ref, reveal] = useReveal<HTMLElement>("glance-streak");
  const run = streak.current || streak.best;
  const count = useCountUp<HTMLElement>(run, reveal === "in", { duration: 700 });
  return (
    <section ref={ref} className={g.streak} data-reveal={reveal} aria-label={`${run} weeks in a row with a scan`} style={{ "--n": 2 } as CSSProperties}>
      <p className={g.streakHead} aria-hidden>
        <b ref={count}>{run}</b>
        <span>{streakLine(streak)}</span>
      </p>
      <ul className={g.badges}>
        {streak.milestones.map((m, i) => (
          <li key={m.weeks} data-earned={m.earned} style={{ "--i": i } as CSSProperties}>
            <b>{m.weeks}</b>
            <span>wk</span>
            <span className="sr-only">{m.earned ? "earned" : "not yet"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Measures the scope doesn't take yet. Each shows as an empty ring until it does. */
const COMING: { key: string; label: string }[] = [
  { key: "spots", label: "Spots" },
  { key: "pigment", label: "Under-surface pigmentation" },
  { key: "eyes", label: "Under eyes" },
];

function MoreMetrics() {
  const { d } = useReportApi();
  const [open, setOpen] = useState(false);
  const skinType = skinTypeOf(d);
  return (
    <section className={g.more} data-open={open} style={{ "--n": 3 } as CSSProperties}>
      <button className={g.moreHead} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="more-metrics">
        <span>
          More metrics <span className={g.count}>· {COMING.length}</span>
        </span>
        <Icon name="chevronR" size={12} stroke={1.8} className={g.moreChevron} />
      </button>
      <div className={g.moreBody} id="more-metrics" inert={!open}>
        <div className={g.moreInner}>
          <div className={g.extras}>
            {COMING.map((m) => (
              <div key={m.key} className={g.extra}>
                <Ring value={null} dashed />
                <span className={g.extraLabel}>{m.label}</span>
                <span className={g.soon}>Coming soon</span>
              </div>
            ))}
          </div>
          <dl className={g.profile}>
            <div>
              <dt>Skin type</dt>
              <dd>
                {skinType ?? (
                  // Shows where it would be added; not wired up in this prototype.
                  <button type="button" className={g.addType}>
                    Add your skin type
                  </button>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
