"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Folder,
  FolderClosed,
  MoreVertical,
  Download,
  Share2,
  Trash2,
  ExternalLink,
  ChevronDown,
  LayoutGrid,
  List,
  Upload,
  Zap,
  ArrowRight,
  HardDrive,
  Copy,
  Clock,
  Sparkles,
  Eye,
} from "lucide-react";
import { useAuthStore } from "@/store";
import { triggerGlobalUpload } from "@/store/transfer.store";
import { useFilesStore } from "@/store/files.store";
import {
  useFolders,
  useFiles,
  useDeleteFileMutation,
  useToggleShareMutation,
  useDeleteFolderMutation,
  useMoveFileMutation,
  useFileImageBlob,
} from "@/services";
import { FileRecord, FolderRecord } from "@/types";
import { formatBytes, formatRelativeTime, cn } from "@/lib/utils";
import { FileKindIcon } from "@/components/shared/file-kind-icon";
import { RichFilePreview } from "@/features/files/components/rich-file-preview";
import { getFolderCategory } from "@/features/files/components/folder-card";
import { QuickLookModal } from "@/features/files/components/quick-look-modal";
import { FileContextMenu, type ContextMenuState } from "@/components/shared/file-context-menu";
import { DashboardStats } from "./dashboard-stats";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";

