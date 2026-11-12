"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  Copy,
  Check,
  Download,
  Clock,
  Loader2,
  File as FileIcon,
  X,
  RotateCw,
  QrCode,
  Mail,
  Share2,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatBytes, cn } from "@/lib/utils";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.031 2C6.512 2 2.025 6.486 2.025 12.008c0 1.956.568 3.784 1.554 5.334L2 22l4.825-1.545a9.96 9.96 0 0 0 5.206 1.553h.004c5.518 0 10.005-4.486 10.005-10.008 0-2.673-1.041-5.186-2.932-7.078C17.216 3.03 14.704 2 12.031 2zm5.836 14.186c-.244.686-1.42 1.309-1.957 1.393-.497.078-1.127.112-3.606-.914-2.822-1.168-4.63-4.047-4.772-4.234-.139-.188-1.134-1.508-1.134-2.875 0-1.368.718-2.037.973-2.318.255-.281.558-.352.744-.352.186 0 .373.002.535.01.174.009.407-.066.637.484.244.584.834 2.034.908 2.182.074.148.124.322.025.518-.099.197-.149.32-.297.493-.149.174-.313.388-.446.521-.149.148-.304.309-.131.606.174.297.772 1.272 1.657 2.059 1.14 1.013 2.102 1.328 2.4 1.452.298.124.472.112.646-.087.174-.199.744-.867.943-1.165.199-.297.397-.248.67-.149.273.099 1.737.818 2.035.967.298.149.497.223.571.347.075.124.075.72-.169 1.406z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}

interface EphemeralConfig {
  max_file_size_gb: number;
  max_downloads_cap: number;
  expiry_minutes: number;
}

interface SavedEphemeralSession {
  token: string;
  uploadId: string;
  filename: string;
  fileSize: number;
  contentType: string;
  dynamicChunkSize: number;
  totalParts: number;
  completedParts: { part_number: number; etag: string }[];
  expiresAt: string;
}

const EPHEMERAL_STORAGE_KEY = "pushpostvault-ephemeral-upload";

function getSavedSession(): SavedEphemeralSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(EPHEMERAL_STORAGE_KEY) || localStorage.getItem("ByteVault-ephemeral-upload");
    if (!raw) return null;
    const session: SavedEphemeralSession = JSON.parse(raw);
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(EPHEMERAL_STORAGE_KEY);
      localStorage.removeItem("ByteVault-ephemeral-upload");
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function saveSession(session: SavedEphemeralSession) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EPHEMERAL_STORAGE_KEY, JSON.stringify(session));
  } catch {}
}

function clearSavedSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(EPHEMERAL_STORAGE_KEY);
    localStorage.removeItem("ByteVault-ephemeral-upload");
  } catch {}
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

interface NetworkUploadProfile {
  concurrency: number;
  chunkSize: number;
}

/**
 * Dynamically computes concurrency workers and chunk size based on:
 * 1. Network conditions (Cellular/3G vs Fast Fiber via Network Information API)
 * 2. Device type (Mobile RAM limitations vs Desktop)
 * 3. File size (5MB up to 2GB)
 */
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

  // Concurrency ceiling:
  // - Cellular / Mobile: 3 workers (prevents TCP bufferbloat & tab memory crash)
  // - Fast Desktop / Fiber: 6 workers (saturates pipe without exceeding browser HTTP connection limits)
  let concurrency = 4;
  if (isSlowConnection || isMobile) {
    concurrency = 3;
  } else if (fileSizeBytes > 300 * MB) {
    concurrency = 6;
  } else if (fileSizeBytes <= 50 * MB) {
    concurrency = 3;
  }

  // Chunk size:
  // - Cellular/Mobile: 10MB chunks save incremental progress often so packet drops lose minimal data
  // - Fast Desktop: 15MB - 25MB chunks maximize throughput & reduce presigned URL overhead
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

