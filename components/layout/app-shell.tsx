"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { useTransferStore } from "@/store/transfer.store";
import { useUploadFileMutation } from "@/services";
import { FloatingTransferDock } from "@/components/shared/floating-transfer-dock";
import toast from "react-hot-toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const dragCounter = useRef(0);
  const pathname = usePathname();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetFolderIdRef = useRef<string | null>(null);

  const uploadMutation = useUploadFileMutation();

  const handleFilesUpload = useCallback(
    (files: File[], folderId?: string | null) => {
      if (!files || files.length === 0) return;
      toast.success(
        `Uploading ${files.length} file${files.length > 1 ? "s" : ""} in the background...`,
        { icon: "🚀" }
      );
      files.forEach((file) => {
        uploadMutation.mutate({
          file,
          folderId: folderId || undefined,
        });
      });
    },
    [uploadMutation]
  );

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
        // Direct background upload without navigating to /transfers
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
    </div>
  );
}
