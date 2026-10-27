"use client";

import { useEffect, useRef } from "react";

// The loading screen's Lumoscope: fine contour lines spin in, zoom and join
// into the scope (glass, lens, clip, the ring of LEDs), then three glints
// pulse on it. Drawn on a canvas in the bone palette, so it keeps its
// transparency on the gold in every browser. People who asked for less motion
// see the finished scope, still.

/** One full play: spin, zoom, form, glints. */
export const LOADER_MS = 2600;

// Every loader on the page shares one clock, so the Suspense fallback handing
// over to the route's own loading screen doesn't restart the animation.
let startedAt: number | null = null;
export const loaderStart = () => (startedAt ??= performance.now());

const W = 280;
const H = 310;
/** Drawn at one and a half times the source file's size, so the scope reads on a full phone screen. */
const ZOOM = 1.5;
const TAU = Math.PI * 2;
const RIM = "#c0913f";
const LINE = "#2f4a35";
const TINT = "rgba(47,74,53,.6)";

const smooth = (t: number) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};

type Pt = { x: number; y: number };

/** Eight rings, then eight small squares (the LEDs), each a closed path of points. */
function makeContours(): Pt[][] {
  const contours: Pt[][] = [];
  for (const radius of [88, 83, 70, 64, 48, 40, 26, 12]) {
    contours.push(
      Array.from({ length: 121 }, (_, i) => {
        const a = (i / 120) * TAU - Math.PI / 2;
        return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
      }),
    );
  }
  for (let led = 0; led < 8; led++) {
    const angle = (led / 8) * TAU - Math.PI / 2;
    const r = 57;
    const corners = [[-4, -5], [4, -5], [4, 5], [-4, 5], [-4, -5]];
    const points: Pt[] = [];
    for (let side = 0; side < 4; side++)
      for (let step = 0; step < 8; step++) {
        const u = step / 8;
        const x = corners[side][0] * (1 - u) + corners[side + 1][0] * u;
        const y = corners[side][1] * (1 - u) + corners[side + 1][1] * u;
        points.push({
          x: Math.cos(angle) * (r + y) - Math.sin(angle) * x,
          y: Math.sin(angle) * (r + y) + Math.cos(angle) * x,
        });
      }
    points.push(points[0]);
    contours.push(points);
  }
  return contours;
}

