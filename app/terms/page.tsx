import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <LandingNav />
      <main className="flex-1 container py-16 max-w-3xl text-ink font-sans">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Terms and Conditions</h1>
        
        <div className="space-y-6 text-[14px] leading-relaxed text-ink-muted">
          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">1. Terms</h2>
            <p>
              By accessing the website at PushPort, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">2. Use License</h2>
            <p>
              Permission is granted to temporarily download one copy of the materials (information or software) on PushPort's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not modify or copy the materials.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">3. Disclaimer</h2>
            <p>
              The materials on PushPort's website are provided on an 'as is' basis. PushPort makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">4. Limitations</h2>
            <p>
              In no event shall PushPort or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on PushPort's website, even if PushPort or a PushPort authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">5. Accuracy of materials</h2>
            <p>
              The materials appearing on PushPort's website could include technical, typographical, or photographic errors. PushPort does not warrant that any of the materials on its website are accurate, complete or current. PushPort may make changes to the materials contained on its website at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-2">6. Links</h2>
            <p>
              PushPort has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by PushPort of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
