import Link from "next/link";
import { Check, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Collect() {
  return (
    <section className="border-b border-border py-20">
      <div className="container grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Preview of the page a client would see */}
        <div className="order-2 lg:order-1">
          <div className="rounded-lg border border-border bg-bg-surface p-5">
            <div className="mb-4 flex items-center justify-between text-[12px] text-ink-faint">
              <span>What your client sees</span>
              <span className="rounded-full border border-border-strong px-2 py-0.5 text-ink-muted">Preview</span>
            </div>
            <div className="rounded-md border border-dashed border-border-strong px-6 py-8 text-center">
              <UploadCloud className="mx-auto h-6 w-6 text-accent" strokeWidth={1.75} />
              <p className="mt-3 text-[14px] font-medium text-ink">Upload your files</p>
              <p className="mt-1 text-[12px] text-ink-muted">Up to 2 GB per file. This link expires in 7 days.</p>
            </div>
            <ul className="mt-4 space-y-2 text-[13px]">
              <li className="flex items-center justify-between rounded-md bg-bg-raised px-3 py-2">
                <span className="font-mono text-ink">brand-assets.zip</span>
                <span className="flex items-center gap-1.5 text-success">
                  <Check className="h-3.5 w-3.5" /> Sent
                </span>
              </li>
              <li className="flex items-center justify-between rounded-md bg-bg-raised px-3 py-2">
                <span className="font-mono text-ink">signed-contract.pdf</span>
                <span className="flex items-center gap-1.5 text-success">
                  <Check className="h-3.5 w-3.5" /> Sent
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <span className="rounded-full border border-border-strong px-2.5 py-0.5 text-[12px] text-ink-muted">
            Coming soon
          </span>
          <h2 className="mt-4 max-w-md text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Ask for files without asking for accounts.
          </h2>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-ink-muted">
            Send your client one link. They drop their files in and you receive them.
            No shared folders to set up, no permissions to approve.
          </p>
          <ul className="mt-6 space-y-2.5 text-[14px] text-ink-muted">
            <li className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> Set a size limit and an expiry date
            </li>
            <li className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> Uploaders never need to create an account
            </li>
            <li className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> Everything lands in your dashboard
            </li>
          </ul>
          <div className="mt-7">
            <Button variant="secondary" asChild>
              <Link href="/contact?topic=collect">Notify me when it&rsquo;s ready</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
