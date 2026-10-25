import { Instrument_Serif } from "next/font/google";

// The Oura-style variant pairs Montserrat with a display serif for headlines.
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

export default function OuraLayout({ children }: { children: React.ReactNode }) {
  return <div className={serif.variable}>{children}</div>;
}