export default function InstantUploadPage() {
  const [config, setConfig] = useState<EphemeralConfig>({
    max_file_size_gb: 2, // 2GB default fallback
    max_downloads_cap: 1,
    expiry_minutes: 60,
  });

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [savedSession, setSavedSession] = useState<SavedEphemeralSession | null>(null);
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

  // Check for any unexpired incomplete session on mount
  useEffect(() => {
    const session = getSavedSession();
    if (session) {
      setSavedSession(session);
    }
  }, []);

  // Warn on accidental tab close or reload during active upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploading) {
        e.preventDefault();
        e.returnValue = "An upload is in progress. Leaving this page will pause your transfer.";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [uploading]);

  // Convert GB to bytes for file size comparison
  const maxSizeBytes = config.max_file_size_gb * 1024 * 1024 * 1024;

  const uploadChunkWithProgress = async (
    url: string,
    body: Blob,
    contentType: string,
    onProgress: (loaded: number, total: number) => void,
    onRegisterXhr?: (xhr: XMLHttpRequest) => void,
    maxRetries = 2,
    signal?: AbortSignal
  ): Promise<string> => {
    let lastError: any = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (signal?.aborted) {
        throw new Error("Upload aborted");
      }
      let isAborted = false;
      try {
        return await new Promise<string>((resolve, reject) => {
          if (signal?.aborted) {
            isAborted = true;
            return reject(new Error("Upload aborted"));
          }

          const xhr = new XMLHttpRequest();
          if (onRegisterXhr) {
            onRegisterXhr(xhr);
          }

          const onSignalAbort = () => {
            isAborted = true;
            xhr.abort();
          };
          signal?.addEventListener("abort", onSignalAbort, { once: true });

          const cleanup = () => {
            signal?.removeEventListener("abort", onSignalAbort);
          };

          xhr.open("PUT", url, true);
          xhr.setRequestHeader("Content-Type", contentType);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              onProgress(e.loaded, e.total);
            }
          };

          xhr.onload = () => {
            cleanup();
            if (xhr.status >= 200 && xhr.status < 300) {
              const rawEtag = xhr.getResponseHeader("ETag") || xhr.getResponseHeader("etag") || "";
              resolve(rawEtag.replace(/"/g, ""));
            } else {
              const isRetryable = xhr.status >= 500 && xhr.status < 600;
              const err: any = new Error(`Storage PUT failed with status ${xhr.status}`);
              err.retryable = isRetryable;
              reject(err);
            }
          };

          xhr.onabort = () => {
            cleanup();
            isAborted = true;
            reject(new Error("Upload aborted"));
          };

          xhr.onerror = () => {
            cleanup();
            const err: any = new Error(
              "Network transmission error during upload. Please check your internet connection."
            );
            err.retryable = true;
            reject(err);
          };

          xhr.ontimeout = () => {
            cleanup();
            const err: any = new Error(
              "Upload connection timed out. Server took too long to respond."
            );
            err.retryable = true;
            reject(err);
          };

          xhr.send(body);
        });
      } catch (err: any) {
        lastError = err;
        if (isAborted || signal?.aborted || err?.message === "Upload aborted") {
          throw err;
        }
        if (err?.retryable !== false && attempt < maxRetries) {
          onProgress(0, body.size);
          await new Promise<void>((resolve, reject) => {
            if (signal?.aborted) {
              return reject(new Error("Upload aborted"));
            }
            const timer = setTimeout(resolve, 1000 * Math.pow(2, attempt));
            if (signal) {
              const onDelayAbort = () => {
                clearTimeout(timer);
                reject(new Error("Upload aborted"));
              };
              signal.addEventListener("abort", onDelayAbort, { once: true });
            }
          });
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  };

  const handleDiscardUnfinished = useCallback(async () => {
    if (savedSession) {
      try {
        await fetch(`/api/v1/ephemeral/abort-multipart/${savedSession.token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ upload_id: savedSession.uploadId }),
        });
      } catch {}
      clearSavedSession();
      setSavedSession(null);
      toast.success("Unfinished upload discarded and storage released");
    }
  }, [savedSession]);

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

        // If there's a saved session for a different file, automatically discard the previous one
        if (
          savedSession &&
          (droppedFile.name !== savedSession.filename || droppedFile.size !== savedSession.fileSize)
        ) {
          handleDiscardUnfinished();
        }

        setFile(droppedFile);
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
  }, [maxSizeBytes, uploading, savedSession, handleDiscardUnfinished]);

  // Resume an active saved multipart session with the matching local file
  const executeResume = async (resumeFile: File, session: SavedEphemeralSession) => {
    setUploading(true);
    setStatusText("Resuming upload...");

    try {
      const dynamicChunkSize = session.dynamicChunkSize;
      const totalParts = session.totalParts;
      const completedPartsMap = new Map<number, string>(
        session.completedParts.map((p) => [p.part_number, p.etag])
      );

      // Determine missing part numbers
      const missingPartNumbers: number[] = [];
      for (let i = 1; i <= totalParts; i++) {
        if (!completedPartsMap.has(i)) {
          missingPartNumbers.push(i);
        }
      }

      // If all parts are already uploaded, jump directly to complete assembly
      if (missingPartNumbers.length > 0) {
        setStatusText(`Refreshing session for ${missingPartNumbers.length} pending parts...`);
        const refreshRes = await fetch(`/api/v1/ephemeral/refresh-part-urls/${session.token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            upload_id: session.uploadId,
            part_numbers: missingPartNumbers,
          }),
        });

        const refreshJson = await refreshRes.json();
        if (!refreshRes.ok) {
          const detail = (refreshJson.detail || refreshJson.error || "").toLowerCase();
          const isDeadSession =
            refreshRes.status === 404 ||
            refreshRes.status === 410 ||
            detail.includes("expired") ||
            detail.includes("not found");

          if (isDeadSession) {
            clearSavedSession();
            setSavedSession(null);
          }
          throw new Error(
            refreshJson.detail ||
              refreshJson.error ||
              "Upload session expired on server. Please start a fresh upload."
          );
        }

        const pendingPartUrls: { part_number: number; url: string }[] = refreshJson.data.part_urls;

        // Progress byte tracking
        const chunkLoadedBytes = new Array(totalParts).fill(0);
        // Mark already completed parts as fully loaded
        for (let i = 1; i <= totalParts; i++) {
          if (completedPartsMap.has(i)) {
            const start = (i - 1) * dynamicChunkSize;
            const end = Math.min(start + dynamicChunkSize, resumeFile.size);
            chunkLoadedBytes[i - 1] = end - start;
          }
        }

        const updateProgress = () => {
          const totalLoaded = chunkLoadedBytes.reduce((acc, bytes) => acc + bytes, 0);
          const pct = Math.min(98, Math.round((totalLoaded / resumeFile.size) * 100));
          setProgress(pct);
          setStatusText(
            `Resuming: ${formatBytes(totalLoaded)} / ${formatBytes(resumeFile.size)} (${pct}%)`
          );
        };
        updateProgress();

        const completedParts: { part_number: number; etag: string }[] = [...session.completedParts];
        const activeXhrs = new Set<XMLHttpRequest>();
        const abortController = new AbortController();
        let nextPartIdx = 0;
        let workerError: Error | null = null;

        const worker = async () => {
          while (nextPartIdx < pendingPartUrls.length && !workerError && !abortController.signal.aborted) {
            const currentIdx = nextPartIdx++;
            const partInfo = pendingPartUrls[currentIdx];
            const partNum = partInfo.part_number;
            const start = (partNum - 1) * dynamicChunkSize;
            const end = Math.min(start + dynamicChunkSize, resumeFile.size);
            const chunkBlob = resumeFile.slice(start, end);
            const chunkSize = end - start;

            let currentXhr: XMLHttpRequest | null = null;

            try {
              const etag = await uploadChunkWithProgress(
                partInfo.url,
                chunkBlob,
                resumeFile.type || "application/octet-stream",
                (loaded) => {
                  chunkLoadedBytes[partNum - 1] = loaded;
                  updateProgress();
                },
                (xhr) => {
                  if (currentXhr) {
                    activeXhrs.delete(currentXhr);
                  }
                  currentXhr = xhr;
                  activeXhrs.add(xhr);
                },
                2,
                abortController.signal
              );

              if (currentXhr) {
                activeXhrs.delete(currentXhr);
              }

              chunkLoadedBytes[partNum - 1] = chunkSize;
              updateProgress();
              completedParts.push({ part_number: partNum, etag });

              // Persist incremental progress to localStorage
              saveSession({
                ...session,
                completedParts: [...completedParts],
              });
            } catch (err: any) {
              if (currentXhr) {
                activeXhrs.delete(currentXhr);
              }
              workerError = err;
              abortController.abort();
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

        const { concurrency } = getUploadProfile(resumeFile.size);
        const workers = Array.from(
          { length: Math.min(concurrency, pendingPartUrls.length) },
          () => worker()
        );

        await Promise.all(workers);

        if (workerError) {
          throw workerError;
        }

        session.completedParts = completedParts;
      }

      // Sort parts ascending
      session.completedParts.sort((a, b) => a.part_number - b.part_number);

      setStatusText("Assembling file parts on storage...");
      const completeRes = await fetch(`/api/v1/ephemeral/complete-multipart/${session.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_id: session.uploadId,
          parts: session.completedParts,
        }),
      });

      const completeJson = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(
          completeJson.detail || completeJson.error || "Failed to finalize multipart upload"
        );
      }

      clearSavedSession();
      setSavedSession(null);
      setProgress(100);
      setStatusText("Upload complete!");
      const generatedUrl = `${window.location.origin}/s/instant/${session.token}`;
      setShareUrl(generatedUrl);
      toast.success("Link created successfully!");
    } catch (err: any) {
      const errorMsg =
        err?.name === "AbortError"
          ? "Upload was interrupted."
          : err?.message?.includes("Failed to fetch")
          ? "Network connection interrupted. Click Resume to continue."
          : err?.message || "Upload failed. Please try again.";
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
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

    // If this file matches the saved session, route through resume flow
    if (
      savedSession &&
      file.name === savedSession.filename &&
      file.size === savedSession.fileSize
    ) {
      await executeResume(file, savedSession);
      return;
    }

    // If starting a fresh file while a previous unfinished session existed, discard previous
    if (savedSession) {
      await handleDiscardUnfinished();
    }

    setUploading(true);
    setProgress(0);
    setStatusText("Preparing upload...");

    try {
      const { concurrency, chunkSize: dynamicChunkSize } = getUploadProfile(file.size);
      const isMultipart = file.size > dynamicChunkSize;

      if (!isMultipart) {
        // --- Single Part Upload ---
        setStatusText("Creating upload session...");
        const res = await fetch("/api/v1/ephemeral/upload-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            file_size: file.size,
            content_type: file.type || "application/octet-stream",
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
        // --- Chunked Multipart Upload ---
        const totalParts = Math.ceil(file.size / dynamicChunkSize);
        setStatusText(`Initializing multipart transfer (${totalParts} parts)...`);

        const sessionRes = await fetch("/api/v1/ephemeral/multipart-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            file_size: file.size,
            content_type: file.type || "application/octet-stream",
            part_count: totalParts,
          }),
        });

        const sessionJson = await sessionRes.json();
        if (!sessionRes.ok) {
          throw new Error(
            sessionJson.detail || sessionJson.error || "Failed to initialize multipart session"
          );
        }

        const { token, upload_id, part_urls } = sessionJson.data;

        // Save active session in localStorage for resumability
        const initialSession: SavedEphemeralSession = {
          token,
          uploadId: upload_id,
          filename: file.name,
          fileSize: file.size,
          contentType: file.type || "application/octet-stream",
          dynamicChunkSize,
          totalParts,
          completedParts: [],
          expiresAt:
            sessionJson.data.expires_at ||
            new Date(Date.now() + config.expiry_minutes * 60000).toISOString(),
        };
        saveSession(initialSession);
        setSavedSession(initialSession);

        // Byte-level tracking across all parallel chunk uploads
        const chunkLoadedBytes = new Array(totalParts).fill(0);
        const updateProgress = () => {
          const totalLoaded = chunkLoadedBytes.reduce((acc, bytes) => acc + bytes, 0);
          const pct = Math.min(98, Math.round((totalLoaded / file.size) * 100));
          setProgress(pct);
          setStatusText(
            `Uploading: ${formatBytes(totalLoaded)} / ${formatBytes(file.size)} (${pct}%)`
          );
        };

        const completedParts: { part_number: number; etag: string }[] = [];
        const activeXhrs = new Set<XMLHttpRequest>();
        const abortController = new AbortController();
        let nextPartIdx = 0;
        let workerError: Error | null = null;

        const worker = async () => {
          while (nextPartIdx < part_urls.length && !workerError && !abortController.signal.aborted) {
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
                  if (currentXhr) {
                    activeXhrs.delete(currentXhr);
                  }
                  currentXhr = xhr;
                  activeXhrs.add(xhr);
                },
                2,
                abortController.signal
              );

              if (currentXhr) {
                activeXhrs.delete(currentXhr);
              }

              chunkLoadedBytes[currentIdx] = chunkSize;
              updateProgress();
              completedParts.push({ part_number: partNum, etag });

              // Persist incremental chunk progress to localStorage
              saveSession({
                ...initialSession,
                completedParts: [...completedParts],
              });
            } catch (err: any) {
              if (currentXhr) {
                activeXhrs.delete(currentXhr);
              }
              workerError = err;
              abortController.abort();
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

        if (workerError) {
          // Do NOT abort session on transient error - leave savedSession intact so user can resume!
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
          throw new Error(
            completeJson.detail || completeJson.error || "Failed to finalize multipart upload"
          );
        }

        clearSavedSession();
        setSavedSession(null);
        setProgress(100);
        setStatusText("Upload complete!");
        const generatedUrl = `${window.location.origin}/s/instant/${token}`;
        setShareUrl(generatedUrl);
        toast.success("Link created");
      }
    } catch (err: any) {
      const errorMsg =
        err?.name === "AbortError"
          ? "Upload was interrupted."
          : err?.message?.includes("Failed to fetch")
          ? "Network connection interrupted. You can resume when reconnected."
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

  const handleWhatsAppShare = () => {
    if (!shareUrl) return;
    const text = encodeURIComponent(`Download file via ByteVault:\n${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleTelegramShare = () => {
    if (!shareUrl) return;
    const url = encodeURIComponent(shareUrl);
    const text = encodeURIComponent("Download file via ByteVault");
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleEmailShare = () => {
    if (!shareUrl) return;
    const subject = encodeURIComponent(`File shared via ByteVault: ${file?.name || "Download Link"}`);
    const body = encodeURIComponent(
      `Hi,\n\nI've shared a file with you using ByteVault.\n\nYou can view and download it here:\n${shareUrl}\n\nPlease note: This link is temporary and will expire soon.\n\nBest,`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleNativeShare = async () => {
    if (!shareUrl || typeof navigator === "undefined" || !navigator.share) return;
    try {
      await navigator.share({
        title: file?.name || "Shared File",
        text: "Download file via ByteVault:",
        url: shareUrl,
      });
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.warn("[ByteVault] Native share dispatch failed:", err);
        toast.error("Sharing failed or was blocked by device.");
      }
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const expiryLabel = formatExpiry(config.expiry_minutes);
  const usesLabel = config.max_downloads_cap === 1 ? "once" : `${config.max_downloads_cap} times`;

  return (
    <div className="relative flex min-h-screen flex-col bg-bg font-sans">
      {/* Full-screen drag-and-drop overlay */}
      {isDraggingOver && (
        <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center border-4 border-dashed border-accent/70 bg-bg/90 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <UploadCloud className="h-14 w-14 text-accent" strokeWidth={1.5} />
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-ink">
            Drop your file to send it
          </h2>
          <p className="mt-2 text-sm text-ink-muted">Up to {formatBytes(maxSizeBytes)}</p>
        </div>
      )}

      <LandingNav />

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-14">
        <div className="pointer-events-none absolute inset-0 bg-brand-glow" />

        <div className="relative w-full max-w-xl">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Send a file</h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
            No account needed. The link works {usesLabel} and expires in {expiryLabel}, whichever
            comes first. Then the file is deleted.
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
                      It works {usesLabel} and expires in {expiryLabel}. The file is deleted as soon
                      as it is downloaded.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-md border border-border bg-bg-raised p-2">
                  <span className="flex-1 truncate px-2 font-mono text-[13px] text-ink">
                    {shareUrl}
                  </span>
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

                {/* Social Share & Quick Action Bar */}
                <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-bg-raised/40 p-3.5">
                  <p className="text-[12px] font-medium text-ink-muted">Share directly via:</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleWhatsAppShare}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 text-[12px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 active:scale-95"
                      title="Share to WhatsApp"
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                      WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={handleTelegramShare}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-sky-500/30 bg-sky-500/10 px-3 text-[12px] font-medium text-sky-400 transition-colors hover:bg-sky-500/20 active:scale-95"
                      title="Share to Telegram"
                    >
                      <TelegramIcon className="h-4 w-4" />
                      Telegram
                    </button>

                    <button
                      type="button"
                      onClick={handleEmailShare}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-bg-surface px-3 text-[12px] font-medium text-ink-muted transition-colors hover:bg-bg-raised hover:text-ink active:scale-95"
                      title="Send via Email"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </button>

                    {canNativeShare && (
                      <button
                        type="button"
                        onClick={handleNativeShare}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-3 text-[12px] font-medium text-accent-bright transition-colors hover:bg-accent/20 active:scale-95"
                        title="Open device share sheet"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share...
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowQr((prev) => !prev)}
                      className={cn(
                        "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12px] font-medium transition-colors active:scale-95",
                        showQr
                          ? "border-accent bg-accent/20 text-accent-bright"
                          : "border-border bg-bg-surface text-ink-muted hover:bg-bg-raised hover:text-ink"
                      )}
                      title="Show scannable QR code"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      QR Code
                    </button>
                  </div>

                  {/* QR Code Scannable View */}
                  {showQr && (
                    <div className="mt-2 flex flex-col items-center justify-center rounded-lg border border-border bg-bg-surface p-4 text-center animate-in fade-in duration-200">
                      <div className="rounded-md bg-white p-2.5 shadow-sm">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                            shareUrl
                          )}&margin=4`}
                          alt="Instant Share QR Code"
                          width={160}
                          height={160}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-[160px] w-[160px] object-contain"
                        />
                      </div>
                      <p className="mt-2.5 text-[12px] font-medium text-ink">Scan with your phone camera</p>
                      <p className="text-[11px] text-ink-muted">Instantly open or download on mobile</p>
                    </div>
                  )}
                </div>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setShareUrl(null);
                    setFile(null);
                    setShowQr(false);
                  }}
                >
                  Send another file
                </Button>
              </div>
            ) : (
              <form onSubmit={handleUpload} className="flex flex-col gap-5">
                {/* Resumable Unfinished Session Notification Banner */}
                {savedSession && !uploading && !shareUrl && (
                  <div className="flex flex-col gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Clock className="h-5 w-5 shrink-0 text-amber-500" />
                        <div>
                          <p className="text-[14px] font-medium text-ink">
                            Unfinished upload detected
                          </p>
                          <p className="mt-0.5 text-[12px] text-ink-muted">
                            <span className="font-medium text-ink">{savedSession.filename}</span> (
                            {formatBytes(savedSession.fileSize)}) —{" "}
                            {Math.round(
                              (savedSession.completedParts.length / savedSession.totalParts) * 100
                            )}
                            % uploaded
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-ink-muted hover:bg-danger/10 hover:text-danger"
                        onClick={handleDiscardUnfinished}
                        title="Discard incomplete upload"
                        aria-label="Discard incomplete upload"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-[12px] text-ink-muted">
                      Select or drop{" "}
                      <span className="font-semibold text-ink">{savedSession.filename}</span> to resume
                      from where you left off.
                    </p>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="guest-file-resume"
                        className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-amber-500 px-3 text-[13px] font-medium text-black transition-colors hover:bg-amber-400"
                      >
                        <RotateCw className="h-3.5 w-3.5" /> Resume Upload
                      </label>
                      <input
                        type="file"
                        id="guest-file-resume"
                        onChange={(e) => {
                          const selected = e.target.files?.[0] || null;
                          if (selected) {
                            if (
                              selected.name === savedSession.filename &&
                              selected.size === savedSession.fileSize
                            ) {
                              setFile(selected);
                              executeResume(selected, savedSession);
                            } else {
                              toast.error(
                                `File mismatch. Expected "${savedSession.filename}" (${formatBytes(
                                  savedSession.fileSize
                                )}).`
                              );
                            }
                          }
                        }}
                        className="sr-only"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[12px] text-ink-muted hover:text-ink"
                        onClick={handleDiscardUnfinished}
                      >
                        Discard
                      </Button>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  id="guest-file"
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    if (selected && selected.size > maxSizeBytes) {
                      toast.error(`File exceeds guest limit of ${formatBytes(maxSizeBytes)}.`);
                      return;
                    }
                    if (
                      savedSession &&
                      selected &&
                      (selected.name !== savedSession.filename ||
                        selected.size !== savedSession.fileSize)
                    ) {
                      handleDiscardUnfinished();
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

                {uploading && (
                  <div className="space-y-2" role="status" aria-live="polite">
                    <div className="flex justify-between text-[12px] text-ink-muted">
                      <span className="truncate">{statusText || "Uploading…"}</span>
                      <span className="font-mono text-ink">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-overlay">
                      <div
                        className="h-full bg-brand-gradient transition-all duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={uploading || !file}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                    </>
                  ) : savedSession && file?.name === savedSession.filename && file?.size === savedSession.fileSize ? (
                    <>
                      <RotateCw className="h-4 w-4" /> Resume upload
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
