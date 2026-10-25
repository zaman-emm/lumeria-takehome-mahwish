"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import NumberFlow from "@number-flow/react";
import { motion, useReducedMotion } from "motion/react";
import { band, fmtDay, scanTz } from "@/lib/insights";
import { buildRecap, type Slide, type Stat, type Title } from "@/lib/recap";
import { useReportApi } from "./context";
import { Icon } from "./Icon";
import { LIGHTS, Photo, type Light } from "./ui";
import s from "./recap.module.css";

// Play your month: the period as a short, user-paced story. Nothing advances
// on its own. Each slide's pieces arrive in order (title, numbers, the
// picture, the line under it), and the background crossfades between slides.
// Next, the arrow keys, a sideways swipe or a tap on the left edge move it.

interface Theme {
  bg: string;
  glows: string;
  ink: "dark" | "light";
}

const glow = (x: number, y: number, r: number, c: string) => `radial-gradient(${r}px ${r}px at ${x}px ${y}px, ${c}, transparent)`;

const THEMES: Record<Slide["kind"], Theme> = {
  highs: {
    bg: "#c0913f",
    glows: [glow(360, 100, 200, "rgba(244,239,230,.55)"), glow(30, 610, 210, "rgba(128,96,31,.55)"), glow(350, 690, 150, "rgba(232,223,206,.35)")].join(","),
    ink: "dark",
  },
  showedUp: {
    bg: "#2f4a35",
    glows: [glow(40, 120, 200, "rgba(192,145,63,.35)"), glow(380, 700, 200, "rgba(20,36,26,.7)")].join(","),
    ink: "light",
  },
  scanTime: {
    bg: "#2e2620",
    glows: [glow(210, 190, 170, "rgba(192,145,63,.35)"), glow(50, 730, 190, "rgba(184,83,58,.3)")].join(","),
    ink: "light",
  },
  better: {
    bg: "#e8dfce",
    glows: [glow(70, 150, 210, "rgba(244,239,230,.95)"), glow(370, 530, 170, "rgba(192,145,63,.28)")].join(","),
    ink: "dark",
  },
  rough: {
    bg: "#b8533a",
    glows: [glow(320, 110, 190, "rgba(192,145,63,.5)"), glow(30, 670, 210, "rgba(46,38,32,.45)")].join(","),
    ink: "light",
  },
  helped: {
    bg: "#80601f",
    glows: [glow(300, 100, 200, "rgba(192,145,63,.55)"), glow(30, 680, 200, "rgba(20,36,26,.4)")].join(","),
    ink: "light",
  },
  nights: {
    bg: "#14241a",
    glows: [glow(330, 130, 190, "rgba(47,74,53,.9)"), glow(0, 680, 180, "rgba(192,145,63,.22)")].join(","),
    ink: "light",
  },
  scope: {
    bg: "#2f4a35",
    glows: [glow(50, 210, 190, "rgba(232,223,206,.18)"), glow(360, 660, 200, "rgba(20,36,26,.7)")].join(","),
    ink: "light",
  },
  tip: {
    bg: "#f4efe6",
    glows: [glow(330, 120, 200, "rgba(232,223,206,1)"), glow(10, 530, 190, "rgba(192,145,63,.22)")].join(","),
    ink: "dark",
  },
};

/** Staggered arrival for one piece of a slide. */
const In = ({ i, children, className, style }: { i: number; children: ReactNode; className?: string; style?: CSSProperties }) => (
  <div className={`${s.in} ${className ?? ""}`} style={{ "--i": i, ...style } as CSSProperties}>
    {children}
  </div>
);

const Head = ({ t, size }: { t: Title; size?: "m" }) => (
  <h2 className={s.title} data-size={size}>
    {t.before}
    <b>{t.bold}</b>
    {t.after}
  </h2>
);

