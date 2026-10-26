import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Your skin report · Lumeria",
  description: "A month of your skin, read kindly.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#e6cf9f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable} suppressHydrationWarning>
      <head>
        {/* Inside the laptop phone frame (an iframe of this page), marked before first paint so the page
            shows at once instead of waiting for hydration, and never flashes the page's own colour. */}
        <script dangerouslySetInnerHTML={{ __html: "if(self!==top)document.documentElement.setAttribute('data-embedded','')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
