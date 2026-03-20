import type { Metadata } from "next";
import { Sora, DM_Sans } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Mentor", template: "%s — Mentor" },
  description: "Accelerate your career with expert guidance.",
  openGraph: {
    title: "Mentor",
    description: "Accelerate your career with expert guidance.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable}`}>
      <body className="bg-cream font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
