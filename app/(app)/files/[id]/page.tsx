"use client";

import { use, useEffect, useState } from "react";
import { getAccessToken } from "@/lib/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  Share2,
  Star,
  ChevronLeft,
  Hash,
  Calendar,
  Trash2,
  Globe,
} from "lucide-react";
import {
  useFile,
  useFileHistory,
  useDeleteFileMutation,
  useToggleShareMutation,
} from "@/services";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileKindIcon } from "@/components/shared/file-kind-icon";
import { ProviderTag } from "@/components/shared/provider-tag";
import {
  formatBytes,
  formatRelativeTime,
  truncateMiddle,
} from "@/lib/utils";
import toast from "react-hot-toast";

const actionLabel: Record<string, string> = {
  uploaded: "Uploaded",
  downloaded: "Downloaded",
  shared: "Shared",
  moved: "Moved",
  replicated: "Replicated",
};

export default function FileDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const router = useRouter();

  // Load token for iframe preview
  const [token, setToken] = useState("");
  useEffect(() => {
    setToken(getAccessToken() || "");
  }, []);

  const { data: file, isLoading } = useFile(id);
  const { data: history = [] } = useFileHistory(id);

  const deleteMutation = useDeleteFileMutation();
  const toggleShareMutation = useToggleShareMutation();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="font-mono text-[12px] text-ink-muted">
            Loading file metadata...
          </span>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h2 className="text-lg font-semibold text-ink">File not found</h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          The file you are looking for does not exist or has been deleted.
        </p>
        <Link
          href="/files"
          className="mt-4 inline-flex items-center gap-1 text-[13px] text-accent hover:underline"
        >
          Back to files
        </Link>
      </div>
    );
  }

  const handleDownload = () => {
    window.open(`/api/v1/files/${file.id}/download?token=${token}`, "_blank");
  };

  const handleToggleShare = () => {
    toggleShareMutation.mutate(
      { id: file.id, isPublic: !file.shared },
      {
        onSuccess: () => {
          toast.success(file.shared ? "File is now private" : "File is now public");
        },
      }
    );
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/s/${file.id}`);
    toast.success("Link copied to clipboard!");
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      deleteMutation.mutate(file.id, {
        onSuccess: () => {
          toast.success("File deleted");
          router.push("/files");
        },
      });
    }
  };

  const previewUrl = `/api/v1/files/${file.id}/download?token=${token}&inline=true`;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/files"
        className="inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to files
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md"
            style={{
              backgroundColor: `${file.thumbnailColor}1A`,
              color: file.thumbnailColor,
            }}
          >
            <FileKindIcon kind={file.kind} className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-ink truncate">
                {truncateMiddle(file.name, 50)}
              </h2>
              {file.starred && <Star className="h-4 w-4 fill-live text-live shrink-0" />}
            </div>
            <p className="mt-0.5 text-[13px] text-ink-muted truncate">{file.path}</p>
          </div>
        </div>

        {/* Action buttons — responsive grid on mobile */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2 sm:shrink-0">
          {file.shared && (
            <Button size="sm" variant="secondary" onClick={handleCopyLink}>
              <Share2 className="h-3.5 w-3.5" /> Copy Link
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleToggleShare}
            disabled={toggleShareMutation.isPending}
          >
            <Globe className="h-3.5 w-3.5" />{" "}
            {file.shared ? "Make Private" : "Share"}
          </Button>
          <Button size="sm" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* PREVIEW CARD */}
        <Card className="lg:col-span-2 bg-bg-surface border-border-strong overflow-hidden flex flex-col">
          <div className="bg-bg-raised border-b border-border p-2 px-4 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted">
              File Preview
            </span>
            <Badge variant="muted" className="font-mono">
              {file.downloads} Downloads
            </Badge>
          </div>
          <div className="flex-1 w-full min-h-[350px] max-h-[60vh] bg-bg-surface relative">
            {token ? (
              file.mimeType.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full absolute inset-0 object-contain p-4"
                />
              ) : file.mimeType.startsWith("video/") ? (
                <video
                  src={previewUrl}
                  controls
                  className="w-full h-full absolute inset-0 object-contain bg-black"
                />
              ) : file.mimeType === "application/pdf" ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full absolute inset-0 border-0"
                  title="Preview"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-ink-muted">
                  <FileKindIcon kind={file.kind} className="h-16 w-16 opacity-30" />
                  <p className="text-sm">Preview not available for this file type</p>
                  <Button size="sm" variant="secondary" onClick={handleDownload}>
                    <Download className="h-3.5 w-3.5" /> Download to view
                  </Button>
                </div>
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm text-ink-muted animate-pulse">
                  Loading preview...
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* METADATA CARD */}
        <div className="flex flex-col gap-4">
          <Card className="bg-bg-surface border-border-strong">
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-5">
              <Field
                label="Size"
                value={formatBytes(file.sizeBytes)}
                icon={Hash}
              />
              <Field
                label="Type"
                value={file.mimeType.split("/")[1]?.toUpperCase() || "Unknown"}
                icon={Hash}
              />
              <Field
                label="Provider"
                value={<ProviderTag providerId={file.providerId} />}
                icon={Hash}
              />
              <Field
                label="Uploaded"
                value={formatRelativeTime(file.uploadedAt)}
                icon={Calendar}
              />
              <Field
                label="Downloads"
                value={file.downloads.toLocaleString()}
                icon={Download}
              />
            </CardContent>
          </Card>

          <Card className="bg-bg-surface border-border-strong">
            <CardHeader>
              <CardTitle>Share settings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-ink-muted">Visibility</span>
                <Badge variant={file.shared ? "info" : "muted"}>
                  {file.shared ? "Public" : "Private"}
                </Badge>
              </div>
              {file.shared && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <span className="text-[12px] text-ink-muted">
                    Shareable Link
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/s/${file.id}`}
                      className="flex-1 rounded-md border border-border bg-bg px-2.5 py-1.5 text-[13px] text-ink outline-none min-w-0"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleCopyLink}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="mt-1 w-full"
                onClick={handleToggleShare}
                disabled={toggleShareMutation.isPending}
              >
                Toggle Sharing
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {history.length > 0 && (
        <Card className="bg-bg-surface border-border-strong">
          <CardHeader>
            <CardTitle>Transfer history</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            {history.map((entry: any) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-4 border-t border-border py-3 first:border-t-0 first:pt-0"
              >
                <div className="flex items-start gap-3">
                  <Badge variant="muted" className="mt-0.5">
                    {actionLabel[entry.action]}
                  </Badge>
                  <div>
                    <p className="text-[13px] text-ink">{entry.detail}</p>
                    <p className="mt-0.5 text-[12px] text-ink-faint">
                      by {entry.actor}
                    </p>
                  </div>
                </div>
                <span className="whitespace-nowrap font-mono text-[12px] text-ink-faint">
                  {formatRelativeTime(entry.timestamp)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: any;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-ink-faint">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <div className="mt-1 text-[13px] font-medium text-ink">{value}</div>
    </div>
  );
}
