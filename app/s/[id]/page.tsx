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
  const contentType = metadata?.content_type?.toLowerCase() || "";
  const isTextType =
    Boolean(metadata) &&
    (contentType.startsWith("text/") ||
      contentType.includes("json") ||
      contentType.includes("javascript") ||
      contentType.includes("typescript") ||
      contentType.includes("xml") ||
      contentType.includes("csv"));

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

  if (!metadata) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4 md:p-8">
        <div className="flex w-full max-w-md flex-col items-center justify-center text-center rounded-xl border border-border-strong bg-bg-surface p-8 shadow-sm">
          <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-ink">File Not Found</h1>
          <p className="mt-2 text-sm text-ink-muted">The requested file metadata could not be loaded.</p>
        </div>
      </div>
    );
  }

  const mimeType = (metadata.content_type || "").toLowerCase();
  const filename = metadata.filename || "file";
  const hasExt = filename.includes(".") && !filename.startsWith(".");
  const ext = hasExt ? filename.split(".").pop()?.toLowerCase() || "" : "";
  const isAPK = ext === "apk" || mimeType === "application/vnd.android.package-archive";
  const isIPA = ext === "ipa" || (mimeType === "application/octet-stream" && ext === "ipa");
  const isAppFile = isAPK || isIPA;

  // Device detection (client-side only)
  const [deviceInfo, setDeviceInfo] = useState({ isAndroid: false, isIOS: false, isMobile: false });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    setDeviceInfo({ isAndroid, isIOS, isMobile: isAndroid || isIOS });
  }, []);

  // QR code generation for desktop users
  const [pageUrl, setPageUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPageUrl(window.location.href);
    }
  }, []);

  const appName = isAPK
    ? filename.replace(/\.apk$/i, "").replace(/[-_]/g, " ")
    : isIPA
      ? filename.replace(/\.ipa$/i, "").replace(/[-_]/g, " ")
      : filename;

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
            {isAppFile ? (
              /* App file: show branded install preview */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bg-surface">
                <div className={`flex h-20 w-20 items-center justify-center rounded-2xl mb-6 ${
                  isAPK ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"
                }`}>
                  {isAPK ? (
                    <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/>
                    </svg>
                  ) : (
                    <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  )}
                </div>
                <p className="text-lg font-bold text-ink">{appName}</p>
                <p className="text-xs text-ink-muted mt-1">
                  {isAPK ? "Android Application" : "iOS Application"} · {metadata ? formatBytes(metadata.file_size) : ""}
                </p>
                <div className={`mt-4 px-3 py-1 rounded-full text-xs font-medium ${
                  isAPK ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"
                }`}>
                  {isAPK ? "APK Package" : "IPA Package"}
                </div>
              </div>
            ) : mimeType.startsWith("image/") ? (
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

        {/* Right Side: Download / Install Details */}
        <div className="w-full md:w-80 flex flex-col items-center justify-center text-center p-4">
          {isAPK && deviceInfo.isAndroid ? (
            /* Android APK on Android device — Install Card */
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500 mb-4">
                <Download className="h-8 w-8" />
              </div>
              <h1 className="text-xl font-bold text-ink">{appName}</h1>
              <p className="mt-1 mb-4 text-[13px] text-ink-muted">
                {metadata ? formatBytes(metadata.file_size) : ""} · Android App
              </p>
              <Button
                onClick={handleDownload}
                className="w-full !bg-green-600 hover:!bg-green-700 !text-white"
                size="lg"
              >
                📲 Install App
              </Button>
              <div className="mt-4 text-left w-full space-y-2">
                <p className="text-[11px] text-ink-muted font-medium uppercase tracking-wider">How to install:</p>
                <div className="space-y-1.5">
                  {["Tap \"Install App\" to download", "Open the downloaded file", "If prompted, tap \"Allow from this source\"", "Tap \"Install\" to complete"].map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-[12px] text-ink-muted">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center text-[10px] font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : isAPK && !deviceInfo.isMobile ? (
            /* APK on desktop — Show QR code */
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500 mb-4">
                <FileIcon className="h-8 w-8" />
              </div>
              <h1 className="text-xl font-bold text-ink">{appName}</h1>
              <p className="mt-1 mb-4 text-[13px] text-ink-muted">
                {metadata ? formatBytes(metadata.file_size) : ""} · Android App
              </p>
              {pageUrl && (
                <div className="mb-4 p-3 rounded-lg border border-border bg-white">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pageUrl)}`}
                    alt="QR Code - Scan from Android"
                    className="w-40 h-40 mx-auto"
                  />
                </div>
              )}
              <p className="text-[12px] text-ink-muted mb-4">
                Scan this QR code from your Android device to install
              </p>
              <Button onClick={handleDownload} className="w-full" size="lg" variant="primary">
                <Download className="mr-2 h-4 w-4" />
                Download APK
              </Button>
            </>
          ) : isIPA ? (
            /* IPA file — Download with guidance */
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 mb-4">
                <FileIcon className="h-8 w-8" />
              </div>
              <h1 className="text-xl font-bold text-ink">{appName}</h1>
              <p className="mt-1 mb-4 text-[13px] text-ink-muted">
                {metadata ? formatBytes(metadata.file_size) : ""} · iOS App
              </p>
              <Button onClick={handleDownload} className="w-full" size="lg" variant="primary">
                <Download className="mr-2 h-4 w-4" />
                Download IPA
              </Button>
              <p className="mt-3 text-[11px] text-ink-muted">
                Transfer this file to your iPhone using AltStore, Sideloadly, or a similar tool.
              </p>
              <div className="mt-2 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-medium">
                Direct install coming in v2
              </div>
            </>
          ) : (
            /* Default: Standard download */
            <>
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
            </>
          )}

          <p className="mt-6 text-[12px] text-ink-faint">
            Securely shared via PushPort
          </p>
        </div>
      </div>
    </div>
  );
}
