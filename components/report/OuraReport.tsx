"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  EXTRAS,
  METRICS,
  OVERALL,
  fmtDay,
  metricMeta,
  obsLabel,
  rhythm,
  scanTz,
  score,
  shortTip,
  signed,
  trendSentence,
  type Derived,
  type Rhythm,
  type ScoreKey,
} from "@/lib/insights";
import type { Scan } from "@/lib/types";
import { CalendarTab } from "./CalendarTab";
import { Explorer } from "./Explorer";
import { Lumi } from "./Lumi";
import { MetricView } from "./MetricView";
import { PhotosTab } from "./PhotosTab";
import { Recap } from "./Recap";
import { headline, type ReportActions } from "./Report";
import { ScanDetail } from "./ScanDetail";
import { ScanPhoto } from "./ScanPhoto";
import { Sheet } from "./Sheet";
import { TrendsTab } from "./TrendsTab";
import { Icon, RhythmStrip, TabIcon } from "./Visuals";
import o from "./oura.module.css";

// The same report laid out the way Oura lays out readiness: the latest scan
// blurred into an evergreen atmosphere behind an arc dial, score bubbles,
// contributors as thin bars, and a floating dock for navigation. Colours and
// type stay on the Lumeria brand; the tabs and sheets underneath are the
// regular ones.

const TABS = [
  { id: "glance", label: "Today" },
  { id: "trends", label: "Trends" },
  { id: "calendar", label: "Calendar" },
  { id: "photos", label: "Photos" },
] as const;
type TabId = (typeof TABS)[number]["id"];

type Overlay = { kind: "recap" } | { kind: "explore"; scanId?: string } | null;
type SheetState = { kind: "scan"; scan: Scan } | { kind: "metric"; key: ScoreKey } | { kind: "lumi" } | null;

/** Oura's status ladder, in Lumeria's kinder words at the low end. */
function status(v: number | null) {
  if (v == null) return { word: "Not measured", tone: "none" };
  if (v >= 85) return { word: "Optimal", tone: "top" };
  if (v >= 70) return { word: "Good", tone: "good" };
  if (v >= 60) return { word: "Fair", tone: "fair" };
  return { word: "Needs care", tone: "low" };
}

