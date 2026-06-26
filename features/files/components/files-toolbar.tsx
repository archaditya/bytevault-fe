"use client";

import { useRef, useState } from "react";
import { Grid3x3, List, Search, Upload, FolderPlus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useFilesStore } from "@/store";
import { cn } from "@/lib/utils";
import { useUploadFileMutation, useCreateFolderMutation } from "@/services";

const kindOptions = [
  { value: "all", label: "All types" },
  { value: "document", label: "Documents" },
  { value: "image", label: "Images" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "archive", label: "Archives" },
  { value: "code", label: "Code" },
  { value: "dataset", label: "Datasets" },
];

const providerOptions = [
  { value: "all", label: "All providers" },
  { value: "r2", label: "Cloudflare R2" },
  { value: "s3", label: "AWS S3" },
  { value: "local", label: "Local Storage" },
];

export function FilesToolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadFileMutation();
  const { currentFolderId } = useFilesStore();
  const createFolderMutation = useCreateFolderMutation(currentFolderId);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    kindFilter,
    setKindFilter,
    providerFilter,
    setProviderFilter,
  } = useFilesStore();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      await uploadMutation.mutateAsync({ file: selectedFile, folderId: currentFolderId });
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim() === "") return;

    try {
      await createFolderMutation.mutateAsync({ name: newFolderName.trim(), parentId: currentFolderId });
      setNewFolderName("");
      setIsCreateOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to create folder");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
        <Input
          placeholder="Search files..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as any)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {kindOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={providerFilter} onValueChange={(v) => setProviderFilter(v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {providerOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center rounded-md border border-border-strong bg-bg-surface p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-sm transition-colors",
              viewMode === "grid" ? "bg-bg-overlay text-ink" : "text-ink-faint hover:text-ink"
            )}
            aria-label="Grid view"
          >
            <Grid3x3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-sm transition-colors",
              viewMode === "list" ? "bg-bg-overlay text-ink" : "text-ink-faint hover:text-ink"
            )}
            aria-label="List view"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>

        <Button size="sm" variant="secondary" onClick={() => setIsCreateOpen(true)}>
          <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
          New Folder
        </Button>

        <Button
          size="sm"
          onClick={handleUploadClick}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {uploadMutation.isPending ? "Uploading..." : "Upload"}
        </Button>
      </div>

      {isCreateOpen && (
        <Dialog open onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-md bg-bg-surface border-border-strong text-ink">
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateFolderSubmit} className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="folderName" className="text-xs font-semibold text-ink-muted">Folder Name</label>
                <Input
                  id="folderName"
                  placeholder="Enter name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)} size="sm">
                  Cancel
                </Button>
                <Button type="submit" disabled={createFolderMutation.isPending} size="sm">
                  {createFolderMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
