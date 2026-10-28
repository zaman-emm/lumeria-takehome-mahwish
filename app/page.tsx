import Link from "next/link";
import { REPORT_IDS } from "@/lib/reports";

export default function Home() {
  return (
    <main style={{ padding: 24, maxWidth: 430, margin: "0 auto", minHeight: "100dvh", background: "var(--bone)" }}>
      <p className="label" style={{ color: "var(--bronze-deep)" }}>
        Lumeria
      </p>
      <h1 style={{ fontWeight: 300, fontSize: 28, margin: "8px 0 20px" }}>Skin reports</h1>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        {REPORT_IDS.map((id) => (
          <li key={id}>
            <Link href={`/report/${id}`} style={{ color: "var(--forest)", fontSize: 17, fontWeight: 500, textTransform: "capitalize" }}>
              {id}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
