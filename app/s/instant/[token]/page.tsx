"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, Download, Lock } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import toast from "react-hot-toast";

export default function GuestDownloadPage() {
  const params = useParams();
  const token = params.token as string;

  const [share, setShare] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [burned, setBurned] = useState(false);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const res = await fetch(`/api/v1/ephemeral/metadata/${token}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.detail || "File not found or self-destructed");
        }
        setShare(json.data.share);
      } catch (err: any) {
        setBurned(true);
      } finally {
        setLoading(false);
      }
    }
    fetchMetadata();
  }, [token]);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setDownloading(true);

    try {
      const res = await fetch(`/api/v1/ephemeral/download/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password || undefined }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || "Download failed");
      }

      // Trigger browser download via invisible link without breaking Next.js page state
      const link = document.createElement("a");
      link.href = json.data.download_url;
      link.download = share?.filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Download started!");

      // Update remaining download count locally
      setShare((prev: any) => {
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-bg-base text-xs text-ink-muted font-sans">
        Loading secure file metadata...
      </div>
    );
  }

  if (burned || !share) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-bg-base font-sans">
        <Card className="w-full max-w-md border-border-strong bg-bg-surface text-center p-6 shadow-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger mx-auto mb-3">
            <Flame className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-ink mb-1">File Burned & Expired</h2>
          <p className="text-xs text-ink-muted">
            This file has reached its maximum download limit or expiration time and has been permanently purged from cloud storage.
          </p>
        </Card>
      </div>
    );
  }

  const remaining = Math.max(0, share.max_downloads - share.download_count);

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-bg-base font-sans">
      <Card className="w-full max-w-md border-border-strong bg-bg-surface shadow-2xl">
        <CardHeader className="text-center pb-4 border-b border-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mx-auto mb-2">
            <Flame className="h-5 w-5" />
          </div>
          <CardTitle className="text-base font-bold text-ink truncate">{share.filename}</CardTitle>
          <p className="text-xs text-ink-muted font-mono">{formatBytes(share.file_size)}</p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleDownload} className="space-y-4">
            <div className="p-3 bg-bg-raised rounded border border-border text-xs text-ink-muted flex items-center justify-between font-mono">
              <span>Remaining Downloads:</span>
              <strong className="text-amber-500">{remaining} of {share.max_downloads}</strong>
            </div>

            {share.has_password && (
              <div className="space-y-1.5">
                <Label htmlFor="passcode" className="text-xs flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Passcode Required
                </Label>
                <Input
                  id="passcode"
                  type="password"
                  placeholder="Enter passcode to unlock"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full text-xs font-semibold" disabled={downloading || remaining <= 0}>
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "Preparing Download..." : "Download File"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
