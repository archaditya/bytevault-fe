"use client";

import Link from "next/link";
import { Box, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center overflow-hidden">
      {/* Decorative blurred backgrounds */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-accent/5 via-transparent to-sky-500/5 blur-2xl" />
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-accent/5 blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-96 w-96 rounded-full bg-sky-500/5 blur-[120px] animate-pulse" />

      {/* Main glass card */}
      <div className="relative z-10 max-w-md w-full border border-border/80 bg-bg-surface/80 p-8 rounded-3xl shadow-2xl backdrop-blur-md flex flex-col items-center gap-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 border border-accent/20">
          <Box className="h-6 w-6 text-accent-bright" />
        </div>
        
        <div className="space-y-2">
          <h1 className="font-mono text-7xl font-bold tracking-tighter text-ink bg-gradient-to-b from-ink to-ink-muted bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-lg font-semibold text-ink">Page Not Found</h2>
          <p className="text-[13px] text-ink-muted leading-relaxed">
            The page you are looking for does not exist, has been removed, or is temporarily unavailable.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-2">
          <Button asChild variant="outline" className="flex-1 gap-2 text-[13px]">
            <Link href="javascript:history.back()">
              <ArrowLeft className="h-4 w-4" /> Go Back
            </Link>
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
