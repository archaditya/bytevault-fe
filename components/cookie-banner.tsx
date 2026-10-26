"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cookie, Shield, Check, X, Sliders } from "lucide-react";
import { GoogleAnalytics } from "@next/third-parties/google";

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  decidedAt: string;
}

const STORAGE_KEY = "bytevault_cookie_consent";

export function CookieBanner() {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setShowBanner(true);
      } else {
        const parsed = JSON.parse(stored);
        setAnalyticsConsent(Boolean(parsed.analytics));
      }
    } catch {
      setShowBanner(true);
    }

    const handleOpenSettings = () => {
      setShowCustomizeModal(true);
    };

    window.addEventListener("bytevault:open-cookie-settings", handleOpenSettings);
    return () => {
      window.removeEventListener("bytevault:open-cookie-settings", handleOpenSettings);
    };
  }, []);

  const savePreferences = (analytics: boolean) => {
    const prefs: CookiePreferences = {
      necessary: true,
      analytics,
      decidedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage errors
    }
    setAnalyticsConsent(analytics);
    setShowBanner(false);
    setShowCustomizeModal(false);
  };

  if (!mounted) return null;

  return (
    <>
      {/* Conditionally load Google Analytics only after affirmative consent */}
      {analyticsConsent && <GoogleAnalytics gaId="G-N90NFD2TX9" />}

      {/* Main Bottom Banner */}
      {showBanner && !showCustomizeModal && (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          <Card className="bg-bg-surface/95 backdrop-blur-md border border-border-strong p-4 sm:p-5 shadow-2xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3 max-w-2xl">
                <div className="h-9 w-9 rounded-md bg-accent/15 text-accent flex items-center justify-center shrink-0 mt-0.5">
                  <Cookie className="h-5 w-5" />
                </div>
                <div className="text-[13px] leading-relaxed text-ink-muted">
                  <p className="font-semibold text-ink">Cookie &amp; Tracking Choices</p>
                  <p className="mt-1">
                    We use strictly necessary cookies to run our authentication and secure storage services. Non-essential analytics help us improve system performance but require your consent under Indian data protection regulations.
                    Read our{" "}
                    <Link href="/privacy" className="text-accent underline hover:text-accent-bright">
                      Privacy Policy
                    </Link>{" "}
                    for full details.
                  </p>
                </div>
              </div>

              {/* 3 Equal Prominence Options */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 md:flex-none text-[12px] h-8 px-3 border border-border-strong hover:bg-bg-surface"
                  onClick={() => setShowCustomizeModal(true)}
                >
                  <Sliders className="h-3.5 w-3.5 mr-1" />
                  Customize
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 md:flex-none text-[12px] h-8 px-3 border border-border-strong hover:bg-bg-surface"
                  onClick={() => savePreferences(false)}
                >
                  Reject Non-Essential
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  className="flex-1 md:flex-none text-[12px] h-8 px-4 font-medium"
                  onClick={() => savePreferences(true)}
                >
                  Accept All
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Customize Preferences Modal */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="bg-bg-surface border border-border-strong max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent" />
                <h3 className="text-base font-semibold text-ink">Cookie &amp; Privacy Preferences</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                className="text-ink-muted hover:text-ink text-sm p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[12px] text-ink-muted mb-4 leading-relaxed">
              In accordance with DPDP rules and CERT-In directions, you have granular control over cookies and tracking pixels.
            </p>

            <div className="space-y-4 text-[13px]">
              {/* Necessary Cookies */}
              <div className="p-3 rounded-md bg-bg border border-border flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink flex items-center gap-1.5">
                    Strictly Necessary Cookies
                    <span className="text-[10px] bg-accent/15 text-accent px-1.5 py-0.5 rounded font-mono">Always Active</span>
                  </p>
                  <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
                    Essential for secure authentication (JWT sessions, MFA verification), CSRF defenses, and basic file storage operations. Cannot be disabled.
                  </p>
                </div>
              </div>

              {/* Analytics / Telemetry Cookies */}
              <div className="p-3 rounded-md bg-bg border border-border flex items-start justify-between gap-3">
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-ink">Analytics &amp; Performance Telemetry</p>
                  <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
                    Helps us measure site traffic, aggregate egress latencies, and optimize delivery performance via Google Analytics and internal telemetry vitals.
                  </p>
                </div>
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={analyticsConsent}
                    onChange={(e) => setAnalyticsConsent(e.target.checked)}
                    className="h-4 w-4 rounded border-border-strong text-accent focus:ring-accent accent-accent cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                size="sm"
                variant="secondary"
                className="text-[12px]"
                onClick={() => savePreferences(false)}
              >
                Reject Non-Essential
              </Button>
              <Button
                size="sm"
                variant="primary"
                className="text-[12px]"
                onClick={() => savePreferences(analyticsConsent)}
              >
                Save Preferences
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
