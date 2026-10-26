"use client";

import { useState } from "react";
import { metricMeta, type Factor, type ScoreKey } from "@/lib/insights";
import { useReportApi } from "./context";
import { Icon, type IconName } from "./Icon";
import { TrendView } from "./TrendView";
import { FromTo } from "./ui";
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
        <TrendView metric={metric} area={area} onMetric={setMetric} onArea={setArea} revealKey="trends" />
      </section>
      {d.factors.length > 0 && (
        <section aria-labelledby="lined-up">
          <h2 id="lined-up" className={t.linedUp}>
            What lined up
          </h2>
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
  return (
    <li className={t.factor} data-dir={f.direction}>
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
        {f.evidence.facts.length > 0 && (
          <ul className={t.fFacts}>
            {f.evidence.facts.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        )}
        {/* Marked as information, so it never reads as advice. */}
        {f.evidence.caveat && (
          <p className={t.caveat}>
            <Icon name="info" size={14} />
            <span>
              <span className="sr-only">Note: </span>
              {f.evidence.caveat}
            </span>
          </p>
        )}
      </div>
    </li>
  );
}
