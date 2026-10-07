"use client";

import React from "react";
import {
  Archive,
  Smartphone,
  Code2,
  FileText,
  Table,
  Music,
  Film,
  KeyRound,
  ShieldCheck,
  FileSpreadsheet,
  FileCode2,
  Layers,
  Sparkles,
  Play,
  FileQuestion,
  Image as ImageIcon,
} from "lucide-react";
import { FileRecord } from "@/types";
import { formatBytes, cn } from "@/lib/utils";

interface RichFilePreviewProps {
  file: FileRecord;
  className?: string;
}

export function RichFilePreview({ file, className }: RichFilePreviewProps) {
  const fileName = file.name || "";
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase() || ""
    : "";
  const mime = file.mimeType?.toLowerCase() || "";

  // 1. Archives (ZIP, RAR, 7Z, TAR, GZ, etc.)
  const isArchive =
    file.kind === "archive" ||
    ["zip", "rar", "7z", "tar", "gz", "tgz", "bz2", "xz", "iso"].includes(ext) ||
    mime.includes("zip") ||
    mime.includes("tar") ||
    mime.includes("compressed");

  // 2. Mobile App Packages (APK, AAB, IPA, XAPK)
  const isAppPackage =
    ["apk", "aab", "ipa", "xapk", "deb", "rpm"].includes(ext) ||
    mime.includes("android.package-archive");

  // 3. Security / Certificates / Keys
  const isSecurity =
    ["pem", "crt", "cer", "key", "pfx", "p12", "pub", "jks", "keystore"].includes(ext) ||
    mime.includes("x-x509") ||
    fileName.toLowerCase().includes("cert") ||
    fileName.toLowerCase().includes("key");

  // 4. Code & Developer Files
  const isCode =
    file.kind === "code" ||
    [
      "js",
      "ts",
      "tsx",
      "jsx",
      "py",
      "go",
      "rs",
      "java",
      "c",
      "cpp",
      "h",
      "hpp",
      "cs",
      "rb",
      "php",
      "json",
      "yaml",
      "yml",
      "sql",
      "sh",
      "bash",
      "html",
      "css",
      "scss",
      "env",
      "dockerfile",
    ].includes(ext) ||
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("json") ||
    mime.includes("python");

  // 5. Spreadsheets / Tabular Data
  const isSpreadsheet =
    ["csv", "tsv", "xls", "xlsx", "parquet"].includes(ext) ||
    mime.includes("spreadsheet") ||
    mime.includes("csv") ||
    mime.includes("excel");

  // 6. Documents (PDF, Word, Text)
  const isPdf = ext === "pdf" || mime.includes("pdf");
  const isDoc =
    file.kind === "document" ||
    ["doc", "docx", "txt", "md", "rtf", "odt"].includes(ext);

  // 7. Audio
  const isAudio =
    file.kind === "audio" ||
    ["mp3", "wav", "flac", "aac", "ogg", "m4a", "opus"].includes(ext) ||
    mime.startsWith("audio/");

  // 8. Video
  const isVideo =
    file.kind === "video" ||
    ["mp4", "mkv", "mov", "webm", "avi"].includes(ext) ||
    mime.startsWith("video/");

  // 9. Image fallback
  const isImage = file.kind === "image" || mime.startsWith("image/");

  // RENDER: ARCHIVES
  if (isArchive) {
    return (
      <div
        className={cn(
          "relative h-full w-full flex flex-col items-center justify-center p-3 overflow-hidden select-none",
          "bg-gradient-to-b from-amber-500/10 via-amber-950/20 to-bg-raised",
          className
        )}
      >
        {/* Subtle patterned background */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:12px_12px]" />

        {/* 3D Archive Box Graphic */}
        <div className="relative flex flex-col items-center group-hover:scale-105 transition-transform duration-200">
          <div className="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500/25 to-amber-600/10 border border-amber-500/30 shadow-lg shadow-amber-500/10">
            <Archive className="h-7 w-7 text-amber-400 stroke-[1.8]" />
            {/* Zipper strap detail */}
            <div className="absolute -top-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-bg text-[9px] font-black uppercase tracking-wider shadow">
              {ext || "ZIP"}
            </div>
          </div>

          {/* Symmetrical compression ribs */}
          <div className="flex gap-1 mt-2.5">
            <span className="h-1 w-3 rounded-full bg-amber-500/40" />
            <span className="h-1 w-5 rounded-full bg-amber-500/60" />
            <span className="h-1 w-3 rounded-full bg-amber-500/40" />
          </div>
        </div>

        {/* Footer Pill */}
        <div className="mt-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/25 text-[10px] font-mono font-medium text-amber-300">
          <Layers className="h-3 w-3 text-amber-400" />
          <span>COMPRESSED ARCHIVE</span>
        </div>
      </div>
    );
  }

  // RENDER: MOBILE APP PACKAGES (APK, IPA)
  if (isAppPackage) {
    return (
      <div
        className={cn(
          "relative h-full w-full flex flex-col items-center justify-center p-3 overflow-hidden select-none",
          "bg-gradient-to-b from-emerald-500/10 via-emerald-950/20 to-bg-raised",
          className
        )}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:12px_12px]" />

        <div className="relative flex flex-col items-center group-hover:scale-105 transition-transform duration-200">
          <div className="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-emerald-600/10 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
            <Smartphone className="h-7 w-7 text-emerald-400 stroke-[1.8]" />
            <div className="absolute -top-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-bg text-[9px] font-black uppercase tracking-wider shadow">
              .{ext.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-[10px] font-mono font-medium text-emerald-300">
          <ShieldCheck className="h-3 w-3 text-emerald-400" />
          <span>APP PACKAGE</span>
        </div>
      </div>
    );
  }

  // RENDER: SECURITY CERTIFICATES / KEYS
  if (isSecurity) {
    return (
      <div
        className={cn(
          "relative h-full w-full flex flex-col items-center justify-center p-3 overflow-hidden select-none",
          "bg-gradient-to-b from-yellow-500/10 via-amber-950/25 to-bg-raised",
          className
        )}
      >
        <div className="relative flex flex-col items-center group-hover:scale-105 transition-transform duration-200">
          <div className="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400/25 to-yellow-600/10 border border-amber-400/30 shadow-lg shadow-amber-400/10">
            <KeyRound className="h-7 w-7 text-amber-300 stroke-[1.8]" />
            <div className="absolute -top-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-bg text-[9px] font-black uppercase tracking-wider shadow">
              .{ext || "KEY"}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/25 text-[10px] font-mono font-medium text-amber-300">
          <ShieldCheck className="h-3 w-3 text-amber-300" />
          <span>SECURITY CREDENTIAL</span>
        </div>
      </div>
    );
  }

  // RENDER: CODE & DEVELOPER FILES
  if (isCode) {
    const langLabel = (ext || "CODE").toUpperCase();
    return (
      <div
        className={cn(
          "relative h-full w-full flex flex-col justify-between p-3 overflow-hidden select-none",
          "bg-gradient-to-b from-cyan-950/20 via-bg-surface to-bg-raised",
          className
        )}
      >
        {/* Mini IDE Header Bar */}
        <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500/80" />
            <span className="h-2 w-2 rounded-full bg-yellow-500/80" />
            <span className="h-2 w-2 rounded-full bg-green-500/80" />
          </div>
          <span className="text-[9px] font-mono text-cyan-400 font-semibold px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/20">
            {langLabel}
          </span>
        </div>

        {/* Code Lines Mockup */}
        <div className="flex flex-col gap-1.5 py-1 px-1 font-mono text-[9px] opacity-80">
          <div className="flex items-center gap-2">
            <span className="text-ink-faint w-3 text-right">1</span>
            <div className="h-2 w-16 rounded bg-cyan-400/60" />
            <div className="h-2 w-10 rounded bg-purple-400/50" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-faint w-3 text-right">2</span>
            <div className="h-2 w-4 rounded bg-ink-faint/30 ml-2" />
            <div className="h-2 w-20 rounded bg-emerald-400/50" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-faint w-3 text-right">3</span>
            <div className="h-2 w-8 rounded bg-amber-400/50 ml-2" />
            <div className="h-2 w-14 rounded bg-cyan-400/40" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-faint w-3 text-right">4</span>
            <div className="h-2 w-6 rounded bg-purple-400/60" />
          </div>
        </div>

        {/* Footer Pill */}
        <div className="flex items-center justify-between text-[10px] text-ink-muted pt-1 border-t border-border/40 font-mono">
          <span className="flex items-center gap-1 text-cyan-400">
            <Code2 className="h-3 w-3" />
            <span>SOURCE CODE</span>
          </span>
          <span className="text-ink-faint">{formatBytes(file.sizeBytes)}</span>
        </div>
      </div>
    );
  }

  // RENDER: SPREADSHEETS / DATASETS
  if (isSpreadsheet) {
    return (
      <div
        className={cn(
          "relative h-full w-full flex flex-col justify-between p-3 overflow-hidden select-none",
          "bg-gradient-to-b from-emerald-950/20 via-bg-surface to-bg-raised",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
          <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-mono font-medium">
            <Table className="h-3.5 w-3.5" />
            <span>SHEET DATA</span>
          </div>
          <span className="text-[9px] font-mono text-emerald-300 font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30">
            .{ext.toUpperCase()}
          </span>
        </div>

        {/* Grid Preview Table */}
        <div className="grid grid-cols-3 gap-1 py-1 px-0.5 opacity-75">
          <div className="h-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
          <div className="h-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
          <div className="h-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
          <div className="h-3 rounded bg-bg-overlay border border-border/40" />
          <div className="h-3 rounded bg-bg-overlay border border-border/40" />
          <div className="h-3 rounded bg-bg-overlay border border-border/40" />
          <div className="h-3 rounded bg-bg-overlay border border-border/40" />
          <div className="h-3 rounded bg-bg-overlay border border-border/40" />
          <div className="h-3 rounded bg-bg-overlay border border-border/40" />
        </div>

        <div className="flex items-center justify-between text-[10px] text-ink-muted pt-1 border-t border-border/40 font-mono">
          <span className="text-emerald-400">STRUCTURED DATA</span>
          <span className="text-ink-faint">{formatBytes(file.sizeBytes)}</span>
        </div>
      </div>
    );
  }

  // RENDER: PDF & DOCUMENTS
  if (isPdf || isDoc) {
    const isDocx = ["doc", "docx"].includes(ext);
    const themeColor = isPdf
      ? "from-rose-950/25 border-rose-500/30 text-rose-400 bg-rose-500/15"
      : isDocx
      ? "from-blue-950/25 border-blue-500/30 text-blue-400 bg-blue-500/15"
      : "from-slate-900/30 border-border/60 text-ink-muted bg-bg-overlay";

    return (
      <div
        className={cn(
          "relative h-full w-full flex flex-col items-center justify-center p-3 overflow-hidden select-none bg-gradient-to-b via-bg-surface to-bg-raised",
          themeColor,
          className
        )}
      >
        {/* Document Sheet Graphic with folded corner */}
        <div className="relative flex flex-col items-center group-hover:scale-105 transition-transform duration-200">
          <div className="relative flex flex-col justify-between h-16 w-12 rounded-lg bg-bg-surface border border-border/80 shadow-md p-2">
            {/* Top badge */}
            <div className="flex justify-between items-center">
              <FileText className="h-4 w-4 text-ink-muted" />
              <div className="h-2 w-2 rounded-bl bg-border" />
            </div>

            {/* Simulated text lines */}
            <div className="flex flex-col gap-1 w-full">
              <div className="h-1 w-full rounded bg-ink-faint/30" />
              <div className="h-1 w-4/5 rounded bg-ink-faint/30" />
              <div className="h-1 w-3/5 rounded bg-ink-faint/30" />
            </div>
          </div>

          <div className="mt-2.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border shadow-sm">
            {ext ? `.${ext.toUpperCase()}` : "DOCUMENT"}
          </div>
        </div>
      </div>
    );
  }

  // RENDER: AUDIO
  if (isAudio) {
    return (
      <div
        className={cn(
          "relative h-full w-full flex flex-col items-center justify-center p-3 overflow-hidden select-none",
          "bg-gradient-to-b from-purple-500/10 via-purple-950/25 to-bg-raised",
          className
        )}
      >
        <div className="relative flex flex-col items-center group-hover:scale-105 transition-transform duration-200">
          <div className="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500/25 to-purple-600/10 border border-purple-500/30 shadow-lg shadow-purple-500/10">
            <Music className="h-7 w-7 text-purple-400 stroke-[1.8]" />
            <div className="absolute -top-1.5 px-1.5 py-0.5 rounded-full bg-purple-500 text-bg text-[9px] font-black uppercase tracking-wider shadow">
              {ext ? `.${ext.toUpperCase()}` : "AUDIO"}
            </div>
          </div>

          {/* Equalizer Waveform Bars */}
          <div className="flex items-end gap-1 h-5 mt-2.5">
            <span className="w-1 h-2 rounded-full bg-purple-400/60" />
            <span className="w-1 h-4 rounded-full bg-purple-400/80" />
            <span className="w-1 h-5 rounded-full bg-purple-400" />
            <span className="w-1 h-3 rounded-full bg-purple-400/80" />
            <span className="w-1 h-4 rounded-full bg-purple-400/90" />
            <span className="w-1 h-2 rounded-full bg-purple-400/60" />
          </div>
        </div>

        <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/25 text-[10px] font-mono font-medium text-purple-300">
          <span>AUDIO TRACK</span>
        </div>
      </div>
    );
  }

  // RENDER: VIDEO
  if (isVideo) {
    return (
      <div
        className={cn(
          "relative h-full w-full flex flex-col items-center justify-center p-3 overflow-hidden select-none",
          "bg-gradient-to-b from-indigo-500/10 via-indigo-950/25 to-bg-raised",
          className
        )}
      >
        {/* Filmstrip perforation edges */}
        <div className="absolute top-1 left-2 right-2 flex justify-between opacity-30">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="h-1.5 w-2 rounded-sm bg-indigo-400" />
          ))}
        </div>
        <div className="absolute bottom-1 left-2 right-2 flex justify-between opacity-30">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="h-1.5 w-2 rounded-sm bg-indigo-400" />
          ))}
        </div>

        <div className="relative flex flex-col items-center group-hover:scale-105 transition-transform duration-200">
          <div className="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500/25 to-indigo-600/10 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
            <Film className="h-7 w-7 text-indigo-400 stroke-[1.8]" />
            <div className="absolute -top-1.5 px-1.5 py-0.5 rounded-full bg-indigo-500 text-bg text-[9px] font-black uppercase tracking-wider shadow">
              {ext ? `.${ext.toUpperCase()}` : "VIDEO"}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/25 text-[10px] font-mono font-medium text-indigo-300">
          <Play className="h-2.5 w-2.5 text-indigo-400 fill-indigo-400" />
          <span>MEDIA STREAM</span>
        </div>
      </div>
    );
  }

  // RENDER: IMAGE FALLBACK (when thumbnail is still generating or failed)
  if (isImage) {
    return (
      <div
        className={cn(
          "relative h-full w-full flex flex-col items-center justify-center p-3 overflow-hidden select-none",
          "bg-gradient-to-b from-pink-500/10 via-pink-950/20 to-bg-raised",
          className
        )}
      >
        <div className="relative flex flex-col items-center group-hover:scale-105 transition-transform duration-200">
          <div className="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-pink-500/25 to-pink-600/10 border border-pink-500/30 shadow-lg shadow-pink-500/10">
            <ImageIcon className="h-7 w-7 text-pink-400 stroke-[1.8]" />
            <div className="absolute -top-1.5 px-1.5 py-0.5 rounded-full bg-pink-500 text-bg text-[9px] font-black uppercase tracking-wider shadow">
              {ext ? `.${ext.toUpperCase()}` : "IMAGE"}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-pink-500/15 border border-pink-500/25 text-[10px] font-mono font-medium text-pink-300">
          <span>GRAPHIC ASSET</span>
        </div>
      </div>
    );
  }

  // DEFAULT / GENERIC FILE PREVIEW
  return (
    <div
      className={cn(
        "relative h-full w-full flex flex-col items-center justify-center p-3 overflow-hidden select-none",
        "bg-gradient-to-b from-bg-overlay/60 via-bg-surface to-bg-raised",
        className
      )}
    >
      <div className="relative flex flex-col items-center group-hover:scale-105 transition-transform duration-200">
        <div
          className="relative flex items-center justify-center h-14 w-14 rounded-2xl shadow-inner border border-border"
          style={{
            backgroundColor: `${file.thumbnailColor || "#f97316"}20`,
            color: file.thumbnailColor || "#f97316",
          }}
        >
          <FileQuestion className="h-7 w-7 stroke-[1.8]" />
          {ext && (
            <div
              className="absolute -top-1.5 px-1.5 py-0.5 rounded-full text-bg text-[9px] font-black uppercase tracking-wider shadow"
              style={{ backgroundColor: file.thumbnailColor || "#f97316" }}
            >
              .{ext.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-overlay border border-border/80 text-[10px] font-mono text-ink-muted">
        <span>{mime ? mime.split("/")[1]?.toUpperCase() : "BINARY FILE"}</span>
      </div>
    </div>
  );
}
