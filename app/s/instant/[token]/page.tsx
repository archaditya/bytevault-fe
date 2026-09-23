"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Lock,
  File as FileIcon,
  FileText,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Video,
  Music,
  AlertTriangle,
  Clock,
  Loader2,
  Eye,
  ExternalLink,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Copy,
  Check,
  Share2,
  Sparkles,
  ArrowRight,
  Smartphone,
} from "lucide-react";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { cn, formatBytes } from "@/lib/utils";
import toast from "react-hot-toast";

interface EphemeralShare {
  filename: string;
  file_size: number;
  content_type?: string;
  max_downloads: number;
  download_count: number;
  has_password: boolean;
  preview_url?: string;
}

export default function InstantSharePage() {
  const params = useParams();
  const token = (params?.token as string) || "";

  const [share, setShare] = useState<EphemeralShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [burned, setBurned] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [unlockedPreviewUrl, setUnlockedPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setPageUrl(window.location.href);
    }
  }, []);

  const deviceInfo = useMemo(() => {
    if (!mounted || typeof window === "undefined") {
      return { isAndroid: false, isIOS: false, isMobile: false };
    }
    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    return { isAndroid, isIOS, isMobile: isAndroid || isIOS };
  }, [mounted]);

  useEffect(() => {
    if (!token) {
      setBurned(true);
      setLoading(false);
      return;
    }

    fetch(`/api/v1/ephemeral/metadata/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("File expired or unavailable");
        }
        return res.json();
      })
      .then((json) => {
        const shareData = json?.data?.share;
        if (
          shareData &&
          typeof shareData.filename === "string" &&
          typeof shareData.file_size === "number"
        ) {
          setShare(shareData);
          if (shareData.preview_url) {
            setUnlockedPreviewUrl(shareData.preview_url);
          }
        } else {
          setBurned(true);
        }
      })
      .catch(() => {
        setBurned(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const safeFilename = share?.filename || "";
  const hasExt = safeFilename.includes(".") && !safeFilename.startsWith(".");
  const ext = hasExt ? safeFilename.split(".").pop()?.toLowerCase() || "" : "";
  const mimeType = (share?.content_type || "").toLowerCase();

  const isAPK = ext === "apk" || mimeType === "application/vnd.android.package-archive";
  const isIPA = ext === "ipa" || (mimeType === "application/octet-stream" && ext === "ipa");
  const isAppFile = isAPK || isIPA;
  const appName = isAPK
    ? safeFilename.replace(/\.apk$/i, "").replace(/[-_]/g, " ")
    : isIPA
      ? safeFilename.replace(/\.ipa$/i, "").replace(/[-_]/g, " ")
      : safeFilename;

  const isTextType = useMemo(() => {
    return (
      mimeType.startsWith("text/") ||
      mimeType.includes("json") ||
      mimeType.includes("javascript") ||
      mimeType.includes("typescript") ||
      mimeType.includes("xml") ||
      mimeType.includes("csv") ||
      ["txt", "md", "json", "js", "ts", "jsx", "tsx", "py", "go", "html", "css", "yaml", "yml", "sql", "sh", "csv"].includes(ext)
    );
  }, [mimeType, ext]);

  const previewUrl = unlockedPreviewUrl || share?.preview_url;

  // Fetch text content if applicable and preview URL is accessible
  useEffect(() => {
    if (isTextType && previewUrl) {
      setLoadingText(true);
      fetch(previewUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Could not download text content");
          return res.text();
        })
        .then((text) => {
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
  }, [isTextType, previewUrl]);

  const handleDownload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) return;
    setDownloading(true);

    try {
      const res = await fetch(`/api/v1/ephemeral/download/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password || undefined }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.error || "Download failed. Please verify passcode.");
      }

      const downloadUrl = json?.data?.download_url;
      if (!downloadUrl) {
        throw new Error("Invalid download URL received");
      }

      setUnlockedPreviewUrl(downloadUrl);

      // Trigger browser download via invisible link
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = share?.filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadStarted(true);
      toast.success(isAPK ? "APK Download started" : "Download started");

      // Update remaining download count locally
      setShare((prev) => {
        if (!prev) return prev;
        const newCount = prev.download_count + 1;
        // For mobile APKs, delay transition to give large packages time to download and display installation guidance.
        const burnDelay = isAPK && deviceInfo.isAndroid ? 60000 : 1500;
        if (newCount >= prev.max_downloads) {
          setTimeout(() => setBurned(true), burnDelay);
        }
        return { ...prev, download_count: newCount };
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to download");
    } finally {
      setDownloading(false);
    }
  };

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Instant share link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderFileIcon = () => {
    const cls = "h-10 w-10 text-accent";
    if (isAPK || isIPA) {
      return <Smartphone className="h-10 w-10 text-green-400" />;
    }
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext) || mimeType.startsWith("image/")) {
      return <ImageIcon className="h-10 w-10 text-blue-400" />;
    }
    if (["mp4", "mkv", "webm", "mov"].includes(ext) || mimeType.startsWith("video/")) {
      return <Video className="h-10 w-10 text-purple-400" />;
    }
    if (["mp3", "wav", "flac", "ogg"].includes(ext) || mimeType.startsWith("audio/")) {
      return <Music className="h-10 w-10 text-pink-400" />;
    }
    if (["zip", "tar", "gz", "7z", "rar"].includes(ext)) {
      return <FileArchive className="h-10 w-10 text-amber-400" />;
    }
    if (isTextType) {
      return <FileCode className="h-10 w-10 text-emerald-400" />;
    }
    if (mimeType === "application/pdf" || ext === "pdf") {
      return <FileText className="h-10 w-10 text-rose-400" />;
    }
    return <FileIcon className={cls} />;
  };

  const left = share ? Math.max(0, share.max_downloads - share.download_count) : 0;
  const isImage = mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
  const isVideo = mimeType.startsWith("video/") || ["mp4", "mkv", "webm", "mov"].includes(ext);
  const isAudio = mimeType.startsWith("audio/") || ["mp3", "wav", "flac", "ogg"].includes(ext);
  const isPDF = mimeType === "application/pdf" || ext === "pdf";

  return (
    <div className="relative flex min-h-screen flex-col bg-bg-base font-sans">
      <LandingNav />

      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-4 md:p-8">
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute top-1/4 left-1/3 -z-10 h-96 w-96 rounded-full bg-accent/10 blur-[130px]" />
        <div className="pointer-events-none absolute bottom-1/4 right-1/3 -z-10 h-96 w-96 rounded-full bg-blue-500/5 blur-[130px]" />

        {/* 1. Loading State */}
        {loading && (
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

        {/* 2. Burned or Not Found State */}
        {!loading && (burned || !share) && (
          <div className="flex w-full max-w-md flex-col items-center justify-center text-center rounded-2xl border border-border-strong bg-bg-surface/90 backdrop-blur-xl p-8 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-raised text-ink-muted border border-border mb-4">
              <Clock className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-bold text-ink">This link is no longer available</h1>
            <p className="mx-auto mt-2 mb-6 max-w-sm text-xs leading-relaxed text-ink-muted">
              It has expired or reached its maximum download limit, and the file has been securely deleted.
            </p>

            {downloadStarted && (
              <div className="mb-6 w-full rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-left">
                <div className="flex items-start gap-2.5">
                  <Smartphone className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-[11px] leading-relaxed text-ink-muted">
                    <p className="text-ink font-medium">Download in progress</p>
                    <p className="text-ink-muted">
                      Your download was initiated. Once the file finishes saving, tap <strong className="text-emerald-400">&quot;Open&quot;</strong> on the browser prompt or pull down your notification drawer to install.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex w-full flex-col gap-2 border-t border-border pt-6">
              <Button size="lg" asChild className="w-full h-10 rounded-xl">
                <Link href="/instant">Send your own file</Link>
              </Button>
              <Button variant="ghost" asChild className="w-full h-10 rounded-xl">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </div>
        )}

        {/* 3. Main Split Showcase State */}
        {!loading && !burned && share && (
          <div className="w-full max-w-6xl space-y-4">
            {/* Top Eyebrow Breadcrumb Bar */}
            <div className="flex items-center justify-between px-2 text-xs">
              <div className="flex items-center gap-2 text-ink-muted">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-ink">ByteVault Instant Ephemeral Share</span>
                <span>•</span>
                <span className="font-mono text-ink-muted">Self-Destructing File</span>
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
                  "flex-1 min-w-0 flex flex-col rounded-xl border border-border bg-bg-raised/60 overflow-hidden min-h-[260px] md:min-h-[640px] relative transition-all order-2 md:order-1",
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
                      {share.filename}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {previewUrl && (
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors inline-flex items-center"
                        title="Open raw preview in new tab"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
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
                  {share.has_password && !previewUrl ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bg-surface gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-xl">
                        <Lock className="h-8 w-8" />
                      </div>
                      <p className="text-base font-semibold text-ink">Passcode Protected File</p>
                      <p className="text-xs text-ink-muted max-w-sm leading-relaxed">
                        This file is encrypted. Enter the required passcode on the right to unlock and download it.
                      </p>
                    </div>
                  ) : isImage && previewUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4 bg-black/20">
                      <img
                        src={previewUrl}
                        alt={share.filename}
                        className="max-w-full max-h-[580px] w-auto h-auto object-contain rounded-lg shadow-lg"
                      />
                    </div>
                  ) : isVideo && previewUrl ? (
                    <video
                      src={previewUrl}
                      controls
                      className="w-full h-full max-h-[580px] object-contain bg-black rounded-lg"
                    />
                  ) : isAudio && previewUrl ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-bg-surface gap-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-pink-500/10 text-pink-400 border border-pink-500/20 shadow-xl">
                        <Music className="h-10 w-10" />
                      </div>
                      <p className="text-sm font-semibold text-ink">{share.filename}</p>
                      <audio src={previewUrl} controls className="w-full max-w-md mt-2" />
                    </div>
                  ) : isPDF && previewUrl ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full min-h-[550px] border-none bg-white rounded-b-xl"
                      title="PDF Document Preview"
                      loading="lazy"
                    />
                  ) : isTextType && previewUrl ? (
                    loadingText ? (
                      <div className="flex-1 flex items-center justify-center p-6 text-xs text-ink-muted font-mono">
                        <Loader2 className="h-5 w-5 animate-spin mr-2 text-accent" /> Loading text preview...
                      </div>
                    ) : (
                      <pre className="flex-1 p-5 text-xs font-mono overflow-auto w-full text-ink bg-bg-surface text-left whitespace-pre-wrap select-text leading-relaxed">
                        {textContent}
                      </pre>
                    )
                  ) : isAppFile ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bg-surface">
                      <div
                        className={`flex h-20 w-20 items-center justify-center rounded-3xl mb-4 shadow-xl ${
                          isAPK
                            ? "bg-green-500/10 text-green-500 border border-green-500/20"
                            : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        }`}
                      >
                        <Smartphone className="h-10 w-10" />
                      </div>
                      <h3 className="text-base font-semibold text-ink mb-1 truncate max-w-sm">
                        {appName}
                      </h3>
                      <p className="text-xs text-ink-muted mb-4 font-mono">
                        {isAPK ? "Android Package (APK)" : "iOS Application (IPA)"} · {formatBytes(share.file_size)}
                      </p>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-6">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Ready to install on verified devices
                      </div>
                    </div>
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

              {/* Right Side: Download & Actions (order-1 on mobile for instant zero-scroll access) */}
              <div className="w-full md:w-80 md:flex-shrink-0 flex flex-col justify-between p-2 order-1 md:order-2">
                <div className="space-y-4 md:space-y-5">
                  {/* File Profile Header */}
                  <div className="text-center md:text-left">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[11px] font-semibold mb-2.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Ephemeral Share
                    </div>
                    <h1 className="text-base md:text-lg font-bold text-ink break-words line-clamp-2" title={share.filename}>
                      {share.filename}
                    </h1>
                    <div className="flex items-center justify-center md:justify-start gap-2 mt-1 text-xs text-ink-muted font-mono">
                      <span>{formatBytes(share.file_size)}</span>
                      <span>•</span>
                      <span className="uppercase">{ext || "FILE"}</span>
                    </div>
                  </div>

                  {/* Passcode Form & Download / Install Buttons - Right at top for mobile */}
                  <form onSubmit={handleDownload} className="space-y-3 md:space-y-4">
                    {share.has_password && (
                      <div className="space-y-1.5">
                        <Label htmlFor="passcode" className="flex items-center gap-1.5 text-xs text-ink-muted">
                          <Lock className="h-3.5 w-3.5 text-ink-faint" /> Passcode required
                        </Label>
                        <Input
                          id="passcode"
                          type="password"
                          autoComplete="off"
                          placeholder="Enter passcode"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-10 border-border-strong bg-bg-raised text-xs rounded-xl"
                          required
                        />
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={downloading || left <= 0}
                      className={cn(
                        "w-full text-xs font-semibold h-11 rounded-xl shadow-lg transition-all",
                        isAPK && deviceInfo.isAndroid
                          ? "bg-green-600 hover:bg-green-500 text-white shadow-green-600/20"
                          : "bg-accent hover:bg-accent/90 text-bg shadow-accent/20"
                      )}
                      size="lg"
                    >
                      {downloading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing download…
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          {isAPK && deviceInfo.isAndroid
                            ? "Download and install APK"
                            : isAPK
                            ? "Download APK"
                            : isIPA
                            ? "Download IPA"
                            : "Download File"}
                        </>
                      )}
                    </Button>

                    {/* Android Installation Guidance */}
                    {isAPK && deviceInfo.isAndroid && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-left">
                        <div className="flex items-start gap-2.5">
                          <Smartphone className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5 text-[11px] leading-relaxed text-ink-muted">
                            <p className="text-ink font-medium">
                              {downloadStarted ? "Download in progress…" : "Installation note"}
                            </p>
                            <p className="text-ink-muted">
                              Once download finishes, tap <strong className="text-emerald-400">&quot;Open&quot;</strong> on the browser prompt or pull down your notification drawer to install.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </form>

                  {/* Downloads Left Progress Box */}
                  <div className="p-3 rounded-xl bg-bg-raised/70 border border-border text-xs space-y-2">
                    <div className="flex items-center justify-between text-[12px] md:text-[13px]">
                      <span className="text-ink-muted">Downloads left</span>
                      <span className="font-mono font-semibold text-ink">
                        {left} of {share.max_downloads}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-bg-overlay">
                      <div
                        className="h-full bg-brand-gradient transition-all duration-300"
                        style={{ width: `${Math.max(8, (left / share.max_downloads) * 100)}%` }}
                      />
                    </div>
                    {left <= 1 && (
                      <p className="flex items-start gap-1.5 text-[11px] text-amber-400">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        This is the last download. The file is deleted right after.
                      </p>
                    )}
                  </div>

                  {/* QR Code for Phone Installation - Desktop Only */}
                  {isAPK && mounted && !deviceInfo.isMobile && (
                    <div className="hidden md:block p-3.5 rounded-xl border border-border bg-white text-center shadow-sm">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                          pageUrl || (typeof window !== "undefined" ? window.location.href : "")
                        )}`}
                        alt="Scan QR code from phone"
                        className="w-32 h-32 mx-auto"
                      />
                      <p className="text-[11px] text-neutral-800 mt-2 font-semibold flex items-center justify-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                        Scan with Android phone to install
                      </p>
                    </div>
                  )}

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

                {/* Conversion Box */}
                <div className="mt-8 pt-5 border-t border-border text-center md:text-left space-y-2">
                  <p className="text-xs font-semibold text-ink flex items-center justify-center md:justify-start gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Want to share large files?
                  </p>
                  <p className="text-[11px] text-ink-muted leading-relaxed">
                    Send files with links you control, expiration dates, and download limits on ByteVault.
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
