"use client";

import { useState, useEffect, useRef } from "react";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Flame, UploadCloud, Copy, Check, Lock, Zap, File as FileIcon, X, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { formatBytes } from "@/lib/utils";

interface EphemeralConfig {
  max_file_size_gb: number;
  max_downloads_cap: number;
  expiry_minutes: number;
}

export default function InstantUploadPage() {
  const [config, setConfig] = useState<EphemeralConfig>({
    max_file_size_gb: 2, // 2GB default fallback
    max_downloads_cap: 1,
    expiry_minutes: 60,
  });

  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  // Fetch dynamic system rules saved in DB by Admin
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

  // Convert GB to bytes for file size comparison
  const maxSizeBytes = config.max_file_size_gb * 1024 * 1024 * 1024;
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const CONCURRENT_WORKERS = 3; // Upload up to 3 chunks in parallel

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
          toast.error(`File exceeds dynamic guest limit of ${formatBytes(maxSizeBytes)}. Sign in for larger files.`);
          return;
        }
        setFile(droppedFile);
        toast.success(`Selected "${droppedFile.name}" (${formatBytes(droppedFile.size)})`);
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


  const uploadChunkWithProgress = (
    url: string,
    body: Blob,
    contentType: string,
    onProgress: (loaded: number, total: number) => void,
    onRegisterXhr?: (xhr: XMLHttpRequest) => void
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      if (onRegisterXhr) {
        onRegisterXhr(xhr);
      }

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
          reject(new Error(`Storage PUT failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network transmission error during upload. Please check your internet connection."));
      xhr.ontimeout = () => reject(new Error("Upload connection timed out. Server took too long to respond."));

      xhr.send(body);
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }

    if (file.size > maxSizeBytes) {
      toast.error(
        `File exceeds dynamic guest limit of ${formatBytes(maxSizeBytes)}. Sign in for larger files.`
      );
      return;
    }

    setUploading(true);
    setProgress(0);
    setStatusText("Preparing upload...");

    try {
      const isMultipart = file.size > CHUNK_SIZE;

      if (!isMultipart) {
        // --- Single Part Upload (<= 5MB) ---
        setStatusText("Creating upload session...");
        const res = await fetch("/api/v1/ephemeral/upload-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            file_size: file.size,
            content_type: file.type || "application/octet-stream",
            password: password || undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.detail || json.error || "Failed to initialize guest upload");
        }

        const { token, upload_url } = json.data;
        setStatusText("Uploading to storage...");

        await uploadChunkWithProgress(
          upload_url,
          file,
          file.type || "application/octet-stream",
          (loaded, total) => {
            const pct = Math.min(98, Math.round((loaded / total) * 100));
            setProgress(pct);
            setStatusText(`Uploading: ${formatBytes(loaded)} / ${formatBytes(total)} (${pct}%)`);
          }
        );

        setProgress(100);
        setStatusText("Complete!");
        const generatedUrl = `${window.location.origin}/s/instant/${token}`;
        setShareUrl(generatedUrl);
        toast.success("Self-destruct link generated!");
      } else {
        // --- Chunked Multipart Upload (> 5MB, up to 2GB) ---
        const totalParts = Math.ceil(file.size / CHUNK_SIZE);
        setStatusText(`Initializing multipart transfer (${totalParts} parts)...`);

        const sessionRes = await fetch("/api/v1/ephemeral/multipart-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            file_size: file.size,
            content_type: file.type || "application/octet-stream",
            password: password || undefined,
            part_count: totalParts,
          }),
        });

        const sessionJson = await sessionRes.json();
        if (!sessionRes.ok) {
          throw new Error(sessionJson.detail || sessionJson.error || "Failed to initialize multipart session");
        }

        const { token, upload_id, part_urls } = sessionJson.data;

        // Byte-level tracking across all parallel chunk uploads
        const chunkLoadedBytes = new Array(totalParts).fill(0);
        const updateProgress = () => {
          const totalLoaded = chunkLoadedBytes.reduce((acc, bytes) => acc + bytes, 0);
          const pct = Math.min(98, Math.round((totalLoaded / file.size) * 100));
          setProgress(pct);
          setStatusText(`Uploading: ${formatBytes(totalLoaded)} / ${formatBytes(file.size)} (${pct}%)`);
        };

        const completedParts: { part_number: number; etag: string }[] = [];
        const activeXhrs = new Set<XMLHttpRequest>();
        let nextPartIdx = 0;
        let workerError: Error | null = null;

        const worker = async () => {
          while (nextPartIdx < part_urls.length && !workerError) {
            const currentIdx = nextPartIdx++;
            const partInfo = part_urls[currentIdx];
            const partNum = partInfo.part_number;
            const start = (partNum - 1) * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
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
                  currentXhr = xhr;
                  activeXhrs.add(xhr);
                }
              );

              if (currentXhr) {
                activeXhrs.delete(currentXhr);
              }

              chunkLoadedBytes[currentIdx] = chunkSize;
              updateProgress();
              completedParts.push({ part_number: partNum, etag });
            } catch (err: any) {
              if (currentXhr) {
                activeXhrs.delete(currentXhr);
              }
              workerError = err;
              // Abort all remaining in-flight chunk uploads immediately
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
          { length: Math.min(CONCURRENT_WORKERS, totalParts) },
          () => worker()
        );

        await Promise.all(workers);

        if (workerError) {
          fetch(`/api/v1/ephemeral/abort-multipart/${token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ upload_id }),
          }).catch(() => {});
          throw workerError;
        }

        // Sort parts by part_number ascending before completing
        completedParts.sort((a, b) => a.part_number - b.part_number);

        setStatusText("Assembling file parts on storage...");
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
          throw new Error(completeJson.detail || completeJson.error || "Failed to finalize multipart upload");
        }

        setProgress(100);
        setStatusText("Upload complete!");
        const generatedUrl = `${window.location.origin}/s/instant/${token}`;
        setShareUrl(generatedUrl);
        toast.success("Self-destruct link generated!");
      }
    } catch (err: any) {
      const errorMsg =
        err?.name === "AbortError"
          ? "Upload was aborted."
          : err?.message?.includes("Failed to fetch")
            ? "Network connection interrupted. Please check your connection."
            : err?.message || "Upload failed. Please try again.";
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Burn link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-base font-sans relative">
      {/* Full-Screen Drag-and-Drop Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-base/90 backdrop-blur-md border-4 border-dashed border-amber-500/80 animate-in fade-in duration-200 pointer-events-none p-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-amber-500/20 border border-amber-500/50 text-amber-500 shadow-2xl shadow-amber-500/30 animate-bounce mb-6">
            <Flame className="h-12 w-12" />
          </div>
          <h2 className="text-3xl font-extrabold text-ink tracking-tight">Drop file anywhere to burn</h2>
          <p className="mt-2 text-sm text-amber-400 font-mono">
            Single-use encrypted transfer · Up to {formatBytes(maxSizeBytes)}
          </p>
          <div className="mt-6 px-4 py-1.5 rounded-full bg-bg-raised border border-border text-xs text-ink-muted">
            Release your cursor to select file
          </div>
        </div>
      )}

      <LandingNav />

      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/3 -z-10 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 -z-10 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />

        <div className="w-full max-w-lg">
          <Card className="border-border-strong bg-bg-surface/90 backdrop-blur-xl shadow-2xl">
            <CardHeader className="text-center pb-4 border-b border-border">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mx-auto mb-3">
                <Flame className="h-6 w-6 animate-pulse" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight text-ink">
                Burn-After-Reading Upload
              </CardTitle>
              <p className="text-xs text-ink-muted mt-1">
                Anonymous single-use transfer. Auto-purged permanently after download or expiration.
              </p>
            </CardHeader>

            <CardContent className="pt-6">
              {shareUrl ? (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                    <Check className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-ink">Self-Destruct Link Ready!</h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      This file will be permanently deleted from cloud storage as soon as it is downloaded.
                    </p>
                  </div>

                  <div className="flex w-full items-center gap-2 bg-bg-raised border border-border p-2 rounded-lg font-mono text-xs text-ink">
                    <span className="truncate flex-1 px-1">{shareUrl}</span>
                    <Button size="sm" onClick={copyToClipboard}>
                      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>

                  <Button variant="outline" className="mt-2 text-xs w-full" onClick={() => { setShareUrl(null); setFile(null); }}>
                    Upload Another Instant File
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleUpload} className="space-y-4">
                  {/* Dropzone / File Selected View */}
                  <input
                    type="file"
                    id="guest-file"
                    onChange={(e) => {
                      const selected = e.target.files?.[0] || null;
                      if (selected && selected.size > maxSizeBytes) {
                        toast.error(`File exceeds guest limit of ${formatBytes(maxSizeBytes)}.`);
                        return;
                      }
                      setFile(selected);
                    }}
                    className="hidden"
                  />

                  {!file ? (
                    <label
                      htmlFor="guest-file"
                      className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-amber-500/50 rounded-2xl p-8 transition-all bg-bg-raised/40 hover:bg-bg-raised/80 group cursor-pointer text-center"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform mb-3">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-ink group-hover:text-amber-500 transition-colors">
                        Drag &amp; drop anywhere, or <span className="text-amber-500 underline underline-offset-2">browse</span>
                      </p>
                      <p className="text-[11px] text-ink-muted mt-1 font-mono">
                        Instant guest transfer · Maximum {formatBytes(maxSizeBytes)}
                      </p>
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 transition-all">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <FileIcon className="h-5 w-5" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-ink truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[11px] text-ink-muted font-mono mt-0.5">
                            {formatBytes(file.size)} · Ready to burn
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-ink-muted hover:text-danger hover:bg-danger/10 rounded-lg flex-shrink-0"
                        onClick={() => setFile(null)}
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Real-time Dynamic Config Badges */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-bg-raised border border-border text-ink-muted">
                      <Flame className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      <span className="truncate">Limit: {config.max_downloads_cap} Download</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-bg-raised border border-border text-ink-muted">
                      <Zap className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                      <span className="truncate">Expiry: {config.expiry_minutes} Mins</span>
                    </div>
                  </div>

                  {/* Optional Passcode */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-ink-muted flex items-center gap-1">
                      <Lock className="h-3 w-3 text-ink-faint" /> Optional Passcode
                    </label>
                    <input
                      type="password"
                      placeholder="Lock with passcode (optional)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-8 rounded-lg border border-border bg-bg-raised px-3 text-xs text-ink outline-none focus:border-amber-500/50 transition-colors font-mono"
                    />
                  </div>

                  {uploading && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[10px] text-ink-muted font-mono">
                        <span className="truncate max-w-[300px]">{statusText || "Securing & Transmitting..."}</span>
                        <span className="font-bold text-amber-500">{progress}%</span>
                      </div>
                      <div className="w-full bg-bg-raised rounded-full h-2 overflow-hidden border border-border">
                        <div className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-200" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/20 h-10 rounded-xl"
                    disabled={uploading || !file}
                  >
                    {uploading ? (
                      <span className="flex items-center gap-2">
                        <Flame className="h-4 w-4 animate-spin" /> Securing &amp; Transmitting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Flame className="h-4 w-4" /> Generate Burn Link
                      </span>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
