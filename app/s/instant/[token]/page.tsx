"use client";

import { useState, useEffect } from "react";
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
  Smartphone,
  AlertTriangle,
  Clock,
  Loader2,
} from "lucide-react";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { cn, formatBytes } from "@/lib/utils";
import toast from "react-hot-toast";

interface EphemeralShare {
  filename: string;
  file_size: number;
  max_downloads: number;
  download_count: number;
  has_password: boolean;
}

export default function GuestDownloadPage() {
  const params = useParams();
  const token = (params?.token as string) || "";

  const [share, setShare] = useState<EphemeralShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [burned, setBurned] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  // Device detection for install guidance
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsAndroid(/Android/i.test(navigator.userAgent || ""));
    }
  }, []);

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

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Trigger browser download via invisible link
      const link = document.createElement("a");
      link.href = json.data.download_url;
      link.download = share?.filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Download started");

      // Update remaining download count locally
      setShare((prev) => {
        if (!prev) return prev;
        const newCount = prev.download_count + 1;
        if (newCount >= prev.max_downloads) {
          // Transition to burned card only when last download is consumed
          setTimeout(() => setBurned(true), 1500);
        }
        return { ...prev, download_count: newCount };
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to download");
    } finally {
      setDownloading(false);
    }
  };

  // Safe file type detection & icon mapping
  const safeFilename = share?.filename || "";
  const hasExt = safeFilename.includes(".") && !safeFilename.startsWith(".");
  const ext = hasExt ? safeFilename.split(".").pop()?.toLowerCase() || "" : "";
  const isAPK = ext === "apk";
  const isIPA = ext === "ipa";
  const isAppFile = isAPK || isIPA;

  const renderFileIcon = () => {
    const cls = "h-7 w-7 text-accent";
    if (isAPK || isIPA) return <Smartphone className="h-7 w-7 text-success" />;
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return <ImageIcon className={cls} />;
    if (["mp4", "mkv", "webm", "mov"].includes(ext)) return <Video className={cls} />;
    if (["mp3", "wav", "flac", "ogg"].includes(ext)) return <Music className={cls} />;
    if (["zip", "tar", "gz", "7z", "rar"].includes(ext)) return <FileArchive className={cls} />;
    if (["ts", "js", "py", "go", "json", "html", "css"].includes(ext)) return <FileCode className={cls} />;
    if (["pdf", "doc", "docx", "txt", "md"].includes(ext)) return <FileText className={cls} />;
    return <FileIcon className={cls} />;
  };

  const left = share ? Math.max(0, share.max_downloads - share.download_count) : 0;

  return (
    <div className="relative flex min-h-screen flex-col bg-bg font-sans">
      <LandingNav />

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
        <div className="pointer-events-none absolute inset-0 bg-brand-glow" />

        <div className="relative w-full max-w-md">
          {loading ? (
            <div className="rounded-lg border border-border-strong bg-bg-surface p-8 text-center" role="status">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
              <p className="mt-3 text-[14px] text-ink-muted">Loading your file…</p>
            </div>
          ) : burned || !share ? (
            <div className="rounded-lg border border-border-strong bg-bg-surface p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-raised text-ink-muted">
                <Clock className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-xl font-semibold text-ink">This link is no longer available</h1>
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink-muted">
                It has expired or reached its download limit, and the file has been deleted.
              </p>
              <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6">
                <Button size="lg" asChild>
                  <Link href="/instant">Send your own file</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/">Back to home</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border-strong bg-bg-surface p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-bg-raised">
                  {renderFileIcon()}
                </div>
                <div className="min-w-0">
                  <h1 className="break-all text-[17px] font-medium leading-snug text-ink" title={share.filename}>
                    {share.filename}
                  </h1>
                  <p className="mt-1 font-mono text-[12px] text-ink-muted">
                    {formatBytes(share.file_size)}
                    {ext ? ` · ${ext.toUpperCase()}` : ""}
                  </p>
                </div>
              </div>

              <form onSubmit={handleDownload} className="mt-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-ink-muted">Downloads left</span>
                    <span className="font-mono text-ink">
                      {left} of {share.max_downloads}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-overlay">
                    <div
                      className="h-full bg-brand-gradient transition-all duration-300"
                      style={{ width: `${Math.max(8, (left / share.max_downloads) * 100)}%` }}
                    />
                  </div>
                  {left <= 1 && (
                    <p className="mt-2 flex items-start gap-1.5 text-[12px] text-live">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      This is the last download. The file is deleted right after.
                    </p>
                  )}
                </div>

                {share.has_password && (
                  <div className="space-y-1.5">
                    <Label htmlFor="passcode" className="flex items-center gap-1.5 text-[13px] text-ink-muted">
                      <Lock className="h-3.5 w-3.5 text-ink-faint" /> Passcode required
                    </Label>
                    <Input
                      id="passcode"
                      type="password"
                      autoComplete="off"
                      placeholder="Enter the passcode you were given"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 border-border-strong bg-bg-raised text-[14px]"
                      required
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className={cn("w-full", isAPK && isAndroid && "bg-success bg-none hover:bg-success/90")}
                  disabled={downloading || left <= 0}
                >
                  {downloading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Preparing download…
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      {isAPK && isAndroid ? "Download and install APK" : isAPK ? "Download APK" : isIPA ? "Download IPA" : "Download"}
                    </>
                  )}
                </Button>

                {isAPK && isAndroid && (
                  <p className="rounded-md border border-success/20 bg-success/5 p-2.5 text-center text-[12px] text-ink-muted">
                    Tap above to start the download, then open the APK from your notifications to install it.
                  </p>
                )}

                <p className="text-center text-[12px] text-ink-faint">
                  Deleted automatically after the last download or when the link expires.
                </p>
              </form>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
