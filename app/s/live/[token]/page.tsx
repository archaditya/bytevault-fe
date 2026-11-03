"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Download,
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
  Maximize2,
  Minimize2,
  ShieldCheck,
  Copy,
  Check,
  Radio,
  Sparkles,
  Smartphone,
  Zap,
} from "lucide-react";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { cn, formatBytes } from "@/lib/utils";
import toast from "react-hot-toast";

interface LiveEphemeralShare {
  filename: string;
  file_size: number;
  content_type?: string;
  status: string; // 'UPLOADING', 'ACTIVE', 'BURNED', 'EXPIRED'
  max_downloads: number;
  download_count: number;
  has_password: boolean;
  preview_url?: string;
  is_live: boolean;
  progress_pct?: number;
  uploaded_bytes?: number;
}

export default function LiveShareReceiverPage() {
  const params = useParams();
  const token = (params?.token as string) || "";

  const [share, setShare] = useState<LiveEphemeralShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [burned, setBurned] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoDownload, setAutoDownload] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  const autoDownloadTriggered = useRef(false);

  const fetchMetadata = useCallback(async () => {
    if (!token) {
      setBurned(true);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/ephemeral/metadata/${encodeURIComponent(token)}`);
      if (!res.ok) {
        setBurned(true);
        return;
      }
      const json = await res.json();
      const shareData: LiveEphemeralShare = json?.data?.share;
      if (shareData && shareData.filename) {
        setShare(shareData);
      } else {
        setBurned(true);
      }
    } catch {
      setBurned(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Polling while status is UPLOADING (live stream telemetry updates every 1.5s)
  useEffect(() => {
    if (!share || share.status !== "UPLOADING" || burned) return;

    const timer = setInterval(() => {
      setPollCount((prev) => prev + 1);
      fetchMetadata();
    }, 1500);

    return () => clearInterval(timer);
  }, [share, burned, fetchMetadata]);

  // Trigger download function
  const handleDownload = useCallback(async () => {
    if (!share || share.status !== "ACTIVE" || downloading) return;
    setDownloading(true);

    try {
      const res = await fetch(`/api/v1/ephemeral/download/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || "Failed to generate download link");
      }

      const downloadUrl = data.data.download_url;
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = share.filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadStarted(true);
      toast.success("Download started!");

      setShare((prev) => {
        if (!prev) return prev;
        const newCount = prev.download_count + 1;
        if (newCount >= prev.max_downloads) {
          setTimeout(() => setBurned(true), 2000);
        }
        return { ...prev, download_count: newCount };
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to download");
    } finally {
      setDownloading(false);
    }
  }, [share, token, downloading]);

  // Auto-download when status transitions to ACTIVE
  useEffect(() => {
    if (
      share &&
      share.status === "ACTIVE" &&
      autoDownload &&
      !autoDownloadTriggered.current &&
      !downloadStarted
    ) {
      autoDownloadTriggered.current = true;
      toast.success("File upload complete! Starting automatic download...");
      handleDownload();
    }
  }, [share, autoDownload, downloadStarted, handleDownload]);

  const safeFilename = share?.filename || "";
  const ext = safeFilename.includes(".") ? safeFilename.split(".").pop()?.toLowerCase() || "" : "";
  const mimeType = (share?.content_type || "").toLowerCase();

  const renderFileIcon = () => {
    const cls = "h-12 w-12 text-accent";
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext) || mimeType.startsWith("image/")) {
      return <ImageIcon className="h-12 w-12 text-blue-400" />;
    }
    if (["mp4", "mkv", "webm", "mov"].includes(ext) || mimeType.startsWith("video/")) {
      return <Video className="h-12 w-12 text-purple-400" />;
    }
    if (["mp3", "wav", "flac", "ogg"].includes(ext) || mimeType.startsWith("audio/")) {
      return <Music className="h-12 w-12 text-pink-400" />;
    }
    if (["zip", "tar", "gz", "7z", "rar"].includes(ext)) {
      return <FileArchive className="h-12 w-12 text-amber-400" />;
    }
    if (mimeType.startsWith("text/") || ["txt", "md", "json", "js", "ts", "py"].includes(ext)) {
      return <FileCode className="h-12 w-12 text-emerald-400" />;
    }
    if (mimeType === "application/pdf" || ext === "pdf") {
      return <FileText className="h-12 w-12 text-rose-400" />;
    }
    return <FileIcon className={cls} />;
  };

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-bg text-ink">
        <LandingNav />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
          <p className="text-sm text-ink-muted">Connecting to live transfer pipeline...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (burned || !share) {
    return (
      <div className="min-h-screen flex flex-col bg-bg text-ink">
        <LandingNav />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold mb-2">Live Transfer Expired or Cancelled</h1>
          <p className="text-xs text-ink-muted mb-6 leading-relaxed">
            This live transfer link is no longer available. The upload was either interrupted by the sender, reached its download limit, or expired.
          </p>
          <Link href="/live">
            <Button className="bg-accent hover:bg-accent/90 text-white text-xs">
              Start a New Live Share
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isUploading = share.status === "UPLOADING";
  const isReady = share.status === "ACTIVE";

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink selection:bg-accent/20 selection:text-accent font-sans">
      <LandingNav />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 md:py-16 w-full flex flex-col items-center justify-center">
        {/* State Banner */}
        <div className="w-full mb-6">
          {isUploading ? (
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
                </span>
                <div>
                  <h1 className="text-xs font-bold text-accent uppercase tracking-wider">
                    Live Upload In Progress
                  </h1>
                  <p className="text-[11px] text-ink-muted">
                    The sender has initiated transfer. Chunks are streaming to the cloud.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-ink-muted">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" /> Live
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <div>
                <h1 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  File Assembled & Ready
                </h1>
                <p className="text-[11px] text-ink-muted">
                  Cloud storage verification complete. Your download is ready.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Main Card */}
        <div className="w-full bg-bg-surface border border-border-strong rounded-2xl p-6 md:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-border">
            <div className="w-20 h-20 rounded-2xl bg-bg-raised border border-border flex items-center justify-center shrink-0 shadow-sm">
              {renderFileIcon()}
            </div>
            <div className="flex-1 text-center md:text-left min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-ink truncate mb-1">
                {share.filename}
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-ink-muted">
                <span className="font-semibold text-ink">{formatBytes(share.file_size)}</span>
                <span>•</span>
                <span className="capitalize">{mimeType || "Binary File"}</span>
                <span>•</span>
                <span className="text-amber-400">Burn after {share.max_downloads} download</span>
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="pt-6 space-y-4">
            {isUploading ? (
              <div className="space-y-4">
                {/* Live Stream Telemetry Progress Box */}
                <div className="p-5 rounded-xl bg-bg-raised border border-border space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-accent text-xs font-semibold">
                      <Radio className="w-4 h-4 animate-pulse text-accent" />
                      <span>Live Transfer Stream Active</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-accent">
                      {share.progress_pct || 0}%
                    </span>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-border/60 rounded-full h-2.5 overflow-hidden p-0.5">
                      <div
                        className="bg-accent h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(255,106,0,0.4)]"
                        style={{ width: `${Math.max(share.progress_pct || 0, 4)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted">
                      <span>
                        {formatBytes(share.uploaded_bytes || 0)} of {formatBytes(share.file_size)} streamed
                      </span>
                      <span>
                        {(share.progress_pct || 0) >= 100
                          ? "Assembling parts in R2..."
                          : "Streaming chunks in parallel"}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-ink-muted leading-relaxed">
                    You do not need to refresh. Chunks are streaming directly to encrypted storage. When the sender finishes, your download triggers automatically.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-ink cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoDownload}
                      onChange={(e) => setAutoDownload(e.target.checked)}
                      className="rounded border-border text-accent focus:ring-accent"
                    />
                    <span>Auto-download file when transfer finishes</span>
                  </label>
                </div>

                <Button
                  disabled
                  className="w-full h-12 text-xs md:text-sm font-semibold rounded-xl bg-bg-raised text-ink-muted border border-border flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  Streaming Live ({share.progress_pct || 0}%) — Awaiting Completion
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full h-12 text-sm font-semibold rounded-xl bg-accent hover:bg-accent/90 text-white shadow-lg flex items-center justify-center gap-2"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Preparing Download Stream...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Download File ({formatBytes(share.file_size)})
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Share link utility */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyShareLink}
                className="text-xs text-ink-muted hover:text-ink gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Link Copied" : "Copy Live Link"}
              </Button>

              <Link href="/live">
                <Button variant="ghost" size="sm" className="text-xs text-accent hover:text-accent/80">
                  Send Your Own Live File →
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Security / Privacy notice */}
        <div className="mt-8 flex items-center gap-2 text-xs text-ink-muted text-center">
          <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
          <span>Encrypted Cloudflare R2 transfer. Single-use download with automatic self-destruction.</span>
        </div>
      </main>

      <Footer />
    </div>
  );
}
