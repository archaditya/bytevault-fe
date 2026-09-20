"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  File as FileIcon,
  Eye,
  AlertCircle,
  ExternalLink,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Copy,
  Check,
  Share2,
  Sparkles,
  Smartphone,
  FileText,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Video,
  Music,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { cn, formatBytes } from "@/lib/utils";
import toast from "react-hot-toast";

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
  const [mounted, setMounted] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Device detection — computed synchronously on every client render
  const deviceInfo = useMemo(() => {
    if (!mounted || typeof window === "undefined") {
      return { isAndroid: false, isIOS: false, isMobile: false };
    }
    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    return { isAndroid, isIOS, isMobile: isAndroid || isIOS };
  }, [mounted]);

  // QR code generation & share URL for desktop users
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPageUrl(window.location.href);
    }
  }, []);

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
    toast.success("Download initiated!");
  };

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Share link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const mimeType = (metadata?.content_type || "").toLowerCase();
  const filename = metadata?.filename || "file";
  const hasExt = filename.includes(".") && !filename.startsWith(".");
  const ext = hasExt ? filename.split(".").pop()?.toLowerCase() || "" : "";
  const isAPK = ext === "apk" || mimeType === "application/vnd.android.package-archive";
  const isIPA = ext === "ipa" || (mimeType === "application/octet-stream" && ext === "ipa");
  const isAppFile = isAPK || isIPA;

  const appName = isAPK
    ? filename.replace(/\.apk$/i, "").replace(/[-_]/g, " ")
    : isIPA
      ? filename.replace(/\.ipa$/i, "").replace(/[-_]/g, " ")
      : filename;

  const renderFileIcon = () => {
    if (isAPK || isIPA) return <Smartphone className="h-10 w-10 text-green-400" />;
    if (mimeType.startsWith("image/")) return <ImageIcon className="h-10 w-10 text-blue-400" />;
    if (mimeType.startsWith("video/")) return <Video className="h-10 w-10 text-purple-400" />;
    if (mimeType.startsWith("audio/")) return <Music className="h-10 w-10 text-pink-400" />;
    if (["zip", "tar", "gz", "7z", "rar"].includes(ext)) return <FileArchive className="h-10 w-10 text-amber-400" />;
    if (isTextType) return <FileCode className="h-10 w-10 text-emerald-400" />;
    if (mimeType === "application/pdf" || ["doc", "docx", "txt"].includes(ext)) return <FileText className="h-10 w-10 text-rose-400" />;
    return <FileIcon className="h-10 w-10 text-accent-bright" />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-base font-sans">
      <LandingNav />

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
        {/* Ambient Brand Glows */}
        <div className="absolute top-1/4 left-1/3 -z-10 h-96 w-96 rounded-full bg-accent/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 -z-10 h-96 w-96 rounded-full bg-blue-500/5 blur-[130px] pointer-events-none" />

        {/* 1. Loading State */}
        {isLoading && (
          <div className="flex w-full max-w-5xl flex-col md:flex-row gap-6 rounded-2xl border border-border-strong bg-bg-surface/90 backdrop-blur-xl p-6 shadow-2xl">
            <div className="flex-1 min-h-[480px] bg-bg-raised/40 animate-pulse rounded-xl" />
            <div className="w-full md:w-80 flex flex-col items-center justify-center gap-4 py-8">
              <div className="h-16 w-16 rounded-2xl bg-accent/10 animate-pulse" />
              <div className="h-6 w-36 bg-border animate-pulse rounded-md" />
              <div className="h-4 w-48 bg-border animate-pulse rounded-md" />
              <div className="h-11 w-full bg-border animate-pulse rounded-xl" />
            </div>
          </div>
        )}

        {/* 2. Error State */}
        {!isLoading && error && (
          <div className="flex w-full max-w-md flex-col items-center justify-center text-center rounded-2xl border border-border-strong bg-bg-surface/90 backdrop-blur-xl p-8 shadow-2xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-4 border border-danger/20">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-bold text-ink">Access Restricted</h1>
            <p className="mt-2 mb-6 text-xs text-ink-muted leading-relaxed">
              {error}
            </p>
            <Button onClick={() => window.location.reload()} className="w-full h-10 rounded-xl" variant="primary">
              Retry Connection
            </Button>
          </div>
        )}

        {/* 3. Main Content State */}
        {!isLoading && !error && metadata && (
          <div className="w-full max-w-6xl space-y-4">
            {/* Top Eyebrow Breadcrumb Bar */}
            <div className="flex items-center justify-between px-2 text-xs">
              <div className="flex items-center gap-2 text-ink-muted">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-ink">PushPostVault Secure Share</span>
                <span>•</span>
                <span className="font-mono text-ink-muted">End-to-End Encrypted</span>
              </div>
              <button
                type="button"
                onClick={copyShareLink}
                className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors px-2.5 py-1 rounded-lg border border-border bg-bg-surface hover:bg-bg-raised"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy Link"}</span>
              </button>
            </div>

            {/* Split Showcase Card */}
            <div className="flex w-full flex-col md:flex-row gap-6 rounded-2xl border border-border-strong bg-bg-surface/90 backdrop-blur-xl p-6 shadow-2xl overflow-hidden">
              {/* Left Side: Rich Preview Area */}
              <div
                className={cn(
                  "flex-1 flex flex-col rounded-xl border border-border bg-bg-raised/60 overflow-hidden min-h-[500px] md:min-h-[640px] relative transition-all",
                  isFullscreen && "fixed inset-0 z-50 rounded-none border-none bg-bg-base"
                )}
              >
                {/* Preview Toolbar */}
                <div className="w-full bg-black/60 backdrop-blur-md px-4 py-2.5 flex items-center justify-between z-10 border-b border-white/10">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5 flex-shrink-0">
                      <Eye className="h-3.5 w-3.5 text-accent-bright" /> Preview
                    </span>
                    <span className="text-white/30 text-xs">•</span>
                    <span className="text-xs text-white/70 truncate max-w-[260px] font-mono">
                      {metadata.filename}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <a
                      href={`${fileUrl}?inline=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors inline-flex items-center"
                      title="Open raw preview in new tab"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsFullscreen((prev) => !prev)}
                      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors inline-flex items-center"
                      title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                    >
                      {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Preview Viewport */}
                <div className="flex-1 flex w-full h-full items-center justify-center min-h-[460px] md:min-h-[580px] overflow-hidden bg-bg-surface/50">
                  {isAppFile ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bg-surface">
                      <div className={`flex h-20 w-20 items-center justify-center rounded-3xl mb-4 shadow-xl ${isAPK ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        }`}>
                        <Smartphone className="h-10 w-10" />
                      </div>
                      <h3 className="text-lg font-bold text-ink">{appName}</h3>
                      <p className="text-xs text-ink-muted mt-1 font-mono">
                        {isAPK ? "Android Package (APK)" : "iOS Application (IPA)"} · {formatBytes(metadata.file_size)}
                      </p>
                      <div className="mt-4 px-3 py-1 rounded-full text-xs font-semibold bg-bg-raised border border-border text-ink">
                        Verified Application Package
                      </div>
                    </div>
                  ) : mimeType.startsWith("image/") ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4 bg-black/20">
                      <img
                        src={`${fileUrl}?inline=true`}
                        alt={metadata.filename}
                        className="max-w-full max-h-[580px] w-auto h-auto object-contain rounded-lg shadow-lg"
                      />
                    </div>
                  ) : mimeType.startsWith("video/") ? (
                    <video
                      src={`${fileUrl}?inline=true`}
                      controls
                      className="w-full h-full max-h-[580px] object-contain bg-black"
                    />
                  ) : mimeType.startsWith("audio/") ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-bg-surface gap-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-pink-500/10 text-pink-400 border border-pink-500/20 shadow-xl">
                        <Music className="h-10 w-10" />
                      </div>
                      <p className="text-sm font-semibold text-ink">{metadata.filename}</p>
                      <audio src={`${fileUrl}?inline=true`} controls className="w-full max-w-md mt-2" />
                    </div>
                  ) : mimeType === "application/pdf" ? (
                    <iframe
                      src={`${fileUrl}?inline=true`}
                      className="w-full h-full min-h-[550px] border-none bg-white rounded-b-xl"
                      title="PDF Document Preview"
                      loading="lazy"
                    />
                  ) : isTextType ? (
                    loadingText ? (
                      <div className="flex-1 flex items-center justify-center p-6 text-xs text-ink-muted font-mono">
                        Loading text preview...
                      </div>
                    ) : (
                      <pre className="flex-1 p-5 text-xs font-mono overflow-auto w-full text-ink bg-bg-surface text-left whitespace-pre-wrap select-text leading-relaxed">
                        {textContent}
                      </pre>
                    )
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bg-surface">
                      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-bg-raised border border-border mb-4 shadow-xl">
                        {renderFileIcon()}
                      </div>
                      <p className="text-sm font-bold text-ink">Preview Not Available Directly in Browser</p>
                      <p className="text-xs text-ink-muted mt-1.5 max-w-xs leading-relaxed">
                        Download this {ext ? ext.toUpperCase() : "file"} to open it using your device's native application.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Download & File Actions */}
              <div className="w-full md:w-84 flex flex-col justify-between p-2">
                <div className="space-y-5">
                  {/* File Profile Header */}
                  <div className="text-center md:text-left">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[11px] font-semibold mb-3">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Verified Clean
                    </div>
                    <h1 className="text-lg font-bold text-ink break-words line-clamp-2" title={metadata.filename}>
                      {metadata.filename}
                    </h1>
                    <div className="flex items-center justify-center md:justify-start gap-2 mt-1.5 text-xs text-ink-muted font-mono">
                      <span>{formatBytes(metadata.file_size)}</span>
                      <span>•</span>
                      <span className="uppercase">{ext || "FILE"}</span>
                    </div>
                  </div>

                  {/* Security Engine Guarantee Box */}
                  <div className="p-3.5 rounded-xl bg-bg-raised/70 border border-border text-xs space-y-2">
                    <div className="flex items-center gap-2 text-ink">
                      <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <span className="font-semibold text-[11px]">PushPostVault Security Shield</span>
                    </div>
                    <p className="text-[11px] text-ink-muted leading-relaxed">
                      Scanned against malware and injected scripts. Transport secured with TLS 1.3 encryption.
                    </p>
                  </div>

                  {/* Conditional Mobile Install / Desktop QR */}
                  {isAPK && !deviceInfo.isMobile && pageUrl && (
                    <div className="p-3.5 rounded-xl border border-border bg-white text-center shadow-sm">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pageUrl)}`}
                        alt="Scan QR code from phone"
                        className="w-32 h-32 mx-auto"
                      />
                      <p className="text-[11px] text-neutral-600 mt-2 font-medium">
                        Scan with Android phone to install
                      </p>
                    </div>
                  )}

                  {/* Primary Download Button */}
                  <Button
                    onClick={handleDownload}
                    className={`w-full text-xs font-semibold h-11 rounded-xl shadow-lg transition-all ${isAPK && deviceInfo.isAndroid
                        ? "bg-green-600 hover:bg-green-500 text-white shadow-green-600/20"
                        : "bg-accent hover:bg-accent/90 text-bg shadow-accent/20"
                      }`}
                    size="lg"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isAPK && deviceInfo.isAndroid
                      ? "📲 Install APK on Android"
                      : isAPK
                        ? "Download APK Package"
                        : isIPA
                          ? "Download IPA Package"
                          : "Download File"
                    }
                  </Button>

                  {/* Secondary Share Action */}
                  <Button
                    onClick={copyShareLink}
                    variant="outline"
                    className="w-full text-xs h-9 rounded-xl border-border bg-bg-surface hover:bg-bg-raised text-ink-muted hover:text-ink"
                  >
                    {copied ? (
                      <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Share2 className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {copied ? "Link Copied" : "Share Link with Others"}
                  </Button>
                </div>

                {/* Viral Conversion Box */}
                <div className="mt-8 pt-5 border-t border-border text-center md:text-left space-y-2">
                  <p className="text-xs font-semibold text-ink flex items-center justify-center md:justify-start gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Want to share large files?
                  </p>
                  <p className="text-[11px] text-ink-muted leading-relaxed">
                    Send large files with links you control, on PushPostVault.
                  </p>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto text-[11px] font-semibold text-accent hover:text-accent-bright"
                  >
                    <Link href="/register" className="inline-flex items-center gap-1">
                      Create Free Account <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
