"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { fmtDay, metricMeta, rhythm, scanTz, trendSentence, type Derived, type ScoreKey } from "@/lib/insights";
import type { Scan } from "@/lib/types";
import { CalendarTab } from "./CalendarTab";
import { Explorer } from "./Explorer";
import { Glance } from "./Glance";
import { MetricView } from "./MetricView";
import { PhotosTab } from "./PhotosTab";
import { Recap } from "./Recap";
import { ScanDetail } from "./ScanDetail";
import { ScanPhoto } from "./ScanPhoto";
import { Sheet } from "./Sheet";
import { TrendsTab } from "./TrendsTab";
import { Icon } from "./Visuals";
import r from "./report.module.css";

// The report home. A dark hero answers "how is my skin today?" at a glance,
// then four tabs carry the rest: the read, the trend, the calendar and the
// photos. The recap and the explorer open over it as full-screen views.

export interface ReportActions {
  /** Every detail of one scan, in a sheet. */
  openScan: (scan: Scan) => void;
  /** One score's trend, in a sheet. */
  openMetric: (key: ScoreKey) => void;
  /** The full-screen explorer, starting at a scan. */
  explore: (scanId?: string) => void;
}

const TABS = [
  { id: "glance", label: "At a glance" },
  { id: "trends", label: "Trends" },
  { id: "calendar", label: "Calendar" },
  { id: "photos", label: "Photos" },
] as const;
type TabId = (typeof TABS)[number]["id"];

type Overlay = { kind: "recap" } | { kind: "explore"; scanId?: string } | null;
type SheetState = { kind: "scan"; scan: Scan } | { kind: "metric"; key: ScoreKey } | null;

/** A big sister's first line: honest about the direction, kind about it. */
function headline(d: Derived) {
  if (!d.trend) return "Here’s where your skin starts";
  const { delta } = d.trend;
  if (delta >= 3 && d.isBest) return d.isMonthly ? "Your best skin this month" : "Your best skin yet";
  if (delta >= 3) return "Your skin is on the up";
  if (delta <= -3) return "A softer stretch, and that’s okay";
  return "Steady, and that counts";
}

