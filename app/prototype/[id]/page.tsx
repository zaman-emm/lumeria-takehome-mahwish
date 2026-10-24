"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { useReport } from "@/lib/useReport";
import { Picker, VARIANTS, type VariantKey } from "../_picker/Picker";
import { Story } from "../_variants/story/Story";
import { Journal } from "../_variants/journal/Journal";
import { Lens } from "../_variants/lens/Lens";

// Prototype harness: one report, three directions, flip between them with the
// picker (or keys 1, 2, 3). Nothing in production imports from here.

const VIEWS = { story: Story, journal: Journal, lens: Lens } as const;

function Harness({ id }: { id: string }) {
  const params = useSearchParams();
  const v = (VARIANTS.some((x) => x.key === params.get("v")) ? params.get("v") : "story") as VariantKey;
  const fail = params.get("fail") === "1";
  const state = useReport(id, fail);
  const View = VIEWS[v];

  return (
    <>
      <View key={`${v}-${id}`} state={state} />
      <Picker id={id} variant={v} fail={fail} />
    </>
  );
}

export default function PrototypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <Harness id={id} />
    </Suspense>
  );
}
