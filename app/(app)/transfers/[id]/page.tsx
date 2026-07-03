"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft, ArrowUpDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TransferDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to dashboard
      </Link>

      <Card className="bg-bg-surface border-border-strong">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <ArrowUpDown className="h-12 w-12 text-ink-faint mb-4" />
          <h2 className="text-lg font-semibold text-ink">Transfer tracking coming soon</h2>
          <p className="mt-2 max-w-sm text-[13px] text-ink-muted">
            Chunk-level transfer monitoring, speed graphs, and timeline views will be available here once the transfer pipeline is implemented.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
