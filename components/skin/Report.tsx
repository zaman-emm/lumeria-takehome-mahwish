"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { AnimatePresence } from "motion/react";
import { fmtDay, metricMeta, scanTz, shortTip, type Derived, type ScoreKey } from "@/lib/insights";
import type { Scan } from "@/lib/types";
import { buildRecap } from "@/lib/recap";
import { weekStreak } from "@/lib/weeks";
import { CalendarTab } from "./CalendarTab";
import { ReportContext, type ReportApi, type SheetState } from "./context";
import type { Light } from "./ui";
import { Glance } from "./Glance";
import { BackButton, Hero, ProfileButton, SlimHeader } from "./Hero";
import { LumiSheet } from "./LumiSheet";
import { MetricSheet } from "./MetricSheet";
import { NotesProvider } from "./notes";
import { PhotosTab } from "./PhotosTab";
import { ProductsTab } from "./ProductsTab";
import { Recap } from "./Recap";
import { ScanSheet } from "./ScanSheet";
import { Sheet } from "./Sheet";
import { Splash } from "./Splash";
import { TabBar } from "./TabBar";
import { markSplashed, willSplash } from "./splashState";
import { Tabs } from "./Tabs";
import { TrendsTab } from "./TrendsTab";
import r from "./report.module.css";

// The 2e report. At a glance opens on the gold hero; every other tab opens on
// a slim header (back, "Report", profile). Switching tabs swaps the header and
// slides the panel in the direction of the tab. Details open in one bottom
// sheet; the month plays as a full-screen story.
//
// The report is the app's Trends destination; the floating tab bar at the
// bottom switches between it, Home and Scan, crossfading the page.

