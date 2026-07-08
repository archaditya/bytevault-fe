"use client";

import { useAuthStore } from "@/store";
import { useFiles } from "@/services";
import { ShareLinkCard } from "@/features/shared/components/share-link-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SharedLink } from "@/types";

export default function SharedLinksPage() {
  const { data: userData, isLoading: userLoading } = useFiles({ limit: 100, isPublic: true });

  // Standard User Workspace Shared links view
  if (userLoading) {
    return <div className="text-[13px] text-ink-muted font-sans">Loading shared links...</div>;
  }

  const sharedFiles = userData?.files?.filter(f => f.shared) || [];

  const links: SharedLink[] = sharedFiles.map(f => ({
    id: f.id,
    fileId: f.id,
    fileName: f.name,
    url: `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${f.id}`,
    createdAt: f.uploadedAt,
    expiresAt: null,
    passwordProtected: false,
    downloadLimit: null,
    downloadCount: f.downloads || 0,
    views: 0,
    active: true,
  }));

  return (
    <div className="flex flex-col gap-4 font-sans">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-muted">
          {links.length} active shared links.
        </p>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5" /> Create link
        </Button>
      </div>
      {links.length === 0 ? (
        <div className="py-12 text-center text-[13px] text-ink-muted">
          No shared links found. Share a file to see it here.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <ShareLinkCard key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}
