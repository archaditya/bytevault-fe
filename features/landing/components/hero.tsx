import Link from "next/link";
import { ArrowRight, Inbox, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

// Static illustration of one file in transit: 38 chunks delivered, one in flight.
const CHUNKS = Array.from({ length: 56 }, (_, i) => i);
const DELIVERED = 38;

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 bg-brand-glow" />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-[size:42px_42px] [mask-image:radial-gradient(ellipse_60%_55%_at_30%_0%,black_30%,transparent_100%)]" />

      <div className="container relative pb-20 pt-20 sm:pt-28">
        <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Send large files.
          <span className="block text-ink-muted">Collect them from anyone.</span>
        </h1>

        <div className="mt-8 grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <p className="max-w-md text-[16px] leading-relaxed text-ink-muted">
            Share up to 2 GB with a link that expires on its own, no account needed.
            If your connection drops mid-upload, it picks up from the last chunk that landed.
          </p>

          {/* File in transit: the one thing on this page that moves */}
          <div
            className="rounded-md border border-border bg-bg-surface p-5"
            role="img"
            aria-label="Illustration of a file upload in progress, most chunks delivered"
          >
            <div className="mb-3 flex items-center justify-between text-[12px] text-ink-muted">
              <span className="font-mono">final-cut-v3.mov</span>
              <span className="font-mono">4.2 GB</span>
            </div>
            <div className="grid grid-cols-[repeat(28,minmax(0,1fr))] gap-[3px]">
              {CHUNKS.map((i) => (
                <span
                  key={i}
                  className="aspect-square rounded-[2px] bg-accent"
                  style={{
                    opacity: i < DELIVERED ? 1 : i === DELIVERED ? undefined : 0.16,
                    backgroundColor: i === DELIVERED ? "#FFC53D" : undefined,
                    animation: i === DELIVERED ? "pulse-live 1.4s ease-in-out infinite" : undefined,
                  }}
                />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[12px] text-ink-faint">
              <span>You</span>
              <span>Recipient</span>
            </div>
          </div>
        </div>

        {/* Two paths: one live, one on the way */}
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col rounded-lg border border-accent/40 bg-bg-surface p-6 shadow-glow">
            <div className="flex items-center gap-2 text-[15px] font-medium text-ink">
              <Send className="h-4 w-4 text-accent" strokeWidth={2} />
              Send
            </div>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink-muted">
              Upload a file, get a link. Add a password, limit it to one download,
              and let it delete itself.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/instant">
                  Send a file <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Link
                href="/register"
                className="text-[13px] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
              >
                Create an account to manage files
              </Link>
            </div>
          </div>

          <div className="flex flex-col rounded-lg border border-dashed border-border-strong bg-bg/40 p-6">
            <div className="flex items-center gap-2 text-[15px] font-medium text-ink">
              <Inbox className="h-4 w-4 text-ink-muted" strokeWidth={2} />
              Collect
              <span className="rounded-full border border-border-strong px-2 py-0.5 text-[11px] font-normal text-ink-muted">
                Coming soon
              </span>
            </div>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink-muted">
              Give clients one link to upload files to you. No shared-drive
              permissions, no &ldquo;request access&rdquo; emails.
            </p>
            <div className="mt-5">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/contact?topic=collect">Get notified</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
