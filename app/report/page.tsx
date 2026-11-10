"use client";

import { useState } from "react";
import Link from "next/link";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitAbuseReportMutation } from "@/services/admin.service";
import toast from "react-hot-toast";
import { AlertTriangle, ShieldAlert, CheckCircle2, Mail, ExternalLink } from "lucide-react";

export default function ReportAbusePage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    fileUrl: "",
    category: "copyright",
    description: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null);

  const submitMutation = useSubmitAbuseReportMutation();

  const validateTargetUrl = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return "File Link or Shared URL is required.";
    const lower = trimmed.toLowerCase();

    if (
      lower.includes("/e/instant/") ||
      lower.includes("/s/instant/") ||
      lower.includes("/instant/") ||
      lower.includes("/live/")
    ) {
      return "Instant Shares expire automatically within 15–60 minutes and cannot be reported. Only persistent public shared links (e.g. /s/...) can be reported for takedown.";
    }

    const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (uuidPattern.test(trimmed)) return null;

    try {
      let urlToParse = trimmed;
      if (!urlToParse.startsWith("http://") && !urlToParse.startsWith("https://")) {
        urlToParse = "https://" + urlToParse;
      }
      const parsed = new URL(urlToParse);
      const host = parsed.hostname.toLowerCase();
      const isPPVDomain =
        host === "pushpostvault.com" ||
        host === "www.pushpostvault.com" ||
        host === "localhost" ||
        host === "127.0.0.1";

      if (!isPPVDomain) {
        return "Only PushPostVault shared links (https://pushpostvault.com/s/...) or file UUIDs can be reported.";
      }
      if (!parsed.pathname.startsWith("/s/")) {
        return "URL must point to a public shared file path starting with /s/ (e.g. https://pushpostvault.com/s/<file-id>).";
      }
      const shareId = parsed.pathname.replace(/^\/s\//, "").replace(/\/$/, "");
      if (!shareId || shareId.length < 8) {
        return "The link does not contain a valid shared file identifier.";
      }
    } catch {
      return "Please enter a valid URL (e.g. https://pushpostvault.com/s/xyz) or File UUID.";
    }

    return null;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "fileUrl") {
      if (value.trim()) {
        setUrlValidationError(validateTargetUrl(value));
      } else {
        setUrlValidationError(null);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const urlErr = validateTargetUrl(formData.fileUrl);
    if (urlErr) {
      setUrlValidationError(urlErr);
      setErrorMessage(urlErr);
      toast.error(urlErr);
      return;
    }

    const payload = {
      reporter_name: formData.name,
      reporter_email: formData.email,
      category: formData.category,
      target_url: formData.fileUrl.trim(),
      description: formData.description,
    };

    submitMutation.mutate(payload, {
      onSuccess: (res: any) => {
        setSubmitted(true);
        const ticket = res?.data?.ticket_number || res?.ticket_number || null;
        setTicketNumber(ticket);
        setFormData({ name: "", email: "", fileUrl: "", category: "copyright", description: "" });
      },
      onError: (err: any) => {
        const msg = err?.message || "Failed to submit abuse report. Please try again or email abuse@pushpostvault.com directly.";
        setErrorMessage(msg);
        toast.error(msg);
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink font-sans">
      <LandingNav />

      <main className="flex-1 container py-16 max-w-3xl relative">
        <div className="border-b border-border pb-6 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 mb-3 border border-rose-500/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            Safety &amp; Compliance Center
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-ink mt-2">Report Content or Abuse</h1>
          <p className="text-[13px] text-ink-muted mt-2">
            In compliance with Rule 3(2) of the Information Technology (Intermediary Guidelines) Rules, 2021 &amp; DPDP Act, 2023.
          </p>
        </div>

        {submitted ? (
          <Card className="p-8 border-border bg-bg-surface/50 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-xl font-bold text-ink">Abuse Report Received</h2>
            <p className="text-sm text-ink-muted max-w-lg mx-auto">
              Thank you for reporting this issue. Your complaint has been lodged with our trust and compliance desk
              {ticketNumber ? ` (Ticket Reference: #${ticketNumber})` : ""}.
            </p>
            <div className="bg-bg border border-border rounded-lg p-4 text-xs text-ink-muted max-w-md mx-auto text-left space-y-1.5">
              <p><strong className="text-ink">Resolution SLA:</strong> Acknowledged within 24 hours.</p>
              <p><strong className="text-ink">Expedited Takedown:</strong> Harmful, infringing, or illegal files are disabled within 24–36 hours upon verification.</p>
              <p><strong className="text-ink">Direct Desk:</strong> <a href="mailto:abuse@pushpostvault.com" className="text-accent hover:underline">abuse@pushpostvault.com</a></p>
            </div>
            <div className="pt-4">
              <Button onClick={() => setSubmitted(false)} variant="outline" className="text-xs">
                Submit Another Report
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="bg-bg-surface border border-border rounded-lg p-5 text-[13px] space-y-2">
              <div className="flex items-center gap-2 font-medium text-ink">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Intermediary Takedown &amp; Grievance Protocol
              </div>
              <p className="text-ink-muted">
                PushPostVault acts strictly as an intermediary cloud storage provider. We do not tolerate illegal,
                copyright-infringing, sexually explicit, harmful, or defamatory content on our network.
              </p>
              <p className="text-[12px] text-ink-faint">
                Direct statutory takedown notices may also be dispatched directly to{" "}
                <a href="mailto:abuse@pushpostvault.com" className="text-accent hover:underline font-mono">
                  abuse@pushpostvault.com
                </a>.
              </p>
            </div>

            <Card className="p-6 border-border bg-bg-surface/30">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink">Your Full Name / Entity</label>
                    <Input
                      name="name"
                      required
                      placeholder="e.g., Jane Doe or Copyright Agent"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="bg-bg border-border text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink">Your Official Email</label>
                    <Input
                      name="email"
                      type="email"
                      required
                      placeholder="e.g., agent@copyrightowner.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="bg-bg border-border text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Violation Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="copyright">Copyright / Intellectual Property Infringement (DMCA)</option>
                    <option value="malware">Malware / Phishing / Fraudulent Files</option>
                    <option value="csam">Harm to Minors / Child Sexual Abuse Material (CSAM)</option>
                    <option value="obscene">Defamatory / Obscene / Non-Consensual Imagery</option>
                    <option value="pii">Personal Data Leak / Confidential Information</option>
                    <option value="other">Other Prohibited Material</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink flex items-center justify-between">
                    <span>File Link or Shared URL</span>
                    {urlValidationError && (
                      <span className="text-[11px] text-rose-400 font-normal">Invalid URL format</span>
                    )}
                  </label>
                  <Input
                    name="fileUrl"
                    required
                    placeholder="https://pushpostvault.com/s/xyz or File UUID"
                    value={formData.fileUrl}
                    onChange={handleInputChange}
                    className={`bg-bg border text-xs font-mono transition-colors ${
                      urlValidationError ? "border-rose-500/80 focus-visible:ring-rose-500/50" : "border-border"
                    }`}
                  />
                  {urlValidationError ? (
                    <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {urlValidationError}
                    </p>
                  ) : (
                    <p className="text-[11px] text-ink-muted">
                      Must be a persistent public shared link (<code className="text-accent">https://pushpostvault.com/s/...</code>) or File UUID. Temporary Instant Shares expire automatically and are not eligible for takedown.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Detailed Description / Proof of Ownership</label>
                  <Textarea
                    name="description"
                    required
                    rows={4}
                    placeholder="Provide evidence of authorization, original work URL, or description of the policy violation..."
                    value={formData.description}
                    onChange={handleInputChange}
                    className="bg-bg border-border text-xs"
                  />
                </div>

                {errorMessage && (
                  <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded p-2.5" role="alert">
                    {errorMessage}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium text-xs py-2.5"
                >
                  {submitMutation.isPending ? "Submitting Report..." : "Submit Abuse / Takedown Report"}
                </Button>
              </form>
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
