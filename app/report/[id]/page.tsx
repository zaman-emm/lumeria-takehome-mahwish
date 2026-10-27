"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Report } from "@/components/skin/Report";
import { StateScreen } from "@/components/skin/StateScreen";
import { useReport } from "@/lib/useReport";
import { DeviceChrome } from "@/components/skin/DeviceChrome";
import { PhoneFrame } from "@/components/skin/PhoneFrame";
import { LOADER_MS, loaderStart } from "@/components/skin/Loader";
import { willSplash } from "@/components/skin/splashState";

// /report/:id. Fetches the report like a real client would (forwarding
// ?fail=1), then shows either a friendly state screen or the report itself.

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <PhoneFrame>
      <DeviceChrome />
      <Suspense fallback={<StateScreen state={{ status: "loading" }} />}>
        <ReportRoute id={id} />
      </Suspense>
    </PhoneFrame>
  );
}

function ReportRoute({ id }: { id: string }) {
  const fail = useSearchParams().get("fail") === "1";
  const state = useReport(id, fail);
  // A first load plays the loader through once before the splash takes over.
  const [held, setHeld] = useState(() => willSplash());
  useEffect(() => {
    if (!held) return;
    const timer = window.setTimeout(() => setHeld(false), LOADER_MS - (performance.now() - loaderStart()));
    return () => window.clearTimeout(timer);
  }, [held]);
  if (held && (state.status === "loading" || state.status === "ready")) return <StateScreen state={{ status: "loading" }} />;
  if (state.status !== "ready") return <StateScreen state={state} />;
  return <Report d={state.data} />;
}
