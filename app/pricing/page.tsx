"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  usePackages, 
  useCurrentSubscription, 
  useSubscribe, 
  useVerifySubscription,
  useUpgradeSubscription
} from "@/services/subscription.service";
import { openRazorpaySubscriptionCheckout } from "@/lib/razorpay";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { Package } from "@/types/subscription";
import { useAuthStore } from "@/store";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";

function formatBytes(bytes: number) {
  if (!bytes) return "0 GB";
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(0)} GB`;
}

export default function PricingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { data: packages, isLoading: packagesLoading } = usePackages();
  const { data: currentSub } = useCurrentSubscription(isAuthenticated);
  const subscribeMut = useSubscribe();
  const verifyMut = useVerifySubscription();
  const upgradeMut = useUpgradeSubscription();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isPaidActive = currentSub && (currentSub.status === "active" || currentSub.status === "authenticated" || currentSub.status === "pending");
  const activePkg = (isPaidActive ? currentSub?.package : null) || {
    name: "free",
    display_name: "Free",
    price_paise: 0,
  };

  const handleSelectPackage = async (targetPkg: Package) => {
    setErrorMsg(null);

    // If visitor is unauthenticated, redirect to login with return redirect
    if (!isAuthenticated) {
      if (targetPkg.price_paise > 0) {
        router.push(`/login?redirect=${encodeURIComponent("/pricing")}`);
      } else {
        router.push("/register");
      }
      return;
    }

    try {
      if (activePkg.price_paise === 0 && targetPkg.price_paise > 0) {
        const subData: any = await subscribeMut.mutateAsync(targetPkg.id);

        await openRazorpaySubscriptionCheckout({
          key: subData.razorpay_key_id,
          subscription_id: subData.razorpay_subscription_id,
          name: "ByteVault",
          description: `Subscribe to ${targetPkg.display_name}`,
          handler: async (response) => {
            try {
              await verifyMut.mutateAsync({
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              router.push("/settings?tab=billing");
            } catch (vErr: any) {
              setErrorMsg(vErr.message || "Payment verification failed");
            }
          },
          modal: {
            ondismiss: () => {
              if (typeof document !== "undefined") {
                document.body.style.pointerEvents = "auto";
              }
            },
          },
        });
        return;
      }

      if (activePkg.price_paise > 0 && targetPkg.price_paise > activePkg.price_paise) {
        await upgradeMut.mutateAsync(targetPkg.id);
        return;
      }
    } catch (err: any) {
      if (typeof document !== "undefined") {
        document.body.style.pointerEvents = "auto";
      }
      setErrorMsg(err.message || "Failed to process payment");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink font-sans">
      <LandingNav />

      <main className="flex-1 container py-16 relative">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_40%,transparent_100%)] pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="default" className="mb-4 px-3 py-1 font-semibold text-xs bg-accent/15 text-accent border border-accent/25">
              Transparent Cloud Storage
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-ink">
              Predictable, High-Capacity Storage
            </h1>
            <p className="mt-4 text-sm sm:text-base text-ink-muted leading-relaxed">
              Resumable, chunk-level verified cloud storage powered by Cloudflare R2 with zero egress fees and automated integrity shields.
            </p>
          </div>

          {errorMsg && (
            <div className="max-w-md mx-auto mb-8 p-3 bg-danger/10 border border-danger/30 rounded-md text-sm text-danger text-center">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {packagesLoading ? (
              <div className="col-span-3 flex justify-center py-20">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  <span className="font-mono text-[12px] text-ink-muted">Loading plans...</span>
                </div>
              </div>
            ) : packages && packages.length > 0 ? (
              packages.map((pkg) => {
                const isCurrent = isAuthenticated && activePkg.name === pkg.name;
                const isPro = pkg.name === "pro";

                return (
                  <div
                    key={pkg.id}
                    className={`relative rounded-xl p-8 border flex flex-col justify-between transition-all backdrop-blur-sm ${
                      isPro
                        ? "border-accent bg-accent/5 shadow-2xl ring-1 ring-accent/30"
                        : "border-border bg-bg-surface hover:border-border-strong"
                    }`}
                  >
                    {isPro && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-white text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md">
                        <Sparkles className="h-3 w-3" /> Most Popular
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-ink">{pkg.display_name}</h3>
                        {isCurrent && <Badge variant="muted">Active Plan</Badge>}
                      </div>

                      <div className="mb-6">
                        <span className="text-4xl font-black text-ink">
                          ₹{(pkg.price_paise / 100).toFixed(0)}
                        </span>
                        <span className="text-sm text-ink-muted ml-1 font-medium">/month</span>
                        {pkg.price_paise > 0 && (
                          <span className="block text-xs text-ink-muted mt-0.5">+ 18% GST</span>
                        )}
                      </div>

                      <p className="text-xs text-ink-muted mb-6 min-h-[36px]">
                        {pkg.description || `Optimized for users requiring ${formatBytes(pkg.storage_limit_bytes)} of cloud storage.`}
                      </p>

                      <div className="border-t border-border pt-6 mb-8 space-y-3">
                        <div className="flex items-center gap-2.5 text-sm">
                          <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                            <Check className="h-3 w-3" />
                          </div>
                          <span>
                            <strong className="text-ink">{formatBytes(pkg.storage_limit_bytes)}</strong> Fast Storage
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 text-sm">
                          <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                            <Check className="h-3 w-3" />
                          </div>
                          <span>
                            <strong className="text-ink">{formatBytes(pkg.max_file_size_bytes)}</strong> Single File Upload
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 text-sm">
                          <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                            <Check className="h-3 w-3" />
                          </div>
                          <span>Ephemeral &amp; Public Link Sharing</span>
                        </div>

                        <div className="flex items-center gap-2.5 text-sm">
                          <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                            <Check className="h-3 w-3" />
                          </div>
                          <span>Automated NSFW &amp; Malware Shield</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      disabled={isCurrent || subscribeMut.isPending || upgradeMut.isPending}
                      onClick={() => handleSelectPackage(pkg)}
                      variant={isPro ? "primary" : isCurrent ? "outline" : "secondary"}
                      size="lg"
                      className="w-full font-semibold gap-2 shadow-sm"
                    >
                      {isCurrent 
                        ? "Current Plan" 
                        : !isAuthenticated && pkg.price_paise === 0
                        ? "Get Started Free"
                        : !isAuthenticated
                        ? "Sign In & Subscribe"
                        : pkg.price_paise > 0 
                        ? "Subscribe with Razorpay" 
                        : "Free Plan"}
                      {!isCurrent && <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 text-center py-12 text-ink-muted">
                No active storage packages found.
              </div>
            )}
          </div>

          <div className="mt-16 text-center text-xs text-ink-muted max-w-lg mx-auto">
            <p>
              Secure recurring subscription payments processed via Razorpay. Cancel anytime in your{" "}
              <Link href="/settings" className="underline underline-offset-4 text-ink hover:text-accent">
                Settings &amp; Billing
              </Link>{" "}
              dashboard. Per ByteVault policies, payments are non-refundable.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