export function DashboardHome() {
  const { user } = useAuthStore();
  const router = useRouter();
  const pushFolder = useFilesStore((s) => s.pushFolder);
  const setQuickLookFile = useFilesStore((s) => s.setQuickLookFile);

  const [foldersOpen, setFoldersOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const deleteFileMutation = useDeleteFileMutation();
  const deleteFolderMutation = useDeleteFolderMutation(null);

  // Fetch root folders
  const { data: folders = [], isLoading: foldersLoading } = useFolders(null);

  // Fetch recent files (12 latest)
  const { data: filesResponse, isLoading: filesLoading } = useFiles({
    sortBy: "date",
    sortDirection: "desc",
    limit: 12,
  });
  const files: FileRecord[] = filesResponse?.files ?? [];

  const firstName = user?.name ? user.name.split(" ")[0] : "there";

  const handleOpenFolder = (folder: FolderRecord) => {
    pushFolder(folder.id, folder.name);
    router.push("/files");
  };

  // Spacebar Quick Look listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        const targetFile = selectedFileId
          ? files.find((f) => f.id === selectedFileId)
          : files[0];
        if (targetFile) {
          e.preventDefault();
          setQuickLookFile(targetFile);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFileId, files, setQuickLookFile]);

  const handleContextMenuShare = (item: FileRecord | FolderRecord, type: "file" | "folder") => {
    const shareUrl = `${window.location.origin}/s/${type}/${item.id}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl);
      toast.success(`${type === "file" ? "File" : "Folder"} share link copied`);
    }
  };

  const handleContextMenuDelete = (item: FileRecord | FolderRecord, type: "file" | "folder") => {
    if (confirm(`Are you sure you want to delete ${item.name}?`)) {
      if (type === "file") {
        deleteFileMutation.mutate(item.id);
      } else {
        deleteFolderMutation.mutate(item.id);
      }
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            Welcome to PushPostVault, {firstName}
          </h1>
          <p className="text-xs md:text-sm text-ink-muted mt-1">
            Your secure private vault is active. Quick access to your recent folders and files.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-8 border-accent/40 bg-accent/10 text-accent-bright hover:bg-accent/20"
            asChild
          >
            <Link href="/instant">
              <Zap className="h-3.5 w-3.5" />
              Instant Share
            </Link>
          </Button>

          <Button
            size="sm"
            variant="primary"
            className="gap-1.5 text-xs h-8 bg-accent text-white hover:bg-accent-bright"
            onClick={() => triggerGlobalUpload()}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload File
          </Button>
        </div>
      </div>

      {/* 2. Suggested Folders Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setFoldersOpen(!foldersOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-ink group"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 text-ink-muted transition-transform duration-200 group-hover:text-ink",
                !foldersOpen && "-rotate-90"
              )}
            />
            <span>Suggested folders</span>
            {!foldersLoading && (
              <span className="text-xs font-normal text-ink-muted font-mono">
                ({folders.length})
              </span>
            )}
          </button>

          <Link
            href="/files"
            className="text-xs text-accent hover:text-accent-bright transition-colors flex items-center gap-1 font-medium"
          >
            Go to Files <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {foldersOpen && (
          <div>
            {foldersLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl bg-bg-surface" />
                ))}
              </div>
            ) : folders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-ink-muted bg-bg-surface/30">
                No folders created yet. Your folders will appear here for quick access.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {folders.slice(0, 12).map((folder) => (
                  <SuggestedFolderCard
                    key={folder.id}
                    folder={folder}
                    onOpen={() => handleOpenFolder(folder)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({ x: e.clientX, y: e.clientY, item: folder, type: "folder" });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Suggested Files Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setFilesOpen(!filesOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-ink group"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 text-ink-muted transition-transform duration-200 group-hover:text-ink",
                !filesOpen && "-rotate-90"
              )}
            />
            <span>Suggested files</span>
            {!filesLoading && (
              <span className="text-xs font-normal text-ink-muted font-mono">
                ({files.length})
              </span>
            )}
          </button>

          {/* View Mode Toggle: Grid vs List */}
          <div className="flex items-center bg-bg-raised p-0.5 rounded-lg border border-border text-xs">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === "list"
                  ? "bg-accent text-white shadow-sm"
                  : "text-ink-muted hover:text-ink"
              )}
              title="List view"
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === "grid"
                  ? "bg-accent text-white shadow-sm"
                  : "text-ink-muted hover:text-ink"
              )}
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {filesOpen && (
          <div>
            {filesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-56 rounded-2xl bg-bg-surface" />
                ))}
              </div>
            ) : files.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-ink-muted bg-bg-surface/30">
                No files uploaded yet. Drag and drop any file or click Upload to get started.
              </div>
            ) : viewMode === "grid" ? (
              /* --- Google Drive Style Rich Grid Cards --- */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {files.map((file) => (
                  <RecentFileGridCard
                    key={file.id}
                    file={file}
                    isSelected={selectedFileId === file.id}
                    onSelect={() => setSelectedFileId(file.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedFileId(file.id);
                      setContextMenu({ x: e.clientX, y: e.clientY, item: file, type: "file" });
                    }}
                  />
                ))}
              </div>
            ) : (
              /* --- Dense Table List View --- */
              <div className="rounded-xl border border-border-strong bg-bg-surface overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-bg-raised/50 text-ink-muted font-medium">
                      <th className="py-2.5 px-4">Name</th>
                      <th className="py-2.5 px-4 hidden sm:table-cell">Type</th>
                      <th className="py-2.5 px-4">Size</th>
                      <th className="py-2.5 px-4 hidden md:table-cell">Uploaded</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {files.map((file) => (
                      <RecentFileListRow
                        key={file.id}
                        file={file}
                        isSelected={selectedFileId === file.id}
                        onSelect={() => setSelectedFileId(file.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedFileId(file.id);
                          setContextMenu({ x: e.clientX, y: e.clientY, item: file, type: "file" });
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Vault Overview & Analytics Summary */}
      <div className="pt-2">
        <DashboardStats />
      </div>

      {/* Spacebar Quick Look Modal */}
      <QuickLookModal files={files} />

      {/* Right-click Context Menu */}
      <FileContextMenu
        state={contextMenu}
        onClose={() => setContextMenu(null)}
        onQuickLook={(file) => setQuickLookFile(file)}
        onOpenFolder={(folder) => handleOpenFolder(folder)}
        onDownload={(file) => window.open(`/api/v1/files/${file.id}/download`, "_blank")}
        onShare={handleContextMenuShare}
        onDetails={(file) => router.push(`/files/${file.id}`)}
        onDelete={handleContextMenuDelete}
      />
    </div>
  );
}

// ==========================================
// Suggested Folder Card with Drop-Target Move
// ==========================================
function SuggestedFolderCard({
  folder,
  onOpen,
  onContextMenu,
}: {
  folder: FolderRecord;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const moveFileMutation = useMoveFileMutation();
  const cat = getFolderCategory(folder.name);
  const Icon = cat.Icon || Folder;

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/x-bytevault-item")) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const raw = e.dataTransfer.getData("application/x-bytevault-item");
    if (!raw) return;
    try {
      const item = JSON.parse(raw);
      if (item.id && item.type === "file") {
        await moveFileMutation.mutateAsync({ id: item.id, folderId: folder.id });
        toast.success(`Moved "${item.name}" into "${folder.name}"`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to move file into folder");
    }
  };

  return (
    <div
      onClick={onOpen}
      onContextMenu={onContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group relative flex items-center justify-between gap-2.5 p-3 rounded-xl border border-border-strong bg-bg-surface transition-all duration-150 cursor-pointer select-none",
        "hover:bg-bg-raised hover:border-accent/40 hover:shadow-md hover:-translate-y-0.5",
        isDragOver && "ring-2 ring-accent border-accent bg-accent/20 scale-102 shadow-lg shadow-accent/20"
      )}
      title={`Open ${folder.name}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-raised/80 border border-border/50 transition-transform group-hover:scale-105"
          style={{ color: cat.accentColor }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="truncate text-xs font-medium text-ink group-hover:text-accent-bright transition-colors">
          {folder.name}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button
            className="h-6 w-6 rounded flex items-center justify-center text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity hover:bg-bg-overlay hover:text-ink"
            aria-label="Folder actions"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 text-xs">
          <DropdownMenuItem onClick={onOpen}>
            <FolderClosed className="mr-2 h-3.5 w-3.5 text-accent" /> Open in Files
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              const shareUrl = `${window.location.origin}/s/folder/${folder.id}`;
              navigator.clipboard.writeText(shareUrl);
              toast.success("Folder share link copied");
            }}
          >
            <Copy className="mr-2 h-3.5 w-3.5 text-ink-muted" /> Copy link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ==========================================
// Rich Google Drive Style Recent File Card
// ==========================================
function RecentFileGridCard({
  file,
  isSelected,
  onSelect,
  onContextMenu,
}: {
  file: FileRecord;
  isSelected?: boolean;
  onSelect?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const router = useRouter();
  const deleteMutation = useDeleteFileMutation();
  const toggleShareMutation = useToggleShareMutation();
  const { user } = useAuthStore();
  const [imgError, setImgError] = useState(false);

  const ext = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase() || ""
    : "";

  const isVisualMedia =
    file.kind === "image" ||
    file.kind === "video" ||
    [
      "jpg", "jpeg", "png", "webp", "gif", "svg", "heic", "heif", "avif",
      "mp4", "mov", "webm", "mkv"
    ].includes(ext) ||
    (file.kind === "document" &&
      (file.mimeType === "application/pdf" || ext === "pdf"));

  const { data: previewUrl } = useFileImageBlob(
    file.id,
    isVisualMedia && !file.thumbnailUrl && file.status === "READY"
  );
  const displayUrl = file.thumbnailUrl || (isVisualMedia ? previewUrl : undefined);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = `/api/v1/files/${file.id}/download`;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloading ${file.name}`);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/s/${file.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard");
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete ${file.name}?`)) {
      deleteMutation.mutate(file.id);
    }
  };

  return (
    <Card
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          "application/x-bytevault-item",
          JSON.stringify({ id: file.id, name: file.name, type: "file" })
        );
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onSelect}
      onDoubleClick={() => router.push(`/files/${file.id}`)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e);
      }}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border-strong bg-bg-surface p-3 transition-all duration-200 cursor-pointer select-none active:opacity-70",
        "hover:border-accent/40 hover:bg-bg-raised/70 hover:shadow-lg hover:-translate-y-0.5",
        isSelected && "ring-2 ring-accent border-accent bg-accent/[0.04]"
      )}
    >
      {/* 1. Header: File Icon + Title + Dropdown */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: `${file.thumbnailColor || "#FF6A00"}1A`, color: file.thumbnailColor || "#FF6A00" }}
          >
            <FileKindIcon kind={file.kind} className="h-3.5 w-3.5" />
          </div>
          <span className="truncate text-xs font-semibold text-ink group-hover:text-accent-bright transition-colors" title={file.name}>
            {file.name}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button
              className="h-6 w-6 rounded flex items-center justify-center text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity hover:bg-bg-overlay hover:text-ink shrink-0"
              aria-label="File options"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 text-xs">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                useFilesStore.getState().setQuickLookFile(file);
              }}
            >
              <Eye className="mr-2 h-3.5 w-3.5 text-accent" /> Quick Look
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="mr-2 h-3.5 w-3.5 text-accent" /> Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyLink}>
              <Share2 className="mr-2 h-3.5 w-3.5 text-ink-muted" /> Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/files/${file.id}`)}>
              <ExternalLink className="mr-2 h-3.5 w-3.5 text-ink-muted" /> Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-danger hover:text-danger">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 2. Body: Visual Preview Canvas */}
      <div className="relative h-36 w-full overflow-hidden rounded-xl bg-bg-raised/60 border border-border/40 flex items-center justify-center group-hover:border-accent/20 transition-colors">
        {displayUrl && !imgError ? (
          <img
            src={displayUrl}
            alt={file.name}
            className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300 ease-out"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <RichFilePreview file={file} className="w-full h-full object-cover" />
        )}
      </div>

      {/* 3. Footer: Avatar + Activity Caption */}
      <div className="flex items-center justify-between gap-2 pt-2.5 mt-1 border-t border-border/50 text-[11px] text-ink-muted">
        <div className="flex items-center gap-1.5 min-w-0">
          <Avatar className="h-4 w-4">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
            <AvatarFallback className="text-[9px] bg-accent/20 text-accent font-bold">
              {user?.avatar || "ME"}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">
            You uploaded • {formatRelativeTime(file.uploadedAt)}
          </span>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-ink-faint">
          {formatBytes(file.sizeBytes)}
        </span>
      </div>
    </Card>
  );
}

// ==========================================
// Dense Table List Row Alternative
// ==========================================
function RecentFileListRow({
  file,
  isSelected,
  onSelect,
  onContextMenu,
}: {
  file: FileRecord;
  isSelected?: boolean;
  onSelect?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const router = useRouter();

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = `/api/v1/files/${file.id}/download`;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloading ${file.name}`);
  };

  return (
    <tr
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          "application/x-bytevault-item",
          JSON.stringify({ id: file.id, name: file.name, type: "file" })
        );
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onSelect}
      onDoubleClick={() => router.push(`/files/${file.id}`)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e);
      }}
      className={cn(
        "group hover:bg-bg-raised/60 transition-colors cursor-pointer select-none active:opacity-70",
        isSelected && "bg-bg-overlay border-l-2 border-l-accent"
      )}
    >
      <td className="py-2.5 px-4 font-medium text-ink flex items-center gap-2.5">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
          style={{ backgroundColor: `${file.thumbnailColor || "#FF6A00"}1A`, color: file.thumbnailColor || "#FF6A00" }}
        >
          <FileKindIcon kind={file.kind} className="h-3.5 w-3.5" />
        </div>
        <span className="truncate max-w-[200px] sm:max-w-xs group-hover:text-accent-bright transition-colors">
          {file.name}
        </span>
      </td>
      <td className="py-2.5 px-4 text-ink-muted hidden sm:table-cell uppercase font-mono text-[11px]">
        {file.kind}
      </td>
      <td className="py-2.5 px-4 text-ink-muted font-mono text-[11px]">
        {formatBytes(file.sizeBytes)}
      </td>
      <td className="py-2.5 px-4 text-ink-muted hidden md:table-cell text-[11px]">
        {formatRelativeTime(file.uploadedAt)}
      </td>
      <td className="py-2.5 px-4 text-right">
        <button
          onClick={handleDownload}
          className="p-1 rounded text-ink-muted hover:text-accent hover:bg-bg-raised transition-colors"
          title="Download file"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}
