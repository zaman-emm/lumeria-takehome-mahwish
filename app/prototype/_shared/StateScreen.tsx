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
          <div className={s.lens} aria-hidden>
            <span />
            <span />
            <span />
          </div>
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
          <Link className={s.stateButton} href="/prototype/noor">
            See an example report
          </Link>
        </>
      )}

      {state.status === "empty" && (
        <>
          <div className={s.lens} data-still aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <h1 className={s.stateTitle}>Your report starts with one scan</h1>
          <p className={s.stateBody}>
            Hi {state.firstName}. Hold the scope to your cheek for a few seconds and your first read will appear here.
          </p>
        </>
      )}
    </div>
  );
}