const Stats = ({ stats, tiles }: { stats: Stat[]; tiles?: boolean }) => (
  <dl className={tiles ? s.tiles : s.stats}>
    {stats.map((x) => (
      <div key={x.label}>
        <dt>{x.label}</dt>
        <dd>{x.value}</dd>
      </div>
    ))}
  </dl>
);

export function Recap({
  onClose,
  label,
  from,
}: {
  onClose: () => void;
  label: string;
  /** Where the play button sits on screen; the stage grows out of it. */
  from?: { x: number; y: number } | null;
}) {
  const { d } = useReportApi();
  const slides = useMemo(() => buildRecap(d), [d]);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const reduce = useReducedMotion();
  const [shared, setShared] = useState(false);

  const go = useCallback(
    (to: number) => {
      if (to < 0 || to >= slides.length) return;
      setDir(to > i ? 1 : -1);
      setI(to);
    },
    [i, slides.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, i, onClose]);

  // A sideways swipe turns the page; vertical drags are left alone.
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialog.current?.focus();
  }, []);
  useLayoutEffect(() => {
    const el = dialog.current;
    if (!el || !from) return;
    const left = (document.documentElement.clientWidth - el.offsetWidth) / 2;
    el.style.transformOrigin = `${from.x - left}px ${from.y}px`;
  }, [from]);

  const share = async () => {
    const url = location.href.replace(/#.*$/, "");
    try {
      if (navigator.share) await navigator.share({ title: "My skin month", url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 1600);
      }
    } catch {
      /* dismissed */
    }
  };

  if (!slides.length) return null;
  const slide = slides[i];
  const theme = THEMES[slide.kind];
  const last = i === slides.length - 1;

  return (
    <motion.div
      ref={dialog}
      className={s.stage}
      data-ink={theme.ink}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      initial={reduce ? { opacity: 0 } : { opacity: 0, transform: from ? "scale(0.9)" : "scale(0.98)" }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, transform: "scale(1)" }}
      exit={
        reduce
          ? { opacity: 0, transition: { duration: 0.2 } }
          : { opacity: 0, transform: from ? "scale(0.92)" : "scale(0.98)", transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } }
      }
      transition={{ duration: from ? 0.4 : 0.3, ease: [0.32, 0.72, 0, 1] }}
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY, t: performance.now() };
      }}
      onPointerUp={(e) => {
        const st = start.current;
        start.current = null;
        if (!st) return;
        const dx = e.clientX - st.x;
        const dy = e.clientY - st.y;
        const v = Math.abs(dx) / (performance.now() - st.t);
        if (Math.abs(dx) > Math.abs(dy) * 1.4 && (Math.abs(dx) > 60 || v > 0.4)) go(dx < 0 ? i + 1 : i - 1);
      }}
    >
      {slides.map((sl, n) => (
        <div
          key={n}
          className={s.bg}
          data-on={n === i}
          style={{ backgroundColor: THEMES[sl.kind].bg, backgroundImage: THEMES[sl.kind].glows }}
          aria-hidden
        />
      ))}

      <header className={s.top}>
        <button onClick={onClose} aria-label="Close" className={s.iconBtn}>
          <Icon name="chevronL" size={16} stroke={1.8} />
        </button>
        <span>{d.isMonthly ? "Your month" : "Your story"}</span>
        <button onClick={share} aria-label={shared ? "Link copied" : "Share"} className={s.iconBtn}>
          <Icon name={shared ? "check" : "share"} size={17} stroke={1.6} />
        </button>
      </header>

      <button className={s.backZone} onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous" tabIndex={-1} />

      <section
        key={i}
        className={s.slide}
        data-kind={slide.kind}
        style={{ "--dir": dir } as CSSProperties}
        aria-live="polite"
        aria-label={`${i + 1} of ${slides.length}`}
      >
        <SlideBody slide={slide} />
      </section>

      <footer className={s.controls}>
        <div className={s.progress} aria-hidden>
          {slides.map((_, n) => (
            <span key={n}>
              <i style={{ transform: `scaleX(${n <= i ? 1 : 0})` }} />
            </span>
          ))}
        </div>
        {last ? (
          <button className={s.done} onClick={onClose}>
            Done
          </button>
        ) : (
          <button className={s.next} onClick={() => go(i + 1)}>
            Next
          </button>
        )}
      </footer>
    </motion.div>
  );
}

