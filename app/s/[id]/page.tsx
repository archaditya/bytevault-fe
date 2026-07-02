"use client";

import { use } from "react";
import { Download, File as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";


export default function PublicSharePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const handleDownload = () => {
    window.open(`/api/v1/files/public/${id}`, "_blank");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-xl border border-border-strong bg-bg-surface p-8 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent-bright">
          <FileIcon className="h-8 w-8" />
        </div>
        
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold text-ink">
            Shared File
          </h1>
          <p className="mt-2 text-[14px] text-ink-muted">
            Ready to download your securely shared file.
          </p>
        </div>

        <Button onClick={handleDownload} className="w-full" size="lg">
          <Download className="mr-2 h-4 w-4" />
          Download File
        </Button>

        <p className="mt-4 text-[12px] text-ink-faint">
          Securely shared via ByteVault
        </p>
      </div>
    </div>
  );
}
