import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";

export default function SubscriptionPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <LandingNav />
      <main className="flex-1 container py-16 max-w-3xl text-ink font-sans">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Subscription Policy</h1>
        
        <div className="space-y-6 text-[14px] leading-relaxed text-ink-muted">
          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">1. Subscription Plans</h2>
            <p>
              PushPort offers subscription plans to unlock advanced storage, bandwidth, and team cooperation options. By choosing a plan, you agree to the recurring fees specified for that subscription cycle.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">2. Billing Cycle</h2>
            <p>
              Subscriptions are billed in advance on a recurring monthly or annual basis depending on your plan. Your subscription cycle automatically renews at the end of the billing period unless canceled.
            </p>
          </section>

          <section className="border-l-2 border-accent pl-4 bg-accent/5 py-3 rounded-r-md">
            <h2 className="text-lg font-semibold text-accent mb-2">3. Refund Policy (No Refunds)</h2>
            <p className="font-medium text-ink font-sans">
              All transactions are final. There is a strict **no refund** policy for subscription plans. 
            </p>
            <p className="mt-2 text-ink-muted">
              If you decide to cancel your subscription, your account will remain active and you will continue to have full access to your subscription features until the end of your current subscription cycle. No partial refunds or prorated credits will be given for unused storage or early cancellations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">4. Plan Changes & Upgrades</h2>
            <p>
              Upgrades will take effect immediately, and the difference in cost will be charged on a prorated basis. Downgrades will take effect at the start of your next billing cycle.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">5. Account Termination</h2>
            <p>
              If a payment fails or is disputed, access to the premium features of your vault may be temporarily suspended. PushPort reserves the right to terminate accounts that repeatedly violate terms or fail subscription payments.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
