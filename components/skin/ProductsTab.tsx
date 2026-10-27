"use client";

import { useId, useState, type ReactNode } from "react";
import { addDays, dayOf, daysBetween, fmtDay, fmtRange, metricMeta, score, type Derived, type ScoreKey } from "@/lib/insights";
import { BUDGET_TIER, factorFor, swapsFor } from "@/lib/routine";
import type { Product } from "@/lib/types";
import { useReportApi } from "./context";
import { useWidth } from "./hooks";
import { Icon, type IconName } from "./Icon";
import p from "./products.module.css";

// The routine, one card per product, answering one question: is it working?
// Pick the spot; the score the product lined up with reads was → now, then
// the scans across its stretch, dashed before she started it and solid after,
// with any trip that overlapped it shaded. After the newest product, what else
// changed around when she started it, and what it is.

/** Gentler swaps: future scope, hidden for now. */
const SHOW_SWAPS = false;

/** How many days before a product starts its chart reaches back. */
const LEAD_DAYS = 2;

/** What an ingredient is, in one line, from a source she can check. Only ones we can cite. */
const ABOUT: Record<string, { text: string; source: string; href: string }> = {
  "azelaic acid": {
    text: "Helps remove dead skin and reduce bacteria.",
    source: "NHS",
    href: "https://www.nhs.uk/medicines/azelaic-acid/",
  },
  retinol: {
    text: "Speeds up how fast new skin cells are made and helps unclog pores.",
    source: "Cleveland Clinic",
    href: "https://my.clevelandclinic.org/health/treatments/23293-Retinol",
  },
  ceramides: {
    text: "Fats that hold skin cells together as a barrier that keeps moisture in.",
    source: "Cleveland Clinic",
    href: "https://health.clevelandclinic.org/ceramides",
  },
};

/** A product's first key ingredient we can say something about. */
function aboutFor(prod: Product) {
  const name = prod.keyIngredients.find((k) => ABOUT[k.toLowerCase()]);
  return name ? { name, ...ABOUT[name.toLowerCase()] } : null;
}

