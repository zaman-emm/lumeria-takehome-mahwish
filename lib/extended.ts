// Mocked data the README lets us assume we can collect. Nothing here comes from
// the API: each value is computed from the scan it sits beside, so it moves
// believably with the real scores. See SUBMISSION.md, "Extra data I assumed".

import type { Derived, ScanExtras } from "./insights";
import type { Scan, SkinReport } from "./types";

/** Small stable wobble per scan, so mocked values aren't perfectly smooth. */
function wobble(id: string, salt: number) {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 7) - 3) as number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function extrasFor(s: Scan): ScanExtras {
  const { hydration, evenness, pigmentation, oiliness } = s.scores;
  // Pores and spots need the real three-light photos, not a placeholder.
  const hasPhoto = Boolean(s.photos);
  return {
    // Derived, not measured: shown with that label wherever it appears.
    radiance: Math.round((hydration + evenness) / 2),
    // Stand-ins for a photo-analysis model. No real photo, nothing to analyse.
    pores: hasPhoto ? clamp(0.6 * (oiliness ?? evenness) + 0.4 * evenness - 4 + wobble(s.id, 2)) : null,
    spots: hasPhoto ? clamp(0.8 * pigmentation + 14 + wobble(s.id, 3)) : null,
  };
}

/** The report as if the API also returned the extra measures. */
export function extend(report: SkinReport): SkinReport {
  return { ...report, scans: report.scans.map((s) => ({ ...s, extras: extrasFor(s) })) };
}

// ---------------------------------------------------------------- skin type

/** Skin type is profile context the person gave us, never something we detect. */
export const skinTypeOf = (d: Derived) => d.report.person.skinType;
