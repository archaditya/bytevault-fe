import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import Link from "next/link";
import { ShieldCheck, ArrowRight, AlertTriangle, RefreshCw, FileText } from "lucide-react";

export const metadata = {
  title: "Subscription Terms & Policy — ByteVault",
  description: "Official subscription terms, billing cycles, upgrade/downgrade safeguards, and refund policy for ByteVault Cloud Storage.",
};

export default function SubscriptionPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <LandingNav />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl font-sans">
        {/* Header */}
        <div className="mb-10 pb-6 border-b border-border">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent mb-4 border border-accent/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Billing & Governance Policy
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink mb-3">
            Subscription Terms & Conditions
          </h1>
          <p className="text-sm text-ink-muted">
            Last Updated: September 2026 • Applies to all ByteVault Free, Pro, and Premium Accounts
          </p>
        </div>

        {/* Overview Box */}
        <div className="panel p-6 mb-10 bg-bg-surface/60 border border-border/80">
          <h2 className="text-base font-semibold text-ink mb-2">Summary at a Glance</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-ink-muted">
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">•</span>
              <span><strong>Auto-Renewal:</strong> Recurring monthly billing via Razorpay with RBI e-mandate pre-debit notices.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">•</span>
              <span><strong>Immediate Upgrades:</strong> Storage elevation applies instantly upon plan confirmation.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">•</span>
              <span><strong>Scheduled Downgrades:</strong> Downgrades execute at billing cycle end to prevent service loss.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">•</span>
              <span><strong>Strict No-Refunds:</strong> Zero cash refunds or chargebacks for mid-cycle changes.</span>
            </li>
          </ul>
        </div>

        <div className="space-y-10 text-[14px] leading-relaxed text-ink-muted">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
              <span>1. Subscription Plans & Storage Limits</span>
            </h2>
            <p>
              ByteVault provides three tiered subscription packages. All fees are denominated in Indian Rupees (INR) and are inclusive of applicable Goods and Services Tax (GST):
            </p>
            <div className="overflow-x-auto rounded-lg border border-border mt-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-bg-surface/80 border-b border-border text-ink font-semibold">
                    <th className="p-3">Plan</th>
                    <th className="p-3">Total Storage</th>
                    <th className="p-3">Max Single File</th>
                    <th className="p-3">Price (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr>
                    <td className="p-3 font-semibold text-ink">Free Tier</td>
                    <td className="p-3 mono-num">5 GB</td>
                    <td className="p-3 mono-num">2 GB</td>
                    <td className="p-3">₹0 / month</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-accent">Pro Tier</td>
                    <td className="p-3 mono-num">50 GB</td>
                    <td className="p-3 mono-num">5 GB</td>
                    <td className="p-3 mono-num">₹149 / month</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-indigo-400">Premium Tier</td>
                    <td className="p-3 mono-num">200 GB</td>
                    <td className="p-3 mono-num">20 GB</td>
                    <td className="p-3 mono-num">₹499 / month</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-ink">2. Billing Cycle & Automatic Recurring Renewal</h2>
            <p>
              Subscriptions are billed in advance on a recurring monthly schedule. By authenticating your payment method (Credit Card, Debit Card, UPI e-Mandate, or Net Banking) via our payment gateway partner, <strong>Razorpay</strong>, you authorize ByteVault to initiate automated recurring debits on each renewal date.
            </p>
            <p>
              Under Reserve Bank of India (RBI) regulatory directives for recurring e-mandates, you will receive pre-debit SMS/email notifications from Razorpay and your card-issuing bank at least 24 to 48 hours prior to each charge.
            </p>
          </section>

          {/* Section 3: Upgrades & Anti-Ping-Pong Policy */}
          <section className="space-y-3 panel p-5 border-accent/30 bg-accent/[0.02]">
            <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-accent" />
              <span>3. Plan Upgrades, Downgrades & Anti-Ping-Pong Safeguards</span>
            </h2>
            <p>
              To maintain financial consistency and resource availability, ByteVault implements strict safeguards against rapid plan changes:
            </p>
            <ul className="space-y-2 list-disc list-inside text-ink-muted">
              <li>
                <strong className="text-ink">Upgrades:</strong> When upgrading to a higher storage plan (e.g., from Free to Pro, or Pro to Premium), your account storage capacity and single-file upload limits are elevated <strong>immediately</strong> upon payment authorization.
              </li>
              <li>
                <strong className="text-ink">Downgrades:</strong> Downgrades to a lower plan or Free tier are scheduled to take effect at the <strong>end of the current billing cycle</strong>. You retain full paid storage limits until the cycle concludes.
              </li>
              <li>
                <strong className="text-ink">Single Plan Change per Billing Cycle:</strong> Once you upgrade or schedule a downgrade, you cannot execute conflicting plan changes within the same billing cycle (anti-ping-pong lock). You must wait until the current billing cycle renews or conclude before switching tiers again.
              </li>
              <li>
                <strong className="text-ink">Revoking a Scheduled Downgrade:</strong> If you change your mind prior to cycle completion, you may cancel your pending downgrade request via Account Settings (or <span className="font-mono text-xs text-accent">POST /subscription/cancel-downgrade</span>) to maintain continuous renewal.
              </li>
            </ul>
          </section>

          {/* Section 4: Quota Enforcement */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-ink">4. Storage Quota Enforcement on Downgrade or Expiration</h2>
            <p>
              When a downgrade or cancellation takes effect and your plan returns to a lower tier:
            </p>
            <div className="panel p-4 bg-bg-surface space-y-2 border-border">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-ink">Safe File Preservation Guarantee</p>
                  <p className="text-xs text-ink-muted">
                    ByteVault <strong>will not immediately delete or purge your existing files</strong> if your stored data exceeds your new plan quota. However, your account will enter an <strong>Upload-Restricted state</strong>.
                  </p>
                </div>
              </div>
              <ul className="list-disc list-inside text-xs text-ink-muted pl-6 space-y-1">
                <li>All new file uploads, folders, and file updates will be rejected until total storage usage falls below the active quota.</li>
                <li>Download, view, and share capabilities remain fully functional for existing content.</li>
              </ul>
            </div>
          </section>

          {/* Section 5: Strict Refund Policy */}
          <section className="border-l-4 border-accent pl-5 py-2 bg-accent/5 rounded-r-lg space-y-2">
            <h2 className="text-lg font-semibold text-accent">5. Strict No-Refund & No-Cashback Policy</h2>
            <p className="font-medium text-ink">
              All subscription charges, recurring renewals, and upgrade fees are final and strictly non-refundable.
            </p>
            <p className="text-xs text-ink-muted">
              Because cloud storage allocations and bandwidth infrastructure are provisioned immediately upon transaction confirmation, ByteVault does not grant cash refunds, prorated credits, or partial chargebacks for early cancellations or unused storage allocations.
            </p>
          </section>

          {/* Section 6: Invoices & Tax Compliance */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent" />
              <span>6. Invoices & Billing History</span>
            </h2>
            <p>
              A digital tax invoice is generated for every successful charge and is accessible under Account Settings &gt; Billing. Invoices include GST compliance details, transaction IDs, package specifications, and downloadable HTML/PDF copies.
            </p>
          </section>

          {/* Section 7: Cancellation & Account Inactivation */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-ink">7. Cancellation & Failed Payment Retries</h2>
            <p>
              You may cancel recurring subscription renewal at any time via the web platform. Cancellation halts future charges while maintaining access until the expiration of the prepaid billing period.
            </p>
            <p>
              In the event of an automated debit failure, Razorpay initiates automated retry attempts. If all retries fail, the subscription moves to a <em>halted</em> state before gracefully expiring to the Free tier.
            </p>
          </section>
        </div>

        {/* Footer CTA */}
        <div className="mt-14 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink-muted">
            Questions regarding billing or invoices? Reach out to our support team.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-xs font-semibold text-accent hover:underline"
          >
            <span>Contact Billing Support</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
