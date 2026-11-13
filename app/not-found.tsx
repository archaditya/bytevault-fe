"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Box, ArrowLeft, Home, Zap } from "lucide-react";
import { useAuthStore } from "@/store";

export default function NotFound() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-bg font-sans text-ink">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        {/* Animated Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 border border-accent/20 text-accent shadow-lg shadow-accent/5">
          <Box className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-bg-raised border border-border text-ink-muted">
            ERROR 404
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink">
            Page Not Found
          </h1>
          <p className="text-xs md:text-sm text-ink-muted leading-relaxed max-w-sm mx-auto">
            The link you followed may be broken, the file transfer may have expired, or the page does not exist.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full pt-1">
          <Button
            variant="outline"
            className="flex-1 gap-2 text-xs h-10 border-border hover:bg-bg-raised text-ink"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Go Back
          </Button>

          <Button asChild className="flex-1 gap-2 text-xs h-10 bg-accent hover:bg-accent/90 text-white">
            <Link href={isAuthenticated ? "/files" : "/"}>
              <Home className="h-3.5 w-3.5" />
              {isAuthenticated ? "My Files" : "Home Page"}
            </Link>
          </Button>
        </div>

        {/* Helpful Alternatives */}
        <div className="w-full pt-4 border-t border-border flex items-center justify-center gap-4 text-xs text-ink-muted">
          <Link
            href="/instant"
            className="inline-flex items-center gap-1.5 hover:text-accent transition-colors"
          >
            <Zap className="h-3 w-3 text-accent" /> Instant Share
          </Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-ink transition-colors">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
