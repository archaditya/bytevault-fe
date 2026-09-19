"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Flame,
  Download,
  Lock,
  ShieldCheck,
  File as FileIcon,
  FileText,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Video,
  Music,
  ArrowRight,
  Sparkles,
  Smartphone,
  AlertTriangle,
} from "lucide-react";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { formatBytes } from "@/lib/utils";
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

      toast.success("Download started!");

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
    if (isAPK || isIPA) {
      return <Smartphone className="h-8 w-8 text-green-400" />;
    }
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
      return <ImageIcon className="h-8 w-8 text-blue-400" />;
    }
    if (["mp4", "mkv", "webm", "mov"].includes(ext)) {
      return <Video className="h-8 w-8 text-purple-400" />;
    }
    if (["mp3", "wav", "flac", "ogg"].includes(ext)) {
      return <Music className="h-8 w-8 text-pink-400" />;
    }
    if (["zip", "tar", "gz", "7z", "rar"].includes(ext)) {
      return <FileArchive className="h-8 w-8 text-amber-400" />;
    }
    if (["ts", "js", "py", "go", "json", "html", "css"].includes(ext)) {
      return <FileCode className="h-8 w-8 text-emerald-400" />;
    }
    if (["pdf", "doc", "docx", "txt", "md"].includes(ext)) {
      return <FileText className="h-8 w-8 text-rose-400" />;
    }
    return <FileIcon className="h-8 w-8 text-accent-bright" />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-base font-sans">
      <LandingNav />

      <main className="flex-1 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
        {/* Ambient Brand Glows */}
        <div className="absolute top-1/3 left-1/4 -z-10 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 -z-10 h-96 w-96 rounded-full bg-accent/10 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-lg">
          {loading ? (
            <Card className="border-border-strong bg-bg-surface/90 backdrop-blur-xl shadow-2xl p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mx-auto mb-4 animate-pulse">
                <Flame className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-ink">Retrieving Secure Transfer...</h3>
              <p className="text-xs text-ink-muted mt-1 font-mono">
                Decrypting ephemeral metadata from PushPortVault
              </p>
            </Card>
          ) : burned || !share ? (
            <Card className="border-border-strong bg-bg-surface/90 backdrop-blur-xl shadow-2xl text-center p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-danger/10 border border-danger/20 text-danger mx-auto mb-4 shadow-lg shadow-danger/10">
                <Flame className="h-8 w-8" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-danger/10 text-danger text-[11px] font-semibold border border-danger/20 mb-3">
                <AlertTriangle className="h-3.5 w-3.5" /> Transfer Expired
              </span>
              <h2 className="text-xl font-bold text-ink">File Burned &amp; Purged</h2>
              <p className="text-xs text-ink-muted mt-2 max-w-sm mx-auto leading-relaxed">
                This file reached its download quota or expiry threshold and has been permanently wiped from PushPortVault storage.
              </p>

              <div className="mt-6 pt-6 border-t border-border flex flex-col gap-2">
                <Button asChild className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold h-10 rounded-xl">
                  <Link href="/instant">
                    <Flame className="h-4 w-4 mr-2" /> Send Your Own Instant File
                  </Link>
                </Button>
                <Button variant="ghost" asChild className="w-full text-xs text-ink-muted hover:text-ink">
                  <Link href="/">Back to PushPortVault Home</Link>
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="border-border-strong bg-bg-surface/90 backdrop-blur-xl shadow-2xl overflow-hidden">
              {/* Header Badge */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-6 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                    Burn-After-Reading Transfer
                  </span>
                </div>
                <span className="text-[11px] font-mono text-ink-muted">
                  Self-Destruct Active
                </span>
              </div>

              <CardHeader className="text-center pb-4 pt-6">
                {/* File Thumbnail & Type Badge */}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-raised border border-border shadow-inner mx-auto mb-4 relative">
                  {renderFileIcon()}
                  <div className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-black shadow">
                    <Flame className="h-3.5 w-3.5" />
                  </div>
                </div>

                <CardTitle className="text-lg font-bold text-ink break-all px-2" title={share.filename}>
                  {share.filename}
                </CardTitle>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-xs font-mono text-ink-muted">
                    {formatBytes(share.file_size)}
                  </span>
                  {ext && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-bg-raised text-ink-muted border border-border">
                      {ext}
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-2 pb-6 px-6">
                <form onSubmit={handleDownload} className="space-y-4">
                  {/* Quota & Burn Indicator */}
                  <div className="p-3.5 rounded-xl bg-bg-raised/70 border border-border space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-ink-muted flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-amber-500" />
                        Remaining Downloads:
                      </span>
                      <strong className="text-amber-500 font-bold">
                        {Math.max(0, share.max_downloads - share.download_count)} of {share.max_downloads}
                      </strong>
                    </div>

                    <div className="w-full bg-bg-base rounded-full h-1.5 overflow-hidden border border-border/50">
                      <div
                        className="bg-amber-500 h-full transition-all duration-300"
                        style={{
                          width: `${Math.max(
                            10,
                            ((share.max_downloads - share.download_count) / share.max_downloads) * 100
                          )}%`,
                        }}
                      />
                    </div>

                    {share.max_downloads - share.download_count <= 1 && (
                      <p className="text-[10px] text-amber-400/90 flex items-center gap-1 pt-0.5">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                        Final download. File will be permanently purged immediately after.
                      </p>
                    )}
                  </div>

                  {/* Passcode Input if Protected */}
                  {share.has_password && (
                    <div className="space-y-1.5">
                      <Label htmlFor="passcode" className="text-xs text-ink-muted flex items-center gap-1.5 font-medium">
                        <Lock className="h-3.5 w-3.5 text-amber-500" /> Passcode Required to Unlock
                      </Label>
                      <Input
                        id="passcode"
                        type="password"
                        placeholder="Enter file passcode"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-10 text-xs font-mono rounded-xl bg-bg-raised border-border focus:border-amber-500"
                        required
                      />
                    </div>
                  )}

                  {/* Primary Download Button */}
                  <Button
                    type="submit"
                    className={`w-full text-xs font-semibold h-11 rounded-xl shadow-lg transition-all ${
                      isAPK && isAndroid
                        ? "bg-green-600 hover:bg-green-500 text-white shadow-green-600/20"
                        : "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20"
                    }`}
                    disabled={downloading || share.max_downloads - share.download_count <= 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloading
                      ? "Decrypting & Downloading..."
                      : isAPK && isAndroid
                        ? "📲 Download & Install APK"
                        : isAPK
                          ? "Download APK Package"
                          : isIPA
                            ? "Download IPA Package"
                            : "Download & Burn File"
                    }
                  </Button>

                  {/* Smart Mobile Guidance */}
                  {isAPK && isAndroid && (
                    <div className="p-2.5 rounded-lg bg-green-500/5 border border-green-500/20 text-[11px] text-ink-muted text-center">
                      Tap above to start download. Open the APK from notifications to complete installation.
                    </div>
                  )}

                  {/* Trust Footer */}
                  <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-ink-muted">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Protected by PushPortVault zero-knowledge delivery</span>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