function SlideBody({ slide }: { slide: Slide }) {
  switch (slide.kind) {
    case "highs":
      return <Highs slide={slide} />;
    case "showedUp":
      return <ShowedUp slide={slide} />;
    case "scanTime":
      return <ScanTime slide={slide} />;
    case "better":
      return <Better slide={slide} />;
    case "rough":
      return <Rough slide={slide} />;
    case "helped":
      return <Helped slide={slide} />;
    case "nights":
      return <Nights slide={slide} />;
    case "scope":
      return <Scope slide={slide} />;
    case "tip":
      return <Tip slide={slide} />;
  }
}

// ---------------------------------------------------------------- slides

function Highs({ slide }: { slide: Extract<Slide, { kind: "highs" }> }) {
  const { d } = useReportApi();
  const v = slide.scan.scores.overall;
  return (
    <>
      <In i={0}>
        <Head t={slide.title} />
      </In>
      <div className={s.middle}>
        <In i={1} className={s.highs}>
          <span className={s.halo} />
          <svg viewBox="0 0 296 296" className={s.highsRing} aria-hidden>
            <circle cx="148" cy="148" r="145" pathLength={100} strokeDasharray={`${v} 200`} transform="rotate(-90 148 148)" style={{ "--v": v } as CSSProperties} />
          </svg>
          <Photo scan={slide.scan} alt={`${slide.scan.area}, ${fmtDay(slide.scan.takenAt, scanTz(slide.scan) ?? d.tz)}`} className={s.highsPhoto} />
          <span className={s.sticker}>{v}</span>
        </In>
        <In i={2} className={s.caption}>
          {fmtDay(slide.scan.takenAt, scanTz(slide.scan) ?? d.tz)} · {slide.scan.area}
        </In>
        <In i={3}>
          <Stats stats={slide.stats} tiles />
        </In>
      </div>
      <In i={4} className={s.body}>
        {slide.body}
      </In>
    </>
  );
}

const dotTone = (v: number) => {
  const t = band(v).tone;
  return t === "good" ? "good" : t === "fair" ? "fair" : "low";
};

function ShowedUp({ slide }: { slide: Extract<Slide, { kind: "showedUp" }> }) {
  const tones = new Set(slide.weeks.flat().filter(Boolean).map((c) => (c!.score == null ? "none" : dotTone(c!.score))));
  let n = 0;
  return (
    <>
      <In i={0}>
        <Head t={slide.title} />
      </In>
      <In i={1}>
        <Stats stats={slide.stats} />
      </In>
      <div className={s.middle}>
        <In i={2} className={s.glass}>
          <div className={s.cal}>
            {["M", "T", "W", "T", "F", "S", "S"].map((w, k) => (
              <span key={k} className={s.calHead}>
                {w}
              </span>
            ))}
            {slide.weeks.flat().map((c, k) =>
              c ? (
                <span key={k} className={s.calDay} data-tone={c.score == null ? "none" : dotTone(c.score)} style={{ "--k": n++ } as CSSProperties}>
                  {c.date}
                </span>
              ) : (
                <span key={k} />
              ),
            )}
          </div>
        </In>
        <In i={3} className={`${s.glass} ${s.miles}`}>
          <ul>
            {slide.milestones.map((m) => (
              <li key={m.weeks} data-earned={m.earned}>
                {m.weeks} wk
              </li>
            ))}
          </ul>
          <span className={s.calKey}>
            {tones.has("good") && (
              <span>
                <i data-tone="good" />
                Looking good
              </span>
            )}
            {tones.has("fair") && (
              <span>
                <i data-tone="fair" />
                Steady
              </span>
            )}
            {tones.has("low") && (
              <span>
                <i data-tone="low" />
                Needs care
              </span>
            )}
          </span>
        </In>
      </div>
      <In i={4} className={s.body}>
        {slide.body}
      </In>
    </>
  );
}

