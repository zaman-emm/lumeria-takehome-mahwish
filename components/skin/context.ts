"use client";

import { createContext, useContext } from "react";
import type { Derived, ScoreKey } from "@/lib/insights";
import type { LumiTab } from "@/lib/lumi";
import type { Scan } from "@/lib/types";
import type { Light } from "./ui";

export type SheetState =
  /** light: the light the Photos tab was showing, so the scan opens in it. */
  | { kind: "scan"; scan: Scan; light?: Light }
  | { kind: "metric"; key: ScoreKey; area: string }
  /** Lumi opens on the tab it was called from, so it can talk about it. */
  | { kind: "lumi"; tab: LumiTab };

export interface ReportApi {
  d: Derived;
  openScan: (scan: Scan, light?: Light) => void;
  openMetric: (key: ScoreKey, area?: string) => void;
  openLumi: () => void;
}

export const ReportContext = createContext<ReportApi | null>(null);

export function useReportApi() {
  const api = useContext(ReportContext);
  if (!api) throw new Error("useReportApi outside <Report>");
  return api;
}
