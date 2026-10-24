"use client";

import Link from "next/link";
import type { ReportState } from "@/lib/useReport";
import s from "./shared.module.css";

type Tone = "light" | "dark";

/** Loading, error and empty, written for a person rather than a developer. */
export function StateScreen({ state, tone = "light" }: { state: Exclude<ReportState, { status: "ready" }>; tone?: Tone }) {
  return (
    <div className={s.state} data-tone={tone} aria-live="polite">
      {state.status === "loading" && (
        <>
          <ScopeRings />
          <p className="label">Opening your report</p>
          <p className={s.stateSub}>Gathering your scans</p>
        </>
      )}

      {state.status === "error" && state.kind === "failed" && (
        <>
          <div className={s.stateMark} aria-hidden>
            <svg viewBox="0 0 48 48" width="48" height="48">
              <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".35" />
              <path d="M16 27c2.4-3 5-4.5 8-4.5s5.6 1.5 8 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="18" cy="19" r="1.4" fill="currentColor" />
              <circle cx="30" cy="19" r="1.4" fill="currentColor" />
            </svg>
          </div>
          <h1 className={s.stateTitle}>We couldn’t open your report</h1>
          <p className={s.stateBody}>Your scans are safe. Something on our side didn’t load, so give it another try in a moment.</p>
          <button className={s.stateButton} onClick={state.retry}>
            Try again
          </button>
        </>
      )}

      {state.status === "error" && state.kind === "missing" && (
        <>
          <h1 className={s.stateTitle}>We can’t find this report</h1>
          <p className={s.stateBody}>The link may be incomplete. Open it again from the Lumeria app and it’ll take you straight there.</p>
          <Link className={s.stateButton} href="/report/noor">
            See an example report
          </Link>
        </>
      )}

      {state.status === "empty" && (
        <>
          <ScopeRings still />
          <h1 className={s.stateTitle}>Your report starts with one scan</h1>
          <p className={s.stateBody}>
            Hi {state.firstName}. Hold the scope to your cheek for a few seconds and your first read will appear here.
          </p>
        </>
      )}
    </div>
  );
}

/** The scope finding focus: concentric dashed rings turning at different speeds. */
function ScopeRings({ still }: { still?: boolean }) {
  return (
    <svg className={s.scope} data-still={still} viewBox="0 0 120 120" width="120" height="120" aria-hidden>
      <line x1="60" y1="2" x2="60" y2="14" />
      <line x1="60" y1="106" x2="60" y2="118" />
      <line x1="2" y1="60" x2="14" y2="60" />
      <line x1="106" y1="60" x2="118" y2="60" />
      <circle className={s.r1} cx="60" cy="60" r="52" strokeDasharray="1.5 5.5" />
      <circle className={s.r2} cx="60" cy="60" r="40" strokeDasharray="22 9" />
      <circle className={s.r3} cx="60" cy="60" r="28" strokeDasharray="4 4" />
      <circle className={s.core} cx="60" cy="60" r="12" />
    </svg>
  );
}
