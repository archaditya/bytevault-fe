"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Upload, AlertTriangle } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { useTransferStore } from "@/store/transfer.store";
import { useUploadFileMutation } from "@/services";
import { checkFileConflicts } from "@/services/files.service";
import { FloatingTransferDock } from "@/components/shared/floating-transfer-dock";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import toast from "react-hot-toast";

interface ConflictFileItem {
  file: File;
  existingFile: any;
  folderId?: string | null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const dragCounter = useRef(0);
  const pathname = usePathname();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetFolderIdRef = useRef<string | null>(null);

  const [conflictList, setConflictList] = useState<ConflictFileItem[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);

  const uploadMutation = useUploadFileMutation();

  const handleFilesUpload = useCallback(
    async (files: File[], folderId?: string | null) => {
      if (!files || files.length === 0) return;

      const targetFolder = !folderId || folderId === "root" ? null : folderId;

      try {
        const conflicts = await checkFileConflicts(
          files.map((f) => f.name),
          targetFolder
        );

        if (conflicts && conflicts.length > 0) {
          const conflictingNames = new Set(conflicts.map((c) => c.filename));
          const cleanFiles = files.filter((f) => !conflictingNames.has(f.name));

          // Start uploading non-conflicting files right away
          if (cleanFiles.length > 0) {
            toast.success(
              `Uploading ${cleanFiles.length} file${cleanFiles.length > 1 ? "s" : ""} in the background...`,
              { icon: "🚀" }
            );
            cleanFiles.forEach((file) => {
              uploadMutation.mutate({
                file,
                folderId: targetFolder || undefined,
              });
            });
          }

          // Build conflict items for the dialog
          const conflictItems: ConflictFileItem[] = conflicts.flatMap((c) => {
            const matched = files.find((f) => f.name === c.filename);
            return matched
              ? [{
                  file: matched,
                  existingFile: c.existing_file,
                  folderId: targetFolder,
                }]
              : [];
          });

          if (conflictItems.length > 0) {
            setConflictList(conflictItems);
            setShowConflictDialog(true);
            return;
          }
        }
      } catch (err) {
        console.error("Conflict preflight check failed:", err);
      }

      // No conflicts -> upload all directly
      toast.success(
        `Uploading ${files.length} file${files.length > 1 ? "s" : ""} in the background...`,
        { icon: "🚀" }
      );
      files.forEach((file) => {
        uploadMutation.mutate({
          file,
          folderId: targetFolder || undefined,
        });
      });
    },
    [uploadMutation]
  );

  const resolveConflict = (
    action: "replace" | "keep_both" | "skip",
    shouldApplyAll: boolean
  ) => {
    if (conflictList.length === 0) return;

    const itemsToProcess = shouldApplyAll ? conflictList : [conflictList[0]];

    if (action !== "skip") {
      itemsToProcess.forEach((item) => {
        uploadMutation.mutate({
          file: item.file,
          folderId: item.folderId || undefined,
          conflictAction: action,
        });
      });
      toast.success(
        `Uploading ${itemsToProcess.length} file${itemsToProcess.length > 1 ? "s" : ""} (${
          action === "replace" ? "replace" : "keep both"
        })...`,
        { icon: "🚀" }
      );
    }

    if (shouldApplyAll || conflictList.length <= 1) {
      setConflictList([]);
      setShowConflictDialog(false);
      setApplyToAll(false);
    } else {
      setConflictList((prev) => prev.slice(1));
    }
  };

  // Global listener for upload trigger from Navbar, Dashboard, or FilesToolbar
  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ folderId?: string | null }>;
      targetFolderIdRef.current = customEvent.detail?.folderId || null;
      fileInputRef.current?.click();
    };

    window.addEventListener("pushpostvault:trigger-upload", handleTrigger);
    return () => {
      window.removeEventListener("pushpostvault:trigger-upload", handleTrigger);
    };
  }, []);

  useEffect(() => {
    // If user is already on /transfers, UploadStation handles the drops natively
    if (pathname === "/transfers") {
      setIsWindowDragging(false);
      dragCounter.current = 0;
      return;
    }

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (pathname === "/transfers") return;

      if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
        dragCounter.current++;
        setIsWindowDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (pathname === "/transfers") return;

      if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
        dragCounter.current--;
        if (dragCounter.current <= 0) {
          setIsWindowDragging(false);
          dragCounter.current = 0;
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsWindowDragging(false);
      dragCounter.current = 0;

      if (pathname === "/transfers") return;

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        handleFilesUpload(files, null);
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
  }, [pathname, handleFilesUpload]);

  return (
    <div className="min-h-screen bg-bg">
      {/* Hidden file input for global upload buttons */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesUpload(Array.from(e.target.files), targetFolderIdRef.current);
            e.target.value = "";
          }
        }}
      />

      {/* Global Drag-and-Drop Overlay */}
      {isWindowDragging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm border-2 border-dashed border-accent animate-in fade-in-50 duration-150 pointer-events-none">
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-bg-surface border border-accent/40 shadow-2xl">
            <div className="p-3.5 rounded-full bg-accent/15 border border-accent/30 text-accent-bright animate-bounce">
              <Upload className="h-8 w-8" />
            </div>
            <p className="text-base font-bold text-ink">Drop files to upload instantly</p>
            <p className="text-xs text-ink-muted">Files will upload in the background with live progress dock</p>
          </div>
        </div>
      )}

      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      <div className="md:pl-60">
        <Navbar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="px-4 py-6 md:px-6">{children}</main>
      </div>

      {/* Persistent Background Transfer Dock */}
      <FloatingTransferDock />

      {/* Global Duplicate File Conflict Resolution Dialog */}
      {showConflictDialog && conflictList.length > 0 && (
        <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
          <DialogContent className="max-w-md border-border-strong bg-bg-surface p-6 shadow-2xl text-ink">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-ink">File Already Exists</DialogTitle>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {conflictList.length > 1
                      ? `${conflictList.length} files already exist in this destination`
                      : "A file with this name already exists in this destination"}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="my-4 space-y-3">
              <div className="rounded-xl border border-border bg-bg-raised/70 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between font-mono font-medium text-ink">
                  <span className="truncate max-w-[220px]" title={conflictList[0].file.name}>
                    {conflictList[0].file.name}
                  </span>
                  <span className="text-ink-muted">{formatBytes(conflictList[0].file.size)}</span>
                </div>
                {conflictList[0].existingFile && (
                  <p className="text-[11px] text-ink-faint">
                    Existing file uploaded on{" "}
                    {new Date(
                      conflictList[0].existingFile.updated_at ||
                        conflictList[0].existingFile.created_at
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>

              {conflictList.length > 1 && (
                <label className="flex items-center gap-2 cursor-pointer text-xs text-ink select-none pt-1">
                  <input
                    type="checkbox"
                    checked={applyToAll}
                    onChange={(e) => setApplyToAll(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border-strong text-accent focus:ring-0"
                  />
                  <span>Apply to all remaining conflicts ({conflictList.length})</span>
                </label>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-xs h-9 border-border hover:bg-bg-raised text-ink"
                  onClick={() => resolveConflict("replace", applyToAll)}
                >
                  Replace File
                </Button>
                <Button
                  type="button"
                  className="w-full text-xs h-9 bg-accent hover:bg-accent/90 text-bg font-semibold"
                  onClick={() => resolveConflict("keep_both", applyToAll)}
                >
                  Keep Both (Rename)
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs h-8 text-ink-muted hover:text-ink"
                onClick={() => resolveConflict("skip", applyToAll)}
              >
                Skip This File
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
