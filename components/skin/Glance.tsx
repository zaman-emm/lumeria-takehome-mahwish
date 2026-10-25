"use client";

import { useState, type CSSProperties } from "react";
import { EXTRAS, METRICS, faceMarks, score, shortTip, type ScoreKey } from "@/lib/insights";
import { skinTypeOf } from "@/lib/extended";
import type { WeekStreak } from "@/lib/weeks";
import { useReportApi } from "./context";
import { useFirstTime, useReveal } from "./hooks";
import { Icon } from "./Icon";
import { Delta, FaceMap, Ring } from "./ui";
import g from "./glance.module.css";

// At a glance, under the hero: the five scores as rings, what the latest scan
// saw on a face, the week streak, and the extra measures folded away.

export function Glance({ streak }: { streak: WeekStreak }) {
  const { d, openMetric, openScan } = useReportApi();
  const latest = d.latest;
  const draw = useFirstTime("glance-rings");
  const change = (key: ScoreKey) => d.changes.find((c) => c.key === key);
  const marks = faceMarks(latest.summary.observations);

  return (
    <div className={g.stack}>
      <section className={g.rings} aria-label="Your scores">
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
              <Ring value={v} draw={draw} delay={i * 60} />
              <span className={g.metricLabel}>{m.label}</span>
              {c && (
                <span className={g.metricDelta}>
                  <Delta n={c.delta} />
                  <Icon name="chevronR" size={9} />
                </span>
              )}
            </button>
          );
        })}
      </section>

      <section className={g.read} aria-label="What this scan saw">
        <FaceMap marks={marks} area={latest.area} />
        <p className={g.tip}>
          <Icon name="spark" size={14} />
          {shortTip(latest.summary.tip)}
        </p>
        <p className={g.ai}>AI-generated · not medical advice</p>
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
  return (
    <section ref={ref} className={g.streak} data-reveal={reveal} aria-label={`${run} weeks in a row with a scan`}>
      <p className={g.streakHead} aria-hidden>
        <b>{run}</b>
        <span>{streak.current ? "weeks in a row" : "weeks, your best run"}</span>
      </p>
      <div className={g.weeks} aria-hidden>
        {streak.weeks.map((on, i) => (
          <i key={i} data-on={on} style={{ "--i": i } as CSSProperties} />
        ))}
        <i data-next style={{ "--i": streak.weeks.length } as CSSProperties} />
      </div>
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
    <section className={g.more} data-open={open}>
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
