"use client";

import { band, fmtDay, scanTz, type Derived } from "@/lib/insights";
import { headline } from "@/lib/voice";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { Photo } from "./ui";
import s from "./screens.module.css";

// Home: a greeting, the latest score on the report's gold, and one way in to
// the next scan. The full story lives under Trends.

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function HomeScreen({ d, onScan, onTrends }: { d: Derived; onScan: () => void; onTrends: () => void }) {
  const latest = d.latest;
  const tz = scanTz(latest) ?? d.tz;
  const delta = d.trend?.delta ?? 0;
  return (
    <div className={s.home}>
      <header className={s.homeHead}>
        <Logo className={s.logo} />
      </header>
      <h1 className={s.greet}>
        {greeting()}, {d.firstName}
      </h1>
      <p className={s.lede}>{headline(d)}</p>

      <button className={s.scoreCard} onClick={onTrends} aria-label={`Latest score ${latest.scores.overall}, ${fmtDay(latest.takenAt, tz)}. Open your trends`}>
        <span className={s.scoreText}>
          <span className={s.eyebrow}>Latest scan · {fmtDay(latest.takenAt, tz)}</span>
          <b className={s.score}>{latest.scores.overall}</b>
          <span className={s.scoreMeta}>
            {band(latest.scores.overall).word}
            {delta !== 0 && (
              <span className={s.delta}>
                <Icon name={delta > 0 ? "up" : "down"} size={11} stroke={2} />
                {Math.abs(delta)} since you started
              </span>
            )}
          </span>
        </span>
        <Photo scan={latest} alt="" className={s.scorePhoto} />
      </button>

      <section className={s.cta} aria-label="Next scan">
        <p className={s.ctaTitle}>Ready for today’s scan?</p>
        <p className={s.ctaBody}>About a minute. Same spot, same light, so the line stays honest.</p>
        <button className={s.ctaBtn} onClick={onScan}>
          <Icon name="scan" size={18} stroke={1.7} />
          Start a scan
        </button>
      </section>

      <button className={s.link} onClick={onTrends}>
        <Icon name="trends" size={16} stroke={1.7} />
        <span>See how {d.isMonthly ? "your month" : "it"} is trending</span>
        <Icon name="chevronR" size={12} stroke={1.8} />
      </button>
    </div>
  );
}
