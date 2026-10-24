"use client";

import { useState } from "react";
import { daysBetween, dayOf, fmtDay, metricMeta, scanTz, signed, type Derived, type Factor, type Rhythm, type ScoreKey } from "@/lib/insights";
import { MonthChart } from "./MonthChart";
import type { ReportActions } from "./Report";
import { Icon, type IconName } from "./Visuals";
import r from "./report.module.css";

// "Is it getting better?" The headline number, the line behind it, and what
// lined up with each turn. Then what's connected, and what's still to unlock.

export function TrendsTab({ d, rh, actions }: { d: Derived; rh: Rhythm; actions: ReportActions }) {
  const [metric, setMetric] = useState<ScoreKey>("overall");
  const [area, setArea] = useState(d.area);

  return (
    <>
      {d.trend ? (
        <section className={r.card}>
          <div className={r.trendHead}>
            <b className={r.bigNum} data-tone="light">
              {signed(d.trend.delta)}
            </b>
            <span>
              overall since {fmtDay(d.trend.from.takenAt, scanTz(d.trend.from) ?? d.tz)}
              <br />
              on your {d.area.toLowerCase()}
            </span>
          </div>
          <p className={r.hint}>Tap or drag along the line. Every point opens the scan behind it.</p>
          <MonthChart d={d} metric={metric} setMetric={setMetric} area={area} setArea={setArea} onOpen={actions.openScan} />
        </section>
      ) : (
        <section className={r.card}>
          <svg className={r.ghost} viewBox="0 0 335 120" aria-hidden>
            <path d="M6 92 C 60 88, 90 60, 140 66 S 230 30, 329 24" fill="none" stroke="var(--sand-deep)" strokeWidth="2" strokeDasharray="4 6" />
            <circle cx="6" cy="92" r="6" fill="var(--forest)" stroke="var(--bone)" strokeWidth="2.5" />
          </svg>
          <h2 className={r.cardTitle}>Your trend line starts with your next scan</h2>
          <p className={r.hint}>
            Scan your {d.latest.area.toLowerCase()} again in two or three days, at about the same time. Two points make a line, and by
            the fourth we can show what lines up with the changes.
          </p>
        </section>
      )}

      {d.factors.length > 0 && (
        <section className={r.card}>
          <header className={r.cardHead}>
            <span className="label">What lined up</span>
            <span className={r.cardMeta}>Clues, not causes</span>
          </header>
          <ul className={r.factors}>
            {d.factors.map((f) => (
              <FactorRow key={f.id} f={f} onOpen={() => actions.openMetric(f.change.key)} />
            ))}
          </ul>
        </section>
      )}

      <Connected d={d} />
      <Unlocks d={d} rh={rh} />
    </>
  );
}

const KIND_ICON: Record<Factor["kind"], IconName> = { product: "product", travel: "travel", sleep: "sleep" };

function FactorRow({ f, onOpen }: { f: Factor; onOpen: () => void }) {
  const { from, to } = f.change;
  const lo = Math.min(from, to);
  return (
    <li>
      <button className={r.factor} data-dir={f.direction} onClick={onOpen}>
        <span className={r.fIcon}>
          <Icon name={KIND_ICON[f.kind]} size={16} />
        </span>
        <span className={r.fMain}>
          <span className={r.fTop}>
            <b>{f.title}</b>
            <small>{f.when}</small>
          </span>
          <span className={r.fMetric}>
            <Icon name={f.change.key} size={12} />
            {metricMeta(f.change.key).label}
            <span className={r.range} aria-label={`from ${from} to ${to}`}>
              <i style={{ left: `${lo}%`, width: `${Math.abs(to - from)}%` }} />
              <em style={{ left: `${from}%` }} />
              <em data-end style={{ left: `${to}%` }} />
            </span>
            <span className={r.fNums}>
              {from}
              <Icon name="chevronR" size={10} />
              {to}
            </span>
          </span>
          <span className={r.fBody}>{f.body}</span>
        </span>
      </button>
    </li>
  );
}

// ---------------------------------------------------------------- connected

interface Source {
  id: string;
  icon: IconName;
  label: string;
  on: boolean;
  detail: string;
}

