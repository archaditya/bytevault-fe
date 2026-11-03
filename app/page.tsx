import { LandingNav } from "@/features/landing/components/landing-nav";
import { Hero } from "@/features/landing/components/hero";
import { Features } from "@/features/landing/components/features";
import { Collect } from "@/features/landing/components/collect";
import { TransferEngineShowcase } from "@/features/landing/components/transfer-engine-showcase";
import { LiveShareShowcase } from "@/features/landing/components/live-share-showcase";
import { UseCases } from "@/features/landing/components/use-cases";
import { FAQ } from "@/features/landing/components/faq";
import { CTA } from "@/features/landing/components/cta";
import { Footer } from "@/features/landing/components/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg">
      <LandingNav />
      <Hero />
      <div id="send">
        <Features />
      </div>
      <div id="collect">
        <Collect />
      </div>
      <TransferEngineShowcase />
      <LiveShareShowcase />
      <UseCases />
      <div id="faq">
        <FAQ />
      </div>
      <CTA />
      <Footer />
    </div>
  );
}
