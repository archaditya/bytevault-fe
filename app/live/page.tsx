"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  Copy,
  Check,
  Radio,
  Clock,
  Loader2,
  File as FileIcon,
  X,
  Share2,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatBytes } from "@/lib/utils";

interface EphemeralConfig {
  max_file_size_gb: number;
  max_downloads_cap: number;
  expiry_minutes: number;
}

interface NetworkUploadProfile {
  concurrency: number;
  chunkSize: number;
}

function getUploadProfile(fileSizeBytes: number): NetworkUploadProfile {
  const MB = 1024 * 1024;
  const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
  const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;

  const isSlowConnection =
    Boolean(conn?.saveData) ||
    conn?.effectiveType === "2g" ||
    conn?.effectiveType === "slow-2g" ||
    conn?.effectiveType === "3g" ||
    (typeof conn?.rtt === "number" && conn.rtt > 300);

  const isMobile =
    typeof window !== "undefined" &&
    (window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));

  let concurrency = 4;
  if (isSlowConnection || isMobile) {
    concurrency = 3;
  } else if (fileSizeBytes > 300 * MB) {
    concurrency = 6;
  } else if (fileSizeBytes <= 50 * MB) {
    concurrency = 3;
  }

  let chunkSize = 10 * MB;
  if (isSlowConnection || isMobile) {
    chunkSize = fileSizeBytes <= 100 * MB ? 5 * MB : 10 * MB;
  } else {
    if (fileSizeBytes <= 50 * MB) chunkSize = 5 * MB;
    else if (fileSizeBytes <= 500 * MB) chunkSize = 15 * MB;
    else chunkSize = 25 * MB;
  }

  return { concurrency, chunkSize };
}

