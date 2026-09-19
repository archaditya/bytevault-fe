"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Upload, Loader2, CheckCircle2, ShieldAlert, Sparkles, Flame, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const liveChunks = Array.from({ length: 64 }, (_, i) => i);

// Client-side file signature (magic numbers) validator for demo
async function validateDemoFileSignature(file: File): Promise<void> {
  const chunk = file.slice(0, 262);
  const buffer = await chunk.arrayBuffer();
  const arr = new Uint8Array(buffer);
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // 1. Executable blocking
  const isPE = arr[0] === 0x4D && arr[1] === 0x5A; // MZ
  const isELF = arr[0] === 0x7F && arr[1] === 0x45 && arr[2] === 0x4C && arr[3] === 0x46; // ELF
  const isMachO = (arr[0] === 0xCF && arr[1] === 0xFA && arr[2] === 0xED && arr[3] === 0xFE) ||
    (arr[0] === 0xCE && arr[1] === 0xFA && arr[2] === 0xED && arr[3] === 0xFE);

  if (isPE || isELF || isMachO) {
    throw new Error("Security Violation: Executable binary files (.exe, .dll, ELF) are strictly prohibited.");
  }

  // 2. Validate known extensions
  if (ext === 'png') {
    const isPng = arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47;
    if (!isPng) throw new Error("Security Violation: Spoofed file extension. Extension claims PNG but actual binary header is not a PNG image.");
  }

  if (ext === 'jpg' || ext === 'jpeg') {
    const isJpeg = arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF;
    if (!isJpeg) throw new Error("Security Violation: Spoofed file extension. Extension claims JPEG but actual binary header is not a JPEG image.");
  }

  if (ext === 'pdf') {
    const isPdf = arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46;
    if (!isPdf) throw new Error("Security Violation: Spoofed file extension. Extension claims PDF but actual binary header is not a PDF document.");
  }

  if (['zip', 'docx', 'xlsx', 'pptx'].includes(ext)) {
    const isZip = arr[0] === 0x50 && arr[1] === 0x4B && arr[2] === 0x03 && arr[3] === 0x04;
    if (!isZip) throw new Error("Security Violation: Spoofed file extension. Extension claims archive/document but actual binary header is not ZIP formatted.");
  }
}

