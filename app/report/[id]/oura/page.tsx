"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { OuraReport } from "@/components/report/OuraReport";
import { StateScreen } from "@/components/report/StateScreen";
import { useReport } from "@/lib/useReport";

// /report/:id/oura. The same report in an Oura-inspired layout, to compare
// against /report/:id side by side.

export default function OuraReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<StateScreen state={{ status: "loading" }} tone="dark" />}>
      <OuraRoute id={id} />
    </Suspense>
  );
}

function OuraRoute({ id }: { id: string }) {
  const fail = useSearchParams().get("fail") === "1";
  const state = useReport(id, fail);
  if (state.status !== "ready") return <StateScreen state={state} tone="dark" />;
  return <OuraReport d={state.data} />;
}
