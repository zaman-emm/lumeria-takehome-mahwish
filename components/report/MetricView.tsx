"use client";

import { useState } from "react";
import { EXTRAS, band, fmtDay, metricMeta, score, scanTz, signed, type Derived, type ScoreKey } from "@/lib/insights";
import type { Scan } from "@/lib/types";
import { MonthChart } from "./MonthChart";
import { Gauge, Icon } from "./Visuals";
import r from "./report.module.css";

/** One score in a sheet: where it is, how it got there, and how we read it. */
export function MetricView({ d, metric: initial, onOpen }: { d: Derived; metric: ScoreKey; onOpen: (s: Scan) => void }) {
  const [metric, setMetric] = useState(initial);
  const [area, setArea] = useState(d.area);
  const meta = metricMeta(metric);
  const extra = EXTRAS.find((m) => m.key === metric);
  const latest = [...d.scans].reverse().find((s) => s.area === area && score(s, metric) != null) ?? d.latest;
  const v = score(latest, metric);
  const first = d.scans.find((s) => s.area === area && score(s, metric) != null);
  const a = first ? score(first, metric) : null;
  const tz = scanTz(latest) ?? d.tz;

  return (
    <div className={r.metricView}>
      <header className={r.mvHead}>
        <Gauge value={v} size={64} />
        <span>
          <span className="label">{area}</span>
          <h2>{meta.label}</h2>
          <p>
            {band(v).word}
            {a != null && v != null && first !== latest && ` · ${signed(v - a)} since ${fmtDay(first!.takenAt, scanTz(first!) ?? d.tz)}`}
          </p>
        </span>
      </header>
      <p className={r.mvHint}>
        <Icon name={metric} size={14} />
        {meta.hint}. Latest read {fmtDay(latest.takenAt, tz)}.
      </p>
      {extra && (
        <p className={r.mvWhy}>
          <span className={r.tag}>{extra.source === "derived" ? "Derived" : "Preview"}</span>
          {extra.why}
        </p>
      )}
      <MonthChart d={d} metric={metric} setMetric={setMetric} area={area} setArea={setArea} onOpen={onOpen} />
    </div>
  );
}
