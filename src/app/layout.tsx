import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-sora",
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
    <html lang="en" className={sora.variable}>
      <body className={`${sora.className} bg-page text-dark antialiased`}>
        {children}
      </body>
    </html>
  );
}
