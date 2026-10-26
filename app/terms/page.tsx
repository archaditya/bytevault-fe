import { Metadata } from "next";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms and Conditions — PushPostVault",
  description: "Terms of Service, acceptable use, and user agreements under Indian law.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink font-sans">
      <LandingNav />
      <main className="flex-1 container py-16 max-w-3xl">
        <div className="border-b border-border pb-6 mb-8">
          <p className="label-eyebrow text-accent">User Agreement</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink mt-2">Terms and Conditions</h1>
          <p className="text-[13px] text-ink-muted mt-2">
            Last updated: October 2026 &bull; Compliant with Indian Contract Act, 1872 &amp; IT Intermediary Rules, 2021
          </p>
        </div>

        <div className="space-y-8 text-[14px] leading-relaxed text-ink-muted">
          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">1. Agreement to Terms</h2>
            <p>
              By accessing or using PushPostVault (&ldquo;ByteVault&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;), you enter into a legally binding agreement governed by the laws of India. If you do not agree to these terms, you must not access or use our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">2. Eligibility &amp; Age Restriction</h2>
            <p>
              Under the Digital Personal Data Protection Act, 2023, you must be at least 18 years of age to register for an account or upload files. By registering, you confirm that you are at least 18 years old and have the legal capacity to enter into a valid contract under the Indian Contract Act, 1872.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">3. User Conduct &amp; Prohibited Content (IT Intermediary Rules, 2021)</h2>
            <p>
              As an intermediary under Rule 3(1)(b) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, PushPostVault prohibits hosting, displaying, uploading, modifying, publishing, transmitting, or sharing any content that:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5">
              <li>Belongs to another person and to which you do not have any legal right;</li>
              <li>Is defamatory, obscene, pornographic, pedophilic, invasive of another&apos;s privacy, insulting or harassing on the basis of gender, racially or ethnically objectionable;</li>
              <li>Is harmful to children or promotes harm to minors;</li>
              <li>Infringes any patent, trademark, copyright or other proprietary rights;</li>
              <li>Deceives or misleads the addressee about the origin of the message or intentionally communicates misinformation;</li>
              <li>Impersonates another person or entity;</li>
              <li>Contains software viruses or any other computer code designed to interrupt, destroy or limit the functionality of computer resources;</li>
              <li>Threatens the unity, integrity, defense, security or sovereignty of India, friendly relations with foreign states, or public order.</li>
            </ul>
            <p className="mt-2 text-[13px]">
              We reserve the right to immediately remove violating content, suspend accounts, and report cybersecurity or national security incidents to CERT-In or appropriate law enforcement authorities.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">4. Services, Quotas, &amp; Subscriptions</h2>
            <p>
              ByteVault provides 5GB of free cloud storage with standard file sharing. Upgraded tiers (Pro, Team) are billed through Razorpay. All fees, billing intervals, cancellation rules, and refund policies are detailed in our{" "}
              <Link href="/subscription-policy" className="text-accent hover:underline">
                Subscription Policy
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">5. Privacy &amp; Data Rights</h2>
            <p>
              Your personal data is handled strictly in accordance with our{" "}
              <Link href="/privacy" className="text-accent hover:underline">
                Privacy Policy
              </Link>. You retain all ownership rights to your files. You have the right to export your data or delete your account at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">6. Limitation of Liability &amp; Disclaimers</h2>
            <p>
              Services are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. To the maximum extent permitted by applicable Indian law, PushPostVault and its service providers disclaim all warranties, express or implied, including merchantability or fitness for a particular purpose. In no event shall PushPostVault be liable for any indirect, incidental, punitive, or consequential damages resulting from lost files, business interruptions, or unauthorized access outside reasonable security safeguards.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">7. Governing Law &amp; Jurisdiction</h2>
            <p>
              These Terms shall be governed by, construed, and enforced in accordance with the laws of the Republic of India. In the event of any dispute arising out of or in connection with these Terms, the parties submit to the exclusive jurisdiction of the competent courts of New Delhi, India.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">8. Grievance Officer &amp; Notice</h2>
            <p>
              If you have any questions, concerns, or complaints regarding these Terms or any uploaded content, please contact our designated Grievance Officer at{" "}
              <a href="mailto:akkpk933@gmail.com" className="text-accent hover:underline">
                akkpk933@gmail.com
              </a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
