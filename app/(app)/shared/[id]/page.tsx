"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ShareDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/shared" className="inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to shared links
      </Link>

      <Card className="bg-bg-surface border-border-strong">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Link2 className="h-12 w-12 text-ink-faint mb-4" />
          <h2 className="text-lg font-semibold text-ink">Shared link details</h2>
          <p className="mt-2 max-w-sm text-[13px] text-ink-muted">
            Detailed shared link analytics (views, download count, expiration management) will be available once the sharing analytics pipeline is implemented.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
