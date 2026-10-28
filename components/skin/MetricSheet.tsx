"use client";

import { useState } from "react";
import { band, fmtDay, metricMeta, scanTz, score, signed, type ScoreKey } from "@/lib/insights";
import { useReportApi } from "./context";
import { areaChange, TrendView } from "./TrendView";
import { Ring } from "./ui";
import m from "./sheets.module.css";

// One score's trend, opened from its ring. The header follows whatever score
// and spot are picked inside.

export function MetricSheet({ metric: initial, area: initialArea }: { metric: ScoreKey; area: string }) {
  const { d } = useReportApi();
  const [metric, setMetric] = useState(initial);
  const [area, setArea] = useState(initialArea);
  const scans = d.scans.filter((s) => s.area === area && score(s, metric) != null);
  const latest = scans[scans.length - 1];
  const v = latest ? score(latest, metric) : null;
  const c = areaChange(d, area, metric);
  return (
    <div>
      <header className={m.metricHead}>
        <Ring value={v} key={`${area}-${metric}`} draw />
        <div>
          <p className={m.eyebrow}>{area}</p>
          <h2 className={m.metricName}>{metricMeta(metric).label}</h2>
          <p className={m.metricSub}>
            {band(v).word}
            {c && ` · ${signed(c.delta)} since ${fmtDay(c.since.takenAt, scanTz(c.since) ?? d.tz)}`}
          </p>
        </div>
      </header>
      <TrendView metric={metric} area={area} onMetric={setMetric} onArea={setArea} revealKey="metric-sheet" />
    </div>
  );
}
