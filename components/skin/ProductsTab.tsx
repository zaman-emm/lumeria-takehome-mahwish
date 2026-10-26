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

/** How many days before a product starts its chart and "other changes" reach back. */
const LEAD_DAYS = 2;
const CONTEXT_DAYS = 7;

/** What an ingredient is, from a source she can check. Only ones we can cite. */
const ABOUT: Record<string, { text: string; source: string; href: string }> = {
  "azelaic acid": {
    text: "Helps remove dead skin and reduce bacteria.",
    source: "NHS",
    href: "https://www.nhs.uk/medicines/azelaic-acid/",
  },
};

export function ProductsTab() {
  const { d } = useReportApi();
  const products = [...(d.report.products ?? [])].sort((a, b) => b.startDate.localeCompare(a.startDate));
  if (!products.length) {
    return (
      <div className={p.empty}>
        <span className={p.emptyIcon}>
          <Icon name="bottle" size={22} />
        </span>
        <h2>Tell me what you use and I’ll watch how your skin takes it.</h2>
      </div>
    );
  }
  // The newest product still in use gets its context: what else changed, and what it is.
  const lead = products.find((x) => !x.endDate && x.startDate > d.start);
  const about = lead && lead.keyIngredients.map((k) => ABOUT[k.toLowerCase()]).find(Boolean);
  const changes = lead ? otherChanges(d, lead) : [];

  return (
    <div className={p.list}>
      {products.map((prod) => (
        <div key={prod.id} className={p.group}>
          <ProductCard d={d} product={prod} />
          {prod === lead && changes.length > 0 && (
            <Fold title="Other changes">
              <ul className={p.changes}>
                {changes.map((c) => (
                  <li key={`${c.day}-${c.text}`}>
                    <Icon name={c.icon} size={14} />
                    <span className={p.changeDay}>{fmtDay(c.day)}</span>
                    <span>{c.text}</span>
                  </li>
                ))}
              </ul>
            </Fold>
          )}
          {prod === lead && about && (
            <Fold title={`About ${shortName(d, prod).toLowerCase()}`}>
              <p className={p.about}>{about.text}</p>
              <a className={p.source} href={about.href} target="_blank" rel="noreferrer">
                {about.source}
                <Icon name="arrowUR" size={12} stroke={1.6} />
              </a>
            </Fold>
          )}
        </div>
      ))}

      <footer className={p.foot}>
        <ul className={p.cues} aria-label="For scans you can compare">
          <li className={p.cue}>
            <Icon name="target" size={18} />
            Same spot
          </li>
          <li className={p.cue}>
            <Icon name="clock" size={18} />
            Same time
          </li>
        </ul>
        <p className={p.disclaimer}>
          Lumeria reads how your skin looks, not what’s going on underneath. If something worries you, a dermatologist is the right next
          step.
        </p>
      </footer>
    </div>
  );
}

const shortName = (d: Derived, prod: Product) => d.spans.find((s) => s.id === prod.id)?.short ?? prod.name;

/** Trips and other products that started or ended from a week before this one began. */
function otherChanges(d: Derived, prod: Product) {
  const from = addDays(prod.startDate, -CONTEXT_DAYS);
  const to = prod.endDate ?? d.end;
  const within = (day: string) => day >= from && day <= to;
  const out: { day: string; icon: IconName; text: string }[] = [];
  for (const s of d.spans) {
    if (s.id === prod.id) continue;
    if (s.kind === "travel") {
      if (within(s.start) && s.start > d.start) out.push({ day: s.start, icon: "plane", text: `${s.short} trip started` });
      if (within(s.end)) out.push({ day: s.end, icon: "plane", text: `${s.short} trip ended` });
    } else {
      if (within(s.start) && s.start > d.start) out.push({ day: s.start, icon: "bottle", text: `${s.short} started` });
      if (!s.ongoing && within(s.end)) out.push({ day: s.end, icon: "stop", text: `${s.short} stopped` });
    }
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
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
  const before = pts.filter((x) => x.day < product.startDate);
  const during = pts.filter((x) => x.day >= product.startDate);
  const was = before[before.length - 1] ?? during[0];
  const now = during[during.length - 1];
  const delta = was && now && was !== now ? now.value - was.value : null;
  const tone = delta == null || Math.abs(delta) < 3 ? "flat" : delta > 0 ? "up" : "down";

  const trips = d.spans.filter((s) => s.kind === "travel" && s.start <= to && s.end >= product.startDate);
  const reason = product.stoppedReason?.split(/ and |,/)[0].trim();

  return (
    <article className={p.card} data-tone={tone} aria-labelledby={`${bodyId}-name`}>
      <header className={p.head}>
        <span className={p.icon} aria-hidden>
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
            <span className={p.range}>
              {fmtDay(from)} – {fmtDay(to)}
            </span>
          </div>

          <p className={p.metric}>{metricMeta(key).label}</p>
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
            <p className={p.thin}>Not enough scans of your {area.toLowerCase()} in this stretch yet.</p>
          )}

          {during.length > 0 && pts.length >= 2 && <Chart pts={pts} from={from} to={to} start={product.startDate} trips={trips} />}

          {delta != null && (
            <p className={p.verdict}>
              <Icon name={tone === "down" ? "down" : tone === "up" ? "up" : "chevronR"} size={14} stroke={1.8} />
              {tone === "up" ? "Improved during use" : tone === "down" ? "Declined during use" : "Held steady during use"}
            </p>
          )}

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
}: {
  pts: { day: string; value: number }[];
  from: string;
  to: string;
  start: string;
  trips: Derived["spans"];
}) {
  const [box, w] = useWidth<HTMLDivElement>();
  const n = Math.max(1, daysBetween(from, to));
  const x = (day: string) => LEFT + (Math.max(0, Math.min(n, daysBetween(from, day))) / n) * (w - LEFT - RIGHT);
  const values = pts.map((q) => q.value);
  const lo = Math.floor((Math.min(...values) - 4) / 10) * 10;
  const hi = Math.ceil((Math.max(...values) + 4) / 10) * 10;
  const grid = [hi, (hi + lo) / 2, lo];
  const y = (v: number) => TOP + (1 - (v - lo) / (hi - lo || 1)) * (H - TOP - BOTTOM);
  const xy = pts.map((q) => [x(q.day), y(q.value)] as const);
  const firstDuring = pts.findIndex((q) => q.day >= start);
  const path = (list: (readonly [number, number])[]) => list.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join("");
  const dashed = firstDuring > 0 ? path(xy.slice(0, firstDuring + 1)) : "";
  const solid = path(firstDuring >= 0 ? xy.slice(firstDuring) : []);
  const showStart = start > from;

  // Labels where they fit: never closer than 20px to the last one shown.
  let lastX = -Infinity;
  const labelled = xy.map(([px], i) => {
    const show = i === xy.length - 1 || px - lastX >= 20;
    if (show) lastX = px;
    return show;
  });

  return (
    <div className={p.chart} ref={box}>
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
