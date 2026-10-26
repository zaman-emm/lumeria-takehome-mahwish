"use client";

import { useState, type CSSProperties } from "react";
import { daysBetween, fmtDay, metricMeta, type Derived } from "@/lib/insights";
import { BUDGET_TIER, dailySeries, factorFor, swapsFor, trial } from "@/lib/routine";
import type { Product } from "@/lib/types";
import { useReportApi } from "./context";
import { DayCurve, type CurvePoint } from "./DayCurve";
import { useReveal, useWidth, type RevealState } from "./hooks";
import { Icon } from "./Icon";
import { Chip, FromTo, ScheduleChip } from "./ui";
import p from "./products.module.css";

// The routine, one card per product: the score it lined up with (was › now),
// that score as a curve across the period with the product's days on a band,
// then what it is, when it's used, how a trial is going, and gentler swaps
// when one was stopped for irritation.

export function ProductsTab() {
  const { d } = useReportApi();
  const products = [...(d.report.products ?? [])].sort((a, b) =>
    !a.endDate === !b.endDate ? b.startDate.localeCompare(a.startDate) : a.endDate ? 1 : -1,
  );
  if (!products.length) {
    return (
      <div className={p.empty}>
        <span className={p.emptyIcon}>
          <Icon name="bottle" size={22} />
        </span>
        <h2>No products yet</h2>
      </div>
    );
  }
  return (
    <div className={p.list}>
      {products.map((prod) => (
        <ProductCard key={prod.id} d={d} product={prod} />
      ))}
    </div>
  );
}

function ProductCard({ d, product }: { d: Derived; product: Product }) {
  const [open, setOpen] = useState(true);
  const [ref, reveal] = useReveal<HTMLElement>(`product-${product.id}`);
  const f = factorFor(d, product);
  const tone = f ? f.direction : "neutral";
  const tr = trial(d, product);
  const swaps = swapsFor(product);
  const id = `product-${product.id}`;

  return (
    <article ref={ref} className={p.card} data-open={open} aria-labelledby={`${id}-name`}>
      <button className={p.head} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={`${id}-more`}>
        <span className={p.icon} data-tone={tone}>
          <Icon name="bottle" size={18} />
        </span>
        <span className={p.headText}>
          <span className={p.name} id={`${id}-name`}>
            {product.name}
          </span>
        </span>
        {f && (
          <span className={p.metric} aria-label={`${metricMeta(f.change.key).label} ${f.change.from} to ${f.change.to}`}>
            <FromTo from={f.change.from} to={f.change.to} />
          </span>
        )}
        <Icon name="chevronD" size={14} stroke={1.6} className={p.chevron} />
      </button>
      <ProductCurve d={d} product={product} reveal={reveal} />

      <div className={p.more} id={`${id}-more`} inert={!open}>
        <div className={p.moreInner}>
          <div className={p.chips}>
            <Chip>{product.category}</Chip>
            {product.keyIngredients.map((k) => (
              <Chip key={k} kind="line" icon={<Icon name="drop" size={11} />}>
                {k}
              </Chip>
            ))}
            <ScheduleChip product={product} />
          </div>
          {tr && (
            <div className={p.trial}>
              <span className={p.trialHead}>
                <span>2-week trial</span>
                <b>
                  {tr.day} of {tr.of}
                </b>
              </span>
              <span className={p.trialBar} data-reveal={reveal} role="progressbar" aria-valuemin={0} aria-valuemax={tr.of} aria-valuenow={tr.day} aria-label="Trial progress">
                {Array.from({ length: tr.of }, (_, i) => (
                  <i key={i} data-on={i < tr.day} style={{ "--i": i } as CSSProperties} />
                ))}
              </span>
            </div>
          )}
          {product.stoppedReason && (
            <p className={p.stopped}>
              <Icon name="stop" size={13} />
              {product.stoppedReason}
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
                    {s.tier === BUDGET_TIER && <span className="sr-only">, in your price range</span>}
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

/**
 * The score the product lined up with, day by day across the period, with the
 * product's own days on a band and the dots at "was" and "now". On a product
 * that got worse, a trip shows as a band too, since it may share the blame.
 */
function ProductCurve({ d, product, reveal }: { d: Derived; product: Product; reveal: RevealState }) {
  const f = factorFor(d, product);
  const key = f?.change.key ?? "overall";
  const series = dailySeries(d, key);
  const span = d.spans.find((s) => s.id === product.id);
  const trips = f?.direction === "held" ? d.spans.filter((s) => s.kind === "travel") : [];
  const n = series.length;
  const idx = (day: string) => Math.max(0, Math.min(n - 1, daysBetween(d.start, day)));
  const points: CurvePoint[] = series.flatMap((v, i) => (v.value == null ? [] : [{ i, value: v.value, label: fmtDay(v.day) }]));
  const band = span && f ? { id: span.id, from: idx(span.start), to: idx(span.end) } : undefined;
  const before = band ? points.filter((pt) => pt.i < band.from) : [];
  const during = band ? points.filter((pt) => pt.i >= band.from && pt.i <= band.to) : [];
  const marks = band ? { from: (before[before.length - 1] ?? points[0])?.i, to: during[during.length - 1]?.i } : undefined;
  const start = span && span.start > d.start ? span.start : d.start;
  const [labels, w] = useWidth<HTMLDivElement>();

  // Dates sit under their day, nudged right so they never overlap. Widths are
  // estimated from the text (12px Montserrat runs about 6.6px a character).
  const wanted = [
    { id: "start", stop: false, text: fmtDay(start), at: idx(start) / Math.max(1, n - 1), width: fmtDay(start).length * 6.6, centre: start !== d.start },
    ...(span && !span.ongoing ? [{ id: "stop", stop: true, text: fmtDay(span.end), at: idx(span.end) / Math.max(1, n - 1), width: 14 + fmtDay(span.end).length * 6.6, centre: true }] : []),
  ];
  const placed: { id: string; stop: boolean; text: string; x: number }[] = [];
  let edge = -Infinity;
  for (const l of wanted) {
    let x = l.at * w - (l.centre ? l.width / 2 : 0);
    x = Math.max(0, Math.min(w - l.width, Math.max(x, edge + 6)));
    placed.push({ id: l.id, stop: l.stop, text: l.text, x });
    edge = x + l.width;
  }

  if (points.length < 2) return null;
  return (
    <div className={p.days}>
      <DayCurve
        days={n}
        points={points}
        band={band}
        trips={trips.map((t) => ({ id: t.id, from: idx(t.start), to: idx(t.end) }))}
        marks={marks}
        tone={f?.direction ?? "neutral"}
        reveal={reveal}
        label={`${metricMeta(key).label}, day by day from ${fmtDay(d.start)} to ${fmtDay(d.end)}${
          span ? `, using it ${span.ongoing ? `since ${fmtDay(span.start)}` : `${fmtDay(span.start)} to ${fmtDay(span.end)}`}` : ""
        }${trips.length ? `, with your ${trips.map((t) => t.short).join(" and ")} trip marked` : ""}`}
      />
      <div className={p.dayLabels} ref={labels} aria-hidden>
        {placed.map((l) => (
          <span key={l.id} className={l.stop ? p.stopTag : undefined} style={{ transform: `translateX(${l.x}px)` }}>
            {l.stop && <Icon name="stop" size={11} />}
            {l.text}
          </span>
        ))}
      </div>
    </div>
  );
}
