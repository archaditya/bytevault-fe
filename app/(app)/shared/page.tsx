"use client";

import { useState } from "react";
import { useFiles, useFoldersFlat } from "@/services";
import { ShareLinkCard } from "@/features/shared/components/share-link-card";
import { Button } from "@/components/ui/button";
import { Folder, File, Share2 } from "lucide-react";
import { SharedLink } from "@/types";

export default function SharedLinksPage() {
  const [activeTab, setActiveTab] = useState<"all" | "folders" | "files">("all");
  const { data: userData, isLoading: userLoading } = useFiles({ limit: 100, isPublic: true });
  const { data: foldersData, isLoading: foldersLoading } = useFoldersFlat();

  const isLoading = userLoading || foldersLoading;

  if (isLoading) {
    return <div className="text-[13px] text-ink-muted font-sans">Loading shared links...</div>;
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // Shared Files
  const sharedFiles = userData?.files?.filter((f) => f.shared) || [];
  const fileLinks: SharedLink[] = sharedFiles.map((f) => ({
    id: f.id,
    fileId: f.id,
    fileName: f.name,
    url: `${origin}/s/${f.id}`,
    createdAt: f.uploadedAt,
    expiresAt: null,
    passwordProtected: false,
    downloadLimit: null,
    downloadCount: f.downloads || 0,
    views: 0,
    active: true,
  }));

  // Shared Folders
  const sharedFolders = (foldersData || []).filter((f) => f.is_public);
  const folderLinks: SharedLink[] = sharedFolders.map((f) => ({
    id: f.id,
    fileId: f.id,
    fileName: `📁 ${f.name} (Folder)`,
    url: `${origin}/s/folder/${f.id}`,
    createdAt: f.created_at,
    expiresAt: null,
    passwordProtected: false,
    downloadLimit: null,
    downloadCount: 0,
    views: f.views || 0,
    active: true,
  }));

  let displayedLinks = [...folderLinks, ...fileLinks];
  if (activeTab === "folders") {
    displayedLinks = folderLinks;
  } else if (activeTab === "files") {
    displayedLinks = fileLinks;
  }

  return (
    <div className="flex flex-col gap-4 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink">Shared Links</h1>
          <p className="text-[13px] text-ink-muted">
            {displayedLinks.length} active shared link
            {displayedLinks.length === 1 ? "" : "s"} ({folderLinks.length} folders,{" "}
            {fileLinks.length} files).
          </p>
        </div>

        {/* Tab Filters */}
        <div className="inline-flex p-1 rounded-xl bg-bg-surface border border-border text-xs">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              activeTab === "all"
                ? "bg-bg-raised text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            All ({folderLinks.length + fileLinks.length})
          </button>
          <button
            onClick={() => setActiveTab("folders")}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
              activeTab === "folders"
                ? "bg-bg-raised text-accent-bright shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Folder className="h-3.5 w-3.5" />
            <span>Folders ({folderLinks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
              activeTab === "files"
                ? "bg-bg-raised text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <File className="h-3.5 w-3.5" />
            <span>Files ({fileLinks.length})</span>
          </button>
        </div>
      </div>

      {displayedLinks.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-bg-surface/50 text-[13px] text-ink-muted flex flex-col items-center justify-center">
          <Share2 className="h-8 w-8 text-ink-faint mb-3" />
          <p className="font-semibold text-ink">No shared links found</p>
          <p className="text-xs text-ink-muted mt-1 max-w-sm">
            Share a folder or file from your Vault to generate public sharing URLs that anyone can browse on ByteVault.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayedLinks.map((link) => (
            <ShareLinkCard key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}
