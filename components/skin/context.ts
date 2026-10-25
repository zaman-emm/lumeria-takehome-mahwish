"use client";

import { createContext, useContext } from "react";
import type { Derived, LumiQuestion, ScoreKey } from "@/lib/insights";
import type { Scan } from "@/lib/types";

export type SheetState =
  | { kind: "scan"; scan: Scan }
  | { kind: "metric"; key: ScoreKey; area: string }
  | { kind: "lumi" };

export interface ReportApi {
  d: Derived;
  openScan: (scan: Scan) => void;
  openMetric: (key: ScoreKey, area?: string) => void;
  openLumi: () => void;
  /** Lumi's questions and the answers so far. They outlive the sheet, so the
   *  dock can count what's still open. */
  lumi: {
    questions: LumiQuestion[];
    answers: Record<string, string>;
    answer: (id: string, answer: string) => void;
  };
}

export const ReportContext = createContext<ReportApi | null>(null);

export function useReportApi() {
  const api = useContext(ReportContext);
  if (!api) throw new Error("useReportApi outside <Report>");
  return api;
}