export function OuraReport({ d }: { d: Derived }) {
  const [tab, setTab] = useState<TabId>("glance");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const rh = useMemo(() => rhythm(d), [d]);

  useEffect(() => {
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    const onPop = () => {
      if (!location.hash) setOverlay(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const show = useCallback((ov: NonNullable<Overlay>) => {
    if (location.hash) history.replaceState(null, "", `#${ov.kind}`);
    else history.pushState(null, "", `#${ov.kind}`);
    setOverlay(ov);
  }, []);
  const closeOverlay = useCallback(() => {
    if (location.hash) history.back();
    else setOverlay(null);
  }, []);

  const actions: ReportActions = useMemo(
    () => ({
      openScan: (scan) => setSheet({ kind: "scan", scan }),
      openMetric: (key) => setSheet({ kind: "metric", key }),
      explore: (scanId) => show({ kind: "explore", scanId }),
    }),
    [show],
  );

  const pick = (id: TabId) => {
    setTab(id);
    window.scrollTo({ top: 0 });
  };

  const latest = d.latest;
  const lensScan = [...d.realPhotos].reverse().find((x) => x.area === latest.area) ?? latest;
  const title = TABS.find((t) => t.id === tab)!.label;

  return (
    <div className={o.page} data-look="oura">
      {tab === "glance" ? (
        <Hero d={d} lensScan={lensScan} onRecap={() => show({ kind: "recap" })} actions={actions} />
      ) : (
        <header className={o.top}>
          <button className={o.iconBtn} onClick={() => show({ kind: "recap" })} aria-label="Play your recap">
            <Icon name="play" size={14} />
          </button>
          <span className={o.topMid}>
            <b>{title}</b>
            <span className={o.dateTab}>
              {d.periodLabel}
              <Icon name="calendar" size={13} />
            </span>
          </span>
          <button className={o.iconBtn} onClick={() => actions.explore(lensScan.id)} aria-label="Open the explorer">
            <Icon name="camera" size={16} />
          </button>
        </header>
      )}

      <main key={tab} className={o.panel} data-tab={tab}>
        {tab === "glance" && <Today d={d} rh={rh} actions={actions} />}
        {tab === "trends" && <TrendsTab d={d} actions={actions} />}
        {tab === "calendar" && <CalendarTab d={d} actions={actions} />}
        {tab === "photos" && <PhotosTab d={d} actions={actions} />}
      </main>

      <footer className={o.foot}>
        <p>
          Lumeria reads how your skin looks, not what’s going on underneath. If something worries you, a dermatologist is the
          right next step.
        </p>
      </footer>

      {!overlay && (
        <nav className={o.dockWrap} data-hidden={!!sheet} aria-label="Report sections">
          <div className={o.dock} role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={t.id === tab} onClick={() => pick(t.id)}>
                <TabIcon name={t.id} on={t.id === tab} />
                {t.label}
              </button>
            ))}
          </div>
          <button className={o.lumi} onClick={() => setSheet({ kind: "lumi" })} aria-label="Ask Lumi">
            <Icon name="spark" size={22} />
          </button>
        </nav>
      )}

      <Sheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        label={
          sheet?.kind === "metric" ? `${metricMeta(sheet.key).label} trend` : sheet?.kind === "lumi" ? "Lumi" : "Scan details"
        }
        scrollKey={sheet ? (sheet.kind === "scan" ? sheet.scan.id : sheet.kind === "metric" ? sheet.key : "lumi") : undefined}
      >
        {sheet?.kind === "scan" && <ScanDetail d={d} scan={sheet.scan} />}
        {sheet?.kind === "metric" && <MetricView d={d} metric={sheet.key} onOpen={(scan) => setSheet({ kind: "scan", scan })} />}
        {sheet?.kind === "lumi" && <Lumi d={d} />}
      </Sheet>

      {overlay?.kind === "recap" && <Recap d={d} onClose={closeOverlay} onExplore={() => show({ kind: "explore" })} />}
      {overlay?.kind === "explore" && <Explorer d={d} startId={overlay.scanId} onClose={closeOverlay} />}
    </div>
  );
}

/** The arc runs 150°, from lower left to lower right, like Oura's readiness dial. */
const ARC = "M19.6 135.1 A135 135 0 0 1 280.4 135.1";
const DOTS = [0, 1, 2, 3, 4].map((i) => {
  const a = ((165 - i * 37.5) * Math.PI) / 180;
  return [150 + 152 * Math.cos(a), 170 - 152 * Math.sin(a)];
});

function Hero({
  d,
  lensScan,
  onRecap,
  actions,
}: {
  d: Derived;
  lensScan: Scan;
  onRecap: () => void;
  actions: ReportActions;
}) {
  const latest = d.latest;
  const tz = scanTz(latest) ?? d.tz;
  const top = [...d.changes].sort((a, b) => b.delta - a.delta)[0];
  const body =
    d.trend && top && top.delta > 0
      ? `${trendSentence(d)} ${metricMeta(top.key).label} moved the most, ${top.from} to ${top.to}. Keep the routine that got you here.`
      : trendSentence(d);

  return (
    <header className={o.hero}>
      <div className={o.atmos} aria-hidden>
        <ScanPhoto scan={lensScan} priority alt="" />
      </div>
      <div className={o.heroBar}>
        <button className={o.iconBtn} onClick={onRecap} aria-label="Play your recap">
          <Icon name="play" size={14} />
        </button>
        <span className={o.mark}>LUMERIA</span>
        <button className={o.iconBtn} onClick={() => actions.explore(lensScan.id)} aria-label="Open the explorer">
          <Icon name="camera" size={16} />
        </button>
      </div>

      <ul className={o.bubbles}>
        {[OVERALL, ...METRICS].map((m) => {
          const v = score(latest, m.key);
          return (
            <li key={m.key}>
              <button onClick={() => actions.openMetric(m.key)} aria-label={`${m.label} ${v ?? "not measured"}`}>
                <span className={o.bubble}>
                  <Icon name={m.key} size={12} />
                  <b>{v ?? "–"}</b>
                </span>
                {m.label}
              </button>
            </li>
          );
        })}
      </ul>

      <div className={o.dial}>
        <svg viewBox="0 0 300 150" aria-hidden>
          <path d={ARC} className={o.arcTrack} pathLength={100} />
          <path
            d={ARC}
            className={o.arcValue}
            pathLength={100}
            style={{ "--v": latest.scores.overall } as CSSProperties}
          />
          {DOTS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.6" className={o.arcDot} />
          ))}
          <text x="14" y="152" className={o.arcEnd}>
            0
          </text>
          <text x="272" y="152" className={o.arcEnd}>
            100
          </text>
        </svg>
        <button className={o.lensChip} onClick={() => actions.explore(lensScan.id)} aria-label="Open your latest scan">
          <ScanPhoto scan={lensScan} alt="" />
        </button>
        <b className={o.score}>{latest.scores.overall}</b>
        <span className={o.scoreLabel}>Overall</span>
      </div>

      <h1 className={o.headline}>{headline(d)}</h1>
      <p className={o.body}>{body}</p>
      <p className={o.meta}>
        {latest.area} · {fmtDay(latest.takenAt, tz)}
      </p>
      <button className={o.pill} onClick={onRecap}>
        {d.scans.length === 1 ? "Play your first read" : d.isMonthly ? "Play your month" : "Play your story"}
      </button>
    </header>
  );
}