function ScanTime({ slide }: { slide: Extract<Slide, { kind: "scanTime" }> }) {
  return (
    <>
      <In i={0} className={`${s.glass} ${s.clock}`}>
        <svg viewBox="0 0 256 256" aria-hidden>
          <circle cx="128" cy="128" r="127" className={s.dial} />
          {Array.from({ length: 12 }, (_, k) => (
            <line key={k} x1="128" y1="2" x2="128" y2={k % 3 ? 7 : 14} className={s.tick} transform={`rotate(${k * 30} 128 128)`} />
          ))}
          {[
            ["12", 128, 28],
            ["3", 230, 128],
            ["6", 128, 230],
            ["9", 26, 128],
          ].map(([t, x, y]) => (
            <text key={t} x={x} y={y} className={s.num} textAnchor="middle" dominantBaseline="central">
              {t}
            </text>
          ))}
          {slide.minutes.map((m, k) => (
            <line key={k} x1="128" y1="128" x2="128" y2="24" className={s.minute} style={{ "--a": `${m * 6}deg`, "--k": k } as CSSProperties} />
          ))}
          <line x1="128" y1="128" x2="128" y2="64" className={s.hour} style={{ "--a": `${(slide.hour % 12) * 30}deg` } as CSSProperties} />
          <circle cx="128" cy="128" r="5" className={s.hub} />
        </svg>
      </In>
      <div className={s.middle}>
        <In i={1}>
          <Head t={slide.title} />
        </In>
        <In i={2}>
          <Stats stats={slide.stats} />
        </In>
      </div>
      <In i={3} className={s.body}>
        {slide.body}
      </In>
    </>
  );
}

function Better({ slide }: { slide: Extract<Slide, { kind: "better" }> }) {
  const vals = slide.line.map((p) => p.value);
  const lo = Math.min(...vals, ...slide.grid) - 4;
  const hi = Math.max(...vals, ...slide.grid) + 4;
  const W = 284;
  const H = 130;
  const X = (x: number) => 38 + x * W;
  const Y = (v: number) => 28 + (H - ((v - lo) / (hi - lo)) * H);
  return (
    <>
      <In i={0}>
        <Head t={slide.title} />
      </In>
      <In i={1}>
        <Stats stats={slide.stats} />
      </In>
      <div className={s.middle}>
        <In i={2} className={`${s.glass} ${s.chart}`}>
          <svg viewBox="0 0 342 226" aria-hidden>
            {slide.band && (
              <>
                <rect x={X(slide.band.x0) - 6} y={28} width={(slide.band.x1 - slide.band.x0) * W + 12} height={H + 30} rx={4} className={s.band} />
                <text x={X((slide.band.x0 + slide.band.x1) / 2)} y={20} textAnchor="middle" className={s.bandLabel}>
                  {slide.band.label}
                </text>
              </>
            )}
            {slide.grid.map((g) => (
              <g key={g}>
                <line x1={38} x2={322} y1={Y(g)} y2={Y(g)} className={s.grid} />
                <text x={14} y={Y(g)} dominantBaseline="central" className={s.axisText}>
                  {g}
                </text>
              </g>
            ))}
            <path d={slide.line.map((p, k) => `${k ? "L" : "M"}${X(p.x).toFixed(1)} ${Y(p.value).toFixed(1)}`).join("")} className={s.line} pathLength={1} />
            {slide.marks.map((m, k) => (
              <circle key={k} cx={X(m.x)} cy={Y(m.value)} r={5} className={s.mark} data-tone={m.tone} style={{ "--k": k } as CSSProperties} />
            ))}
            {slide.axis.map((a) => (
              <text key={a.label} x={X(a.x)} y={210} textAnchor={a.x === 0 ? "start" : a.x === 1 ? "end" : "middle"} className={s.axisText}>
                {a.label}
              </text>
            ))}
          </svg>
        </In>
        <In i={3} className={s.pair}>
          {slide.tiles.map((t) => (
            <div key={t.label} className={s.glass}>
              <span>{t.label}</span>
              <b data-tone={t.tone}>{t.value}</b>
            </div>
          ))}
        </In>
      </div>
      <In i={4} className={s.body}>
        {slide.body}
      </In>
    </>
  );
}

