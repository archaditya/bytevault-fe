"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertOctagon, RotateCw, Home, MessageSquare } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors for client monitoring
    console.error("ByteVault App Error Boundary caught an exception:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-bg font-sans text-ink">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        {/* Error Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 border border-danger/20 text-danger shadow-lg shadow-danger/5">
          <AlertOctagon className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-danger/10 text-danger border border-danger/20">
            SYSTEM EXCEPTION
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink">
            Something Went Wrong
          </h1>
          <p className="text-xs md:text-sm text-ink-muted leading-relaxed max-w-sm mx-auto">
            An unexpected error occurred while processing your request. You can attempt to retry the operation or return to safety.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full pt-1">
          <Button
            onClick={() => reset()}
            className="flex-1 gap-2 text-xs h-10 bg-accent hover:bg-accent/90 text-white"
          >
            <RotateCw className="h-3.5 w-3.5" /> Try Again
          </Button>

          <Button
            variant="outline"
            asChild
            className="flex-1 gap-2 text-xs h-10 border-border hover:bg-bg-raised text-ink"
          >
            <Link href="/">
              <Home className="h-3.5 w-3.5" /> Return Home
            </Link>
          </Button>
        </div>

        {/* Error Diagnostics / Digest (Safe for user) */}
        {error?.digest && (
          <div className="w-full pt-3">
            <p className="text-[10px] font-mono text-ink-muted/60">
              Error Digest: {error.digest}
            </p>
          </div>
        )}

        {/* Support Help */}
        <div className="w-full pt-4 border-t border-border flex items-center justify-center gap-4 text-xs text-ink-muted">
          <Link href="/contact" className="inline-flex items-center gap-1.5 hover:text-ink transition-colors">
            <MessageSquare className="h-3.5 w-3.5" /> Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
