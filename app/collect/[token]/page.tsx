"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Clock,
  File as FileIcon,
  Loader2,
  Lock,
  RotateCw,
  UploadCloud,
  X,
} from "lucide-react";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import { getResolvedMimeType } from "@/services/files.service";
import {
  completeGuestUpload,
  createGuestUploadSession,
  getBlockedExtension,
  getPublicInvite,
  putToStorage,
  verifyInvitePasscode,
  type PublicInvite,
} from "@/services/upload-invites.service";

type Phase = "loading" | "unavailable" | "passcode" | "ready";
type UnavailableReason = "not_found" | "revoked" | "expired";
type ItemStatus = "queued" | "uploading" | "done" | "error";

interface QueueItem {
  id: string;
  file: File;
  status: ItemStatus;
  progress: number;
  error?: string;
}

const CONCURRENCY = 2;

const sentence = (msg: string) => (msg ? msg.charAt(0).toUpperCase() + msg.slice(1) : msg);

/** Turn backend / network messages into something a client can act on. */
function friendlyError(message: string): string {
  if (/capacity exceeded/i.test(message)) return "There isn't enough room left on this link.";
  if (/rate limit|too many/i.test(message)) return "Too many uploads from your network. Please try again later.";
  if (/no longer active|revoked|has expired/i.test(message)) return "This link is no longer accepting files.";
  if (/network error|storage upload failed|failed to fetch/i.test(message))
    return "The upload was interrupted. Check your connection and retry.";
  return sentence(message);
}
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function isExpired(invite: PublicInvite) {
  return invite.status === "expired" || new Date(invite.expires_at).getTime() <= Date.now();
}