function Rough({ slide }: { slide: Extract<Slide, { kind: "rough" }> }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? slide.big : slide.from);
  useEffect(() => {
    const t = setTimeout(() => setN(slide.big), 250);
    return () => clearTimeout(t);
  }, [slide.big]);
  const vals = slide.line.map((p) => p.value);
  const lo = Math.min(...vals) - 6;
  const hi = Math.max(...vals) + 6;
  const W = 300;
  const X = (x: number) => 21 + x * W;
  const Y = (v: number) => 61 + (50 - ((v - lo) / (hi - lo)) * 50);
  return (
    <>
      <In i={0} className={s.big}>
        <NumberFlow value={n} suffix="%" animated={!reduce} transformTiming={{ duration: 900, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }} spinTiming={{ duration: 900, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }} />
      </In>
      <In i={1}>
        <Head t={slide.title} size="m" />
      </In>
      <div className={s.middle}>
        <In i={2} className={`${s.glass} ${s.chart}`} style={{ aspectRatio: "342 / 210" }}>
          <svg viewBox="0 0 342 210" aria-hidden>
            <rect x={16} y={15} width={12} height={12} rx={2} className={s.legendBox} />
            <text x={34} y={21} dominantBaseline="central" className={s.axisText}>
              Humidity
            </text>
            <line x1={116} x2={136} y1={21} y2={21} className={s.legendLine} />
            <text x={142} y={21} dominantBaseline="central" className={s.axisText}>
              {slide.metric}
            </text>
            {slide.bars.map((b, k) => {
              const h = (b.value / 100) * 130;
              return <rect key={k} x={X(b.x) - 3.5} y={174 - h} width={7} height={h} rx={2} className={s.hbar} data-away={b.away} style={{ "--k": k } as CSSProperties} />;
            })}
            <path d={slide.line.map((p, k) => `${k ? "L" : "M"}${X(p.x).toFixed(1)} ${Y(p.value).toFixed(1)}`).join("")} className={s.line} pathLength={1} />
            <circle cx={X(slide.low.x)} cy={Y(slide.low.value)} r={5} className={s.lowDot} />
            {slide.axis.map((a) => (
              <text key={a.label} x={X(a.x)} y={196} textAnchor={a.x === 0 ? "start" : "end"} className={s.axisText}>
                {a.label}
              </text>
            ))}
          </svg>
        </In>
        <In i={3}>
          <Stats stats={slide.stats} tiles />
        </In>
      </div>
      <In i={4} className={s.body}>
        {slide.body}
      </In>
    </>
  );
}

