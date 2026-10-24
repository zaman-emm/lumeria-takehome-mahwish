"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { dayOf, fmtDay, fmtTime, previousSameArea, scanTz, signed, spansOn, type Derived } from "@/lib/insights";
import type { Scan } from "@/lib/types";
import type { ReportActions } from "./Report";
import { ScanPhoto } from "./ScanPhoto";
import { Icon } from "./Visuals";
import r from "./report.module.css";

// Every day you scanned, shaded by how your skin read, with the things that
// were going on marked underneath. Pick a day to see its scans; tap a scan for
// everything behind it.

const DAY = 86_400_000;
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const monthName = (ym: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${ym}-15T12:00:00Z`));
const longDay = (day: string) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));

export function CalendarTab({ d, actions }: { d: Derived; actions: ReportActions }) {
  const byDay = useMemo(() => {
    const m = new Map<string, Scan[]>();
    d.scans.forEach((s) => m.set(dayOf(d, s), [...(m.get(dayOf(d, s)) ?? []), s]));
    return m;
  }, [d]);
  const months = useMemo(() => {
    const out: string[] = [];
    for (let ym = d.start.slice(0, 7); ym <= d.end.slice(0, 7); ) {
      out.push(ym);
      const [y, mo] = ym.split("-").map(Number);
      ym = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
    }
    return out;
  }, [d.start, d.end]);

  const latestDay = dayOf(d, d.latest);
  const [month, setMonth] = useState(latestDay.slice(0, 7));
  const [picked, setPicked] = useState(latestDay);
  const mi = months.indexOf(month);

  const all = [...byDay.values()].map((ss) => ss[ss.length - 1].scores.overall);
  const lo = Math.min(...all);
  const hi = Math.max(...all);

  // Weeks start on Sunday; days outside the report stay blank.
  const first = new Date(`${month}-01T12:00:00Z`);
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let t = first.getTime(); new Date(t).getUTCMonth() === first.getUTCMonth(); t += DAY)
    cells.push(new Date(t).toISOString().slice(0, 10));

  const inMonth = [...byDay.entries()].filter(([day]) => day.startsWith(month));
  const best = inMonth.reduce<[string, Scan] | null>((b, [day, ss]) => {
    const s = ss[ss.length - 1];
    return !b || s.scores.overall >= b[1].scores.overall ? [day, s] : b;
  }, null);
  const low = inMonth.reduce<[string, Scan] | null>((b, [day, ss]) => {
    const s = ss[ss.length - 1];
    return !b || s.scores.overall < b[1].scores.overall ? [day, s] : b;
  }, null);

  const travelOn = (day: string) => spansOn(d, day).some((sp) => sp.kind === "travel");
  const periodOn = (day: string) => d.moments.some((m) => m.day === day);
  const hasTravel = d.spans.some((sp) => sp.kind === "travel");

  return (
    <>
      <section className={r.card}>
        <div className={r.calNav}>
          <button onClick={() => setMonth(months[mi - 1])} disabled={mi <= 0} aria-label="Previous month">
            <Icon name="chevronL" size={14} />
          </button>
          <h2 aria-live="polite">{monthName(month)}</h2>
          <button onClick={() => setMonth(months[mi + 1])} disabled={mi >= months.length - 1} aria-label="Next month">
            <Icon name="chevronR" size={14} />
          </button>
        </div>
        <div className={r.calHead} aria-hidden>
          {WEEKDAYS.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
        <div className={r.calGrid} key={month}>
          {cells.map((day, i) => {
            if (!day) return <span key={`b${i}`} />;
            const ss = byDay.get(day);
            const date = Number(day.slice(8));
            const s = ss?.[ss.length - 1];
            const k = s ? (hi === lo ? 1 : (s.scores.overall - lo) / (hi - lo)) : 0;
            return (
              <button
                key={day}
                className={r.calCell}
                data-scan={!!s}
                data-dark={k > 0.5}
                data-picked={day === picked}
                data-away={travelOn(day)}
                disabled={day < d.start || day > d.end}
                style={{ "--k": `${Math.round(18 + k * 70)}%` } as CSSProperties}
                onClick={() => setPicked(day)}
                aria-label={`${longDay(day)}${s ? `, overall ${s.scores.overall}` : ", no scan"}`}
                aria-pressed={day === picked}
              >
                <span>{date}</span>
                {periodOn(day) && <i className={r.calDot} />}
              </button>
            );
          })}
        </div>
        <div className={r.calKey}>
          {hi > lo && (
            <span className={r.ramp}>
              Lower score
              <span className={r.rampDots} aria-hidden>
                {[18, 41, 64, 88].map((k) => (
                  <i key={k} style={{ "--k": `${k}%` } as CSSProperties} />
                ))}
              </span>
              Higher score
            </span>
          )}
          {d.moments.length > 0 && (
            <span>
              <i className={r.keyDot} />
              Period
            </span>
          )}
          {hasTravel && (
            <span>
              <i className={r.keyAway} />
              Away
            </span>
          )}
        </div>
      </section>

      {inMonth.length > 0 && (
        <ul className={r.stats}>
          <li>
            <b>{inMonth.length}</b>
            <small>scan {inMonth.length === 1 ? "day" : "days"}</small>
          </li>
          {best && inMonth.length > 1 && (
            <li>
              <button onClick={() => setPicked(best[0])} aria-pressed={picked === best[0]}>
                <b>{best[1].scores.overall}</b>
                <small>Best · {fmtDay(best[0])}</small>
              </button>
            </li>
          )}
          {low && inMonth.length > 1 && (
            <li>
              <button onClick={() => setPicked(low[0])} aria-pressed={picked === low[0]}>
                <b>{low[1].scores.overall}</b>
                <small>Lowest · {fmtDay(low[0])}</small>
              </button>
            </li>
          )}
        </ul>
      )}

      <DayCard d={d} day={picked} scans={byDay.get(picked) ?? []} actions={actions} />
    </>
  );
}

function DayCard({ d, day, scans, actions }: { d: Derived; day: string; scans: Scan[]; actions: ReportActions }) {
  const spans = spansOn(d, day);
  const started = d.spans.filter((sp) => sp.start === day && sp.kind === "product");
  const period = d.moments.some((m) => m.day === day);
  return (
    <section className={r.card} key={day}>
      <h2 className={r.dayTitle}>{longDay(day)}</h2>
      {(spans.length > 0 || period) && (
        <p className={r.dayMarks}>
          {started.map((sp) => (
            <span key={sp.id}>
              <Icon name="product" size={14} />
              Started {sp.label}
            </span>
          ))}
          {spans
            .filter((sp) => sp.kind === "travel")
            .map((sp) => (
              <span key={sp.id}>
                <Icon name="travel" size={14} />
                {sp.short}
              </span>
            ))}
          {period && (
            <span>
              <Icon name="period" size={14} />
              Period started
            </span>
          )}
        </p>
      )}
      {scans.length === 0 ? (
        <p className={r.hint}>No scan this day.</p>
      ) : (
        <ul className={r.dayList}>
          {scans.map((s) => {
            const tz = scanTz(s) ?? d.tz;
            const prev = previousSameArea(d, s);
            return (
              <li key={s.id}>
                <button
                  className={r.dayRow}
                  onClick={() => actions.openScan(s)}
                  aria-label={`${s.area} at ${fmtTime(s.takenAt, tz)}, overall ${s.scores.overall}. Open the scan.`}
                >
                  <span className={r.thumb}>
                    <ScanPhoto scan={s} alt="" />
                  </span>
                  <span className={r.dayWho}>
                    <b>{s.area}</b>
                    <small>{fmtTime(s.takenAt, tz)}</small>
                  </span>
                  <span className={r.dayScore}>
                    <b>{s.scores.overall}</b>
                    {prev && <small>{signed(s.scores.overall - prev.scores.overall)}</small>}
                  </span>
                  <Icon name="chevronR" size={14} className={r.dayGo} />
                </button>
                {s.annotation?.note && <p className={r.quote}>“{s.annotation.note}”</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
