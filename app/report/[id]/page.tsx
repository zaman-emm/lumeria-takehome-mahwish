"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { Report } from "@/components/skin/Report";
import { StateScreen } from "@/components/skin/StateScreen";
import { useReport } from "@/lib/useReport";

// /report/:id. Fetches the report like a real client would (forwarding
// ?fail=1), then shows either a friendly state screen or the report itself.

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<StateScreen state={{ status: "loading" }} />}>
      <ReportRoute id={id} />
    </Suspense>
  );
}

function ReportRoute({ id }: { id: string }) {
  const fail = useSearchParams().get("fail") === "1";
  const state = useReport(id, fail);
  if (state.status !== "ready") return <StateScreen state={state} />;
  return <Report d={state.data} />;
}
