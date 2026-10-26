"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { addDays, dayOf, fmtDay, fmtTime, previousSameArea, scanTz, signed, type Derived } from "@/lib/insights";
import type { Scan } from "@/lib/types";
import { useReportApi } from "./context";
import { Icon } from "./Icon";
import { Photo } from "./ui";
import c from "./calendar.module.css";

// The month as a calendar: each scan day is a dot shaded by its score, with
// trips and the period marked. Pick a day to see its scans
// underneath.

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Four steps from lower to higher, sage to deep forest. */
const LEVELS = [
  { max: 57, fill: "#b3b4a2", ink: "var(--evergreen)" },
  { max: 64, fill: "#8f9a86", ink: "var(--evergreen)" },
  { max: 69, fill: "#6e7d68", ink: "var(--white)" },
  { max: 101, fill: "#435a45", ink: "var(--white)" },
];
const levelOf = (v: number) => LEVELS.find((l) => v <= l.max)!;

const monthKey = (day: string) => day.slice(0, 7);
const monthTitle = (key: string) =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-15T12:00:00Z`));
const weekday = (day: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

export function CalendarTab() {
  const { d } = useReportApi();
  const reduce = useReducedMotion();
  const byDay = useMemo(() => {
    const m = new Map<string, Scan[]>();
    d.scans.forEach((s) => m.set(dayOf(d, s), [...(m.get(dayOf(d, s)) ?? []), s]));
    return m;
  }, [d]);
  const months = useMemo(() => {
    const out: string[] = [];
    for (let k = monthKey(d.start); k <= monthKey(d.end); ) {
      out.push(k);
      const [y, mo] = k.split("-").map(Number);
      k = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
    }
    return out;
  }, [d]);

  const [picked, setPicked] = useState(dayOf(d, d.latest));
  const [month, setMonthRaw] = useState(monthKey(picked));
  // Which way the last month change went, so the grid slides in from that side.
  const [dir, setDir] = useState(0);
  const mi = months.indexOf(month);
  const setMonth = (next: string) => {
    if (next === month) return;
    setDir(next > month ? 1 : -1);
    setMonthRaw(next);
  };

  const pick = (day: string) => {
    setPicked(day);
    setMonth(monthKey(day));
  };

  const travelDays = new Set<string>();
  d.spans.filter((s) => s.kind === "travel").forEach((s) => {
    for (let day = s.start; day <= s.end; day = addDays(day, 1)) travelDays.add(day);
  });
  const periodDays = new Set(d.moments.map((m) => m.day));

  // Sunday-first grid for the shown month.
  const first = `${month}-01`;
  const lead = new Date(`${first}T12:00:00Z`).getUTCDay();
  const [y, mo] = month.split("-").map(Number);
  const length = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const cells = [...Array.from({ length: lead }, () => null), ...Array.from({ length }, (_, i) => addDays(first, i))];

  const scans = byDay.get(picked) ?? [];
  const note = scans.find((s) => s.annotation?.note)?.annotation?.note;

  return (
    <div className={c.tab}>
      <section className={c.card} aria-label="Calendar">
        <div className={c.month}>
          <button onClick={() => setMonth(months[mi - 1])} disabled={mi <= 0} aria-label="Previous month">
            <Icon name="chevronL" size={14} stroke={1.6} />
          </button>
          <h2 aria-live="polite">{monthTitle(month)}</h2>
          <button onClick={() => setMonth(months[mi + 1])} disabled={mi >= months.length - 1} aria-label="Next month">
            <Icon name="chevronR" size={14} stroke={1.6} />
          </button>
        </div>
        <div key={month} className={c.grid} data-dir={dir} style={{ "--dir": dir } as CSSProperties}>
          {WEEKDAYS.map((w, i) => (
            <span key={i} className={c.weekday} aria-hidden>
              {w}
            </span>
          ))}
          {cells.map((day, i) => {
            if (!day) return <span key={`pad-${i}`} />;
            const ss = byDay.get(day);
            const v = ss ? Math.max(...ss.map((s) => s.scores.overall)) : null;
            const inPeriod = day >= d.start && day <= d.end;
            const lvl = v != null ? levelOf(v) : null;
            const isPicked = day === picked;
            const marks = (
              <>
                {travelDays.has(day) && <i className={c.away} aria-hidden />}
                {periodDays.has(day) && <i className={c.period} aria-hidden />}
                {isPicked && (
                  <motion.i
                    layoutId="calendar-pick"
                    className={c.ring}
                    transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.35, bounce: 0 }}
                    aria-hidden
                  />
                )}
              </>
            );
            const date = Number(day.slice(8));
            return ss ? (
              <button
                key={day}
                className={c.day}
                data-scan
                style={{ "--fill": lvl!.fill, "--ink": lvl!.ink } as CSSProperties}
                onClick={() => pick(day)}
                aria-pressed={isPicked}
                aria-label={`${fmtDay(day)}, ${ss.length} ${ss.length === 1 ? "scan" : "scans"}, best ${v}${travelDays.has(day) ? ", away" : ""}${periodDays.has(day) ? ", period started" : ""}`}
              >
                <span>{date}</span>
                {marks}
              </button>
            ) : (
              <span key={day} className={c.day} data-out={!inPeriod} aria-label={inPeriod ? `${fmtDay(day)}, no scan` : undefined}>
                <span>{date}</span>
                {marks}
              </span>
            );
          })}
        </div>
        <div className={c.legend} aria-hidden>
          <span>Lower score</span>
          {LEVELS.map((l) => (
            <i key={l.fill} style={{ background: l.fill }} />
          ))}
          <span>Higher score</span>
          {periodDays.size > 0 && (
            <span className={c.key}>
              <i className={c.keyDot} />
              Period
            </span>
          )}
          {travelDays.size > 0 && (
            <span className={c.key}>
              <i className={c.keyBar} />
              Away
            </span>
          )}
        </div>
      </section>

      <section key={picked} className={c.dayCard} aria-live="polite">
        <h2>
          {weekday(picked)}, {fmtDay(picked)}
        </h2>
        {scans.map((s) => (
          <DayRow key={s.id} d={d} scan={s} />
        ))}
        {note && <blockquote className={c.note}>“{note}”</blockquote>}
      </section>
    </div>
  );
}

function DayRow({ d, scan }: { d: Derived; scan: Scan }) {
  const { openScan } = useReportApi();
  const tz = scanTz(scan) ?? d.tz;
  const prev = previousSameArea(d, scan);
  const delta = prev ? scan.scores.overall - prev.scores.overall : null;
  return (
    <button className={c.row} onClick={() => openScan(scan)} aria-label={`${scan.area} at ${fmtTime(scan.takenAt, tz)}, ${scan.scores.overall}. Open scan`}>
      <Photo scan={scan} alt="" className={c.rowPhoto} />
      <span className={c.rowText}>
        <span>{scan.area}</span>
        <span>{fmtTime(scan.takenAt, tz)}</span>
      </span>
      <span className={c.rowScore}>
        <b>{scan.scores.overall}</b>
        {delta != null && <span>{signed(delta)}</span>}
      </span>
      <Icon name="chevronR" size={12} stroke={1.8} className={c.rowChevron} />
    </button>
  );
}
