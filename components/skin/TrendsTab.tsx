"use client";

import { useState } from "react";
import { metricMeta, type Factor, type ScoreKey } from "@/lib/insights";
import { useReportApi } from "./context";
import { useReveal } from "./hooks";
import { Icon, type IconName } from "./Icon";
import { TrendView } from "./TrendView";
import { FromTo, RangeBar } from "./ui";
import t from "./trends.module.css";

// Trends: how one score moved for one spot, then the clues that lined up
// with the biggest moves. Clues, never causes.

export function TrendsTab() {
  const { d } = useReportApi();
  const [metric, setMetric] = useState<ScoreKey>("overall");
  const [area, setArea] = useState(d.area);
  return (
    <div className={t.tab}>
      <section className={t.panelCard} aria-label="Trend">
        <TrendView metric={metric} area={area} onMetric={setMetric} onArea={setArea} showDelta revealKey="trends" />
      </section>
      {d.factors.length > 0 && (
        <section aria-labelledby="lined-up">
          <div className={t.linedUp}>
            <h2 id="lined-up">What lined up</h2>
            <span>Clues, not causes</span>
          </div>
          <ul className={t.factors}>
            {d.factors.map((f) => (
              <FactorCard key={f.id} f={f} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const FACTOR_ICON: Record<Factor["kind"], IconName> = { product: "bottle", travel: "plane", sleep: "moon" };

function FactorCard({ f }: { f: Factor }) {
  const [ref, reveal] = useReveal<HTMLLIElement>(`factor-${f.id}`);
  return (
    <li ref={ref} className={t.factor} data-dir={f.direction}>
      <span className={t.fIcon}>
        <Icon name={FACTOR_ICON[f.kind]} size={18} />
      </span>
      <div className={t.fBody}>
        <div className={t.fHead}>
          <h3>{f.title}</h3>
          <span>{f.when}</span>
        </div>
        <div className={t.fMetric}>
          <span>{metricMeta(f.change.key).label}</span>
          <FromTo from={f.change.from} to={f.change.to} />
        </div>
        <RangeBar from={f.change.from} to={f.change.to} tone={f.direction} reveal={reveal} />
        <div className={t.fEnds}>
          <span>{f.evidence.from}</span>
          <span>{f.evidence.to}</span>
        </div>
        {f.evidence.facts.length > 0 && (
          <ul className={t.fFacts}>
            {f.evidence.facts.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        )}
        {f.evidence.caveat && <p className={t.caveat}>{f.evidence.caveat}</p>}
      </div>
    </li>
  );
}
