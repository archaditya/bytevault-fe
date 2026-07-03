"use client";

import { use, useEffect, useState } from "react";
import { Download, File as FileIcon, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublicSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const fileUrl = `/api/v1/files/public/${id}`;

  const [mimeType, setMimeType] = useState<string | null>(null);

  // Fetch only the headers to determine if it's an image/video
  useEffect(() => {
    fetch(fileUrl, { method: "HEAD" })
      .then((res) => setMimeType(res.headers.get("content-type")))
      .catch(() => console.error("Failed to fetch file metadata"));
  }, [fileUrl]);

  const handleDownload = () => {
    window.open(fileUrl, "_blank");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4 md:p-8">
      <div className="flex w-full max-w-4xl flex-col md:flex-row gap-6 rounded-xl border border-border-strong bg-bg-surface p-6 shadow-sm overflow-hidden">
        {/* Left Side: Preview Area */}
        <div className="flex-1 flex flex-col rounded-lg border border-border bg-bg-raised overflow-hidden min-h-[300px] relative">
          <div className="absolute top-0 w-full bg-black/40 backdrop-blur-md p-2 flex items-center justify-center z-10 border-b border-white/10">
            <span className="text-xs font-medium text-white flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> File Preview
            </span>
          </div>

          {mimeType?.startsWith("image/") ? (
            <img
              src={`${fileUrl}?inline=true`}
              alt="Preview"
              className="w-full h-full min-h-[400px] object-contain p-4 bg-bg-surface"
            />
          ) : mimeType?.startsWith("video/") ? (
            <video
              src={`${fileUrl}?inline=true`}
              controls
              className="w-full h-full min-h-[400px] object-contain bg-black"
            />
          ) : (
            <iframe
              src={`${fileUrl}?inline=true`}
              className="w-full h-full min-h-[400px] border-none bg-white"
              title="File Preview"
              loading="lazy"
            />
          )}
        </div>

        {/* Right Side: Download Details */}
        <div className="w-full md:w-80 flex flex-col items-center justify-center text-center p-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent-bright mb-6">
            <FileIcon className="h-8 w-8" />
          </div>

          <h1 className="text-xl font-bold text-ink">Shared File</h1>
          <p className="mt-2 mb-8 text-[14px] text-ink-muted">
            Ready to view or download your securely shared file.
          </p>

          <Button
            onClick={handleDownload}
            className="w-full"
            size="lg"
            variant="primary"
          >
            <Download className="mr-2 h-4 w-4" />
            Download File
          </Button>

          <p className="mt-6 text-[12px] text-ink-faint">
            Securely shared via ByteVault
          </p>
        </div>
      </div>
    </div>
  );
}
