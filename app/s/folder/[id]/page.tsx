"use client";

import { use, useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  Folder,
  Download,
  Share2,
  Copy,
  Check,
  Search,
  Grid,
  List,
  Eye,
  File as FileIcon,
  Smartphone,
  Image as ImageIcon,
  Video,
  Music,
  FileArchive,
  FileCode,
  FileText,
  AlertCircle,
  FolderOpen,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader2,
  BookmarkPlus,
  Cloud,
  CheckSquare,
  Square,
  ArrowUpDown,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { cn, formatBytes } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";

interface PublicFile {
  id: string;
  filename: string;
  file_size: number;
  content_type: string;
  created_at: string;
  updated_at?: string;
  thumbnail_url?: string;
  direct_url?: string;
  download_url?: string;
}

interface PublicSubfolder {
  id: string;
  name: string;
  created_at: string;
}

interface PublicBreadcrumb {
  id: string;
  name: string;
}

interface PublicFolderData {
  folder: {
    id: string;
    name: string;
    created_at: string;
    updated_at?: string;
  };
  subfolders: PublicSubfolder[];
  files: PublicFile[];
  breadcrumbs?: PublicBreadcrumb[];
  zip_url?: string;
}

type SortField = "name" | "size" | "date";
type SortOrder = "asc" | "desc";

function getFileTypeInfo(filename: string, mimeType: string) {
  const ext = filename.includes(".")
    ? filename.split(".").pop()?.toLowerCase() || ""
    : "";
  const mime = (mimeType || "").toLowerCase();

  const isAPK =
    ext === "apk" || mime === "application/vnd.android.package-archive";
  const isIPA =
    ext === "ipa" || (mime === "application/octet-stream" && ext === "ipa");
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");
  const isArchive = ["zip", "tar", "gz", "7z", "rar", "bz2"].includes(ext);
  const isPDF = mime === "application/pdf" || ext === "pdf";
  const isCode =
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("xml") ||
    [
      "js",
      "ts",
      "tsx",
      "jsx",
      "json",
      "py",
      "go",
      "rs",
      "java",
      "cpp",
      "c",
      "h",
      "html",
      "css",
      "md",
      "yaml",
      "yml",
      "sh",
    ].includes(ext);

  return {
    ext,
    isAPK,
    isIPA,
    isImage,
    isVideo,
    isAudio,
    isArchive,
    isPDF,
    isCode,
  };
}

export default function PublicSharedFolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const folderId = resolvedParams.id;
  const { isAuthenticated } = useAuthStore();

  const [data, setData] = useState<PublicFolderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isSavingToVault, setIsSavingToVault] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // File selection
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // In-platform Preview modal state
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  const fetchFolder = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/v1/folders/public/${folderId}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Shared folder not found or access has been restricted");
        }
        return res.json();
      })
      .then((json) => {
        if (json.status === "success" && json.data) {
          setData(json.data);
        } else {
          throw new Error("Invalid response received from server");
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load shared folder");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [folderId]);

  useEffect(() => {
    fetchFolder();
  }, [fetchFolder]);

  // Filtered & Sorted files
  const filteredAndSortedFiles = useMemo(() => {
    if (!data?.files) return [];
    let list = [...data.files];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((f) => f.filename.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.filename.localeCompare(b.filename);
      } else if (sortField === "size") {
        comparison = a.file_size - b.file_size;
      } else if (sortField === "date") {
        comparison =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return list;
  }, [data?.files, searchQuery, sortField, sortOrder]);

  const activePreviewFile =
    previewIndex !== null && filteredAndSortedFiles[previewIndex]
      ? filteredAndSortedFiles[previewIndex]
      : null;

  // Load preview text when text-based file opened
  useEffect(() => {
    if (!activePreviewFile) {
      setPreviewText(null);
      return;
    }

    const { isCode } = getFileTypeInfo(
      activePreviewFile.filename,
      activePreviewFile.content_type
    );

    if (isCode) {
      setLoadingText(true);
      const url = `/api/v1/files/public/${activePreviewFile.id}?inline=true`;
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("Could not fetch text content");
          return res.text();
        })
        .then((txt) => {
          if (txt.length > 80 * 1024) {
            setPreviewText(
              txt.substring(0, 80 * 1024) +
                "\n\n... [Content truncated for preview. Download to view complete file] ..."
            );
          } else {
            setPreviewText(txt);
          }
        })
        .catch(() => {
          setPreviewText("Preview not available for this file.");
        })
        .finally(() => {
          setLoadingText(false);
        });
    }
  }, [activePreviewFile]);

  // Keyboard navigation for preview modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewIndex === null) return;
      if (e.key === "ArrowRight") {
        if (previewIndex < filteredAndSortedFiles.length - 1) {
          setPreviewIndex(previewIndex + 1);
        }
      } else if (e.key === "ArrowLeft") {
        if (previewIndex > 0) {
          setPreviewIndex(previewIndex - 1);
        }
      } else if (e.key === "Escape") {
        setPreviewIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewIndex, filteredAndSortedFiles.length]);

  const copyFolderShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success("Folder link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const copyFileDirectLink = (file: PublicFile, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/s/${file.id}`;
    navigator.clipboard.writeText(url);
    toast.success(`Share link for "${file.filename}" copied!`);
  };

  const handleDownloadFile = (file: PublicFile, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const downloadUrl =
      file.download_url || `/api/v1/files/public/${file.id}?download=true`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloading: ${file.filename}`);
  };

  const handleDownloadAllZip = () => {
    const zipUrl =
      data?.zip_url || `/api/v1/folders/public/${folderId}/download`;
    setIsZipping(true);
    toast("Packaging folder files into ZIP archive...", { icon: "📦" });

    const link = document.createElement("a");
    link.href = zipUrl;
    link.download = `${data?.folder?.name || "folder"}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsZipping(false);
    }, 2500);
  };

  // "Save to My ByteVault" action
  const handleSaveToVault = async () => {
    if (!isAuthenticated) {
      setShowSaveModal(true);
      return;
    }

    setIsSavingToVault(true);
    try {
      const res: any = await apiClient(
        `/api/v1/folders/public/${folderId}/save-to-vault`,
        { method: "POST" }
      );
      toast.success(
        res?.message || "Folder and files saved directly into your Vault!"
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to save folder to your vault");
    } finally {
      setIsSavingToVault(false);
    }
  };

  // Toggle selection
  const toggleSelectFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedFileIds.size === filteredAndSortedFiles.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredAndSortedFiles.map((f) => f.id)));
    }
  };

  // Statistics
  const totalBytes = useMemo(() => {
    if (!data?.files) return 0;
    return data.files.reduce((sum, f) => sum + (f.file_size || 0), 0);
  }, [data?.files]);

  const renderFileIcon = (file: PublicFile, sizeClass = "h-6 w-6") => {
    const { isAPK, isIPA, isImage, isVideo, isAudio, isArchive, isPDF, isCode } =
      getFileTypeInfo(file.filename, file.content_type);

    if (isAPK || isIPA)
      return <Smartphone className={cn(sizeClass, "text-emerald-400")} />;
    if (isImage)
      return <ImageIcon className={cn(sizeClass, "text-blue-400")} />;
    if (isVideo)
      return <Video className={cn(sizeClass, "text-purple-400")} />;
    if (isAudio)
      return <Music className={cn(sizeClass, "text-pink-400")} />;
    if (isArchive)
      return <FileArchive className={cn(sizeClass, "text-amber-400")} />;
    if (isPDF)
      return <FileText className={cn(sizeClass, "text-rose-400")} />;
    if (isCode)
      return <FileCode className={cn(sizeClass, "text-teal-400")} />;
    return <FileIcon className={cn(sizeClass, "text-accent-bright")} />;
  };

  const renderBadge = (file: PublicFile) => {
    const { ext, isAPK, isIPA } = getFileTypeInfo(
      file.filename,
      file.content_type
    );
    if (isAPK) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
          APK
        </span>
      );
    }
    if (isIPA) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400 border border-sky-500/20">
          IPA
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded bg-bg-raised px-1.5 py-0.5 text-[10px] uppercase font-mono text-text-muted border border-border">
        {ext || "FILE"}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-base font-sans selection:bg-accent/20">
      <LandingNav />

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-6 md:px-8 relative overflow-hidden">
        {/* Ambient Brand Glows */}
        <div className="absolute top-1/6 left-1/4 -z-10 h-96 w-96 rounded-full bg-accent/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/5 blur-[130px] pointer-events-none" />

        {/* 1. Loading State */}
        {isLoading && (
          <div className="w-full max-w-6xl mt-8 flex flex-col gap-6">
            <div className="h-44 w-full rounded-2xl border border-border-strong bg-bg-surface/90 backdrop-blur-xl p-6 shadow-2xl animate-pulse">
              <div className="h-8 w-64 bg-border/60 rounded-md mb-4" />
              <div className="h-4 w-96 bg-border/40 rounded-md mb-6" />
              <div className="h-10 w-48 bg-border/60 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-xl border border-border bg-bg-surface/50 p-4 animate-pulse"
                />
              ))}
            </div>
          </div>
        )}

        {/* 2. Error State */}
        {!isLoading && error && (
          <div className="w-full max-w-md my-auto flex flex-col items-center justify-center text-center rounded-2xl border border-border-strong bg-bg-surface/90 backdrop-blur-xl p-8 shadow-2xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-4 border border-danger/20">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-2">
              Folder Unavailable
            </h1>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              {error}
            </p>
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        )}

        {/* 3. Main Shared Folder View */}
        {!isLoading && !error && data && (
          <div className="w-full max-w-6xl flex flex-col gap-5 mt-2">
            {/* Top Breadcrumbs Trail */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted px-1">
              <Link
                href="/"
                className="hover:text-text-primary transition-colors flex items-center gap-1"
              >
                <span>ByteVault</span>
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-text-muted">Shared</span>
              {data.breadcrumbs &&
                data.breadcrumbs.map((crumb, idx) => {
                  const isCurrent = crumb.id === data.folder.id;
                  return (
                    <div key={crumb.id} className="flex items-center gap-1.5">
                      <ChevronRight className="h-3 w-3" />
                      {isCurrent ? (
                        <span className="font-semibold text-text-primary truncate max-w-[200px]">
                          {crumb.name}
                        </span>
                      ) : (
                        <Link
                          href={`/s/folder/${crumb.id}`}
                          className="hover:text-accent-bright transition-colors truncate max-w-[150px]"
                        >
                          {crumb.name}
                        </Link>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Folder Header Hero Card */}
            <div className="relative rounded-2xl border border-border-strong bg-bg-surface/90 backdrop-blur-xl p-6 md:p-8 shadow-2xl overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Folder Info */}
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent/15 border border-accent/25 text-accent-bright shadow-inner">
                    <FolderOpen className="h-8 w-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-bright border border-accent/20">
                        <Sparkles className="h-3 w-3" /> Shared Folder
                      </span>
                      <span className="text-xs text-text-muted">
                        Updated{" "}
                        {new Date(
                          data.folder.updated_at || data.folder.created_at
                        ).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary break-all">
                      {data.folder.name}
                    </h1>
                    <p className="text-xs md:text-sm text-text-secondary mt-1">
                      {data.files?.length || 0} file
                      {data.files?.length === 1 ? "" : "s"} &bull;{" "}
                      {formatBytes(totalBytes)}
                      {data.subfolders?.length > 0 &&
                        ` • ${data.subfolders.length} subfolder${
                          data.subfolders.length === 1 ? "" : "s"
                        }`}
                    </p>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Save to My Vault Button */}
                  <Button
                    onClick={handleSaveToVault}
                    disabled={isSavingToVault}
                    variant="outline"
                    className="h-11 rounded-xl border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent-bright gap-2 font-medium"
                    title="Save this shared folder directly to your personal ByteVault account"
                  >
                    {isSavingToVault ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving to Vault...</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="h-4 w-4" />
                        <span>Save to My Vault</span>
                      </>
                    )}
                  </Button>

                  {/* Copy Share Link */}
                  <Button
                    onClick={copyFolderShareLink}
                    variant="outline"
                    className="h-11 rounded-xl border-border hover:bg-bg-raised text-text-primary gap-2"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 text-text-muted" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </Button>

                  {/* Bulk Download as ZIP */}
                  {data.files?.length > 0 && (
                    <Button
                      onClick={handleDownloadAllZip}
                      disabled={isZipping}
                      className="h-11 rounded-xl bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20 gap-2 font-medium px-4"
                    >
                      {isZipping ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Packaging ZIP...</span>
                        </>
                      ) : (
                        <>
                          <FileArchive className="h-4 w-4" />
                          <span>Download All (.ZIP)</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Subfolders Section */}
              {data.subfolders && data.subfolders.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                    <Folder className="h-3.5 w-3.5 text-accent-bright" />
                    <span>Subfolders ({data.subfolders.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {data.subfolders.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/s/folder/${sub.id}`}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-bg-raised/70 border border-border hover:border-accent/40 hover:bg-bg-raised transition-all text-sm text-text-primary group shadow-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Folder className="h-4 w-4 text-accent-bright shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="font-medium truncate">{sub.name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-text-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Filter, Sort & View Controls */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 px-1">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <Input
                  type="text"
                  placeholder="Search files in this folder..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-xl bg-bg-surface/80 border-border text-sm placeholder:text-text-muted focus-visible:ring-accent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Sort & View Switcher */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Select All Toggle */}
                {filteredAndSortedFiles.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={selectAll}
                    className="h-9 text-xs text-text-muted hover:text-text-primary gap-1.5"
                  >
                    {selectedFileIds.size === filteredAndSortedFiles.length ? (
                      <CheckSquare className="h-3.5 w-3.5 text-accent-bright" />
                    ) : (
                      <Square className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {selectedFileIds.size > 0
                        ? `${selectedFileIds.size} selected`
                        : "Select all"}
                    </span>
                  </Button>
                )}

                {/* Sort selector */}
                <div className="inline-flex items-center gap-1 rounded-xl bg-bg-surface border border-border px-2 py-1 text-xs text-text-muted">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <select
                    value={`${sortField}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split("-") as [
                        SortField,
                        SortOrder
                      ];
                      setSortField(field);
                      setSortOrder(order);
                    }}
                    className="bg-transparent text-text-primary text-xs focus:outline-none cursor-pointer py-1"
                  >
                    <option value="name-asc" className="bg-bg-raised">Name (A-Z)</option>
                    <option value="name-desc" className="bg-bg-raised">Name (Z-A)</option>
                    <option value="size-desc" className="bg-bg-raised">Size (Largest)</option>
                    <option value="size-asc" className="bg-bg-raised">Size (Smallest)</option>
                    <option value="date-desc" className="bg-bg-raised">Date (Newest)</option>
                    <option value="date-asc" className="bg-bg-raised">Date (Oldest)</option>
                  </select>
                </div>

                {/* View Switcher */}
                <div className="inline-flex p-1 rounded-xl bg-bg-surface border border-border">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-1.5 rounded-lg text-xs font-medium transition-colors",
                      viewMode === "grid"
                        ? "bg-bg-raised text-accent-bright shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    )}
                    title="Grid View"
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "p-1.5 rounded-lg text-xs font-medium transition-colors",
                      viewMode === "list"
                        ? "bg-bg-raised text-accent-bright shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    )}
                    title="List View"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Files List / Grid */}
            {filteredAndSortedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-border-strong bg-bg-surface/40 text-center my-6">
                <div className="h-14 w-14 rounded-2xl bg-bg-raised flex items-center justify-center text-text-muted mb-3 border border-border">
                  <Folder className="h-7 w-7" />
                </div>
                <h3 className="text-base font-semibold text-text-primary">
                  {searchQuery ? "No matching files found" : "This folder is empty"}
                </h3>
                <p className="text-xs text-text-secondary mt-1 max-w-sm">
                  {searchQuery
                    ? `No files in this folder matched "${searchQuery}". Try a different keyword.`
                    : "No public files have been uploaded into this folder yet."}
                </p>
                {searchQuery && (
                  <Button
                    onClick={() => setSearchQuery("")}
                    variant="outline"
                    size="sm"
                    className="mt-4 rounded-xl text-xs"
                  >
                    Clear Search Filter
                  </Button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAndSortedFiles.map((file, idx) => {
                  const { isImage } = getFileTypeInfo(
                    file.filename,
                    file.content_type
                  );
                  const thumb =
                    file.thumbnail_url ||
                    (isImage ? `/api/v1/files/public/${file.id}` : null);
                  const isSelected = selectedFileIds.has(file.id);

                  return (
                    <div
                      key={file.id}
                      onClick={() => setPreviewIndex(idx)}
                      className={cn(
                        "group relative flex flex-col justify-between rounded-xl border bg-bg-surface/80 p-4 transition-all duration-200 cursor-pointer select-none",
                        isSelected
                          ? "border-accent ring-1 ring-accent bg-bg-surface"
                          : "border-border hover:-translate-y-1 hover:border-accent/40 hover:bg-bg-surface hover:shadow-xl hover:shadow-black/20"
                      )}
                    >
                      {/* Top Thumbnail / Preview Box */}
                      <div className="relative mb-3 flex h-36 w-full items-center justify-center overflow-hidden rounded-lg bg-bg-base/70 border border-border/50">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={file.filename}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            {renderFileIcon(file, "h-10 w-10")}
                          </div>
                        )}

                        {/* File extension badge in top left corner */}
                        <div className="absolute top-2 left-2 z-10">
                          {renderBadge(file)}
                        </div>

                        {/* Selection Checkbox in top right */}
                        <button
                          type="button"
                          onClick={(e) => toggleSelectFile(file.id, e)}
                          className={cn(
                            "absolute top-2 right-2 z-10 p-1 rounded-md transition-opacity bg-black/40 backdrop-blur-sm",
                            isSelected
                              ? "opacity-100 text-accent-bright"
                              : "opacity-0 group-hover:opacity-100 text-white/80 hover:text-white"
                          )}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>

                        {/* Quick Hover Preview Button */}
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-raised text-text-primary shadow-lg border border-border">
                            <Eye className="h-3.5 w-3.5 text-accent-bright" />
                            <span>Click to View</span>
                          </span>
                        </div>
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <h4
                          className="font-medium text-sm text-text-primary truncate"
                          title={file.filename}
                        >
                          {file.filename}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                          <span>{formatBytes(file.file_size)}</span>
                          <span>&bull;</span>
                          <span>
                            {new Date(file.created_at).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Actions Footer */}
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
                        <button
                          onClick={(e) => copyFileDirectLink(file, e)}
                          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-accent-bright transition-colors"
                          title="Copy file link"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>Link</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/s/${file.id}`}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-md hover:bg-bg-raised text-text-secondary hover:text-text-primary transition-colors"
                            title="Open dedicated share page"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={(e) => handleDownloadFile(file, e)}
                            className="p-1.5 rounded-md bg-accent/10 hover:bg-accent hover:text-white text-accent-bright transition-all"
                            title="Download file"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="rounded-xl border border-border bg-bg-surface/80 overflow-hidden shadow-lg">
                <div className="divide-y divide-border">
                  {filteredAndSortedFiles.map((file, idx) => {
                    const isSelected = selectedFileIds.has(file.id);

                    return (
                      <div
                        key={file.id}
                        onClick={() => setPreviewIndex(idx)}
                        className={cn(
                          "flex items-center justify-between gap-4 p-3.5 transition-colors group cursor-pointer select-none",
                          isSelected
                            ? "bg-accent/5"
                            : "hover:bg-bg-raised/50"
                        )}
                      >
                        {/* Name & Icon */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={(e) => toggleSelectFile(file.id, e)}
                            className="text-text-muted hover:text-text-primary shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-accent-bright" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-base border border-border">
                            {renderFileIcon(file, "h-5 w-5")}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-medium text-sm text-text-primary truncate"
                                title={file.filename}
                              >
                                {file.filename}
                              </span>
                              {renderBadge(file)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                              <span>{formatBytes(file.file_size)}</span>
                              <span>&bull;</span>
                              <span>
                                {new Date(file.created_at).toLocaleDateString(
                                  undefined,
                                  {
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => copyFileDirectLink(file, e)}
                            className="h-8 px-2 text-xs text-text-muted hover:text-text-primary hidden sm:inline-flex"
                          >
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            <span>Link</span>
                          </Button>
                          <Button
                            size="sm"
                            asChild
                            variant="ghost"
                            className="h-8 px-2 text-xs text-text-muted hover:text-text-primary"
                          >
                            <Link
                              href={`/s/${file.id}`}
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                              title="Open dedicated share page"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => handleDownloadFile(file, e)}
                            className="h-8 px-3 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white gap-1"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Download</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. Interactive In-Platform File Viewer Modal */}
        <Dialog
          open={Boolean(activePreviewFile)}
          onOpenChange={(open) => !open && setPreviewIndex(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 rounded-2xl bg-bg-surface border-border-strong shadow-2xl">
            {activePreviewFile && (
              <>
                <DialogHeader className="pb-3 border-b border-border flex flex-row items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-base font-semibold text-text-primary truncate">
                      {activePreviewFile.filename}
                    </DialogTitle>
                    <p className="text-xs text-text-muted mt-0.5">
                      {formatBytes(activePreviewFile.file_size)} &bull;{" "}
                      {activePreviewFile.content_type || "Unknown type"}
                      {previewIndex !== null && (
                        <span>
                          {" "}
                          &bull; File {previewIndex + 1} of{" "}
                          {filteredAndSortedFiles.length}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pr-6">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="h-8 rounded-lg text-xs gap-1 border-border"
                    >
                      <Link
                        href={`/s/${activePreviewFile.id}`}
                        target="_blank"
                        title="Open full page viewer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Open Tab</span>
                      </Link>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleDownloadFile(activePreviewFile)}
                      className="h-8 rounded-lg bg-accent text-white hover:bg-accent-hover gap-1 text-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </Button>
                  </div>
                </DialogHeader>

                {/* Preview Content Area with Next/Prev Controls */}
                <div className="relative flex-1 min-h-[300px] max-h-[64vh] overflow-hidden flex items-center justify-center p-2 rounded-xl bg-bg-base/70 border border-border/50 my-2">
                  {/* Prev File Button */}
                  {previewIndex !== null && previewIndex > 0 && (
                    <button
                      onClick={() => setPreviewIndex(previewIndex - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/80 backdrop-blur-sm transition-all shadow-lg"
                      title="Previous file (Left Arrow)"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}

                  {/* Next File Button */}
                  {previewIndex !== null &&
                    previewIndex < filteredAndSortedFiles.length - 1 && (
                      <button
                        onClick={() => setPreviewIndex(previewIndex + 1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/80 backdrop-blur-sm transition-all shadow-lg"
                        title="Next file (Right Arrow)"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    )}

                  {/* Dynamic Viewer Render */}
                  {(() => {
                    const {
                      isImage,
                      isVideo,
                      isAudio,
                      isPDF,
                      isCode,
                      isAPK,
                      isIPA,
                    } = getFileTypeInfo(
                      activePreviewFile.filename,
                      activePreviewFile.content_type
                    );
                    const fileUrl = `/api/v1/files/public/${activePreviewFile.id}`;

                    if (isImage) {
                      return (
                        <img
                          src={fileUrl}
                          alt={activePreviewFile.filename}
                          className="max-h-[58vh] max-w-full rounded-lg object-contain shadow-md"
                        />
                      );
                    }

                    if (isVideo) {
                      return (
                        <video
                          src={`${fileUrl}?inline=true`}
                          controls
                          autoPlay
                          className="max-h-[58vh] max-w-full rounded-lg shadow-md bg-black"
                        />
                      );
                    }

                    if (isAudio) {
                      return (
                        <div className="flex flex-col items-center gap-4 p-8 w-full max-w-md">
                          <div className="h-16 w-16 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-400 border border-pink-500/20 shadow-md">
                            <Music className="h-8 w-8" />
                          </div>
                          <span className="font-medium text-sm text-center text-text-primary truncate max-w-full">
                            {activePreviewFile.filename}
                          </span>
                          <audio
                            src={`${fileUrl}?inline=true`}
                            controls
                            autoPlay
                            className="w-full"
                          />
                        </div>
                      );
                    }

                    if (isPDF) {
                      return (
                        <iframe
                          src={`${fileUrl}?inline=true`}
                          className="w-full h-[58vh] rounded-lg border-0 bg-white"
                          title={activePreviewFile.filename}
                        />
                      );
                    }

                    if (isCode) {
                      return (
                        <div className="w-full h-full min-h-[280px] p-4 text-xs font-mono overflow-auto text-text-secondary bg-black/40 rounded-lg whitespace-pre leading-relaxed">
                          {loadingText ? (
                            <div className="flex items-center justify-center h-48 gap-2 text-text-muted">
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>Loading code preview...</span>
                            </div>
                          ) : (
                            previewText || "Unable to display preview."
                          )}
                        </div>
                      );
                    }

                    if (isAPK || isIPA) {
                      return (
                        <div className="flex flex-col items-center text-center p-8 max-w-md">
                          <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 mb-4 shadow-lg shadow-emerald-500/5">
                            <Smartphone className="h-10 w-10" />
                          </div>
                          <h4 className="font-bold text-lg text-text-primary">
                            {activePreviewFile.filename}
                          </h4>
                          <p className="text-xs text-text-muted mt-1">
                            Application Package &bull;{" "}
                            {formatBytes(activePreviewFile.file_size)}
                          </p>
                          <div className="mt-4 p-3 rounded-xl bg-bg-surface border border-border text-xs text-text-secondary text-left leading-relaxed">
                            {isAPK
                              ? "Android Package file (APK). Tap download below to install directly on your Android device or test via ADB."
                              : "iOS App Package (IPA). Tap download below to deploy to your test device or simulator."}
                          </div>
                          <Button
                            onClick={() => handleDownloadFile(activePreviewFile)}
                            className="mt-5 w-full h-11 rounded-xl bg-accent text-white hover:bg-accent-hover font-medium gap-2"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download Package</span>
                          </Button>
                        </div>
                      );
                    }

                    // Default Fallback
                    return (
                      <div className="flex flex-col items-center text-center p-8 max-w-sm">
                        <div className="h-16 w-16 rounded-2xl bg-bg-surface flex items-center justify-center text-text-muted border border-border mb-3">
                          <FileIcon className="h-8 w-8 text-accent-bright" />
                        </div>
                        <h4 className="font-semibold text-sm text-text-primary">
                          {activePreviewFile.filename}
                        </h4>
                        <p className="text-xs text-text-muted mt-1">
                          Direct in-browser preview is not supported for this file
                          format.
                        </p>
                        <Button
                          onClick={() => handleDownloadFile(activePreviewFile)}
                          className="mt-4 rounded-xl bg-accent text-white hover:bg-accent-hover text-xs gap-1.5"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download to View</span>
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* 6. "Save to My ByteVault" Modal for Guests */}
        <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
          <DialogContent className="max-w-md p-6 rounded-2xl bg-bg-surface border-border-strong shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent-bright mb-4 shadow-lg shadow-accent/10">
                <Cloud className="h-8 w-8" />
              </div>
              <DialogTitle className="text-xl font-bold text-text-primary">
                Save Folder to ByteVault
              </DialogTitle>
              <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                Keep this folder in your personal cloud storage. Stream media,
                read documents, and access these files anytime from any device
                without taking up space on your phone or laptop.
              </p>

              <div className="w-full mt-6 space-y-2.5">
                <Button
                  asChild
                  className="w-full h-11 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium"
                >
                  <Link href={`/register?redirect=/s/folder/${folderId}`}>
                    Create Free Account (15GB Free)
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full h-11 rounded-xl border-border text-text-secondary hover:text-text-primary"
                >
                  <Link href={`/login?redirect=/s/folder/${folderId}`}>
                    Already have an account? Sign In
                  </Link>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  );
}