export function ProductsTab() {
  const { d } = useReportApi();
  const products = [...(d.report.products ?? [])].sort((a, b) => b.startDate.localeCompare(a.startDate));
  if (!products.length) {
    return (
      <div className={p.empty}>
        <span className={p.emptyIcon}>
          <Icon name="bottle" size={22} />
        </span>
        <h2>Add what you use and see how your skin takes to it.</h2>
      </div>
    );
  }
  const factors = otherFactors(d);

  return (
    <div className={p.list}>
      {products.map((prod) => {
        // Each product gets one line on its key ingredient, where we can cite one.
        const about = aboutFor(prod);
        return (
          <div key={prod.id} className={p.group}>
            <ProductCard d={d} product={prod} />
            {about && (
              <Fold title={`About ${about.name.toLowerCase()}`}>
                <p className={p.about}>{about.text}</p>
                <a className={p.source} href={about.href} target="_blank" rel="noreferrer">
                  {about.source}
                  <Icon name="arrowUR" size={12} stroke={1.6} />
                </a>
              </Fold>
            )}
          </div>
        );
      })}

      {/* After the products: what else was going on that month that the cards don't cover. */}
      {factors.length > 0 && (
        <Fold title="Other factors">
          <ul className={p.changes}>
            {factors.map((c) => (
              <li key={`${c.start}-${c.text}`}>
                <Icon name={c.icon} size={14} />
                <span className={p.changeDay}>{fmtRange(c.start, c.end)}</span>
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
        </Fold>
      )}

      <footer className={p.foot}>
        <p className={p.disclaimer}>
          Lumeria reads how your skin looks, not what’s going on underneath. If something worries you, a dermatologist is the right next
          step.
        </p>
      </footer>
    </div>
  );
}

/** Everything in the month that isn't a product (the cards cover those): trips and periods, in date order. */
function otherFactors(d: Derived) {
  const out: { start: string; end: string; icon: IconName; text: string }[] = [
    ...d.spans.filter((s) => s.kind === "travel").map((s) => ({ start: s.start, end: s.end, icon: "plane" as IconName, text: `${s.short} trip` })),
    ...d.moments.map((m) => ({ start: m.day, end: m.end, icon: "drop" as IconName, text: m.label })),
  ];
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

/** A card with a title that folds its body away. */
function Fold({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <section className={p.fold} data-open={open}>
      <button className={p.foldHead} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={id}>
        <h3>{title}</h3>
        <Icon name="chevronD" size={14} stroke={1.8} className={p.chev} />
      </button>
      <div className={p.foldBody} id={id} inert={!open}>
        <div className={p.foldInner}>{children}</div>
      </div>
    </section>
  );
}

function ProductCard({ d, product }: { d: Derived; product: Product }) {
  const f = factorFor(d, product);
  const key: ScoreKey = f?.change.key ?? "overall";
  const [area, setArea] = useState(d.area);
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  const swaps = SHOW_SWAPS ? swapsFor(product) : [];

  // The stretch the chart covers: a couple of days before she started it, to
  // the day she stopped (or now).
  const from = maxDay(d.start, addDays(product.startDate, -LEAD_DAYS));
  const to = product.endDate ?? d.end;
  const pts = seriesFor(d, area, key, from, to);
  // How many scans of the spot fall in the stretch.
  const count = d.scans.filter((s) => s.area === area && dayOf(d, s) >= from && dayOf(d, s) <= to).length;
  const before = pts.filter((x) => x.day < product.startDate);
  const during = pts.filter((x) => x.day >= product.startDate);
  const was = before[before.length - 1] ?? during[0];
  const now = during[during.length - 1];
  const delta = was && now && was !== now ? now.value - was.value : null;
  const tone = delta == null || Math.abs(delta) < 3 ? "flat" : delta > 0 ? "up" : "down";
  // The bottle's tint belongs to the product, not the spot: read it from her
  // main spot, so switching spots never recolours the header.
  const mainPts = seriesFor(d, d.area, key, from, to);
  const mainWas = mainPts.filter((x) => x.day < product.startDate).at(-1) ?? mainPts.find((x) => x.day >= product.startDate);
  const mainNow = mainPts.filter((x) => x.day >= product.startDate).at(-1);
  const mainDelta = mainWas && mainNow && mainWas !== mainNow ? mainNow.value - mainWas.value : 0;
  const iconTone = Math.abs(mainDelta) < 3 ? "flat" : mainDelta > 0 ? "up" : "down";

  const trips = d.spans.filter((s) => s.kind === "travel" && s.start <= to && s.end >= product.startDate);
  const reason = product.stoppedReason?.split(/ and |,/)[0].trim();

  return (
    <article className={p.card} data-tone={tone} aria-labelledby={`${bodyId}-name`}>
      <header className={p.head}>
        <span className={p.icon} data-tone={iconTone} aria-hidden>
          <Icon name="bottle" size={18} />
        </span>
        <div className={p.title}>
          <h2 id={`${bodyId}-name`}>{product.name}</h2>
          {product.endDate && (
            <p className={p.stopped}>
              Stopped {fmtDay(product.endDate)}
              {reason && ` · ${reason}`}
            </p>
          )}
          {product.endDate &&
            trips.map((t) => (
              <p key={t.id} className={p.overlap}>
                <Icon name="plane" size={12} />
                {t.short} overlap
              </p>
            ))}
          {/* Folded, the card keeps its overview: the score, was → now, the change. */}
          {!open && was && now && delta != null && (
            <p className={p.summary}>
              {metricMeta(key).label}
              <span>
                {was.value} → {now.value}
              </span>
              <b className={p.delta}>{delta > 0 ? `+${delta}` : delta < 0 ? `−${-delta}` : "±0"}</b>
            </p>
          )}
        </div>
        <button className={p.toggle} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={bodyId} aria-label={open ? `Collapse ${product.name}` : `Expand ${product.name}`}>
          <Icon name="chevronD" size={14} stroke={1.8} />
        </button>
      </header>

      <div className={p.body} id={bodyId} data-open={open} inert={!open}>
        <div className={p.bodyInner}>
          <div className={p.controls}>
            {d.areas.length > 1 ? (
              <label className={p.spot}>
                <span className="sr-only">Spot</span>
                <select value={area} onChange={(e) => setArea(e.target.value)}>
                  {d.areas.map((a) => (
                    <option key={a.area} value={a.area}>
                      {a.area}
                    </option>
                  ))}
                </select>
                <Icon name="chevronD" size={12} stroke={1.8} />
              </label>
            ) : (
              <span className={p.spotStatic}>{area}</span>
            )}
            {/* How many scans of this spot fall in the stretch, as a side note. */}
            <span className={p.count}>
              {count} {count === 1 ? "scan" : "scans"}
            </span>
            <span className={p.range}>
              {fmtDay(from)} – {fmtDay(to)}
            </span>
          </div>

          <p className={p.metric}>{metricMeta(key).label}</p>
          {/* The same rows for every spot; a spot with too few scans fills them
              with blanks instead of dropping them, so the card keeps its shape. */}
          {was && now && delta != null ? (
            <p className={p.fromTo} aria-label={`${metricMeta(key).label} ${was.value} to ${now.value}`}>
              <span>{was.value}</span>
              <span className={p.arrow} aria-hidden>
                →
              </span>
              <span>{now.value}</span>
              <b className={p.delta}>{delta > 0 ? `+${delta}` : delta < 0 ? `−${-delta}` : "±0"}</b>
            </p>
          ) : (
            <p className={p.fromTo} data-empty aria-label="No change to show yet">
              <span>–</span>
              <span className={p.arrow} aria-hidden>
                →
              </span>
              <span>–</span>
            </p>
          )}

          <Chart
            pts={pts}
            from={from}
            to={to}
            start={product.startDate}
            trips={trips}
            empty={
              delta == null
                ? count === 0
                  ? `No ${area.toLowerCase()} scans in this stretch`
                  : during.length === 0
                    ? `No ${area.toLowerCase()} scans since ${fmtDay(product.startDate)}`
                    : `Only ${count} ${area.toLowerCase()} ${count === 1 ? "scan" : "scans"} in this stretch`
                : undefined
            }
          />

          <p className={p.verdict}>
            <Icon name={tone === "down" ? "down" : tone === "up" ? "up" : "chevronR"} size={14} stroke={1.8} />
            {delta == null ? "Not enough scans to tell yet" : tone === "up" ? "Improved during use" : tone === "down" ? "Declined during use" : "Held steady during use"}
          </p>

          {swaps.length > 0 && (
            <div className={p.swaps}>
              <h3>Gentler swaps</h3>
              <ul>
                {swaps.map((s) => (
                  <li key={s.tier} data-match={s.tier === BUDGET_TIER}>
                    <b>{s.tier}</b>
                    <span>{s.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

const maxDay = (a: string, b: string) => (a > b ? a : b);

/** One score for one spot, a value per day it was scanned (averaged if twice). */
function seriesFor(d: Derived, area: string, key: ScoreKey, from: string, to: string) {
  const byDay = new Map<string, number[]>();
  for (const s of d.scans) {
    if (s.area !== area) continue;
    const v = score(s, key);
    const day = dayOf(d, s);
    if (v == null || day < from || day > to) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), v]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, vs]) => ({ day, value: Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) }));
}

const H = 120;
const TOP = 18;
const BOTTOM = 6;
const LEFT = 26;
const RIGHT = 8;

/**
 * The scans across the product's stretch: dashed before she started it, solid
 * from the day she did (marked with a dashed rule and its date), each scan's
 * value over its dot where there's room, and any trip shaded behind.
 */
function Chart({
  pts,
  from,
  to,
  start,
  trips,
  empty,
}: {
  pts: { day: string; value: number }[];
  from: string;
  to: string;
  start: string;
  trips: Derived["spans"];
  /** Said over the chart when the spot has too few scans to read. */
  empty?: string;
}) {
  const [box, w] = useWidth<HTMLDivElement>();
  const n = Math.max(1, daysBetween(from, to));
  const x = (day: string) => LEFT + (Math.max(0, Math.min(n, daysBetween(from, day))) / n) * (w - LEFT - RIGHT);
  // With no scans, a plain 40–80 frame holds the space.
  const values = pts.length ? pts.map((q) => q.value) : [44, 76];
  const lo = Math.floor((Math.min(...values) - 4) / 10) * 10;
  const hi = Math.ceil((Math.max(...values) + 4) / 10) * 10;
  const grid = [hi, (hi + lo) / 2, lo];
  const y = (v: number) => TOP + (1 - (v - lo) / (hi - lo || 1)) * (H - TOP - BOTTOM);
  const xy = pts.map((q) => [x(q.day), y(q.value)] as const);
  const firstDuring = pts.findIndex((q) => q.day >= start);
  const path = (list: (readonly [number, number])[]) => list.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join("");
  // The dashed line stops on the start date: where it crosses the start rule
  // is read off the line between the last scan before and the first after.
  let dashed = "";
  let solid = "";
  if (firstDuring === -1) dashed = path(xy);
  else if (firstDuring === 0) solid = path(xy);
  else {
    const [ax, ay] = xy[firstDuring - 1];
    const [bx, by] = xy[firstDuring];
    const sx = x(start);
    const cross = [sx, ay + ((by - ay) * (sx - ax)) / (bx - ax || 1)] as const;
    dashed = path([...xy.slice(0, firstDuring), cross]);
    solid = path([cross, ...xy.slice(firstDuring)]);
  }
  const showStart = start > from;

  // Labels where they fit: never closer than 20px to the last one shown.
  let lastX = -Infinity;
  const labelled = xy.map(([px], i) => {
    const show = i === xy.length - 1 || px - lastX >= 20;
    if (show) lastX = px;
    return show;
  });

  return (
    <div className={p.chart} ref={box} data-empty={empty ? true : undefined}>
      {w > 0 && (
        <svg width={w} height={H} aria-hidden>
          {trips.map((t) => (
            <rect
              key={t.id}
              x={x(maxDay(t.start, from))}
              y={TOP - 6}
              width={Math.max(6, x(t.end < to ? t.end : to) - x(maxDay(t.start, from)))}
              height={H - TOP - BOTTOM + 6}
              className={p.trip}
            />
          ))}
          {grid.map((g) => (
            <g key={g}>
              <line x1={LEFT} x2={w - RIGHT} y1={y(g)} y2={y(g)} className={p.grid} />
              <text x={0} y={y(g)} dominantBaseline="central" className={p.gridLabel}>
                {Math.round(g)}
              </text>
            </g>
          ))}
          {showStart && <line x1={x(start)} x2={x(start)} y1={TOP - 6} y2={H - BOTTOM} className={p.startRule} />}
          {dashed && <path d={dashed} className={p.lineBefore} />}
          {solid && <path d={solid} className={p.line} />}
          {xy.map(([px, py], i) => (
            <g key={pts[i].day}>
              <circle cx={px} cy={py} r={i === xy.length - 1 ? 3.5 : 2.5} className={p.dot} />
              {labelled[i] && (
                <text x={px} y={py - 8} textAnchor="middle" className={p.valueLabel}>
                  {pts[i].value}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
      {w > 0 && showStart && (
        <span className={p.startTag} style={{ left: x(start) }} aria-hidden>
          {fmtDay(start)}
        </span>
      )}
      {w > 0 &&
        trips.map((t) => (
          <span key={t.id} className={p.tripTag} style={{ left: (x(maxDay(t.start, from)) + x(t.end < to ? t.end : to)) / 2 }} aria-hidden>
            <Icon name="plane" size={11} />
          </span>
        ))}
      {empty && (
        <p className={p.chartEmpty} style={{ height: H }}>
          <span>{empty}</span>
        </p>
      )}
      <div className={p.axis} aria-hidden>
        <span>{fmtDay(from)}</span>
        <span>{fmtDay(to)}</span>
      </div>
      <p className="sr-only">
        {pts.map((q) => `${fmtDay(q.day)}: ${q.value}`).join(", ")}
        {trips.map((t) => `. ${t.label}, ${fmtRange(t.start, t.end)}`).join("")}
      </p>
    </div>
  );
}
