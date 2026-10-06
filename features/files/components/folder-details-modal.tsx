"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Folder,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Lock,
  Globe,
  Share2,
  Calendar,
  Layers,
  Loader2,
} from "lucide-react";
import { FolderRecord } from "@/types";
import { useToggleFolderShareMutation } from "@/services";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface FolderDetailsModalProps {
  folder: FolderRecord;
  isOpen: boolean;
  onClose: () => void;
}

export function FolderDetailsModal({
  folder,
  isOpen,
  onClose,
}: FolderDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const toggleShareMutation = useToggleFolderShareMutation(folder.parent_id);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${origin}/s/folder/${folder.id}`;

  const handleCopyLink = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          setCopied(true);
          toast.success("Folder share link copied to clipboard!");
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => toast.error("Could not copy link to clipboard"));
    } else {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopied(true);
        toast.success("Folder share link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Clipboard access denied");
      }
    }
  };

  const handleToggleShare = () => {
    const newState = !folder.is_public;
    toggleShareMutation.mutate(
      { id: folder.id, isPublic: newState },
      {
        onSuccess: () => {
          if (newState) {
            navigator.clipboard?.writeText(shareUrl);
            toast.success("Folder is now public! Share link copied.");
          } else {
            toast.success("Folder is now private.");
          }
        },
        onError: () => {
          toast.error("Failed to update folder sharing settings.");
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 bg-bg-surface border-border-strong shadow-2xl rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border flex flex-row items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 text-accent-bright">
            <Folder className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-bold text-ink truncate">
              {folder.name}
            </DialogTitle>
            <p className="text-xs text-ink-muted">Folder Details & Sharing</p>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Share Status Badge & Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-bg-base/70 border border-border">
            <div className="flex items-center gap-2.5">
              {folder.is_public ? (
                <>
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <p className="text-xs font-semibold text-ink">Public Share Active</p>
                    <p className="text-[11px] text-ink-muted">
                      Anyone with the link can browse & stream
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-ink-muted" />
                  <div>
                    <p className="text-xs font-semibold text-ink">Private Folder</p>
                    <p className="text-[11px] text-ink-muted">
                      Only you can view and access this folder
                    </p>
                  </div>
                </>
              )}
            </div>

            <Button
              size="sm"
              variant={folder.is_public ? "outline" : "primary"}
              onClick={handleToggleShare}
              disabled={toggleShareMutation.isPending}
              className={`h-8 rounded-lg text-xs font-medium gap-1.5 ${
                folder.is_public
                  ? "border-border hover:bg-danger/10 hover:text-danger hover:border-danger/30"
                  : "bg-accent hover:bg-accent-hover text-white shadow-sm"
              }`}
            >
              {toggleShareMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : folder.is_public ? (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>Make Private</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share Folder</span>
                </>
              )}
            </Button>
          </div>

          {/* Share Link Box (when public) */}
          {folder.is_public && (
            <div className="space-y-2 p-3.5 rounded-xl bg-accent/5 border border-accent/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-accent-bright" />
                  <span>Public Share Link</span>
                </span>
                <span className="font-mono text-[11px] text-accent-bright bg-accent/10 px-2 py-0.5 rounded-md">
                  {folder.views || 0} view{(folder.views || 0) === 1 ? "" : "s"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 h-9 px-3 rounded-lg bg-bg-raised border border-border text-xs text-ink font-mono select-all focus:outline-none"
                />
                <Button
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-9 px-3 rounded-lg bg-accent text-white hover:bg-accent-hover text-xs gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-300" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-ink-muted">
                <span>Direct platform URL for visitors</span>
                <Link
                  href={`/s/folder/${folder.id}`}
                  target="_blank"
                  className="text-accent-bright hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <span>Open Public View</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-bg-base/50 border border-border">
              <span className="text-[11px] text-ink-muted flex items-center gap-1 mb-1">
                <Eye className="h-3.5 w-3.5 text-accent-bright" /> Total Views
              </span>
              <span className="font-semibold text-ink text-sm">
                {folder.views || 0} access{(folder.views || 0) === 1 ? "" : "es"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-bg-base/50 border border-border">
              <span className="text-[11px] text-ink-muted flex items-center gap-1 mb-1">
                <Calendar className="h-3.5 w-3.5" /> Created Date
              </span>
              <span className="font-medium text-ink truncate block">
                {formatDate(folder.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="rounded-xl border-border hover:bg-bg-raised text-xs px-4"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
