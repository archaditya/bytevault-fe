"use client";

import { useState } from "react";
import { Inbox, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store";
import { CreateInviteDialog } from "@/features/collect/components/create-invite-dialog";
import { InviteCard } from "@/features/collect/components/invite-card";
import {
  MAX_ACTIVE_INVITES,
  isInviteActive,
  useUploadInvites,
} from "@/services/upload-invites.service";

export default function CollectPage() {
  const { user } = useAuthStore();
  const { data: invites, isLoading, isError, error } = useUploadInvites();
  const [open, setOpen] = useState(false);

  const activeCount = (invites ?? []).filter(isInviteActive).length;
  const unverified = user?.isVerified === false;
  const atLimit = activeCount >= MAX_ACTIVE_INVITES;
  const blockedReason = unverified
    ? "Verify your email to create request links."
    : atLimit
      ? `You have ${MAX_ACTIVE_INVITES} active links. Revoke one to create another.`
      : null;

  return (
    <div className="flex flex-col gap-5 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[13px] text-ink-muted">
          Create a link, send it to a client, and get their files without asking them to sign up.
          Everything they upload lands in <span className="text-ink">Received</span> in your Files.
        </p>
        <Button size="sm" onClick={() => setOpen(true)} disabled={!!blockedReason}>
          <Plus className="h-3.5 w-3.5" /> Request files
        </Button>
      </div>

      {blockedReason && (
        <p className="rounded-md border border-live/25 bg-live/10 px-3 py-2 text-[13px] text-live" role="status">
          {blockedReason}
        </p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : isError ? (
        <p className="py-10 text-center text-[13px] text-danger" role="alert">
          {error?.message || "Could not load your request links."}
        </p>
      ) : (invites ?? []).length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-border-strong px-6 py-14 text-center">
          <Inbox className="h-7 w-7 text-ink-muted" strokeWidth={1.75} />
          <h2 className="mt-3 text-[15px] font-medium text-ink">No request links yet</h2>
          <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-muted">
            Ask a client for their files with a single link. You choose the size limit, the number of
            files and when it expires.
          </p>
          <Button className="mt-5" onClick={() => setOpen(true)} disabled={!!blockedReason}>
            <Plus className="h-4 w-4" /> Request files
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {(invites ?? []).map((invite) => (
            <InviteCard key={invite.id} invite={invite} />
          ))}
        </div>
      )}

      <CreateInviteDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
