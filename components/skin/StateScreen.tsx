"use client";

import Link from "next/link";
import type { ReportState } from "@/lib/useReport";
import { Loader } from "./Loader";
import { Logo } from "./Logo";
import st from "./state.module.css";

// Error and empty, in the report's own gold (loading is only the empty home background), written for a person
// rather than a developer.

export function StateScreen({
  state,
}: {
  state: Exclude<ReportState, { status: "ready" }>;
}) {
  // Loading: the Lumoscope forms on the home page's gold under the same glass
  // the splash then opens on. Screen readers still hear that it's opening.
  if (state.status === "loading") {
    return (
      <div className={st.home} data-skin>
        <div className={st.veil} aria-hidden />
        <div className={st.loader}>
          <Loader />
        </div>
        <p className={st.sr} role="status">
          Opening your report
        </p>
      </div>
    );
  }
  return (
    <div className={st.home} data-skin aria-live="polite">
      <div className={st.state}>
        <Logo className={st.logo} />
        <div className={st.body}>
          {state.status === "error" && state.kind === "failed" && (
            <>
              <ScopeRings still />
              <h1 className={st.title}>We couldn’t open your report</h1>
              <p className={st.text}>
                Your scans are safe. Something on our side didn’t load, so give
                it another try.
              </p>
              <button className={st.button} onClick={state.retry}>
                Try again
              </button>
            </>
          )}
          {state.status === "error" && state.kind === "offline" && (
            <>
              <ScopeRings still />
              <h1 className={st.title}>You seem to be offline</h1>
              <p className={st.text}>Your scans are safe. Check your connection and try again.</p>
              <button className={st.button} onClick={state.retry}>
                Try again
              </button>
            </>
          )}
          {state.status === "error" && state.kind === "missing" && (
            <>
              <ScopeRings still />
              <h1 className={st.title}>We can’t find this report</h1>
              <p className={st.text}>Sorry, we ran into some trouble. Try opening it again in a moment.</p>
              <Link className={st.button} href="/report/noor">
                See what a report looks like
              </Link>
            </>
          )}
          {state.status === "empty" && (
            <>
              <ScopeRings still />
              <h1 className={st.title}>Your report starts with one scan</h1>
              <p className={st.text}>
                Hi {state.firstName}. Hold the scope to your cheek for a few
                seconds and your first read appears here.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** The scope finding focus: dashed rings turning at different speeds. */
function ScopeRings({ still }: { still?: boolean }) {
  return (
    <svg
      className={st.scope}
      data-still={still}
      viewBox="0 0 120 120"
      width="112"
      height="112"
      aria-hidden
    >
      <circle
        className={st.r1}
        cx="60"
        cy="60"
        r="52"
        strokeDasharray="1.5 5.5"
      />
      <circle className={st.r2} cx="60" cy="60" r="40" strokeDasharray="22 9" />
      <circle className={st.r3} cx="60" cy="60" r="28" strokeDasharray="4 4" />
      <circle className={st.core} cx="60" cy="60" r="12" />
    </svg>
  );
}