/** The scope at time t (seconds into the loop). `still` holds the glints lit. */
function draw(ctx: CanvasRenderingContext2D, contours: Pt[][], t: number, still: boolean) {
  const progress = Math.min(1, t / 0.85);
  const morph = smooth((t - 0.24) / 0.61);
  const join = smooth((morph - 0.15) / 0.85);
  // One rigid transform keeps every contour aligned through the twist and zoom.
  const scale = 0.36 + 0.06 * morph;
  const rotation = TAU * (1 - Math.pow(1 - progress, 3));

  ctx.clearRect(0, 0, W, H);
  const halo = ctx.createRadialGradient(140, 155, 12, 140, 155, 82);
  halo.addColorStop(0, "rgba(192,145,63,.2)");
  halo.addColorStop(0.45, "rgba(192,145,63,.12)");
  halo.addColorStop(1, "rgba(192,145,63,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.save();
  ctx.translate(140, 155);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.shadowColor = "rgba(47,74,53,.14)";
  ctx.shadowBlur = 0.6;

  if (morph > 0) {
    // A quiet suggestion of the clip anchors the otherwise floating lens.
    ctx.save();
    ctx.globalAlpha = morph;
    ctx.shadowColor = "rgba(46,38,32,.08)";
    ctx.shadowBlur = 3;
    const clip = ctx.createLinearGradient(-19, -124, 19, -25);
    clip.addColorStop(0, "rgba(47,74,53,.16)");
    clip.addColorStop(0.35, "rgba(47,74,53,.38)");
    clip.addColorStop(0.75, "rgba(20,36,26,.26)");
    clip.addColorStop(1, "rgba(47,74,53,0)");
    ctx.fillStyle = clip;
    ctx.beginPath();
    ctx.roundRect(-21, -134, 42, 115, 19);
    ctx.fill();
    ctx.strokeStyle = "rgba(244,239,230,.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-17, -130, 34, 106, 15);
    ctx.stroke();
    ctx.restore();

    // Translucent bone, bronze and evergreen layers share the scope's transform.
    ctx.save();
    ctx.globalAlpha = morph;
    const glass = ctx.createLinearGradient(-70, -85, 75, 85);
    glass.addColorStop(0, "rgba(244,239,230,.85)");
    glass.addColorStop(0.38, "rgba(244,239,230,.18)");
    glass.addColorStop(0.7, "rgba(192,145,63,.3)");
    glass.addColorStop(1, "rgba(244,239,230,.6)");
    ctx.shadowColor = "rgba(128,96,31,.2)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.arc(0, 0, 88, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0.6;
    ctx.shadowOffsetY = 0;
    const lens = ctx.createRadialGradient(-15, -20, 3, 0, 0, 48);
    lens.addColorStop(0, "rgba(244,239,230,.42)");
    lens.addColorStop(0.28, TINT);
    lens.addColorStop(0.65, "rgba(47,74,53,.4)");
    lens.addColorStop(1, "rgba(20,36,26,.75)");
    ctx.fillStyle = lens;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = RIM;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 85, 0, TAU);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 82, 0, TAU);
    ctx.clip();
    ctx.rotate(-0.45);
    const shine = ctx.createLinearGradient(-60, 0, 35, 0);
    shine.addColorStop(0, "rgba(244,239,230,0)");
    shine.addColorStop(0.5, "rgba(244,239,230,.2)");
    shine.addColorStop(1, "rgba(244,239,230,0)");
    ctx.fillStyle = shine;
    ctx.fillRect(-60, -100, 95, 200);
    ctx.restore();

    // Polarized lens: a sharp oblique reflection within a softer reflected band.
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 47, 0, TAU);
    ctx.clip();
    ctx.rotate(-0.55);
    const reflection = ctx.createLinearGradient(-42, 0, 40, 0);
    reflection.addColorStop(0, "rgba(244,239,230,0)");
    reflection.addColorStop(0.3, "rgba(244,239,230,.12)");
    reflection.addColorStop(0.4, "rgba(244,239,230,.25)");
    reflection.addColorStop(0.52, "rgba(244,239,230,.3)");
    reflection.addColorStop(0.65, "rgba(244,239,230,.16)");
    reflection.addColorStop(0.76, "rgba(192,145,63,.15)");
    reflection.addColorStop(1, "rgba(244,239,230,0)");
    ctx.fillStyle = reflection;
    ctx.fillRect(-45, -55, 90, 110);
    ctx.restore();

    // Window and sky reflections, after the scope photograph.
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 47, 0, TAU);
    ctx.clip();
    ctx.translate(-15, -9);
    ctx.rotate(0.35);
    const windowLight = ctx.createRadialGradient(0, 0, 2, 0, 0, 17);
    windowLight.addColorStop(0, "rgba(255,250,235,.8)");
    windowLight.addColorStop(0.55, "rgba(244,239,230,.55)");
    windowLight.addColorStop(1, "rgba(244,239,230,0)");
    ctx.scale(0.72, 1.15);
    ctx.fillStyle = windowLight;
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, TAU);
    ctx.clip();
    const sky = ctx.createLinearGradient(-8, 0, 22, 0);
    sky.addColorStop(0, "rgba(166,193,206,0)");
    sky.addColorStop(0.45, "rgba(166,193,206,.36)");
    sky.addColorStop(1, "rgba(166,193,206,0)");
    ctx.rotate(-0.18);
    ctx.fillStyle = sky;
    ctx.fillRect(-8, -69, 30, 105);
    ctx.restore();
    ctx.strokeStyle = "rgba(244,239,230,.6)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, 67, 3.75, 4.45);
    ctx.stroke();
    ctx.restore();
  }

  // The contours: the outer rings start dashed and close up; the inner ones
  // and the LEDs draw themselves round as the scope forms.
  const initialRadii = [88, 68, 48, 21];
  const patterns = [[0.1, 10], [20, 10], [5, 6]];
  contours.forEach((points, index) => {
    ctx.save();
    ctx.strokeStyle = index < 2 ? RIM : index >= 8 ? "#c0913f" : LINE;
    ctx.lineWidth = 0.62 / scale;
    if (index < 3) {
      const [dash, gap] = patterns[index];
      ctx.setLineDash([dash + (26 - dash) * join, gap * (1 - join)]);
    }
    const extent = index < 4 ? 1 : join;
    if (extent > 0) {
      ctx.beginPath();
      for (let sample = 0; sample <= 120; sample++) {
        const fraction = (sample / 120) * extent;
        const at = fraction * (points.length - 1);
        const low = Math.floor(at);
        const high = Math.min(points.length - 1, low + 1);
        const u = at - low;
        const tx = points[low].x * (1 - u) + points[high].x * u;
        const ty = points[low].y * (1 - u) + points[high].y * u;
        const angle = fraction * TAU - Math.PI / 2;
        const x = index < 4 ? Math.cos(angle) * initialRadii[index] * (1 - morph) + tx * morph : tx;
        const y = index < 4 ? Math.sin(angle) * initialRadii[index] * (1 - morph) + ty * morph : ty;
        if (sample === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (index === 3 && morph < 1) {
        ctx.fillStyle = "#e8dbb6";
        ctx.fill();
      }
      if (index >= 8 && join > 0.9) {
        // Each LED lights up gold once its outline has closed.
        ctx.save();
        ctx.globalAlpha = smooth((join - 0.9) / 0.1);
        const led = index - 8;
        const angle = (led / 8) * TAU - Math.PI / 2;
        ctx.translate(Math.cos(angle) * 57, Math.sin(angle) * 57);
        ctx.rotate(angle);
        const gold = ctx.createLinearGradient(-4, -5, 4, 5);
        gold.addColorStop(0, "#f4efe6");
        gold.addColorStop(0.25, "#e7c477");
        gold.addColorStop(1, "#c0913f");
        ctx.fillStyle = gold;
        ctx.fillRect(-5, -4, 10, 8);
        ctx.strokeStyle = "rgba(255,250,235,.85)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-4, 3);
        ctx.lineTo(-4, -3);
        ctx.lineTo(2, -3);
        ctx.stroke();
        if (led === 6 || led === 7) {
          ctx.shadowColor = "rgba(244,239,230,.65)";
          ctx.shadowBlur = 3;
          ctx.fillStyle = "rgba(255,250,235,.85)";
          ctx.fillRect(-3, -2, 3, 4);
        }
        ctx.restore();
      }
      ctx.stroke();
    }
    ctx.restore();
  });

  if (morph > 0) {
    // Two fine highlights along the glass rim.
    ctx.save();
    ctx.globalAlpha = morph;
    ctx.strokeStyle = "rgba(244,239,230,.45)";
    ctx.lineWidth = 0.85 / scale;
    ctx.shadowColor = "rgba(244,239,230,.3)";
    ctx.shadowBlur = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 87, Math.PI * 1.07, Math.PI * 1.72);
    ctx.stroke();
    ctx.lineWidth = 0.5 / scale;
    ctx.beginPath();
    ctx.arc(0, 0, 81, 0.12, 1.05);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // Sparse scan glints, staggered around the finished scope.
  if (morph > 0.5) {
    const glints: [number, number, number, number, "star" | "flare" | "diamond"][] = [
      [-50, -29, 7.5, 0, "star"],
      [49, -7, 5.5, 0.3, "flare"],
      [26, 46, 3.8, 0.65, "diamond"],
    ];
    ctx.save();
    for (const [x, y, size, delay, shape] of glints) {
      const pulse = still ? 0.9 : 0.28 + 0.72 * Math.pow(Math.max(0, Math.sin(((t - 0.55 - delay) * TAU) / 1.5)), 2);
      if (pulse < 0.02) continue;
      ctx.globalAlpha = pulse * smooth((morph - 0.5) / 0.5);
      ctx.fillStyle = "#a77519";
      ctx.shadowColor = "rgba(255,220,120,.8)";
      ctx.shadowBlur = 5;
      ctx.save();
      ctx.translate(140 + x, 155 + y);
      ctx.beginPath();
      if (shape === "diamond") {
        ctx.rotate(0.2);
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.65, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.65, 0);
        ctx.closePath();
      } else {
        const width = shape === "flare" ? size * 0.65 : size;
        const height = shape === "flare" ? size * 1.35 : size;
        if (shape === "flare") ctx.rotate(0.25);
        ctx.moveTo(0, -height);
        ctx.quadraticCurveTo(0.6, -0.6, width, 0);
        ctx.quadraticCurveTo(0.6, 0.6, 0, height);
        ctx.quadraticCurveTo(-0.6, 0.6, -width, 0);
        ctx.quadraticCurveTo(-0.6, -0.6, 0, -height);
      }
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}

export function Loader({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1) * ZOOM;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    const contours = makeContours();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      draw(ctx, contours, 1.2, true);
      return;
    }
    const start = loaderStart();
    let frame = 0;
    const tick = (now: number) => {
      draw(ctx, contours, ((now - start) / 1000) % (LOADER_MS / 1000), false);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={ref} className={className} style={{ width: W * ZOOM, height: H * ZOOM }} aria-hidden />;
}
