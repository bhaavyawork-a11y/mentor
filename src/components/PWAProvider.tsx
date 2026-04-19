"use client";

import { useEffect, useState } from "react";

// ─── Service worker registration ──────────────────────────────────────────────
export function PWAProvider() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((reg) => {
            console.log("[SW] Registered:", reg.scope);
          })
          .catch((err) => {
            console.error("[SW] Registration failed:", err);
          });
      });
    }
  }, []);

  return null;
}

// ─── PWA install banner ───────────────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Don't show if already running as standalone PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Check if user has previously dismissed
    if (localStorage.getItem("pwa-banner-dismissed")) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-banner-dismissed", "1");
  };

  if (!prompt || dismissed || installed) return null;

  return (
    <div style={{
      position: "fixed", bottom: 80, left: 12, right: 12,
      backgroundColor: "#080B14", borderRadius: 16, padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      zIndex: 1000,
      // Only show on mobile
      maxWidth: 480, margin: "0 auto",
    }}>
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: "rgba(247,244,213,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0,
      }}>
        📲
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#F7F4D5", margin: "0 0 2px" }}>
          Add Mentor to Home Screen
        </p>
        <p style={{ fontSize: 11, color: "#5B8AFF", margin: 0 }}>
          Instant access, works offline
        </p>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={dismiss} style={{
          background: "none", border: "none", color: "rgba(247,244,213,0.4)",
          fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "4px 2px",
        }} aria-label="Dismiss">
          ×
        </button>
        <button onClick={install} style={{
          backgroundColor: "#5B8AFF", color: "#080B14",
          border: "none", borderRadius: 9, padding: "8px 14px",
          fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}>
          Install
        </button>
      </div>
    </div>
  );
}