export default function GuestCollectPage() {
  const params = useParams();
  const token = (params?.token as string) || "";
  const sessionKey = `collect-session:${token}`;

  const [phase, setPhase] = useState<Phase>("loading");
  const [reason, setReason] = useState<UnavailableReason>("not_found");
  const [invite, setInvite] = useState<PublicInvite | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const [passcode, setPasscode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  const inviteRef = useRef<PublicInvite | null>(null);
  const sessionRef = useRef("");
  const sessionDeadRef = useRef(false);
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  const applyInvite = useCallback((inv: PublicInvite) => {
    inviteRef.current = inv;
    setInvite(inv);
  }, []);

  const refreshInvite = useCallback(() => {
    getPublicInvite(token)
      .then(applyInvite)
      .catch(() => {});
  }, [token, applyInvite]);

  // Initial load
  useEffect(() => {
    if (!token) {
      setPhase("unavailable");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const inv = await getPublicInvite(token);
        if (cancelled) return;
        applyInvite(inv);
        if (inv.status === "revoked") {
          setReason("revoked");
          setPhase("unavailable");
        } else if (isExpired(inv)) {
          setReason("expired");
          setPhase("unavailable");
        } else if (inv.has_passcode) {
          let saved = "";
          try {
            saved = sessionStorage.getItem(sessionKey) || "";
          } catch {
            /* storage unavailable */
          }
          if (saved) {
            sessionRef.current = saved;
            setPhase("ready");
          } else {
            setPhase("passcode");
          }
        } else {
          setPhase("ready");
        }
      } catch {
        if (!cancelled) {
          setReason("not_found");
          setPhase("unavailable");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, sessionKey, applyInvite]);

  // Warn before leaving while uploads are in progress
  const busy = items.some((i) => i.status === "uploading" || i.status === "queued");
  useEffect(() => {
    if (!busy) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy]);

  const patch = (id: string, changes: Partial<QueueItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));

  const uploadOne = async (item: QueueItem) => {
    if (sessionDeadRef.current) {
      patch(item.id, { status: "error", error: "Enter the passcode again, then retry." });
      return;
    }
    patch(item.id, { status: "uploading", progress: 0, error: undefined });
    const mime = getResolvedMimeType(item.file);
    try {
      const session = await createGuestUploadSession(token, {
        filename: item.file.name,
        file_size: item.file.size,
        content_type: mime,
        session_token: sessionRef.current || undefined,
      });
      await putToStorage(session.upload_url, item.file, mime, (pct) => patch(item.id, { progress: pct }));
      await completeGuestUpload(token, session.file_id);
      patch(item.id, { status: "done", progress: 100 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      if (inviteRef.current?.has_passcode && /session/i.test(message)) {
        sessionDeadRef.current = true;
        try {
          sessionStorage.removeItem(sessionKey);
        } catch {
          /* ignore */
        }
        patch(item.id, { status: "error", error: "Your session expired. Enter the passcode again, then retry." });
        setPhase("passcode");
      } else {
        patch(item.id, { status: "error", error: friendlyError(message) });
      }
    } finally {
      refreshInvite();
    }
  };

  const runPool = async (list: QueueItem[]) => {
    let next = 0;
    const worker = async () => {
      while (next < list.length) {
        const item = list[next++];
        await uploadOne(item);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  };

  const enqueue = (list: QueueItem[]) => {
    chainRef.current = chainRef.current.then(() => runPool(list)).catch(() => {});
  };

  const closed = invite ? invite.status !== "active" || isExpired(invite) : false;

  const addFiles = (fileList: FileList | File[] | null) => {
    if (!invite || closed || !fileList) return;
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    const queued = items.filter((i) => i.status === "queued");
    let bytesLeft = invite.max_total_bytes - invite.used_bytes - queued.reduce((n, i) => n + i.file.size, 0);
    let filesLeft = invite.max_files - invite.used_files - queued.length;

    const created: QueueItem[] = incoming.map((file) => {
      const blocked = getBlockedExtension(file.name);
      let error: string | undefined;
      if (blocked) error = `Files of type ${blocked} can't be uploaded here.`;
      else if (file.size === 0) error = "This file is empty.";
      else if (invite.max_file_bytes && file.size > invite.max_file_bytes)
        error = `Larger than the ${formatBytes(invite.max_file_bytes)} limit per file.`;
      else if (filesLeft <= 0) error = "The file limit for this link has been reached.";
      else if (file.size > bytesLeft) error = "Not enough space left on this link.";
      if (!error) {
        bytesLeft -= file.size;
        filesLeft -= 1;
      }
      return { id: newId(), file, status: error ? "error" : "queued", progress: 0, error };
    });

    setItems((prev) => [...prev, ...created]);
    const toUpload = created.filter((i) => i.status === "queued");
    if (toUpload.length > 0) enqueue(toUpload);
  };

  const retry = (item: QueueItem) => {
    patch(item.id, { status: "queued", progress: 0, error: undefined });
    enqueue([{ ...item, status: "queued", progress: 0, error: undefined }]);
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const submitPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setPassError(null);
    try {
      const session = await verifyInvitePasscode(token, passcode);
      sessionRef.current = session;
      sessionDeadRef.current = false;
      try {
        sessionStorage.setItem(sessionKey, session);
      } catch {
        /* ignore */
      }
      setPasscode("");
      setPhase("ready");
    } catch (err) {
      setPassError(friendlyError(err instanceof Error ? err.message : "Could not verify the passcode"));
    } finally {
      setVerifying(false);
    }
  };

  const owner = invite?.owner_name || "Someone";
  const spaceLeft = invite ? Math.max(0, invite.max_total_bytes - invite.used_bytes) : 0;
  const filesLeft = invite ? Math.max(0, invite.max_files - invite.used_files) : 0;
  const doneCount = items.filter((i) => i.status === "done").length;

  const card = "rounded-lg border border-border-strong bg-bg-surface p-6 sm:p-7";

  return (
    <div className="relative flex min-h-screen flex-col bg-bg font-sans">
      <LandingNav />

      <main className="relative flex flex-1 items-start justify-center overflow-hidden px-4 py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-brand-glow" />

        <div className="relative w-full max-w-xl">
          {phase === "loading" && (
            <div className={cn(card, "text-center")} role="status">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
              <p className="mt-3 text-[14px] text-ink-muted">Loading…</p>
            </div>
          )}

          {phase === "unavailable" && (
            <div className={cn(card, "text-center")}>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-raised text-ink-muted">
                <Clock className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-xl font-semibold text-ink">
                {reason === "revoked"
                  ? "This upload link has been closed"
                  : reason === "expired"
                    ? "This upload link has expired"
                    : "We couldn't find this link"}
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink-muted">
                {reason === "not_found"
                  ? "Check that the link is complete, or ask the sender for a new one."
                  : `Ask ${invite?.owner_name || "the sender"} for a new link.`}
              </p>
              <div className="mt-6 border-t border-border pt-6">
                <Button variant="ghost" asChild>
                  <Link href="/">Go to PushPostVault</Link>
                </Button>
              </div>
            </div>
          )}

          {phase === "passcode" && (
            <>
              <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {owner} asked you for files
              </h1>
              {invite?.label && <p className="mt-2 text-[15px] text-ink">{invite.label}</p>}
              <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
                This link is protected. Enter the passcode you were given to continue.
              </p>
              <form onSubmit={submitPasscode} className={cn(card, "mt-8 space-y-4")}>
                <div className="space-y-1.5">
                  <Label htmlFor="collect-passcode" className="flex items-center gap-1.5 text-[13px] text-ink-muted">
                    <Lock className="h-3.5 w-3.5 text-ink-faint" /> Passcode
                  </Label>
                  <Input
                    id="collect-passcode"
                    type="password"
                    autoComplete="off"
                    autoFocus
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="h-10 border-border-strong bg-bg-raised text-[14px]"
                  />
                  {passError && (
                    <p className="text-[12px] text-danger" role="alert">
                      {passError}
                    </p>
                  )}
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={verifying || !passcode}>
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Checking…
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            </>
          )}

          {phase === "ready" && invite && (
            <>
              <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {owner} asked you for files
              </h1>
              {invite.label && <p className="mt-2 text-[15px] text-ink">{invite.label}</p>}
              <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
                Upload them below. You don&rsquo;t need an account.
              </p>

              <div className={cn(card, "mt-8 flex flex-col gap-5")}>
                {closed && (
                  <p className="rounded-md border border-live/25 bg-live/10 px-3 py-2 text-[13px] text-live" role="status">
                    This link was closed, so new uploads are no longer accepted.
                  </p>
                )}

                <p className="text-[13px] text-ink-muted">
                  {filesLeft} of {invite.max_files} files left <span aria-hidden>·</span> {formatBytes(spaceLeft)} of{" "}
                  {formatBytes(invite.max_total_bytes)} left <span aria-hidden>·</span> Closes{" "}
                  {formatDate(invite.expires_at)}
                </p>

                <label
                  htmlFor="collect-files"
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!closed) setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    addFiles(e.dataTransfer.files);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-md border border-dashed px-6 py-10 text-center transition-colors focus-within:border-accent",
                    closed
                      ? "cursor-not-allowed border-border bg-bg-raised/20 opacity-60"
                      : "cursor-pointer border-border-strong bg-bg-raised/40 hover:border-accent/60 hover:bg-accent/5",
                    isDragging && "border-accent bg-accent/10",
                  )}
                >
                  <UploadCloud className="h-7 w-7 text-accent" strokeWidth={1.75} />
                  <p className="mt-3 text-[15px] font-medium text-ink">
                    Drop files here, or <span className="text-accent-bright underline underline-offset-4">browse</span>
                  </p>
                  <p className="mt-1 text-[12px] text-ink-muted">You can add several files at once</p>
                </label>
                <input
                  id="collect-files"
                  type="file"
                  multiple
                  disabled={closed}
                  className="sr-only"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />

                {items.length > 0 && (
                  <ul className="flex flex-col gap-2" aria-live="polite">
                    {items.map((item) => (
                      <li key={item.id} className="rounded-md border border-border bg-bg-raised/50 p-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                              item.status === "done" && "bg-success/15 text-success",
                              item.status === "error" && "bg-danger/10 text-danger",
                              (item.status === "uploading" || item.status === "queued") && "bg-accent/10 text-accent",
                            )}
                          >
                            {item.status === "done" ? (
                              <Check className="h-4 w-4" />
                            ) : item.status === "error" ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : item.status === "uploading" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileIcon className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] text-ink" title={item.file.name}>
                              {item.file.name}
                            </p>
                            <p className="font-mono text-[12px] text-ink-muted">
                              {formatBytes(item.file.size)}
                              {item.status === "uploading" && ` · ${item.progress}%`}
                              {item.status === "queued" && " · Waiting"}
                              {item.status === "done" && " · Sent"}
                            </p>
                          </div>
                          {item.status === "error" && (
                            <div className="flex shrink-0 items-center gap-1">
                              {!getBlockedExtension(item.file.name) && item.file.size > 0 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => retry(item)}
                                  disabled={closed}
                                >
                                  <RotateCw className="h-3.5 w-3.5" /> Retry
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => removeItem(item.id)}
                                aria-label={`Remove ${item.file.name}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {item.status === "uploading" && (
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-overlay">
                            <div
                              className="h-full bg-brand-gradient transition-all duration-200"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}
                        {item.status === "error" && item.error && (
                          <p className="mt-2 text-[12px] text-danger" role="alert">
                            {item.error}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {doneCount > 0 && !busy && (
                  <p className="flex items-center gap-2 text-[13px] text-success" role="status">
                    <Check className="h-4 w-4" />
                    {doneCount} file{doneCount === 1 ? "" : "s"} sent to {owner}. You can add more or close this page.
                  </p>
                )}
              </div>

              <p className="mt-6 text-center text-[13px] text-ink-muted">
                Files go straight to {owner}.{" "}
                <Link href="/" className="text-accent-bright underline-offset-4 hover:underline">
                  Send or collect files with PushPostVault
                </Link>
              </p>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
