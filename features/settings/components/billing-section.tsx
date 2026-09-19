"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  useCurrentSubscription, 
  usePackages, 
  useTransactions, 
  useSubscribe, 
  useVerifySubscription,
  useUpgradeSubscription,
  useDowngradeSubscription,
  useCancelSubscription
} from "@/services/subscription.service";
import { openRazorpaySubscriptionCheckout } from "@/lib/razorpay";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/store";
import { Package } from "@/types/subscription";
import { getAccessToken } from "@/lib/api-client";
import { AlertCircle, Check, Download, FileText, ShieldCheck, Zap } from "lucide-react";

function formatBytes(bytes: number) {
  if (!bytes) return "0 GB";
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(0)} GB`;
}

export function BillingSection() {
  const { user: currentUser } = useAuthStore();
  const { data: currentSub } = useCurrentSubscription();
  const { data: packages } = usePackages();
  const { data: txnsData, isLoading: txnsLoading } = useTransactions(20, 0);

  const subscribeMut = useSubscribe();
  const verifyMut = useVerifySubscription();
  const upgradeMut = useUpgradeSubscription();
  const downgradeMut = useDowngradeSubscription();
  const cancelMut = useCancelSubscription();

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenInvoice = (txnId: string) => {
    const token = getAccessToken();
    const url = token ? `/api/v1/invoices/${txnId}?token=${encodeURIComponent(token)}` : `/api/v1/invoices/${txnId}`;
    window.open(url, "_blank");
  };

  const isPaidActive = currentSub && (currentSub.status === "active" || currentSub.status === "authenticated" || currentSub.status === "pending");
  const activePkg = (isPaidActive ? currentSub?.package : null) || {
    id: "",
    name: "free",
    display_name: "Free",
    price_paise: 0,
    storage_limit_bytes: 5368709120,
    max_file_size_bytes: 2147483648,
  };

  const handleSelectPackage = async (targetPkg: Package) => {
    setErrorMsg(null);
    try {
      if (activePkg.price_paise === 0 && targetPkg.price_paise > 0) {
        const subData: any = await subscribeMut.mutateAsync(targetPkg.id);
        setPlanModalOpen(false);

        // Small timeout allows Radix dialog unmount animation to cleanly restore body pointer-events
        setTimeout(async () => {
          try {
            await openRazorpaySubscriptionCheckout({
              key: subData.razorpay_key_id,
              subscription_id: subData.razorpay_subscription_id,
              name: "PushPortVault",
              description: `Subscribe to ${targetPkg.display_name}`,
              prefill: {
                email: currentUser?.email,
                name: currentUser?.name || undefined,
              },
              handler: async (response) => {
                try {
                  await verifyMut.mutateAsync({
                    razorpay_subscription_id: response.razorpay_subscription_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  });
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
          } catch (checkoutErr: any) {
            setErrorMsg(checkoutErr.message || "Failed to launch Razorpay checkout");
          }
        }, 150);
        return;
      }

      if (activePkg.price_paise > 0 && targetPkg.price_paise > activePkg.price_paise) {
        await upgradeMut.mutateAsync(targetPkg.id);
        setPlanModalOpen(false);
        return;
      }

      if (targetPkg.price_paise < activePkg.price_paise) {
        await downgradeMut.mutateAsync(targetPkg.id);
        setPlanModalOpen(false);
        return;
      }
    } catch (err: any) {
      if (typeof document !== "undefined") {
        document.body.style.pointerEvents = "auto";
      }
      setErrorMsg(err.message || "Failed to process subscription change");
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel? Your access will continue until the end of your billing cycle.")) {
      return;
    }
    try {
      await cancelMut.mutateAsync();
    } catch (err: any) {
      alert(err.message || "Failed to cancel subscription");
    }
  };

  return (
    <div className="space-y-6">
      {/* Incomplete Payment Alert */}
      {currentSub?.status === "created" && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Incomplete Payment:</strong> A checkout session was started for {currentSub.package?.display_name || "Pro"}, but payment was not finalized.
            </span>
          </div>
          <Button size="sm" onClick={() => setPlanModalOpen(true)} className="gap-1 shrink-0">
            <Zap className="h-3.5 w-3.5" /> Restart Checkout
          </Button>
        </div>
      )}

      {/* Current Subscription Card */}
      <Card className="border border-border-strong bg-bg-surface">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Active Plan</CardTitle>
              <Badge variant={activePkg.name === "free" ? "muted" : "default"}>
                {activePkg.display_name}
              </Badge>
              {currentSub?.cancel_at_cycle_end && (
                <Badge variant="danger">Cancels at cycle end</Badge>
              )}
            </div>
            <p className="text-xs text-ink-muted mt-1">
              {activePkg.price_paise === 0 
                ? "You are currently on the Free tier." 
                : `₹${(activePkg.price_paise / 100).toFixed(0)}/month + 18% GST`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setPlanModalOpen(true)} size="sm" className="gap-1.5">
              <Zap className="h-4 w-4" /> Change Plan
            </Button>
            {activePkg.price_paise > 0 && !currentSub?.cancel_at_cycle_end && (
              <Button variant="outline" size="sm" onClick={handleCancelSubscription} disabled={cancelMut.isPending}>
                Cancel Plan
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-bg-overlay border border-border">
              <p className="text-xs text-ink-muted uppercase font-semibold">Storage Cap</p>
              <p className="text-xl font-bold mt-1 text-ink">{formatBytes(activePkg.storage_limit_bytes)}</p>
            </div>
            <div className="p-4 rounded-lg bg-bg-overlay border border-border">
              <p className="text-xs text-ink-muted uppercase font-semibold">Single Upload Limit</p>
              <p className="text-xl font-bold mt-1 text-ink">{formatBytes(activePkg.max_file_size_bytes)}</p>
            </div>
            <div className="p-4 rounded-lg bg-bg-overlay border border-border">
              <p className="text-xs text-ink-muted uppercase font-semibold">Billing Status</p>
              <p className="text-sm font-medium mt-2 text-ink">
                {currentSub?.current_period_end 
                  ? `${currentSub.cancel_at_cycle_end ? "Access until" : "Renews on"} ${new Date(currentSub.current_period_end).toLocaleDateString()}`
                  : "Free tier — no renewal required"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction & Invoices Table */}
      <Card className="border border-border-strong bg-bg-surface">
        <CardHeader>
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" /> Billing Invoices & Receipts
            </CardTitle>
            <p className="text-xs text-ink-muted mt-1">
              View and download official tax invoices for your subscription payments.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {txnsLoading ? (
            <p className="text-sm text-ink-muted">Loading transactions...</p>
          ) : !txnsData?.data.length ? (
            <div className="py-8 text-center text-ink-muted border border-dashed rounded-lg border-border">
              <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No payment history yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold text-ink-muted uppercase">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Invoice #</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {txnsData.data.map((txn) => (
                    <tr key={txn.id} className="hover:bg-bg-overlay transition-colors">
                      <td className="py-3 text-ink-muted">{new Date(txn.created_at).toLocaleDateString()}</td>
                      <td className="py-3 font-mono text-xs font-semibold">{txn.invoice_number || "PV-PENDING"}</td>
                      <td className="py-3 font-medium">{txn.description || "PushPortVault Subscription"}</td>
                      <td className="py-3 font-semibold">₹{(txn.total_paise / 100).toFixed(2)}</td>
                      <td className="py-3">
                        <Badge variant={txn.status === "captured" ? "success" : "muted"}>
                          {txn.status === "captured" ? "Paid" : txn.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenInvoice(txn.id)}
                          className="h-8 gap-1.5 border-border hover:border-accent hover:text-accent"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download Invoice
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Selection Modal */}
      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Choose Your Storage Plan</DialogTitle>
          </DialogHeader>

          {errorMsg && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-md text-sm text-danger flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            {packages && packages.length > 0 ? (
              packages.map((pkg) => {
                const isCurrent = (activePkg.id && activePkg.id === pkg.id) || activePkg.name === pkg.name;
                const isHigher = pkg.price_paise > activePkg.price_paise;

                return (
                  <div 
                    key={pkg.id} 
                    className={`rounded-lg p-5 border flex flex-col justify-between transition-all ${
                      isCurrent 
                        ? "border-accent bg-accent/5 ring-1 ring-accent" 
                        : "border-border bg-bg-surface hover:border-border-strong"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-base text-ink">{pkg.display_name}</h3>
                        {isCurrent && <Badge variant="default">Current</Badge>}
                      </div>
                      <div className="mb-4">
                        <span className="text-2xl font-extrabold text-ink">
                          ₹{(pkg.price_paise / 100).toFixed(0)}
                        </span>
                        <span className="text-xs text-ink-muted ml-1">/month</span>
                        {pkg.price_paise > 0 && (
                          <span className="block text-[11px] text-ink-muted">+ 18% GST</span>
                        )}
                      </div>

                      <ul className="space-y-2 text-xs text-ink-muted mb-6">
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-accent" />
                          <strong className="text-ink">{formatBytes(pkg.storage_limit_bytes)}</strong> Storage
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-accent" />
                          <strong className="text-ink">{formatBytes(pkg.max_file_size_bytes)}</strong> Single File Upload
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-accent" />
                          High-Speed Cloudflare R2
                        </li>
                      </ul>
                    </div>

                    <Button
                      disabled={isCurrent || subscribeMut.isPending || upgradeMut.isPending || downgradeMut.isPending}
                      onClick={() => handleSelectPackage(pkg)}
                      variant={isCurrent ? "outline" : isHigher ? "primary" : "secondary"}
                      size="sm"
                      className="w-full"
                    >
                      {isCurrent ? "Active Plan" : isHigher ? "Upgrade Now" : "Switch Plan"}
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 text-center py-6 text-sm text-ink-muted">
                No active packages found. Admin will configure packages in Razorpay.
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-[11px] text-ink-muted leading-relaxed border-t border-border pt-3">
            By subscribing or changing plans, you authorize recurring monthly charges via Razorpay and agree to our{" "}
            <Link 
              href="/subscription-policy" 
              target="_blank" 
              className="text-accent underline hover:text-accent-bright font-medium"
            >
              Subscription Terms &amp; Policy
            </Link>{" "}
            (including the strict No-Refund &amp; Anti-Ping-Pong Policy) and{" "}
            <Link 
              href="/terms" 
              target="_blank" 
              className="text-accent underline hover:text-accent-bright font-medium"
            >
              Terms of Service
            </Link>.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
