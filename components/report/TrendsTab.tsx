"use client";

import { useState } from "react";
import { fmtDay, metricMeta, scanTz, signed, type Derived, type Factor, type ScoreKey } from "@/lib/insights";
import { MonthChart } from "./MonthChart";
import type { ReportActions } from "./Report";
import { Icon, type IconName } from "./Visuals";
import r from "./report.module.css";

// "Is it getting better?" The headline number and the line behind it lead.
// Then what lined up with each turn, as evidence: dates and before → after.

export function TrendsTab({ d, actions }: { d: Derived; actions: ReportActions }) {
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
              {d.area}
            </span>
          </div>
          <MonthChart d={d} metric={metric} setMetric={setMetric} area={area} setArea={setArea} onOpen={actions.openScan} />
        </section>
      ) : (
        <section className={r.card}>
          <svg className={r.ghost} viewBox="0 0 335 120" aria-hidden>
            <path
              d="M6 92 C 60 88, 90 60, 140 66 S 230 30, 329 24"
              fill="none"
              stroke="var(--sand-deep)"
              strokeWidth="2"
              strokeDasharray="4 6"
            />
            <circle cx="6" cy="92" r="6" fill="var(--forest)" stroke="var(--bone)" strokeWidth="2.5" />
          </svg>
          <h2 className={r.cardTitle}>Your line starts with your next scan</h2>
          <p className={r.hint}>Same spot, about the same time, in two or three days.</p>
        </section>
      )}

      {d.factors.length > 0 && (
        <section>
          <h2 className={r.secTitle}>
            What lined up <span>Clues, not causes</span>
          </h2>
          <ul className={r.factors}>
            {d.factors.map((f) => (
              <FactorRow key={f.id} f={f} onOpen={() => actions.openMetric(f.change.key)} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

const KIND_ICON: Record<Factor["kind"], IconName> = {
  product: "product",
  travel: "travel",
  sleep: "sleep",
};

function FactorRow({ f, onOpen }: { f: Factor; onOpen: () => void }) {
  const { from, to } = f.change;
  const lo = Math.min(from, to);
  const { evidence: e } = f;
  return (
    <li>
      <button className={r.factor} data-dir={f.direction} onClick={onOpen}>
        <span className={r.fIcon}>
          <Icon name={KIND_ICON[f.kind]} size={18} />
        </span>
        <span className={r.fMain}>
          <span className={r.fTop}>
            <b>{f.title}</b>
            <small>{f.when}</small>
          </span>
          <span className={r.fMetric}>
            <span className={r.fName}>{metricMeta(f.change.key).label}</span>
            <span className={r.fNums}>
              {from}
              <Icon name="chevronR" size={11} />
              <b>{to}</b>
            </span>
          </span>
          <span className={r.range} aria-hidden>
            <i style={{ left: `${lo}%`, width: `${Math.abs(to - from)}%` }} />
            <em style={{ left: `${from}%` }} />
            <em data-end style={{ left: `${to}%` }} />
          </span>
          <span className={r.fDates}>
            <span>{e.from}</span>
            <span>{e.to}</span>
          </span>
          {e.facts.length > 0 && (
            <span className={r.fFacts}>
              {e.facts.map((x) => (
                <span key={x}>{x}</span>
              ))}
            </span>
          )}
          {e.caveat && <span className={r.fCaveat}>{e.caveat}</span>}
        </span>
      </button>
    </li>
  );
}