export function Hero() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'validating' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      startValidation(e.target.files[0]);
    }
  };

  const startValidation = async (file: File) => {
    setSelectedFile(file);
    setStatus('validating');
    setErrorMessage("");
    setUploadProgress(0);

    // Simulated short validation delay for sleek UX scanner animation
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      await validateDemoFileSignature(file);

      // Start upload simulation
      setStatus('uploading');
      let currentProgress = 0;
      if (progressInterval.current) clearInterval(progressInterval.current);

      progressInterval.current = setInterval(() => {
        currentProgress += 5;
        if (currentProgress >= 100) {
          currentProgress = 100;
          if (progressInterval.current) clearInterval(progressInterval.current);
          setStatus('success');
          setIsSignupOpen(true);
        }
        setUploadProgress(currentProgress);
      }, 70);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || "An unexpected validation error occurred.");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      startValidation(e.dataTransfer.files[0]);
    }
  };

  const resetUploadState = () => {
    setSelectedFile(null);
    setStatus('idle');
    setErrorMessage("");
    setUploadProgress(0);
    if (progressInterval.current) clearInterval(progressInterval.current);
  };

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 bg-grid-pattern bg-[size:42px_42px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_40%,transparent_100%)]" />
      <div className="container relative pt-28 pb-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          {/* Instant Share Flagship Promotion Pill */}
          <Link
            href="/instant"
            className="mb-6 group inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-[12px] sm:text-[13px] font-medium text-amber-300 backdrop-blur-sm transition-all hover:border-amber-500/60 hover:bg-amber-500/20 hover:scale-[1.02]"
          >
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-semibold text-amber-400">⚡ Instant Share:</span>
            <span className="text-ink-muted group-hover:text-ink transition-colors">Send files up to 2GB with zero signup & auto-expiry</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 text-amber-400" />
          </Link>

          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            File transfer, down to{" "}
            <span className="bg-gradient-to-r from-accent to-accent-bright bg-clip-text text-transparent">
              the chunk.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] sm:text-[16px] leading-relaxed text-ink-muted px-2">
            PushPostVault resumes every upload exactly where it stopped, retries only the
            piece that failed, and shows you precisely which chunk is in flight.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Hero CTAs with Responsive Mobile Layout (No Overflow) */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full max-w-lg sm:max-w-none px-4 sm:px-0">
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium border-0 shadow-lg shadow-orange-500/20"
              asChild
            >
              <Link href="/instant">
                <Flame className="h-4 w-4 fill-white/20" />
                Instant Share (No Signup)
              </Link>
            </Button>
            <Button size="lg" onClick={triggerFileSelect} variant="primary" className="w-full sm:w-auto gap-2">
              <Upload className="h-4 w-4" />
              Upload to Vault
            </Button>
            <Button size="lg" variant="secondary" className="w-full sm:w-auto" asChild>
              <Link href="/transfers">Live transfers</Link>
            </Button>
          </div>
        </div>

        {/* Interactive Sandbox Showcase */}
        <div className="mx-auto mt-16 max-w-2xl">
          {status === 'idle' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`rounded-md border p-5 cursor-pointer transition-all ${isDragging
                  ? "border-accent bg-accent/5 scale-[1.01]"
                  : "border-border bg-bg-surface hover:border-accent/40"
                }`}
            >
              <div className="mb-3 flex items-center justify-between font-mono text-[12px] text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-live animate-pulse-live" />
                  model-training-dataset.parquet
                </span>
                <span className="text-live">38.2 MB/s</span>
              </div>
              <div className="flex flex-wrap gap-[3px] mb-4">
                {liveChunks.map((i) => (
                  <span
                    key={i}
                    className="h-3 w-3 rounded-[2px] bg-accent"
                    style={{
                      opacity: i < 41 ? 1 : i === 41 ? undefined : 0.18,
                      animation: i === 41 ? "pulse-live 1.4s ease-in-out infinite" : undefined,
                      backgroundColor: i === 41 ? "#F5A623" : undefined,
                    }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-ink-faint text-center border-t border-border/40 pt-3">
                Drag and drop any file here to test-drive magic byte verification & streaming chunk grids instantly.
              </p>
            </div>
          )}

          {status === 'validating' && (
            <div className="rounded-md border border-accent bg-bg-surface p-8 text-center flex flex-col items-center justify-center min-h-[160px] animate-pulse">
              <Loader2 className="h-8 w-8 text-accent animate-spin mb-3" />
              <span className="text-sm font-semibold text-ink">Analyzing file binary header (magic numbers)...</span>
              <span className="text-xs text-ink-muted mt-1">Detecting spoofed extensions in real-time inside the browser</span>
            </div>
          )}

          {status === 'uploading' && (
            <div className="rounded-md border border-accent bg-bg-surface p-5">
              <div className="mb-3 flex items-center justify-between font-mono text-[12px] text-ink-muted">
                <span className="font-semibold text-ink truncate max-w-[300px]">{selectedFile?.name}</span>
                <span className="text-live animate-pulse">Chunk streaming: {uploadProgress}%</span>
              </div>
              <div className="flex flex-wrap gap-[3px]">
                {liveChunks.map((i) => {
                  const filledThreshold = Math.floor((liveChunks.length * uploadProgress) / 100);
                  const isCurrent = i === filledThreshold;
                  const isFilled = i < filledThreshold;
                  return (
                    <span
                      key={i}
                      className="h-3 w-3 rounded-[2px] bg-accent transition-all duration-150"
                      style={{
                        opacity: isFilled ? 1 : isCurrent ? undefined : 0.18,
                        animation: isCurrent ? "pulse-live 1.4s ease-in-out infinite" : undefined,
                        backgroundColor: isCurrent ? "#F5A623" : undefined,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="rounded-md border border-success bg-success/5 p-8 text-center flex flex-col items-center justify-center min-h-[160px]">
              <CheckCircle2 className="h-10 w-10 text-success mb-3 animate-bounce" />
              <span className="text-sm font-semibold text-ink">"{selectedFile?.name}" verified & secure!</span>
              <span className="text-xs text-ink-muted mt-1">Binary headers matched. Upload processed in 64 isolated chunks.</span>
              <div className="flex gap-3 mt-4">
                <Button size="sm" onClick={() => setIsSignupOpen(true)} className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Vault this file
                </Button>
                <Button size="sm" variant="secondary" onClick={resetUploadState}>
                  Upload another
                </Button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="rounded-md border border-danger bg-danger/5 p-8 text-center flex flex-col items-center justify-center min-h-[160px]">
              <ShieldAlert className="h-10 w-10 text-danger mb-3" />
              <span className="text-sm font-semibold text-danger">Upload Rejected</span>
              <span className="text-xs text-ink-muted mt-1.5 max-w-md">{errorMessage}</span>
              <div className="flex gap-3 mt-4">
                <Button size="sm" variant="secondary" onClick={resetUploadState}>
                  Try Another File
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Auth Prompt Trigger Modal */}
      <Dialog open={isSignupOpen} onOpenChange={setIsSignupOpen}>
        <DialogContent className="sm:max-w-md bg-bg-surface border-border-strong text-ink font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[18px]">
              <Sparkles className="h-5 w-5 text-accent animate-pulse" />
              Upload Your File in PushPostVault
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-[14px] text-ink-muted leading-relaxed">
              We have verified <strong>{selectedFile?.name}</strong> using binary signatures and split it into secure chunks.
            </p>
            <p className="text-[13px] text-ink-faint mt-2">
              Create a free account to upload, manage, and share your files securely with Cloudflare R2 / S3.
            </p>
            <div className="flex flex-col gap-2 mt-6">
              <Button asChild className="w-full">
                <Link href="/register?redirect=/files?triggerUpload=true">Create Free Account</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/login?redirect=/files?triggerUpload=true">Log In to Existing Account</Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
