"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildInviteUrl,
  useCreateUploadInvite,
  type UploadInvite,
} from "@/services/upload-invites.service";

const GB = 1024 * 1024 * 1024;

const selectClass =
  "h-9 w-full rounded-md border border-border-strong bg-bg-surface px-3 text-[13px] text-ink " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const SIZE_OPTIONS = [
  { value: "1", label: "1 GB" },
  { value: "2", label: "2 GB" },
  { value: "5", label: "5 GB" },
];
const FILE_OPTIONS = [
  { value: "10", label: "10 files" },
  { value: "20", label: "20 files" },
  { value: "50", label: "50 files" },
];
const EXPIRY_OPTIONS = [
  { value: "24", label: "1 day" },
  { value: "168", label: "7 days" },
  { value: "720", label: "30 days" },
];

export function CreateInviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateUploadInvite();
  const [label, setLabel] = useState("");
  const [sizeGb, setSizeGb] = useState("2");
  const [maxFiles, setMaxFiles] = useState("20");
  const [expiryHours, setExpiryHours] = useState("168");
  const [passcode, setPasscode] = useState("");
  const [created, setCreated] = useState<UploadInvite | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setLabel("");
    setSizeGb("2");
    setMaxFiles("20");
    setExpiryHours("168");
    setPasscode("");
    setCreated(null);
    setCopied(false);
    create.reset();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      {
        label: label.trim(),
        max_total_bytes: Number(sizeGb) * GB,
        max_files: Number(maxFiles),
        expiry_hours: Number(expiryHours),
        passcode,
      },
      {
        onSuccess: (invite) => setCreated(invite),
        onError: (err) => toast.error(err.message || "Could not create the link"),
      },
    );
  };

  const link = created ? buildInviteUrl(created.token) : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select the link and copy it manually.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border-strong bg-bg-surface text-ink sm:max-w-md">
        {created ? (
          <div className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>Your request link is ready</DialogTitle>
              <DialogDescription>
                Send it to your client. Anyone with the link can upload
                {created.has_passcode ? ", once they enter the passcode" : ""}. Files arrive in
                Received{created.label ? ` / ${created.label}` : ""} in your Files.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-md border border-border bg-bg-raised p-2">
              <span className="flex-1 truncate px-2 font-mono text-[13px] text-ink">{link}</span>
              <Button size="sm" onClick={copyLink}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy link
                  </>
                )}
              </Button>
            </div>
            <Button variant="secondary" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Request files</DialogTitle>
              <DialogDescription>
                Create a link your client can use to upload files to you. They don&rsquo;t need an
                account.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-label" className="text-[13px] text-ink-muted">
                Name
              </Label>
              <Input
                id="invite-label"
                value={label}
                maxLength={100}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Brand assets for Acme"
                className="h-9 text-[13px]"
              />
              <p className="text-[12px] text-ink-faint">
                Shown to your client. Also the folder name inside Received.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-size" className="text-[13px] text-ink-muted">
                  Total size
                </Label>
                <select
                  id="invite-size"
                  className={selectClass}
                  value={sizeGb}
                  onChange={(e) => setSizeGb(e.target.value)}
                >
                  {SIZE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-files" className="text-[13px] text-ink-muted">
                  Max files
                </Label>
                <select
                  id="invite-files"
                  className={selectClass}
                  value={maxFiles}
                  onChange={(e) => setMaxFiles(e.target.value)}
                >
                  {FILE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-expiry" className="text-[13px] text-ink-muted">
                  Link expires in
                </Label>
                <select
                  id="invite-expiry"
                  className={selectClass}
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(e.target.value)}
                >
                  {EXPIRY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-passcode" className="text-[13px] text-ink-muted">
                Passcode (optional)
              </Label>
              <Input
                id="invite-passcode"
                type="password"
                autoComplete="new-password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Your client must enter this before uploading"
                className="h-9 text-[13px]"
              />
            </div>

            {create.isError && (
              <p className="text-[12px] text-danger" role="alert">
                {create.error.message}
              </p>
            )}

            <Button type="submit" size="lg" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create link"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