function sources(d: Derived): Source[] {
  const scans = d.scans;
  const products = d.report.products?.length ?? 0;
  const trips = d.spans.filter((s) => s.kind === "travel");
  const sleep = scans.filter((s) => s.health?.sleepHours != null || s.checkin?.sleepHours != null).length;
  const cycle = scans.some((s) => s.health?.cycleDay != null);
  const climate = scans.some((s) => s.location?.environment);
  return [
    { id: "products", icon: "product", label: "Products", on: products > 0, detail: products ? `${products} in your routine` : "Add your routine" },
    {
      id: "travel",
      icon: "travel",
      label: "Travel",
      on: climate,
      detail: trips.length ? trips.map((t) => t.short).join(", ") : climate ? "No trips this time" : "Turn on location",
    },
    { id: "sleep", icon: "sleep", label: "Sleep", on: sleep > 0, detail: sleep ? `${sleep} ${sleep === 1 ? "night" : "nights"} logged` : "Connect a health app" },
    { id: "cycle", icon: "period", label: "Cycle", on: cycle, detail: cycle ? "From Apple Health" : "Connect a health app" },
    { id: "climate", icon: "climate", label: "Climate", on: climate, detail: climate ? "Humidity and UV daily" : "Turn on location" },
    { id: "food", icon: "food", label: "Food", on: false, detail: "Log meals, coming soon" },
  ];
}

function Connected({ d }: { d: Derived }) {
  const list = sources(d);
  const on = list.filter((s) => s.on).length;
  return (
    <section className={r.card}>
      <header className={r.cardHead}>
        <span className="label">What we can connect</span>
        <span className={r.cardMeta}>
          {on} of {list.length} on
        </span>
      </header>
      <ul className={r.sources}>
        {list.map((s) => (
          <li key={s.id} data-on={s.on}>
            <span className={r.sIcon}>
              <Icon name={s.icon} size={16} />
              <i>
                <Icon name={s.on ? "check" : "lock"} size={9} />
              </i>
            </span>
            <b>{s.label}</b>
            <small>{s.detail}</small>
          </li>
        ))}
      </ul>
      <p className={r.hint}>The more we can see around your scans, the more we can tell you about what moves your skin.</p>
    </section>
  );
}

// ---------------------------------------------------------------- unlocks

interface Unlock {
  id: string;
  icon: IconName;
  title: string;
  body: string;
  have: number;
  need: number;
  unit: string;
}

function unlocks(d: Derived, rh: Rhythm): Unlock[] {
  const out: Unlock[] = [];
  const sameArea = d.areaScans.length;
  if (!d.trend) {
    out.push({ id: "line", icon: "trend", title: "Your first trend line", body: `One more ${d.area.toLowerCase()} scan`, have: sameArea, need: 2, unit: "scans" });
  }
  if (d.factors.length === 0) {
    // Clues need repeat scans of one spot, then something to line them up with.
    const on = sources(d).filter((s) => s.on && s.id !== "food").length;
    out.push(
      sameArea < 6
        ? { id: "clues", icon: "spark", title: "What lines up with changes", body: `Scan your ${d.area.toLowerCase()} a few more times`, have: sameArea, need: 6, unit: "scans" }
        : { id: "clues", icon: "spark", title: "What lines up with changes", body: "Add your products or connect a health app", have: Math.min(on, 2), need: 2, unit: "sources" },
    );
  }
  const span = daysBetween(dayOf(d, d.first), dayOf(d, d.latest)) + 1;
  out.push({ id: "season", icon: "calendar", title: "Your three-month view", body: "How the seasons treat your skin", have: Math.min(span, 90), need: 90, unit: "days" });
  const next = rh.milestones.find((m) => !m.earned);
  if (next) {
    const n = Number(next.id.slice(1));
    out.push({ id: "count", icon: "check", title: `${next.label} badge`, body: "A little something for showing up", have: rh.scans, need: n, unit: "scans" });
  }
  return out;
}

function Unlocks({ d, rh }: { d: Derived; rh: Rhythm }) {
  return (
    <section className={r.card}>
      <header className={r.cardHead}>
        <span className="label">Keep scanning to unlock</span>
      </header>
      <ul className={r.unlocks}>
        {unlocks(d, rh).map((u) => (
          <li key={u.id}>
            <span className={r.uIcon}>
              <Icon name={u.icon} size={16} />
            </span>
            <span className={r.uMain}>
              <span className={r.uTop}>
                <b>{u.title}</b>
                <small>
                  {u.have} of {u.need} {u.unit}
                </small>
              </span>
              <span className={r.bar}>
                <i style={{ transform: `scaleX(${Math.min(1, u.have / u.need)})` }} />
              </span>
              <small>{u.body}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