export default function LiveSharePage() {
  const [config, setConfig] = useState<EphemeralConfig>({
    max_file_size_gb: 2,
    max_downloads_cap: 1,
    expiry_minutes: 60,
  });

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [liveShareUrl, setLiveShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [transferSpeed, setTransferSpeed] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const dragCounter = useRef(0);
  const activeXhrsRef = useRef<Set<XMLHttpRequest>>(new Set());

  // Fetch dynamic system rules
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/v1/ephemeral/config");
        const json = await res.json();
        if (res.ok && json.data) {
          setConfig(json.data);
        }
      } catch (err) {
        console.warn("Using default guest limits fallback");
      }
    }
    fetchConfig();
  }, []);

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploading && !isCompleted) {
        e.preventDefault();
        e.returnValue = "Live transfer is in progress. Leaving will cancel the transfer.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [uploading, isCompleted]);

  const maxSizeBytes = config.max_file_size_gb * 1024 * 1024 * 1024;

  // Window-level full-page drag-and-drop
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDraggingOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDraggingOver(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDraggingOver(false);

      if (uploading) return;

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile.size > maxSizeBytes) {
          toast.error(
            `File exceeds dynamic guest limit of ${formatBytes(maxSizeBytes)}. Sign in for larger files.`
          );
          return;
        }
        setFile(droppedFile);
        toast.success(`Selected ${droppedFile.name}`);
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [maxSizeBytes, uploading]);

  const uploadChunkWithProgress = async (
    url: string,
    body: Blob,
    contentType: string,
    onProgress: (loaded: number, total: number) => void,
    onRegisterXhr?: (xhr: XMLHttpRequest) => void,
    maxRetries = 2
  ): Promise<string> => {
    let lastError: any = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let isAborted = false;
      try {
        return await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          if (onRegisterXhr) onRegisterXhr(xhr);

          xhr.open("PUT", url, true);
          xhr.setRequestHeader("Content-Type", contentType);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              onProgress(e.loaded, e.total);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const rawEtag = xhr.getResponseHeader("ETag") || xhr.getResponseHeader("etag") || "";
              resolve(rawEtag.replace(/"/g, ""));
            } else {
              const err: any = new Error(`Storage PUT failed with status ${xhr.status}`);
              err.retryable = xhr.status >= 500 && xhr.status < 600;
              reject(err);
            }
          };

          xhr.onabort = () => {
            isAborted = true;
            reject(new Error("Upload aborted"));
          };

          xhr.onerror = () => {
            const err: any = new Error("Network transmission error during upload.");
            err.retryable = true;
            reject(err);
          };

          xhr.ontimeout = () => {
            const err: any = new Error("Upload connection timed out.");
            err.retryable = true;
            reject(err);
          };

          xhr.send(body);
        });
      } catch (err: any) {
        lastError = err;
        if (isAborted || err?.message === "Upload aborted") throw err;
        if (err?.retryable !== false && attempt < maxRetries) {
          onProgress(0, body.size);
          await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt)));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  };

  const handleStartLiveShare = async () => {
    if (!file) {
      toast.error("Please select a file to start live sharing.");
      return;
    }

    if (file.size > maxSizeBytes) {
      toast.error(`File exceeds guest limit of ${formatBytes(maxSizeBytes)}.`);
      return;
    }

    setUploading(true);
    setIsCompleted(false);
    setProgress(0);
    setStatusText("Establishing live transfer pipeline...");

    try {
      const { concurrency, chunkSize: dynamicChunkSize } = getUploadProfile(file.size);
      const totalParts = Math.max(1, Math.ceil(file.size / dynamicChunkSize));

      // 1. Handshake with backend - is_live: true
      const sessionRes = await fetch("/api/v1/ephemeral/multipart-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          file_size: file.size,
          content_type: file.type || "application/octet-stream",
          part_count: totalParts,
          is_live: true,
        }),
      });

      const sessionJson = await sessionRes.json();
      if (!sessionRes.ok) {
        throw new Error(sessionJson.detail || sessionJson.error || "Failed to initialize live pipeline");
      }

      const { token, upload_id, part_urls } = sessionJson.data;

      // 2. IMMEDIATE LINK PRESENTATION (Available at 0%!)
      const generatedLiveUrl = `${window.location.origin}/s/live/${token}`;
      setLiveShareUrl(generatedLiveUrl);
      toast.success("Live link ready! You can share it right now.");

      // 3. Progressive binary chunk streaming
      const chunkLoadedBytes = new Array(totalParts).fill(0);
      let lastTimestamp = Date.now();
      let lastLoadedBytes = 0;
      let lastReportTime = 0;

      const reportProgressToBackend = (pct: number, bytes: number) => {
        const now = Date.now();
        if (now - lastReportTime < 1000) return;
        lastReportTime = now;
        fetch(`/api/v1/ephemeral/progress/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progress_pct: pct, uploaded_bytes: bytes }),
        }).catch(() => {});
      };

      const updateProgress = () => {
        const totalLoaded = chunkLoadedBytes.reduce((acc, bytes) => acc + bytes, 0);
        const pct = Math.min(99, Math.round((totalLoaded / file.size) * 100));
        setProgress(pct);
        reportProgressToBackend(pct, totalLoaded);

        const now = Date.now();
        const timeDiff = (now - lastTimestamp) / 1000;
        if (timeDiff >= 0.8) {
          const bytesDiff = totalLoaded - lastLoadedBytes;
          const speed = bytesDiff / timeDiff;
          if (speed > 0) {
            setTransferSpeed(`${formatBytes(speed)}/s`);
          }
          lastTimestamp = now;
          lastLoadedBytes = totalLoaded;
        }

        setStatusText(`Streaming to cloud: ${formatBytes(totalLoaded)} of ${formatBytes(file.size)} (${pct}%)`);
      };

      const completedParts: { part_number: number; etag: string }[] = [];
      const activeXhrs = activeXhrsRef.current;
      activeXhrs.clear();

      let nextPartIdx = 0;
      let workerError: Error | null = null;

      const worker = async () => {
        while (nextPartIdx < part_urls.length && !workerError) {
          const currentIdx = nextPartIdx++;
          const partInfo = part_urls[currentIdx];
          const partNum = partInfo.part_number;
          const start = (partNum - 1) * dynamicChunkSize;
          const end = Math.min(start + dynamicChunkSize, file.size);
          const chunkBlob = file.slice(start, end);
          const chunkSize = end - start;

          let currentXhr: XMLHttpRequest | null = null;

          try {
            const etag = await uploadChunkWithProgress(
              partInfo.url,
              chunkBlob,
              file.type || "application/octet-stream",
              (loaded) => {
                chunkLoadedBytes[currentIdx] = loaded;
                updateProgress();
              },
              (xhr) => {
                if (currentXhr) activeXhrs.delete(currentXhr);
                currentXhr = xhr;
                activeXhrs.add(xhr);
              }
            );

            if (currentXhr) activeXhrs.delete(currentXhr);
            chunkLoadedBytes[currentIdx] = chunkSize;
            updateProgress();
            completedParts.push({ part_number: partNum, etag });
          } catch (err: any) {
            if (currentXhr) activeXhrs.delete(currentXhr);
            workerError = err;
            activeXhrs.forEach((xhr) => {
              try {
                xhr.abort();
              } catch (_) {}
            });
            activeXhrs.clear();
            throw err;
          }
        }
      };

      const workers = Array.from(
        { length: Math.min(concurrency, totalParts) },
        () => worker()
      );

      await Promise.all(workers);
      if (workerError) throw workerError;

      // Report full 100% progress
      fetch(`/api/v1/ephemeral/progress/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress_pct: 100, uploaded_bytes: file.size }),
      }).catch(() => {});

      // 4. Assemble in Cloud Storage
      setStatusText("Finalizing and locking file in cloud storage...");
      completedParts.sort((a, b) => a.part_number - b.part_number);

      const completeRes = await fetch(`/api/v1/ephemeral/complete-multipart/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_id,
          parts: completedParts,
        }),
      });

      const completeJson = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeJson.detail || completeJson.error || "Failed to finalize live transfer");
      }

      setProgress(100);
      setIsCompleted(true);
      setStatusText("Complete! Recipient can now download the assembled file.");
      toast.success("File transfer complete and securely stored!");
    } catch (err: any) {
      toast.error(err?.message || "Live transfer failed. Please try again.");
      setStatusText("Transfer paused or failed. Please retry.");
    } finally {
      setUploading(false);
    }
  };

  const copyLink = () => {
    if (!liveShareUrl) return;
    navigator.clipboard.writeText(liveShareUrl);
    setCopied(true);
    toast.success("Live share link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAll = () => {
    setFile(null);
    setUploading(false);
    setProgress(0);
    setStatusText("");
    setLiveShareUrl("");
    setIsCompleted(false);
    setTransferSpeed("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink selection:bg-accent/20 selection:text-accent font-sans">
      <LandingNav />

      {/* Full-Page Drag Overlay */}
      {isDraggingOver && !uploading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/90 backdrop-blur-md border-4 border-dashed border-emerald-500 m-4 rounded-3xl animate-in fade-in duration-150 pointer-events-none">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <UploadCloud className="h-10 w-10 animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-ink">Drop your file anywhere</h2>
            <p className="text-sm text-ink-muted">
              File will be staged for Live Pipelined Transfer
            </p>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 md:py-16 w-full flex flex-col items-center justify-center">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wider mb-4 animate-pulse">
            <Radio className="w-3.5 h-3.5" /> Live Pipelined Transfer
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-ink">
            Stream Links Instantly. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-emerald-400">
              No Upload Wait.
            </span>
          </h1>
          <p className="text-ink-muted text-sm md:text-base leading-relaxed">
            Get your shareable link <span className="font-semibold text-ink">immediately</span> at 0%. Share it on WhatsApp or Slack right away while your file streams in the background.
          </p>
        </div>

        {/* Transfer Card */}
        <div className="w-full bg-bg-surface border border-border-strong rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          {/* Subtle Live Glow Indicator */}
          {uploading && !isCompleted && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-emerald-400 to-accent animate-pulse" />
          )}

          {!liveShareUrl ? (
            /* Stage 1: File Selection */
            <div className="space-y-6">
              <div
                onClick={() => document.getElementById("file-input")?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
                }}
                className={`border-2 border-dashed rounded-xl p-8 md:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                  isDraggingOver
                    ? "border-accent bg-accent/5 scale-[1.01]"
                    : "border-border hover:border-accent/50 hover:bg-bg-raised/40"
                }`}
              >
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                />
                <div className="w-14 h-14 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-base font-semibold text-ink">
                    {file ? file.name : "Click to select or drag & drop file"}
                  </p>
                  <p className="text-xs text-ink-muted mt-1">
                    {file
                      ? `${formatBytes(file.size)} • Ready for live pipeline`
                      : `Support for files up to ${formatBytes(maxSizeBytes)}`}
                  </p>
                </div>
              </div>

              {file && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg-raised border border-border">
                  <div className="flex items-center gap-3 truncate">
                    <FileIcon className="w-5 h-5 text-accent shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-ink truncate">{file.name}</p>
                      <p className="text-[11px] text-ink-muted">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setFile(null)}
                    className="h-8 w-8 p-0 text-ink-muted hover:text-danger"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <Button
                disabled={!file || uploading}
                onClick={handleStartLiveShare}
                className="w-full h-12 text-sm font-semibold rounded-xl bg-accent hover:bg-accent/90 text-white shadow-lg flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" /> Start Live Share (Get Link Instantly)
              </Button>
            </div>
          ) : (
            /* Stage 2 & 3: Live Pipeline Active & Complete */
            <div className="space-y-6">
              {/* Top Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  isCompleted
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-accent/10 border-accent/20 text-accent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isCompleted ? "bg-emerald-400" : "bg-accent"
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-3 w-3 ${
                        isCompleted ? "bg-emerald-500" : "bg-accent"
                      }`}
                    />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isCompleted ? "Transfer Complete & Assembled" : "Live Pipeline Active"}
                  </span>
                </div>
                {transferSpeed && !isCompleted && (
                  <span className="text-xs font-mono text-ink-muted">{transferSpeed}</span>
                )}
              </div>

              {/* Instant Share Link Box */}
              <div className="bg-bg-raised border border-border p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-accent" /> Shareable Live Link
                  </span>
                  <span className="text-[11px] text-ink-muted">Recipient sees real-time progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={liveShareUrl}
                    className="flex-1 bg-bg-surface border border-border rounded-lg px-3 py-2 text-xs font-mono text-ink truncate select-all focus:outline-none"
                  />
                  <Button
                    onClick={copyLink}
                    size="sm"
                    className="bg-accent hover:bg-accent/90 text-white shrink-0 gap-1.5"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied" : "Copy Link"}
                  </Button>
                </div>
              </div>

              {/* Progress Bar & Status */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-ink font-medium truncate max-w-[70%]">{statusText}</span>
                  <span className="font-mono font-bold text-accent">{progress}%</span>
                </div>
                <div className="w-full bg-bg-raised rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isCompleted ? "bg-emerald-500" : "bg-accent"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* File Details & Next Step Guidance */}
              <div className="p-3 bg-bg-surface border border-border rounded-lg text-xs text-ink-muted space-y-1">
                <p>
                  📁 <strong className="text-ink">{file?.name}</strong> ({file ? formatBytes(file.size) : ""})
                </p>
                <p>
                  ⏳ Recipient can open this link right now. If they do, they will see this upload stream live and can opt into auto-downloading when ready.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" size="sm" onClick={resetAll} disabled={uploading && !isCompleted}>
                  Share Another File
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Feature Explainer Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 w-full max-w-4xl text-center">
          <div className="p-4 rounded-xl border border-border bg-bg-surface">
            <Radio className="w-5 h-5 text-accent mx-auto mb-2" />
            <h2 className="text-xs font-bold text-ink mb-1">Instant Link Generation</h2>
            <p className="text-[11px] text-ink-muted">No waiting for 100% upload before sending the link to your recipient.</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-bg-surface">
            <Zap className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <h2 className="text-xs font-bold text-ink mb-1">Adaptive Concurrency</h2>
            <p className="text-[11px] text-ink-muted">Smart worker scaling for fast fiber without choking cellular networks.</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-bg-surface">
            <ShieldCheck className="w-5 h-5 text-accent mx-auto mb-2" />
            <h2 className="text-xs font-bold text-ink mb-1">Self-Destruct & Expire</h2>
            <p className="text-[11px] text-ink-muted">Links auto-expire after 60 mins or single download. Cloud chunks auto-purge.</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
