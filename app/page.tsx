import Link from "next/link";
import { REPORT_IDS } from "@/lib/reports";

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Skin reports</h1>
      <ul>
        {REPORT_IDS.map((id) => (
          <li key={id}>
            <Link href={`/report/${id}`}>{id}</Link> · <Link href={`/prototype/${id}`}>three directions</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
