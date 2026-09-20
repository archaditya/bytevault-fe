"use client";

import { useState, useEffect, useRef } from "react";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { Button } from "@/components/ui/button";
import { UploadCloud, Copy, Check, Lock, Download, Clock, Loader2, File as FileIcon, X } from "lucide-react";
import toast from "react-hot-toast";
import { formatBytes } from "@/lib/utils";

interface EphemeralConfig {
  max_file_size_gb: number;
  max_downloads_cap: number;
  expiry_minutes: number;
}

function formatExpiry(mins: number): string {
  if (mins % 1440 === 0) {
    const d = mins / 1440;
    return `${d} day${d > 1 ? "s" : ""}`;
  }
  if (mins % 60 === 0) {
    const h = mins / 60;
    return `${h} hour${h > 1 ? "s" : ""}`;
  }
  return `${mins} minutes`;
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
        toast.success("Link created");
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
        toast.success("Link created");
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
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const expiryLabel = formatExpiry(config.expiry_minutes);
  const usesLabel = config.max_downloads_cap === 1 ? "once" : `${config.max_downloads_cap} times`;

  return (
    <div className="relative flex min-h-screen flex-col bg-bg font-sans">
      {/* Full-screen drag-and-drop overlay */}
      {isDraggingOver && (
        <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center border-4 border-dashed border-accent/70 bg-bg/90 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <UploadCloud className="h-14 w-14 text-accent" strokeWidth={1.5} />
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-ink">Drop your file to send it</h2>
          <p className="mt-2 text-sm text-ink-muted">Up to {formatBytes(maxSizeBytes)}</p>
        </div>
      )}

      <LandingNav />

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-14">
        <div className="pointer-events-none absolute inset-0 bg-brand-glow" />

        <div className="relative w-full max-w-xl">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Send a file</h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
            No account needed. The link works {usesLabel} and expires in {expiryLabel}, whichever comes
            first. Then the file is deleted.
          </p>

          <div className="mt-8 rounded-lg border border-border-strong bg-bg-surface p-5 sm:p-6">
            {shareUrl ? (
              <div className="flex flex-col gap-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                    <Check className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-[16px] font-medium text-ink">Your link is ready</h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                      It works {usesLabel} and expires in {expiryLabel}. The file is deleted as soon as it is
                      downloaded.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-md border border-border bg-bg-raised p-2">
                  <span className="flex-1 truncate px-2 font-mono text-[13px] text-ink">{shareUrl}</span>
                  <Button size="sm" onClick={copyToClipboard}>
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copy link
                      </>
                    )}
                  </Button>
                </div>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setShareUrl(null);
                    setFile(null);
                  }}
                >
                  Send another file
                </Button>
              </div>
            ) : (
              <form onSubmit={handleUpload} className="flex flex-col gap-5">
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
                  className="sr-only"
                />

                {!file ? (
                  <label
                    htmlFor="guest-file"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border-strong bg-bg-raised/40 px-6 py-10 text-center transition-colors hover:border-accent/60 hover:bg-accent/5 focus-within:border-accent"
                  >
                    <UploadCloud className="h-7 w-7 text-accent" strokeWidth={1.75} />
                    <p className="mt-3 text-[15px] font-medium text-ink">
                      Drop a file here, or{" "}
                      <span className="text-accent-bright underline underline-offset-4">browse</span>
                    </p>
                    <p className="mt-1 text-[12px] text-ink-muted">Up to {formatBytes(maxSizeBytes)}</p>
                  </label>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-accent/30 bg-accent/5 p-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                        <FileIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-ink" title={file.name}>
                          {file.name}
                        </p>
                        <p className="mt-0.5 font-mono text-[12px] text-ink-muted">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0 hover:bg-danger/10 hover:text-danger"
                      onClick={() => setFile(null)}
                      title="Remove file"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <ul className="flex flex-col gap-2 text-[13px] text-ink-muted sm:flex-row sm:gap-6">
                  <li className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-ink-faint" /> Link works {usesLabel}
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-ink-faint" /> Expires in {expiryLabel}
                  </li>
                </ul>

                <div className="space-y-1.5">
                  <label htmlFor="guest-passcode" className="flex items-center gap-1.5 text-[13px] text-ink-muted">
                    <Lock className="h-3.5 w-3.5 text-ink-faint" /> Passcode (optional)
                  </label>
                  <input
                    id="guest-passcode"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Use password to generate more secure Shareable URL"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-md border border-border-strong bg-bg-raised px-3 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
                  />
                </div>

                {uploading && (
                  <div className="space-y-2" role="status" aria-live="polite">
                    <div className="flex justify-between text-[12px] text-ink-muted">
                      <span className="truncate">{statusText || "Uploading…"}</span>
                      <span className="font-mono text-ink">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-overlay">
                      <div className="h-full bg-brand-gradient transition-all duration-200" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={uploading || !file}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                    </>
                  ) : (
                    "Create link"
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