export function Report({ d }: { d: Derived }) {
  const [tab, setTab] = useState<TabId>("glance");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const rh = useMemo(() => rhythm(d), [d]);

  // Overlays live in history, so the phone's back gesture closes them.
  useEffect(() => {
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    const onPop = () => {
      if (!location.hash) setOverlay(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!overlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [overlay]);

  const show = useCallback((o: NonNullable<Overlay>) => {
    if (location.hash) history.replaceState(null, "", `#${o.kind}`);
    else history.pushState(null, "", `#${o.kind}`);
    setOverlay(o);
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

  const pickTab = (id: TabId) => {
    setTab(id);
    // Start the new tab from its top, but only if we've scrolled past the hero.
    const el = tabsRef.current;
    if (el && window.scrollY > el.offsetTop) window.scrollTo({ top: el.offsetTop });
  };

  const latest = d.latest;
  const tz = scanTz(latest) ?? d.tz;
  const lensScan = [...d.realPhotos].reverse().find((x) => x.area === latest.area) ?? latest;
  const idx = TABS.findIndex((t) => t.id === tab);

  return (
    <div className={r.page}>
      <header className={r.hero}>
        <div className={r.heroTop}>
          <span className="label">Lumeria</span>
          <span className="label">{d.periodLabel}</span>
        </div>
        <p className={r.hi}>Hi {d.firstName},</p>
        <h1 className={r.headline}>{headline(d)}</h1>

        <button className={r.lensWrap} onClick={() => actions.explore(lensScan.id)} aria-label="Open your latest scan in the explorer">
          <svg className={r.ring} viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(244,239,230,.12)" strokeWidth="1" />
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="var(--bronze)"
              strokeWidth="1.6"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100"
              style={{ "--off": 100 - latest.scores.overall } as CSSProperties}
              transform="rotate(-90 50 50)"
              className={r.arc}
            />
            {Array.from({ length: 60 }, (_, i) => (
              <line
                key={i}
                x1="50"
                y1="-1.5"
                x2="50"
                y2={i % 5 ? "0.2" : "1.2"}
                stroke="rgba(244,239,230,.28)"
                strokeWidth=".4"
                transform={`rotate(${i * 6} 50 50)`}
              />
            ))}
          </svg>
          <span className={r.lens}>
            <ScanPhoto scan={lensScan} priority alt={`${lensScan.area} on ${fmtDay(lensScan.takenAt, tz)}`} />
          </span>
        </button>

        <div className={r.scoreRow}>
          <b className={r.score}>{latest.scores.overall}</b>
          <span className={r.scoreMeta}>
            <span className="label">Overall</span>
            <span>
              {d.trend && <Icon name={d.trend.delta >= 0 ? "up" : "down"} size={12} />}
              {d.trend ? trendSentence(d).replace(/\.$/, "") : "Your starting point"}
            </span>
          </span>
        </div>
        <p className={r.heroMeta}>
          {latest.area} · {fmtDay(latest.takenAt, tz)}
          {d.report.person.skinType && ` · ${d.report.person.skinType} skin`}
        </p>

        <div className={r.heroActions}>
          <button className={r.recapBtn} onClick={() => show({ kind: "recap" })}>
            <span className={r.play}>
              <Icon name="play" size={14} />
            </span>
            <span>
              <b>{d.scans.length === 1 ? "Play your first read" : d.isMonthly ? "Play your month" : "Play your story"}</b>
              <small>{d.scans.length === 1 ? "A few taps, made for you" : "One minute, made for you"}</small>
            </span>
          </button>
          <button className={r.exploreBtn} onClick={() => actions.explore()} aria-label={`Explore all ${d.scans.length} scans`}>
            <Icon name="camera" size={18} />
            <small>{d.scans.length}</small>
          </button>
        </div>
      </header>

      <div className={r.tabs} ref={tabsRef}>
        <div className={r.tabList} role="tablist" aria-label="Report sections" style={{ "--i": idx } as CSSProperties}>
          <i className={r.tabPill} aria-hidden />
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={t.id === tab}
              aria-controls={`panel-${t.id}`}
              onClick={() => pickTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main key={tab} className={r.panel} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "glance" && <Glance d={d} rh={rh} actions={actions} />}
        {tab === "trends" && <TrendsTab d={d} rh={rh} actions={actions} />}
        {tab === "calendar" && <CalendarTab d={d} actions={actions} />}
        {tab === "photos" && <PhotosTab d={d} actions={actions} />}
      </main>

      <footer className={r.foot}>
        <div className={r.signoff}>
          <Icon name="spark" size={16} />
          <p>
            {rh.tone === "building" || rh.tone === "starting"
              ? "Same spot, same time of day, every few days. That’s all it takes, and I’ll take care of the rest."
              : "Keep this rhythm going. Same spot, same time of day, and your next read will be even sharper."}
          </p>
        </div>
        <p className={r.disclaimer}>
          Lumeria reads how your skin looks, not what’s going on underneath. If something worries you, a dermatologist is the right
          next step.
        </p>
      </footer>

      <Sheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        label={sheet?.kind === "metric" ? `${metricMeta(sheet.key).label} trend` : "Scan details"}
        scrollKey={sheet ? (sheet.kind === "scan" ? sheet.scan.id : sheet.key) : undefined}
      >
        {sheet?.kind === "scan" && <ScanDetail d={d} scan={sheet.scan} />}
        {sheet?.kind === "metric" && <MetricView d={d} metric={sheet.key} onOpen={(scan) => setSheet({ kind: "scan", scan })} />}
      </Sheet>

      {overlay?.kind === "recap" && <Recap d={d} onClose={closeOverlay} onExplore={() => show({ kind: "explore" })} />}
      {overlay?.kind === "explore" && <Explorer d={d} startId={overlay.scanId} onClose={closeOverlay} />}
    </div>
  );
}
