"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";
import {
  Key,
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Code2,
  Terminal,
  ShieldAlert,
  Clock,
  Activity,
  ExternalLink,
  Play,
  Send,
  UploadCloud,
  Loader2,
} from "lucide-react";

interface APIKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  rotation_count: number;
  max_rotations: number;
  rate_limit_per_min: number;
  last_used_at?: string;
  created_at: string;
}

export function APIKeysSection() {
  const [keys, setKeys] = useState<APIKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);

  // One-time key reveal state
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealedKeyTitle, setRevealedKeyTitle] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);

  // Rotation confirmation state
  const [rotatingKey, setRotatingKey] = useState<APIKeyItem | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  // Delete confirmation state
  const [deletingKey, setDeletingKey] = useState<APIKeyItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick-start docs tab
  const [docLanguage, setDocLanguage] = useState<"curl" | "node" | "python">("curl");

  // Interactive Playground state
  const [testKey, setTestKey] = useState("");
  const [testFile, setTestFile] = useState<File | null>(null);
  const [isTestingUpload, setIsTestingUpload] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testDirectUrl, setTestDirectUrl] = useState<string | null>(null);
  const [testResponseStatus, setTestResponseStatus] = useState<number | null>(null);
  const [testResponseTime, setTestResponseTime] = useState<number | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await apiClient("/api/v1/api-keys");
      if (res?.api_keys) {
        setKeys(res.api_keys);
      } else if (res?.data?.api_keys) {
        setKeys(res.data.api_keys);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      toast.error("Please provide a name for this API key");
      return;
    }

    try {
      setCreating(true);
      const res: any = await apiClient("/api/v1/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = res?.api_key ? res : res?.data;
      if (data?.api_key?.key) {
        setRevealedKey(data.api_key.key);
        setRevealedKeyTitle(`API Key Generated: "${data.api_key.name}"`);
        setTestKey(data.api_key.key);
        setCreateModalOpen(false);
        setNewKeyName("");
        toast.success("API key generated successfully!");
        fetchKeys();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate API key");
    } finally {
      setCreating(false);
    }
  };

  const handleRotateKey = async () => {
    if (!rotatingKey) return;
    try {
      setIsRotating(true);
      const res: any = await apiClient(`/api/v1/api-keys/${rotatingKey.id}/rotate`, {
        method: "POST",
      });
      const data = res?.api_key ? res : res?.data;
      if (data?.api_key?.key) {
        setRevealedKey(data.api_key.key);
        setRevealedKeyTitle(`New Secret for "${rotatingKey.name}"`);
        setTestKey(data.api_key.key);
        setRotatingKey(null);
        toast.success("API key rotated! Previous key has been revoked.");
        fetchKeys();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to rotate API key");
    } finally {
      setIsRotating(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!deletingKey) return;
    try {
      setIsDeleting(true);
      await apiClient(`/api/v1/api-keys/${deletingKey.id}`, {
        method: "DELETE",
      });
      toast.success("API key permanently revoked and deleted");
      setDeletingKey(null);
      fetchKeys();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete API key");
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedKey(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handlePlaygroundUpload = async () => {
    if (!testKey.trim()) {
      toast.error("Please enter or paste your API key");
      return;
    }
    if (!testFile) {
      toast.error("Please select a file to upload");
      return;
    }

    try {
      setIsTestingUpload(true);
      setTestResult(null);
      setTestDirectUrl(null);
      setTestResponseStatus(null);
      setTestResponseTime(null);

      const formData = new FormData();
      formData.append("file", testFile);

      const startTime = performance.now();
      const res = await fetch("/api/v1/files/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${testKey.trim()}`,
        },
        body: formData,
      });
      const endTime = performance.now();
      setTestResponseTime(Math.round(endTime - startTime));
      setTestResponseStatus(res.status);

      const json = await res.json();
      setTestResult(json);

      if (res.ok) {
        toast.success("File uploaded via API Key!");
        const directUrl =
          json?.data?.direct_url ||
          (json?.data?.file?.id
            ? `${window.location.origin}/api/v1/files/raw/${json.data.file.id}`
            : null);
        setTestDirectUrl(directUrl);
      } else {
        toast.error(json.error || json.detail || "API upload failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to execute request");
    } finally {
      setIsTestingUpload(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="border-border-strong bg-bg-surface">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Key className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold text-ink">Developer API Keys</h2>
              </div>
              <p className="mt-1 text-xs text-ink-muted max-w-xl leading-relaxed">
                Connect external apps, scripts, or backends to upload and manage files programmatically.
                All usage automatically consumes your account&apos;s storage quota.
              </p>
            </div>

            <Button
              onClick={() => setCreateModalOpen(true)}
              disabled={keys.length >= 2}
              className="h-10 text-xs font-semibold gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" /> Generate New Key
            </Button>
          </div>

          {/* Quota & Policy Notice */}
          <div className="mt-4 flex flex-wrap items-center gap-3 pt-4 border-t border-border text-[11px] text-ink-muted">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-accent" />
              Keys allowed: <strong>{keys.length} of 2 max</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-live" />
              Rotations: <strong>Up to 3 times per key</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-success" />
              Rate Limit: <strong>60 req / min</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Active API Keys List */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
          <span>Active Keys</span>
          <Badge variant="muted" className="text-[11px] font-mono">
            {keys.length} / 2
          </Badge>
        </h3>

        {loading ? (
          <div className="space-y-3">
            <div className="h-24 w-full animate-pulse rounded-xl bg-bg-raised/40 border border-border" />
            <div className="h-24 w-full animate-pulse rounded-xl bg-bg-raised/40 border border-border" />
          </div>
        ) : keys.length === 0 ? (
          <Card className="border-border border-dashed bg-bg-surface/50 text-center py-10 px-4">
            <Code2 className="mx-auto h-10 w-10 text-ink-muted/50 mb-3" />
            <h4 className="text-sm font-semibold text-ink">No API Keys Generated Yet</h4>
            <p className="text-xs text-ink-muted max-w-md mx-auto mt-1 mb-4 leading-relaxed">
              Generate an API key to upload files directly from your backend services, mobile apps, or automation scripts.
            </p>
            <Button
              onClick={() => setCreateModalOpen(true)}
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Generate Your First Key
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {keys.map((k) => {
              const remainingRotations = Math.max(0, (k.max_rotations || 3) - k.rotation_count);
              const rotationLimitReached = remainingRotations === 0;

              return (
                <Card key={k.id} className="border-border-strong bg-bg-surface hover:border-accent/30 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Info & Prefix */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-ink">{k.name}</h4>
                          <span className="text-[11px] font-mono border border-border bg-bg-raised px-2 py-0.5 rounded text-ink-muted">
                            {k.key_prefix}
                          </span>
                          {rotationLimitReached ? (
                            <Badge variant="danger" className="text-[10px]">
                              Max Rotations Reached
                            </Badge>
                          ) : (
                            <Badge variant="muted" className="text-[10px]">
                              {remainingRotations} {remainingRotations === 1 ? "rotation" : "rotations"} left
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-muted font-mono">
                          <span>Created: {new Date(k.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>
                            Last used:{" "}
                            {k.last_used_at
                              ? new Date(k.last_used_at).toLocaleString()
                              : "Never used yet"}
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRotatingKey(k)}
                          disabled={rotationLimitReached}
                          className="h-8 text-xs gap-1.5"
                          title={
                            rotationLimitReached
                              ? "Maximum 3 rotations reached for this key"
                              : "Revoke old secret and generate a new one"
                          }
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Rotate
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeletingKey(k)}
                          className="h-8 text-xs gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Revoke
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Developer Documentation & Direct Serving Guide */}
      <Card className="border-border-strong bg-bg-surface overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-bold text-ink">Developer Integration &amp; Direct File Serving</h3>
            </div>

            {/* Language Switcher */}
            <div className="flex rounded-lg border border-border bg-bg-raised p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setDocLanguage("curl")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  docLanguage === "curl" ? "bg-accent text-bg font-semibold shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                cURL
              </button>
              <button
                type="button"
                onClick={() => setDocLanguage("node")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  docLanguage === "node" ? "bg-accent text-bg font-semibold shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                Node.js
              </button>
              <button
                type="button"
                onClick={() => setDocLanguage("python")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  docLanguage === "python" ? "bg-accent text-bg font-semibold shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                Python
              </button>
            </div>
          </div>

          {/* Quick-Start Code Block */}
          <div className="relative rounded-xl border border-border bg-black/60 p-4 font-mono text-xs text-white/90 overflow-x-auto">
            {docLanguage === "curl" && (
              <pre className="whitespace-pre">{`# 1. Upload a file using your API Key
curl -X POST https://api.pushpostvault.com/api/v1/files/upload \\
  -H "Authorization: Bearer ppv_live_your_secret_key_here" \\
  -F "file=@photo.png"

# 2. Response returns direct raw asset URL:
# {
#   "success": true,
#   "data": {
#     "file": { "id": "uuid-here", "filename": "photo.png", ... },
#     "direct_url": "https://api.pushpostvault.com/api/v1/files/raw/uuid-here"
#   }
# }

# 3. Direct access (Serves raw binary bytes directly for <img> or downloads - 0% UI/HTML):
curl -I https://api.pushpostvault.com/api/v1/files/raw/uuid-here`}</pre>
            )}

            {docLanguage === "node" && (
              <pre className="whitespace-pre">{`import FormData from "form-data";
import fs from "fs";
import fetch from "node-fetch";

const form = new FormData();
form.append("file", fs.createReadStream("./banner.png"));

const res = await fetch("https://api.pushpostvault.com/api/v1/files/upload", {
  method: "POST",
  headers: {
    Authorization: "Bearer ppv_live_your_secret_key_here",
    ...form.getHeaders(),
  },
  body: form,
});

const data = await res.json();
console.log("Direct Raw Asset URL:", data.data.direct_url);
// You can directly render this in <img src={data.data.direct_url} /> in any frontend!`}</pre>
            )}

            {docLanguage === "python" && (
              <pre className="whitespace-pre">{`import requests

url = "https://api.pushpostvault.com/api/v1/files/upload"
headers = {"Authorization": "Bearer ppv_live_your_secret_key_here"}

with open("document.pdf", "rb") as f:
    files = {"file": f}
    response = requests.post(url, headers=headers, files=files)

data = response.json()
print("Raw File Direct URL:", data["data"]["direct_url"])`}</pre>
            )}
          </div>

          {/* Direct Serving Feature Box */}
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-border bg-bg-raised/60 p-3.5 space-y-1">
              <h5 className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-accent" /> Direct File Serving (No UI)
              </h5>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                The returned <code className="text-accent font-mono">direct_url</code> streams raw binary content with exact MIME types.
                Ready for <code className="font-mono text-ink">&lt;img src&gt;</code>, mobile apps, or raw downloads without any PushPostVault landing pages.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-bg-raised/60 p-3.5 space-y-1">
              <h5 className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-success" /> Standard Rate Limits
              </h5>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                API keys include a 60 requests/minute limit with standard RFC headers:{" "}
                <code className="text-ink font-mono text-[10px]">X-RateLimit-Limit</code>,{" "}
                <code className="text-ink font-mono text-[10px]">X-RateLimit-Remaining</code>, and{" "}
                <code className="text-ink font-mono text-[10px]">Retry-After</code>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive API Test Playground */}
      <Card className="border-border-strong bg-bg-surface overflow-hidden">
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Play className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Interactive API Test Playground</h3>
                <p className="text-xs text-ink-muted">
                  Test your API key and file upload in real-time directly from this dashboard.
                </p>
              </div>
            </div>
            <Badge variant="live" className="text-[10px] w-fit">
              Live Console
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column: Input Form */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="playgroundKey" className="text-xs text-ink font-medium">
                    1. API Secret Key
                  </Label>
                  {revealedKey && testKey !== revealedKey && (
                    <button
                      type="button"
                      onClick={() => setTestKey(revealedKey)}
                      className="text-[10px] text-accent hover:underline font-medium"
                    >
                      Use Newly Generated Key
                    </button>
                  )}
                </div>
                <Input
                  id="playgroundKey"
                  type="password"
                  placeholder="ppv_live_..."
                  value={testKey}
                  onChange={(e) => setTestKey(e.target.value)}
                  className="h-9 font-mono text-xs bg-bg-raised border-border"
                />
                <p className="text-[11px] text-ink-muted">
                  Paste your secret key (starts with <code className="font-mono text-accent">ppv_live_</code>).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-ink font-medium">2. Select a File to Upload</Label>
                <input
                  type="file"
                  id="test-file-input"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setTestFile(e.target.files[0]);
                    }
                  }}
                />
                <label
                  htmlFor="test-file-input"
                  className="flex flex-col items-center justify-center p-5 border border-dashed border-border hover:border-accent/50 rounded-xl cursor-pointer bg-bg-raised/40 hover:bg-bg-raised transition-colors text-center"
                >
                  <UploadCloud className="h-7 w-7 text-accent mb-1.5" />
                  <span className="text-xs font-semibold text-ink">
                    {testFile ? testFile.name : "Click to select a sample file"}
                  </span>
                  <span className="text-[10px] text-ink-muted mt-0.5">
                    {testFile
                      ? `${(testFile.size / 1024).toFixed(1)} KB · ${testFile.type || "binary"}`
                      : "Images, documents, PDF, or text files"}
                  </span>
                </label>
              </div>

              <Button
                onClick={handlePlaygroundUpload}
                disabled={isTestingUpload || !testKey || !testFile}
                className="w-full text-xs h-10 font-semibold gap-2"
              >
                {isTestingUpload ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading via API Key…
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Execute Upload (POST /api/v1/files/upload)
                  </>
                )}
              </Button>
            </div>

            {/* Right Column: Live Inspector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-ink font-medium">Live Response Inspector</Label>
                {testResponseStatus !== null && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={testResponseStatus < 400 ? "success" : "danger"}
                      className="text-[10px] font-mono"
                    >
                      HTTP {testResponseStatus}
                    </Badge>
                    {testResponseTime !== null && (
                      <span className="text-[10px] text-ink-muted font-mono">{testResponseTime}ms</span>
                    )}
                  </div>
                )}
              </div>

              {testResult ? (
                <div className="space-y-3">
                  {/* Pretty JSON output */}
                  <div className="rounded-xl border border-border bg-black/80 p-3.5 font-mono text-[11px] text-emerald-400 max-h-52 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(testResult, null, 2)}</pre>
                  </div>

                  {/* Direct Serving Verification Card */}
                  {testDirectUrl && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                          <Check className="h-4 w-4" /> Direct File Serving Ready
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(testDirectUrl, "_blank")}
                          className="h-7 text-[11px] gap-1"
                        >
                          <ExternalLink className="h-3 w-3" /> Open in New Tab
                        </Button>
                      </div>

                      <div className="p-2 rounded bg-black/50 border border-emerald-500/20 font-mono text-[11px] text-emerald-300 break-all select-all flex items-center justify-between gap-2">
                        <span className="truncate">{testDirectUrl}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(testDirectUrl)}
                          className="text-ink-muted hover:text-white"
                          title="Copy direct URL"
                        >
                          <Copy className="h-3.5 w-3.5 shrink-0" />
                        </button>
                      </div>

                      {/* Live Image Preview if Image */}
                      {testFile && testFile.type.startsWith("image/") && (
                        <div className="pt-2 border-t border-emerald-500/20 text-center">
                          <p className="text-[10px] text-ink-muted mb-2">
                            Direct Image Preview (Raw stream rendering directly via &lt;img src&gt;):
                          </p>
                          <img
                            src={testDirectUrl}
                            alt="Direct API Asset"
                            className="max-h-36 mx-auto rounded-lg border border-border shadow-md object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-64 rounded-xl border border-dashed border-border bg-bg-raised/20 flex flex-col items-center justify-center p-6 text-center">
                  <Terminal className="h-8 w-8 text-ink-muted/40 mb-2" />
                  <p className="text-xs font-semibold text-ink-muted">Awaiting API Execution</p>
                  <p className="text-[11px] text-ink-faint max-w-xs mt-1 leading-relaxed">
                    Paste your API key on the left, pick any test file, and click Execute. You will see the real JSON response, latency, and live direct asset streaming.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Create API Key Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md bg-bg-surface border-border-strong">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-ink">Generate New API Key</DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Give your key a descriptive name (e.g., &quot;Production Server&quot; or &quot;Mobile App&quot;).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateKey} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="keyName" className="text-xs text-ink font-medium">
                Key Name
              </Label>
              <Input
                id="keyName"
                placeholder="e.g. My SaaS Production"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                maxLength={100}
                className="h-10 text-xs border-border bg-bg-raised"
                required
                autoFocus
              />
            </div>

            <div className="rounded-lg bg-bg-raised/70 border border-border p-3 text-[11px] text-ink-muted space-y-1">
              <p className="flex items-center gap-1 font-semibold text-ink">
                <ShieldAlert className="h-3.5 w-3.5 text-live" /> Security note
              </p>
              <p>
                The plaintext secret key will only be shown <strong>once</strong> upon generation. We store only a SHA-256 cryptographic hash in our database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="text-xs h-9">
                {creating ? "Generating…" : "Generate API Key"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. One-Time Key Reveal Modal */}
      <Dialog open={!!revealedKey} onOpenChange={(open) => !open && setRevealedKey(null)}>
        <DialogContent className="max-w-lg bg-bg-surface border-border-strong">
          <DialogHeader>
            <div className="flex items-center gap-2 text-success mb-1">
              <Check className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-ink">{revealedKeyTitle}</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-ink-muted">
              Copy and store this API key in a secure secrets manager. It will <strong>never</strong> be displayed again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="relative rounded-xl border border-success/30 bg-success/5 p-3.5 flex items-center justify-between gap-3">
              <code className="text-xs font-mono font-semibold text-success break-all select-all">
                {revealedKey}
              </code>
              <Button
                size="sm"
                onClick={() => revealedKey && copyToClipboard(revealedKey)}
                className="shrink-0 h-8 text-xs font-semibold gap-1"
              >
                {copiedKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedKey ? "Copied" : "Copy"}
              </Button>
            </div>

            <div className="rounded-xl border border-live/20 bg-live/5 p-3 text-[11px] text-live flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                If you lose this key, you will need to rotate it to generate a new secret (up to 3 rotations per key).
              </span>
            </div>
          </div>

          <div className="pt-3">
            <Button
              onClick={() => setRevealedKey(null)}
              className="w-full text-xs h-9 font-semibold"
            >
              I have saved my secret key
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Rotate Confirmation Modal */}
      <Dialog open={!!rotatingKey} onOpenChange={(open) => !open && setRotatingKey(null)}>
        <DialogContent className="max-w-md bg-bg-surface border-border-strong">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-ink">
              Rotate API Key: &quot;{rotatingKey?.name}&quot;?
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Rotating will immediately invalidate the current secret key and issue a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2 text-xs text-ink-muted">
            <p>
              Current key prefix: <strong className="font-mono text-ink">{rotatingKey?.key_prefix}</strong>
            </p>
            <p>
              Rotations used:{" "}
              <strong className="text-ink">
                {rotatingKey?.rotation_count} of {rotatingKey?.max_rotations || 3}
              </strong>
            </p>
            <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-[11px] text-danger flex items-start gap-2 mt-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Any applications currently using the old secret will immediately fail to authenticate.</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setRotatingKey(null)}
              disabled={isRotating}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRotateKey}
              disabled={isRotating}
              className="text-xs h-9"
            >
              {isRotating ? "Rotating…" : "Rotate Key Now"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Delete / Revoke Confirmation Modal */}
      <Dialog open={!!deletingKey} onOpenChange={(open) => !open && setDeletingKey(null)}>
        <DialogContent className="max-w-md bg-bg-surface border-border-strong">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-danger flex items-center gap-1.5">
              <Trash2 className="h-4 w-4" /> Revoke API Key?
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Are you sure you want to permanently revoke &quot;{deletingKey?.name}&quot;?
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-ink-muted leading-relaxed pt-1">
            This action cannot be undone. All systems communicating with this key (
            <code className="font-mono text-ink">{deletingKey?.key_prefix}</code>) will immediately be blocked.
          </p>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setDeletingKey(null)}
              disabled={isDeleting}
              className="text-xs h-9"
            >
              Keep Key
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteKey}
              disabled={isDeleting}
              className="text-xs h-9 font-semibold"
            >
              {isDeleting ? "Revoking…" : "Permanently Revoke"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
