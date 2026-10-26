import { Metadata } from "next";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — PushPostVault",
  description: "Privacy Notice and Data Protection commitments under India's Digital Personal Data Protection Act, 2023.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink font-sans">
      <LandingNav />
      <main className="flex-1 container py-16 max-w-3xl">
        <div className="border-b border-border pb-6 mb-8">
          <p className="label-eyebrow text-accent">Compliance &amp; Transparency</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink mt-2">Privacy Policy &amp; Notice</h1>
          <p className="text-[13px] text-ink-muted mt-2">
            Last updated: October 2026 &bull; Digital Personal Data Protection Act (DPDP Act), 2023 Compliant
          </p>
        </div>

        <div className="space-y-8 text-[14px] leading-relaxed text-ink-muted">
          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">1. Introduction &amp; Data Fiduciary Overview</h2>
            <p>
              PushPostVault (&ldquo;ByteVault&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) respects your privacy and is dedicated to protecting your personal data. This Privacy Policy acts as our statutory Privacy Notice pursuant to Section 5 of India&apos;s Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.
            </p>
            <p className="mt-2">
              This notice outlines what personal data we collect, why we collect it, how long we retain it, who we share it with, and your statutory rights regarding your information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">2. Personal Data We Collect</h2>
            <p>We only collect personal data necessary to provide and secure our cloud storage and high-speed file transfer services:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5">
              <li><strong className="text-ink">Account &amp; Profile Data:</strong> First name, last name, and email address when you register.</li>
              <li><strong className="text-ink">Authentication &amp; Security:</strong> Hashed passwords (via bcrypt), two-factor authentication (TOTP) configurations, and active session tokens.</li>
              <li><strong className="text-ink">Uploaded Files &amp; Storage Data:</strong> Names of uploaded files, MIME types, file sizes, folder structures, and storage keys.</li>
              <li><strong className="text-ink">Device &amp; Telemetry Data:</strong> IP addresses, browser user-agent, device identifiers, and Firebase Cloud Messaging (FCM) tokens for web notifications.</li>
              <li><strong className="text-ink">Billing &amp; Transaction Identifiers:</strong> Razorpay order IDs, subscription IDs, and payment verification signatures. We never store credit/debit card numbers or CVVs on our servers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">3. Purpose of Processing &amp; Lawful Basis</h2>
            <p>We process your personal data solely for specific, legitimate purposes based on your explicit consent:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5">
              <li><strong className="text-ink">Service Delivery:</strong> Uploading, storing, encrypting, and transferring files at your direction.</li>
              <li><strong className="text-ink">Account Management:</strong> Authentication, multi-factor verification, and password resets.</li>
              <li><strong className="text-ink">Billing &amp; Subscriptions:</strong> Provisioning storage quotas (5GB Free tier or upgraded tiers) and processing renewals via Razorpay.</li>
              <li><strong className="text-ink">Security &amp; Abuse Prevention:</strong> Rate limiting, bot mitigation, egress bandwidth tracking, and ensuring system vitals stability.</li>
              <li><strong className="text-ink">Statutory Compliance:</strong> Maintaining cybersecurity incident logs and consent records as required by CERT-In and Indian law.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">4. Third-Party Data Processors</h2>
            <p>We do not sell, rent, or trade your personal data. We engage contracted third-party processors under strict security standards:</p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-[13px] border border-border rounded-md">
                <thead className="bg-bg-surface text-ink font-medium border-b border-border">
                  <tr>
                    <th className="p-2.5">Processor</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">Data Handled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-2.5 font-medium text-ink">Cloudflare R2 / S3</td>
                    <td className="p-2.5">Encrypted Object Storage</td>
                    <td className="p-2.5">Encrypted file payloads &amp; avatars</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-ink">Razorpay</td>
                    <td className="p-2.5">Payment Gateway</td>
                    <td className="p-2.5">Subscription billing &amp; tax invoicing</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-ink">Brevo (Sendinblue)</td>
                    <td className="p-2.5">Transactional Email</td>
                    <td className="p-2.5">Email verification OTPs &amp; invoices</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-ink">PostgreSQL / Redis</td>
                    <td className="p-2.5">Infrastructure / DB</td>
                    <td className="p-2.5">Session tokens, user metadata, audit records</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">5. Data Retention &amp; &ldquo;Delete When Done&rdquo;</h2>
            <p>
              In alignment with the DPDP principle of storage limitation (&ldquo;Delete when done&rdquo;), we only retain personal data as long as your account remains active or as required by law.
            </p>
            <p className="mt-2">
              You can permanently erase your account at any time via <Link href="/settings?tab=security" className="text-accent hover:underline">Settings &gt; Data &amp; Privacy</Link>. Account deletion immediately cascades: your database records are removed, stored files are permanently deleted from Cloudflare R2 storage, active sessions are invalidated, and recurring subscriptions are cancelled.
            </p>
            <p className="mt-2 text-[12px] text-ink-faint">
              Note: System security logs and audit trails are retained for a minimum of 1 year in accordance with CERT-In directions and the DPDP Rules 2025.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">6. Your Rights Under the DPDP Act, 2023</h2>
            <p>You have the following enforceable statutory rights:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5">
              <li><strong className="text-ink">Right to Access / Summary:</strong> You can request a summary of the personal data we hold and export your data in structured JSON format via Settings.</li>
              <li><strong className="text-ink">Right to Correction &amp; Updating:</strong> You can edit your profile information in Settings at any time.</li>
              <li><strong className="text-ink">Right to Erasure:</strong> You can permanently delete your account and all associated cloud files.</li>
              <li><strong className="text-ink">Right to Withdraw Consent:</strong> You can withdraw optional consents (e.g., marketing communications, optional telemetry) without affecting core service access.</li>
              <li><strong className="text-ink">Right to Nominate:</strong> You have the right to nominate another individual who, in the event of death or incapacity, may exercise your data rights.</li>
              <li><strong className="text-ink">Right to Grievance Redressal:</strong> You can submit a complaint to our Grievance Officer and receive acknowledgement within 48 hours.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">7. Children&apos;s Data (Under 18)</h2>
            <p>
              PushPostVault is intended solely for users aged 18 and older. We do not knowingly collect personal data from minors. During account registration, users must confirm that they are at least 18 years of age. If we learn that personal data of an individual under 18 has been collected without verifiable parental consent, we will promptly purge the data and terminate the account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">8. Grievance Officer &amp; Dispute Redressal</h2>
            <p>
              In compliance with Section 8(9) of the DPDP Act, 2023 and Rule 5(9) of the IT Rules, 2011, you may direct any privacy questions, rights requests, or data grievances to our designated Grievance Officer:
            </p>
            <div className="mt-3 bg-bg-surface border border-border p-4 rounded-md text-[13px] space-y-1">
              <p><strong className="text-ink">Grievance Officer:</strong> Archaditya (Data Protection Lead)</p>
              <p><strong className="text-ink">Entity:</strong> PushPostVault / ByteVault</p>
              <p><strong className="text-ink">Email:</strong> <a href="mailto:akkpk933@gmail.com" className="text-accent hover:underline">akkpk933@gmail.com</a></p>
              <p><strong className="text-ink">Redressal Timelines:</strong> Acknowledged within 48 hours; resolved within 30 days.</p>
              <p className="pt-2 text-[12px] text-ink-muted">
                If your grievance is not resolved satisfactorily, you hold the statutory right to escalate the matter to the <strong className="text-ink">Data Protection Board of India (DPBI)</strong>.
              </p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
