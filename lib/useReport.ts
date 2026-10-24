"use client";

import { useCallback, useEffect, useState } from "react";
import { derive, type Derived } from "./insights";
import type { SkinReport } from "./types";

export type ReportState =
  | { status: "loading" }
  | { status: "error"; kind: "missing" | "failed"; retry: () => void }
  | { status: "empty"; firstName: string }
  | { status: "ready"; data: Derived };

/** Fetches /api/reports/:id the way a real client would, forwarding ?fail=1. */
export function useReport(id: string, fail: boolean): ReportState {
  const [state, setState] = useState<ReportState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: "loading" });
    fetch(`/api/reports/${encodeURIComponent(id)}${fail ? "?fail=1" : ""}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (res.status === 404) return setState({ status: "error", kind: "missing", retry });
        if (!res.ok) return setState({ status: "error", kind: "failed", retry });
        const report = (await res.json()) as SkinReport;
        const data = derive(report);
        setState(data ? { status: "ready", data } : { status: "empty", firstName: report.person.firstName });
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setState({ status: "error", kind: "failed", retry });
      });
    return () => ctrl.abort();
  }, [id, fail, attempt, retry]);

  return state;
}