function Helped({ slide }: { slide: Extract<Slide, { kind: "helped" }> }) {
  const vals = slide.line.map((p) => p.value);
  const lo = Math.min(...vals) - 4;
  const hi = Math.max(...vals) + 4;
  const W = 310;
  const X = (x: number) => 16 + x * W;
  const Y = (v: number) => 50 + (110 - ((v - lo) / (hi - lo)) * 110);
  const rows = slide.spans.length;
  return (
    <>
      <In i={0}>
        <Head t={slide.title} />
      </In>
      <div className={s.middle}>
        <In i={1} className={`${s.glass} ${s.chart}`} style={{ aspectRatio: `342 / ${200 + rows * 38}` }}>
          <svg viewBox={`0 0 342 ${200 + rows * 38}`} aria-hidden>
            {slide.band && (
              <>
                <rect x={X(slide.band.x0) - 6} y={12} width={(slide.band.x1 - slide.band.x0) * W + 12} height={160 + rows * 38} rx={4} className={s.bandSoft} />
                <text x={X((slide.band.x0 + slide.band.x1) / 2)} y={24} textAnchor="middle" className={s.bandLabelSoft}>
                  {slide.band.label}
                </text>
              </>
            )}
            <text x={16} y={24} className={s.axisText}>
              {slide.metric}
            </text>
            <path d={slide.line.map((p, k) => `${k ? "L" : "M"}${X(p.x).toFixed(1)} ${Y(p.value).toFixed(1)}`).join("")} className={s.line} pathLength={1} />
            {[slide.from, slide.to].map((p, k) => (
              <g key={k} className={s.markIn} style={{ "--k": k } as CSSProperties}>
                <circle cx={X(p.x)} cy={Y(p.value)} r={5} className={s.sandDot} />
                <text x={X(p.x) + (k ? -10 : 12)} y={Y(p.value) + (k ? -14 : 12)} textAnchor={k ? "end" : "start"} className={s.dotLabel}>
                  {p.value}
                </text>
              </g>
            ))}
            {slide.spans.map((sp, k) => {
              const y = 186 + k * 38;
              return (
                <g key={sp.label}>
                  <text x={X(sp.x0)} y={y} className={s.spanText}>
                    {sp.label}
                  </text>
                  {sp.stopped && (
                    <text x={X(sp.x1) + 6} y={y} className={s.spanStop}>
                      Stopped
                    </text>
                  )}
                  <rect x={X(sp.x0)} y={y + 8} width={Math.max(6, (sp.x1 - sp.x0) * W)} height={8} rx={4} className={s.spanBar} data-tone={sp.tone} style={{ "--k": k } as CSSProperties} />
                </g>
              );
            })}
            {slide.axis.map((a) => (
              <text key={a.label} x={X(a.x)} y={186 + rows * 38} textAnchor={a.x === 0 ? "start" : "end"} className={s.axisText}>
                {a.label}
              </text>
            ))}
          </svg>
        </In>
        <In i={2}>
          <Stats stats={slide.stats} tiles />
        </In>
      </div>
      <In i={3} className={s.body}>
        {slide.body}
      </In>
    </>
  );
}

function Nights({ slide }: { slide: Extract<Slide, { kind: "nights" }> }) {
  const W = 290;
  const X = (x: number) => 40 + x * (W - 8);
  const Yh = (h: number) => 200 - (h / 10) * 170;
  const vals = slide.line.map((p) => p.value);
  const lo = Math.min(...vals) - 4;
  const hi = Math.max(...vals) + 4;
  const Yo = (v: number) => 236 + (48 - ((v - lo) / (hi - lo)) * 48);
  const lastRecent = slide.recent[slide.recent.length - 1];
  return (
    <>
      <In i={0} className={`${s.glass} ${s.chart}`} style={{ aspectRatio: "342 / 330" }}>
        <svg viewBox="0 0 342 330" aria-hidden>
          {[3, 6, 9].map((g) => (
            <g key={g}>
              <line x1={40} x2={330} y1={Yh(g)} y2={Yh(g)} className={s.grid} />
              <text x={10} y={Yh(g)} dominantBaseline="central" className={s.axisText}>
                {g} h
              </text>
            </g>
          ))}
          {slide.bars.map((b, k) => (
            <rect key={k} x={X(b.x) - 3.5} y={Yh(b.hours)} width={7} height={200 - Yh(b.hours)} rx={2} className={s.sbar} data-recent={b.recent} style={{ "--k": k } as CSSProperties} />
          ))}
          <line x1={40} x2={330} y1={Yh(slide.before)} y2={Yh(slide.before)} className={s.dash} />
          <text x={330} y={Yh(slide.before) - 9} textAnchor="end" className={s.dashLabel}>
            {slide.before} h
          </text>
          <line x1={16} x2={326} y1={214} y2={214} className={s.divider} />
          <text x={16} y={228} className={s.axisText}>
            {slide.metric}
          </text>
          <path d={slide.line.map((p, k) => `${k ? "L" : "M"}${X(p.x).toFixed(1)} ${Yo(p.value).toFixed(1)}`).join("")} className={s.thinLine} pathLength={1} />
          {slide.recent.map((p, k) => (
            <circle key={k} cx={X(p.x)} cy={Yo(p.value)} r={4} className={s.goldDot} style={{ "--k": k } as CSSProperties} />
          ))}
          {lastRecent && (
            <text x={X(lastRecent.x)} y={Yo(lastRecent.value) + 18} textAnchor="end" className={s.goldLabel}>
              {lastRecent.value}
            </text>
          )}
          {slide.axis.map((a) => (
            <text key={a.label} x={X(a.x)} y={318} textAnchor={a.x === 0 ? "start" : a.x === 1 ? "end" : "middle"} className={s.axisText}>
              {a.label}
            </text>
          ))}
        </svg>
      </In>
      <div className={s.middle}>
        <In i={1}>
          <Head t={slide.title} />
        </In>
        <In i={2}>
          <Stats stats={slide.stats} tiles />
        </In>
      </div>
      <In i={3} className={s.body}>
        {slide.body}
      </In>
    </>
  );
}

