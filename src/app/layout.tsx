import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { PWAProvider, PWAInstallBanner } from "@/components/PWAProvider";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1A3A8F",
  viewportFit: "cover", // enables safe-area-inset for iPhone notch
};

export const metadata: Metadata = {
  title: { default: "Mentor", template: "%s — Mentor" },
  description: "Career community for early-career professionals in India. AI coaching, expert sessions, job referrals.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mentor",
    startupImage: [
      { url: "/icons/icon-512.png" },
    ],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Mentor — Get in through the side door",
    description: "Career community for early-career professionals in India.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${sora.variable}`}>
      <head>
        {/* MS Tile for Windows */}
        <meta name="msapplication-TileColor" content="#1A3A8F" />
        <meta name="msapplication-TileImage" content="/icons/icon-144.png" />
      </head>
      <body className={`${sora.className} bg-page text-dark antialiased`}>
        <PWAProvider />
        {children}
        <PWAInstallBanner />
      </body>
    </html>
  );
}
