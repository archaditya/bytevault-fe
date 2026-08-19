"use client";

import { use, useEffect, useState } from "react";
import { Download, File as FileIcon, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";

interface FileMetadata {
  filename: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

export default function PublicSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const fileUrl = `/api/v1/files/public/${id}`;
  const metadataUrl = `/api/v1/files/public/${id}/metadata`;

  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  // Fetch metadata on component mount
  useEffect(() => {
    fetch(metadataUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Shared file not found or access has been restricted");
        }
        return res.json();
      })
      .then((resJson) => {
        if (resJson.status === "success" && resJson.data) {
          setMetadata(resJson.data);
        } else {
          throw new Error("Invalid response format");
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load shared file details");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [metadataUrl]);

  // Determine if it's a text-based/code preview
  const isTextType =
    metadata &&
    (metadata.content_type.startsWith("text/") ||
      metadata.content_type.includes("json") ||
      metadata.content_type.includes("javascript") ||
      metadata.content_type.includes("typescript") ||
      metadata.content_type.includes("xml") ||
      metadata.content_type.includes("csv"));

  // Fetch text content if applicable
  useEffect(() => {
    if (isTextType) {
      setLoadingText(true);
      fetch(`${fileUrl}?inline=true`)
        .then((res) => {
          if (!res.ok) throw new Error("Could not download text content");
          return res.text();
        })
        .then((text) => {
          // Truncate at 100KB to avoid client performance issues
          if (text.length > 100 * 1024) {
            setTextContent(text.substring(0, 100 * 1024) + "\n\n... [Content truncated for preview] ...");
          } else {
            setTextContent(text);
          }
        })
        .catch(() => {
          setTextContent("Preview not available. Please download the file to view its contents.");
        })
        .finally(() => {
          setLoadingText(false);
        });
    }
  }, [isTextType, fileUrl]);

  const handleDownload = () => {
    window.open(fileUrl, "_blank");
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4 md:p-8">
        <div className="flex w-full max-w-4xl flex-col md:flex-row gap-6 rounded-xl border border-border-strong bg-bg-surface p-6 shadow-sm">
          <div className="flex-1 min-h-[400px] bg-bg-raised animate-pulse rounded-lg" />
          <div className="w-full md:w-80 flex flex-col items-center justify-center gap-4 py-8">
            <div className="h-16 w-16 rounded-full bg-accent/10 animate-pulse" />
            <div className="h-6 w-32 bg-border animate-pulse rounded" />
            <div className="h-4 w-48 bg-border animate-pulse rounded" />
            <div className="h-11 w-full bg-border animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4 md:p-8">
        <div className="flex w-full max-w-md flex-col items-center justify-center text-center rounded-xl border border-border-strong bg-bg-surface p-8 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-6">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-ink">Access Denied</h1>
          <p className="mt-2 mb-8 text-[14px] text-ink-muted">
            {error}
          </p>
          <Button onClick={() => window.location.reload()} className="w-full" variant="primary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const mimeType = metadata?.content_type || "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4 md:p-8">
      <div className="flex w-full max-w-4xl flex-col md:flex-row gap-6 rounded-xl border border-border-strong bg-bg-surface p-6 shadow-sm overflow-hidden">
        {/* Left Side: Preview Area */}
        <div className="flex-1 flex flex-col rounded-lg border border-border bg-bg-raised overflow-hidden min-h-[400px] relative">
          <div className="absolute top-0 w-full bg-black/40 backdrop-blur-md p-2 flex items-center justify-center z-10 border-b border-white/10">
            <span className="text-xs font-medium text-white flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> File Preview
            </span>
          </div>

          <div className="flex-1 flex w-full h-full pt-8 min-h-[400px] overflow-hidden">
            {mimeType.startsWith("image/") ? (
              <img
                src={`${fileUrl}?inline=true`}
                alt={metadata?.filename}
                className="w-full h-full object-contain p-4 bg-bg-surface"
              />
            ) : mimeType.startsWith("video/") ? (
              <video
                src={`${fileUrl}?inline=true`}
                controls
                className="w-full h-full object-contain bg-black"
              />
            ) : mimeType.startsWith("audio/") ? (
              <div className="flex-1 flex items-center justify-center p-6 bg-bg-surface">
                <audio src={`${fileUrl}?inline=true`} controls className="w-full max-w-md" />
              </div>
            ) : mimeType === "application/pdf" ? (
              <iframe
                src={`${fileUrl}?inline=true`}
                className="w-full h-full border-none bg-white"
                title="File Preview"
                loading="lazy"
              />
            ) : isTextType ? (
              loadingText ? (
                <div className="flex-1 flex items-center justify-center p-6 text-sm text-ink-muted">
                  Loading preview...
                </div>
              ) : (
                <pre className="flex-1 p-4 text-xs font-mono overflow-auto w-full text-ink bg-bg-surface text-left whitespace-pre-wrap select-text">
                  {textContent}
                </pre>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bg-surface">
                <FileIcon className="h-16 w-16 text-ink-muted mb-4 stroke-[1.5]" />
                <p className="text-sm font-medium text-ink">Preview not available for this file type</p>
                <p className="text-xs text-ink-muted mt-1 max-w-xs">
                  You can download the file to view its contents on your device.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Download Details */}
        <div className="w-full md:w-80 flex flex-col items-center justify-center text-center p-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent-bright mb-6">
            <FileIcon className="h-8 w-8" />
          </div>

          <h1 className="text-xl font-bold text-ink truncate max-w-full px-2" title={metadata?.filename}>
            {metadata?.filename || "Shared File"}
          </h1>
          <p className="mt-2 mb-8 text-[14px] text-ink-muted">
            {metadata ? `${formatBytes(metadata.file_size)} · Ready to view or download` : "Ready to view or download your securely shared file."}
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
            Securely shared via PushPort
          </p>
        </div>
      </div>
    </div>
  );
}