function Scope({ slide }: { slide: Extract<Slide, { kind: "scope" }> }) {
  const { d } = useReportApi();
  const [light, setLight] = useState<Light>("polarized");
  const label = LIGHTS.find((l) => l.key === light)!.label;
  return (
    <>
      <In i={0}>
        <Head t={slide.title} />
      </In>
      <div className={s.middle}>
        <In i={1} className={`${s.glass} ${s.scope}`}>
          <span className={s.scopePhoto}>
            {LIGHTS.map((l) => (
              <Photo key={l.key} scan={slide.scan} light={l.key} on={l.key === light} alt={l.key === light ? `${slide.scan.area}, ${l.label.toLowerCase()} light` : ""} />
            ))}
          </span>
          <span className={s.caption}>
            {label} · {fmtDay(slide.scan.takenAt, scanTz(slide.scan) ?? d.tz)}
          </span>
        </In>
        <In i={2} className={s.lightRow}>
          {LIGHTS.map((l) => (
            <button key={l.key} className={s.glass} aria-pressed={l.key === light} onClick={() => setLight(l.key)}>
              <Photo scan={slide.scan} light={l.key} alt="" />
              <span>{l.label}</span>
            </button>
          ))}
        </In>
      </div>
      <In i={3} className={s.body}>
        {slide.body}
      </In>
    </>
  );
}

function Tip({ slide }: { slide: Extract<Slide, { kind: "tip" }> }) {
  return (
    <>
      <In i={0}>
        <Head t={slide.title} />
      </In>
      <In i={1}>
        <Stats stats={slide.stats} />
      </In>
      <div className={s.middle}>
        <In i={2} className={`${s.glass} ${s.tipCard}`}>
          <svg viewBox="0 0 200 170" className={s.jar} aria-hidden>
            <g className={s.jarBody}>
              <rect x="20" y="52" width="151" height="113" rx="18" className={s.jarGlass} />
              <rect x="16" y="20" width="158" height="51" rx="10" className={s.jarLid} />
              {slide.chips[0] && (
                <text x="95" y="118" textAnchor="middle" className={s.jarText}>
                  {slide.chips[0].toUpperCase()}
                </text>
              )}
            </g>
            <path className={s.drop} d="M168 2c0 0 26 30 26 46a26 26 0 01-52 0c0-16 26-46 26-46z" />
          </svg>
          {slide.chips.length > 0 && (
            <div className={s.chips}>
              {slide.chips.map((c, k) => (
                <span key={c} style={{ "--k": k } as CSSProperties}>
                  {c}
                </span>
              ))}
            </div>
          )}
        </In>
      </div>
      <In i={3} className={s.body}>
        {slide.tip}
        <small>AI-generated · not medical advice</small>
      </In>
    </>
  );
}
