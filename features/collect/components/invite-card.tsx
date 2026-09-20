"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, FolderOpen, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import {
  buildInviteUrl,
  isInviteActive,
  useRevokeUploadInvite,
  type UploadInvite,
} from "@/services/upload-invites.service";

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "Less than an hour left";
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} left`;
  return `${Math.floor(hours / 24)} days left`;
}

export function InviteCard({ invite }: { invite: UploadInvite }) {
  const revoke = useRevokeUploadInvite();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const active = isInviteActive(invite);
  const shownStatus = invite.status === "revoked" ? "revoked" : active ? "active" : "expired";
  const pct = invite.max_total_bytes > 0 ? Math.min(100, (invite.used_bytes / invite.max_total_bytes) * 100) : 0;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildInviteUrl(invite.token));
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const handleRevoke = () => {
    revoke.mutate(invite.id, {
      onSuccess: () => toast.success("Link revoked"),
      onError: (err) => toast.error(err.message || "Could not revoke the link"),
      onSettled: () => setConfirming(false),
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-strong bg-bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-medium text-ink">
            {invite.label || "Untitled request"}
          </h3>
          <p className="mt-1 flex items-center gap-2 text-[12px] text-ink-muted">
            {timeLeft(invite.expires_at)}
            {invite.has_passcode && (
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" /> Passcode
              </span>
            )}
          </p>
        </div>
        <Badge
          variant={shownStatus === "active" ? "success" : shownStatus === "revoked" ? "danger" : "muted"}
          dot
        >
          {shownStatus === "active" ? "Active" : shownStatus === "revoked" ? "Revoked" : "Expired"}
        </Badge>
      </div>

      <div>
        <div className="flex items-center justify-between text-[12px] text-ink-muted">
          <span>
            {invite.used_files} of {invite.max_files} files
          </span>
          <span className="font-mono">
            {formatBytes(invite.used_bytes)} / {formatBytes(invite.max_total_bytes)}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-overlay">
          <div className="h-full bg-brand-gradient" style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {active && (
          <Button size="sm" variant="secondary" onClick={copyLink}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        )}
        <Button size="sm" variant="ghost" asChild>
          <Link href="/files">
            <FolderOpen className="h-3.5 w-3.5" /> Open files
          </Link>
        </Button>
        {active &&
          (confirming ? (
            <span className="ml-auto flex items-center gap-2 text-[12px]">
              <span className="text-ink-muted">Stop accepting files?</span>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={revoke.isPending}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger hover:bg-danger/10 hover:text-danger"
                onClick={handleRevoke}
                disabled={revoke.isPending}
              >
                {revoke.isPending ? "Revoking…" : "Revoke"}
              </Button>
            </span>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-ink-muted hover:text-danger"
              onClick={() => setConfirming(true)}
            >
              Revoke
            </Button>
          ))}
      </div>
    </div>
  );
}