const TABS = [
  { id: "glance", label: "At a glance" },
  { id: "products", label: "Products" },
  { id: "trends", label: "Progress" },
  { id: "calendar", label: "Calendar" },
  { id: "photos", label: "Photos" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const sheetLabel = (s: SheetState) =>
  s.kind === "scan" ? "Scan details" : s.kind === "metric" ? `${metricMeta(s.key).label} trend` : "Lumi AI";
const sheetKey = (s: SheetState) => (s.kind === "scan" ? s.scan.id : s.kind === "metric" ? `${s.key}-${s.area}` : "lumi");

export function Report({ d, fitnessLayout = false }: { d: Derived; fitnessLayout?: boolean }) {
  const [tab, setTab] = useState<TabId>("glance");
  const direction = useRef<"forward" | "back" | "none">("none");
  // The splash opens the first load of a page, never again, and never for
  // people who asked for less motion (splashState.ts).
  const [splash, setSplash] = useState<"wait" | "go" | "done">(() => (!fitnessLayout && willSplash() ? "wait" : "done"));
  const [compactHeader, setCompactHeader] = useState(false);
  const [barReady, setBarReady] = useState(() => splash === "done");
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [recap, setRecap] = useState(false);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [origin, setOrigin] = useState(0);
  const streak = useMemo(() => weekStreak(d), [d]);
  const slides = useMemo(() => buildRecap(d).length, [d]);
  const [recapFrom, setRecapFrom] = useState<{ x: number; y: number } | null>(null);

  // The photo the headers show: the newest real three-light photo of the
  // latest scan's spot, else the latest scan's own.
  const lens = useMemo(
    () => [...d.realPhotos].reverse().find((s) => s.area === d.latest.area) ?? d.latest,
    [d],
  );

  const open = useCallback((s: SheetState) => {
    // The page scales back from the top of what's on screen, like iOS.
    setOrigin(window.scrollY);
    setSheet(s);
  }, []);

  const api: ReportApi = useMemo(
    () => ({
      d,
      openScan: (scan: Scan, light?: Light) => open({ kind: "scan", scan, light }),
      openMetric: (key: ScoreKey, area?: string) => open({ kind: "metric", key, area: area ?? d.area }),
      openLumi: () => open({ kind: "lumi", tab }),
    }),
    [d, open, tab],
  );

  const changeTab = (id: TabId) => {
    if (id === tab) return;
    const from = TABS.findIndex((t) => t.id === tab);
    const to = TABS.findIndex((t) => t.id === id);
    direction.current = to > from ? "forward" : "back";
    setTab(id);
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "instant" });
  };

  // The recap lives in history, so the phone's back gesture closes it.
  const recapOpen = useRef(false);
  useEffect(() => {
    if (location.hash === "#month") history.replaceState(null, "", location.pathname + location.search);
    const onPop = () => {
      if (recapOpen.current && location.hash !== "#month") {
        recapOpen.current = false;
        setRecap(false);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // The month opens out of the button that played it.
  const playRecap = (from?: HTMLElement) => {
    const r = from?.getBoundingClientRect();
    setRecapFrom(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null);
    history.pushState(null, "", "#month");
    recapOpen.current = true;
    setRecap(true);
  };
  const closeRecap = () => {
    if (recapOpen.current && location.hash === "#month") history.back();
    else setRecap(false);
  };

  // The page holds still under the splash.
  useEffect(() => {
    if (splash === "done") return;
    window.scrollTo({ top: 0 });
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [splash]);

  useEffect(() => {
    if (!recap) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [recap]);

  // The slim header slides away as you scroll down and comes back the moment
  // you scroll up, like an iOS navigation bar.
  const [headAway, setHeadAway] = useState(false);
  useEffect(() => {
    if (tab === "glance") return setHeadAway(false);
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80) setHeadAway(false);
      else if (y > last + 4) setHeadAway(true);
      else if (y < last - 4) setHeadAway(false);
      if (Math.abs(y - last) > 4) last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [tab]);

  const latestTz = scanTz(d.latest) ?? d.tz;

  useEffect(() => {
    if (!fitnessLayout) return;
    const update = () => setCompactHeader(window.scrollY > 40);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [fitnessLayout]);


  return (
    <ReportContext.Provider value={api}>
      <NotesProvider>
        <Drawer.Provider>
          <div className={r.root} data-skin data-skin-variant={fitnessLayout ? "fitness" : undefined} ref={setRoot}>
            <Drawer.IndentBackground className={r.indentBg} />
            <Drawer.Indent className={r.indent} style={{ "--origin": `${origin}px` } as CSSProperties}>
              <div className={r.page} data-iteration={fitnessLayout || undefined} data-tab={tab} data-head={headAway ? "away" : "shown"} data-splash={splash === "done" ? undefined : splash}>
                {fitnessLayout && <div className={r.exploreHeader} data-compact={compactHeader} data-page-chrome>
                  <div className={r.exploreBrandRow}>
                    <BackButton />
                    <span className={r.exploreBrand} role="img" aria-label="Lumeria" />
                    <ProfileButton name={d.firstName} />
                  </div>
                  <Tabs tabs={TABS} active={tab} onChange={changeTab} fitnessLayout />
                </div>}
                {tab === "glance" ? (
                  <Hero d={d} lens={lens} onScan={() => api.openScan(d.latest)} onPlay={slides ? playRecap : undefined} splash={splash} fitnessLayout={fitnessLayout} />
                ) : (
                  !fitnessLayout && <SlimHeader d={d} />
                )}

                {!fitnessLayout && <Tabs tabs={TABS} active={tab} onChange={changeTab} />}

                <main key={tab} className={r.panel} data-direction={direction.current} id="skin-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
                  {tab === "glance" && <Glance streak={streak} />}
                  {tab === "products" && <ProductsTab />}
                  {tab === "trends" && <TrendsTab />}
                  {tab === "calendar" && <CalendarTab />}
                  {tab === "photos" && <PhotosTab />}
                </main>

                {tab === "glance" && (
                  <footer className={r.foot}>
                    <p className={r.disclaimer}>
                      Lumeria’s AI reads how your skin looks, not what’s going on underneath. If something worries you, a dermatologist is the
                      right next step.
                    </p>
                  </footer>
                )}
              </div>
            </Drawer.Indent>

            <TabBar
              hidden={recap || !barReady}
              onLumi={api.openLumi}
              lumiCount={d.factors.length}
              lumiPaused={Boolean(sheet) || recap}
            />

            <Sheet
              open={Boolean(sheet)}
              onClose={() => setSheet(null)}
              label={sheet ? sheetLabel(sheet) : ""}
              contentKey={sheet ? sheetKey(sheet) : undefined}
              container={root}
              edge={sheet?.kind !== "lumi"}
            >
              {sheet?.kind === "scan" && <ScanSheet scan={sheet.scan} light={sheet.light} />}
              {sheet?.kind === "metric" && (
  <MetricSheet metric={sheet.key} area={sheet.area} />
              )}
              {sheet?.kind === "lumi" && <LumiSheet tab={sheet.tab} />}
            </Sheet>

            {splash !== "done" && (
              <Splash value={d.latest.scores.overall} onGo={() => {
                  markSplashed();
                  setSplash("go");
                }} onRevealBar={() => setBarReady(true)} onDone={() => { setBarReady(true); setSplash("done"); }} />
            )}

            <AnimatePresence>
              {recap && (
                <Recap
                  key="recap"
                  from={recapFrom}
                  onClose={closeRecap}
                  label={`${d.isMonthly ? "Your month" : "Your story"}, ${d.periodLabel}, up to ${fmtDay(d.latest.takenAt, latestTz)}`}
                />
              )}
            </AnimatePresence>
          </div>
        </Drawer.Provider>
      </NotesProvider>
    </ReportContext.Provider>
  );
}
