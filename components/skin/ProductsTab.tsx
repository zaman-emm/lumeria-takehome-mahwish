"use client";

import { useState, type CSSProperties } from "react";
import { daysBetween, fmtDay, metricMeta, type Derived, type Span } from "@/lib/insights";
import { BUDGET_TIER, dailySeries, factorFor, swapsFor, trial } from "@/lib/routine";
import type { Product } from "@/lib/types";
import { useReportApi } from "./context";
import { useReveal, useWidth } from "./hooks";
import { Icon } from "./Icon";
import { Chip, FromTo, RangeBar, ScheduleChip } from "./ui";
import p from "./products.module.css";

// The routine, one card per product: the score it lined up with (old dot,
// new dot), that score day by day with the product's days lit, then what it
// is, when it's used, how a trial is going, and gentler swaps when one was
// stopped for irritation.

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
          {f && (
            <span className={p.metric}>
              <span>{metricMeta(f.change.key).label}</span>
              <FromTo from={f.change.from} to={f.change.to} />
            </span>
          )}
        </span>
        <Icon name="chevronD" size={14} stroke={1.6} className={p.chevron} />
      </button>
      {f && (
        <div className={p.rangeWrap}>
          <RangeBar from={f.change.from} to={f.change.to} tone={f.direction} reveal={reveal} />
        </div>
      )}

      <div className={p.more} id={`${id}-more`} inert={!open}>
        <div className={p.moreInner}>
          <DayBars d={d} product={product} reveal={reveal} />
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
              <span className={p.trialBar} role="progressbar" aria-valuemin={0} aria-valuemax={tr.of} aria-valuenow={tr.day} aria-label="Trial progress">
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
 * The product's score for every day of the period: one bar a day, a stub on
 * days without a scan. The product's own days carry its colour; a trip shows
 * as a band behind.
 */
function DayBars({ d, product, reveal }: { d: Derived; product: Product; reveal: string }) {
  const f = factorFor(d, product);
  const key = f?.change.key ?? "overall";
  const series = dailySeries(d, key);
  const span = d.spans.find((s) => s.id === product.id);
  const trips = d.spans.filter((s) => s.kind === "travel");
  const n = series.length;
  const xOf = (day: string) => `${(Math.max(0, Math.min(n - 1, daysBetween(d.start, day))) / Math.max(1, n - 1)) * 100}%`;
  const inSpan = (day: string, s?: Span) => Boolean(s && day >= s.start && day <= s.end);
  const tone = f?.direction ?? "helped";
  const start = span && span.start > d.start ? span.start : d.start;
  const [labels, w] = useWidth<HTMLDivElement>();

  // Labels sit under their day, nudged right so none overlap. Widths are
  // estimated from the text (12px Montserrat runs about 6.6px a character).
  const frac = (day: string) => Math.max(0, Math.min(n - 1, daysBetween(d.start, day))) / Math.max(1, n - 1);
  const wanted = [
    { id: "start", kind: "start", text: fmtDay(start), at: frac(start), width: fmtDay(start).length * 6.6, centre: start !== d.start },
    ...trips.map((t) => ({ id: t.id, kind: "trip", text: "", at: frac(t.start), width: 20, centre: true })),
    ...(span && !span.ongoing ? [{ id: "stop", kind: "stop", text: fmtDay(span.end), at: frac(span.end), width: 14 + fmtDay(span.end).length * 6.6, centre: true }] : []),
  ].sort((a, b) => a.at - b.at);
  const placed: { id: string; kind: string; text: string; x: number }[] = [];
  let edge = -Infinity;
  for (const l of wanted) {
    let x = l.at * w - (l.centre ? l.width / 2 : 0);
    x = Math.max(0, Math.min(w - l.width, Math.max(x, edge + 6)));
    placed.push({ id: l.id, kind: l.kind, text: l.text, x });
    edge = x + l.width;
  }

  return (
    <div className={p.days} data-reveal={reveal}>
      <div
        className={p.bars}
        role="img"
        aria-label={`${metricMeta(key).label}, day by day from ${fmtDay(d.start)} to ${fmtDay(d.end)}${span ? `, using it ${span.ongoing ? `since ${fmtDay(span.start)}` : `${fmtDay(span.start)} to ${fmtDay(span.end)}`}` : ""}`}
      >
        {trips.map((t) => (
          <span
            key={t.id}
            className={p.trip}
            style={{ left: xOf(t.start), width: `calc(${xOf(t.end)} - ${xOf(t.start)} + 6px)` }}
            aria-hidden
          />
        ))}
        {series.map((v, i) => (
          <i
            key={v.day}
            data-in={inSpan(v.day, span)}
            data-tone={tone}
            data-empty={v.value == null}
            style={{ height: v.value == null ? 2 : Math.max(3, (v.value - 34) * 0.45), "--i": i } as CSSProperties}
          />
        ))}
      </div>
      <div className={p.dayLabels} ref={labels} aria-hidden>
        {placed.map((l) => (
          <span key={l.id} className={l.kind === "trip" ? p.tripTag : l.kind === "stop" ? p.stopTag : undefined} style={{ transform: `translateX(${l.x}px)` }}>
            {l.kind === "trip" && <Icon name="plane" size={11} />}
            {l.kind === "stop" && <Icon name="stop" size={11} />}
            {l.text}
          </span>
        ))}
      </div>
    </div>
  );
}

