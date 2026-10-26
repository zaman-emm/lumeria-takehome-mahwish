"use client";

import { useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { EXTRAS, METRICS, faceMarks, score, type ScoreKey } from "@/lib/insights";
import { skinTypeOf } from "@/lib/extended";
import { noteEcho, streakLine } from "@/lib/voice";
import type { WeekStreak } from "@/lib/weeks";
import { useReportApi } from "./context";
import { useCountUp, useFirstTime, useReveal } from "./hooks";
import { Icon } from "./Icon";
import { MonthStory } from "./MonthStory";
import { Delta, FaceMap, Ring } from "./ui";
import g from "./glance.module.css";

// At a glance, under the hero: the month as one curve, the five scores as
// rings, what the latest scan saw on a face, the week streak, and the extra
// measures folded away.

/** When the sections start rising in on first load, in ms: as the hero's card lands. */
const ENTER = 1000;

export function Glance({ streak }: { streak: WeekStreak }) {
  const { d, openMetric, openScan } = useReportApi();
  const latest = d.latest;
  const draw = useFirstTime("glance-rings");
  const reduce = useReducedMotion();
  // On first load the sections rise in after the hero's card, top to bottom.
  const enter = draw && !reduce;
  const [faceRef, faceReveal] = useReveal<HTMLElement>("glance-face");
  const change = (key: ScoreKey) => d.changes.find((c) => c.key === key);
  const marks = faceMarks(latest.summary.observations);
  const echo = noteEcho(d);

  return (
    <div className={g.stack} data-enter={enter}>
      <MonthStory d={d} n={0} />
      <section className={g.rings} aria-label="Your scores" style={{ "--n": 1 } as CSSProperties}>
        {METRICS.map((m, i) => {
          const c = change(m.key);
          const v = score(latest, m.key);
          return (
            <button
              key={m.key}
              className={g.metric}
              onClick={() => openMetric(m.key)}
              aria-label={`${m.label} ${v ?? "not measured"}${c ? `, ${c.delta >= 0 ? "up" : "down"} ${Math.abs(c.delta)}` : ""}. Open trend`}
            >
              <Ring value={v} draw={draw} count={enter} delay={(enter ? ENTER : 0) + i * 60} />
              <span className={g.metricLabel}>{m.label}</span>
              {c && (
                <span className={g.metricDelta}>
                  <Delta n={c.delta} />
                </span>
              )}
            </button>
          );
        })}
      </section>

      <section ref={faceRef} className={g.read} aria-label="What this scan saw" style={{ "--n": 2 } as CSSProperties}>
        <FaceMap marks={marks} area={latest.area} reveal={faceReveal} />
        {echo && <p className={g.echo}>{echo}</p>}
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

function MoreMetrics() {
  const { d } = useReportApi();
  const [open, setOpen] = useState(false);
  const latest = d.latest;
  const skinType = skinTypeOf(d);
  const underEye = d.areas.some((a) => /eye/i.test(a.area));
  return (
    <section className={g.more} data-open={open} style={{ "--n": 3 } as CSSProperties}>
      <button className={g.moreHead} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="more-metrics">
        <span>
          More metrics <span className={g.count}>· {EXTRAS.length}</span>
        </span>
        <Icon name="chevronR" size={12} stroke={1.8} className={g.moreChevron} />
      </button>
      <div className={g.moreBody} id="more-metrics" inert={!open}>
        <div className={g.moreInner}>
          <div className={g.extras}>
            {EXTRAS.map((m) => {
              const v = score(latest, m.key);
              return (
                <div key={m.key} className={g.extra}>
                  <Ring value={v} dashed={v == null} draw={open} />
                  <span className={g.metricLabel}>{m.label}</span>
                  {m.source === "derived" && v != null && <span className={g.derived}>Derived</span>}
                </div>
              );
            })}
          </div>
          <dl className={g.profile}>
            <div>
              <dt>Skin type</dt>
              <dd>{skinType ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Under eyes</dt>
              <dd className={underEye ? undefined : g.muted}>{underEye ? "Scanned" : "Needs the under-eye scan"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
