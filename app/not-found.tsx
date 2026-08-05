"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Box, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-bg font-sans">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
          <Box className="h-7 w-7 text-accent" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-4xl font-bold tracking-tight text-ink font-mono">404</h1>
          <h2 className="text-lg font-semibold text-ink">Page Not Found</h2>
          <p className="text-[13px] text-ink-muted leading-relaxed">
            The page you are looking for does not exist, has been removed, or is temporarily unavailable.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-2">
          <Button
            variant="outline"
            className="flex-1 gap-2 text-[13px]"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
          <Button asChild className="flex-1 gap-2 text-[13px]">
            <Link href="/dashboard">
              <Home className="h-4 w-4" /> Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