function Today({ d, rh, actions }: { d: Derived; rh: Rhythm; actions: ReportActions }) {
  const latest = d.latest;
  const prev = d.trend?.from ?? null;

  return (
    <>
      <section>
        <h2 className={o.h2}>Contributors</h2>
        <ul className={o.contrib}>
          {METRICS.map((m) => {
            const v = score(latest, m.key);
            const p = prev ? score(prev, m.key) : null;
            const st = status(v);
            return (
              <li key={m.key}>
                <button onClick={() => actions.openMetric(m.key)} data-tone={st.tone}>
                  <span className={o.cLabel}>{m.label}</span>
                  <span className={o.cValue}>
                    {v != null && p != null && v !== p && <small>{signed(v - p)}</small>}
                    {st.word}
                    <Icon name="chevronR" size={12} />
                  </span>
                  <i className={o.cBar} style={{ "--v": `${v ?? 0}%` } as CSSProperties} />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={o.card}>
        <span className={o.kicker}>Today’s read</span>
        <ul className={o.seen}>
          {latest.summary.observations.map(obsLabel).map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p className={o.tip}>
          <Icon name="spark" size={16} />
          {shortTip(latest.summary.tip)}
        </p>
        <p className={o.aiNote}>Read from your photo. Not a diagnosis.</p>
        <button className={o.rowLink} onClick={() => actions.openScan(latest)}>
          This scan, in full
          <Icon name="chevronR" size={12} />
        </button>
      </section>

      {rh.days > 1 && (
        <section className={o.card} data-tone="dark" aria-label="Your scanning rhythm">
          <span className={o.kicker}>Rhythm</span>
          <RhythmStrip r={rh} tone="dark" />
          <dl className={o.stats}>
            <div>
              <dt>Days scanned</dt>
              <dd>
                {rh.scanDays}
                <small>/{rh.days}</small>
              </dd>
            </div>
            {rh.longestRun >= 2 && (
              <div>
                <dt>Best streak</dt>
                <dd>
                  {rh.longestRun}
                  <small> days</small>
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section>
        <h2 className={o.h2}>More metrics</h2>
        <ul className={o.related}>
          {EXTRAS.map((m) => {
            const v = score(latest, m.key);
            return (
              <li key={m.key}>
                <button onClick={() => actions.openMetric(m.key)}>
                  <span className={o.kicker}>{m.label}</span>
                  <b>{v ?? "–"}</b>
                  <small>{m.source === "derived" ? "Derived" : "Preview"}</small>
                  <Icon name="chevronR" size={12} className={o.relGo} />
                </button>
              </li>
            );
          })}
          <li>
            <div>
              <span className={o.kicker}>Skin type</span>
              <b className={o.word}>{d.report.person.skinType ?? "Not set"}</b>
            </div>
          </li>
        </ul>
      </section>
    </>
  );
}
