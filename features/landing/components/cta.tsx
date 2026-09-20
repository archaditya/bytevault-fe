import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="py-24">
      <div className="container">
        <div className="relative overflow-hidden rounded-lg border border-border bg-bg-surface px-8 py-16 text-center">
          <div className="pointer-events-none absolute inset-0 bg-brand-glow" />
          <div className="relative">
            <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Send your first file now.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[14px] text-ink-muted">
              No account needed. Create one later if you want to keep and manage your files.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/instant">
                  Send a file <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/register">Create free account</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
