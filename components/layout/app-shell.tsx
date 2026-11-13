"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { useTransferStore } from "@/store/transfer.store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const dragCounter = useRef(0);
  const pathname = usePathname();
  const router = useRouter();

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
        useTransferStore.getState().addStagedFiles(files);
        router.push("/transfers");
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
  }, [pathname, router]);

  return (
    <div className="min-h-screen bg-bg">
      {/* Global Drag-and-Drop Overlay */}
      {isWindowDragging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm border-2 border-dashed border-accent animate-in fade-in-50 duration-150 pointer-events-none">
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-bg-surface border border-accent/40 shadow-2xl">
            <div className="p-3.5 rounded-full bg-accent/15 border border-accent/30 text-accent-bright animate-bounce">
              <Upload className="h-8 w-8" />
            </div>
            <p className="text-base font-bold text-ink">Drop files to send to Transfer Studio</p>
            <p className="text-xs text-ink-muted">Files will be queued in Transfer Studio</p>
          </div>
        </div>
      )}

      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      <div className="md:pl-60">
        <Navbar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
