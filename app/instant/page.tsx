"use client";

import { useState, useEffect } from "react";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Flame, UploadCloud, Copy, Check, Lock, Zap } from "lucide-react";
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

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }

    // Client-side Validation against DB Config
    if (file.size > maxSizeBytes) {
      toast.error(
        `File exceeds dynamic guest limit of ${formatBytes(maxSizeBytes)}. Sign in for larger files.`
      );
      return;
    }

    setUploading(true);
    setProgress(15);

    try {
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
      setProgress(50);

      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Storage upload failed.");
      }

      setProgress(100);
      const generatedUrl = `${window.location.origin}/s/instant/${token}`;
      setShareUrl(generatedUrl);
      toast.success("Self-destruct link generated!");
    } catch (err: any) {
      toast.error(err.message || "Guest upload rate limit reached or failed.");
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
    <div className="min-h-screen flex flex-col bg-bg-base font-sans">
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
                Anonymous single-use transfer. Auto-purged after download or expiration.
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
                      This file will be permanently deleted from storage as soon as it is downloaded.
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
                  {/* Dropzone */}
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-amber-500/50 rounded-xl p-8 transition-all bg-bg-raised/40 hover:bg-bg-raised/80 group">
                    <UploadCloud className="h-10 w-10 text-ink-muted group-hover:text-amber-500 transition-colors mb-3" />
                    <input
                      type="file"
                      id="guest-file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label htmlFor="guest-file" className="cursor-pointer text-xs font-semibold text-amber-500 hover:underline">
                      {file ? file.name : `Select or Drop File (Max ${formatBytes(maxSizeBytes)})`}
                    </label>
                    {file && (
                      <span className="text-[11px] text-ink-muted font-mono mt-1">{formatBytes(file.size)}</span>
                    )}
                  </div>

                  {/* Real-time Dynamic Config Badges */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 p-2 rounded bg-bg-raised border border-border text-ink-muted">
                      <Flame className="h-3.5 w-3.5 text-amber-500" />
                      <span>Limit: {config.max_downloads_cap} Download</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 rounded bg-bg-raised border border-border text-ink-muted">
                      <Zap className="h-3.5 w-3.5 text-accent" />
                      <span>Expiry: {config.expiry_minutes} Mins</span>
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
                      className="w-full h-8 rounded border border-border bg-bg-raised px-3 text-xs text-ink outline-none focus:border-amber-500/50"
                    />
                  </div>

                  {uploading && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-ink-muted font-mono">
                        <span>Uploading to Storage...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-bg-raised rounded-full h-1.5 overflow-hidden border border-border">
                        <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full text-xs font-semibold" disabled={uploading || !file}>
                    {uploading ? "Securing & Transmitting..." : "Generate Burn Link"}
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
